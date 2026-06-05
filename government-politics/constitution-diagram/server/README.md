# US Constitution Diagram — Path B server (login-gated class board)

This folder holds the **reproducible server side** of the login-gated, collaborative
"class board" version of the activity. The activity itself (the diagram, quiz, etc.)
is the normal github.io build one level up (`../index.html`, `../style.css`,
`../script.js`, `../qrcode.min.js`). This folder turns it into a board that pupils
**sign in to** with their school Google account, served by Google Apps Script.

**Nothing here is secret** — the staff passcode and the deployment URL live in the
Google Sheet / the deployment, never in this code — so it lives safely in the repo.
For the full pattern and rationale, see the **"Login-gated collaborative activities"**
section of `docs/BUILD_PLAYBOOK.md`.

## Files
| File | What it is |
|---|---|
| `Code.gs` | The Apps Script server. Serves the page via HtmlService and exposes `apiWhoAmI / apiLoad / apiSave / apiMyName / apiAdmin` to `google.script.run`. Identity = the signed-in Google email; boards are keyed by **named class**; a `classes` registry + staff-passcode-gated admin live in the Sheet's Config tab. |
| `build-pathb.js` | Assembles `Index.html` from the github.io activity (inlines CSS + body + QR lib + the `google.script.run` shim + `script.js`, injects `window.OLS_BOOT`, rewrites the crest path to absolute, drops the intro). |
| `Index.html` | **Generated** by `build-pathb.js`. The Apps Script project's `Index` HTML file. Re-generate after any change to the activity — do not hand-edit. |

## Rebuild after changing the activity
```
node government-politics/constitution-diagram/server/build-pathb.js
```

## Deploy (into a Google Sheet's bound script)
1. Create a Google Sheet (e.g. `US Constitution – Class Board`). Extensions ▸ Apps Script.
2. Paste **`Code.gs`** over the default `Code.gs`. Add an HTML file named exactly **`Index`** and paste **`Index.html`** into it. Save.
3. Run **`initBoard`** once (creates the Data + Config tabs). In the **Config** tab set your own **`staffPasscode`**.
4. **Deploy ▸ New deployment ▸ Web app ▸ Execute as: Me ▸ Who has access: Anyone within your domain ▸ Deploy.**
5. Open the `/exec` URL ▸ **Staff** ▸ passcode ▸ **Add a class** ▸ **Copy link / Show QR** ▸ share via Google Classroom. Each class is its own board (`…/exec?class=NAME`).

## Why this shape
- **Served by Apps Script (same origin as the data)** so `google.script.run` works and the signed-in identity is readable — a github.io page *can't* read a domain-locked Apps Script identity cross-origin.
- The page runs in a **sandboxed iframe**, so it can't see its own URL or `?class=`; `doGet` injects both via `window.OLS_BOOT`, and "Go to class" navigates the tab with an `<a target="_top">`.
- Boards are **named classes** (the name carries the year); "Delete class" is the wipe; the **bare `/exec`** + the Staff button on every board are the always-available way in.
