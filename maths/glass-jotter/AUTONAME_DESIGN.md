# Glass Jotter — pupil auto-name — design + deploy

Status: BUILD (22 Jun 2026). Goal: pre-fill the pupil's REAL first name + surname on the cover (their
c2k email is `agartland669`-style, so the email can't give it — the account's `given_name`/`family_name`
must come from Google's OIDC userinfo, exactly as the Isotope Lab build does).

## The constraint (why a companion)
Auto-name needs the PUPIL's OAuth token (`ScriptApp.getOAuthToken()` → userinfo → real name). That token is
the pupil's ONLY under **execute-as-user**. The Glass Jotter main app is **execute-as-me** because pupils'
full working (~45 KB each) lives in a bound **Sheet** that only the deploy owner can write — and the Phase-2
drill-down reads those full states. So the main app can't fetch the name itself. Isotope Lab avoids this by
storing everything in ScriptProperties (too small for our 45 KB states), so we can't copy it wholesale.

## The design (small, isolated, feature-flagged)
A tiny **companion** = a SECOND web-app deployment of the SAME project, set to **execute-as-user**. It does
nothing but read the signed-in pupil's name and stash it in **ScriptProperties** (project-level, shared
across both deployments — proven writable under execute-as-user by Isotope). The main app (unchanged,
execute-as-me) reads that property and pre-fills the name. The entire data layer / markbook / analytics is
untouched.

**Flow (new pupil, no stored name yet):**
1. Cover loads → `apiHello` returns `name:''` (no Config name) + `autonameUrl` (the companion `/exec`, from
   a Config key — empty until set, so the feature is DORMANT until wired up).
2. If `autonameUrl` is set and no name yet, the cover loads `autonameUrl + '?probe=1'` in a HIDDEN iframe.
3. The companion `doGet` sees `probe=1`, and (guard: only when `effectiveEmail===activeEmail`, i.e. truly
   running as the accessing user) calls `autoName_()` (UrlFetchApp → `openidconnect.googleapis.com/v1/userinfo`
   with `ScriptApp.getOAuthToken()` = the pupil's token) and writes `autoname:<email>` →
   `"First Surname"` into ScriptProperties. Returns a 1-line page.
4. On the iframe `load` event (or a 1.5 s timeout fallback), the cover calls `apiAutoName` (main app,
   execute-as-me) which reads `autoname:<email>` for the caller and returns the name.
5. The cover pre-fills the NAME field with it. The pupil taps "Open your book"; the existing `apiSetName`
   persists it to Config, so every later `apiHello` returns it (no re-probe).

**Graceful + safe:** if `autonameUrl` is unset, or the probe fails (consent withheld, network, non-C2k),
nothing breaks — the pupil just types their name as today. So the feature can ship dark and be switched on
later by setting the Config key. No new Sheet column.

## Pieces
- Manifest: at deploy, MERGE these 4 scopes into the live `appsscript.json` (don't replace — keep the
  existing Sheet/Lock scopes): `userinfo.profile`, `userinfo.email`, `script.external_request`,
  `script.scriptapp`. (Not committed to the repo: the live manifest's current scopes aren't in the repo, so
  a repo copy would be a guess.)
- `Code.gs.template`: `autoName_()` (OIDC fetch), `sp_()` (ScriptProperties), `doGet` probe branch with the
  execute-as-user guard, `apiAutoName()` (read), `autonameUrl` added to `apiHello`/`apiWhoAmI`.
- `script.js`: cover auto-name flow (hidden-iframe probe + read + pre-fill + fallback); offline stub
  simulates it so the pre-fill is testable in preview.
- `build-pathb.js`: transport shim gains the `autoname` action.

## Deploy (the heavier bit — needs Damien)
1. Project manifest: add the 4 oauth scopes (Apps Script editor → Project Settings → "Show appsscript.json",
   or paste the new manifest). Save.
2. Paste the new `Code.gs` + `Index.html` (the bundled v9 + auto-name).
3. **Deploy 1 (main):** Manage deployments → edit → New version → still **Execute as: Me**, Anyone within
   c2ken. (Same `/exec`.)
4. **Deploy 2 (companion, NEW deployment):** Deploy → New deployment → Web app → **Execute as: User
   accessing** → Anyone within c2ken → Deploy → copy its `/exec` URL.
5. Set Config: in the Sheet's Config tab add a row `autonameUrl` → the companion `/exec` URL. (Or a tiny
   admin call.) Auto-name goes live the moment this is set.
6. First pupil hit may show a one-time Google consent for the companion (in-domain userinfo is usually
   silent on C2k — Isotope is); if it isn't silent, we surface the probe visibly. Live smoke-test:
   sign in as a pupil → name pre-fills; confirm the teacher wall shows the real first name + surname.
