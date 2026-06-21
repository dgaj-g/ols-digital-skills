# Glass Jotter — Analytics PHASE 2 — build design

Status: **DESIGN, grounded in code** (21 Jun 2026). Phase 1 is LIVE (v7). This is the build spec for
Phase 2 = ANALYTICS_DESIGN.md §8 "Phase 2" + §3b + §5. Two slices:
(A) **Deep per-step failure analytics** (teacher, read-only) and (B) **Support unlock** (pupil pull +
teacher nudge). Hard rules carried from P1: working is weighted as much as the answer; reuse Mary's
content (author NO new maths); build artefacts pure ASCII (`node server/build-pathb.js`, never hand-edit
`Code.gs`/`Index.html`); deploy a NEW VERSION of the same `/exec`; commit+push each chunk.

---

## 0. Grounding (verified against the real code, 21 Jun 2026)

- **`fullStates()`** (staff.js ~810) → `Promise<[{email,name,state}]>`, sequential per-pupil `jotter`
  fetch. Already used by Marking Pile / Sweep / CSV. This is the heavy tier — fetch once, mark in memory.
- **`markState(actId,state,q)`** (staff.js 305) → `{st, verdict:{perLine|perStep,res,mk,mkMax}, errAt,
  dx, cluster, rec, last}`. Override-aware (`rec.ovr.q` 1/0 wins). **`cluster`** = the pupil's OWN
  offending line, pretty-printed (algebra: `pretty(L[firstBad].t)`; angles: `∠ANG = val°`; protractor:
  `measured X° (true Y°)`). **`dx`** = first misconception code. `DX_NAMES` (staff.js 344) maps code→label.
- **Class Insights** = `renderInsights(host,pupils)` (staff.js 442), driven by the cheap wall summary
  ONLY (cell `{st,errAt,dx,mk,t,at,a1,ovr}`). The "where the class is struggling" rows are HTML strings
  with **no click handler** (built ~473–505, injected at 505). ← drill-down hook.
- **Marking engines** return per-line/step arrays. Aggregation traps (RESPECTED below):
  positional line index is unreliable (variable lengths; valid alternate routes; `form` vs `solve`
  shift line meaning) → group failures by **`cluster` text**, never index. `ok:2`/`val:2` =
  follow-through, NOT a break (only `ok:0` / `val:0||rsn:0` is). AMBER and "unread line" are their own
  buckets. Method vs accuracy already split in `mk:[method,acc]`.
- **Movies are section-level** (`sec.movie`), auto-mounted at section top via `GJ_PLAYER.mount(host,
  movie,opts)` (player.js 236), renders inline into any host. No per-question help exists today.
- **Pupil flow:** `renderSection(i)` (script.js 795); question loop ~828–839 mounts `GJ_JOTTER.mount(
  holder,q,rec,{onSave})`. `onSave` writes `state.qs[qid]`, `scheduleSave()`. Pupil load at ~707 sets
  `current.state` from `call('load',{act})` → `{state,summary,updated}` strings.
- **Teacher→pupil write precedent** = `adminOverride_` (Code.gs.template 413) via `sub:'override'`,
  guarded by `guardClass_`. It mutates pupil State JSON in the Data sheet (col 6) + mirrors a flag into
  Summary (col 5). **Clobber trap:** `apiSave` (216) full-row-overwrites State on the pupil's next save,
  so a nudge stored in pupil State would be destroyed. → store the nudge in the **Config tab**
  (`getConfig_`/`setConfig_`, 130–147) keyed `nudge:<class>:<act>:<email>` (same pattern as `name:<email>`),
  spliced into `apiLoad`'s return. Survives saves, no new Sheet column.
- **Offline parity:** `offlineCall('admin',p)` switch in script.js (~333) mirrors every server sub;
  `apiLoad`/`apiSave` mirrored in the offline store. Any new `nudge` sub + load field must be mirrored
  (P1's live-only bugs were all offline-parity gaps — mirror exactly).

---

## A. Deep per-step failure analytics  (teacher, read-only, full-state tier)

**Goal (beyond P1):** P1's Insights shows, per question, wrong-count + dominant `dx` + a histogram of the
first-error *line index* (`errAt`) — cheap, but a line *index* is coarse and (per the traps) not
semantically comparable across pupils. Phase 2 names the **EXACT working step the class breaks on**:
the actual wrong line many pupils wrote, semantically grouped, with its misconception and a
follow-through-recovery read — all honouring method vs accuracy.

**UX home:** a **drill-down** from each "where the class is struggling" question row in Class Insights.
The row gains a `▸` affordance (and `data-qid`); a delegated click on the rows container expands an
inline **Step Breakdown** panel under that row (accordion; one open at a time). First open triggers the
heavy `fullStates()` fetch with a gold "Reading every pupil's working…" busy card (reuse the Pile's busy
pattern); results cache on `view` for the session so re-opening is instant.

**Compute (per drilled question Q):** `fullStates()` once → for each pupil with a *finished* record,
`markState(actId, state, Q)`. Then:
1. **Outcome mix** (honours working): first-try correct / correct-on-retry / **AMBER (answer-only, no
   method)** / not-yet. From `st` + `rec.att` (a1-equivalent) + override. AMBER is its own bar — never
   folded into "wrong".
2. **The exact breaking step** — the headline. For every `err` pupil take `markState.cluster` (their own
   first failing line) + `dx`; **group identical/equivalent clusters** and rank. Renders as:
   "**7 pupils slipped here: `5x = 32`** — *Divided before subtracting* (DIV_BEFORE_SUB)". Several such
   rows, worst-first. This is the deliverable: the real wrong working line, class-wide, not a line index.
   (Unread-line `note` hits are bucketed separately as "illegible/unparsed", not a misconception.)
3. **Follow-through recovery** (honours working): of the `err` pupils, how many still earned the
   **accuracy** mark by carrying their slip through correctly (`mk[1] > 0` or final-line correct despite
   an earlier `ok:2` chain). "3 of 7 recovered by follow-through." Rewards resilient working.
4. **Method vs accuracy** for Q class-wide: avg method `mk[0]/mkMax[0]` and avg accuracy `mk[1]/mkMax[1]`
   (split bars). Shows whether the class loses METHOD (process) or ACCURACY (arithmetic) marks here.

**Why it's safe & honest:** groups by `cluster` (semantic), not index; treats follow-through as recovery
not failure; AMBER/illegible as their own buckets; splits method vs accuracy everywhere. Adds NO content.
Read-only. Heavy fetch is opt-in (only when a teacher drills a row), cached per session.

*(Marking Pile stays the cross-question dx-cluster view; the drill-down is the per-question step view.
Insights can deep-link "see the working" to the Pile/Sweep as today.)*

---

## B. Support unlock  (content-safe — reuse existing movies/aids, author NO maths)

### B1. Pupil-pullable "Want to see how? ▸" (client-only)
Per question in `renderSection`'s loop (after `GJ_JOTTER.mount`), append a collapsible
**"Want to see how? ▸"** strip (closed by default; pupil-pulled, never auto-shown unless nudged — see
B2). On pull it mounts the **section's own method movie** (`sec.movie`) inline in a host right under that
question via `GJ_PLAYER.mount(host, sec.movie, {accent})`. Movies are section-level worked examples of the
*method* (not the specific question's numbers) → genuinely "how", never the answer → consequence-safe.
For sections with no `sec.movie` (verify per pack), the strip is omitted (no empty affordance). The pull
is recorded lightly in state (`state.help[qid]=ts`) so the teacher can see who self-served support — a
positive signal, not punitive; rides existing save plumbing, tens of bytes.

### B2. Teacher "nudge support to this pupil" (needs Code.gs)
From the flag board / Jotter Page, a **"Nudge support ▸"** action on a pupil sends a gentle prompt the
pupil sees on next open. Persistence avoids the clobber trap by using the **Config tab**, not pupil State:
- New admin sub **`nudge`** → `adminNudge_(req,ctx)`: `guardClass_` first (ownership), then
  `setConfig_('nudge:'+class+':'+act+':'+email, JSON.stringify({by, sec?, ts}))`. Mirror in offline stub.
- **`apiLoad`** splices `nudge: getConfig_(key)` into its return (one extra read). Pupil client, on load,
  if a nudge is present, **auto-expands the "Want to see how?" strip** for the nudged section with a
  gentle line ("Your teacher suggests watching this — give it a try"). One-shot: cleared on read
  (`setConfig_(key,'')` inside `apiLoad`) so it shows once.
- Teacher-side: the nudge button shows a confirm + a "nudged" tick; no pupil answer is altered (unlike
  override). Content-safe (surfaces existing movie), advisory, not punitive.

**Deploy note:** B1 + slice A are **client-only** (Index.html). B2 changes **Code.gs** (new sub +
apiLoad) → the deploy must update BOTH Code.gs and Index.html in the editor (heavier than v7's
Index-only). Build A + B1 first (client-only checkpoint, deployable alone), then B2.

---

## Build order (each = commit + push; checkpoint memory)
1. **Slice A** — drill-down Step Breakdown in Class Insights (staff.js + style.css). Client-only.
2. **Slice B1** — pupil "Want to see how?" per-question movie pull (script.js + style.css + light state).
   Client-only. (A + B1 can deploy together as one client-only version.)
3. **Slice B2** — teacher nudge (Code.gs.template `adminNudge_` + apiLoad; staff.js button; script.js
   load-surface + offline stub). Then rebuild artefacts, full verify suite, adversarial review, preview
   verify, deploy Code.gs + Index.html as a new version.

## Verify (every slice)
`node --check` each edited JS · `node dev/validate-all.js` (48/48) · `node dev/test-server-scoping.js`
(20/20) · `node server/build-pathb.js` (pure ASCII) · offline preview (port 8099, demo class, seeded
self-evals) screenshots before deploy. Adversarial review (ultracode) the full diff before deploy.

## Two UX decisions for Damien (confirm before building)
1. **"Want to see how?" availability** — always-pullable on every question (worked-example effect; movie
   shows method not answer) [recommended], or only unlock after a wrong/AMBER attempt on that question
   (stricter genuine-consequence)?
2. **Teacher nudge depth** — full nudge (Config-tab persistence, Code.gs change, pupil sees it next open)
   [matches the brief], or defer the nudge and ship pupil self-pull only this round (keeps Phase 2
   client-only, faster/lower-risk deploy; nudge becomes a tiny follow-up)?
