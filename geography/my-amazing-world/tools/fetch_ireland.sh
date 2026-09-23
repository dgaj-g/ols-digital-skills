#!/bin/zsh
# tools/fetch_ireland.sh — build data/ireland.topo.json for Legs 4 and 5.
# NI: six historic counties, Lough Neagh, Lower Lough Erne, rivers Bann/Foyle/Lagan from OpenStreetMap (© OpenStreetMap contributors, ODbL) via Overpass.
# ROI: 26 counties, Upper Lough Erne, River Shannon from Natural Earth 10m (public domain). Provinces dissolved from counties.
# Needs node, npx (mapshaper + osmtogeojson pulled by npx), curl. Natural Earth files come from NE_SRC (downloaded if missing).
set -e
HERE="$(cd "$(dirname "$0")/.." && pwd)"
SRC="${NE_SRC:-/tmp/ols-build-39/data}"; OUT="$HERE/data"; TMP="$(mktemp -d)"
mkdir -p "$SRC" "$OUT"
NE=https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson
for f in ne_10m_admin_1_states_provinces ne_10m_lakes ne_10m_rivers_lake_centerlines; do
  [ -s "$SRC/$f.geojson" ] || curl -sL --max-time 300 -o "$SRC/$f.geojson" "$NE/$f.geojson"
done
UA='ols-geography-build/1.0 (school activity data build)'  # overpass-api.de answers 406 to curl's own and to generic browser agents
Q='[out:json][timeout:120];
(
  rel(id:1119534,1119535,1119533,1118085,1959598,1117773,16303099,1121118,12552);
  way["waterway"="river"]["name"~"^(River )?((Lower |Upper )?Bann|Foyle|Lagan)$"](54.0,-8.3,55.35,-5.4);
);
out geom;'
ok=0
[ -s "$SRC/ni_osm.json" ] && ok=1 && echo "overpass: cached $SRC/ni_osm.json (delete it to refetch)"
for M in https://overpass-api.de/api/interpreter https://overpass.kumi.systems/api/interpreter https://overpass-api.de/api/interpreter https://overpass-api.de/api/interpreter https://overpass-api.de/api/interpreter; do
  [ $ok = 1 ] && break; sleep 5
  if curl -s --max-time 180 -A "$UA" --data-urlencode "data=$Q" "$M" -o "$SRC/ni_osm.json" && node -e "process.exit(JSON.parse(require('fs').readFileSync('$SRC/ni_osm.json')).elements.length>8?0:1)" 2>/dev/null; then ok=1; echo "overpass: $M"; break; fi
done
[ $ok = 1 ] || { echo "OVERPASS FAILED on all mirrors"; exit 2; }
npx -y osmtogeojson "$SRC/ni_osm.json" > "$TMP/ni_all.json"
node "$HERE/tools/split_ireland.js" "$TMP/ni_all.json" "$SRC" "$TMP"
ms() { npx -y mapshaper@0.7.66 "$@"; }
ms -i "$TMP/ni_counties.json" -dissolve fields=name copy-fields=province,country -simplify 8% keep-shapes -o "$TMP/ni_c.json" format=geojson
ms -i "$TMP/roi_counties.json" -dissolve fields=name copy-fields=province,country -simplify 20% keep-shapes -o "$TMP/roi_c.json" format=geojson
ms -i "$TMP/ni_c.json" "$TMP/roi_c.json" combine-files -merge-layers force -o "$TMP/counties.json" format=geojson
ms -i "$TMP/counties.json" -dissolve fields=province -rename-fields name=province -o "$TMP/provinces.json" format=geojson
ms -i "$TMP/counties.json" -dissolve fields=country -rename-fields name=country -o "$TMP/countries.json" format=geojson
ms -i "$TMP/loughs.json" -simplify 15% keep-shapes -o "$TMP/loughs_s.json" format=geojson
ms -i "$TMP/rivers.json" -dissolve fields=name -simplify 15% -o "$TMP/rivers_s.json" format=geojson
ms -i "$TMP/counties.json" "$TMP/provinces.json" "$TMP/countries.json" "$TMP/loughs_s.json" "$TMP/rivers_s.json" combine-files \
  -rename-layers counties,provinces,countries,loughs,rivers -o "$OUT/ireland.topo.json" format=topojson quantization=1e5 'target=*'
rm -rf "$TMP"
ls -la "$OUT/ireland.topo.json"
