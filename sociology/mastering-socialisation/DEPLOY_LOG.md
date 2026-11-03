# Deploy log — Mastering Socialisation (issue 42)

The page is served by an Apps Script web app (execute as the user who opens it, c2ken.net only). Nothing in this
folder is served directly by GitHub Pages except `img/` (photos and OpenMoji icons, credits in `img/CREDITS.md`).

## What gets deployed (Damien's step)
1. `node tools/build-server.js` in this folder writes, in the DESIGN folder's `deploy/`: `Code.gs` (server + banks +
   judge + staff hash) and `Index.html` (the page with every script, style and content file inlined). Neither is in this repo.
2. Apps Script project **OLS Sociology — Mastering Socialisation** (create once; owner dgartland021@c2ken.net): paste
   `Code.gs` and `Index.html`, set `appsscript.json` from `server/appsscript.json`, deploy as a web app:
   Execute as **User accessing the web app**, Who has access **Anyone within c2ken.net**.
3. Put the `/exec` URL in `DESIGN/deploy/EXEC_URL.txt`; class links are `<exec>?class=<slug>` (made on the staff page).
4. Staff passcode: `DESIGN/STAFF_PASSCODE.txt` (the first non-empty line after the heading line). Teachers on `DESIGN/TEACHERS.txt` go straight in.

## Versions
| Version | Date | Build token | What changed |
|---|---|---|---|
| 1 | 3 Nov 2026 19:34 | 15131c5bb7-3ad53a5b | first build (PR #107, squash 79cee92). Script ID 1awM41pyLhAxWd58hYEF4D7dhvkhuHOiZzuWJQsBuWmpOMSRmLTnmiThe, deployment AKfycbwcX6a9F3yyoToksv_xwpj7km0o7bBLRk4H4N_arO-x6ZlJw6KG98cJGgcnNXYotpbm. /exec URL in DESIGN/deploy/EXEC_URL.txt. |
