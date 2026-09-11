# MATHSHELF — THE FEEDBACK MASTER

Every ruling Damien has made about this platform, numbered, dated, in his words
where they exist. One rule, one number, one home (DFM 144). `qa-audit.js` proves
that every number here appears in exactly one status section of
`MATHS_GATES_AUDIT.md` — a rule with no enforcement home is a rule that will be
broken again (DFM 195b).

**The standing laws** the gates are BUILT under (how a gate is written, not what
it checks) are L1–L30 of `MATHS_GATES_DESIGN.md` Part 1, each citing its DFM
number. They are not renumbered here; a gate cites `L7` and means that.

---

## The maths platform's own rulings

1. **The examiner voice is dead.** (22–23 Jun 2026) `M/A` → "Working / Answer";
   `AMBER` → "Answer only — no working shown"; "line 3" → "step 3"; `Ex1.Q1` →
   "Ex 1 · Q1"; no "the mark scheme wants it", no "what the examiner pays for".
2. **WALT stays.** (his revert, `f89ab77`) The department's own heading is what
   pupils already know.
3. **`6 + b = 6 + 7 = 13` is verbatim MEP and is never "fixed".** (25 Jun 2026)
   The audit of 78 algebra + 72 angles items found zero maths errors; the
   trigger was a false alarm. Content is verbatim.
4. **Correct ticks are green; the colour law is closed; the debug sentinel
   exists.** (23–25 Jun 2026) Marking colours mark and nothing else; a forgotten
   verdict must render magenta (a bug, not a lie).
5. **The protractor reading aid lights BOTH flanking tens; its numbers stay at
   10px.** (23 Jun 2026)
6. **The keyboard is foolproof.** (23 Jun 2026) Tap-first, no click-to-focus, a
   real keydown hides the pad, the result slot fills as she presses.
7. **The dock is in-flow, never viewport-sticky.** (25 Jun 2026) On a Chromebook
   a pinned pad covers the board she is working on.
8. **"Want to see how?" is earned at two wrong attempts, leads with her own
   slip, and a teacher nudge force-reveals it.** (22–23 Jun 2026)
9. **Feedback fits the kind.** (23 Jun 2026) "A fair copy" is banned; no praise
   for "working" on a question she answered by pressing one control.
10. **A nudge names the question it is about.** (25 Jun 2026)
11. **An exercise opens at the top.** (25 Jun 2026)
12. **Self-eval chips are per exercise, never the generic fallback where the
    exercise has its own.** (25 Jun 2026)
13. **Pencil/ink is per QUESTION, has three actions, and survives a flick.**
    (25–28 Jun 2026) ✓ mine · ✗ mine · use the app's mark.
14. **The name flow is the KS3 DT platform's; "Is this you?" is dead.**
    (27 Aug 2026) The full real name on the FIRST visit or it has failed.
15. **MathShelf, spelled so** (capital M, capital S, no s on Math), **no tagline
    anywhere**, and the dead names — MathShelf, Longhand, Squared,
    DigiMaths — appear in no string. (27–28 Aug 2026)
16. **The blackboard after dark**: a dark shell, light paper wherever anyone
    reads or writes, copper is ink and never a status, gold only celebrates.
    (27 Aug 2026) "Bland and boring" is a failing verdict, not a style note.
17. **The per-class tickboxes ARE the level system**; covers carry an audience
    band; a new book arrives unticked everywhere. (27 Aug 2026)
18. **One reading age — eleven or twelve — for every book.** (DFM 256, applied
    5 Sept 2026) Voice may be a notch more grown-up on the GCSE shelf; the
    sentences may not be harder.
19. **Device-neutral verbs: the room is mixed.** (5 Sept 2026) Chromebooks,
    iPads, phones, a smartboard. Never a bare "tap" or "click" as THE gesture —
    say what to DO; "tap or click" when a gesture must be named.
20. **Placed work survives a single press; removing it takes the house
    two-press, a drag away, or a labelled control.** (DFM 272, applied 5 Sept)
21. **Every tray is a derangement of the ANSWER order.** (DFM 258, applied
    5 Sept 2026) The printed order is often already the sorted order.
22. **A failed save is never silent — the outbox.** (5 Sept 2026) The attempt is
    kept until the server acknowledges it, and a reload replays it.
23. **Every pupil- and teacher-facing sentence lives in a content pack or in
    `strings.js`.** (5 Sept 2026) A sentence hardcoded on a render path is a
    sentence no gate reads.
24. **The DOM contract.** (5 Sept 2026) Every screen declares itself, so
    coverage can be derived instead of typed. Nothing visible changes.
25. **The manifest landmine order.** (24 Jun, 8 Aug, 18 Aug 2026) The deploy
    dialog lies: read the manifest. Both artefacts come from ONE build. The push
    comes before the version cut. The deploy log is the memory.
26. **The live smoke list after any server change.** (DFM 234b) His eyes, eight
    lines, recorded in `server/DEPLOY_LOG.md`.
27. **Author nothing without a source.** (5 Sept 2026) Colette's conventions
    govern the Handling Data books; a question that cannot say where it came
    from was invented.
28. **One period per book — 26 interaction units of Core.** (5 Sept 2026)
29. **Two named fictions and no others:** the `rule` she slides and the `tray`
    she takes from, each with one plain-words line where she first meets it
    (DFM 57). Nothing else on any surface is named in a design word.
30. **Approvals are never re-opened.** (DFM 273a) The Angles and Algebra content
    is approved and live; a finding on it is REPORTED and waits for his word.
31. **A colour means one thing, and the law reads the colour from the token.**
    (8 Sept 2026, applied by this build) `--amber-flag` was darkened on 7 Sept
    and `lib/audits.js` went on policing the old hex, so the answer-only colour
    was watched by nothing; worse, `--gold-ink` was the SAME hex, so the
    wordmark wore the colour that means "answer only". `--gold-ink` moved to a
    dark gold that is not a marking colour (measured 5.73:1 on the shell at
    375, 768 and 1280) and the marking set is now read off the running
    document's tokens.
32. **A book is not entirely client-only.** (8 Sept 2026, found by
    `qa-store-scale`) The server keeps `var ACTS` and refuses any other act id,
    so a new book needs its id there before it can save a mark, reach the
    Working Wall or be drilled into. That one line is the whole server change,
    and every other two-book default in the server and in the offline stub is
    now derived from it.
33. **A gate that reports a fault that is not one is fixed at the rule, and
    proved to still bite afterwards.** (8 Sept 2026) A hyphen inside an English
    word is not a minus sign; a question that names people in a scenario is not
    naming the reader; a citation is not prose. Each narrowing carries its
    reason where the rule is, and each was re-planted with the fault it exists
    for and seen to fail.

34. **Every waiting line moves, everywhere, including the markbook.** (9 and
    11 Sept 2026) "'Checking the passcode…' is still not pulsing on the staff
    login screen (although 'Getting your details' works for the pupil side)."
    A breath the eye cannot see is not a breath: prove it in rendered frames.
35. **A saving message is pronounced, not a whisper.** (11 Sept 2026) "'Saving
    Handling Data for test12…' is better, but it needs to be in a more
    pronounced font." The gold wait card is the affordance for every save.
36. **A book that is not ticked does not appear on the pupil's shelf at all.**
    (11 Sept 2026) "I want any book that isn't ticked on the staff side not to
    appear on the student side at all, only those that are ticked." The locked
    spine with "Not set yet" is retired; an empty shelf keeps its one line.
37. **A tick reacts at once.** (11 Sept 2026) "Ticking and unticking takes quite
    a long time to react." The box flips immediately and the card says it is
    saving; the server round trip is reported in seconds, and what is Google's
    is said to be Google's.
38. **A film is paced for reading.** (11 Sept 2026) "It travels too quickly from
    step to step when the play button is pressed." Dwell after each step's
    drawing: at least 1.2 s and 0.35 s a word.
39. **A film draws what its caption says.** (11 Sept 2026) "When you say to ring
    the 4th value and then ring the second value, it would be good to see a wee
    animation of it being ringed." A `ring` on a written list draws a copper
    ring around that value, at pen speed. "The gold border at the end encroaches
    on the text": a box is measured from the text it boxes, never guessed.
40. **Every question shows its stages, and which one she is on.** (11 Sept 2026)
    "I think it would be really helpful if I could see the clear stages and
    which stage I'm working on, and that the text could pulse or colour or
    animate to indicate the next stage or the next thing I'm supposed to do."
41. **Instructions say what to do, in full, before the control that does it.**
    (11 Sept 2026) "We are asked to choose the lowest value first, but it isn't
    completely clear that we are supposed to keep clicking to put them in
    order." "'That's my median' is hard to comprehend without first being told
    that I'm supposed to click the one that I think is the median." "'Join the
    points' should be more pronounced." "Strengthen instruction throughout, add
    more colour and animation so that it is really clear what the user is
    supposed to do."
42. **The control she needs next is within reach.** (11 Sept 2026) "There is a
    huge amount to scroll on the graph in Exercise 3 before I can join the
    dots." The action for the current stage sits directly under the board.

