# MATHSHELF — THE HUMAN PACE INVENTORY

DFM 269: **a time budget measures the machine, never the pupil.** Every clock in
the client and in the server template owes a row here saying what it bounds and
why a slow child cannot trip it. `qa-human-pace.js` reads this file in both
directions: a clock with no row fails, and a row for a clock that no longer
exists fails, because a record that has drifted from the code is read and
believed.

The key is the address: `file :: nearest function :: value`.

| clock | what it bounds, and why a slow child cannot trip it |
|---|---|
| `script.js :: bootCover :: 600` | The window in which three presses on the crest count as the teacher's discreet way in. It bounds a gesture nobody is asked to make, not work — a pupil who presses the crest once and stops loses nothing. |
| `script.js :: fin :: 620` | The cover's page-turn before the shelf appears. It is the animation's own length; the shelf is already built when it starts, so a slow machine shows the shelf late, never wrong. |
| `script.js :: apply :: 150` | Legacy auto-name probe: the pause after the hidden frame loads before the name is asked for. Bounds a network round trip, not a person. RETIRED with the companion in P3. |
| `script.js :: apply :: 2500` | Legacy auto-name probe: the fallback that asks for the name anyway if the frame never loads. Bounds a network round trip. RETIRED with the companion in P3. |
| `script.js :: apply :: 4000` | Legacy auto-name probe: when the hidden frame is removed from the page. Housekeeping. RETIRED with the companion in P3. |
| `script.js :: scheduleSave :: 1500` | The shortest gap between two saves — it stops a burst of presses becoming a burst of requests. She is never waiting on it: her work is on screen the instant she does it, and the save follows. |
| `script.js :: scheduleSave :: 10000` | The longest her work sits unsent while she is still working. It bounds the server's load, not her thinking: nothing expires, nothing is marked late, and the outbox keeps the attempt until the server acknowledges it. |
| `jotter.js :: drawMark :: 400` | The longest a tick or cross takes to draw at pen speed. It is a drawing, not a deadline. |
| `jotter.js :: flashMsg :: 2600` | How long a short message stays on screen before it clears itself. Nothing is lost when it goes: the state it described is still on the page. |
| `jotter.js :: flashMsg :: 5000` | The same, for a longer message that needs more reading time. |
| `jotter.js :: confirmStepAdded :: 1300` | How long a newly committed line stays highlighted so the eye can find it. Decoration on work that is already saved. |
| `jotter.js :: runCheck :: 90` | The pause between two marks being drawn, so they read as a sequence rather than a flash. Zero under reduced motion. |
| `jotter.js :: runCheck :: 600` | The pause before a structured question re-opens for the second attempt, so the strike-through on the first is seen before the board is fresh. It delays the app, not her. |
| `staff.js :: load :: 20000` | How often the markbook asks the server what the class has done. It is a teacher's screen refreshing itself; a pupil's work is never lost by arriving between two polls. |
| `staff.js :: alertBar :: 3500` | How long a confirmation stays on the teacher's screen. The thing it confirms has already happened. |
| `player.js :: paperWrite :: 40` | The extra frame after a line is written before the next step, so two steps never overlap. |
| `player.js :: paperGrid :: 340` | How long one cell of a multiplication grid takes to appear. Film timing. |
| `player.js :: paperBalance :: 720` | How long the balance beam takes to tip. Film timing. |
| `player.js :: doStamp :: 240` | How long a stamp takes to land. Zero when the film is rebuilt instantly (a goto, or reduced motion). |
| `player.js :: doNote :: 340` | How long a note takes to appear beside the working. Film timing. |
| `player.js :: applyOp :: 900` | How long the sweep highlight stays on the line an operation just changed. Decoration. |
| `server/Code.gs.template :: apiSave :: 15000` | How long a save waits for the script lock before giving up, so two pupils saving at once cannot corrupt a row. It bounds contention between machines. A pupil who waits sees the busy state and the outbox keeps her attempt. |
| `server/Code.gs.template :: apiSetName :: 15000` | The same lock wait, for writing a pupil's name. |
| `server/Code.gs.template :: adminAddClass_ :: 15000` | The same lock wait, for adding a class. A teacher's action, with its own busy card. |
| `server/Code.gs.template :: adminDeleteClass_ :: 20000` | The same lock wait, longer because a delete rewrites more rows. A teacher's action, with its own busy card. |
| `server/Code.gs.template :: adminSetActs_ :: 15000` | The same lock wait, for ticking or unticking a book. |
| `server/Code.gs.template :: adminOverride_ :: 15000` | The same lock wait, for inking a verdict. |
| `server/Code.gs.template :: adminNudge_ :: 15000` | The same lock wait, for sending a pupil to a method film. |
