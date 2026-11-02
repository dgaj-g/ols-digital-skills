#!/usr/bin/env node
/* MODEL JUDGE — the run-the-world model tells the truth the lesson teaches (SPEC §6).
   node judge-model.js            → every check passes, exit 0
   node judge-model.js --control  → the same checks on a model that ignores WHEN cards are played
                                    (opts.ignoreTiming); "later saves less" must fail (exit 0 only if it does). */
const path = require('path'), vm = require('vm'), fs = require('fs');
const CONTROL = process.argv.includes('--control');
const M = require(path.resolve(__dirname, '../model.js'));
const ctx = { window: {} }; vm.runInNewContext(fs.readFileSync(path.resolve(__dirname, '../content.js'), 'utf8'), ctx);
let bands = null;
(function find(o) { if (bands || !o || typeof o !== 'object') return; if (Array.isArray(o.verdicts)) bands = o.verdicts; else Object.values(o).forEach(find); })(ctx.window.TDTH);
const opts = CONTROL ? { ignoreTiming: true } : {};
const run = picks => M.runWorld(picks, 7, opts);
const fails = [];
const check = (ok, m) => { console.log((ok ? '  ok   ' : '  FAIL ') + m); if (!ok) fails.push(m); };

const carry = run([[], [], []]);
check(carry.t2100 >= 3.2 && carry.t2100 <= 3.4, 'carry on ends at ' + carry.t2100 + ' °C (3.2–3.4)');
const best = run([['solar', 'fossilban', 'evs'], ['capture', 'forests', 'meatprice'], ['homes', 'rainforest', 'labmeat']]);
check(best.t2100 <= 1.9, 'best plan without spray ends at ' + best.t2100 + ' °C (≤ 1.9)');
check(bands && M.verdict(best.t2100, bands) === bands[0], 'best plan without spray reaches the top verdict band');
const late = run([[], [], ['solar', 'fossilban', 'evs']]);
check(late.t2100 >= 2.2, 'the three big cutting cards only in round 3 end at ' + late.t2100 + ' °C (≥ 2.2)');
const early = run([['solar', 'fossilban', 'evs'], [], []]);
check(early.exact < late.exact, 'the same three cards save more in round 1 (' + early.t2100 + ') than round 3 (' + late.t2100 + ')');
Object.keys(M.DECK).forEach(id => {
  const c = M.DECK[id];
  if (!(c.cut || c.remove || c.methane)) return; /* cooling cards reflect sunlight: their effect does not pile up, so timing rightly does not matter */
  const a = run([[id], [], []]).exact, z = run([[], [], [id]]).exact;
  if (!(a < z)) check(false, id + ' saves no more in round 1 (' + a.toFixed(3) + ') than in round 3 (' + z.toFixed(3) + ')');
});
check(!fails.some(f => / saves no more /.test(f)), 'every cutting card saves less when played later');
const all = [carry, best, late, early, run([['fivehours', 'fossilban', 'gasban'], ['airtax', 'meatprice', 'spray'], ['fivehours', 'gasban', 'airtax']])];
check(all.every(r => r.years.every(y => Object.values(y).every(v => typeof v !== 'number' || isFinite(v)))), 'no NaN or Infinity in any year');
const angry = all[4];
check(angry.events.every(e => e.supportBefore >= 0 && e.supportAfter >= 0), 'support is never shown below 0');
check(angry.events.some(e => e.cancelled) && angry.events.every(e => !e.cancelled || e.feelings.length === 2), 'a protest cancels exactly one card');
check(bands && bands.length === 4 && bands.every((b, i) => !i || b.max > bands[i - 1].max), 'four verdict bands in rising order');

if (CONTROL) {
  const caught = fails.some(f => /later|round 1|round 3/.test(f));
  console.log(caught ? 'CONTROL OK: a model that ignores timing fails "later saves less".' : 'CONTROL BROKEN: timing was ignored and the judge did not notice.');
  process.exit(caught ? 0 : 1);
}
console.log(fails.length ? 'MODEL FAILED (' + fails.length + ')' : 'MODEL PASSED');
process.exit(fails.length ? 1 : 0);
