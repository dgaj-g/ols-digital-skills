# SPLIT_NOTES.md — the SERVER-SPLIT package of Book A's cut (12 Sept 2026)

Clock started 21:05 BST (45-minute cap). Worktree: ~/Sites/ols-wt-maths, branch
draft/issue-24-25-maths-m2-revision. Nothing committed, nothing deployed.

## Baseline (before any change)
- `node tools/qa/qa-two-homes.js` GREEN, **62 checks**.
- `server/Code.gs` md5 85f8d63c60440ded9e954cc5ac4ffec0 (the live DATA V32 file).

## Decisions (recorded as made)
1. **mockenv.js is not mine**, so the `openById` mock and the `standalone` world
   variant live in qa-two-homes.js as a `makeWorld()` wrapper around `makeEnv()`
   that patches `sandbox.SpreadsheetApp` before the template is loaded. Same
   sheets, same behaviour, no shared-lib edit.
2. **The built-in list keeps the name `ACTS`** (not `ACTS_BUILTIN`). Two files I
   do not own anchor on it: qa-tickbox.js finds the declaration with
   `/var ACTS = \[[^\]]*\];/` and appends `'geometry'` to it, and the existing
   plant `fixture-server-default-true` edits the coerceActs_ loop line
   `for (var i = 0; i < ACTS.length; i++) out[ACTS[i]] = !!a[ACTS[i]];`.
   Renaming either would turn a gate I cannot edit red. So: `ACTS` = the
   built-in floor; `acts_()` = the live list (ACTS + the Config row); inside
   coerceActs_ a local `ACTS = acts_()` shadows the global so the loop line is
   byte-identical and the plant still fires.
3. **Per-execution cache** = module variable `ACTS_LIVE`, cleared on entry to
   and exit from `apiRelay` (every DATA execution enters there; in production a
   fresh VM per execution makes the clear a no-op, in the mock it is what makes
   "per execution" true). Tests that call api* directly after changing the row
   clear it with `env.call('ACTS_LIVE = null')`.

## 21:15 — harness + template done, gates next
- qa-two-homes: **62 -> 107 checks**, GREEN against the new template; RED (20
  FAIL lines + a caught crash) against the old one before the change, as
  harness-first requires.
- Code.gs.template: `acts_()` (built-in `ACTS` + Config row `acts`, validated
  by `ACT_ID_RE = /^[a-z][a-z0-9-]{1,40}$/`, de-duplicated, cached in
  `ACTS_LIVE`); `ss_()` (`sheetId` property -> `openById`, else the active
  spreadsheet); all five `getActiveSpreadsheet()` sites routed (initJotter,
  dataSheet_, ready_, getConfig_, setConfig_); `actOk_`, `coerceActs_`,
  `apiHello` read `acts_()`; header rewritten for two projects. Pure ASCII.
- `server/Code.gs` + `server/Index.html` rebuilt by build-pathb.js.
- dev/test-server-scoping.js DID break (its sandbox had no PropertiesService;
  ss_() reads a script property) -> added a 1-line PropertiesService mock
  returning null (= the bound home). 20/20 again. It is NOT in CUT_SCOPE.txt:
  orchestrator, add `dev/test-server-scoping.js` or qa-scope will name it.
4. **Config row format** (the exact cell): Config tab, column A `acts`,
   column B `["angles","algebra","stats-quartiles","stats-collect"]` - a JSON
   array of strings; built-ins may be repeated or omitted (they are always
   in); an id must match `^[a-z][a-z0-9-]{1,40}$`; anything else in the cell
   (not JSON / not an array / non-string / junk id) is ignored id-by-id or
   row-by-row and the built-ins stand. Book B adds `"stats-averages"` to the
   same array. The row is read on the DATA side only.

## 21:18 — DONE (13 minutes of the 45 used)

### Files touched (mine, and only mine)
- `server/Code.gs.template` — acts_(), ACT_ID_RE, ACTS_LIVE, ss_(); five
  getActiveSpreadsheet sites routed; actOk_/coerceActs_/apiHello read acts_();
  apiRelay clears ACTS_LIVE in and out; header + "where the files go" comment
  rewritten for two projects. `var ACTS = [...]` and `LEGACY_ON` unchanged.
- `server/Code.gs` (regenerated; md5 3e3f4819fa809c04cc2af310c3faabcd) and
  `server/Index.html` (rebuilt as a side effect of build-pathb.js; the
  orchestrator rebuilds again before the deploy).
- `server/DEPLOY.md` — new top section "TWO PROJECTS, from Book A's cut
  (12 Sept 2026)": the table, what changes about a cut, Damien's nine one-time
  steps (copy-ready), old text kept under "The single-project era". qa-manifest
  still GREEN (11) against it.
- `tools/qa/qa-two-homes.js` — makeWorld() (openById by the world's sheetId,
  refuses a pupil, throws for any other id; `standalone:true` makes
  getActiveSpreadsheet throw); a `solo` standalone DATA world; the whole DATA
  matrix relayed through apiRelay in it; a front-door token verified in it;
  the acts-row battery (no row / row / union / unticked / de-dup / five
  malformed rows / ten junk ids / junk never a registry key / one Config read
  per execution / doGet+apiCall+storeToken_ name none of acts_ ss_ getConfig_
  coerceActs_ actOk_ SpreadsheetApp, comments stripped). Three CONTROLS.
- `tools/qa/fixtures/plants.js` — three new entries only: fixture-acts-hardcoded,
  fixture-acts-any-string, fixture-active-spreadsheet (each a one-line edit of
  today's template, `edit()` throws if the anchor is gone). All 18 template
  plants verified to still apply (incl. fixture-server-default-true).
- `dev/test-server-scoping.js` — it broke (no PropertiesService in its
  sandbox); one mock line added. 20/20.

### Gates
- `node tools/qa/qa-two-homes.js` GREEN **107 checks** (was 62).
- `node tools/qa/control.js --only qa-two-homes` GREEN, **15 of 15 FIRED**
  (12 old + 3 new), over-tightening PASSES. The three new FIRED lines, as the
  gate printed them:
  - acts-hardcoded: `FAIL  acts row x two-homes: the Config row \`acts\` names "stats-collect" and the server still answered bad-act ({"ok":false,"error":"bad-act"}) - a book is a Config row edit now, not a server change; acts_() must read the row`
  - acts-any-string: `FAIL  acts row x two-homes: a junk id from the Config row reached the live act list: ["Stats-Collect","a","stats collect","-bad","1abc","xxxx...","../etc","DROP TABLE","angles;",""] - acts_() must accept only strings matching /^[a-z][a-z0-9-]{1,40}$/ ...`
  - active-spreadsheet-call-site: `FAIL  standalone x two-homes: in the STANDALONE DATA project hello failed: {"ok":false,"error":"threw","threw":"getActiveSpreadsheet() returned null: a standalone script has no active spreadsheet"} - a call site still reaches SpreadsheetApp.getActiveSpreadsheet() directly ...`
  - (the control battery's sandboxes are control.js's own, under os.tmpdir(),
    created and removed by the tool in the same run - nothing of mine lives
    under /tmp)
- `node tools/qa/run.js --fast`: every server gate GREEN (qa-two-homes,
  qa-tickbox 28, qa-store-scale 24, qa-staff-authority 26, qa-earned-stays 9,
  qa-pencil-ink 8, qa-cache-scope, qa-audit 215, qa-manifest 11). RED and NOT
  mine: qa-repo-prod (dirty tree, expected); **qa-scope** (names
  `dev/test-server-scoping.js` - orchestrator: add it to CUT_SCOPE.txt);
  qa-human-pace + qa-coverage (statchart.js clocks with no inventory row -
  the chart package); qa-selftests (statcore suite - the engine package, went
  red mid-run as that package edited statcore.js).
- `node dev/test-server-scoping.js` 20 passed.

### Grep proof that acts_()/ss_() never run on the front door
`acts_(` is called from actOk_, coerceActs_, apiHello only; `ss_(` from
initJotter, dataSheet_, ready_, getConfig_, setConfig_ only. doGet calls
userEmail_, autoName_, storeToken_ (-> dataUrl_, relaySecret_, normEmail_,
storeSign_); apiCall calls userEmail_, dataUrl_, relaySecret_, storeToken_,
UrlFetchApp. None reaches the Sheet. Executed proof: the front-door world's
doGet with sheetAccess:false (getActiveSpreadsheet AND openById both throw
there) still serves the page.

### Left for the orchestrator / Damien
- CUT_SCOPE.txt: add `dev/test-server-scoping.js` (qa-scope).
- The nine one-time steps are in DEPLOY.md, copy-ready; the relay secret is
  copied by Damien from the bound project's Script Properties into the new
  project's - no session ever sees it.
- DEPLOY_LOG.md gets a `DATA` row naming the NEW project and a `FRONT DOOR`
  row when the cut happens (not mine to write before it does).
- Nothing else. Tree parses, server gates green, nothing committed.

## THE NEW DATA PROJECT — created 12 Sept 2026, 22:2x–22:31 (orchestrator, Chrome)
- Project: **OLS — MathShelf DATA**, script id `14j0H7VGmJreENIQYSLfepXXVfU5F7QGhVv45TwSstXwEhm5eP7m7jn3h` (standalone, dgartland021@c2ken.net).
- Code.gs pasted from the tree (46,004 chars, rolling hash 3891900974 == server/Code.gs at 8891d90), saved to Drive.
- Script property `sheetId` = `1xVDBKmPP83MMZPqpPJr0GQRR0N9estf9ebhKyhGQd0Y` (typed by the session). `relaySecret` — Damien's paste (in progress).
- Deployment (New deployment, Web app, Execute as Me, Who has access Anyone — the dropdown and Deploy were driven by the session after Damien allowed the action; the OAuth consent was his click): **Version 1 on 12 Sept 2026, 22:31**, Deployment ID `AKfycbzjSy3tZDPohHUfKRXgmFnK6iWlkOGvU_IPU8g1xKecvWRdVuQ86t7G6cL7lV5P6yRkiA`,
  /exec: `https://script.google.com/macros/s/AKfycbzjSy3tZDPohHUfKRXgmFnK6iWlkOGvU_IPU8g1xKecvWRdVuQ86t7G6cL7lV5P6yRkiA/exec`
- Still to do (session): front door's `dataUrl` → this /exec; Config row `acts` = ["stats-collect"]; front door Code.gs + Index.html new version; retire the old DATA deployment on the bound project; DEPLOY_LOG rows.
