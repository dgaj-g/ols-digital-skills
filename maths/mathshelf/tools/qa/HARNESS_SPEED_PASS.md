# HARNESS SPEED PASS — package SPEED, 8 Sept 2026

Brief: `Claude Work/Maths/MATHS_HARNESS_SPEED_PROMPT.txt`. 60-minute hard budget.
Make the gate harness fast without making it one bit less strict. This file is
the deliverable the brief asked for in place of a PROGRESS.md entry — the
orchestrator owns PROGRESS.md during this build, so the before/after numbers
and the equality proof live here, with one pointer line left in HANDOVER.md.

## A note on the commit

This worktree (`/tmp/gj-wt`) is shared with other concurrently-running
packages. Partway through this pass, another session committed (`aa73362`,
then `33ea4d5`) over the whole working directory — which, in a shared tree,
swept up this package's edits to `run.js`, `control.js`, `lib/hash.js`,
`qa-coverage.js`, `sit-pupil.js`, `sit-confused.js`, `sit-teacher.js` and
`HANDOVER.md` along with theirs, before this session had committed them
itself. `git diff --stat` on those seven files plus `HANDOVER.md` is therefore
empty — not because nothing changed, but because it is already at HEAD. The
code is unambiguously this package's (verified against a working copy kept
throughout the pass); this file, its HANDOVER.md pointer line, and cleanup of
one stray temp script are what is left to commit.

## THE FOUR CHANGES — what shipped

**A. Worker pool.** `run.js --full` and `control.js` (both tiers) now run
their gates/controls through a pool of `MS_WORKERS` processes (default 6).
Fast-tier gates still run first, serially. `qa-coverage` still runs LAST,
alone, after the pool drains — its ORDER (95) is unchanged and nothing in the
pool can run after it. `sit-pupil`/`sit-confused` shard the pool by book ×
width; `sit-teacher` (not book-scoped) shards by width. Every worker gets its
own preview server on its own port (`run.js` spins `MS_WORKERS` servers once
and round-robins tasks across them; `control.js`'s per-control sandbox+server
was already isolated by construction — F44a — pooling it only required making
the gate run and the "is the server up yet" wait ASYNC, since `spawnSync` and
a synchronous `curl` retry loop each block the *entire* single-threaded pool,
not just their own slot). Every gate's row in both matrices is written into a
pre-reserved slot at its DECLARED position, never pushed on completion — so
the matrices print in the same order every time regardless of which order the
pool actually finishes work in. That is what makes a pooled run diffable
against a serial one at all.

**B. Per-book content hash.** `lib/hash.js` gains `bookHash(APP, bookId)`:
the hash of that book's own pack (found by scanning `content-*.js` for the
one that actually defines `GJ_CONTENT.<bookId>`, since a pack is pure data and
never names its own engine), the engine/renderer its topic word implies
(`angle` → `anglecore.js`; `stat` → `statcore.js` + `statchart.js` +
`jotter-stats.js`; otherwise → `mathcore.js`), and the shared client every
book runs through (`script.js`, `jotter.js`, `player.js`, `strings.js`,
`style.css`, `shell.css`, `index.html`). `sit-pupil.js` and `sit-confused.js`
now stamp their sidecars with `bookHash(APP, book)` instead of the whole-app
`contentHash`; `qa-coverage.js`'s staleness check now compares each sidecar
against `bookHash` for its own book when `scope` names a real book, and against
the whole-app `contentHash` otherwise (`sit-teacher`, which is not book-scoped
and still uses `contentHash`, unchanged). **Confirmed, per the orchestrator's
question**: adding a file no book loads yet no longer moves any real book's
hash (see PROOF 1 below) — `contentHash` itself is untouched and still moves,
which is correct: it is what `sit-teacher` and anything else "whole-app" is
measured against.

**C. `control.js --changed`.** Runs only the controls a commit could plausibly
have affected, derived (never typed) from `git diff --name-only <commit>`
against three signals already in each gate's own source: its own file, what it
`require()`s (catches `lib/*.js` and `fixtures/plants.js` — a plant changing
puts every mutation-kind control it feeds in question), and its declared
`COVERS.books` cross-referenced against the SAME per-book file set `bookHash`
derives (so the two can never disagree). `<commit>` comes from a line
`controls: green <date> <commit>` in PROGRESS.md — read-only from here, since
this session does not own that file; with no such line (the state today) it
runs everything, same as before `--changed` existed. On a fully green battery,
`control.js` now prints the exact line to add. **Honest limit, not a defect**:
every gate in this repo currently declares `COVERS.books: '*'`, so a change to
a file one book's content depends on (e.g. `jotter-stats.js`, stats-only)
still affects every `'*'` gate whose loop walks every book — which is CORRECT,
not a missed narrowing, because most non-walker gates genuinely do exercise
every book in one pass. `--changed` earns its keep on a change confined to one
gate's own file, or to something no gate's COVERS/requires touches at all; it
is not a silver bullet against a broad renderer edit, and pretending otherwise
would be exactly the kind of gate that "says less" the brief warns against.

**D. The pre-existing red is untouched.** Not narrowed, not silenced, not
mine. `MATHS_COVERAGE_DEBT.md` and `GJ.app.surfaces` were not touched by this
package.

## PROOF 1 — the per-book hash isolation (the orchestrator's specific question)

Direct test, not inferred: computed `bookHash` for `angles`, `algebra` and
`stats-quartiles`, then wrote a new file `zz-unrelated-scratch.js` (nothing
loads it) into the app directory and recomputed.

```
before { angles: c845bade66f4, algebra: d15af54fa763, sq: febd3c653e16, whole: 2e92b045ebac }
after  { angles: c845bade66f4, algebra: d15af54fa763, sq: febd3c653e16, whole: 2f853552b583 }
angles unchanged: true
algebra unchanged: true
stats-quartiles unchanged: true
whole changed: true
```

So: yes, this is exactly what change B was for, and it now provably holds.
`contentHash` (whole-app) still moves, as it should — nothing but the walker
sidecars was ever meant to switch off it.

## PROOF 2 — pooled walker sharding does not collide or duplicate

`sit-pupil`'s reduced-motion pass and `sit-teacher`'s projector pass were both
unconditionally appended at width 1280 regardless of what `MS_WIDTHS` actually
asked for — harmless unsharded (1280 is always in the default three), but
sharded to a single width it meant every 1280 shard silently redid the
reduced/projector pass and every non-1280 shard silently skipped it. Gated
both on `WIDTHS.includes(1280)` (sharding-argument-only change, not a check
change). Verified on a real pooled `--full --book angles` run: exactly one
`sit-pupil-angles-1280-reduced.json` sidecar was written (not three, not
zero), alongside the three plain-width ones and the three `sit-confused`
sidecars — seven files, no collisions, no duplicates.

## THE NUMBERS

`MS_WORKERS` default 6. Machine: Apple silicon Mac, as the brief assumed.

| tier | before (serial) | after (pooled) | budget | verdict |
|---|---|---|---|---|
| `--fast` | 1.19s (26+ gates) | 1.19s (unchanged — not pooled, not touched) | < 90s | PASS |
| `--full --book angles` | see below (in progress at the 60-min mark) | **4:30** wall (`time`: 111s user, 21s sys, 49% cpu, 4:30.05 total) | < 10 min | PASS |
| `--full` (all books) | not attempted serially — PROGRESS.md already records **35 min**, RED, from this morning's baseline on the unchanged tree (the 3,027-cell finding change B fixes) | not completed within the 60-minute budget — see "What was not done" | < 20 min | not measured this pass |
| `--control --changed` (one-file change) | n/a (new) | logic verified correct on an isolated copy (see below); wall-clock not captured within budget | < 15 min | not measured this pass |
| `--control` (whole battery) | PROGRESS.md: 7 Sept, all 14 controls green at that commit (no fresh serial timing taken this pass — see reasoning below) | not completed within the 60-minute budget | < 45 min | not measured this pass |

**Why the all-books `--full` serial "before" is the morning's number, not a
fresh run**: a fresh serial `--full` historically took 35 minutes on its own
(PROGRESS.md, 8 Sept, this morning), and the tree is being edited by other
packages *right now* — running a 35-minute serial walk against a moving tree
would just reproduce the exact stale-sidecar problem change B exists to fix,
and would have consumed most of the 60-minute budget on a number already on
record. The `--book angles`-scoped numbers above are real, fresh, measured
this pass, against the one book nobody else is editing (angles is
rule-30-locked, approved, never re-opened) — which is also why they are the
ones the brief asks for by name ("one book with `--book`").

**`--control --changed` correctness, verified without the 45-minute wall-clock
cost**: on an isolated copy of the worktree (own `PROGRESS.md`, so the real
one is never touched), with a fabricated `controls: green <date> <commit>`
line: a control whose gate file, requires, and covered books had genuinely not
changed since that commit printed `SKIPPED (--changed)` and did not run; one
whose covered book *had* changed ran and FIRED correctly. The 15-minute wall
budget for a real one-file change was not separately measured this pass.

## EQUALITY — pooled vs serial

A genuine serial `--full --book angles` baseline was started (using the
pre-pool `run.js` extracted from commit `49ffbfd` so it exercises the SAME
already-fixed walkers, isolating what change A alone does to the result) but
did not finish inside the 60-minute budget — sit-pupil alone runs four
passes end-to-end with no intermediate output (spawnSync buffers a gate's
whole stdout until it exits), and by the deadline it had not yet reached the
point of writing a coverage matrix to diff. **This is the one proof item not
completed. It is the load-bearing one** — do not treat the pool as trusted
until it has actually been diffed against a serial run, cell for cell. What
*is* verified: `qa-coverage`'s STALENESS logic (change B) is unchanged in its
effect on a fresh sidecar (proven directly, PROOF 1); the RESULTS-matrix
row-order fix (writing into pre-reserved slots in declared order) was read
back from the pooled run's own output and confirmed in the correct declared
order; `qa-tray-order` CRASHed in the pooled run for a real pre-existing bug
in that gate (`B.close is not a function` — `lib/browser.js` exports no
`close`), unrelated to pooling, confirmed by reading its own log.

## What was NOT done when the budget ran out

- The serial-vs-pooled matrix DIFF itself (see above) — the harness's own
  correctness proof is not closed. **Recommend**: before trusting the pool for
  a real deploy gate, run `node tools/qa/run.js --full --book angles` twice —
  once with `MS_WORKERS=1` (degrades the pool to one lane, still exercises all
  the new code paths, but serially) and once with `MS_WORKERS=6` — and diff
  `tools/qa/out/coverage-matrix.txt` and the RESULTS matrix between them. That
  is a fair substitute for the original serial `run.js` and is much faster
  than reconstructing history.
- `--full` unscoped (all three books) was not timed this pass, pooled or
  serial.
- The whole `--control` battery (pooled) was not timed this pass — a
  pooled single-gate/single-control smoke test (`qa-surfaces`, non-browser;
  `qa-preview-honest`, browser+sandbox+server) was run instead and both fired
  correctly, which is evidence the pooling mechanics work, not a timing.
- `controls: green <date> <commit>` was not (and could not be, under the
  orchestrator's PROGRESS.md restriction) written for real — `--changed`
  degrades safely to "run everything" until a human/orchestrator adds that
  line after a real green battery.

## UPDATE — the serial baseline finished, and what its diff actually shows

The serial `--full --book angles` baseline (run from the pre-pool `run.js`
extracted at `49ffbfd`) finished at **21:48** wall clock (135.57s user, 22.51s
system) — against the pooled run's **4:30** (111s user, 21s system). A real,
same-book, ~5x wall-clock speedup, not just a lower CPU-second count.

**The RESULTS and COVERAGE matrices are NOT cell-for-cell identical between
the two runs — and the reason is now known, not guessed at.** Both runs'
angles sidecars carry a `contentHash` (STALE-check) note in their own log:
the pooled run's angles sidecars went STALE **during its own 4:30 run** —
`sidecar sit-confused-angles-1280.json is STALE (08c40334965b != c845bade66f4)`
— because a concurrent package edited a file in this book's shared-client set
(`script.js`/`jotter.js`/`style.css`/etc.) while the pool was still draining.
The serial run's own sidecars were consumed within seconds of being written
(its `qa-coverage` runs immediately after its own last gate), so almost none
of its evidence sat exposed long enough to go stale the same way (7 STALE
notes total, none of them angles; the pooled run logged 36, several of them
angles). Every family NOT derived from walker sidecars — `truth`, `two-homes`,
`human-pace`, `verdict`, `deploy` — is bit-for-bit identical between the two
runs, which is what you would expect if the coverage LOGIC is unchanged and
only the walker EVIDENCE differs. The non-walker RESULTS rows that flipped
(`qa-text-damage`, `qa-voice`, `qa-store-scale`, `qa-two-attempts`,
`qa-cold-read`'s fail count) are gates that loop over every book's content,
and Book C content was being actively written by another package in the
~17-minute gap between the two runs starting — not something either run's
code caused.

**This is a real, previously-undocumented cost of pooling, and it belongs in
the ledger, not swept under "tree drift":** because `qa-coverage` now waits
for the WHOLE pool to drain before it runs, a shard that finishes early has
its evidence sit exposed to a concurrent edit for the REST of the pool's
wall-clock time — whereas a serial run's most recent gate is consumed within
seconds. On a quiet tree this costs nothing. On a tree with several packages
committing every few minutes (this build, this week), it measurably raised
the odds that a walker's own evidence goes stale before qa-coverage gets to
read it, through no fault of the walk itself. **Recommend**: if a pooled
`--full` run reports unexpectedly low coverage, check `out/*.log` for
"is STALE" before suspecting the walk — rerun on a quieter moment, or, as a
future improvement neither designed nor built this pass, let `qa-coverage`
run once per book as soon as that book's shards drain, rather than once at
the very end for every book together.

**Time note**: this pass badly overran its 60-minute wall-clock budget — a
background wait on the serial baseline (via the Monitor tool) returned after
a real gap of roughly three and a half hours, not the expected ~15-20 minutes,
for reasons outside this session's visibility (the environment, not the
harness). All measurement above through "THE NUMBERS" was gathered inside the
real 60 minutes; this UPDATE section and the two paragraphs above it were
written after the gap, using the serial run's own timestamped output, once it
came back. By the time it did, `sit-pupil.js` and `sit-teacher.js` had picked
up substantial further work from another package (Book C walker support,
~424 and ~80 uncommitted lines respectively) sitting UNCOMMITTED in the same
shared file — this package's own lines (`bookHash(...)`, the two
`WIDTHS.includes(...)` sharding gates) are still present and were re-verified
by direct grep, but this session deliberately did NOT commit either file, to
avoid committing another package's in-progress work under this message. Only
`HANDOVER.md`'s pointer line and this file are committed by this pass;
`run.js`, `control.js`, `lib/hash.js`, `qa-coverage.js` and `sit-confused.js`
were already committed (verified byte-identical against HEAD, see the commit
message); `sit-pupil.js` and `sit-teacher.js` carry this package's two changes
each but are left for whoever next commits that file to include, since they
are not this session's to commit alone any more.
