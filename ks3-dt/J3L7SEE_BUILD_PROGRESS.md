# J3 L7 "Teach It To See" — build progress (Version 80)

Worktree ~/Sites/ols-wt-j3l7see · branch j3-l7-see · base origin/main 817eebc4
Build prompt: /Users/damiengartland/Desktop/Claude Work/KS3 DT Platform/J3_L7_SEE_BUILD_PROMPT.md

## Done (13 Nov, 13:20)
- Step 1 worktree.
- Step 3 engine wiring: platform/assets/see/hour.html (prototype page ported: minutes left, Pause, welcome back,
  compact save, end posts answers), assets/see/see/{engine,people,sound,strings}.js copied whole, store.js (4-bit RLE
  codec for 28x28 drawings), Engines.see in platform/engines.js, CSS hides the round ? on this lesson only.
- Design calls: one framed page holds everything; platform does the Do now; save = localStorage full + compact
  platform draft (draft.see, < 8000 chars, trim rule); Finish posts answers -> App.submitExit.

## Next
- Step 4 content (j3-07.json, recap-pool r-j3-701..705 thread kp-ml-pattern, manifest, deck JSON), pack, mount on dev server.
- Step 2 seven gates in tools/record-tutorial/j3l7see-*.js, each with a failing control.
- Steps 5-10: cold reads, gates green, sit report, deck deploy, pack+deploy V80, PR, RESUME_HERE.

## Meter
13:18 · context 88k · 5h 10% · week 17% · calls 40
