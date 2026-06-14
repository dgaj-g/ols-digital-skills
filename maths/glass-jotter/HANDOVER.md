# The Glass Jotter — session handover

**What it is:** an extensible, login-gated Maths M2 revision platform for OLS (J3 / CCEA M2),
built from inbox issues #24 (Angles) + #25 (Algebra). Pupils solve **line by line** in a
digital exercise book; the engine marks like a CCEA examiner; teachers get a live markbook
(Working Wall / Jotter Page drill-down with override / Marking Pile / Same-Question Sweep).
Read `DESIGN.md` and `INTERFACES.md` for the full design + module contracts. Add a new topic
via `ADDING_A_TOPIC.md` (manifest-driven).

## Status (14 Jun 2026) — COMPLETE, on draft PR #22, NOT merged, NOT deployed
Branch `draft/issue-24-25-maths-m2-revision`, repo `dgaj-g/ols-digital-skills`. Everything is
committed + pushed. Latest work, in order:
1. Full platform: shell (login → class shelf → activities), Path B server + assembler,
   two activities (Angles, Algebra), 12 animated method movies, teacher markbook.
2. Angles **draggable protractor** measure questions (Ex.1 m1/m2): drag onto vertex, rotate
   with a knob at EITHER end, read the dual scale, type the size. Genuine fail state;
   "read the wrong scale" (180−v) caught.
3. Protractor **reading aid**: when seated on the vertex, the numbers each arm crosses pop
   into focus (both scales, navy + halo) with a gold marker at the exact crossing — aids
   reading without revealing the answer (pops both scales, only when correctly placed).
4. **Phone optimisation** of the angle DIAGRAMS (were unreadable on mobile): `renderDiagram`
   in `player.js` now auto-fits the viewBox to the figure (getBBox), counter-scales labels
   to a constant ~13px on-screen size (`data-basesize` + ResizeObserver), widens arc tap
   targets (42u hit band), `svg width:100%`; phone CSS lets `.jq-diagram`/`.prot-wrap`
   reclaim the margin gutter. Algebra verified fine on phone (text/HTML UI, already
   responsive — no diagram fixes needed there).

## ⚠️ Branch / worktree gotcha (READ THIS to resume)
The main repo working tree `~/Sites/ols-digital-skills` is being shared by other concurrent
build sessions and may be on a DIFFERENT branch (e.g. a chemistry build) with their
uncommitted work — DO NOT clobber it. This work was done in an **isolated git worktree at
`/tmp/gj-wt`** checked out to the maths branch. To resume:
- If `/tmp/gj-wt` still exists: `cd /tmp/gj-wt/maths/glass-jotter` and work there. Preview is
  the `gj-wt` launch config on **port 8099** (`http://localhost:8099/maths/glass-jotter/`).
- If `/tmp/gj-wt` is gone (e.g. after reboot): recreate it —
  `git -C ~/Sites/ols-digital-skills worktree add /tmp/gj-wt draft/issue-24-25-maths-m2-revision`
  then add a launch.json config serving `/tmp/gj-wt` on a free port, or
- If no other session is using the main tree (check `git -C ~/Sites/ols-digital-skills status`):
  just `git checkout draft/issue-24-25-maths-m2-revision` there and use port 8098.

## Verify (all currently pass)
```
cd <worktree-or-main>/maths/glass-jotter
node mathcore.js && node -e "require('./mathcore.js').selfTest()"   # 73 cases
node dev/test-anglecore.js          # ALL GREEN, 72 cases
node dev/lint-content-angles.js     # PASS (geometry re-measured, every edge re-proven)
node dev/lint-content-algebra.js    # PASS
node dev/validate-all.js            # 48/48 questions sound (correct→full marks, wrong→caught)
node server/build-pathb.js          # regenerate server/Code.gs + Index.html (commit these)
```
Browser QA: preview → mount every movie + question, watch console (zero errors); check 375 /
768 / 1280px. Diagram labels must stay ~13px and tappable on phone.

## Outstanding / next steps (none blocking)
- **Review**: Damien reviews on the local preview. Nothing required to "finish" — it's done.
- **Deploy (when Damien says go)**: login-gated tier is NOT live. Follow `server/DEPLOY.md`
  (create Sheet, paste `server/Code.gs`, name project first, deploy execute-as-Me /
  within-domain, set staffPasscode, record `/exec` in `docs/deployed-apps.md`). One OAuth
  consent click from Damien. Then `/publish 24` (Path-B variant) drafts the teacher email.
- **Cleanup when done**: `git worktree remove /tmp/gj-wt` (unlocks the branch) and remove the
  `gj-wt` config from `.claude/launch.json`.
- Offline demo: staff passcode `demo` seeds a fake class for demoing the markbook.

## Flags carried from the build (for Mary's spot-check)
Brackets-both-sides + past-paper-style questions are authored (no source supplied);
"Interior angles (U shape)" uses the teacher's WALT wording. All answers independently
re-derived correct.
