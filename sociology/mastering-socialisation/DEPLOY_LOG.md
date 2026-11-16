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
| 2 | 16 Nov 2026 | 5f22c3692d-4aea0e2d | live check fixes: links stay inside the page (g8); after a page's last quiz "next" goes on to the next page, so every page of every part can be reached (g9); "Go straight to a page" buttons on Part 1 and 2 landings; the storage clear-out now runs when any teacher opens the staff page, into that teacher's own Drive, for her own classes; a full store still saves the mark and tells the pupil; Archive card wording corrected. Same deployment, new version. |
| 3 | 16 Nov 2026 | 946a674986-3abed7ac | live walk fixes: five- and ten-mark question screens show the how-to line instead of the question twice, and the no-item ten-mark build has its own line; the status line under a question and the "best" line at the top of an activity update straight after marking; a write that finds nothing counts as tried; "Your answer" shown once; the Check button says what is still needed ("Write your answer to check" / "Write both paragraphs to check"), then "Check my answer"; quote labels sit above the passage; tap heading says "phrases" when two are needed; no gap before commas after item phrases; the single ten-mark box labelled "Your answer"; the model panel only mentions underlined phrases when there are some. Marking (private judge): a right answer that also names another term is no longer told it "defines" that other term, and the item line quotes the item phrase it found. Gates g2 (+8 checks with controls), g5. |
