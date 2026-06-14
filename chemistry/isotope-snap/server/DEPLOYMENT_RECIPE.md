# Deployment Recipe — Isotope Lab (Path B)

## Overview

Path B is the login-gated version of Isotope Lab. Pupils sign in with their school (C2k) Google Workspace account; progress is saved server-side and the leaderboard is live. The public github.io build is always the offline fallback.

---

## Step 1 — Run the assembler

From the `server/` folder:

```
node build-pathb.js
```

This produces two files in `server/`:
- `PathB_Code.gs` — the Apps Script server
- `PathB_Index.html` — the fully assembled page

Both are pure ASCII (emoji and accented characters are escaped).

---

## Step 2 — Create the Google Sheet

1. Open Google Drive in your **C2k Workspace** account (important: must be the school domain, not a personal account).
2. Create a new **Google Sheet** and give it a recognisable name, e.g. `Isotope Lab — S1 Chem`.

---

## Step 3 — Paste the Apps Script files

1. In the Sheet: **Extensions → Apps Script**.
2. In the Apps Script editor, rename the default `Code.gs` file and replace all its contents with the contents of `PathB_Code.gs`.
3. Click the **+** next to Files and choose **HTML**. Name it exactly `Index` (case-sensitive, no extension needed in the editor). Paste the contents of `PathB_Index.html` into it.
4. Save all files (Ctrl+S / Cmd+S).

---

## Step 4 — Initialise the spreadsheet

1. In the Apps Script editor, select the function `initBoard` from the function dropdown.
2. Click **Run**.
3. Approve any permissions prompted (the script needs access to the spreadsheet and to identify the signed-in user).
4. You should see `Ready. Set your own staffPasscode in the Config tab.` in the execution log.

---

## Step 5 — Set the staff passcode

1. Back in the Google Sheet, open the **Config** tab.
2. Find the row with Key = `staffPasscode` and replace the default value with a passcode only you know.
3. Keep this tab open; you will need it if you ever need to reset the passcode.

---

## Step 6 — Deploy as a Web App

1. In the Apps Script editor: **Deploy → New deployment**.
2. Click the gear icon next to "Select type" and choose **Web app**.
3. Set:
   - **Description:** `Isotope Lab v1` (or increment for subsequent deploys)
   - **Execute as:** Me
   - **Who has access:** Anyone within your domain (C2k school domain)
4. Click **Deploy** and copy the Web App URL (ends in `/exec`).

---

## Step 7 — Record the URL

Add the `/exec` URL to `docs/deployed-apps.md` in the `ols-digital-skills` repo under the Isotope Lab entry, so it can be found again.

---

## Step 8 — Create a class and share with pupils

1. Open the `/exec` URL in your browser (you will be asked to sign in with your school account).
2. Click the **Teacher** button (key icon) and enter your passcode to unlock the staff panel.
3. In the **Classes** tab, type a class name (e.g. `S1-Chem-1`) and click **Add class**.
4. Select the class in the dropdown; click **Show QR** or **Copy link** to get the `?class=S1-Chem-1` URL.
5. Share the QR or link with pupils. They open it, sign in with their C2k account, enter their name, and begin.

---

## Updating the deployment

After any code change:

1. Run `node build-pathb.js` again.
2. Paste the new `PathB_Code.gs` into `Code.gs` and the new `PathB_Index.html` into `Index` in the Apps Script editor.
3. Deploy → **New deployment** (or **Manage deployments → Edit** to update the existing one). Pupils need to refresh their browser to get the new version.

---

## Notes

- **Offline fallback:** The github.io URL (without `?class=`) always works without a sign-in. Pupils can use that version if the Apps Script deployment is unavailable.
- **Multiple classes:** Use a different `?class=NAME` link for each class. All classes share the same Sheet and Apps Script deployment; data is partitioned by class code in the Pupils tab.
- **Data export:** Teacher panel → Results tab → Export CSV exports the class roster with XP and per-mode scores.
- **Groups:** Assign pupils to named groups in the Groups tab. Toggle "Reveal group members" when you want pupils to see who is in their team.
- **Year-end cleanup:** Delete each class from the staff panel (which wipes its pupil rows) or delete the entire Google Sheet.
