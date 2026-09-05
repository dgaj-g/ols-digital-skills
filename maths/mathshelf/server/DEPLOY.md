# MathShelf — the deploy checklist

**One project, two deployments.** Do them in this order, and read the manifest
before each version cut.

> **THE DEPLOYMENT DIALOG LIES.** On 24 June 2026 a version was cut while the
> dialog displayed "Execute as: Me" and the manifest said `USER_ACCESSING`; every
> pupil in the school then ran the app as the deployer. The dialog is not
> evidence. Never trust it. Read `appsscript.json` in the editor, with your own
> eyes, immediately before each cut, and write down what it said.

| | what it is | executeAs | who has access | who ever visits it |
|---|---|---|---|---|
| **DATA** | the existing main `/exec`. Owns the bound Sheet, the marking store, the class registry and the per-teacher scoping. | `USER_DEPLOYING` (Me) | Anyone within the domain | nobody — only the front door, server to server |
| **FRONT DOOR** | a NEW deployment. Serves the page, reads the pupil's own name from her own Google token, and relays every data call to DATA. | `USER_ACCESSING` (User) | Anyone within `c2ken.net` | every pupil and every teacher |

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
   - `relaySecret` — a long random string. It never leaves the server.
   - `dataUrl` — filled in at step 3 below, once the DATA `/exec` exists.

## 1 · DATA (do this one FIRST)

The front door has nothing to relay to until this exists.

1. Open the Apps Script project (`1otJG5454zR6a0WKZW23czKnehxtQ3Oj6CrrRWYys1H4bPxZOoaZ3qPmC`).
2. Paste the built `server/Code.gs` into `Code.gs` and the built
   `server/Index.html` into the HTML file named exactly `Index`.
3. **Open `appsscript.json` and read it.** It must say
   `"executeAs": "USER_DEPLOYING"`. Write down what it actually said.
4. Save. Deploy → Manage deployments → the existing MAIN deployment → edit →
   **New version** → Deploy. The `/exec` does not change.
5. Record the row in `DEPLOY_LOG.md`: date, `DATA`, the version number, the
   executeAs **as you read it in the manifest**, the commit, and the two md5s
   (`node tools/qa/qa-build.js` prints them).
6. Open Executions and confirm a `doPost` or `apiRelay` row completes. Paste
   that line into `DEPLOY_LOG.md` as the proof row.
7. Copy the DATA `/exec` URL into the `dataUrl` script property.

## 2 · FRONT DOOR

1. **Edit `appsscript.json` in the editor** and change `"executeAs"` to
   `"USER_ACCESSING"`. Save.
2. **Read it again.** It must now say `USER_ACCESSING`. Write down what it said.
3. Deploy → **New deployment** → Web app → Execute as: **User accessing the web
   app** → Who has access: **Anyone within c2ken.net** → Deploy.
4. Record the row in `DEPLOY_LOG.md`: date, `FRONT DOOR`, version, the executeAs
   as READ, the same commit, the same md5s.
5. Open the new `/exec` once yourself so the one-time permission screen is
   accepted, then open Executions and confirm `doGet` completes **and** that a
   relayed `apiCall` completes. Paste both lines in as proof rows.
6. Put the manifest back to `USER_DEPLOYING` and save, so the next DATA cut
   starts from the state step 1.3 expects.

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
