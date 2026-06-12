# Glass Jotter — Path B deploy (Damien's recipe)

GG-model class board: **Execute as Me**, within-domain sign-in gate. ~10 minutes once.

## 1. Build the two paste files

```
cd ~/Sites/ols-digital-skills/maths/glass-jotter
node server/build-pathb.js
```

Produces `server/Code.gs` + `server/Index.html` (pure ASCII — safe to paste).
The build fails loudly if any input file is missing; fix and re-run.

## 2. Create the Sheet + script

1. In the **school** Google Drive, create a Sheet: `OLS Maths — Glass Jotter (data)`.
2. Extensions → Apps Script.
3. **NAME THE PROJECT FIRST** — click "Untitled project" → `OLS Maths — Glass Jotter`.
   Do this **before running anything**: the OAuth consent screen shows the project
   name, and renaming after consent doesn't propagate.
4. Replace the editor's `Code.gs` contents with `server/Code.gs`.
5. File → New → HTML file, named exactly `Index` (Apps Script adds `.html`).
   Replace its contents with `server/Index.html`. Save both.

## 3. Initialise + passcode

1. In the editor, select `initJotter` in the function dropdown → **Run**.
   Accept the one-time OAuth consent (this is the only consent click).
2. Check the Sheet now has **Config** and **Data** tabs.
3. In **Config**, change `staffPasscode` from `CHANGE-ME-XXXX` to the real one.
   (Server compares it trimmed + case-insensitive.)

## 4. Deploy

1. Deploy → New deployment → type **Web app**.
2. Execute as: **Me**. Who has access: **Anyone within c2ken.net** (the sign-in gate).
3. Deploy → copy the `/exec` URL.
4. **Record it in `docs/deployed-apps.md`** (name, owner, date) and commit — future
   sessions can't recover it otherwise.

## 5. Classes + verify

1. Open the `/exec` URL → STAFF stamp (bottom-right of the cover) → passcode.
2. Add a class, tick its activities, copy the class link / QR
   (links look like `…/exec?class=10B-Maths`).
3. Verify as a pupil: open a class link in a normal signed-in C2k browser profile —
   cover → name asked once → shelf shows only the ticked tiles.

## 6. Re-deploys (every code change)

```
node server/build-pathb.js
```

Paste **both** files again, then: Deploy → **Manage deployments** → ✏️ →
Version: **New version** → Deploy. The `/exec` URL stays the same.
**Never** create a second deployment — that mints a new URL and orphans the QR codes.
