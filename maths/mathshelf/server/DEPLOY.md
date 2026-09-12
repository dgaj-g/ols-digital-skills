# MathShelf — the deploy checklist

## TWO PROJECTS, from Book A's cut (12 Sept 2026)

**One `Code.gs`, two Apps Script projects, no manifest ever touched again.**
Damien's ruling of 12 Sept: "I want you to do all of this via the session." What
stopped that was ONE project carrying BOTH deployments and therefore ONE
`appsscript.json`: a DATA cut meant flipping `executeAs`/`access` and flipping
it back for the front door — the two-line edit the desktop app refuses every
Claude session. Two projects means each manifest is set ONCE, in the New
deployment dialog, and RESTS there for good.

| project | what it is | bound to the Sheet? | manifest webapp (set once, never edited) | script properties | its `/exec` |
|---|---|---|---|---|---|
| **DATA** | the store: `doPost` → `apiRelay` → `api*`. Owns the Sheet, the marking store, the class registry, the per-teacher scoping. | **No — STANDALONE.** It opens the Sheet by id: `ss_()` reads the `sheetId` script property and calls `SpreadsheetApp.openById`. | `executeAs: USER_DEPLOYING`, `access: ANYONE_ANONYMOUS` | `sheetId` = the Sheet's id (`1xVDBKmPP83MMZPqpPJr0GQRR0N9estf9ebhKyhGQd0Y`), `relaySecret` = the same 256-bit secret the front door holds | visited by nobody — the page POSTs to it with a store token; the relay POSTs to it with the secret |
| **FRONT DOOR** | serves the page (`doGet`), reads her name from her own token, mints her store token, relays when the page's own road is closed (`apiCall`). | Yes — the existing bound project (`1oW-8eFK4DUvTZaB56jg_rYd7l_L_zPY-5Um16v0gtq_dlbThvbLczhOX`). It never opens the Sheet: `sheetId` is UNSET here and `doGet` runs as the pupil. | `executeAs: USER_ACCESSING`, `access: DOMAIN` — **rests here forever** | `relaySecret` (unchanged), `dataUrl` = the NEW DATA project's `/exec` | every pupil and every teacher; every class link |

**What this changes about a cut:**

- **A new book is CLIENT-ONLY plus ONE Config row edit.** The server's act
  whitelist is `acts_()` = the built-ins (`angles`, `algebra`,
  `stats-quartiles`) UNIONED with the Config tab row whose Key is `acts` and
  whose Value is a JSON array of ids, e.g.
  `["angles","algebra","stats-quartiles","stats-collect"]`. Ids must match
  `^[a-z][a-z0-9-]{1,40}$`; a malformed row or a junk id is ignored and the
  built-ins stand, so nothing live can be switched off by a typo. A book still
  arrives UNTICKED for every class (an absent key reads false). Book A =
  add `"stats-collect"`; Book B = add `"stats-averages"`. No server cut.
- **A `Code.gs` change = paste the built `server/Code.gs` into BOTH projects
  and cut a new version of each** (Manage deployments → edit → New version).
  No manifest is read for a flip because no flip happens; read it anyway
  (the dialog lies — see below) and write down what it said. The
  `Index.html` file lives only in the front-door project.
- **A client-only change = paste `Index.html` into the front-door project and
  cut a new version there.** Exactly as before.
- **The same file runs in both homes** — proved, not assumed: `qa-two-homes`
  loads the template into a bound world (no `sheetId`, the active
  spreadsheet) AND a standalone world (`sheetId` set, `getActiveSpreadsheet`
  throws) and runs the whole DATA matrix in each; controls
  `acts-hardcoded`, `acts-any-string`, `active-spreadsheet-call-site`.

### AS DONE, 12 Sept 2026, 22:0x–22:3x (the session in Chrome; Damien's clicks named)

- DATA project **OLS — MathShelf DATA**, script id `14j0H7VGmJreENIQYSLfepXXVfU5F7QGhVv45TwSstXwEhm5eP7m7jn3h`, created and named by the session; `Code.gs` pasted from the tree (46,004 chars, byte-identical to `server/Code.gs` at `8891d90`); `sheetId` typed by the session; `relaySecret` copied from the bound project's Script Properties and pasted by **Damien** (a value no session types or records).
- Deployment: New deployment → Web app → Execute as Me → Who has access **Anyone** → Deploy (the dropdown and Deploy driven by the session once Damien allowed the action in the desktop app; the OAuth **Authorise access → Allow** was his click). **Version 1, 12 Sept 2026, 22:31**, Deployment ID `AKfycbzjSy3tZDPohHUfKRXgmFnK6iWlkOGvU_IPU8g1xKecvWRdVuQ86t7G6cL7lV5P6yRkiA`,
  `/exec`: `https://script.google.com/macros/s/AKfycbzjSy3tZDPohHUfKRXgmFnK6iWlkOGvU_IPU8g1xKecvWRdVuQ86t7G6cL7lV5P6yRkiA/exec`.
- Its manifest, READ in the editor after the cut (Project Settings → Show manifest): `"webapp": { "executeAs": "USER_DEPLOYING", "access": "ANYONE_ANONYMOUS" }`, no `oauthScopes` block (auto-detected).
- Proved from outside Google, 22:47: a POST with a wrong secret → 302 → `{"ok":false,"error":"bad-secret"}`; a forged token → `{"ok":false,"error":"token-bad"}` — the endpoint answers anonymously and the secret IS configured (an unset one answers `no-secret-configured`).
- `initJotter` was NOT run: the Sheet already carries its tabs, and the consent was granted by the deploy's own authorisation. The first real call through the front door is what proves `openById` (Executions → `doPost` Completed).
- Config row `acts` = `["stats-collect"]` typed into the Sheet's Config tab (row 10) by the session, 22:45. Built-ins stay in the code, so the row lists only the books the code does not.
- Steps still to complete at Book A's deploy: `dataUrl` on the bound project → the new `/exec` (Damien's paste — the desktop app refused the session that edit); `Code.gs` + `Index.html` into the bound project and a new FRONT DOOR version; the old DATA deployment archived once a `doPost` row shows on the new project.

### One-time steps (as planned; the secret is a value no session may type)

1. **Create the DATA project.** script.google.com → New project (standalone —
   NOT from the Sheet's Extensions menu). Name it **OLS — MathShelf DATA**.
2. **Paste the built `server/Code.gs`** into its `Code.gs`. No `Index` file is
   needed in this project.
3. **Script properties** (Project Settings → Script Properties → Add):
   `sheetId` = `1xVDBKmPP83MMZPqpPJr0GQRR0N9estf9ebhKyhGQd0Y`;
   `relaySecret` = **the same value the front-door project already holds**
   (copy it out of the bound project's Script Properties and paste it in —
   it never goes through a chat window, a commit or this file).
4. **Run `initJotter` once** from the editor (Run → initJotter) and accept the
   consent screen — this is the OAuth moment for the Sheet and it proves
   `openById` works from this project.
5. **Deploy → New deployment → Web app → Execute as: Me → Who has access:
   Anyone → Deploy.** Then open `appsscript.json` (Project Settings → Show
   manifest) and READ it: `"executeAs": "USER_DEPLOYING"`,
   `"access": "ANYONE_ANONYMOUS"`. Write down what it said. Copy the new
   `/exec` URL.
6. **Point the front door at it.** In the BOUND project's Script Properties set
   `dataUrl` = the new DATA `/exec`. Paste the same built `server/Code.gs`
   into the bound project's `Code.gs` too (one file, two homes), and cut a new
   FRONT DOOR version: Manage deployments → the FRONT DOOR → edit → New
   version → Deploy. Its manifest should read `USER_ACCESSING` + `DOMAIN` —
   read it, write it down, and never edit it again.
7. **Add the Config row.** In the Sheet's Config tab, a new row: A = `acts`,
   B = `["angles","algebra","stats-quartiles","stats-collect"]`.
8. **Prove it**: open a class link, save one line in Angles, then in the DATA
   project's Executions confirm a `doPost` row completed. Record both rows in
   `DEPLOY_LOG.md` (a `DATA` row naming the new project, a `FRONT DOOR` row).
9. **Retire the old DATA deployment** on the bound project (Manage deployments
   → the old MAIN/DATA deployment → archive) once the new one is proved. Its
   `/exec` is in no page any more: `dataUrl` is the only place it was named.

From then on every server change is steps 2 + 6 (paste into both, cut a version
of each) and every book is step 7 — none of it touches a manifest.

---

## The single-project era (kept as history)

> Everything below describes the ONE-PROJECT, TWO-DEPLOYMENTS model that ran
> from the store cut (12 Sept 2026, DATA V32 / FRONT DOOR V33) until the split
> above. Its flip-and-flip-back is exactly what the two-project model removes.

**One project, two deployments.** Do them in this order, and read the manifest
before each version cut.

**DATA NEEDS A NEW VERSION ONLY WHEN `Code.gs` CHANGES; A CLIENT-ONLY CUT
RE-CUTS THE FRONT DOOR ONLY (12 Sept 2026).** `qa-build` prints both md5s;
compare the Code.gs md5 with the last DATA row of `DEPLOY_LOG.md`.
When it has not changed, skip section 1 entirely: paste the built `Index.html`,
read the manifest, cut the FRONT DOOR as a new version, record one row. The
manifest **RESTS at the front door's values — `USER_ACCESSING` + `DOMAIN` —
between cuts**, and is flipped to `USER_DEPLOYING` + `ANYONE_ANONYMOUS` only for
the minutes of a DATA cut, then put back. (The desktop app's permission layer
refuses every Claude session an edit of the manifest's `executeAs`/`access`
lines, so a cut that needs the flip needs Damien's hands; a front-door-only cut
needs nobody's.) `qa-manifest` post-deploy asks that the last FRONT DOOR row's
commit carries a `Code.gs` whose md5 equals the last DATA row's — a matched
pair when Code.gs changed, a front-door-only row otherwise.

> **THE DEPLOYMENT DIALOG LIES.** On 24 June 2026 a version was cut while the
> dialog displayed "Execute as: Me" and the manifest said `USER_ACCESSING`; every
> pupil in the school then ran the app as the deployer. The dialog is not
> evidence. Never trust it. Read `appsscript.json` in the editor, with your own
> eyes, immediately before each cut, and write down what it said.

| | what it is | executeAs | who has access | who ever visits it |
|---|---|---|---|---|
| **DATA** | the main `/exec`. Owns the bound Sheet, the marking store, the class registry and the per-teacher scoping. | `USER_DEPLOYING` (Me) | **Anyone, including anonymous** — see below | nobody — only the front door, server to server |
| **FRONT DOOR** | a NEW deployment. Serves the page, reads the pupil's own name from her own Google token, mints her STORE TOKEN, and relays a data call to DATA when the page's own road is closed. | `USER_ACCESSING` (User) | Anyone within `c2ken.net` | every pupil and every teacher |

**THE DIRECT PATH (the store cut, 12 Sept 2026, ruling 51).** The page calls
DATA itself. `doGet` puts `BOOT.store = { url, email, exp, sig }` in the served
page — the DATA `/exec`, her verified email, an expiry eight hours out and an
HMAC-SHA256 of `email|exp` under `relaySecret` — and `script.js` POSTs every
call there as a simple request (`text/plain`, `redirect: follow`, a 25 s
timeout). `doPost` accepts EITHER the secret (the relay, unchanged) OR a token
whose signature it recomputes; `token-expired` makes the page ask `apiCall`
`{action:'token'}` for a fresh one and retry once; a token refused twice, a
network error or the timeout fall back to the relay for that call, and the
console says so. WHY: the relay — `UrlFetchApp` from Apps Script to Apps Script
— measured 3–68 s for a call whose own Sheet write is 0.8–7 s; the same POST
from a browser measured 2.1–2.5 s (12 Sept 2026, 20:08, on the live page).
The bearer the relay used to send is gone: it made two of three probes 404.
Both deployments are cut for it (below), DATA first.

**Why two.** Full line-by-line working cannot live in ScriptProperties at class
scale, so the store has to be the owner's private Sheet — and that needs
execute-as-Me. But a pupil's real name can only be read with the PUPIL's own
token — and that needs execute-as-User. Two deployments buys both, and it is
what makes her full name appear on her very first visit with nothing to type.

---

## Before you start

1. `git push` first. The built page pulls its fonts, the crest and the intro
   films from the pushed github.io site: **shipping is not delivering**, and a
   version cut before the push serves a page whose assets 404.
2. `node tools/qa/run.js --full` green, and `node tools/qa/run.js --control`
   green, at the commit you are about to deploy.
3. `MS_PROBE_LIVE=1 node tools/qa/qa-build.js` — after the push — so the live
   asset probe reads what pupils will read.
4. Set the two script properties, once, in Project Settings → Script Properties:
   - `relaySecret` — a long random string. It never leaves the server. Make one
     with `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`
     and paste it straight into the property; it does not belong in this repo,
     in a commit message, or in a chat window.
   - `dataUrl` — filled in at step 3 below, once the DATA `/exec` exists.

## 1 · DATA (do this one FIRST — and ONLY when `Code.gs` changed)

The front door has nothing to relay to until this exists. A cut whose `Code.gs`
md5 equals the last DATA row's skips this whole section.

1. Open the Apps Script project (`1oW-8eFK4DUvTZaB56jg_rYd7l_L_zPY-5Um16v0gtq_dlbThvbLczhOX`), bound to
   the Sheet `1xVDBKmPP83MMZPqpPJr0GQRR0N9estf9ebhKyhGQd0Y`, both titled
   "OLS - MathShelf". **Not `1otJG5454zR6a0WKZW23czKnehxtQ3Oj6CrrRWYys1H4bPxZOoaZ3qPmC`** - that project is
   RETIRED (its OAuth client still carries the dead name); see the last
   section of `DEPLOY_LOG.md`.
2. Paste the built `server/Code.gs` into `Code.gs` and the built
   `server/Index.html` into the HTML file named exactly `Index`.
3. **Open `appsscript.json` and read it.** It RESTS at `USER_ACCESSING` +
   `DOMAIN` (the front door's), so for a DATA cut it must be flipped — both
   fields — to `"executeAs": "USER_DEPLOYING"` and `"access":
   "ANYONE_ANONYMOUS"`, saved, and **read again**. Write down what it actually
   said. (This flip is Damien's two-line step; see the note at the top.)
4. Save. Deploy → Manage deployments → the existing MAIN deployment → edit →
   **New version** → Deploy. The `/exec` does not change.
5. Record the row in `DEPLOY_LOG.md`: date, `DATA`, the version number, the
   executeAs **as you read it in the manifest**, the commit, and the two md5s
   (`node tools/qa/qa-build.js` prints them).
6. Open Executions and confirm a `doPost` or `apiRelay` row completes. Paste
   that line into `DEPLOY_LOG.md` as the proof row.
7. Copy the DATA `/exec` URL into the `dataUrl` script property.

## 2 · FRONT DOOR

1. **Open `appsscript.json` in the editor and READ it.** It must say
   `"executeAs": "USER_ACCESSING"` and `"access": "DOMAIN"` — where it rests.
   Only after a DATA cut (section 1) does it need changing back to those two
   values: change both fields, Save. (The repo copy is the DATA manifest:
   `USER_DEPLOYING` + `ANYONE_ANONYMOUS`; the editor's copy rests at the front
   door's. If it reads `USER_DEPLOYING` and no DATA cut is in progress, somebody
   put it back — that is Damien's two-line edit before the cut, not Claude's.)
2. **Read it again.** It must say `USER_ACCESSING`. Write down what it said.
3. **Updating the front door that already exists** (the normal case - every
   class link points at its `/exec`, so the URL must not change): Deploy →
   Manage deployments → the existing FRONT DOOR deployment → edit → **New
   version** → Deploy. Only when creating it from nothing: Deploy → **New
   deployment** → Web app → Execute as: **User accessing the web app** → Who has
   access: **Anyone within c2ken.net** → Deploy.
4. Record the row in `DEPLOY_LOG.md`: date, `FRONT DOOR`, version, the executeAs
   as READ, the commit, the md5s (the Index.html md5 is this cut's; the Code.gs
   md5 must equal the last DATA row's — `qa-manifest` checks both).
5. Open the new `/exec` once yourself so the one-time permission screen is
   accepted, then open Executions and confirm `doGet` completes **and** that a
   relayed `apiCall` completes. Paste both lines in as proof rows.
6. LEAVE the manifest at `USER_ACCESSING` + `DOMAIN`. That is where it rests,
   so the next client-only cut needs no edit from anyone.

## WHY DATA IS PUBLISHED TO ANYONE, AND WHY THAT IS SAFE

A web app published to "Anyone within the domain" cannot be called
server-to-server. `UrlFetchApp` carries no session, so Google answers with the
sign-in page and `doPost` never runs; a bearer token from
`ScriptApp.getOAuthToken()` is answered **401** unless the caller's manifest
also asks for a Drive scope — which would put *"See and download all your
Google Drive files"* on every pupil's consent screen. Proved on 6 Sept 2026:
`RELAYDIAG code=401`, and before that an Executions log with an `apiCall` row
and no `doPost` row beside it.

So DATA is published to Anyone and **the shared secret is the whole lock** —
directly for the relay, and as the signing key of the store token for the page:

- it is 256 bits of URL-safe random, generated with
  `python3 -c "import secrets;print(secrets.token_urlsafe(32))"`;
- it lives only in a script property of this one project — never in this repo,
  never in a commit message, never in a chat window, never in the served page:
  `qa-two-homes` walks every return value, every BOOT field, the served doGet
  output and the built `Index.html` (control `secret-in-the-page` plants it in);
- the DATA URL DOES reach the browser since the store cut (`BOOT.store.url`):
  the page calls it. What guards the door is not the URL but the token — a
  call with neither the secret nor a valid signature is `bad-secret`; a forged
  signature `token-bad`; an old one `token-expired`; and the signature covers
  the email, so a token minted for one pupil cannot be presented as another
  (controls `token-any-signature`, `token-never-expires`,
  `token-for-another-pupil`). A token buys eight hours of being HERSELF: the
  same calls she could already make through the front door as herself;
- `apiRelay` refuses every call if no secret is configured at all.

The FRONT DOOR — the only `/exec` anybody visits — stays `DOMAIN`.

## WHAT A PUPIL SEES THE FIRST TIME, and the one thing that can stop it

The front door runs as the USER, so the first time a pupil opens it Google asks
her to allow the app. **One project means one manifest**, so the consent screen
lists every scope the project declares — including the bound spreadsheet, which
only the DATA side ever touches. That is not avoidable without splitting the
project in two, and the two-deployment design is what buys her real name.

The scopes she will be asked for: her email address, her basic profile (this is
the one that carries her full first name), the ability for the script to call
out to the web (the relay), and the bound spreadsheet.

**If she gets a 403 instead of a consent screen**, C2k has not pre-trusted the
app for pupil accounts — the same wall the auto-name companion hit. That is a
C2k-side allow-list, not a code change: nothing in this repo can fix it, and
the app cannot read her name until it is lifted. Smoke-test with a REAL pupil
account before telling a class it is ready.

## 3 · Afterwards

1. Retitle the Apps Script project and the Sheet to **OLS — MathShelf**.
2. Delete the `autonameUrl` row from the Config tab. The auto-name companion,
   its hidden probe and its consent bounce are retired; nothing reads that row.
3. Retire the companion deployment (Version 21). Nothing points at it.
4. In Set-up, regenerate the class link and QR for every class — they now point
   at the FRONT DOOR `/exec`. The old links stop working, and the old Sheet data
   is untouched.
5. `MS_POST_DEPLOY=1 node tools/qa/qa-manifest.js` and
   `MS_POST_DEPLOY=1 node tools/qa/qa-repo-prod.js` — both green.
6. Damien walks the eight-line live smoke list at the foot of `DEPLOY_LOG.md`,
   and the audit row flips to approved only when the log carries his line.

## If something is wrong afterwards

Both deployments are versioned. Manage deployments → edit → pick the previous
version → Deploy. The Sheet is untouched by a rollback: a pupil's work is in the
Sheet, not in the deployment.
