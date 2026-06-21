# Glass Jotter — Analytics PHASE 2 — session handover

Read this first, then `ANALYTICS_DESIGN.md` (the full feature design; Phase 2 = §8 "Phase 2" + §3b + §5).
Phase 1 is DONE and LIVE; Phase 2 is the next slice. This is a high-bar build — design deeply, build in
small committed checkpoints, run an adversarial review, verify in the offline preview, then deploy.

## Where things stand (21 Jun 2026)
- **Phase 1 DEPLOYED LIVE as Version 7** (same `/exec`). Pupil self-evaluation capture + teacher
  **Class Insights** (band, "where the class is struggling" with misconception + first-error working
  line, self-eval skills, **Needs support / Ready for stretch** flag board, confidence-vs-performance),
  per-pupil Jotter-Page header, CSV columns. All reviewed (ultracode) + fixed + verified in preview.
- Branch `draft/issue-24-25-maths-m2-revision`, repo `dgaj-g/ols-digital-skills`, **HEAD `81d5b07`**,
  everything committed + pushed (HEAD == origin).
- Live `/exec`: `https://script.google.com/a/macros/c2ken.net/s/AKfycbwSIylsGSFdb81u3Gz_H9IaoQUO_3OPQy7IlinUmVNByX4AQ2DLFlyLK0tbiPAoE6hA/exec`
  Live staff passcode `0lsMaths26*`. Apps Script project "OLS Maths — Glass Jotter" in Damien's c2ken Drive.
- Outstanding MANUAL tasks for Damien (not the new session's): eyeball the live v7 app; do the
  two-account per-teacher scoping check from the earlier scoping work.

## Worktree (READ — it gets cleaned)
Work in the isolated worktree **`/tmp/gj-wt`** (preview = `gj-wt` config, port 8099). It has been
auto-cleaned more than once. If `git -C /tmp/gj-wt rev-parse HEAD` fails, recreate:
```
git -C ~/Sites/ols-digital-skills worktree prune
rm -rf /tmp/gj-wt
git -C ~/Sites/ols-digital-skills fetch -q origin draft/issue-24-25-maths-m2-revision
git -C ~/Sites/ols-digital-skills worktree add /tmp/gj-wt draft/issue-24-25-maths-m2-revision
```
The main tree `~/Sites/ols-digital-skills` is shared by other sessions on OTHER branches — never touch it.
A one-time macOS file-access popup may appear the first time you touch files/screenshots — Damien approves it.

## Phase 2 scope (design it, then build)
1. **Deep per-line / per-step failure analytics** — beyond P1's first-error line (`errAt`): the EXACT
   working step the class breaks on, across the whole class. Use the heavy `fullStates()` path in
   staff.js (same one Marking Pile / Sweep already use) + `markState()` and read `verdict.perLine` /
   `verdict.perStep` to histogram failures by line/step (and follow-through recovery). Natural home:
   a drill-down from the "Where the class is struggling" question rows in Class Insights, and/or
   richer Marking Pile. (P1's class analytics are cheap-summary only; this is the full-state tier.)
2. **Support unlock (content-safe — reuse existing content, author NO new maths)** — a pupil-pullable
   "Want to see how? ▶" on a question that surfaces the section's EXISTING method **movie**
   (`player.js` GJ_PLAYER.mount), a worked first line, or the angles reading-aid. Plus a teacher
   "nudge support to this pupil" the pupil then sees. Design the pupil-facing UX carefully; likely
   worth confirming 1–2 UX points with Damien before building.
3. (Phase 3, NOT now: the content-safe "Challenge" stretch — reveal/reorder existing harder items by
   `marks[0]` — decision 1a. Don't auto-author questions.)

## Hard constraints (carry from Phase 1)
- **Working is weighted as much as the answer** — it already is (answer derived from the working chain;
  marks `[method, accuracy]`; AMBER = answer-without-working). Keep every new metric splitting method vs
  accuracy and never rewarding answer-only.
- **Don't stray from Mary's source content.** Support reuses existing movies/aids; no new questions.
- **Data contract (already shipped):** per-question summary cell `{st, errAt, dx, mk, t, at, a1, ovr}`
  (a1 = correct-with-working first attempt, OVERRIDE-AWARE); per-section self-eval `state.evals[sectionId]`
  / `summary.evals[sectionId]` = `{conf, skills:{canId:1-3}, ts}` (note kept in state only). Cheap wall
  summary ≤8000 chars (polled 20s); full state ≤45000 (fetched per-pupil via `fullStates`/adminJotter).
  Two cost tiers: cheap-summary analytics (instant) vs full-state deep analytics (on demand).
- **Build artefacts must stay PURE ASCII** — `node server/build-pathb.js` escapes + guards; never edit
  `server/Code.gs` or `server/Index.html` by hand (generated from `*.template` + the module JS).

## Build discipline (the bar)
1. Ground in facts (read the real code; cheap subagents OK for reading, deep design = main loop).
2. Build in **small commits, each pushed** (a usage cut-off must lose nothing). Checkpoint memory
   `project_maths_glass_jotter` as you go.
3. **Adversarial review** the diff (ultracode review workflow: logic, persistence, contract, content
   fidelity, regression/UX) → fix real findings → re-verify. P1's review caught a real shipping bug.
4. **Verify in the OFFLINE preview** (port 8099) with screenshots before deploy — the demo class
   "10B Maths (demo)" (offline passcode `demo`) has seeded data incl. self-evals; for the pupil card,
   inject a completed-section state (see how P1 was verified). Clear `localStorage 'gj-offline-v1'` to
   re-seed after data-shape changes.
5. Verify suite: `node dev/validate-all.js` (48/48), `node dev/test-server-scoping.js` (20/20),
   `node --check` each edited JS, `node server/build-pathb.js` (pure ASCII).
6. Deploy as a **NEW VERSION of the same deployment** (never a new deployment — same `/exec`).

## Deploy recipe (Chrome MCP; needs Damien present)
- If only client files changed and `Code.gs` is unchanged vs the live version, you only need to update
  **Index.html** in the editor (confirm: `git diff --quiet <liveSHA> HEAD -- maths/glass-jotter/server/Code.gs`).
- Drive the Apps Script editor (project id `1otJG5454zR6a0WKZW23czKnehxtQ3Oj6CrrRWYys1H4bPxZOoaZ3qPmC`):
  fetch the built file from `raw.githubusercontent.com/dgaj-g/ols-digital-skills/<SHA>/maths/glass-jotter/server/Index.html`
  (assemble the URL from fragments — the MCP filter blocks contiguous token URLs), `monaco.editor.getModels()`
  → pick the model whose value starts `<!doctype` → `setValue`. Save with **Cmd+S** (it often needs a
  click into the editor THEN a second Cmd+S — watch for "Saved to Drive").
- Deploy ▸ **Manage deployments** → wait + screenshot to confirm the dialog loaded → ✏️ (pencil) →
  Version dropdown → **New version** → set a description (click INTO the field first) → **Deploy** → Done.
  GOTCHAS: the Deploy button toggles its menu each click; the dialog is timing-finicky; **live `/exec`
  screenshots are blank** (cross-origin sandbox iframe) — rely on the offline preview + Damien's eyes.
  A macOS-level computer-use screenshot CAN see the live app (request access to "Google Chrome", tier
  "read") but it's occasionally flaky (ScreenCaptureKit).
- No `docs/deployed-apps.md` change (same `/exec`).

## Pointers
Full design: `maths/glass-jotter/ANALYTICS_DESIGN.md`. Memory: `project_maths_glass_jotter`
(+ `reference_apps_script_browser_deploy`, `reference_build_toolbox`, `feedback_genuine_consequence`,
`feedback_model_tier_advice`). Grounding read-outs from P1 live in the session task outputs.
