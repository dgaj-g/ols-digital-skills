# MathShelf — the deploy log

## 12 September 2026, 20:27 / 20:30 — DATA Version 32, FRONT DOOR Version 33 — THE STORE CUT

From commit `913e0f8`. **A server change: both deployments cut, DATA first**
(`Code.gs` md5 `85f8d63c60440ded9e954cc5ac4ffec0`, 42,953 characters; `Index.html`
md5 `831c8f4b7336c11f51448269204bc1ca`, 1,197,243 characters — both fetched into
the editor from the pushed branch with `cache: no-store`, the active model
verified by name before each `setValue`, the exact committed byte counts read
back). Before the paste the editor's `Code.gs` held 40,209 characters — the
19:27 record's 38,166 PLUS `timingCheck_`/`timingCheck` (the PACKAGE A probe
had been put back, or never left HEAD after the 19:27 read); the paste replaced
the file whole, so the probe is gone from HEAD and from both versions below.

**The manifest, READ in the editor each time (Damien's two edits, his hands):**
- before the DATA cut: `"executeAs": "USER_DEPLOYING"`, `"access": "ANYONE_ANONYMOUS"`;
- before the FRONT DOOR cut, and again after it: `"executeAs": "USER_ACCESSING"`,
  `"access": "DOMAIN"` — where it RESTS.

Deploy → Manage deployments → DATA by Deployment ID
`AKfycbyO6pQnLHujpost5Otxe9oJB2iFdbno3Kxxw5RU51A9prKiqDMrIm__UWuLEDn2f4wo` → Edit
→ New version → Deploy: "Version 32 on 12 Sept 2026, 20:27". Then the FRONT DOOR
by Deployment ID `AKfycbzUZ3bDjcFas_zQ02VrJQCEkPQgEjs3Re4JZ1OQtLACa090AC1B0Md2yUkL4aX81LwP`
→ Edit → New version → Deploy: "Version 33 on 12 Sept 2026, 20:30". Neither
`/exec` changed.

**The deployer's visits, from the Executions log (the proof rows). Note what is
NOT there: no `apiCall` row after the cut — every call the page made went
straight to DATA's `doPost` with its token.**

| deployment | function | start | duration | status |
|---|---|---|---|---|
| Version 33 | doGet | 12 Sept 2026, 20:31:00 | 2.028 s | Completed |
| Version 32 | doPost | 12 Sept 2026, 20:31:03 | 2.044 s | Completed |
| Version 32 | doPost | 12 Sept 2026, 20:31:07 | 3.302 s | Completed |
| Version 33 | doGet | 12 Sept 2026, 20:32:12 | 1.929 s | Completed |
| Version 32 | doPost | 12 Sept 2026, 20:32:16 | 2.107 s | Completed |
| Version 32 | doPost | 12 Sept 2026, 20:32:19 | 4.868 s | Completed |
| Version 33 | doGet | 12 Sept 2026, 20:32:43 | 2.034 s | Completed |
| Version 32 | doPost | 12 Sept 2026, 20:32:46 | 2.453 s | Completed |
| Version 32 | doPost | 12 Sept 2026, 20:32:49 | 4.716 s | Completed |

(20:31 was `?class=demo` — the cover drew with his verified name and "That class
link is not active", the truthful answer for a code that is not a class; 20:32
was `?class=test12` twice — the cover, then "First time here? Google will ask your
permission once" from `hello`, which is the store answering on the direct path.)

**THE TIMED LIVE SAVE, three rounds — the same fetch as the 20:08 probe, with
the real token the served page carries** (read out of the served page's own
`OLS_BOOT` scriptlet in the browser, never computed from the code; the first two
calls were `whoami` and a `load` that answered `none`, so the saves wrote a fresh
row for the deployer in test12 · angles and overwrote nothing):

| call | browser round trip | DATA's own execution (Executions log) |
|---|---|---|
| whoami | 3.110 s | doPost 20:34:08, 1.701 s |
| load | 3.175 s | doPost 20:34:12, 1.590 s |
| save 1 | 3.983 s | doPost 20:34:15, 2.966 s |
| save 2 | 3.778 s | doPost 20:34:18, 2.820 s |
| save 3 | 3.670 s | doPost 20:34:22, 2.955 s |

Every one status 200, `ok: true`, the JSON readable in the page. **Beside the
20:08 probe** (a call DATA refused at the door, so transport only: 2.5 / 2.3 /
2.1 s) **and beside the relay it replaces** — the same evening, his own use on
Version 31 before the cut, 19:56–20:04: `apiCall` 3.3 / 5.9 / 6.7 / 7.1 / 8.1 /
21.6 / 24.0 / 30.7 / 40.0 s wrapping `doPost` rows of 1.0–6.3 s. A real save now
costs the Sheet write plus about one second of transport, and the spread is
gone.

## 12 September 2026, 19:27 — FRONT DOOR Version 31 (DATA Version 25, unchanged)

THE STORE AND THE FILMS CUT, from commit `85a5660`. **Client only: `Code.gs` is
byte-identical** — md5 `6c2eb7d561a77ab149f8f1163c885abc` in the repo and 38,166
characters in the editor, the same before and after the cut — so the front door
was re-cut ALONE and the DATA deployment was not touched.

**The manifest, READ in the editor before and after the save** (never edited):
`"executeAs": "USER_ACCESSING"`, `"access": "DOMAIN"`. It still rests there.

`Index.html` fetched into the editor from the pushed branch with `cache: no-store`
— **1,192,022 characters, exactly the committed file's byte count** (the editor's
previous copy was 1,164,468). Saved, then Deploy → Manage deployments → the FRONT
DOOR by Deployment ID `AKfycbzUZ3bDjcFas_zQ02VrJQCEkPQgEjs3Re4JZ1OQtLACa090AC1B0Md2yUkL4aX81LwP`
→ Edit → Version → New version → Deploy. "Deployment successfully updated.
Version 31 on 12 Sept 2026, 19:27."

**The deployer's own visit, from the Executions log (the proof rows):**

| deployment | function | start | duration | status |
|---|---|---|---|---|
| Version 31 | doGet | 12 Sept 2026, 19:27:46 | 0.999 s | Completed |
| Version 31 | apiCall | 12 Sept 2026, 19:27:49 | 5.4 s | Completed |
| Version 25 | doPost | 12 Sept 2026, 19:27:52 | 1.936 s | Completed |
| Version 31 | apiCall | 12 Sept 2026, 19:27:56 | 7.586 s | Completed |
| Version 25 | doPost | 12 Sept 2026, 19:27:59 | 4.24 s | Completed |

The cover drew, his verified name came back on it, and `?class=demo` answered
"That class link is not active" — which is the truthful answer for a code that is
not a registered class, and it proves doGet → apiCall → doPost all ran on the new
version against the unchanged store.

Note the shape of those rows against ruling 51: `apiCall` 5.4 s and 7.6 s with
`doPost` 1.9 s and 4.2 s beside them — 3.4 s of hop each time, on a quiet server
with one user. See PROGRESS.md, PACKAGE A, for the same hop measured three ways.

Also in the log from this session: `timingCheck` (Editor, Head) at 17:52:43,
173.56 s — the probe of PACKAGE A. It was removed from `Code.gs` immediately
after, and the file verified byte-identical before anything was deployed.

The memory of what is live. Every version cut gets a row, and every row carries
the `executeAs` value **as it was READ from the manifest in the editor** —
because the deployment dialog lies, and on 24 June 2026 it lied convincingly
enough to make every pupil in the school run the app as the deployer.

A row is not proof. The row after it is: a line quoted from the **Executions**
log showing the deployment actually ran.

| date | deployment | version | executeAs (as READ from the manifest) | commit | md5 Index.html | md5 Code.gs |
|---|---|---|---|---|---|---|
| 2026-09-06 11:50 | DATA | Version 3 | `USER_DEPLOYING` (and `ANYONE_ANONYMOUS`), read in the editor before the cut | 4517a44 | 2b1dd79c6f82c132c53fa52a70aa0d70 | e80ab2c3f9c0af414487fcc188a2e970 |
| 2026-09-06 11:57 | FRONT DOOR | Version 4 | `USER_ACCESSING` (and `DOMAIN`), read in the editor before the cut | 4517a44 | 2b1dd79c6f82c132c53fa52a70aa0d70 | e80ab2c3f9c0af414487fcc188a2e970 |
| 2026-09-06 14:15 | FRONT DOOR | Version 5 | `USER_ACCESSING` (and `DOMAIN`), read in the editor before the cut | f85e74b | cc1f3c18faf93930158925cb3ac5ce8b | d09615a9abc0998de9e5b7ec4ea4239a |
| 2026-09-06 14:18 | DATA | Version 6 | `USER_DEPLOYING` (and `ANYONE_ANONYMOUS`), read in the editor before the cut | f85e74b | cc1f3c18faf93930158925cb3ac5ce8b | d09615a9abc0998de9e5b7ec4ea4239a |
| 2026-09-06 14:35 | FRONT DOOR | Version 7 | `USER_ACCESSING` (and `DOMAIN`), read in the editor before the cut | 4683ad1 | bd46039afafdbde77a5d76cdf7701550 | d09615a9abc0998de9e5b7ec4ea4239a |
| 2026-09-06 14:38 | DATA | Version 8 | `USER_DEPLOYING` (and `ANYONE_ANONYMOUS`), read in the editor before the cut | 4683ad1 | bd46039afafdbde77a5d76cdf7701550 | d09615a9abc0998de9e5b7ec4ea4239a |
| 2026-09-06 14:52 | DATA | Version 9 | `USER_DEPLOYING` (and `ANYONE_ANONYMOUS`), read in the editor before the cut | c921fec | 8a6dbac0e19b2f4b3f772494b551b2be | d09615a9abc0998de9e5b7ec4ea4239a |
| 2026-09-06 15:36 | DATA | Version 10 | `USER_DEPLOYING` (and `ANYONE_ANONYMOUS`), read in the editor before the cut | da8437b | cd9e10978a41ddec7af4f69eedbf88d5 | d09615a9abc0998de9e5b7ec4ea4239a |
| 2026-09-06 15:38 | FRONT DOOR | Version 11 | `USER_ACCESSING` (and `DOMAIN`), read in the editor before the cut | da8437b | cd9e10978a41ddec7af4f69eedbf88d5 | d09615a9abc0998de9e5b7ec4ea4239a |
| 2026-09-06 16:31 | DATA | Version 12 | `USER_DEPLOYING` (and `ANYONE_ANONYMOUS`), read in the editor before the cut | 24ca0c7 | 4eecea6d75d05330211de3f7ebfe7aff | d09615a9abc0998de9e5b7ec4ea4239a |
| 2026-09-06 16:32 | FRONT DOOR | Version 13 | `USER_ACCESSING` (and `DOMAIN`), read in the editor before the cut | 24ca0c7 | 4eecea6d75d05330211de3f7ebfe7aff | d09615a9abc0998de9e5b7ec4ea4239a |
| 2026-09-07 08:50 | DATA | Version 14 | `USER_DEPLOYING` (and `ANYONE_ANONYMOUS`), read in the editor before the cut | a12c3e3 | e05e11db1449ae4c310719d11d83deec | d09615a9abc0998de9e5b7ec4ea4239a |
| 2026-09-07 08:52 | FRONT DOOR | Version 15 | `USER_ACCESSING` (and `DOMAIN`), read in the editor before the cut | a12c3e3 | e05e11db1449ae4c310719d11d83deec | d09615a9abc0998de9e5b7ec4ea4239a |
| 2026-09-07 09:07 | DATA | Version 17 | `USER_DEPLOYING` (and `ANYONE_ANONYMOUS`), read in the editor before the cut | f75d554 | bfde48984b1d5c5accd1181c4daea28d | d09615a9abc0998de9e5b7ec4ea4239a |
| 2026-09-07 09:09 | FRONT DOOR | Version 18 | `USER_ACCESSING` (and `DOMAIN`), read in the editor before the cut | f75d554 | bfde48984b1d5c5accd1181c4daea28d | d09615a9abc0998de9e5b7ec4ea4239a |
| 2026-09-07 18:09 | DATA | Version 19 | `USER_DEPLOYING` (and `ANYONE_ANONYMOUS`), read in the editor before the cut | c6f55e3 | 44c51c70564a4f22082f9deaf837ebe7 | d09615a9abc0998de9e5b7ec4ea4239a |
| 2026-09-07 18:11 | FRONT DOOR | Version 20 | `USER_ACCESSING` (and `DOMAIN`), read in the editor before the cut | c6f55e3 | 44c51c70564a4f22082f9deaf837ebe7 | d09615a9abc0998de9e5b7ec4ea4239a |
| 2026-09-08 19:58 | DATA | Version 21 | `USER_DEPLOYING` (and `ANYONE_ANONYMOUS`), read in the editor before the cut | 15bf8ab | 122eedb38f4eaa42350aad6439b51b22 | fb45387250d97d2473767540d6dbbba3 |
| 2026-09-08 20:02 | FRONT DOOR | Version 22 | `USER_ACCESSING` (and `DOMAIN`), read in the editor before the cut | 15bf8ab | 122eedb38f4eaa42350aad6439b51b22 | fb45387250d97d2473767540d6dbbba3 |
| 2026-09-09 22:01 | DATA | Version 23 | `USER_DEPLOYING` (and `ANYONE_ANONYMOUS`), read in the editor before the cut | 300dfc4 | 2221999671673d818adb24e3bd07b7ca | 6c2eb7d561a77ab149f8f1163c885abc |
| 2026-09-09 22:03 | FRONT DOOR | Version 24 | `USER_ACCESSING` (and `DOMAIN`), read in the editor before the cut | 300dfc4 | 2221999671673d818adb24e3bd07b7ca | 6c2eb7d561a77ab149f8f1163c885abc |
| 2026-09-11 09:50 | DATA | Version 25 | `USER_DEPLOYING` (and `ANYONE_ANONYMOUS`), read in the editor before the cut | f2a5f7b | 9a4f9c321834312a59bc12e73a70752d | 6c2eb7d561a77ab149f8f1163c885abc |
| 2026-09-11 18:49 | FRONT DOOR | Version 26 | `USER_ACCESSING` (and `DOMAIN`), read in the editor before the cut (Damien made the two-line manifest edit himself — the desktop app's permission classifier refused Claude the access change) | f2a5f7b | 9a4f9c321834312a59bc12e73a70752d | 6c2eb7d561a77ab149f8f1163c885abc |
| 2026-09-12 13:45 | FRONT DOOR | Version 27 | `USER_ACCESSING` (and `DOMAIN`), read in the editor before the cut and again after it — the manifest RESTS there now, so no edit was needed by anyone (a front-door-only cut: `Code.gs` unchanged, DATA stays Version 25) | 6263421 | a1b79b5f3b7c065add76a79d8c0f0c2a | 6c2eb7d561a77ab149f8f1163c885abc |
| 2026-09-12 16:02 | FRONT DOOR | Version 28 | `USER_ACCESSING` (and `DOMAIN`), read in the editor before the cut and again after it — no edit, the manifest rests there | 4199ee4 | 46f5f0ec563f96a66617eb5c9d3af04b | 6c2eb7d561a77ab149f8f1163c885abc |
| 2026-09-12 16:14 | FRONT DOOR | Version 29 | `USER_ACCESSING` (and `DOMAIN`), read in the editor before the cut and again after it — no edit | d8dcef5 | f1108d9c5d675f15ac693987c99e1f71 | 6c2eb7d561a77ab149f8f1163c885abc |
| 2026-09-12 16:35 | FRONT DOOR | Version 30 | `USER_ACCESSING` (and `DOMAIN`), read in the editor before the cut and again after it — no edit | 611a688 | 835eb4f78cca9321119f5da8d72650dd | 6c2eb7d561a77ab149f8f1163c885abc |
| 2026-09-12 19:27 | FRONT DOOR | Version 31 | `USER_ACCESSING` (and `DOMAIN`), read in the editor before the cut and again after it — no edit, the manifest rests there (a front-door-only cut: `Code.gs` unchanged, DATA stays Version 25) | 85a5660 | 8530a932d9a3a2478a645f1111ecee47 | 6c2eb7d561a77ab149f8f1163c885abc |
| 2026-09-12 20:27 | DATA | Version 32 | `USER_DEPLOYING` (and `ANYONE_ANONYMOUS`), read in the editor before the cut (Damien's two-line edit) — THE STORE CUT: doPost accepts the secret OR a signed store token | 913e0f8 | 831c8f4b7336c11f51448269204bc1ca | 85f8d63c60440ded9e954cc5ac4ffec0 |
| 2026-09-12 20:30 | FRONT DOOR | Version 33 | `USER_ACCESSING` (and `DOMAIN`), read in the editor before the cut and again after it (Damien's two-line edit back; the manifest rests there) — doGet mints the store token and the page calls DATA itself | 913e0f8 | 831c8f4b7336c11f51448269204bc1ca | 85f8d63c60440ded9e954cc5ac4ffec0 |

## Proof rows

_(one per version cut, quoted from the Executions log)_

**DATA, Version 3.** Quoted from the Executions log: the `doPost` row is the
data endpoint being reached server-to-server, which is the only way it is ever
reached.

```
Version 3  doPost   Web app  6 Sept 2026, 11:57:41  1.878 s  Completed
```

**FRONT DOOR, Version 4.** Quoted from the Executions log: one visit by a
browser, 6 Sept 2026 12:00:30-12:00:37, and the whole chain behind it.
A pupil's browser reaches only the front door; the front door reaches DATA.

```
Version 4  doGet    Web app  6 Sept 2026, 12:00:30  2.777 s  Completed
Version 4  apiCall  Web app  6 Sept 2026, 12:00:34  5.845 s  Completed
Version 3  doPost   Web app  6 Sept 2026, 12:00:37  1.995 s  Completed
```

The `doPost` row is the one that matters and the one that was missing all
morning (F33, F34): an `apiCall` with no `doPost` beside it is a relay talking
to a sign-in page. The same chain ran again at 11:57:33-11:57:41, before the
shared secret was rotated, and again after it - so the rotation is proved too.

**Versions 5-7, 6 September 2026 afternoon.** The relight and the two new laws
(readability, overlap) went out as Version 5 / Version 6, both from `f85e74b`.
Version 7 was the front door only, from `4683ad1`, on the reasoning that DATA
serves no page and its `Code.gs` was byte-identical. `qa-manifest` refused it:
"the two deployments were cut from different commits - both artefacts come from
ONE build". It is right and the reasoning was wrong - the DATA version still
carries a snapshot of the whole project, `Index.html` included, and a pair that
does not match is a pair nobody can reason about later. Version 8 cuts DATA from
the same commit.

Proved on the live cover after Version 7, which is what the whole two-deployment
design exists for:

```
Welcome
D Gartland          ← read from her own Google token, nothing typed
```

**DATA Version 10 and FRONT DOOR Version 11, cut from `da8437b`.** One visit to
the front door, 6 Sept 2026 15:39:02-15:39:16, quoted from the Executions log.
It is the whole chain in five rows: the browser reaches Version 11 and nothing
else; Version 11 reaches Version 10 twice, server-to-server, with the secret.

```
Version 11  doGet    Web app  6 Sept 2026, 15:39:02   2.83 s   Completed
Version 11  apiCall  Web app  6 Sept 2026, 15:39:07   4.724 s  Completed
Version 10  doPost   Web app  6 Sept 2026, 15:39:10   1.717 s  Completed
Version 11  apiCall  Web app  6 Sept 2026, 15:39:13   9.054 s  Completed
Version 10  doPost   Web app  6 Sept 2026, 15:39:16   5.383 s  Completed
```

What that visit put on the screen, on the live front door, with nothing typed:
the light shell, "Welcome / D Gartland" read from his own Google token, and
"Getting your details..." carrying a turning spinner until the relay answered
and the button lit. The repeated instruction is gone from the artefact both
deployments serve - asked of the live DATA page directly, "Now work it out, then
write the value" returns nothing and "Now work it out, then enter the value"
returns the one copy that belongs beside the number pad.

**What the automation could not do (said plainly, DFM 213).** Apps Script serves
the app inside a cross-origin sandboxed iframe, so a synthetic click reaches the
outer document and stops there. Everything above is read from the composited
page, from the Executions log and from the DATA artefact over HTTP. Pressing the
buttons is the eight-item list below, and it is his.

**DATA Version 12 and FRONT DOOR Version 13, cut from `24ca0c7`.** The shelf's
book series line was failing the contrast floor on a phone and a tablet while
reading clean on a laptop, and the pass that called the visual laws green had
been run at 1280 only (F40). Both halves re-cut from one commit, same two
`/exec` URLs, same deployment ids.

Read back off the live DATA page over HTTP, which is the artefact both
deployments serve:

```
.bcover.livery-teal { background: linear-gradient(170deg, var(--teal), #0A5A70); }
.bcover .series { font-family: var(--f-mono); font-size: 11px; font-weight: 600; ... }
```

Measured on the built page at all three widths before the cut: 375 PASS, 768
PASS, 1280 PASS, 15 pieces of text read on each.

**DATA Version 17 and FRONT DOOR Version 18, cut from `f75d554`, 7 Sept.** Two
cuts in the morning: Versions 14/15 carried the seven fixes the gates found
overnight, and 17/18 the two more found by reading the files after the gates had
gone quiet. Same two `/exec` URLs throughout, same deployment ids.

**Version 16 was a mis-click, and it is on the record because it was.** The
Manage-deployments list re-orders itself between openings, and the row that
looks like the front door is sometimes the data endpoint: selecting by POSITION
put a version on the wrong deployment. No harm done - the manifest was in its
data state at the time, so the extra cut was simply a duplicate, and an
anonymous fetch of the data `/exec` confirmed the relay was never broken. The
rule that follows: **read the Deployment ID before touching the pencil, every
time.** The list is not a stable order and the dialog will not tell you which
one you are about to change.

Proved live on Version 18 after the cut: the cover read "Welcome / D Gartland"
with nothing typed, "Getting your details..." turned its spinner until the relay
answered, and the button lit.

**DATA Version 19 and FRONT DOOR Version 20, cut from `c6f55e3`.** The last
three fixes the gates found: the amber near-miss note, the bins' family labels,
and the heading on the card she reads after two wrong tries. Both deployments
selected BY DEPLOYMENT ID this time, not by position in the list - see the note
on Version 16 above.

Read back off the live data `/exec` after the cut: `color:#4a4842` (the bin
labels), `--amber-flag: #7A5A05`, `color: #6E5104` (the help-strip heading), all
present and matching the built pair byte for byte.

**DATA Version 21 and FRONT DOOR Version 22, cut from `15bf8ab`, 8 Sept 2026 —
Handling Data Book C (`stats-quartiles`).** Deployed by Fable 5.1 driving Chrome
on Damien's ruling of 16:30 ("Book C ships NOW"), after the build session was
stopped at 19:05 for spending its afternoon re-running checks. `Code.gs` changed
for the first time since v4: the server's `ACTS` list gained `stats-quartiles`
(a book is not client-only — a save for an unlisted id is refused), so this
deploy carries a SERVER change and the eight-item smoke list below applies in
full. Both deployments selected BY DEPLOYMENT ID. The manifest was read in the
editor before each cut and put back to `USER_DEPLOYING` + `ANYONE_ANONYMOUS`
after the front-door cut.

Proved before the cut, at `15bf8ab`: `--fast` 26 gates green; `--full` in 16
minutes with every coverage cell closed; the separated cold read re-filed by a
fresh judge against the current transcript (108 sentences: 87 pass, 21
rewrite, 0 fail — the rewrites are the next cut's work); three phone-width
walker findings recorded as dated waivers in `MATHS_COVERAGE_DEBT.md` with
their pictures (an Algebra prompt at 3.08:1 after a wrong attempt; a Book C
reason chip fading after Check; a stray read-out on the Exercise 4 opening).

Proof rows, quoted from the Executions log after one visit to the front door
at 20:04 on 8 Sept 2026 — the browser reaches Version 22 and nothing else;
Version 22 reaches Version 21 server-to-server with the secret:

```
Version 22  doGet    Web app  8 Sept 2026, 20:04:08  3.345 s  Completed
Version 22  apiCall  Web app  8 Sept 2026, 20:04:14  5.911 s  Completed
Version 21  doPost   Web app  8 Sept 2026, 20:04:17  2.244 s  Completed
```

**DATA Version 23 and FRONT DOOR Version 24, cut from `300dfc4`, 9 Sept 2026 —
the front door never touches the Sheet.** Damien's smoke test with two REAL
pupil accounts (21:03–21:08, the `doGet … Failed` rows below) met
`Exception: You do not have permission to access the requested document
(line 342, file "Code")`: under execute-as-User `doGet` ran as the pupil and
`getName_` reached the deployer's Sheet through `getConfig_`. His own visits had
always sailed through because the Sheet is his — which is why no earlier smoke
had met it. `doGet` is Sheet-free now (`t.firstVisit = 'no'`; the cover reads
first-visit from `hello`, which runs on DATA). Harness first: `qa-two-homes`
builds its front-door world with `sheetAccess:false`, EXECUTES `doGet` as a
pupil, and carries the pre-fix line as its control
(`front-door-touches-the-sheet`, seen to fire). Same cut: the markbook's wait
card breathes (its 2% scale pulse was invisible), a tickbox that is saving says
so on the class line, and a disabled chip keeps full ink (`.chip:disabled`
was 40% opacity — 2.18:1 after Check).

Proved at `300dfc4` before the cut: `--fast` 26 gates green; `--full` twice (16
min each) with every coverage cell closed; the v4 shell and the teacher layer
re-read by fresh judges; four more phone-width findings of the dimmed-after-
Check class recorded as dated waivers with their pictures.

Proof rows, quoted from the Executions log. NOTE the log labels every row by
the deployment's CURRENT version, so rows from earlier today also read
"Version 24" / "Version 23"; the times are what date them.

```
Version 24  doGet    Web app  9 Sept 2026, 22:04:26  1.974 s  Completed      <- the deployer's visit after the cut
Version 24  doGet    Web app  9 Sept 2026, 21:08:24  2.087 s  Failed         <- a pupil account, before the fix
Version 24  doGet    Web app  9 Sept 2026, 21:06:48  1.621 s  Failed         <- a pupil account, before the fix
Version 23  doPost   Web app  9 Sept 2026, 21:06:14  4.924 s  Completed      <- the relay, unchanged code, before the fix
Version 24  apiCall  Web app  9 Sept 2026, 21:06:11  9.628 s  Completed
```

The relay path (`apiCall` → `doPost`) is unchanged and its chain is proved above
and on 8 Sept. **The pupil path itself can only be proved by a pupil account**:
the deployer cannot reproduce the refusal, so the fix is proved under the
two-homes mock (the exact exception, as a pupil) and by his next pupil login.

### What is live, in one line each

- **Live since 12 Sept 2026 16:35, from commit `611a688`: FRONT DOOR Version 30, DATA Version 25 (unchanged since `f2a5f7b`; `Code.gs` byte-identical) — the three hotfixes of 12 Sept (a slow store is not a broken one; the teacher's landing waits like the markbook's cover; a tick the store answered late is re-read, never reverted by guess) on top of POLISH CUT 2 and the 11 Sept re-cut.**
- **Project** `OLS - MathShelf`, script id `1oW-8eFK4DUvTZaB56jg_rYd7l_L_zPY-5Um16v0gtq_dlbThvbLczhOX`
- **Sheet** `OLS - MathShelf`, id `1xVDBKmPP83MMZPqpPJr0GQRR0N9estf9ebhKyhGQd0Y` (bound)
- **FRONT DOOR** (the only link anybody opens)
  `https://script.google.com/a/macros/c2ken.net/s/AKfycbzUZ3bDjcFas_zQ02VrJQCEkPQgEjs3Re4JZ1OQtLACa090AC1B0Md2yUkL4aX81LwP/exec`
- **DATA** (never handed to a pupil; reached only server-to-server, with the secret)
  `https://script.google.com/macros/s/AKfycbyO6pQnLHujpost5Otxe9oJB2iFdbno3Kxxw5RU51A9prKiqDMrIm__UWuLEDn2f4wo/exec`
- **Script properties**: `relaySecret` (256 bits, rotated 6 Sept 2026 12:00) and
  `dataUrl`. Neither is in this repo, and neither is ever sent to a browser.

### The project this replaced

`OLS Maths - Glass Jotter` (script id `1otJG5454zR6a0WKZW23czKnehxtQ3Oj6CrrRWYys1H4bPxZOoaZ3qPmC`,
Sheet `164nmiqGLLr2SktTuPnZy70KQZL9Us4CItMW5VnbCyMY`) is RETIRED, not deleted.
It had to be left behind because the OAuth client Google minted for it in June
carries the name **"OLS Maths - Glass Jotter"**, and that name - a dead name -
was what every pupil would have read on the permission screen. Renaming the
script does not rename the client. Copying the Sheet brought the bound script
with it as a NEW project with a NEW client, so the consent screen now reads
**OLS - MathShelf** (confirmed on screen by Damien, 6 Sept 2026, before he
allowed it).

---

**DATA Version 25 and FRONT DOOR Version 26 — the Book C polish cut, 11 Sept
2026, from `f2a5f7b`.** `Code.gs` is UNCHANGED (md5 `6c2eb7d5…`, the same
bytes as Version 23): a client-only cut, so the eight-item smoke list does not
re-open; the polish cut's own smoke lines are in the done message. Index.html
was fetched into the editor from the pushed branch (1,137,739 bytes, the
committed file's exact length). The deployer's visit, quoted from the
Executions log as it displays them:

```
Version 26  doGet    Web app  11 Sept 2026, 18:49:35  2.017 s  Completed
Version 26  apiCall  Web app  11 Sept 2026, 18:49:39  6.38 s   Completed
Version 25  doPost   Web app  11 Sept 2026, 18:49:42  2.4 s    Completed
Version 26  apiCall  Web app  11 Sept 2026, 18:49:46  9.254 s  Completed
Version 25  doPost   Web app  11 Sept 2026, 18:49:50  4.759 s  Completed
```

(The visit was at 18:49 BST, straight after the front-door cut — the DATA cut was at 09:50 and the front door waited nine hours for the two-line manifest edit only Damien could make. The log re-labels every older row with the deployment's CURRENT version, so his 08:30 ticks now show as "Version 26 / Version 25"; the durations are the rows' own.) The tick round
trip he felt this morning, from those rows: `apiCall` 7.1–10.3 s wrapping
`doPost` 4.7–6.9 s. Both hops are Google's — the relay to DATA and the Sheet
write under its lock — and the client change does not shorten them; what it
changes is that the box flips at once and the gold card says it is saving
while they run.

**FRONT DOOR Version 27 — POLISH CUT 2, 12 Sept 2026, from `6263421`.**
`Code.gs` is UNCHANGED (md5 `6c2eb7d5…`, the same bytes as Version 23), so
under the rule this cut wrote into `DEPLOY.md` the front door ALONE was re-cut
and DATA stays Version 25: the first release that needed nobody's hands on the
manifest, which was read as `USER_ACCESSING` + `DOMAIN` before the cut and
again after it. Index.html was fetched into the editor from the pushed branch
(1,159,916 bytes, the committed file's exact length; md5 `a1b79b5f…`). This
cut also carries the steward re-cut of 11 Sept (Exercise 3's chart never
squeezed by its side column), which had been proved in the tree and not
deployed. The deployer's visit, quoted from the Executions log as it displays
them:

```
Version 27  doGet    Web app  12 Sept 2026, 13:46:12  0.914 s  Completed
Version 27  apiCall  Web app  12 Sept 2026, 13:46:15  6.351 s  Completed
Version 25  doPost   Web app  12 Sept 2026, 13:46:18  2.726 s  Completed
Version 27  apiCall  Web app  12 Sept 2026, 13:46:23  5.814 s  Completed
Version 25  doPost   Web app  12 Sept 2026, 13:46:25  3.284 s  Completed
```

(The log re-labels every older front-door row with the deployment's CURRENT
version, so his 11 Sept 19:05 saves now read "Version 27"; their durations —
`apiCall` 12.9 to 40.2 s, every one Completed — are the rows that made ruling
48: the 8 s "Still saving" card was firing on ordinary saves.)

**FRONT DOOR Version 28 — the hotfix, 12 Sept 2026 16:02, from `4199ee4`.**
`Code.gs` UNCHANGED (md5 `6c2eb7d5…`, the same bytes as DATA Version 25), so
only the front door was re-cut, under the rule of 12 Sept (a client-only cut
re-cuts the front door only). Index.html fetched into the editor from the
pushed branch (1,161,785 bytes, the committed file's exact length). The
manifest read `USER_ACCESSING` + `DOMAIN` before the cut and after it; nobody
touched it. The deployer's visit, quoted from the Executions log:

```
Version 28  doGet    Web app  12 Sept 2026, 16:03:28  2.08 s   Completed
Version 28  apiCall  Web app  12 Sept 2026, 16:03:33  6.888 s  Completed
Version 25  doPost   Web app  12 Sept 2026, 16:03:35  2.285 s  Completed
```

What this cut is for: his 15:02–15:04 test met "The app cannot reach its own
store … Tell Damien the front door is not joined to the data deployment" —
the log shows every one of those calls Completed, one `apiCall` at 68.3 s
(the front door gives up on UrlFetch at about a minute and says
`relay-failed`; the word table turned that into the joined-or-not sentence).
Now `relay-failed` reads "The store did not answer in time, so that did not
go through. Nothing was lost. Try again in a moment. If it keeps happening,
tell Damien."; the passcode check retries once, silently, 1.5 s after a first
`relay-failed`; "Checking the passcode…" is navy at 16 px with an 18 px mark.

**FRONT DOOR Version 29 — the hotfix's second screen, 12 Sept 2026 16:14, from `d8dcef5`.**
His fourth look (16:08, a screenshot): "Checking the passcode…" still flat —
on the TEACHER'S LANDING (the staff link with no class code: `script.js`
`staffCover`, the cover with a passcode where the name goes), a different
screen from the markbook's own cover (`staff.js`) that Version 28 fixed. The
preview's Staff oval opens the markbook cover, so no walk and no eyes had
stood on the landing; `index.html?nointro` (no class) is where it lives in
the preview. Same fix on that screen: the `is-waiting` line at 16 px navy
with an 18 px mark, and one quiet retry on `relay-failed`. `Code.gs`
unchanged; front door only; manifest `USER_ACCESSING` + `DOMAIN` before and
after. Index.html from the pushed branch, 1,163,199 bytes. The deployer's
visit (the landing itself):

```
Version 29  doGet    Web app  12 Sept 2026, 16:15:04  1.865 s  Completed
Version 29  apiCall  Web app  12 Sept 2026, 16:15:08  5.883 s  Completed
Version 25  doPost   Web app  12 Sept 2026, 16:15:10  1.983 s  Completed
```

**FRONT DOOR Version 30 — the hotfix's third screen, 12 Sept 2026 16:35, from `611a688`.**
His untick of Algebra for test12 at 16:28: `doPost` Completed in 5.7 s (the
store saved it), the front door's `apiCall` came back 36 s later as
`relay-failed`, and the screen put the tick back on while the pupils' shelf
had lost the book. Now a relay failure on a tick is never answered by guess:
the row asks the store what it holds (`classes`) and shows that — the outcome
line if the change landed, the slow-store sentence if it did not (ruling 49).
`Code.gs` unchanged; front door only; manifest `USER_ACCESSING` + `DOMAIN`
before and after. Index.html from the pushed branch, 1,164,468 bytes. The
deployer's visit:

```
Version 30  doGet    Web app  12 Sept 2026, 16:36:20  1.199 s  Completed
Version 30  apiCall  Web app  12 Sept 2026, 16:36:22  5.205 s  Completed
Version 25  doPost   Web app  12 Sept 2026, 16:36:24  2.812 s  Completed
```

What the day's log says about the hop itself: `doPost` 1.4–6.7 s every time;
`apiCall` 3–68 s — the time between DATA finishing and the front door
receiving its reply is Google's, and at about a minute the front door gives
up. The client now tells the truth about it and keeps or re-reads the work;
it cannot shorten it. That is the first job of the next cut (the DATA split,
RESUME_AB).

## The live smoke list — his eyes, after any server change (DFM 234b)

The audit row for a deploy flips to approved only when this log carries the line
`smoke: Damien, <date>, 1-8`.

1. A pupil who has **never** used this app signs in on a class link: her **full
   real name** is on the cover immediately, with no "is this you?" and nothing
   to type. (Google's permission screen appears once, first time only.)
2. A returning pupil is one press from her shelf.
3. A class link opens and works on a phone.
4. A pupil presses Check on a question; it appears on the teacher's class page.
5. The staff link with the passcode opens the markbook at the last class used.
6. Add a class in Set-up: the link and the QR code appear, and the link works.
7. Untick a book, then tick it again: the pupil's marks and star are still there.
8. A new book on the shelf arrives **unticked** for every class.
