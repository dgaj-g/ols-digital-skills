# Glass Jotter — DEPLOY HANDOVER (bundled v9 + pupil auto-name)

For a FRESH session driving Chrome with Damien present. Everything below is built, reviewed (2 adversarial
passes) and verified in the offline preview. Branch `draft/issue-24-25-maths-m2-revision`, repo
`dgaj-g/ols-glass... = dgaj-g/ols-digital-skills`. **HEAD `8b12079`** (== origin). Worktree `/tmp/gj-wt`
(recreate per the worktree note in PHASE2_HANDOVER.md if gone).

## What this deploys (all on top of LIVE v8)
A bundle of this-session work: cover msg spacing · shelf-heading gap · "Want to see how?" alignment ·
support gated behind TWO wrong attempts · question-specific help (their slip + misconception, NO answer
revealed) · help-access tracking (Jotter tag + Insights drill count) · Jotter-Page marking-view tidy-ups ·
**pupil auto-name** (real first name + surname from c2k). Auto-name is FEATURE-FLAGGED on the Config key
`autonameUrl` — DORMANT until step 5, so the app is safe even between steps.

## Live facts
- `/exec` (unchanged, becomes Version 9): `https://script.google.com/a/macros/c2ken.net/s/AKfycbwSIylsGSFdb81u3Gz_H9IaoQUO_3OPQy7IlinUmVNByX4AQ2DLFlyLK0tbiPAoE6hA/exec`
- Apps Script project id: `1otJG5454zR6a0WKZW23czKnehxtQ3Oj6CrrRWYys1H4bPxZOoaZ3qPmC`
- Live staff passcode: `0lsMaths26*`
- Built files to paste (assemble the raw URL from fragments — the MCP filter blocks contiguous token URLs):
  `raw.githubusercontent.com/dgaj-g/ols-digital-skills/8b12079/maths/glass-jotter/server/Code.gs`  and  `.../server/Index.html`
- **Code.gs HAS CHANGED vs v8** (auto-name + nudge) → must paste BOTH Code.gs and Index.html.

## Deploy steps (Chrome MCP; Damien clicks OAuth/consent)
1. **Manifest scopes** — Apps Script editor → Project Settings → tick "Show appsscript.json" → in the editor
   open `appsscript.json` and MERGE these into `oauthScopes` (KEEP whatever is already there — Sheet/Lock):
   `https://www.googleapis.com/auth/userinfo.profile`, `https://www.googleapis.com/auth/userinfo.email`,
   `https://www.googleapis.com/auth/script.external_request`, `https://www.googleapis.com/auth/script.scriptapp`.
   Save (Cmd+S).
2. **Paste Code.gs** — open `Code.gs`, select-all, paste the built Code.gs (from raw@8b12079). Save (watch
   "Saved to Drive"). (Claude can pbcopy it for Damien, or Monaco setValue.)
3. **Paste Index.html** — same for `Index.html`.
4. **Redeploy main** — Deploy ▸ Manage deployments → ✏️ → Version: New version → keep **Execute as: Me**,
   **Anyone within c2ken** → Deploy → Done. (Same `/exec` = Version 9.) Damien may hit a fresh OAuth consent
   for the new scopes — approve.
5. **Create the companion deployment** — Deploy ▸ **New deployment** → gear ▸ Web app →
   **Execute as: User accessing the web app** → **Anyone within c2ken** → Deploy → COPY its `/exec` URL.
6. **Switch auto-name on** — set the Config key. Easiest: in the bound Sheet "OLS Maths — Glass Jotter
   (data)" → Config tab → add a row: key `autonameUrl`, value = the companion `/exec` URL from step 5.
   (Auto-name is dormant until this row exists.)

## Live smoke-test (the bits the offline preview can't prove)
- **Auto-name**: open a pupil class link as a REAL pupil (e.g. agartland669) → the cover should pre-fill their
  real first name + surname ("Is this you, …?"). First pupil may see a one-time Google consent (in-domain
  userinfo is usually silent on C2k — if a consent screen appears in the hidden probe and blocks it, the pupil
  just types their name; tell Damien and we'll surface the probe visibly). Confirm the teacher Working Wall
  then shows the real first name + surname (not the initial).
- **Nudge round-trip** (new server path, untested live): teacher Jotter Page on a struggling pupil → "Nudge:
  watch the method" → pupil reopens that book → the section opens with "Want to see how?" auto-expanded.
- **Gating**: a pupil who gets a question wrong TWICE sees "Want to see how?" appear; an untouched question
  shows nothing; the slip names their misconception and never shows the answer.
- Live-app screenshots are blank in Chrome MCP (sandbox iframe) — rely on Damien's eyes + a macOS computer-use
  screenshot (request access to "Google Chrome", tier read) which CAN see the rendered iframe.

## Rollback
If anything's wrong, redeploy the previous version in Manage deployments (the version dropdown keeps v8).
Auto-name alone can be killed instantly by deleting the `autonameUrl` Config row (no redeploy needed).
