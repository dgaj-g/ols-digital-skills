#!/usr/bin/env node
/* qa-year-worlds.js — EACH YEAR OPENS INTO ITS OWN WORLD, AND J1's IS UNTOUCHED.
 *
 * DAMIEN, 14 Aug 2026 (DFM 224b): "Each Year group must have it's own
 * distinctive background colour. A soft animation would be great as well."
 * Ruled to specific worlds on 15 Aug (K11a): J2 "The Workbench" (forge charcoal
 * + copper, rising embers) and J3 "The Screening Room" (plum velvet + marquee
 * gold, spotlight sweep). J1's starfield is untouched.
 * And K11b, same message: the reward wardrobes are renamed — J2 "The Kit
 * Locker", J3 "Wardrobe" — because the YEAR identities already own "The
 * Workshop" and "The Studio", and one name for two things on one screen is
 * rule 52 broken twice over.
 *
 * WHAT THIS FILE GUARDS, and why each is here rather than in qa-kit-years:
 *   1. THE DEFAULT LOOK IS PER YEAR. A J2 pupil who has never touched the
 *      wardrobe must not open into J1's navy. The record stores '' for "the
 *      default", so '' has to RESOLVE differently per year — in the client, in
 *      the preview server's seed expectations, and in this file's own copy of
 *      the rule (DFM 157a: a rule in more than one place is a contract).
 *   2. J1 IS BYTE-IDENTICAL AT THE RESOLUTION. Making '' resolve to a named
 *      theme is the risky half: if midnight's knobs are not exactly the shell
 *      defaults, five signed-off lessons change colour. So midnight's vars must
 *      stay empty and its stars must equal the shell's STAR_DEFAULTS, proved
 *      against the file rather than assumed.
 *   3. NO YEAR READS ANOTHER YEAR'S FICTION. K1 keeps the agent fiction J1's.
 *      The kit modal, the clearance pop and both toasts are SHARED surfaces, so
 *      every word on them comes from the registry — and a J2 or J3 pupil may
 *      never meet "Agent", "Agent File", "mission", "console", "clearance" or
 *      "HQ" (DFM 25's list, applied to the shell).
 *   4. THE NEW fx LAYERS OBEY THE COMPOSITOR RULE. embers and spotlight animate
 *      transform/opacity only — no background-attachment:fixed, no new filters
 *      inside cards. The rule that keeps old C2k machines from going black.
 *
 *   node qa-year-worlds.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../../..');
const SRC = process.env.KS3DT_SRC ||
  path.join(process.env.HOME, 'Desktop/Claude Work/KS3 DT Platform/content-src');
const REG = path.join(SRC, 'themes.json');
const APP = path.join(ROOT, 'ks3-dt/platform/app.js');
const CSS = path.join(ROOT, 'ks3-dt/platform/style.css');

const FAILS = [];
const check = (ok, m) => { console.log((ok ? '  PASS  ' : '  FAIL  ') + m); if (!ok) FAILS.push(m); };
const ctrl = (ok, m) => { console.log((ok ? '  CTRL  ' : '  FAIL  ') + m); if (!ok) FAILS.push('CONTROL: ' + m); };
const section = (t) => console.log('\n== ' + t + ' ==');

const reg = JSON.parse(fs.readFileSync(REG, 'utf8'));
const app = fs.readFileSync(APP, 'utf8');
const css = fs.readFileSync(CSS, 'utf8');
const themeById = (id) => (reg.themes || []).find(t => String(t.id) === id);

/* THE RULE, written once here and asserted to match the shipped copy below. */
const DEFAULTS = { j1: 'midnight', j2: 'workbench', j3: 'screeningroom' };

console.log('qa-year-worlds — per-year default worlds (K11a), renamed wardrobes (K11b)');
console.log('  registry: ' + REG);

/* ------------------------------------------------------------------ 1 */
section('EACH YEAR HAS ITS OWN LEVEL-1 BASE LOOK');
Object.entries(DEFAULTS).forEach(([y, id]) => {
  const t = themeById(id);
  check(!!t, y + '\'s base look "' + id + '" exists in the registry');
  if (!t) return;
  check(String(t.year) === y, '  and it is tagged for ' + y + ' only (tag: ' + t.year + ')');
  check(Number(t.clearance) === 1, '  and it sits at level 1, so it is the floor and never an unlock');
});
check(new Set(Object.values(DEFAULTS)).size === 3,
  'the three years open into three DIFFERENT looks (a teacher can tell the year from the back of the room)');

/* the year worlds must not merely differ by name — the GROUND must differ */
const ground = (id) => {
  const t = themeById(id);
  if (!t) return null;
  return String((t.vars || {})['--space-0'] || '#060D1F').toLowerCase();
};
check(new Set(['j1', 'j2', 'j3'].map(y => ground(DEFAULTS[y]))).size === 3,
  'and three different ground colours: ' + ['j1', 'j2', 'j3'].map(y => ground(DEFAULTS[y])).join(' / '));

section('THE SHIPPED COPY OF THE RULE MATCHES THIS ONE (DFM 157a)');
check(/App\.defaultThemeId\s*=\s*function/.test(app),
  'app.js owns the resolution in ONE named place (App.defaultThemeId)');
const map = (app.match(/var YEAR_DEFAULT_THEME = \{[^}]*\}/) || [''])[0];
check(!!map, 'and the year → look map is a single declared table, not scattered conditionals');
Object.entries(DEFAULTS).forEach(([y, id]) => {
  check(new RegExp("'" + y + "'\\s*:\\s*'" + id + "'").test(map),
    '  and it maps ' + y + ' → ' + id);
});
/* THE TWO SITES THAT USED TO NAME MIDNIGHT: the wardrobe's "Equipped" mark on a
   pupil who has chosen nothing, and the equip that stores '' when she picks the
   default back. Both must now ASK, or a J2 girl sees J1's look ticked as hers. */
check(/String\(t\.id\) === App\.defaultThemeId\(\)/.test(app),
  'the wardrobe marks the YEAR\'s default as Equipped when she has chosen nothing');
check(/id === App\.defaultThemeId\(\)\) \? ''/.test(app),
  'and equipping her year\'s default stores \'\' rather than a theme id (the record stays lean, both ways)');
/* ONE `=== 'midnight'` is allowed to survive, and only one: the empty-wardrobe
   safety net inside resolveKit. It is not a default — it is the never-strand
   rule (rule 42/35 family) for a browser holding a themes.json cached from
   before any of this existed, and qa-kit-years' legacy control depends on it.
   Counting it, rather than banning it, is what stops a new hardcode creeping
   back in beside it. */
const midHits = (app.match(/=== *'midnight'/g) || []).length;
check(midHits === 1,
  'exactly ONE `=== \'midnight\'` literal survives in app.js (found ' + midHits + ')');
const netBlock = (app.match(/if \(!out\.themes\.length\)[\s\S]{0,200}?\}/) || [''])[0];
check(/=== *'midnight'/.test(netBlock),
  'and it is the empty-wardrobe safety net inside resolveKit, not a default');

/* ------------------------------------------------------------------ 2 */
section('CONTROL — J1 IS BYTE-IDENTICAL AT THE RESOLUTION');
/* This is the dangerous half. Today a J1 pupil with th='' gets NO theme object
   at all, so the shell's own :root defaults paint the screen. After the change
   she gets midnight explicitly. Those two are the same screen ONLY IF midnight
   carries no var overrides and its stars equal the shell's STAR_DEFAULTS. */
const mid = themeById('midnight');
ctrl(mid && Object.keys(mid.vars || {}).length === 0,
  'midnight overrides NO custom properties, so resolving to it paints the shell defaults exactly');
ctrl(mid && !mid.fx, 'and it names no fx layer, so no new element appears on a J1 screen');
const STAR_DEFAULTS = (() => {
  const s = app.match(/var STAR_DEFAULTS = \{([^}]*)\}/);
  if (!s) return null;
  const o = {};
  s[1].split(',').forEach(p => {
    const kv = p.split(':');
    if (kv.length < 2) return;
    o[kv[0].trim()] = kv.slice(1).join(':').trim().replace(/^'|'$/g, '');
  });
  return o;
})();
ctrl(!!STAR_DEFAULTS, 'app.js still declares STAR_DEFAULTS to compare against');
if (STAR_DEFAULTS && mid) {
  const same = ['density', 'base', 'accent', 'ratio'].every(k =>
    String(mid.stars[k]).toLowerCase() === String(STAR_DEFAULTS[k]).toLowerCase());
  ctrl(same, 'and midnight\'s starfield equals STAR_DEFAULTS value for value (' +
    ['density', 'base', 'accent', 'ratio'].map(k => k + ' ' + mid.stars[k]).join(', ') + ')');
}
ctrl(String((themeById('midnight') || {}).year) === 'j1',
  'midnight is re-tagged j1 — so the stray "classic HQ interface" line can never reach a J2 or J3 wardrobe');

/* ------------------------------------------------------------------ 3 */
section('THE WARDROBES ARE RENAMED (K11b) AND CARRY THEIR RULED EXPLAINERS');
const kits = reg.kits || {};
check(kits.j1 && kits.j1.name === 'Agent Kit', 'J1 is still the Agent Kit (untouched)');
check(kits.j2 && kits.j2.name === 'The Kit Locker', 'J2 opens The Kit Locker (was the 14-Aug working name "The Workshop")');
check(kits.j3 && kits.j3.name === 'Wardrobe', 'J3 opens Wardrobe (was "The Studio")');
/* the YEAR identities keep the K1 names — that is the whole point of the rename */
const index = JSON.parse(fs.readFileSync(path.join(SRC, 'index.json'), 'utf8'));
const subOf = (y) => (index.years.find(x => x.id === y) || {}).subtitle || '';
check(/The Workshop/.test(subOf('j2')), 'the YEAR is still "J2 · The Workshop" — the year keeps its K1 name');
check(/The Studio/.test(subOf('j3')), 'and "J3 · The Studio"');
check(kits.j2.name !== 'The Workshop' && kits.j3.name !== 'The Studio',
  'so the wardrobe and the year no longer share one name on one screen (rule 52)');
/* rule 13 / DFM 192i: a named thing carries a defining phrase at first meeting */
check(/locker/i.test(kits.j2.explainer) && /Workshop/.test(kits.j2.explainer),
  'the Kit Locker explains itself as her own locker in the Workshop (rule 13, first meeting)');
check(/Wardrobe department/i.test(kits.j3.explainer),
  'and Wardrobe explains itself by the real studio department it is named after (DFM 193c: the real word, earned)');
['j2', 'j3'].forEach(y => {
  check(/keep|yours/i.test(kits[y].explainer),
    y + '\'s explainer says the looks are HERS to keep (DFM 145, once earned always hers, said on screen)');
});

/* ------------------------------------------------------------------ 4 */
section('NO YEAR READS ANOTHER YEAR\'S FICTION (K1 / DFM 25)');
const FICTION = /\b(agent|agents|agent file|mission|missions|console|clearance|clearances|HQ)\b/i;
const shared = (k) => [k.name, k.explainer, k.rankWord, k.popTitle, k.popBody, k.savedToast, k.lockedToast, k.foot]
  .filter(s => typeof s === 'string');
['j2', 'j3'].forEach(y => {
  const k = kits[y] || {};
  const strings = shared(k);
  check(strings.length >= 8,
    y + ' owns every word of the shared kit surfaces (' + strings.length + ' registry strings: name, explainer, rank word, pop title, pop body, both toasts, footer)');
  const hits = strings.filter(s => FICTION.test(s));
  check(hits.length === 0,
    '  and not one of them uses J1\'s agent fiction' +
    (hits.length ? ' — found: ' + hits.map(s => '"' + s.slice(0, 48) + '"').join(' / ') : ''));
});
check((kits.j1 || {}).rankWord === 'Clearance', 'J1 keeps "Clearance" as its rank word, from the registry now rather than a literal');
check(kits.j2.rankWord === kits.j3.rankWord && kits.j2.rankWord === 'Level',
  'J2 and J3 use "Level" — a word a pupil already owns, needing no decoding (rule 13)');
/* and the shell must actually READ them, or the registry is decoration */
[['rankWord', /kitWord_\('rankWord'/], ['popTitle', /kitWord_\('popTitle'/],
 ['popBody', /kitWord_\('popBody'/], ['savedToast', /kitWord_\('savedToast'/],
 ['lockedToast', /kitWord_\('lockedToast'/], ['foot', /kitWord_\('foot'/]].forEach(([k, rx]) => {
  check(rx.test(app), 'app.js reads "' + k + '" from the registry rather than printing a literal');
});
/* J1's agent wording still EXISTS in app.js — deliberately, as the fallback a
   browser holding a pre-change themes.json falls back to (DFM 189: the cached
   copy can be up to five minutes old, and a blank sentence is worse than an old
   one). What must be true is that it exists in exactly ONE place, the fallback
   table, and is never printed straight onto a screen. */
const fbTable = (app.match(/var KIT_WORD_FALLBACK = \{[\s\S]*?\n *\};/) || [''])[0];
check(fbTable.length > 0, 'app.js declares ONE fallback table for the kit words');
const LITERALS = ['Clearance upgraded', 'your Agent File', 'completing missions', 'XP to go, Agent'];
LITERALS.forEach(what => {
  const total = app.split(what).length - 1;
  const inTable = fbTable.split(what).length - 1;
  check(total > 0 && total === inTable,
    'J1\'s "' + what + '" lives ONLY in that fallback table (' + total + ' occurrence(s), ' +
    inTable + ' of them in the table) — never printed as a literal onto a shared screen');
});

/* ------------------------------------------------------------------ 5 */
section('THE NEW fx LAYERS EXIST AND OBEY THE COMPOSITOR RULE');
/* RE-PINNED 17 Aug 2026, deliberately, after his K17(d): "barely any difference
   in them and, worse, hardly a shred of animation... the colours are pretty
   dull." Two of the six J2/J3 looks had NO fx at all and each year's level-2
   unlock reused its own default's effect, so equipping one changed nothing you
   could see. Every look now has motion of its own, and this section grew with
   them: it used to know about two effects, and it now knows about all six and
   would fail if any look went back to having none. */
const YEAR_FX = {
  workbench: 'embers', copperline: 'copperglow', firewall: 'guardveil',
  screeningroom: 'spotlight', premiere: 'flashbulbs', cuttingroom: 'silverdust'
};
Object.keys(YEAR_FX).forEach(id => {
  const fx = YEAR_FX[id];
  const t = themeById(id);
  check(!!t && t.fx === fx, 'the ' + id + ' look carries its own "' + fx + '" motion');
  check(new RegExp("\\b" + fx + ":").test(app), 'app.js builds the "' + fx + '" layer');
  check(new RegExp('\\.fx-' + fx + '\\b').test(css), 'and style.css styles .fx-' + fx);
});
/* EVERY LOOK OF EVERY NEW YEAR HAS MOTION — the whole point of his finding.
   A look with no fx is what he was shown, so it is a failure now, not a gap. */
reg.themes.filter(t => t.year === 'j2' || t.year === 'j3').forEach(t => {
  check(!!t.fx, t.id + ' has an animation at all (his "hardly a shred of animation")');
});
/* and no two looks WITHIN a year share one, or an unlock animates exactly like
   the thing it replaced — which is what made them feel identical */
['j2', 'j3'].forEach(y => {
  const fxs = reg.themes.filter(t => t.year === y).map(t => t.fx);
  check(new Set(fxs).size === fxs.length,
    y + "'s " + fxs.length + ' looks each animate differently (' + fxs.join(', ') + ')');
});
check(themeById(DEFAULTS.j2) && themeById(DEFAULTS.j2).fx === 'embers', 'the Workbench drifts embers');
check(themeById(DEFAULTS.j3) && themeById(DEFAULTS.j3).fx === 'spotlight', 'the Screening Room sweeps a spotlight');
/* HIS K21 LAW, 17 Aug 2026: ambient motion is ATMOSPHERE, never an EVENT.
   "the line through the screen is dreadful looking and needs removed... the
   vertical line that moves from left to right in the firewall skin is way too
   distracting... The goal is to have them be distinctive, ethereal, calm and
   beautiful and ANIMATED."
   The judgement half of this is his eye. The half a machine can hold is that
   the three shapes he named never come back, and that every LARGE piece of
   light is blurred — a big element with a hard edge is exactly what a
   travelling line is made of. Particles are exempt by being particles. */
['fx-seam', 'fx-seam-gleam', 'fx-scan', 'fx-blocked', 'fx-head', 'fx-sprockets']
  .forEach(dead => check(css.indexOf('.' + dead) === -1,
    'the travelling ' + dead.replace('fx-', '') + ' he had removed has not come back'));
['copperpour', 'firescan', 'playhead'].forEach(dead => {
  check(!reg.themes.some(t => t.fx === dead), 'no look uses the retired "' + dead + '" effect');
});
const BIG_LIGHT = ['fx-wash', 'fx-bloom', 'fx-veil', 'fx-beam', 'fx-sheen', 'fx-flash'];
BIG_LIGHT.forEach(cls => {
  const at = css.indexOf('.' + cls + ' {') !== -1 ? css.indexOf('.' + cls + ' {') : css.indexOf('.' + cls);
  const blk = at === -1 ? '' : css.slice(at, css.indexOf('}', at));
  check(/filter:\s*blur/.test(blk),
    '.' + cls + ' is BLURRED — a large shape with a hard edge is how a travelling line is made');
});
/* and every J2/J3 look carries the shared breath he asked for by name */
check((app.match(/wash\(\)/g) || []).length >= 7,
  'every year look carries the wallpaper breath ("as if the whole wallpaper was gently pulsing")');
check(/is-drifting/.test(app) && /skyDrift/.test(css),
  'and the starfield drifts on the year looks ("the little stars gently move around the screen")');
check(/theme && theme\.drift/.test(app),
  'the drift is gated on the LOOK\'s own flag, so J1\'s pixel-pinned starfield never moves');

/* the compositor rule, asserted on the new blocks only — the shell's existing
   .aurora blur is approved and predates it */
const fxBlock = css.slice(css.indexOf('#fx-layer'));
const newFx = fxBlock.slice(0, fxBlock.indexOf('@media') > 0 ? fxBlock.indexOf('@media') : fxBlock.length);
ctrl(!/background-attachment:\s*fixed/.test(newFx),
  'no background-attachment:fixed anywhere in the fx layers (the Chrome compositor rule)');
/* THE KEYFRAMES, READ PROPERLY. The first cut of this control matched nothing
   and printed a clean pass on an empty list — a check that cannot fail is false
   assurance. It names every new keyframe block, asserts each was FOUND, and
   asserts each yielded properties before judging them. */
const NEW_KEYFRAMES = ['washBreathe', 'skyDrift', 'emberRise', 'forgeBreathe', 'bloomBreathe',
  'veilBreathe', 'driftUp', 'beamSweep', 'moteFloat', 'houseGlow', 'marqueeChase', 'bulbPop',
  'sheenBreathe', 'dustDrift'];
let allProps = [];
NEW_KEYFRAMES.forEach(name => {
  /* read the block by MATCHING ITS BRACES, not by regex. The old pattern ran to
     the first "\n}", which for a keyframe written on one line is somewhere in
     the next rule entirely — so it swallowed neighbouring CSS and then condemned
     the properties it found there. A gate that invents a fault is worse than no
     gate (DFM 146a). */
  const blk = (() => {
    const at = css.indexOf('@keyframes ' + name);
    if (at === -1) return '';
    let i = css.indexOf('{', at), depth = 0;
    if (i === -1) return '';
    for (let j = i; j < css.length; j++) {
      if (css[j] === '{') depth++;
      else if (css[j] === '}') { depth--; if (depth === 0) return css.slice(i, j + 1); }
    }
    return '';
  })();
  ctrl(blk.length > 0, 'the "' + name + '" keyframes are present to inspect');
  const props = [...blk.matchAll(/[{;]\s*([a-z-]+)\s*:/g)].map(x => x[1]);
  ctrl(props.length > 0, '  and it declares ' + props.length + ' animated propert(ies) to judge');
  allProps = allProps.concat(props);
});
/* background-position is the one addition: a marquee of bulbs and a strip of
   sprocket holes scroll their own background, which the compositor handles
   without a layout pass. Nothing here touches geometry. */
const LEGAL = ['transform', 'opacity', 'background-position'];
const illegal = [...new Set(allProps)].filter(p => LEGAL.indexOf(p) === -1);
ctrl(illegal.length === 0,
  'and every one of them is transform, opacity or background-position — nothing that forces a reflow (found: ' +
  [...new Set(allProps)].join(', ') + (illegal.length ? ' — ILLEGAL: ' + illegal.join(', ') : '') + ')');
/* AND EVERY MOVING PART IS HELD STILL for a pupil who asked for less motion. A
   new effect that forgets the reduced-motion block would animate at her anyway. */
const rm = css.slice(css.indexOf('@media (prefers-reduced-motion'));
['fx-wash', 'fx-ember', 'fx-forge', 'fx-bloom', 'fx-veil', 'fx-glint',
 'fx-beam', 'fx-mote', 'fx-house', 'fx-marquee', 'fx-flash', 'fx-sheen', 'fx-dust']
  .forEach(cls => check(rm.indexOf('.' + cls) !== -1,
    '.' + cls + ' is held still under prefers-reduced-motion'));

console.log('');
if (FAILS.length) {
  console.log('qa-year-worlds: ' + FAILS.length + ' FAILURE(S)');
  FAILS.forEach(f => console.log('   ' + f));
  process.exit(1);
}
console.log('qa-year-worlds: ALL GREEN — three years, three worlds, J1 identical at the resolution,');
console.log('the wardrobes renamed and explained, and no year reading another year\'s fiction.');
