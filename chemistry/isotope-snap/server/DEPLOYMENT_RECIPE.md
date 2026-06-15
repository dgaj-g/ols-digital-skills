# Deployment Recipe -- Isotope Lab (Path B)

## Overview

Path B is the login-gated version of Isotope Lab. Pupils sign in with their school (C2k) Google Workspace account; progress is saved server-side and the leaderboard is live. The public github.io build is always the offline fallback.

Storage model: **ScriptProperties inside the Apps Script project** (no Google Sheet required). Pupil names are read automatically from their signed-in C2k profile; no name-entry screen is shown unless OIDC fails.

---

## Step 1 -- Run the assembler

From the `server/` folder:

```
node build-pathb.js
```

This produces two files in `server/`:
- `PathB_Code.gs` -- the Apps Script server
- `PathB_Index.html` -- the fully assembled page

Both are pure ASCII (emoji and accented characters are escaped).

---

## Step 2 -- Create a standalone Apps Script project

1. Open Google Drive in your **C2k Workspace** account (must be the school domain, not a personal account).
2. Create a new **Apps Script** project (drive.google.com -> New -> More -> Google Apps Script) and give it a recognisable name, e.g. `Isotope Lab`.
   - You do NOT need a Google Sheet this time. A standalone script project is fine.

---

## Step 3 -- Paste the Apps Script files

### 3a -- Show appsscript.json

1. In the Apps Script editor: click the gear icon (Project Settings) in the left sidebar.
2. Tick **Show "appsscript.json" manifest file in editor**.
3. Back in the editor, click `appsscript.json` in the file list and **replace its entire contents** with the contents of `server/appsscript.json` from this repo.
4. Save (Ctrl+S / Cmd+S).

   The manifest sets:
   - `executeAs: USER_ACCESSING` -- every call runs as the signed-in pupil, so their C2k identity is available.
   - `access: DOMAIN` -- only C2k accounts can reach the web app.
   - `userinfo.profile` + `userinfo.email` scopes -- enables automatic name lookup.

### 3b -- Paste Code.gs

1. Click `Code.gs` in the file list and **replace its entire contents** with the contents of `PathB_Code.gs`.

### 3c -- Add the Index HTML file

1. Click the **+** next to Files and choose **HTML**. Name it exactly `Index` (case-sensitive, no extension in the editor).
2. Paste the contents of `PathB_Index.html` into it.
3. Save all files.

---

## Step 4 -- Initialise storage

1. In the Apps Script editor, select the function `initBoard` from the function dropdown.
2. Click **Run**.
3. Approve any permissions (the script needs external requests, script identity, and property storage).
4. You should see `Ready. Change staffPasscode in Project Settings -> Script Properties.` in the execution log.

---

## Step 5 -- Set the staff passcode

1. In the Apps Script editor: click the gear icon (Project Settings) -> **Script Properties**.
2. Find `staffPasscode` and click the pencil to edit it. Replace the `CHANGE-ME-####` value with a passcode only you know.
3. Click **Save script properties**.

---

## Step 6 -- Deploy as a Web App

1. In the Apps Script editor: **Deploy -> New deployment**.
2. Click the gear icon next to "Select type" and choose **Web app**.
3. Set:
   - **Description:** `Isotope Lab v1` (or increment for subsequent deploys)
   - **Execute as:** User accessing the web app
   - **Who has access:** Anyone within your domain (C2k school domain)
4. Click **Deploy**.
5. On the authorisation screen, sign in with your C2k account and accept the consent screen. You will see a "See your personal info" permission -- this is the `userinfo.profile` scope that allows the server to read pupils' names automatically.
6. Copy the Web App URL (ends in `/exec`).

### One-time per-pupil Google consent

The first time each pupil opens the `/exec` URL, Google shows a consent screen asking them to grant the "See your personal info" permission to the script. They click **Allow** and are immediately taken to the activity. This is a one-time action per pupil per deployment.

**To remove this consent screen entirely:** a C2k domain administrator can pre-authorise the OAuth client in the Google Workspace Admin Console (Security -> API controls -> Domain-wide delegation or App access control). Ask your ICT department if you want to deploy this at scale without the consent pop-up.

---

## Step 7 -- Record the URL

Add the `/exec` URL to `docs/deployed-apps.md` in the `ols-digital-skills` repo under the Isotope Lab entry, so it can be found again.

---

## Step 8 -- Create a class and share with pupils

1. Open the `/exec` URL in your browser (you will be asked to sign in).
2. Click the **Teacher** button (key icon) and enter your passcode to unlock the staff panel.
3. In the **Classes** tab, type a class name (e.g. `S1-Chem-1`) and click **Add class**.
4. Select the class in the dropdown; click **Show QR** or **Copy link** to get the `?class=S1-Chem-1` URL.
5. Share the QR or link with pupils. Pupils open it, sign in with their C2k account, and the activity begins immediately -- their name is filled in automatically from their Google profile. No name-entry screen is needed.

---

## Updating the deployment

After any code change:

1. Run `node build-pathb.js` again.
2. Paste the new `PathB_Code.gs` into `Code.gs` in the Apps Script editor.
3. Deploy -> **Manage deployments -> Edit** the existing deployment (increment the version description). Pupils need to refresh their browser to get the new version.

---

## Notes

- **Storage:** Data is stored in the Apps Script project's **ScriptProperties** (Project Settings -> Script Properties). There is no Google Sheet. Each pupil's record is a single JSON property key: `p:<class>:<email>`. Groups and the reveal flag are also stored there.
- **Delete class:** the `deleteClass` admin action permanently deletes all `p:<class>:*` property keys for that class, plus the groups and reveal keys. This cannot be undone.
- **Offline fallback:** The github.io URL (without `?class=`) always works without a sign-in. Pupils can use that version if the Apps Script deployment is unavailable.
- **Multiple classes:** Use a different `?class=NAME` link for each class. All classes share the same Apps Script deployment; data is partitioned by class code in the property keys.
- **Data export:** Teacher panel -> Results tab -> Export CSV exports the class roster with XP and per-mode scores.
- **Groups:** Assign pupils to named groups in the Groups tab. Toggle "Reveal group members" when you want pupils to see who is in their team.
- **Year-end cleanup:** Delete each class from the staff panel (wipes all property keys for that class) or delete the entire Apps Script project.
