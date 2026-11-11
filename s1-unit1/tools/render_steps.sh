#!/bin/zsh
# render_steps.sh <id> <source.pptx> — the click-state pictures for one slide set (v12, 11 Nov 2026).
# For k = 0 … (most clicks on any slide) - 1: deck_steps.py writes the variant deck (every slide as it stands after k clicks),
# PowerPoint saves it as PDF, and page i becomes NN-k.webp for each slide i that has more than k clicks. Same picture
# settings as the finished slides NN.webp (1280 wide, WebP q72). Then step_check.js compares every state with the finished
# slide: PowerPoint sometimes breaks a borderline line of text differently on one export, so any state where something
# outside the parts still to come has moved is exported again (up to 8 times). A state still moved after that (PowerPoint
# sets a title a touch tighter in one export, every time) is rebuilt from the finished slide outside the parts still to
# come by step_patch.js, then checked again. Needs PowerPoint, pdftoppm, cwebp, node.
set -e
id=$1; src=$2
TOOLS=${0:A:h}
WORK="${S1U1_DESIGN:-/Users/damiengartland/Desktop/Claude Work/S1 Unit 1 Platform}/steps_work/$id"
OUT=${S1_REPO:-$HOME/Sites/s1-wt-platform}/s1_platform/decks/$id
mkdir -p "$WORK" "$OUT"
map=$(python3 $TOOLS/deck_steps.py map "$src")
max=$(python3 -c "import json,sys; m=json.loads(sys.argv[1]); print(max(m.values()) if m else 0)" "$map")
[[ $max -eq 0 ]] && { echo "ok $id no clicks"; exit 0; }

export_pdf() {  # <k>  -> $WORK/$id-s<k>.pdf
  local k=$1 v="$WORK/$id-s$1.pptx"; local base="${v:t}"; local stem="${base:r}"; local tmp="$WORK/~\$$stem.pdf"
  if [[ $k == F ]]; then cp "$src" "$v"; else [[ -f "$v" ]] || python3 $TOOLS/deck_steps.py variant "$src" $k "$v" >/dev/null; fi
  rm -f "$tmp" "$WORK/$stem.pdf"
  osascript <<OSA
with timeout of 900 seconds
tell application "Microsoft PowerPoint"
  open POSIX file "$v"
  set n to 0
  repeat while n < 60
    try
      set p to presentation "$base"
      exit repeat
    end try
    delay 0.5
    set n to n + 1
  end repeat
  save presentation "$base" in POSIX file "$tmp" as save as PDF
  close presentation "$base" saving no
end tell
end timeout
OSA
  [[ -f "$tmp" ]] || { echo "FAILED pdf $id k=$k"; exit 1; }
  mv "$tmp" "$WORK/$stem.pdf"
}
cut() {  # <k|F> <slide>   (F = the finished slide NN.webp, from the untouched deck)
  local nn=$(printf %02d $2) to; [[ $1 == F ]] && to="$OUT/$nn.webp" || to="$OUT/$nn-$1.webp"
  pdftoppm -f $2 -l $2 -singlefile -scale-to-x 1280 -scale-to-y -1 -png "$WORK/$id-s$1.pdf" "$WORK/p"
  cwebp -quiet -q 72 -m 5 "$WORK/p.png" -o "$to"
}
slides=$(python3 -c "import json,sys; print(' '.join(json.loads(sys.argv[1])))" "$map")

# the finished picture of each slide with clicks comes from this same PowerPoint, so letter shapes match its states
export_pdf F
for i in ${=slides}; do cut F $i; done
echo "ok $id finished slides"
for (( k=0; k<max; k++ )); do
  export_pdf $k
  for i in $(python3 -c "import json,sys; m=json.loads(sys.argv[1]); print(' '.join(s for s,c in m.items() if c > int(sys.argv[2])))" "$map" $k); do cut $k $i; done
  echo "ok $id k=$k"
done

for (( round=1; round<=8; round++ )); do
  bad=$(node $TOOLS/step_check.js $id "$src" | grep 'moved' || true)
  [[ -z "$bad" ]] && break
  echo "round $round: $(echo "$bad" | wc -l | tr -d ' ') states moved, exporting again"
  for k in $(echo "$bad" | awk '{print $3}' | sort -un); do
    export_pdf $k
    for i in $(echo "$bad" | awk -v k=$k '$3==k {print $2}'); do cut $k $i; done
  done
  # a slide whose every state "moved" most likely has the odd finished picture: export that again too
  odd=$(echo "$bad" | awk '{n[$2]++} END {for (s in n) print s, n[s]}' | while read s c; do [[ $c -ge $(python3 -c "import json,sys; print(json.loads(sys.argv[1])[sys.argv[2]])" "$map" $s) ]] && echo $s; done; true)
  if [[ -n "$odd" ]]; then export_pdf F; for i in ${=odd}; do cut F $i; done; fi
done
left=$(node $TOOLS/step_check.js $id "$src" || true)
if [[ -n "$left" ]]; then
  echo "$left" | grep 'moved' | while read _w s k _r; do node $TOOLS/step_patch.js $id "$src" $s $k; done
  left=$(node $TOOLS/step_check.js $id "$src" || true)
fi
rm -rf "$WORK"
if [[ -n "$left" ]]; then echo "$left"; echo "NOT DONE $id"; exit 1; fi
echo "done $id $(ls $OUT | grep -c -- '-') step pictures, all checked"
