# My Amazing World — deploy log

## 23 Sep 2026 · draft PR (branch draft/issue-39-geog-my-amazing-world) · Opus 5.5 build window
Nothing merged or published. Gates run on the final commit against `python3 -m http.server 8098` from the repo root.

| Gate | What it proves | Result | Control (must fail) |
|---|---|---|---|
| G1 judge (`tests/judge.test.js`) | every judging routine against real geometry: oceans, continents, countries, counties, features, pins, sort, photos, token | 122 / 0 | altered token points, name, check, over-max leg → all invalid |
| G2 coverage (`tests/coverage.test.js`) | every booklet item is in data.js AND asked by a leg | 138 / 0 | drop Fermanagh → FAILS |
| G3 strings (`tests/strings.test.js`) | pupil words only in strings.js; verb-first task lines; no taglines | 6329 / 0 (566 strings) | "Learn geography the fun way!" → FAILS |
| G4 data (`tests/data.test.js`) | 32 counties, 4 provinces, 7 expeditions, 3 real credited photos, maxima total 232 | 99 / 0 | drop a county → FAILS |
| G5 pixels (`tests/pixels.test.js`) | every screen at 375 / 768 / 1280: no sideways spill, card above the fold, map inked, photo showing, stamp visible | 300 / 0 | `MAW_BLANK=1` (maps hidden) → 21 FAIL |
| A12 teacher (`tests/teacher.test.js`) | passcode gate, 3 pasted tokens → 2 rows + 1 red, sort, CSV, KML, GeoGuessr link | 13 / 0 | gate forced open → FAILS; verifier fooled → FAILS |

Hand checks: Leg 6 photos tapped inside and outside each hotspot at 1280 → 2 / 0 each, wrong tap shows red dot and gold outline. Cold read of strings.js (one packet, round 1): 2 flags (Lough article, ruler step order) — both agreed and fixed; no round 2 needed.

Shots: `tests/shots/` (git-ignored), 100 screens × 3 widths.
