# THE HUMAN-PACE INVENTORY — J13(e), from DFM 269

**Why this file exists.** On 27 August 2026 he sat J2 Lesson 3 and lost most of an hour to a
`TimeLimitError`. The cause was one number: `PyRun.DEFAULT_LIMIT_MS = 5000`, handed to Skulpt
once, with the interpreter's clock never reset while the program stood **suspended at
`input()`**. So the five-second budget was being spent on a twelve-year-old reading a question,
thinking, and typing — and every conversation answered at human speed died at whatever input
line it was standing on. His three screenshots are three CORRECT programs, killed at lines 1,
2 and 3.

It survived every gate because **every walker, probe and preview partner answers in
milliseconds**. The unanswered case was proved. The runaway case was proved. Nothing had ever
answered SLOWLY.

DFM 269's second half is the law that comes out of it: *any budget, timeout or threshold that a
pupil's ordinary human pace can trip is tested AT HUMAN PACE before it ships.* A law about one
constant is not much use, so **every** time constant in `engines.js` and `app.js` is listed
here with what it bounds and why it is safe at the pace a real child works.

`qa-human-pace.js` finds them (it does not read this list to know what to look for) and fails
the pack when one has no row — and fails it in the other direction too, when a row describes a
constant that no longer exists, so the file cannot rot into fiction.

**The key is `file :: nearest named function :: value`**, not a line number: line numbers move
the first time somebody adds a comment, and an inventory that goes stale on day one is an
inventory nobody keeps.

---

## THE ONE THAT COST HIM AN HOUR

| key | what it bounds | why it is safe at human pace |
|---|---|---|
| `engines.js :: PyRun :: 5000` | Skulpt's `execLimit`: the ceiling on one stretch of a pupil's PROGRAM actually running. | **It no longer includes her.** `PyRun.start`'s `inputfun` sets `Sk.execStart = Date.now()` as each answer resolves, so the clock measures execution between waits and never the wait itself. Proved by running it (qa-pyrun §8): two inputs answered after 6.5 s and 2.5 s complete with exact stdout; `while True: pass` still dies at ~5.0 s; a 10,000-line loop still finishes. A real runaway never resolves an input, so nothing ever resets its clock. |

## THE OTHER BUDGETS AND TIMEOUTS

| key | what it bounds | why it is safe at human pace |
|---|---|---|
| `engines.js :: s :: 30000` | How long the Skulpt library may take to arrive before the run is abandoned with an honest message. | Bounds a NETWORK fetch, never a pupil. Thirty seconds is generous on a C2k line, and the failure is a sentence in the console plus a live RUN button, not a dead screen. |
| `engines.js :: sendMark :: 8000` | When a marked answer that has not come back says "still checking" and offers the way out again. | Bounds the SERVER, not her. Marking is local and instant since DFM 97; this is the wifi-blip fallback, and eight seconds is long past the ~1–2 s Apps Script round trip (DFM 51). It never blocks: it adds words and a way on. |
| `engines.js :: backstop :: 30000` | The safety net that reveals a film's follow-on note if `ended` never fires. | A backstop, not a gate: the real length replaces the guess the moment it is known, and the note it reveals only ever ADDS a control. A pupil who watches a longer film is not cut off; she simply gets the note at 30 s and keeps watching. |
| `app.js :: end :: 15000` | The same backstop on the shell's own film overlay. | Same shape: it reveals the way on. Nothing is taken away at 15 s. |
| `app.js :: end :: 2500` | How long after a film is paused before the overlay treats it as finished. | Only fires when the video is ALREADY paused, so it cannot interrupt watching. |
| `app.js :: beatN :: 30000` | The presence heartbeat that tells the class she is still here. | Writes a timestamp; nothing about her work depends on it, and a missed beat costs a stale "live" count on a teacher's screen, never a lost answer. |

## THE POLL WINDOWS — how often the app asks the server for news

Every one of these bounds a WAIT FOR ANOTHER PERSON, and none of them ends anything. The
longest any of them can add is one interval of delay before a partner's arrival shows.

| key | what it bounds | why it is safe at human pace |
|---|---|---|
| `engines.js :: poll :: 2500` | Pairing: how often the Vault gate asks whether a partner has arrived. | She sees the waiting state the whole time (DFM 100), and the arrival is announced when it lands. |
| `engines.js :: poll :: 2000` | The same poll once she is in the waiting queue. | As above. |
| `engines.js :: end :: 2000` | The pair channel's own loop — messages, turns, presence. | His "moments after" wording is written to this pace and he approved it (DFM 75/93). |
| `engines.js :: tick :: 2500` | The Chatbot Swap's poll for the partner's card. | She is told she is waiting, and Fred is on screen while she waits (K36b). |
| `engines.js :: sealed :: 5000` | The Rally/reveal poll after she has sent her scores. | The counter moves as the class arrives; the reveal is the teacher's trigger, not a timer (DFM 190e). |
| `engines.js :: poll :: 4000` | Press Night's gallery feed. | New work appears within four seconds; nothing she does depends on the refresh. |

## THE ANSWER-ACKNOWLEDGEMENT PAUSES

| key | what it bounds | why it is safe at human pace |
|---|---|---|
| `engines.js :: ord :: 400` | The pause after a baseline answer is logged, before the next question. | It only ever DELAYS the next screen; it can never arrive before she has answered. It exists to stop a double-press landing on the next question (DFM 82/104). |
| `engines.js :: ord :: 650` | The same pause on the neutral (unmarked) path, where "Logged" is shown first. | Long enough to read one word, short enough not to feel stuck. |
| `engines.js :: v :: 900` | The stagger between the lines of a steps card as they appear. | The way on is capped independently (see `p :: 700` below), so she is never held by the animation. |
| `engines.js :: v :: 550` | The same stagger on the shorter variant. | As above. |
| `engines.js :: p :: 900` | The briefing card's line-by-line reveal. | Capped: the Continue button appears after four lines' worth at most, so an eleven-line card never holds her (DFM 42/205, the V58 fix). |
| `engines.js :: p :: 700` | How long after the demo starts the Continue button appears. | It ARRIVES with the demo rather than after it, which is the fix; the transcript keeps playing behind her. |
| `engines.js :: p :: 1100` | The oath card's line stagger. | Signing is gated on her press, never on the animation. |

## THE PURELY COSMETIC ONES — a class removed after an animation

None of these gates anything. Each removes a CSS class once its transition has finished; if the
timer never fired, the only consequence is a highlight that stays on screen.

| key | what it bounds | why it is safe at human pace |
|---|---|---|
| `engines.js :: btn :: 250` | Removing a badge pop after its fade. | Cosmetic; the pop's own button is what advances. |
| `engines.js :: pop :: 250` | The same, on the second pop path. | Cosmetic. |
| `engines.js :: GHOST_MS :: 350` | How long a drag ghost's fade lasts. | Cosmetic; the drop has already happened. |
| `engines.js :: snapBack :: 300` | Clearing the snap-back class on a rejected pair. | Cosmetic. |
| `engines.js :: who :: 500` | Clearing the "accept" flash on a Vault folder. | Cosmetic. |
| `engines.js :: who :: 450` | Clearing the "reject" flash. | Cosmetic. |
| `engines.js :: who :: 700` | Clearing the "returned" class on a file that went back. | Cosmetic. |
| `engines.js :: finishStage :: 700` | The beat before the Vault debrief card. | A screen change she is not waiting on; nothing is refused meanwhile. |
| `engines.js :: startHold :: 800` | The press-and-hold that signs the oath. | A deliberate act, and it is HER finger that holds it: the timer measures the press, not her thinking. Releasing early simply does not sign. |
| `engines.js :: c :: 550` | The beat before the unplugged card is replaced. | Cosmetic. |
| `engines.js :: c :: 650` | The beat before the case board is redrawn. | Cosmetic. |
| `engines.js :: pyNode :: 520` | Clearing the picked state after a wrong pair bounces. | Cosmetic; the desk is live again immediately after. |
| `engines.js :: pyNode :: 560` | Clearing the bounce class on the block. | Cosmetic. |
| `engines.js :: wait :: 400` | The beat before a Match round's reveal is drawn. | She has already committed; nothing can be entered during it. |
| `engines.js :: p :: 1000` | Clearing the "flash" on the case-log box. | Cosmetic. |
| `engines.js :: left :: 1500` | How long the case-closed toast stays up. | A toast; the board behind it is live. |
| `engines.js :: short :: 1000` | Clearing the flash on the studio note box. | Cosmetic. |
| `engines.js :: short :: 700` | The beat before the studio desk is redrawn after shipping. | Cosmetic. |
| `engines.js :: tries :: 900` | The stagger on the ship animation. | Cosmetic. |
| `engines.js :: bad :: 1000` | Clearing the flash on a wrong Rally score. | Cosmetic. |
| `engines.js :: kc :: 600` | The beat before the kit desk is redrawn. | Cosmetic. |
| `app.js :: r :: 200` | Redrawing the starfield after a resize. | Cosmetic. |
| `app.js :: end :: 450` | Removing the film overlay after its fade. | Cosmetic. |
| `app.js :: area :: 350` | The shell's own ghost fade. | Cosmetic. |
| `app.js :: close :: 250` | Removing a modal after its fade. | Cosmetic. |
| `app.js :: cls :: 250` | The same, on the class picker. | Cosmetic. |
| `app.js :: ov :: 250` | The same, on the confirm overlay. | Cosmetic. |
| `app.js :: go :: 1200` | The stagger on the hub's tile entrance. | Cosmetic; the tiles are clickable as they land. |
