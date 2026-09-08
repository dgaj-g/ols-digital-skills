# MathShelf v4 — build progress

**Session 1: Opus 5 MAX, 5 September 2026.** This file plus the pushed branch is
the resume point. Nothing in a chat window is needed to continue.

---

## HOW TO RESUME, in order

```bash
# 1. the worktree (recreate it if /tmp was cleared)
git -C ~/Sites/ols-digital-skills worktree add /tmp/gj-wt draft/issue-24-25-maths-m2-revision
cd /tmp/gj-wt/maths/mathshelf
node tools/qa/install-hooks.js            # SAYS NO in a linked worktree, on purpose

# 2. the two preview servers (nohup, never the preview tool)
nohup python3 tools/qa/serve-preview.py /tmp/gj-wt                        8099 &
nohup python3 tools/qa/serve-built.py   /tmp/gj-wt/maths/mathshelf/server 8100 &

# 3. where things stand
export NODE_PATH="$(npm root -g)"
node tools/qa/run.js                      # the fast tier — GREEN as of the last commit
node tools/qa/sit-pupil.js                # ~90s per book per width
node tools/qa/sit-confused.js
node tools/qa/sit-teacher.js
node tools/qa/control.js                  # every gate made to say no
```

**The two servers** are committed at `tools/qa/serve-preview.py` and
`tools/qa/serve-built.py`. The first serves the worktree with `no-store`; the
second serves the BUILT `Index.html` at `/` with the Apps Script scriptlets
filled in (`<?= classCode ?>` → `demo`, `<?= name ?>` → `Aoife Gartland`), so
the deployed artefact can be walked exactly like the preview. They are in the
repo on purpose: a rig that lives in /tmp is a rig that is gone after a reboot.

Preview URLs: `http://localhost:8099/maths/mathshelf/index.html?class=demo&nointro`
and `http://localhost:8100/`. Staff passcode in the preview is `demo`; clear
localStorage first so the demo class re-seeds; always `?nointro`.

---

## WHAT IS DONE

| phase | state |
|---|---|
| P0 the gate system | **done.** 30 gates + 3 walkers under `tools/qa/`, each with `COVERS` and `CONTROLS`; `run.js` (fast / full / control / --book); `control.js`; the fixtures and plants; the coverage machine; the pre-commit hook installed. |
| P1 rebrand | **done.** `maths/mathshelf`, the name swept everywhere, the blackboard shell (`shell.css`), the new cover and shelf, fonts vendored (Schibsted Grotesk + Spline Sans Mono in, Caveat + Courier Prime out and off disk), the DOM contract on every surface, the whole strings migration (`strings.js`; the ledger reports **0 outstanding**). |
| P2 staff IA | **done.** Class page → exercise view → question view → book view, Set-up with series-grouped tickboxes and audience bands, Full grid demoted, Insights dissolved, the markbook re-gates on leave and after fifteen minutes idle. |
| P3 login | **done.** Front door (execute-as-User) + relay + shared secret, the data-side secret guard, the companion retired, `server/DEPLOY.md` rewritten as an ordered two-deployment checklist, the outbox. `qa-two-homes` is green over 45 assertions across both homes. |
| P4 the DONE list | **in progress** — see below. |
| P5 deploy | **not started.** Nothing is live yet; MAIN Version 25 is still the deployed app. |

`node tools/qa/run.js` (the fast tier, 20+ gates) is run by hand before each
commit — see the ordering decision below about why the hook is not installed
here.

## WHAT IS LEFT, in the order to do it

1. **The three walkers, clean, at one commit.** They now press the app's own
   controls (`tools/qa/lib/drive.js`) and record the state the app was actually
   in, so a walk is worth what it says. Each run has been finding real faults
   and the run after a fix has to be a fresh one — a walker launched before an
   edit keeps testing the old code. Watch for two things in the log: `expected
   X, stood on Y` notes (honest, and settled at the end of the walk) and any
   `the browser tab died part-way` line, which is the rig, not the app.
2. **`node tools/qa/control.js`** — every control FIRED, every over-tightening
   PASSED. **The node tier is done: 28 gates green, 65 controls fired, one red
   — `qa-cold-read`'s over-tightening, which stays red until the separated
   judge has filed its verdicts (step 3).** The browser tier (colour law,
   fonts, numpad, waits, click-safety, preview-honest, staff-relock,
   two-attempts and the three walkers) runs its battery on its own: each
   browser control now gets its own preview server on its own sandbox, and it
   must not be run at the same time as a walk — both want the machine, and a
   control that fails under load has told you nothing.
3. **The separated cold read.** Run `node tools/qa/extract-transcript.js`, then
   hand a FRESH context (a subagent that has seen nothing of this build) ONLY
   `tools/qa/out/transcript/_teacher.md`, `_v4.md` and
   `tools/qa/COLD_READ_CHECKLIST.md`. It files
   `tools/qa/MATHS_COLD_READ_VERDICTS_TEACHER.md` and `..._v4.md`, each naming
   the transcript hash. `qa-cold-read.js` refuses a stale hash. Author is never
   judge: do not write these verdicts yourself.
4. **`run.js --full` green at one commit**, then push.
5. **Deploy**, following `server/DEPLOY.md` exactly — DATA first, the manifest
   READ before each version cut, the Executions log quoted into
   `server/DEPLOY_LOG.md`. Then `MS_POST_DEPLOY=1` on `qa-manifest` and
   `qa-repo-prod`. The Apps Script editor is already open and signed in as
   `dgartland021@c2ken.net`.
6. **Close:** `HANDOVER.md`'s "What is live" table, PR #22 retitled, the memory
   note, and the done message with the eight-line smoke list.

## STILL OWED AFTER THIS SESSION (not part of P0-P5, and not forgotten)

- **The silent captioned tutorial film** for the teacher, and the teacher guide
  it sits in. His standing law is that this platform lives or dies by ease of
  use and beauty, and that those two are deliverables, not extras. The cold read
  is the half of it that is built; the film is not.
- **The Handling Data book** (Colette's third). `statcore` does not exist yet;
  `qa-selftests` reports it as NOT BUILT rather than passing over it, and the
  shelf will offer it unticked to every class the day it lands.
- **A vocabulary per book** (`tools/qa/vocab/<book>.json`), which is what would
  wake the define-before-use rule. It is on the debt ledger with its reason.
- **The eight-item live smoke list** in `server/DEPLOY_LOG.md`. It is his,
  because it cannot be anyone else's: Apps Script serves the app inside a
  cross-origin sandboxed iframe, so a synthetic click reaches the outer document
  and stops. The deploy is proved as far as the automation can reach - the
  Executions chain, the composited cover, the artefact over HTTP - and the eight
  presses are the part that needs a person. The audit row flips to approved when
  the log carries `smoke: Damien, <date>, 1-8`.

---

## THE BASELINE (the FLOORS — they may only rise)

| suite | floor | still true |
|---|---|---|
| mathcore selfTest | 73 | yes |
| dev/test-anglecore.js | 72 | yes |
| dev/lint-content-angles.js | PASS | yes |
| dev/lint-content-algebra.js | PASS | yes |
| dev/validate-all.js | 48 of 48 | yes |
| dev/test-server-scoping.js | 20 | yes |

`dev/validate-all.js` now builds its attempts from `dev/model-attempts.js`,
which is the same home `sit-pupil` drives the browser from: the validator and
the walker can no longer disagree about what a correct attempt is.

## ORDERING DECISIONS (recorded, so they are not re-argued)

1. The pre-commit hook is written and committed (`tools/qa/hooks/pre-commit`)
   but is **NOT installed in this worktree, deliberately**. A linked worktree
   shares `.git/hooks` with the main checkout, which may hold another session's
   work, and installing there would run the MathShelf gates on that session's
   commits. `install-hooks.js` now detects this and refuses, naming the
   override. The fast tier is run by hand before each commit instead;
   `--no-verify` has not been used, and there is nothing to bypass.
2. `git mv maths/glass-jotter maths/mathshelf` happened as the first act of P1
   rather than after P0.d, because several P0 gates are RED BY DESIGN until the
   thing they guard exists — that is what harness-first means — and waiting
   would have deadlocked the rename that is part of their own fix.

---

## FINDINGS — each with the gate that caught it (harness first)

| # | what it was | caught by | what was done |
|---|---|---|---|
| F1 | the server never checked a class's tickboxes on `save`/`load`: a book a class does not have was closed on the shelf and open on the wire | qa-two-homes at 45b03ed | `actTicked_` on both homes |
| F2 | `coerceActs_` was hardcoded to `{angles, algebra}`, so a third book could be ticked in the markbook and silently dropped — **the Handling Data book could never have been switched on** | qa-tickbox | derived from `ACTS` |
| F3 | "Every line earns its mark." was live in `COMMENTS.perfect` — the banned tagline, on a pupil's screen | qa-language must-fail exhibits | rewritten |
| F4 | the markbook's posture line leaked the internal pencil/ink metaphor to a teacher | qa-voice | rewritten |
| F5 | `@keyframes step-land` animated `background` | qa-compositor | moved to an overlay whose opacity moves |
| F6 | the message voices wore AMBER — a marking colour — while the stylesheet's own opening rule says UI errors never do | the colour law, in pixels | moved to `--support-rose` |
| F7 | the v3 cover's navy radial survived the re-skin and painted over the whole blackboard shell: correct in every token, NAVY in the pixels | the colour law, in pixels | the dead v3 CSS deleted; screens paint no ground of their own |
| F8 | `SWAP_NOFLIP` was a slip nobody could trigger; `ALT_CORR_SWAP` was named in two words | qa-dx-coverage | one deleted, one rewritten |
| F9 | the protractor's centre mark was drawn in MARKING RED — the colour that means WRONG | the colour law | the colour moved to navy; behaviour untouched, and qa-v3-shape proves it |
| F10 | **a pupil's next save wiped the teacher's inked verdict** — she marks a question, the pupil types one more line, the mark reverts, nothing says so | qa-pencil-ink | every stored `ovr` is merged forward on the one write path |
| F11 | **the live site has never served this folder**: every vendored font the deployed page asked github.io for was answering 404, so MathShelf and the Glass Jotter before it have been rendering in fallback faces | qa-build's live-asset probe, with its known-absent control | the five faces are carried IN the page as data: URIs (+215KB, and a whole class of "it worked in the preview" gone) |
| F12 | the reason note ran 89px off the right edge of the paper at 375px | sit-pupil @375 | it wraps on a phone |
| F13 | a disabled Check said nothing about what it was waiting for | sit-pupil, mute-locks | `data-locked-why`, three plain sentences |
| F14 | the gold box-draw and star read as marks wearing the wrong colour | the colour law | they declare themselves `data-celebrate` |
| F15 | the film's step dots stuck 2px out of the film at 375px | sit-pupil @375 | they wrap |
| F16 | the walker was pressing a correctly-disabled Check on every classify and protractor question and calling the result "checked-right" | the walker's own Check reading its `data-locked-why` | the walker now presses the option card and types on the pad, the way she does |

| F17 | the coverage matrix **silently dropped its whole surface half** whenever qa-surfaces had not run first (a control sandbox, or `--only`): the registry was read from a sidecar that gate writes, and the totals still printed GREEN | the control battery | the registry is parsed from `GJ.app.surfaces` in the source; the sidecar only reports drift |
| F18 | qa-repo-prod's strongest question — is the committed server pair the same as a fresh build? — **had never once been asked**: it copied the app folder flat, the assembler could not find its two repo-root inputs, and the build failed every time | the control battery | the scratch keeps the repo's shape; the comparison now runs, and the committed pair does match |
| F19 | the walker's model-attempt table was keyed by question id alone, and **eighteen of the thirty ids appear in both books** — so every algebra question was answered with an angles pupil's working, and quietly refused | the walkers recording what was on screen | keyed by book and question; `sit-confused`'s duplicate copy of the table deleted |
| F20 | **the walkers wrote down the state they meant to reach**, not the state the app was in, so a drive that silently did nothing still filed a row saying she had stood there — and coverage counted every one | itself, once it read `data-state` | `record()` reads the DOM contract, records what it saw, and fails on a mismatch |
| F21 | **five of the seven question kinds never said what state they were in.** Only classify and protractor stamped `data-state`; substitute, collect, expand, solve, form and the angles route went from `fresh` to marked in silence | the honest walkers | every kind now stamps mid-attempt, checked-right, amber, checked-wrong-1/2 and locked-restore |
| F22 | **qa-language had never read a sentence with a comma in it.** The copied entry scanner split on every comma, so twenty of the app's own pupil sentences — the longest ones — never parsed | qa-language's own control | the scanner steps over quoted text; 162 readable sentences became 188 |
| F23 | qa-needs-you's "a flag that never clears" check read `c.q` and `c.reason`, fields no chip has ever carried, so it could not have failed | the control battery | reads `c.qid` and `c.why` |
| F24 | qa-earned-stays' "her work is still hers" check compared two values that were both empty when the row had been orphaned — which is exactly the fault | the control battery | it insists there was work there before it says the work came back |

| F25 | the pre-commit hook was installed in `$GIT_DIR/hooks` of a **linked worktree**, which git never reads — it had sat there since it was written and had never once run, while the record said every commit ran the fast tier | looking, after the control battery made the claim worth checking | the installer now names the directory git really reads (the SHARED one), refuses unless told outright, and the fast tier is run by hand |
| F26 | `book-contents` was stamped "fresh" once in the markup and never again, so "mid-book" and "finished" were declared and rendered by nothing | the honest walkers | the contents page counts her own locked questions and says which of the three it is |
| F27 | seven places printed the **server's own error code** onto a teacher's screen — "not-configured" at ten to nine on a Tuesday | reading the deploy path for what a first visit does | every code the server can return has one sentence; anything unlisted falls back to the caller's own words |
| F28 | **twenty-four states** the registry claimed and nothing ever wrote — a third of the whole registry, counted as coverage cells all along | the new qa-surfaces rule, written the moment F21 showed the shape of the fault | each one written where it happens; the gate cuts the registry out of its own evidence first |
| F29 | **the film froze at step three and the Next arrow did nothing.** The angle count-up is the one animation driven by requestAnimationFrame; a page the browser is not painting gets no frames, the promise never settled, and the player's busy latch never cleared | the walker watching a film the way she does, one step arrow at a time | a backstop timer finishes the count where the frames do not come |

| F30 | **every browser-tier control was reading the wrong tree** — the fault was planted in a sandbox copy and the gate was then pointed at `localhost:8099`, the real worktree, so eleven gates' controls passed honestly and could never have fired | the battery, once the node tier was clean | each browser control gets its own preview server on its own sandbox |
| F31 | qa-fonts reported **Schibsted Grotesk — the interface face on every screen — as not loading.** `document.fonts.check()` asks whether the browser has already painted with a face, and a headless page is never painted | the browser battery | the gate asks the face to LOAD, which is the question it means |
| F32 | the film's gold F/Z/U tracing line read to the colour law as **gold on a reading surface**, on every angles question the film had run over | the walk, at three widths | the trace declares itself an ornament; the film is unchanged (the three colours are meant to accumulate) |
| F33 | **the relay never reached the data deployment at all.** DATA is published to "Anyone within the domain", and the front door's `UrlFetchApp.fetch` carried no credentials: Google answered it with the sign-in page instead of running `doPost`. Every pupil would have met a dead cover on the first morning | the live Executions log, after the front door was cut - `apiCall` completed and there was NO `doPost` row to match it | the relay presents `ScriptApp.getOAuthToken()` as a bearer; the caller is the pupil, and she is in the domain. qa-two-homes already printed the blind spot in its own NOT MEASURED line: "the relay hop is exercised sandbox-to-sandbox; the real network is not called" |
| F34 | **the bearer did not open the door either: `RELAYDIAG code=401`.** A web app published to "Anyone within the domain" cannot be called server-to-server at all - `UrlFetchApp` carries no session, and a token from `ScriptApp.getOAuthToken()` is refused unless the caller also holds a Drive scope, which would put "see and download all your Drive files" on every pupil's consent screen | a temporary `console.log` of the response code, run from the editor against the live DATA deployment | DATA is published to **Anyone**, and the shared secret (256 bits, script property only, URL never sent to a browser) is the whole lock - written up in `server/DEPLOY.md` under WHY DATA IS PUBLISHED TO ANYONE |
| F35 | **the readability audit was already here, and nothing ever called it.** `lib/contrast-audit.js` was ported from the KS3 DT platform on 28 August, written for exactly this fault class - "an INHERITED colour, the DARK shell's text token, on a light parchment card" - and `lib/audits.js` exposed it as a separate call "the caller decides how often it is worth taking one". No caller ever decided. Three walkers listed `readability` among the cells they covered and not one of them invoked it | he opened the markbook and could not read it | it runs on every recorded state, from `run()`, not by invitation |
| F35a | the audit's root was `document.querySelector('[data-surface]')` - the FIRST surface in the document, which is `#scr-cover` and is `hidden` on every screen but the cover. It collected nothing, and "nothing" went through the filter as a clean PASS. Zero elements measured on every state of every walk, reported green | a probe that asked it to measure a page and print how many elements it had looked at | the root is the visible surface; a measurement of nothing is now `EMPTY`, never `PASS` |
| F35b | glyphs the pixel sampler cannot separate from their plate were dropped as a "skip with its reason" - and white on white is exactly that case. The worst fault the gate exists for was the one it stayed silent about | the same probe, with an invisible sentence planted | unmeasurable rows are asked again in computed colour composited through their ancestors, and a gradient is refused rather than guessed (which had reported white-on-teal at 1:1) |
| F36 | **`.ledger` set its own white ground and never set a text colour**, so the markbook's class table inherited the shell's near-white chalk. Class names, pupil counts and "Open the markbook" at **1.04:1** | him, on the live site | a light surface declares its own ink, in the same rule as its ground |
| F37 | **the audience chip floated over the series name.** `.bcover .band` was `position: absolute`, so it took no space and "LETTERS & BALANCE" ran clean underneath it. Nothing measured geometry BETWEEN elements at all - the geometry audit asks only whether a thing stays inside its card | him, on the live shelf | the chip is in the flow beside the series; a new overlap law walks every visible text box and fails on any pair that lands on another |
| F38 | **the name WAS read, and then thrown away.** `doGet` put her real name in BOOT from her own Google token - the userinfo call returns 200 with `"name": "D Gartland", "given_name": "D", "family_name": "Gartland"`, measured 6 Sept 2026 - and the cover painted it. Then `hello` came back and `me.name = r.name \|\| ''` overwrote it with what the Sheet held, which for a pupil who has never typed a name is nothing. A good name was wiped by an empty one and she was asked to write it herself | a probe that asked Google the question the app asks and printed the answer | `r.name \|\| me.name \|\| ''` - a name she saved wins, and nothing is not a name she saved |
| F38a | the guard around `autoName_` (`getEffectiveUser` vs `getActiveUser`) was blamed for this first and removed. It was NOT the cause - the probe shows both return the same address - but the guard protected a case that cannot happen (the data deployment serves no page) and could only ever have done harm, so it stays gone. Recorded because a wrong diagnosis that got as far as a deploy belongs on the record next to the right one |
| F39 | **the substitution board told her the same thing twice, in two wordings.** `commitMethod()` wrote "Now work it out, then write the value:" into the instruction line at the top of the question, and `showAnswer()` put "Now work it out, then enter the value:" directly above the number pad. One sentence, two spellings, and the top one nowhere near the box it was talking about. Twenty-eight gates read the strings table, and none of them read the SCREEN | him, on the live substitution question | the prompt belongs beside the box it is about, once; a new said-twice law walks every instruction line on every recorded state and fails on a pair inside one question that is identical or one word apart |
| F39a | the said-twice law invented four faults before it was honest: the contents page (404 findings - every exercise title matched every other), the self-evaluation list, the shelf marks, and an exercise heading against its own nav chip. Each narrowing is a rule now: it reads only instruction lines (the ui-msg class, this platform's own class for a sentence addressed to the reader), it compares only inside one question or one book, it ignores anything under 25 characters or 5 words, and a pair must be identical or exactly one token apart. A law that cries wolf is a law he turns off |
| F40 | **the shelf failed on a phone and a tablet, and the 1280 walk never knew.** "The Geometry Set" measured 3.49:1 at 768 and 4.39:1 at 375 against a 4.5 floor - white, 11px, uppercase, on the brightest pixel of a teal gradient. Two things were wrong and only one of them was the plate: turning the gradient over so the dark end sits under the labels got the worst pixel to 5.36:1 and it STILL measured 4.44:1, because an 11px face at .16em letter-spacing is mostly edge - the sampler reads glyphs that are half plate, and so does an eye at the back of a room. Both stops are now at or below the token colour and the label is 600 | the shipped tree's own `over-tightening` control, which walks all three widths - the pass I had run by hand was 1280 only | a thin small label on a saturated ground is a contrast fault even when the arithmetic on the two colours says it is not |
| F41 | **three controls read DID NOT FIRE and every law they guard was working.** The control sandbox carried two hardcoded files out of the repo root and `index.html` had quietly grown a third, so every browser control ran against a page that 404'd on the crest: seven console errors on every state, the walk failing for the missing file instead of for the planted fault. A control that fails for the wrong reason is worse than no control, because it reads as a broken gate and the real answer never arrives. The sandbox now reads its asset list out of the page | a network trace of a hand-built sandbox, printing what actually 404'd | one list, held in the file that owns it |
| F42 | **the contrast law was measuring the EDGES of letters, not the letters.** It took the pixel cluster whose mean was NEAREST the colour the browser says the text is, and for a thin or short string the nearest cluster is a pale blend of ink and paper. Antialiasing only ever pulls glyph pixels TOWARDS the plate. That is how "Added to your jotter." - green on white, readable across a table - came back at 1.16:1, and the question prompts, navy on paper, at 2.18 and 3.09 | photographing the screen the gate had just condemned, three times, and finding nothing wrong with any of them | among clusters that are recognisably the text's own colour, the core is the one FARTHEST from the plate: the middle of a stroke, where a reader's eye lands. Proved to still bite AFTERWARDS - planted white-on-white in the markbook still gives 1:1 |
| F42a | four more faults in the same sampler, each of which made blank paper look like a fault at about 1.1:1: the picture was the VIEWPORT and the boxes were in DOCUMENT coordinates (every scrolled screen sampled a scroll-offset away); the offset was read a tick after the boxes, so a page still scrolling to show a verdict measured in two frames of reference; a row scrolled off the picture was CLAMPED to its top-left corner instead of skipped; and the plate was never checked against the element's own ground - a navy button sampled as white paper had not been sampled at all. Every one was mine, introduced while fixing the one before it |
| F43 | **the faults that were real, once the law could be believed**: the disabled "Mark my working" at 2.57:1 (the whole control was faded to 55%, so the one action on the page was barely readable while she worked towards it); the theorem stamp permanently at nine tenths opacity in its BASE rule; the bins' family labels - X TERMS, X SQUARED TERMS, NUMBERS, which ARE the instruction for the sort - at 4.04:1; the substitution board's GIVEN label at the same; "WHERE IT WENT WRONG", the heading on the card she reads after two wrong tries, at 3.57:1; and the amber near-miss note, "Close, but check you are reading the scale", at 3.57:1 | the walkers, once the sampler was honest - and two of them by reading the files after the gates had gone quiet | each darkened past the point where its own rendering loss still clears the floor |
| F44 | **five controls had never fired, and three could not have.** One quoted a sentence its gate had stopped printing; one planted the legend fault while waiting for the exercise-card message; one deleted a CSS line the relight had already made redundant; one planted a script.js from before the v4 rebuild, which hung the walk at nought per cent and is why the confused battery had never once finished; and one duplicated a law another gate owns, with a plant that had to reach into a renderer it only passes through | running the batteries to completion for the first time | a control quotes the sentence its gate actually prints, plants ONE fault, plants it in TODAY's code, and lives in the gate that owns the law |
| F44a | and two harness faults that made controls lie: `control.js` restarts its port counter at 8300 every run and spawns its servers detached, so an interrupted battery leaves them behind - the next run's server failed to bind, the "is it up?" curl succeeded against the STALE one, and a walk tested a tree from hours earlier. It now steps over any port something is already answering on AND the sandbox carries a token the server must hand back. The other: `stage.js` and `sit-teacher.js` typed into the staff passcode box before it existed, which killed the FIRST teacher control of every battery |

## GATES THAT INVENTED A FAULT AND WERE NARROWED (L6)

Each keeps the correct thing it condemned as its permanent pass-control.

- qa-cache-scope read a variable NAME and condemned the whole-store key; then
  could not follow a key BUILDER and condemned the outbox.
- the colour law condemned the wordmark, the focus ring and the primary button
  for being gold — narrowed to its intent: gold is a fault on a reading
  surface, on a mark, or as a value.
- the colour law condemned empty grid cells for an inherited colour that paints
  no glyph.
- the consequence law condemned the marking feedback itself for making the
  chosen option look different — narrowed to before Check.
- FITS treated a column with no drawn edge as a card, and condemned every phone
  diagram for leaving a boundary that is not drawn anywhere.
- qa-build read only `moduleJs` and reported that qrcode.min.js was not inlined.
- qa-needs-you guessed a function signature; and matched "25" inside a date.
- the clock scanner read `15 * 60 * 1000` as three clocks.
- qa-audit refused a split filing that names its part, which the design allows.
- qa-support-gate looked for `>= 2` and missed the same gate written as `< 2`.

## THINGS THE RIG LEARNED THE HARD WAY

- **Screenshots and page.evaluate are fine; a long walk is not.** Walking a
  whole book in one page churns several hundred SVG mounts through one renderer
  and it takes the browser down. The walkers now use a fresh browser per book
  and a fresh document per exercise. It costs about 90 seconds per book per
  width and it is why the walk finishes.
- **A stale node process reports stale findings.** Node caches its requires at
  start, so a walker launched before an edit keeps testing the old code. Kill
  the old run before believing a new one.
- A backtick inside a template-literal comment silently ends the literal.
- **A walk that names its own states is not a walk.** Four of the eight faults
  above were invisible until `record()` started reading `data-state` instead of
  being told it. A harness that reports what it intended is a harness that
  agrees with itself.
- **A control sandbox has to keep the repo's shape.** Two gates read files from
  the repo root; a flat copy of the app folder made both of them fail for the
  wrong reason, and one of them had been failing that way in every run.
- The dock is rendered INSIDE the question root, so a query across "the
  question and the dock" returns every control twice.
- **Ask "can she see it?" before "is it disabled?"** A renderer is entitled to
  take a control away rather than grey it out, and this one does exactly that
  once a question is marked. Asking the questions the other way round reported
  seventeen marked questions as controls that would not act and would not say
  why.
- **Do not edit the app while a full run is walking it.** The sidecars a walk
  writes carry the content hash they were taken at, and at the full tier a
  stale sidecar counts as absent - so a fix committed mid-run invalidates the
  evidence that run had already gathered, and the coverage matrix reports
  thousands of cells nobody stood on. The run is a photograph; changing the
  subject halfway through gets you neither picture.
- **There is no requestAnimationFrame in a headless page.** Not a throttled
  one - none. Any promise that waits on a frame waits for ever, and the app
  code that does it is the code a walk can never get past.

## 6 SEPT 2026 — THE DEPLOY, AND WHY IT MOVED HOUSE

- FRONT DOOR cut on the old project as Version 27 (10:46). It served the page,
  but the relay never arrived: no `doPost` row beside the `apiCall` row. Cause
  (F33): the OAuth grant on the deployer's account dated from 18 June and had
  never carried `script.external_request`, so `UrlFetchApp.fetch` threw before
  it reached the network. The relay now sends the caller's bearer as well.
- Removing that stale grant put the consent screen back in front of us, and the
  consent screen read **"OLS Maths - Glass Jotter (Unverified)"** - a dead name
  on the first screen a pupil ever sees. The name is held on the OAuth client
  Apps Script minted in June; renaming the script does not touch it, and a
  reload proved it was not a cache.
- Damien's call: rebuild in a project whose consent screen is right. Taken the
  cheaper road to the same place - COPY THE SHEET. A copied spreadsheet brings
  its bound script with it as a NEW project with a NEW OAuth client, so the
  consent name is the new name, the script stays BOUND (no `openById`, no code
  change, no widening of `spreadsheets.currentonly` onto pupils), and the Sheet
  gets the rename it was owed anyway.
- NEW HOME: Sheet "OLS - MathShelf" `1xVDBKmPP83MMZPqpPJr0GQRR0N9estf9ebhKyhGQd0Y`
  (copied 6 Sept 2026 from `164nmiqGLLr2SktTuPnZy70KQZL9Us4CItMW5VnbCyMY`).
  The old Sheet and the old script project are to be retired, not deleted.

## 6 SEPT 2026, AFTERNOON — THE FOUR FAULTS HE FOUND BY LOOKING

He opened the deployed app and found, in one sitting: a markbook he could not
read, a chip sitting on a book's series line, a shell too dark to work in, a
cover asking him to type a name the app already knew, and a question that told
him the same thing twice. Twenty-six gates were green. Written up as F35-F39.

What went out in response:

- **the shell relit** to light (his ruling: *"B - lighter background, the other
  one looks terrible"*): `--board-0/1/2`, `--chalk`, `--chalk-muted`,
  `--gold-ink`, `--link` retuned, nine hardcoded `#fff` shell-text rules moved
  onto `var(--chalk)`, and seventeen light grounds in `style.css` given an ink
  of their own in the same rule as their ground.
- **the name kept**: `me.name = r.name || me.name || ''` — a name she saved
  wins, and nothing is not a name she saved (F38).
- **the chip put in the flow** beside the series, not floating over it (F37).
- **a line that is waiting says so**: `.is-waiting` breathes and carries a
  spinner, on all five call sites, and does neither under
  `prefers-reduced-motion`. His words: *"when it says things like 'Checking the
  passcode...' they should be pulsing to indicate something is happening"*.
- **the instruction given once**, beside the box it is about (F39).

And three laws that read the finished screen rather than its parts —
`readability`, `overlap`, `said-twice` — each with a control that plants his own
fault back, each a coverage RIDER, and each carrying a count of what it looked
at so a law that measures nothing cannot report green.

## WHAT WAS DONE TO THE OLD PROJECT (retired, not deleted)

`1otJG5454zR6a0WKZW23czKnehxtQ3Oj6CrrRWYys1H4bPxZOoaZ3qPmC`, renamed in the
editor to **"MathShelf - RETIRED 6 Sept 2026 - see the new project"** so two
projects cannot be confused for one another. All THREE of its live deployments
are ARCHIVED, so nothing can land on a MathShelf that writes to the old Sheet:

- the front door cut this morning (Version 27),
- the old main `/exec` (Version 26, `DATA - MathShelf v4`),
- the auto-name companion (Version 21) - the retirement the charter asked for.

The `autonameUrl` row is deleted from the new Sheet's Config tab; nothing reads
it any more.

## WHAT THE HARNESS COULD NOT DRIVE (said plainly, DFM 213)

The served page runs inside Apps Script's sandboxed iframe, and keystrokes sent
by the browser automation do not reach it: clicks land and focus moves, but the
staff passcode box stays empty. So the eight-item smoke list is still HIS to
run - the server chain is proved from the Executions log, the interface is not
proved from a driven keyboard. This is a limit of the driving surface, not a
finding about the app.

---

# HANDLING DATA — BOOKS C, A, B (started 8 September 2026)

The build of the GCSE Handling Data series onto the live MathShelf, from
`Claude Work/Maths/MATHS_STATS_DESIGN.md`, `MATHS_GATES_DESIGN.md` Part 8 and
`MATHS_STATS_OPUS_PROMPT_GATED.txt` (8 Sept revision). Book C first, then A,
then B; one deploy per book.

## Preconditions, verified 8 Sept 2026 before any change
- v4 IS live: `maths/mathshelf` on the tip `a237177`; HANDOVER.md "What is live"
  and `server/DEPLOY_LOG.md` carry the FRONT DOOR (Version 20, execute-as-User)
  and DATA (Version 19, execute-as-Me) rows from commit `c6f55e3`.
- Colette's sources present: twelve files plus `SOURCE_INVENTORY.md`.
- The gate system exists and `run.js --fast` is GREEN — 26 gates, 1.1 s.
  `content-fixture.js` correctly absent (plants.js writes it into the sandbox).
- Baseline `--full` and `--control` started in the background BEFORE any edit,
  so the photograph is of the unchanged tree.

## Work packages (TIME c) — by file ownership
| package | owner | files | state |
|---|---|---|---|
| ENGINE | this session | `statcore.js`, `dev/test-statcore.js` | GREEN — 154 selfTest cases, floor 80 |
| CHART | sonnet subagent | `statchart.js` | running |
| LINT | sonnet subagent | `dev/lint-content-stats.js` | running |
| SOURCES | sonnet subagent | `stats_sources/GRAPHICAL_READS.md` (outside the repo tree) | running |
| RENDER | this session | `jotter-stats.js` | in hand |
| CONTENT-C, WALK, SPEED, V4-STATES | queued behind the baseline battery | | |

## The baseline run, and what it is and is not worth (8 Sept 2026)

`run.js --fast` was GREEN on the unchanged tree (26 gates, 1.1 s) before a byte
was touched. `run.js --full` then ran for **35 minutes** (budget: 20) and ended
RED on two gates:

- **qa-repo-prod** — the seven files this build had created by then were
  uncommitted. That is mine, not the tree's.
- **qa-coverage** — 3,027 cells, every walker-ridden family reading `0 closed`.
  **This number is not the pre-existing red, and it is not a fault in the app.**
  All eighteen walker sidecars were declared STALE: `contentHash` (lib/hash.js)
  hashes EVERY `.js`/`.css`/`.html` in the app directory, and this session
  created `statcore.js`, `statchart.js` and `jotter-stats.js` while the walk was
  running — files nothing loads yet. Each new file moved the hash, so every
  sidecar written before it counted as absent. The walkers themselves were
  green: sit-pupil 868 checks, sit-confused 852, sit-teacher 94, zero failures.

Two things follow, and both are written down rather than absorbed:

1. **The rule "never edit the app while a full walk is running" includes ADDING
   a file the app does not load.** I read it as being about edits to what the
   page serves; the content hash does not. The authoritative baseline is the
   next `--full`, run on a quiescent tree.
2. **A harness finding for package SPEED:** one content hash over the whole app
   directory means any new file invalidates every sidecar of every book. Hashing
   per book (which SPEED's brief already asks for) also fixes this.

The baseline `--control` was started and then **killed deliberately**: it would
have been a photograph of a tree that was about to change under it, and the
control battery's own record (PROGRESS F-series, 7 Sept) already has all
fourteen controls green at this commit. The battery that counts is the one
before the deploy.

## Where Book C got to (8 September 2026)

Green under their own proofs, at HEAD:
- `node dev/test-statcore.js` — **156 cases**, floor raised from 80.
- `node dev/lint-content-stats.js` — PASS: 6 sections, 33 questions, 51 movie
  steps, 94 marks, every answer re-derived independently of the engine.
- `node dev/validate-all.js` — **81 questions**, model and corrupted attempt
  each through the live engine; floor raised from 48.
- `node tools/qa/run.js --fast` — green (the only red is the uncommitted tree
  between commits).
- In a real browser, at 375, 768 and 1280: all 33 questions mount across all
  eight kinds, each declaring its stages, each with a Check that says what it
  is waiting for, none showing the truth before Check, zero console errors; and
  all 33 re-draw read-only for the teacher (13 of 13 board kinds draw a board).
  A `qlist` question was driven end to end by hand — tray deranged, ordered,
  three cuts committed with their read-outs, the IQR keyed wrong, marked
  "Quartiles 3/3 · Interquartile range 0/1", first attempt struck and a fresh
  board offered.

Two engine limits the validator found, fixed rather than designed around:
1. **Two reads at two values in one question.** `markAtXAnswer` read a single
   top-level `S.answer`, so a second `atX` ask could never be marked. Reads and
   answers are now keyed `atX@<x>`, and the CF notes' "above 167 cm" and
   "below 153 cm" can both be asked.
2. **A box plot built from a curve** whose least and greatest are printed while
   its three cuts are read off the graph: `boxTruth` treated `given` as the
   whole truth and never fell through to the curve, so such a question could
   only ever be marked follow-through.

And one thing the design said would not be needed: **a book is not entirely
client-only.** `server/Code.gs.template` keeps `var ACTS` and refuses any other
act id (`bad-act`), so without its id the book could not save a mark, appear on
the Working Wall or be drilled into. `qa-store-scale` found it. The id is added,
every other two-book default in the server derives from `ACTS`, and the offline
stub is shaped the same way from `ACTIVITIES`. It means this deploy carries a
server change, so his eight-item live smoke list applies, not just the book's.

## The walk of Book C, and the twenty faults it found (8 September 2026)

Green at HEAD, each proved by running it:
- `dev/test-statcore.js` 156 cases · `dev/lint-content-stats.js` PASS ·
  `dev/validate-all.js` 81 of 81 · `run.js --fast` 26 gates.
- `sit-pupil` on Book C: **590 checks, 0 failed**, 538 states stood on, no
  console errors. `sit-confused`: 199 checks, 0 failed. `qa-two-attempts`,
  `qa-tray-order`, `qa-click-safety`, `qa-colour-law`, `qa-numpad`,
  `qa-build`, `qa-manifest`: green.

What the walk found that reading could not. Every one is fixed at the root and
every one would have met a class:
1. **No decimal point on the number pad.** The two questions whose answers are
   1.5 and 1.8 could not be answered at all, and tap-first means there is no
   other way in.
2. **A commit that never enabled.** A reading question's "That's my answer" was
   judged once when the dock was built and never again.
3. **The dock rebuilt itself under her hands** on every nudge, throwing away
   the pad she was typing into mid-number.
4. **A judge question had no reason bank**, so a claim called not fair could
   never be given one.
5. **A single press could put placed work back** - DFM 272 itself - because the
   clearing click was heard only on the question's own body.
6. **The struck first attempt was counted as work already placed**, so a second
   go could not be finished; and it took the presses her second go was made of.
7. **A tray could still come out in the answer order** when values repeat.
8. **Five box-plot labels sat on one another** on a phone.
9. **Feedback did not fit the kind**: a list question praised for its curve.
10. **A book is not client-only** (the server's ACTS list).
...and ten more of the same shape, each in its own commit message.

Two gates were also saying things that were not true and were fixed at the
rule, each re-planted with the fault it exists for: a card that SCROLLS is not
a card that spills; a hyphen inside an English word is not a minus sign; a
question that names people in a scenario is not naming the reader; a citation
is not prose.

## The harness, after package SPEED
`--fast` 1.19 s. `--full --book angles` **4:30 pooled against 21:48 serial**.
All-books `--full` 10-12 minutes (budget 20). `MS_WORKERS` defaults to 6;
`control.js --changed` exists and runs everything until PROGRESS carries a
`controls: green <date> <commit>` line. Detail in `tools/qa/HARNESS_SPEED_PASS.md`.

## Notes to whoever picks this up
- `node dev/test-statcore.js` is the engine's own proof and takes under a second.
- The engine's unit table (`UNITS` / `unitsOf`) is the ONE home of band, weight
  and `ftEarns` per marking unit; the selfTest pins every one of them (UT1–UT9).
