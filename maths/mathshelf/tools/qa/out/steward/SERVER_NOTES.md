# SERVER CUT — the steward's notes (13 Sept 2026)

The relay re-sends once on the echo bounce; the store answers a stray GET with
JSON; one open and one read of the data tab per call.

Worktree `/Users/damiengartland/Sites/ols-wt-maths`, branch
`draft/issue-24-25-maths-m2-revision`, start commit `9197482`.

## The clock
- leashes set, `run.js --fast` green bar qa-repo-prod: yes (start of cut).

## (0) The three failing sentences, on the UNFIXED tree
`node tools/qa/qa-two-homes.js` with ONLY the laws added — RED, 110 passed, 5 failed:

```
FAIL  relay re-send x two-homes: the relay took the echo bounce for a closed road — one HTML answer and apiCall said relay-failed instead of asking once more
FAIL  store doGet x two-homes: the store answered a stray visit with a failure — the echo bounce lands here as a GET, and every one is a Failed row in the log
FAIL  one open one read x two-homes: hello opened the Sheet 6 times and read the data tab 2 times in one call — measured 5.6–8.2 s a call on 13 Sept 2026 for a class with no rows
FAIL  one open one read x two-homes: save opened the Sheet 7 times and read the data tab 1 times in one call — measured 5.6–8.2 s a call on 13 Sept 2026 for a class with no rows
FAIL  one open one read x two-homes: load opened the Sheet 5 times and read the data tab 1 times in one call — measured 5.6–8.2 s a call on 13 Sept 2026 for a class with no rows
```

Counts BEFORE the fix (per relayed call, standalone world):

| call  | openById | whole-tab reads | ranged reads | rows that matched |
|-------|----------|-----------------|--------------|-------------------|
| hello | 6        | 2               | 0            | 0                 |
| save  | 7        | 1               | 0            | 0                 |
| load  | 5        | 1               | 0            | 1                 |

The relay took ONE fetch and answered `{"ok":false,"error":"relay-failed"}`, logging nothing.
The store's doGet served an HTML page and reached HtmlService once.

## The fix, in `server/Code.gs.template` only
1. **The relay re-sends once.** `var RELAY_RESENDS = 1;` near the top with the
   dated measurement. In `apiCall` an answer that is not a 200, or a 200 whose
   body does not parse as a JSON object, is logged
   (`relay: DATA answered <code> — <first 80 chars> for <action> (attempt n)`)
   and asked again, once. Only a second bad answer is `relay-failed`. No
   Authorization header, `followRedirects: true`, `muteHttpExceptions: true`,
   and the belt-and-braces secret strip all unchanged.
2. **The store answers a stray visit with JSON.** At the top of `doGet`: when
   the `sheetId` script property is set (the standalone store, and nowhere
   else) it returns `{ok:false,error:'use-post'}` as JSON and touches neither
   HtmlService nor the Sheet. The bound front door's `doGet` is untouched.
3. **One open and one read per call.** `var EXEC = null;`, opened in `apiRelay`
   before the switch and cleared in its `finally` beside `RELAY_EMAIL` /
   `ACTS_LIVE`. `ss_()` memoises the opened spreadsheet in `EXEC` (and behaves
   exactly as before when `EXEC` is null — `initJotter`, `doGet`, a call from
   the editor or a gate). `dataIndex_()` reads columns A–D only, once;
   `dataRowValues_(row)` reads one row's seven cells. `findRow_`,
   `haveAnyRow_`, `pupilCountByClass_` and `apiHello`'s summaries loop use the
   index and read a full row only for the rows that matched. `writeRow_` (and
   `adminDeleteClass_`) invalidate `EXEC.index`; `getConfig_` memoises the
   Config tab in `EXEC.cfg` and `setConfig_` invalidates it.

NOT changed (named here so the next cut can decide): `apiSetName`,
`adminWall_` and `adminDeleteClass_` still read the whole Data tab.
`adminWall_` needs Summary and Updated for every pupil in the class, so its
whole read is the cheap shape; the other two are candidates for the index.

## (a) qa-two-homes, both worlds
`node tools/qa/qa-two-homes.js` — **GREEN, 115 checks passed, 0 failed.**
The whole DATA matrix (addClass, setActs, hello, save, load, setname, wall,
jotter, override, nudge, classes, deleteClass) passes unchanged in the BOUND
world and the STANDALONE world.

Counts AFTER the fix:

| call  | openById | whole-tab reads | ranged reads | rows that matched |
|-------|----------|-----------------|--------------|-------------------|
| hello | 1        | 0               | 1            | 0                 |
| save  | 1        | 0               | 1            | 0                 |
| load  | 1        | 0               | 2            | 1                 |

The relay took 2 fetches on the planted bounce and answered the real JSON,
with a `DATA answered` line in the log. The store's doGet answered
`{"ok":false,"error":"use-post"}` and reached HtmlService 0 times.

## (b) build-pathb + run.js --fast
`node server/build-pathb.js` — Code.gs 49.8 KB pure ASCII; Index.html
**unchanged** (md5 `ac389c46de7ff426ee68b5d8b399cbc8` before and after).
`node tools/qa/run.js --fast` — **green bar `qa-repo-prod`** (27 gates;
qa-repo-prod is red only because the tree is uncommitted).

Two reds on the way there, both fixed honestly, neither by touching a law:
- `dev/test-server-scoping.js` (and so `qa-selftests` and one `qa-two-homes`
  check) crashed: its in-memory sheet stub's `getRange` had no `getValues`,
  because nothing had ever read a range from it. The stub gained `getValues`
  — shape only, no behaviour, 20 of 20 assertions pass again. The file is
  named in `CUT_SCOPE.txt`.
- `qa-scope` failed `HANDOVER.md`, `PROGRESS.md`, `server/DEPLOY_LOG.md`: the
  steward committed `d7e437c` into this worktree AFTER the cut stamp was
  written at `9197482`, so the cut was being measured against a base that was
  no longer its base. `startCommit` in `tools/qa/out/cut-start.json` was
  corrected to `d7e437c`; the clock itself was left where it was.

## (c) control.js --only qa-two-homes
**GREEN — 18 controls, every one FIRED, over-tightening PASSES.**
Full log: `tools/qa/out/steward/controls-server.log`.

```
qa-two-homes  relay-no-resend               FIRED
qa-two-homes  data-doget-throws             FIRED
qa-two-homes  scan-per-call                 FIRED
qa-two-homes  addclass-field-parity         FIRED
qa-two-homes  data-without-secret-guard     FIRED
qa-two-homes  data-serves-unticked-book     FIRED
qa-two-homes  secret-in-a-return-value      FIRED
qa-two-homes  front-door-touches-the-sheet  FIRED
qa-two-homes  token-any-signature           FIRED
qa-two-homes  token-never-expires           FIRED
qa-two-homes  token-for-another-pupil       FIRED
qa-two-homes  secret-in-the-page            FIRED
qa-two-homes  relay-with-bearer             FIRED
qa-two-homes  store-payload-disagrees       FIRED
qa-two-homes  acts-hardcoded                FIRED
qa-two-homes  acts-any-string               FIRED
qa-two-homes  active-spreadsheet-call-site  FIRED
qa-two-homes  over-tightening               PASSES (over-tightening)
```

`secret-in-a-return-value` CANNOT RUN on the first battery: the apiCall rewrite
had dropped the `if (out && typeof out === 'object')` guard its plant edits.
The guard was put back (it is a no-op there, and the control's anchor is what
it holds) rather than the plant being re-aimed. It FIRED on the re-run.

## (d) qa-audit
`node tools/qa/qa-audit.js` — **GREEN, 230 checks passed, 0 failed**, with the
new section-A row and the FIRED lines under "The steward cut — 13 Sept 2026".

## (e) md5 of server/Code.gs
- before: `3e3f4819fa809c04cc2af310c3faabcd`
- after:  `21070f13916e9cd00bf87373cd6fd3ac`
- `server/Index.html` unchanged: `ac389c46de7ff426ee68b5d8b399cbc8`


## The commit
`210ced7` on `draft/issue-24-25-maths-m2-revision`, pushed. `run.js --fast` is
green end to end at that commit, `qa-repo-prod` included.
