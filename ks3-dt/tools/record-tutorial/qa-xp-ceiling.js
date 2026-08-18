/* qa-xp-ceiling.js — THE SCREEN MAY NOT PROMISE XP THE SERVER WILL NOT STORE.
   Built 16 Aug 2026, after the J2 Lesson 1 expert walk came back 13 XP short of
   its own arithmetic and the cause turned out to be the deployed server.

   WHAT THE SERVER ACTUALLY DOES (read out of Code.gs.template, not recalled):
     var xpDelta = Math.max(0, Math.min(40, num_(req.xp)));            // per EVENT
     xpDelta = Math.min(xpDelta, Math.max(0, 150 - num_(a[1])));       // per LESSON
   So a badge worth 63 XP grants 40 and says nothing — while `badgeCelebration`
   prints "+63 XP" on the pop, in front of the pupil. That is rule 35 on the one
   number the whole reward economy is built from, and nothing anywhere checked
   it: sit-review pins the FINAL XP, which is the truncated number, so a pinned
   shape would have frozen the fault in as the truth.

   The server is DEPLOYED and stays zero-diff (DFM 146d/154), so the content
   bends to the cap, exactly as DFM 185(b) made the Rally's goes five seconds
   long because the server caps a score at 99. This gate is what makes the cap
   visible at authoring time instead of at a pupil's badge pop.

   WHAT IT CHECKS, per lesson, computed from the BUILT content (DFM 199 — never
   from memory): the LARGEST XP any single badge event can carry, and the
   largest total a lesson can grant. It fails naming the chunk and the number.

   COVERAGE: every lesson of every declared year.
   CONTROLS: --controls proves it both ways, including against the real pre-fix
   J2 Lesson 1 numbers that produced the fault. */
const fs = require('fs');
const path = require('path');

const SRC = process.env.KS3DT_SRC ||
  path.join(process.env.HOME, 'Desktop/Claude Work/KS3 DT Platform/content-src');

/* the two ceilings, named where they are enforced */
const EVENT_CAP = 40;    // Code.gs.template: Math.min(40, req.xp)
const LESSON_CAP = 150;  // Code.gs.template: Math.min(xpDelta, 150 - a[1])
const EXIT_FILE_XP = 10; // Code.gs.template's submitExit grant, unconditional on filing

/* THE BADGE'S REAL MAXIMUM, per engine. A badge's `xp` is what most engines
   hand to awardBadge — but an engine that ACCUMULATES adds to it, and the
   accumulating ones are the only ones that can cross the cap. Each entry below
   names how that engine's maximum is computed from its own config, so a new
   engine that scores has to declare itself here rather than slip through. */
function badgeMax(chunk) {
  const base = Number((chunk.badge || {}).xp || 0);
  const cfg = chunk.config || {};
  if (chunk.engine === 'inspect') {
    /* Engines.inspect: earned += found * xpPerFlag + (all found ? xpClean : 0),
       accumulated across every scene and added to the badge at the end. */
    const earned = (cfg.scenes || []).reduce((sum, sc) => {
      const breaks = (sc.zones || []).filter(z => z.breaks).length;
      return sum + breaks * Number(sc.xpPerFlag || 0) + Number(sc.xpClean || 0);
    }, 0);
    return { max: base + earned, how: base + ' badge + ' + earned + ' from every flag and every clean scene' };
  }
  /* Engines.snap and Engines.pyrun (19 Aug 2026) both pass a BONUS to
     finishChunk: firstTryXp per clean pair / clean build, held to
     firstTryXpCap. The bonus is added to the badge's own xp BEFORE the award,
     so the pop shows the total and the server stores the total — which means a
     generous firstTryXp is exactly the way to cross the 40 ceiling without a
     single number in the content looking wrong. It is declared here for the
     same reason `inspect` is: an engine that scores has to say so, or the gate
     passes a badge nobody has measured (DFM 206's own class). */
  if (chunk.engine === 'snap' || chunk.engine === 'pyrun') {
    const per = Number(cfg.firstTryXp || 0);
    const cap = Number(cfg.firstTryXpCap || 0);
    const units = chunk.engine === 'snap'
      ? (cfg.pairs || []).length
      : (cfg.builds || []).length;
    const bonus = Math.min(per * units, cap || (per * units));
    if (bonus) {
      return { max: base + bonus, how: base + ' badge + ' + bonus + ' for first-try work (' +
        per + ' x ' + units + ', capped at ' + (cap || 'nothing') + ')' };
    }
  }
  return { max: base, how: base + ' badge' };
}

function lessons() {
  const idx = JSON.parse(fs.readFileSync(path.join(SRC, 'index.json'), 'utf8'));
  const out = [];
  (idx.years || []).forEach(y => {
    const yid = typeof y === 'string' ? y : y.id;
    const dir = path.join(SRC, yid, 'lessons');
    if (!fs.existsSync(dir)) return;
    fs.readdirSync(dir).filter(f => f.endsWith('.json')).sort().forEach(f => {
      out.push({ id: f.replace(/\.json$/, ''), json: JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')) });
    });
  });
  return out;
}

function audit(L) {
  const fails = [];
  const chunks = L.json.chunks || [];
  let total = 0;
  chunks.forEach(ch => {
    if (!ch.badge) return;
    const b = badgeMax(ch);
    total += b.max;
    if (b.max > EVENT_CAP) {
      fails.push(L.id + ' › ' + ch.id + ': one badge event can carry ' + b.max + ' XP (' + b.how +
        '), and the deployed server stores at most ' + EVENT_CAP + ' per event. The badge pop would ' +
        'promise ' + b.max + ' and the record would gain ' + EVENT_CAP + ' — rule 35 on her own points.');
    }
  });
  const hasExit = chunks.some(ch => ch.engine === 'exitcheck');
  if (hasExit) total += EXIT_FILE_XP;
  if (total > LESSON_CAP) {
    fails.push(L.id + ': the whole lesson can grant ' + total + ' XP and the server caps a lesson at ' +
      LESSON_CAP + ' — the last badges of a perfect run would score nothing.');
  }
  return { fails, total };
}

function run() {
  const rows = lessons();
  let bad = 0;
  rows.forEach(L => {
    const r = audit(L);
    if (r.fails.length) { bad += r.fails.length; r.fails.forEach(f => console.log('  FAIL ' + f)); }
    else console.log('  PASS  ' + L.id + ': largest badge event ' +
      Math.max(0, ...(L.json.chunks || []).filter(c => c.badge).map(c => badgeMax(c).max)) +
      ' XP, whole lesson ' + r.total + ' XP (caps ' + EVENT_CAP + ' / ' + LESSON_CAP + ')');
  });
  console.log(bad ? '\nqa-xp-ceiling: ' + bad + ' FAILURE(S)' : '\nqa-xp-ceiling: PASS');
  return bad === 0;
}

/* ---- controls: the gate must bite, and must not bite good content ---- */
function controls() {
  const say = (ok, what) => { console.log((ok ? '  ok   ' : '  FAIL ') + what); return ok; };
  const res = [];

  /* (1) THE REAL PRE-FIX NUMBERS. This is exactly what J2 Lesson 1 shipped with
     when the walk came back short: base 10, xpPerFlag 2/2/3/3/3, xpClean
     3/3/4/5/5 over scenes with 3/3/2/2/3 violations = 63 on one event. */
    const preFix = {
    id: 'control-prefix', json: { chunks: [{
      id: 'inspection', engine: 'inspect', badge: { xp: 10 },
      config: { scenes: [
        { xpPerFlag: 2, xpClean: 3, zones: [{ breaks: 'a' }, { breaks: 'b' }, { breaks: 'c' }, {}, {}] },
        { xpPerFlag: 2, xpClean: 3, zones: [{ breaks: 'a' }, { breaks: 'b' }, { breaks: 'c' }, {}, {}] },
        { xpPerFlag: 3, xpClean: 4, zones: [{ breaks: 'a' }, { breaks: 'b' }, {}, {}, {}] },
        { xpPerFlag: 3, xpClean: 5, zones: [{ breaks: 'a' }, { breaks: 'b' }, {}, {}, {}] },
        { xpPerFlag: 3, xpClean: 5, zones: [{ breaks: 'a' }, { breaks: 'b' }, { breaks: 'c' }, {}, {}] }
      ] } }] } };
  const pf = audit(preFix);
  res.push(say(pf.fails.length === 1 && /63 XP/.test(pf.fails[0]),
    'the shipped pre-fix inspection (63 on one event) is CAUGHT, and the message names 63'));

  /* (2) over-tightening guard: a badge exactly at the cap must PASS, because 40
     is what the server stores, not what it refuses. */
  const atCap = { id: 'control-atcap', json: { chunks: [{ id: 'c', engine: 'items', badge: { xp: 40 } }] } };
  res.push(say(audit(atCap).fails.length === 0, 'a badge of exactly 40 passes — the cap is a ceiling, not a wall'));

  /* (3) one over the cap is caught */
  const overCap = { id: 'control-over', json: { chunks: [{ id: 'c', engine: 'items', badge: { xp: 41 } }] } };
  res.push(say(audit(overCap).fails.length === 1, 'a badge of 41 is caught'));

  /* (2b) THE FIRST-TRY BONUS IS COUNTED. Before 19 Aug this gate read only
     `badge.xp`, so a pyrun chunk could promise 30 + 3 per build across five
     builds and print PASS at 30. Planted both ways. */
  const bonusOver = { id: 'control-bonus', json: { chunks: [{ id: 'c', engine: 'pyrun',
    badge: { xp: 30 }, config: { firstTryXp: 3, firstTryXpCap: 15,
      builds: [{}, {}, {}, {}, {}] } }] } };
  res.push(say(audit(bonusOver).fails.length === 1,
    'a pyrun badge of 30 + a 15-point first-try bonus is caught at 45'));
  const bonusFine = { id: 'control-bonus-ok', json: { chunks: [{ id: 'c', engine: 'snap',
    badge: { xp: 15 }, config: { firstTryXp: 1, firstTryXpCap: 6,
      pairs: [{}, {}, {}, {}, {}, {}] } }] } };
  res.push(say(audit(bonusFine).fails.length === 0,
    'and a snap badge of 15 + 6 still passes — the cap is a ceiling, not a wall'));

  /* (4) the per-LESSON ceiling bites independently of the per-event one */
  const fat = { id: 'control-lesson', json: { chunks: Array.from({ length: 4 }, (_, i) =>
    ({ id: 'c' + i, engine: 'items', badge: { xp: 40 } })) } };
  res.push(say(audit(fat).fails.length === 1 && /caps a lesson/.test(audit(fat).fails[0]),
    '4 × 40 = 160 is caught by the per-LESSON cap, with every event legal'));

  /* (5) the real, fixed content passes */
  const live = lessons().find(l => l.id === 'j2-01');
  if (live) res.push(say(audit(live).fails.length === 0, 'the shipped j2-01 passes'));

  const ok = res.every(Boolean);
  console.log(ok ? '\nqa-xp-ceiling controls: ALL PASS' : '\nqa-xp-ceiling controls: FAILED');
  return ok;
}

if (require.main === module) {
  const ok = process.argv.includes('--controls') ? controls() : run();
  process.exit(ok ? 0 : 1);
}
module.exports = { audit, badgeMax, EVENT_CAP, LESSON_CAP };
