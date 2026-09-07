# MathShelf — the deploy log

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

### What is live, in one line each

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
