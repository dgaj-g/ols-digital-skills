<!-- Generated 2026-06-23 by the gj-redesign-vision workflow (16 agents). A vision proposal for review — NOT yet implemented. -->

# The Glass Jotter — Redesign Proposal

## 0. CURRENT STATE - read this first (added 25 Jun 2026, after the auto-name + UX work shipped)

This proposal was written 23 Jun 2026; a lot has shipped since. The v2 redesign must BUILD ON the LIVE app
(not the bare git source) and PRESERVE everything below. Live now: **MAIN deployment Version 22 (execute-as-ME),
COMPANION Version 21 (execute-as-USER)**. Apps Script project `1otJG5454zR6a0WKZW23czKnehxtQ3Oj6CrrRWYys1H4bPxZOoaZ3qPmC`,
bound Sheet `164nmiqGLLr2SktTuPnZy70KQZL9Us4CItMW5VnbCyMY`, staff passcode `0lsMaths26*`, classes 10A-26 / 10B-26.
Main /exec = `AKfycbwSIyls...PAoE6hA`; companion /exec = `AKfycbzCrtb4...PkiEAz` (Config row `autonameUrl` points at it).

**ALREADY DONE - PRESERVE, do NOT redo or regress:**
- **AUTO-NAME (the most fragile - its live code is NOT in git).** Pupils auto-get their real full name via a
  popup-FREE full-page `target="_top"` consent flow (companion `?probe=1&ret=<classlink>` bounce) + a shared
  ScriptProperties bridge + an `apiHello` ScriptProperties fallback (`nameFromSp` flag) + an auto-open on return
  (about 2 taps first time, 1 tap forever after). FULL implementation, exact code, and deploy facts are in the
  memory note `project_maths_glass_jotter.md`. Server (`autoName_`, `autoNameProbe_(e)` with the target=_top
  bounce, `apiAutoName`, `apiHello` SP-fallback, `apiSetName`) and the client cover-handler logic MUST carry over
  verbatim. Manifest `webapp.executeAs = USER_DEPLOYING`; MAIN stays execute-as-ME (pupil ~45KB states live in the
  owner's private Sheet); COMPANION stays execute-as-USER. The redesign is client-only EXCEPT this Code.gs, which
  stays as-is. NEVER use `location.href`/`location.replace` for the consent nav (it white-screens) - only a
  user-tapped `target="_top"` anchor works for this bound script.
- **Phase 1 translation (DONE, live):** M/A -> Working/Answer everywhere; AMBER -> "Answer only - no working";
  plain-English CSV status; "line" -> "step". **WALT is KEPT** (the dept uses WALT with pupils - do NOT change it
  to "In this exercise" as Section 4 suggests). The Working-Wall permanent legend is in.
- **Phase 2 concrete bugs (DONE, live):** correct = GREEN tick/tally (never red); protractor reading-aid lights
  BOTH flanking tens; `[1 mark]` enlarged; faded text darkened; PVQ shows P/Q labels; the method-leak placeholder
  `e.g. 180-38` neutralised to `e.g. 65`; confirmation flashes for jotter-step / nudge / self-eval.
- **Phase 3 on-ramp (DONE, live):** teacher orientation line; split "N need support" / "N ready for stretch"
  tiles; nudge reworded "Send the worked example for Ex N"; AMBER-aware Marking-Pile empty state; locked-book
  padlock; the "both sides" prompt gated to solve/form.
- Per-teacher scoping; the markbook (Working Wall / Jotter Page / Marking Pile / Sweep / CSV / Class Insights);
  the 12 method movies; the draggable protractor + reading aid; phone optimisation; the FAIR-COPY identity; the
  marking engine (mathcore/anglecore, 48/48). KEEP all of it (matches Section 6 "KEEP").

**STILL TO BUILD = the actual v2 work (all client-only per Section 7):**
- **Section 5 STRUCTURAL LAWS (none shipped yet):** the closed colour-token set + `.mark` base-class enforcement
  + neutral debug-tint; the three-slot in-view feedback law; typography discipline (`.staff-tally` in Courier,
  the `.ui-msg` -> `.msg-info`/`.msg-validation`/`.msg-status` split); the `body.gj p { margin:0 }` cascade-layers
  trap kill + `<p>`->`<div>` sweep. HIGH value, near-zero risk - kills the clunky/red-on-correct/off-screen class.
- **Section 3 DEATH OF THE OVERRIDE:** the 3-button panel is STILL live (it was only reworded "Use the automatic
  mark" + a why-line, NOT replaced). Delete it; build pencil/ink tap-at-the-mark; the "worth a look" advisory fold;
  the once-only posture line; flick-through prev/next pupil with one-ahead pre-fetch; the composed plain-English
  per-pupil read; the promoted intent-named "Show them this method again ->".
- **Section 4 PUPIL DOCK:** two-zone Page/Dock; behaviour-based keypad trimmed per type; line-first algebra with
  optional inline annotation; angles bottom-sheet with section-ordered reasons; "Mark my working" commit with
  results scrolled into view; tap-card self-eval. (Pilot algebra first; test the bottom-sheet on a real Chromebook.)

**CRITICAL CONTENT ISSUE (the trigger for v2):** a substitution WORKED EXAMPLE renders `6 + b = 6 + 7 = 13`
while the given values are `a=4, b=7, c=3` - the `6` has no origin in the givens (it should almost certainly be
`a + b = 4 + 7 = 11`). A wrong/confusing worked example makes pupils fail every question after it. **EVERY worked
example AND question in `content-algebra.js` and `content-angles.js` must be independently re-derived AND
re-verified against the teacher (Mary's) ORIGINAL submission** - GitHub issues #24 (Angles) + #25 (Algebra) in
`dgaj-g/ols-digital-skills` (`gh issue view`). Honour Mary's intent; fix transcription errors; invent nothing.

**SOURCE-vs-LIVE DIVERGENCE (must reconcile):** the live Apps Script editor holds uncommitted edits (the entire
auto-name target=_top flow, the execute-as fix, the manifest) that are NOT on the branch. Capture the live
editor's `Code.gs` + `Index.html` as the true baseline before rebuilding (or re-derive auto-name from
`project_maths_glass_jotter.md`). After the v2 build, COMMIT everything to `draft/issue-24-25-maths-m2-revision`
so the repo is once again a faithful copy of production.

## 1. What's not right (the diagnosis)

The build is not broken — it is *mis-cast*. The Glass Jotter was written in examiner voice and given an algorithm's posture, and you are feeling both before you can name either. Every label speaks mark-scheme dialect ("M 2/2 · A 1/1", "AMBER", "WALT", "Ex 3 · Q1"), so the product reads as *built for someone else*. And the marking model puts the machine first: the engine rules, then asks you to approve or appeal its ruling on every question of every pupil — a three-button committee meeting rendered four hundred times for one class. That inverts your actual role. You are the marker. The app should be doing a quiet first pass in pencil, ready for your red pen — not convening a tribunal you must chair.

Underneath that sits a third, quieter wound: the app has no *system*. Colours don't each mean one thing (a correct answer is literally boxed in red), feedback lands wherever the DOM drops it (often off the bottom of a Chromebook), and one grey paragraph style does four different jobs. With no rules, every screen is hand-tuned and every fix spawns a workaround — and that improvised quality is exactly what the eye reads as "clunky." None of this is a functionality failure. It is voice, posture, and the absence of a few load-bearing laws. That is good news: it is cheap to fix and it is the *whole* complaint.

## 2. The north star

**A page and a pen — for both sides of the glass.** The pupil writes line by line in a beautiful book, and the mark always lands where their eye already is. The teacher opens a pile of jotters already sorted by who needs her, reads a child in thirty seconds, and inks her judgement with a single tap — never auditing an algorithm, always marking a book. The app speaks her language and the pupil's, never the examiner's. Everything ambitious about the tool — the movies, the line-by-line marking, the misconception clustering — stays; we remove the scaffolding the soul never needed, so the power can finally be *felt* as the gift it is.

## 3. The teacher experience (and the death of the override)

### The flow, stripped to the job

**Passcode → the Board.** Two interactions and she is looking at her class. If she owns one class it loads directly; several, and a slim class-switcher sits in the header. The classes table — tickboxes, copy-link, QR, delete — is *administration*, not marking; it moves into a quiet **"Set up" cog** in the corner. A teacher arriving to mark never meets it.

### The Board (the Working Wall, made legible)

The Wall is the right shape of information; we make it speak.

- **The legend is a permanent strip, never a hover tooltip** — projected on a smartboard it must be readable, and the current `title`-attribute detail is dead on touch. One always-on line, in *her* words: `✓ got it · ◐ answer only — no working · ✗ slipped · ● working now · — not started`.
- **One orienting sentence:** *"Spot the crosses. Tap a cell to open that pupil's jotter."*
- **Column headers carry the question in plain English** — `Ex 5 · Q2` keeps its reference as a faint superscript, but the header reads `Z-angles` or `Solve 2x + 6 = 14`. (The labels already live in the content pack; the Wall joins to them client-side by question id. Crucially this re-derives at render time from the *existing* summary, so it works retroactively on a class that finished last week — not only on future saves.)
- **The bottom totals row is sticky** and names the dominant slip per column in plain English ("6 pupils: divided before subtracting"). That single row *is* your "where is the class stuck" insight, in context, before you open a single book.
- **The four tools stop competing with the grid.** Insights, Pile, Sweep and CSV are the *outcomes* of marking, not four equal workstations. They drop below a quiet divider — *"When you're done marking —"* — each with one line saying what it's for. The heavy ones (Pile, Sweep, CSV) warn "this reads every book — a few seconds" before the wait, so you choose it knowingly.

### The death of the override — and what replaces it

This is the heart of your complaint, and the answer is decisive: **the three-button override panel is deleted entirely.** No explanatory paragraph on every question, no "do you agree with the computer?", no four hundred committee meetings per class.

In its place, the governing reframe — **the app marks in pencil; you mark in pen.** This is not decoration; it is the literal model. The engine's auto-marks render as *provisional pencil*: a subtle dotted affordance in the jotter margin, visibly a first pass. Your mark is *ink*: full-weight, in your colour. Most pages you simply turn — agreeing with a pencil mark costs you nothing, exactly as it does with a real book. When you disagree, you act on the mark itself.

**The gesture — settled.** The visions split between a tri-state tap-cycle and an inline pair; every critique landed on the same verdict, so we take it: **tapping an auto-mark opens a small two-target ink control anchored right at the mark — `✓ mine` / `✗ mine`, with a quiet "use the app's mark" beneath.** One tap to open, one to choose. This keeps the spatial win (the control appears *at the mark*, not in a panel you scroll to) while giving you: a single tap to mark *either* way (no double-tap-through-a-false-green to reach "wrong"); a labelled, accessible target with a real keyboard path; a fat-finger-safe size on a smartboard; and — vitally — **a place for a "couldn't save" message to land** if the network hiccups. An inked mark gets a faint hand-drawn ring so you can see at a glance which marks are yours. One reassurance, shown *once* at the top of the page, carries the whole posture: ***"These are the app's first-pass marks. Tap any to make it yours — your mark always wins."***

**Send your eye to what needs it.** A cheaper override is good; *less* override is the real prize. The engine already knows where it was unsure — an `err` line with no recognised misconception code, an answer-only AMBER, a follow-through chain. Those marks get a **folded-corner "worth a look"** on the cell. The honest correction every critique demanded: this must *also* catch the engine's *over*-confidence (a confident but wrong diagnosis on a valid unrecognised route — the very case the override exists for), so the flag is "AMBER + unmatched-wrong + anything this pupil would normally get right but didn't." The fold is *advisory, never a gate* — every cell stays tappable. But it turns 450 identical decisions into ~30 flagged ones, and moves you from QA-ing every cell to judging the few that need a human.

### Flick through the pile, don't navigate a system

The single biggest friction today is `Wall → cell → Jotter → Back → reselect → Jotter → Back`. We restore the physical gesture: **‹ prev pupil · next pupil ›** on the Jotter Page, with the roster the Board already holds in memory. Two reading axes, with an **always-visible label** so you never lose your bearings: enter from a *cell* and you flick **one question across the class** (this *is* Same-Question Sweep, now free — labelled "Q7 across the class"); enter from a *pupil's name* and you flick **one pupil through their book** (labelled "Aoife's book"). The next jotter is **pre-fetched while you read the current one** — each open is a real network fetch of several seconds, and pre-fetching one-ahead is the difference between "delightful" and "waiting." The 20-second Wall poll suspends while you flick.

### Teaching moves, not adjudication

The Jotter Page makes the *pupil* the subject. A header sentence the app composes in plain English — ***"Aoife's method is sound, but she's slipping on arithmetic — three answer slips with correct working"*** — is the gift a paper jotter can't give (the method-vs-answer split you already compute, finally interpreted, not left as raw tiles). And the one genuinely pedagogical action gets promoted from a buried, mechanism-named fourth button to a standing, intent-named one: ***"Show them this method again →"***. We keep it **per-question** (a jotter spans several sections and movies are section-level, so a single header button is ambiguous about *which* exercise) — just renamed to intent and styled as the warm, primary teaching move it is. Its confirmation lands *beside* it, not off the right edge.

## 4. The pupil experience

### One surface, pen always ready

The pupil's question becomes **two fixed zones**: *the Page* (squared paper, the given line in pencil, every committed line in the margin) and *the Dock* (one writing line with the number pad, pinned to the bottom, always in view). You can always see what you're writing and the keys at once — the "typing blind" fault is designed out.

**The keypad, settled on your approved behaviour:** show a compact, context-right number pad by default, and **hide it the instant a real keystroke arrives** from a physical keyboard — so a Chromebook typist is never fighting an on-screen pad, and a touch pupil always has one. This also retires the "dead keys" sin: a protractor reading shows digits only, not `+ − ( )`. The Dock **degrades gracefully per question type** — a single numeric field for the protractor, nothing for tap-a-card Classify, the full pad for algebra. No question type inherits machinery it doesn't need.

### Writing a line, in one place (not one "motion")

We collapse the algebra cycle — today `pick chip → mini-operand → Done → write line → Done`, five interactions with two identical Done buttons — but we are honest that the win is **locality, not fewer decisions**. The new flow: **the line is primary, the move is an annotation.** The pupil types the result (`2x = 8`) on the always-there line. A faint margin tag offers the operation; tapping it reveals the relevant moves and, for a `−`/`÷`/`×`/`+`, an inline amount field *attached to the tag* — no second composer, no second Done, no focus-hop. The amount **locks when the line composer takes focus**, so a late edit can't desync the annotation from the line (the teacher's margin stays trustworthy). And it is **optional**: write the line, commit, and it still marks — the tag just stays blank (the engine already tolerates this). For the common case the app even pre-highlights the inferred move (`2x + 6 = 14 → 2x = 8` is "−6"); one tap confirms. A "Substitute" and a "Form the equation" chip join the strip so those steps stop masquerading as blank rewrites.

**Angles** keep their soul — tap an arc, it pulses — but the full-height step-card becomes a **bottom-sheet that rises over the lower third while the diagram stays visible above it**. Value field directly above the keys; reasons **ordered by section** (the relevant group first and pre-expanded, the rest under "more rules ▾" — nothing hidden, CCEA authenticity intact, but a J3 pupil in S2 sees the two she needs, not eleven). Tappable arcs get a faint "open" stroke so she can *see* what's hers to work out. (Sizing on an 11" landscape Chromebook is the one thing to test on real hardware before sign-off; it falls back to today's inline card if sticky support is shaky.)

### The Check moment — the payoff, brought home

This is where delight lives, and today it falls off the bottom of the screen.

- **One explicit, plain-language commit across every question type — "Mark my working"** (not the gesture-y "box it" — a learned gesture fragments the model and risks marking an unfinished line). The beloved answer-box draw-on is the *reward that plays after a correct mark*, not the submit mechanism.
- **The result scrolls itself into view** and the marks stroke down the margin at pen speed — green tick for right, red cross for wrong, **never the reverse** — beside the lines, which are now in view.
- **The tally speaks pupil-English, full size, in the hand voice:** ***"Your working earns 2 marks. Your answer earns 1 mark."*** Not "M 2/2."
- **AMBER explained once, where it happens, at full size:** ***"Right answer! To earn the working marks too, show each step next time."*** Constructive, never punitive.
- **The progress instrument moves the instant the last mark lands** — the protractor needle sweeps, the beam levels — so the pupil *feels* they earned it.

### The rhythm of a section

Movie first (it earns trust), then the questions. "WALT" becomes *"In this exercise you'll learn to…"*. All questions stay on the page (scrolling the jot is the metaphor) — we do **not** ship the half-measure soft-dim that stops no one and adds grey noise; if focus is wanted later it's an opt-in one-question reveal. The struck-through first attempt collapses to a tappable *"my first try ▾"* so attempt two isn't buried under six crossed-out lines. The self-eval note's native keyboard — the one place the custom-keypad world breaks — becomes **tap cards** (*"What tripped you? brackets · minus signs · which rule · something else"*).

## 5. The aesthetic + feedback system (so this never bites again)

The fix is to make the bad states **structurally impossible**, not patched once.

### (a) Colour semantics — a closed set, each colour one meaning

The root cause is that "correct green" was a hardcoded hex in four places (no token) while `--marking-red` leaked into ten non-marking spots. We close the set and **enforce it by structure**: the three verdict colours resolve *only* through a required modifier on a `.mark` base class that carries no colour of its own — so a forgotten verdict renders a **neutral debug tint that appears nowhere else** (not grey, which is already everywhere), making the bug *visible* instead of a red lie.

| Token | Value | Means — and only this | Never |
|---|---|---|---|
| `--marking-green` *(new token)* | `#1F7A33` | a **correct** mark on the jotter surface | UI confirmations (use `--stretch-sage`) |
| `--marking-red` | `#C8102E` | a **wrong** step/answer on the jotter surface | box-draw, shelf scores, ledger chrome, nav ticks, starter text, summary tally |
| `--amber-flag` | `#B07D10` | **answer-only — no working** outcome | help/nudge prose |
| `--foil` | `#E4B824` | brand prestige + progress instruments + the **correct-answer celebration box** | any *wrong/right verdict* signalling |
| `--ink` | `#14213A` | the human's own written maths | — |
| `--pencil` | `#474D57` | muted UI: instruction, placeholder, pre-verdict validation, the app's *provisional* pencil mark | any settled outcome |
| `--support-rose` *(new, pushed toward mauve so it can't read as red)* | pastoral "needs a word" | marking | |
| `--stretch-sage` *(new)* | `#2F8F6B` | pastoral "stretch" + positive UI flash | marking |

One rule a developer can't misread: ***if it is not a mark on the jotter, it may not be marking-red, marking-green or amber.*** This single rule fixes the two named wounds — the **correct answer is boxed in gold celebration, never red**, and the **staff tally gets its outcome modifier** so a correct pupil can never read red in your view. (We resolve the one internal tension the critiques caught: gold is allowed to celebrate a *correct, finished* answer — it is the prestige/reward colour, distinct from the green verdict tick beside it, and that is stated explicitly so it isn't a leak.)

### (b) The feedback-placement law — three slots, always in view

No feedback is ever a free node dropped at a body position. Every message renders into exactly one of three named, in-view-by-construction slots — and the **layout adapts so this holds in portrait too** (a true margin rail in landscape; inline-beside-the-line with a sticky bottom bar in portrait, so we never spend the horizontal budget the phone can't afford):

| Slot | Where | Carries |
|---|---|---|
| **Beside the line** | the margin, next to the line it judges | the per-line verdict glyph |
| **Sticky foot** | pinned to the viewport bottom of the page | the running tally + the one comment |
| **Compose strip** | fixed directly above the keys | validation errors + "step added" flashes |

Validation, glued above the keys, *physically cannot* scroll off. Post-Check results scroll into view. Validation appears **adjacent to the field that's wrong, above or beside — never below it** (fixing the angles message that currently points upward at its own field). The override confirmation is a **block below its action**, never a flex-child shoved off the right edge. When the angles bottom-sheet is up, it **dismisses on Check** so the margin marks animate into the now-visible space — feedback is never hidden behind our own UI.

### (c) Typography — four voices, one job each

The disciplined four-font system stays; we stop one class doing four jobs. Fraunces = structural headings; STIX Two Text = the human's own maths; Courier Prime = the institution's voice (labels, chips, *the teacher's controls and data*); Caveat = the marking hand. The rule that ends the staff/pupil bleed: **Caveat is the pupil-facing teacher-hand only; the staff markbook's own tallies use Courier** (a `.staff-tally` class) — your data isn't simulated handwriting of your own marks. The overloaded `.ui-msg` splits into `.msg-info` / `.msg-validation` (amber left-rule — *needs action*, **not** red; the pupil isn't wrong) / `.msg-status` (italic). Heading sizes move to `--sq` grid multiples so display-to-body contrast holds at the smartboard breakpoint.

### (d) The architectural fix that kills the trap forever

`body.gj p { margin: 0 }` silently zeroes single-class paragraph margins and has already spawned eight workarounds. We end it at the root with **cascade layers** (`@layer reset` for the rule, `@layer components` for everything else — layers beat specificity, so component rules win with no scoping tricks; fine for the C2k Chrome/Safari baseline), and as belt-and-braces **every feedback element becomes a `<div>`** (no UA margin, untouchable by the rule). The eight workarounds get deleted; a written note at the rule warns any future paragraph. The trap cannot bite again.

## 6. What we keep, re-engineer, and remove

**KEEP — the soul (the jot), untouched:** the fair-copy book identity (buckram, gold "FAIR COPY", spine shadow, 5mm grid, rose margin); the page-turn and shelf; the **method movies** (`player.js` — pen-speed writing, stamp overshoot, the damped `--ease-needle` beam, scrubbable step-back) — irreplaceable IP; the **marking engine** (`mathcore.js`/`anglecore.js` — canonical equality, the prerequisite DAG, dx codes, clustering); the pen-speed tick animation; the **answer-box draw-on** (only recoloured to celebration gold); the motion law (written, drawn, stamped, turned — never faded or slid); the demo class with real NI Irish names through the real engine; and the name. The margin-mark override *deepens* the metaphor — inking over pencil is more "jotter" than three buttons ever were.

**RE-ENGINEER:** the override → pencil/ink, one tap at the mark; the Jotter Page → flick-through pile with prev/next and a plain-English pupil read; the algebra input → line-first with optional inline annotation; the angles step-card → bottom-sheet with section-ordered reasons; the keypad → behaviour-based show/hide, trimmed per type; the Check feedback → in-view, plain-English, correctly coloured; the Wall → permanent legend, plain-English headers, sticky totals.

**REMOVE:** the three-button override panel and its per-question paragraph; examiner dialect everywhere (M/A, AMBER, WALT, raw Ex·Q); the four-tool row competing with the grid; dead keypad keys; the native-keyboard self-eval note; the `--marking-red` leaks; the eight specificity workarounds. (Class Insights as a *separate screen* is **not** removed — the analysis-first teacher who wants "where's my class stuck" before reading books keeps a read-only summary; its richest data simply also lives on the Board's sticky totals.)

## 7. How we get there (phased, low-risk)

Every phase below is **client-only** (`Index.html`: `jotter.js`, `staff.js`, `script.js`, `style.css`) — no Code.gs, no Sheet schema, no coordinated re-deploy, no offline-stub break on the server side. Each phase ships independently and is felt immediately.

**Phase 1 — The translation pass + the aesthetic laws (highest delight-per-effort).** The colour-semantics table with the new `--marking-green`/`--stretch-sage`/`--support-rose` tokens and the `.mark` base-class enforcement; the boxed-answer recolour; the staff-tally modifier fix; the cascade-layer trap kill + `<p>`→`<div>` sweep; the three-slot placement law with `scrollIntoView` on Check and sticky validation; the full examiner→teacher/pupil dialect pass; the permanent Wall legend and plain-English headers. *Felt:* "this was built for me, and the marks are finally the right colour in the right place." Nearly zero risk, closes every named wound.

**Phase 2 — The death of the override + flick-through marking.** Pencil/ink at the mark, the two-target ink control with its confirmation slot, the "worth a look" fold, the once-only posture line, prev/next pupil with one-ahead pre-fetch and poll suspension, the promoted intent-named nudge, the composed per-pupil read sentence. *Felt:* "I'm marking a pile of books with a red pen, not chairing a tribunal." This is the change that flips "not right" to "delightful."

**Phase 3 — The pupil Dock + input collapse.** The two-zone Page/Dock, behaviour-based keypad, line-first algebra with optional inline annotation, the angles bottom-sheet, the tap-card self-eval. *Felt:* "writing in a book, not operating a form." Ship algebra first, pilot with one class, then angles — and test the bottom-sheet on a real C2k Chromebook before sign-off.

**Deferred, heavy-deploy (only if proven wanted):** a batched `adminBulkOverride_` server sub for "mark all of Q3 right" in one lock-pass (client-only sequential calls risk partial failure under live-class lock contention, so bulk override waits for the safe server version); free-text per-pupil comments to pupils. Both require Code.gs *and* an offline-stub mirror — kept deliberately off the critical path.

## 8. The honest forks

**Fork A — How far to push "send my eye to what needs it."** *Recommendation: ship the advisory fold in Phase 2.* The pencil/ink reframe alone fixes the posture; the fold is what moves you from "faster QA" to "I look only where the machine was unsure." It's the difference between a better pen and a genuinely lighter job. The only reason to defer is if you'd rather see the bare pencil/ink first and judge whether you even miss it — a legitimate, conservative call.

**Fork B — The pupil input model: collapse now, or wait.** *Recommendation: do it, but in Phase 3 and piloted.* The line-first algebra collapse is the core of "too cumbersome for students," but it's the most novel interaction here and the one most worth watching real pupils use. If your "too cumbersome" verdict is really about the *angles* step-card more than algebra, say so and we lead Phase 3 with the bottom-sheet instead.

**Fork C — Conservative-surgical vs. the fuller Dock.** *Recommendation: Phases 1 and 2 are the surgical, must-do core — they recover your trust at near-zero risk. Phase 3 (the full Dock) is the ambitious reach.* If you want to feel the difference before committing to the bigger pupil rebuild, ship 1+2, live with them for a fortnight, and decide on 3 from a position of confidence rather than now.

**Fork D — The override gesture's discoverability.** *Recommendation: ship the two-target ink control with the dotted-pencil affordance and the once-only header line.* If a quick look with you (or one colleague) shows the tappable mark isn't obvious on the smartboard, the fallback is a small, always-visible `✓ / ✗` pen-pair sitting *beside* every flagged mark — still no panel, still one tap, just more literal. Your eye on a real projected board is the right judge here.

---

Relevant files (all under `/tmp/gj-wt/maths/glass-jotter/`): the staff flow and override live in `staff.js`; the pupil engine, keypad and Check feedback in `jotter.js`; the boot/shell/microcopy in `script.js`; the colour tokens, the `body.gj p` trap and all placement rules in `style.css`; the tappable-arc affordance in `player.js`. The engine (`mathcore.js`, `anglecore.js`), the movies (`player.js` motion), the content (`content-angles.js`, `content-algebra.js`) and the server (`server/Code.gs`) are not opened by the core proposal.