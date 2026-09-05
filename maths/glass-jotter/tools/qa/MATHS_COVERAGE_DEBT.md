# MATHSHELF — THE COVERAGE DEBT LEDGER

A coverage cell may be OWED only as a row here, and only with a reason, an owner
or phase, and the CONTENT HASH of the file it belongs to. **A file carrying debt
that has been EDITED (its hash has moved) stops the pack**: you may not change a
thing whose coverage you owe. A row carrying `WAIVED BY HIS RULING <date>` lifts
the freeze for that cell only — and is still printed as debt on every run.

Format (one row per cell):

    | cell | reason | owner / phase | file | sha1 | waiver |

---

## Waivers standing

| cell | reason | owner / phase | file | sha1 | waiver |
|---|---|---|---|---|---|
| angles × source | the Angles pack predates the per-question `src` rule; its content map is MEP Y8 Practice Book A ch.11 (11.1 Angle Measures, 11.2 Parallel and Intersecting Lines) + Mary McElroy's WALTs, recorded in the pack header and audited to zero errors on 25 Jun 2026 | locked content, rule 30 | content-angles.js | (any) | WAIVED BY HIS RULING 25 Jun 2026 |
| algebra × source | the Algebra pack predates the per-question `src` rule; its content map is MEP Y7 bk7_16 §16.1/16.3 and MEP Y8 bk8_8 §8.1/8.2, audited to zero errors on 25 Jun 2026 ("6 + b = 6 + 7 = 13" is verbatim-correct MEP) | locked content, rule 30 | content-algebra.js | (any) | WAIVED BY HIS RULING 25 Jun 2026 |
| angles × period-budget | 24 Core questions predate the one-period 26-unit rule and are approved and live as Version 25 | locked content, rule 30 | content-angles.js | (any) | WAIVED BY HIS RULING 28 Jun 2026 |
| algebra × period-budget | 24 Core questions predate the one-period 26-unit rule and are approved and live as Version 25 | locked content, rule 30 | content-algebra.js | (any) | WAIVED BY HIS RULING 28 Jun 2026 |

## Open debt — surfaces the v4 design names that the build has not reached yet

_Each row is deleted as the surface lands. The DONE list refuses a deploy with a
row still open and no dated waiver, so this list is the build's own to-do and
the machine's, not mine._

| cell | reason | owner / phase | file | sha1 | waiver |
|---|---|---|---|---|---|
