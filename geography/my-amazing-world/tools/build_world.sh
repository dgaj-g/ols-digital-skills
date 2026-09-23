#!/bin/zsh
# tools/build_world.sh — rebuild data/world.topo.json + data/europe.topo.json from Natural Earth (public domain).
# Needs node + npx (mapshaper is pulled by npx) + curl. Downloads the five Natural Earth files if NE_SRC lacks them.
set -e
HERE="$(cd "$(dirname "$0")/.." && pwd)"
SRC="${NE_SRC:-/tmp/ols-build-39/data}"; OUT="$HERE/data"; TMP="$(mktemp -d)"
mkdir -p "$SRC" "$OUT"
NE=https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson
for f in ne_110m_admin_0_countries ne_110m_geography_marine_polys ne_110m_land ne_50m_admin_0_countries; do
  [ -s "$SRC/$f.geojson" ] || curl -sL --max-time 180 -o "$SRC/$f.geojson" "$NE/$f.geojson"
done
ms() { npx -y mapshaper@0.7.66 "$@"; }
# Continents: explode multipolygons, keep Russia separate (judge splits it at 60°E), French Guiana → South America, drop open-ocean specks, dissolve.
ms -i "$SRC/ne_110m_admin_0_countries.geojson" -quiet \
  -each 'CONT = (ADMIN=="Russia") ? "Russia" : CONTINENT' -explode \
  -each 'if (CONT=="Europe" && this.centroidY < 20) CONT="South America"; if (CONT=="Seven seas (open ocean)") CONT="minor"' \
  -filter 'CONT!="minor"' -dissolve CONT -rename-fields name=CONT -o "$TMP/continents.json" format=geojson
# Oceans: North+South halves merged into five oceans; every other marine polygon kept as a named sea.
ms -i "$SRC/ne_110m_geography_marine_polys.geojson" -quiet \
  -each 'ocean = /Pacific/.test(name) ? "Pacific" : /Atlantic/.test(name) ? "Atlantic" : /indian/i.test(name) ? "Indian" : /southern/i.test(name) ? "Southern" : /Arctic/.test(name) ? "Arctic" : ""; kind = ocean ? "ocean" : "sea"; label = ocean ? ocean + " Ocean" : name' \
  -dissolve label copy-fields=kind,ocean -rename-fields name=label -o "$TMP/oceans.json" format=geojson
ms -i "$SRC/ne_110m_admin_0_countries.geojson" -quiet -filter-fields ADMIN,ISO_A3,CONTINENT -rename-fields name=ADMIN,iso=ISO_A3,continent=CONTINENT -o "$TMP/countries.json" format=geojson
ms -i "$SRC/ne_110m_land.geojson" -quiet -o "$TMP/land.json" format=geojson
node "$HERE/tools/densify.js" "$TMP/oceans.json" 1
node "$HERE/tools/densify.js" "$TMP/continents.json" 1
ms -i "$TMP/land.json" "$TMP/continents.json" "$TMP/oceans.json" "$TMP/countries.json" combine-files -quiet -o "$OUT/world.topo.json" format=topojson 'target=*'
# Europe at 50m for Leg 3 (clipped box, light simplification).
ms -i "$SRC/ne_50m_admin_0_countries.geojson" -quiet -clip bbox=-26,34,46,72 -filter-fields ADMIN,ISO_A3,CONTINENT -rename-fields name=ADMIN,iso=ISO_A3,continent=CONTINENT -simplify 25% keep-shapes -rename-layers europe -o "$OUT/europe.topo.json" format=topojson
rm -rf "$TMP"
ls -la "$OUT"
