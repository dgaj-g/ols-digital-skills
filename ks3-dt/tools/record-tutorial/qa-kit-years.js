/* qa-kit-years.js — each year has its OWN rewards, and J1's are untouched.
 *
 * HIS K1 RULING, 14 Aug 2026, asked at the J2/J3 kickoff ("have you thought
 * about that?"): the rewards for J2 and J3 must be different from J1's — both in
 * what they are and in what they are called. He is "not sure I want J2 to be all
 * about the whole mission thing and agent thing, and J3 again needs to be
 * different." So the agent fiction, the Agent Kit and the Recruit→Star Commander
 * ladder stay J1's; J2 works at a bench and J3 works in a studio.
 *
 * THE RISK THIS FILE EXISTS FOR is not J2 or J3 — it is J1. Five signed-off
 * lessons read this registry for every rank name, every unlock and every word of
 * the clearance pop. A restructure that quietly changed one of them would break
 * lessons he has approved, in a place no lesson harness looks. So the first and
 * largest section here proves J1 IDENTICAL, value by value, against the registry
 * as it stood before the change — read from git, not from memory.
 *
 *   node qa-kit-years.js
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '../../..');
const SRC = process.env.KS3DT_SRC ||
  path.join(process.env.HOME, 'Desktop/Claude Work/KS3 DT Platform/content-src');
const REG = path.join(SRC, 'themes.json');
const APP = path.join(ROOT, 'ks3-dt/platform/app.js');
const SERVER = path.join(ROOT, 'ks3-dt/platform/server/Code.gs.template');
const DEV = path.join(ROOT, 'ks3-dt/platform/dev-server.js');
const PREFIX_REF = process.env.KS3DT_KITYEARS_PREFIX_REF || 'd39e2eb';

const FAILS = [];
const check = (ok, m) => { console.log((ok ? '  PASS  ' : '  FAIL  ') + m); if (!ok) FAILS.push(m); };
const ctrl = (ok, m) => { console.log((ok ? '  CTRL  ' : '  FAIL  ') + m); if (!ok) FAILS.push('CONTROL: ' + m); };
const section = (t) => console.log('\n== ' + t + ' ==');

const reg = JSON.parse(fs.readFileSync(REG, 'utf8'));
const before = JSON.parse(execSync(
  'git -C "' + ROOT + '" show ' + PREFIX_REF + ':ks3-dt/content/themes.json',
  { maxBuffer: 40 * 1024 * 1024 }).toString('utf8'));

/* the resolver, written ONCE here and asserted to match both shipped copies
   below — this file must not become a third implementation (DFM 144) */
function resolve(r, year) {
  const y = String(year || 'j1');
  const out = Object.assign({}, r);
  const by = r.clearancesByYear;
  out.clearances = (by && by[y]) || (by && by.j1) || r.clearances || [];
  const mine = (i) => (i && i.year) == null ? (y === 'j1') : (i.year === 'all' || String(i.year) === y);
  out.themes = (r.themes || []).filter(mine);
  out.insignia = (r.insignia || []).filter(mine);
  if (!out.themes.length) out.themes = (r.themes || []).filter(t => String(t.id) === 'midnight');
  out.kit = (r.kits && (r.kits[y] || r.kits.j1)) || null;
  return out;
}

console.log('qa-kit-years — per-year rewards (his K1 ruling), and J1 proved unchanged');
console.log('  registry: ' + REG + '\n  J1 baseline: ' + PREFIX_REF);

section('J1 IS IDENTICAL — the whole point of the exercise');
const j1 = resolve(reg, 'j1');
check(JSON.stringify(j1.clearances) === JSON.stringify(before.clearances),
  'J1\'s six clearance rows are byte-equal to ' + PREFIX_REF + ' (level, xp and NAME each unchanged)');
const stripYear = (a) => a.map(x => { const c = Object.assign({}, x); delete c.year; return c; });
check(JSON.stringify(stripYear(j1.themes)) === JSON.stringify(before.themes),
  'J1 sees exactly the same 12 themes, in the same order, with every value unchanged apart from the new year tag');
check(JSON.stringify(stripYear(j1.insignia)) === JSON.stringify(before.insignia),
  'and exactly the same 11 insignia');
check(j1.kit && j1.kit.name === 'Agent Kit',
  'J1\'s kit is still called the Agent Kit');
check(j1.kit && j1.kit.explainer === 'Your Agent Kit is kind of like this website’s own wardrobe or costumes!',
  'and its explaining sentence is his approved wording from DFM 87, character for character');
/* the pop CONCATENATES the explainer with the rest of the sentence, so the join
   is what a pupil actually reads — assert the joined string, not the parts */
const popJoin = j1.kit.explainer + ' It holds the looks and badge designs your console can wear,';
check(popJoin.indexOf('costumes! It holds the looks') > 0,
  'and the clearance pop still reads "…costumes! It holds the looks…" — the registry join reproduces the old literal');

section('EVERY J1 XP BREAKPOINT UNLOCKS EXACTLY WHAT IT USED TO');
/* the three pupil paths DFM 165 tuned the ladder to, plus each threshold's own
   boundary. If any of these moved, a signed-off lesson's reward changed. */
const xpFor = (r, lvl) => (r.clearances.find(c => Number(c.level) === Number(lvl)) || {}).xp;
const unlockedAt = (r, xp) => r.themes.filter(t => xp >= xpFor(r, t.clearance)).map(t => t.id).join(',');
const oldView = { clearances: before.clearances, themes: before.themes, insignia: before.insignia };
[0, 89, 90, 92, 110, 120, 124, 160, 164, 195, 199, 233, 235, 241, 275, 291].forEach(xp => {
  check(unlockedAt(j1, xp) === unlockedAt(oldView, xp),
    'at ' + xp + ' XP a J1 pupil unlocks the identical theme set');
});
[0, 90, 120, 160, 195, 235].forEach(xp => {
  const now = j1.clearances.filter(c => xp >= c.xp).pop();
  const was = before.clearances.filter(c => xp >= c.xp).pop();
  check(now && was && now.name === was.name && now.level === was.level,
    'at ' + xp + ' XP her rank still reads "' + (was || {}).name + '"');
});

section('J2 AND J3 ARE GENUINELY DIFFERENT (his K1 ruling)');
const j2 = resolve(reg, 'j2'), j3 = resolve(reg, 'j3');
/* HIS K11b RULING, 15 Aug 2026 supersedes the 14-Aug working names: the YEAR
   identities keep The Workshop / The Studio, and the WARDROBES get their own
   names, because "J2 · The Workshop" above a button that also opens "The
   Workshop" gives a pupil two true answers to one question (rule 52). */
check(j2.kit.name === 'The Kit Locker' && j3.kit.name === 'Wardrobe',
  'the kit is named per year: ' + j2.kit.name + ' / ' + j3.kit.name + ' — not an Agent Kit');
check(j2.kit.name !== 'The Workshop' && j3.kit.name !== 'The Studio',
  'and neither wardrobe shares its name with its own year (his K11b ruling)');
check(!/agent/i.test(j2.kit.explainer) && !/agent/i.test(j3.kit.explainer),
  'and neither explaining sentence uses the agent fiction (DFM 25 — a word she must decode is a cost)');
check(j2.clearances[0].name === 'Apprentice' && j3.clearances[0].name === 'Rookie',
  'the starting rank differs per year: ' + j2.clearances[0].name + ' / ' + j3.clearances[0].name);
check(j2.clearances[0].name !== j1.clearances[0].name && j3.clearances[0].name !== j1.clearances[0].name,
  'and neither is J1\'s "Recruit"');
check(j2.insignia.some(i => i.glyph === '🔧') && j3.insignia.some(i => i.glyph === '🎬'),
  'each year has its own insignia');

section('NOTHING PROMISES A LEVEL THAT DOES NOT EXIST (rule 35)');
/* the reason J2/J3 ship SHORT: their level-2 threshold is computed from that
   year's BUILT Lesson 1 floor path (DFM 165), and that lesson does not exist
   yet. A placeholder number would be a promise the kit modal could not keep. */
[['j2', j2], ['j3', j3]].forEach(([y, v]) => {
  check(v.clearances.length === 1 && Number(v.clearances[0].xp) === 0,
    y + ' ships level 1 only, at 0 XP — no invented threshold (DFM 165: computed, never from memory)');
  const levels = v.clearances.map(c => Number(c.level));
  check(v.themes.every(t => levels.indexOf(Number(t.clearance)) !== -1),
    y + '\'s every theme points at a level that exists');
  check(v.insignia.every(i => levels.indexOf(Number(i.clearance)) !== -1),
    y + '\'s every insignia points at a level that exists');
  check(v.themes.length >= 1, y + ' still has something to wear (' + v.themes.map(t => t.id).join(',') + ')');
});
/* AMENDED BY K11a (15 Aug): each year now has its OWN level-1 base look, so a
   J2 pupil at 0 XP no longer borrows J1's midnight — she opens on The Workbench.
   What has NOT changed is the thing this check was really for: she sees no J1
   costume at all. */
check(j2.themes.length === 1 && j2.themes[0].id === 'workbench',
  'a J2 pupil at 0 XP wears The Workbench and sees no J1 costume at all');
check(j3.themes.length === 1 && j3.themes[0].id === 'screeningroom',
  'and a J3 pupil wears The Screening Room');
check(!j2.themes.some(t => t.id === 'midnight') && !j3.themes.some(t => t.id === 'midnight'),
  'and midnight, re-tagged j1, is in neither year\'s wardrobe — so its "classic HQ interface" line reaches nobody but J1');

section('CONTROL — a year may not wear another year\'s looks');
const j1Only = reg.themes.find(t => t.year === 'j1');
ctrl(!!j1Only, 'there is a J1-tagged theme to try (' + (j1Only || {}).id + ')');
ctrl(!j2.themes.some(t => t.id === j1Only.id),
  'it is NOT in the J2 view, so the kit modal cannot offer it');
ctrl(!j3.themes.some(t => t.id === j1Only.id),
  'nor the J3 view');
/* the client filter is a convenience; THIS is the boundary */
const srv = fs.readFileSync(SERVER, 'utf8');
ctrl(/function kitFor_\(/.test(srv), 'the SERVER resolves the year itself (kitFor_)');
ctrl(/kitFor_\(kitRegistry_\(\), cls\.year\)/.test(srv),
  'and apiSetKit resolves from the CLASS\'s year, never a value the caller sends');
const dev = fs.readFileSync(DEV, 'utf8');
ctrl(/clearancesByYear/.test(dev) && /cls\.year/.test(dev),
  'and the preview server filters the same way, so the one testable copy is not the unenforced one');

section('CONTROL — the legacy reads, so a stale cache cannot strand a pupil');
/* localStorage survives a reload and is keyed by contentVersion (DFM 189), so a
   browser can hold a themes.json from before this change for up to five minutes
   after a push. It must still work. */
const legacy = { clearances: before.clearances, themes: before.themes, insignia: before.insignia };
const legacyJ1 = resolve(legacy, 'j1');
ctrl(JSON.stringify(legacyJ1.clearances) === JSON.stringify(before.clearances),
  'an OLD themes.json with no clearancesByYear still gives a J1 pupil her full ladder');
ctrl(legacyJ1.themes.length === before.themes.length,
  'and all 12 of her looks, because an untagged look is read as J1\'s');
const legacyJ2 = resolve(legacy, 'j2');
ctrl(legacyJ2.themes.length >= 1,
  'and a J2 pupil on that stale file is never left with an empty wardrobe (midnight is put back)');

section('THE THREE COPIES OF THE RULE AGREE');
/* DFM 157(a): a rule that lives in more than one place is a contract, and a
   harness holds the copies equal or one of them is lying. */
const app = fs.readFileSync(APP, 'utf8');
[['app.js', app], ['Code.gs.template', srv], ['dev-server.js', dev]].forEach(([name, src]) => {
  check(/clearancesByYear/.test(src), name + ' reads clearancesByYear');
  check(/'all'/.test(src) || /"all"/.test(src), name + ' honours the "all" tag (midnight, every year\'s default)');
  check(/clearances\b/.test(src), name + ' keeps the legacy flat-ladder fallback');
});
check(/App\.kitName/.test(app) && !/Open Agent Kit/.test(app),
  'and the kit NAME is no longer a literal in app.js — "Open Agent Kit" is gone, the button reads the registry');

console.log('');
if (FAILS.length) {
  console.log('qa-kit-years: ' + FAILS.length + ' FAILURE(S)');
  FAILS.forEach(f => console.log('   ' + f));
  process.exit(1);
}
console.log('qa-kit-years: ALL GREEN — J1 is value-for-value unchanged, J2 and J3 have their own');
console.log('rewards, nothing promises a level that does not exist, and no year can wear another\'s looks.');
