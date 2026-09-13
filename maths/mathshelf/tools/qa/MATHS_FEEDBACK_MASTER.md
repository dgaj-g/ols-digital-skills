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
43. **A wide board can be moved sideways by touch, on a phone.** (12 Sept
    2026, his second live test, iPhone) "the graph can't be scrolled on a
    phone, at least I'm not finding a way to do it." `touch-action: none` on
    the whole SVG blocked every pan, so the last point of Exercise 3 (25, 100)
    could not be placed at all. A swipe on empty grid pans the frame; a tap
    places; a drag that starts ON a point, a rule handle or a marker moves it
    (touch-action none on the hit targets only). The board reclaims the phone
    gutter first, and says "Swipe the graph sideways" in its own line while
    width is hidden.
44. **An axis number never crosses its axis line.** (12 Sept 2026) "the x
    axis values overlap the line." The baseline sat a fixed 16 units below the
    axis while the counter-scaled font grew to 27; at phone scale the digits'
    tops were 2 px above the line in Chrome and on the line in Safari. The
    number's box is measured (getBBox) and sits at least 3 CSS px clear.
45. **The stage instruction stays, names the next act exactly, and its
    control looks like a button.** (12 Sept 2026) "I find it hard to
    understand what I'm supposed to do in this question." His screenshot shows
    "You have all the points you need — move one instead." where the stage
    line should be: a passing note never replaces the stage line (it gets its
    own line under it). The plotting instruction names the next point ("Next:
    across 5, up 18"); the current stage's control is a filled copper button,
    not an underlined link (ruling 41's "should be more pronounced", still
    owed).
46. **The passcode wait is the pupil's own waiting line.** (12 Sept 2026)
    "this is still not working. I want it to flash like the 'getting your
    details' message with the animated circle to the left on the student
    side, not gold." The `is-waiting` line with its spinning circle, not the
    gold card. (Ruling 34's breath was proved in frames and he still could not
    see it: motion he can name beats motion a gate can measure.)
47. **"Saving changes…"** (12 Sept 2026) "shouldn't it say 'Saving Changes'
    instead, to make more sense?" The tick's gold card reads "Saving changes…".
48. **A pupil's save is quiet until it is genuinely late.** (12 Sept 2026 —
    the steward's reading of his two screenshots, not his words; stands unless
    he strikes it) Both screenshots carry "Still saving your work… Try again".
    The card came at 8 s while the Executions log shows his 19:05 saves taking
    12–40 s and every one completing; "Try again" during a save in flight
    sends it twice. A quiet moving "Saving…" line while in flight; the card
    after 30 s or a refused call; Try again only when nothing is in flight.
49. **A tick the store answered late is re-read, never reverted by guess.**
    (12 Sept 2026) "tried unticking algebra … saw the saving pulsing gold
    message, but it went on for ages and then I saw [the slow-store
    sentence]." The Executions log: his untick's doPost Completed in 5.7 s;
    the front door's answer came back 36 s later as relay-failed; the screen
    put the tick back on while the pupils' shelf had lost the book. After a
    relay failure the row asks the store what it holds and shows that.
50. **A film draws every step it says.** (12 Sept 2026) "the video in
    exercise [4] moves through the steps but doesn't actually show anything
    on the squared grid until step 8." Audited the same evening: five of the
    six Book C films use ops the player cannot draw — Ex 2 `table`/`tcell`/
    `stamp`, Ex 3 `table`/`chart`/`plot`/`curve` (nothing at all is drawn),
    Ex 4 `chart`/`curve`/`rule`/`drop`, Ex 5 `scale`/`marker`, Ex 6 `stamp`;
    only Ex 1's film draws every step. The film-draws law counted `ring` and
    `box` alone. Every op named in a film is drawn, and the law counts every
    op kind, with a plant per kind.
51. **The store answers in seconds, not minutes.** (12 Sept 2026) "there is
    something wrong with the amount of time it takes to talk to the server,
    or the place where things are loaded from or saved to, no matter what I
    do … this issue needs to be addressed with the save and load times,
    urgently." The Executions log that day: `doPost` (the Sheet write)
    1.4–6.7 s every time; `apiCall` (the front door's round trip) 3–68 s,
    giving up at about a minute. The two suspects, to be MEASURED before
    anything is changed: `apiCall` fetches Google's userinfo endpoint on every
    call (`userEmail_`) before it even reaches the store, and the reply from
    the anonymous DATA web app comes back through a redirect. The pupil's
    "Still saving…" card must clear itself when a retry lands; Try again is
    never the only way out.
    _Measured, then cut (12 Sept 2026, evening). The userinfo suspect was a
    misreading: `userEmail_` is 1 ms. The hop ITSELF is the cost — Apps
    Script calling Apps Script measured 3–68 s, the same POST from a browser
    2.1–2.5 s — so THE STORE CUT has the page call the DATA web app directly
    with a signed store token (`BOOT.store`; HMAC over `email|exp`, eight
    hours), the relay kept as the fallback and its bearer removed (it made
    two probes in three come back 404). Held by qa-two-homes and qa-waits;
    the live before/after numbers are in `server/DEPLOY_LOG.md`. His verdict
    on the live site, 12 Sept 2026, 20:4x: "This is FAR better. far more
    responsive and far quicker to load and save."_
    _13 Sept 2026, his first morning on Books A and B, on a real pupil
    account: "it took a very long time again before it let me tap 'open your
    books'"; "i had to wait approx 54 seconds while 'getting your details'
    flashed"; "opening the actual markbook took about 40 seconds"; "the still
    saving thing a few times"; "I thought you fixed this? it isn't fixed
    here." MEASURED before anything was changed: the front door's Executions
    log carried an `apiCall` (the relay) for almost every call he made,
    4.4–22.7 s each; the store's own log showed a save re-sent every 20 s
    for over twenty minutes, each Completed in 4–9 s. The steward's probe
    from outside Google (eight rounds, the page's own token): the POST
    answers in 1.1–3.5 s; then, one round in eight (two in three at 12:0x),
    the answer host waits ~15 s and 302s BACK to the script's own URL as a
    GET — an HTML page, never the store's JSON (the "doGet Failed" rows in
    the DATA log are those bounces). The store had done the work; the page
    threw the answer away as "not the store", took the relay, and for a save
    began the 20 s re-send loop. THE ECHO BOUNCE IS GOOGLE'S; what is ours
    is treating it as a closed road. Client cut (13 Sept): an answer that is
    not the store's JSON is sent again on the direct road, up to twice,
    before the relay (`STORE_RESENDS`; qa-waits laws 5–6, control
    `store-no-resend`). Server side, for Opus: the relay's own UrlFetch meets
    the same bounce and must re-send once too; the DATA project answers a
    GET with JSON, not a failure; and every call still reads the WHOLE data
    tab under one script lock — the 4–9 s a save costs while the tab grows,
    which no transport fix touches._

52. **Every book is named with its volume, everywhere a teacher meets it.**
    (13 Sept 2026, his first look at Book B's set-up) "there is no way of
    distinguishing between the data handling books." The set-up tickboxes,
    the markbook's book tabs and the tick messages printed the shared title
    "Handling Data" for all three copper books. A book whose title another
    book shares is named "Title · Volume" (`GJ.app.bookName`), derived from
    ACTIVITIES, never remembered per book.
53. **A row's controls are laid out the same way in every row, and no
    control wraps.** (13 Sept 2026) "the links on the right of each class are
    quite untidy looking in terms of layout." The class table's What-you-can-do
    cell was 113 px wide, so "Open the markbook" and "Copy link" broke onto
    two lines and the four buttons stacked raggedly. Two lines per row, the
    same in every row; a control is one line or it is not a button; on a
    small screen the class table scrolls inside its own frame and says so,
    never the page (measured: 1,242 px of page on a 768 px screen).
54. **A screen is called on the screen what the instructions call it.**
    (13 Sept 2026) "you say open set up for one s1 class, but I don't see set
    up written anywhere." The class table called itself "All classes" / "Your
    classes" while the class page's button, its crumb and two messages called
    it Set-up. It is Set-up everywhere.
55. **The film speaks to her.** (13 Sept 2026, Book B, Exercise 1's film)
    "the text under the rhyme at the end should say 'Your own…' instead of
    'Her own…'. That was a silly mistake." A caption never refers to the
    author in the third person. His wording "Your own rhyme for keeping the
    four apart." was a verbless fragment on the separated read (13 Sept), so
    the caption reads "Here is a rhyme to help you keep the four apart." —
    a sentence, to her, true to the red note being written.
