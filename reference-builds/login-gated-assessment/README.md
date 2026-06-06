# Reference engine — login-gated assessment / competition with a teacher admin

A reusable, brand-neutral **starting point** for any future login-gated activity that needs
a **teacher admin section, class management (create / select / delete), shareable per-class
links + QR codes, and a results/stats dashboard**. It is the engine extracted from the
**Girls Coding with Confidence — Computational Thinking Challenge** (a standalone, non-OLS
one-off), with that activity's branding neutralised and its real questions removed.

Pair this with the **"Login-gated collaborative activities"** section of
`docs/BUILD_PLAYBOOK.md` — that's the authoritative process; this folder is the code to copy.

## What's here (and what's deliberately NOT)

```
challenge/
  index.html      front-end shell (all screens; brand neutralised — REBRAND before use)
  style.css       theme + every screen's styles (example palette — RETHEME before use)
  script.js       the reusable brains: pluggable transport (Path B + offline mock),
                  screen flow, authoritative timer, scoring, 7-level ranking/tie-breaks,
                  per-class live leaderboard, teacher dashboard + class management + QR,
                  and an 8-type visual renderer (iconRow/iconGrid/table/graph/sequence/
                  tree/gridRoute/pixelGrid)
  qrcode.min.js   vendored node-qrcode (MIT) for in-page per-class QR codes
  questions.js    >>> GENERIC SAMPLE (3 questions) so the engine runs. Replace wholesale.
server/
  Code.gs.template   the Apps Script server (auth, per-class attempts, server-side scoring,
                     leaderboard, passcode-gated admin). Holds the answer key on the server.
  build-pathb.js     assembler -> emits Code.gs (bank injected) + Index.html (NO answer key),
                     both PURE ASCII (escapes non-ASCII so Apps Script can't corrupt it)
```

**Not in this public repo, on purpose:** the real activity's `questions.js` (it contains the
answer key — a public answer key lets pupils cheat) and the generated `Code.gs` / `Index.html`
(they embed it). Author the real questions privately; only the engine is public here.

## How to reuse it

1. Copy this folder to your new activity's working area (in Claude Work, not the public repo,
   if it carries an answer key).
2. Write your real `challenge/questions.js` (same schema as the sample).
3. **Rebrand** (see checklist below).
4. `node server/build-pathb.js` → produces `Code.gs` + `Index.html`.
5. Deploy per `docs/BUILD_PLAYBOOK.md` (new Sheet → Apps Script → paste both → `initBoard` →
   set `staffPasscode` → Web app, Execute as Me, Anyone within your domain) and record the
   `/exec` URL in `docs/deployed-apps.md`.

## REBRAND CHECKLIST — required for an OLS school build

This engine is from a **non-OLS** activity, so it has **no OLS branding and no intro video**.
For an **OLS** build you MUST restore both:

- [ ] **Palette →** OLS in `style.css` `:root`: deep blue `#1A3A6B`, gold `#E4B824`, borders
      `#595959` (replace the example purple/aqua/coral "Digital Future" theme).
- [ ] **Wordmark / header / footer →** the OLS crest + `OLS Digital Skills` wordmark (replace
      the neutral `Your Brand Here` placeholder wherever it appears in `index.html`).
- [ ] **Intro video (MANDATORY for OLS) →** add `<script src="../../assets/intro-loader.js"></script>`
      just before `</body>` — this gives the OLS crest particle-assembly intro and auto-picks
      the **portrait** (`intro-portrait.mp4`) vs **landscape** (`intro.mp4`) render by device.
      The assembler drops the intro for the Path B page, so re-add per the playbook if needed.
- [ ] **Footer brand mark →** the OLS `.act-footer` (crest + "OLS Digital Skills").
- [ ] **Titles / copy →** set the real activity title and instructions (replace the example
      "20 questions / 40 minutes / 250 points" facts and sample wording).
- [ ] **Server `setTitle` →** set the real activity name in `server/Code.gs.template`'s `doGet`.

(For a non-OLS build like the original GG one, apply that client's branding instead, and leave
the intro-loader out unless they have their own.)

## The gotchas this engine already solves (keep them)

- **Pure-ASCII deploy files** (`build-pathb.js` escapes every non-ASCII char) — stops Apps
  Script/HtmlService corrupting smart quotes, accents and emoji into mojibake.
- **Plain-text Sheet cells** (`setNumberFormat('@')`) — stops class names like `June-2026`
  being auto-converted to dates, which breaks class matching.
- **Primitive-only returns** over `google.script.run` — a stray Date/object makes the RPC fail
  silently. Every field is coerced to String/Number; bad rows are skipped.
- **Forgiving passcode** (`trim().toLowerCase()`, validated server-side) and a client `.catch`
  on every call so errors surface instead of hanging.
- **Sandboxed-iframe fixes** — `doGet` injects the class + real `/exec` URL via `window.GG_BOOT`
  (the iframe can't read its own URL); `<base target="_top">`; "Open board" navigates the tab.
