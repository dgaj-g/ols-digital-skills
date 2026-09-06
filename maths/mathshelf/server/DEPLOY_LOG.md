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
