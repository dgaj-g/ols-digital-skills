#!/usr/bin/env node
/* gates/g0-server.js — the server's own gate (before any surface). Runs the REAL built Code.gs.
 *   A  pack -> unpack -> judge equals judge, 40 well-formed random answers on each of the 82 questions (in a vm).
 *   B  the API through the dev harness (spawned on :8768 with a scratch store): guard codes, staff door, classes, marking
 *      (incomplete refused, repeat returns the stored result), cards (rating needed, first save wins, order enforced),
 *      rounds (one pupil only; closed round refused; round 1 intact), flags on the tracker (two fire, a control stays
 *      silent), CSV columns, drafts, clearMe, and the storage cost of one pupil-round.
 * The bank and judge are read from the private DESIGN folder at run time; nothing private is written into this repo.
 * Output: gates/out/g0-server.txt. Exit 1 on any failure. */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const http = require('http');
const { spawn } = require('child_process');

const ROOT = path.join(__dirname, '..');
const DESIGN = process.env.S1U1_DESIGN || '/Users/damiengartland/Desktop/Claude Work/S1 Unit 1 Platform';
const Judge = require(path.join(DESIGN, 'judge', 'judge.js'));
const BANK = require(path.join(DESIGN, 'content', 'bank_digital_data.js'));
const Policy = require(path.join(ROOT, 'platform', 'sitpolicy.js'));
const OUT = path.join(ROOT, 'gates', 'out', 'g0-server.txt');
const PORT = 8768;
const STORE = path.join(DESIGN, 'gates', 'g0-store.json');
const PASS = (fs.readFileSync(path.join(DESIGN, 'STAFF_PASSCODE.txt'), 'utf8').split('\n').map((l) => l.trim()).filter(Boolean))[1];

const lines = [];
let fails = 0;
const ok = (cond, msg) => { lines.push((cond ? 'PASS ' : 'FAIL ') + msg); if (!cond) fails++; };
const allQ = [];
BANK.stages.forEach((s) => s.questions.forEach((q) => allQ.push(Object.assign({ st: s.n }, { q }))));

// ---------- A: pack round trip in a vm ----------
const ctx = { console, PropertiesService: {}, Session: {}, LockService: {}, UrlFetchApp: {}, ScriptApp: {}, Utilities: {}, SpreadsheetApp: {}, HtmlService: {} };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(DESIGN, 'deploy', 'Code.gs'), 'utf8'), ctx, { filename: 'Code.gs' });
function rnd(seed) { return Judge.rng(seed); }
function randAnswer(q, v, r) { // well-formed and complete; right answers often, from the bank (gate only)
  const pickFrom = (opts, n, keys) => { const pool = r() < 0.5 && keys ? Judge.shuffle(opts.filter((o) => keys.indexOf(o) !== -1), r).concat(Judge.shuffle(opts, r)) : Judge.shuffle(opts, r); const out = []; pool.forEach((o) => { if (out.length < n && out.indexOf(o) === -1) out.push(o); }); return out; };
  if (v.form === 'pick1' || v.form === 'pickN') return { picks: pickFrom(v.options, v.n, q.keys) };
  if (v.form === 'writepick') return { text: r() < 0.3 ? '' : 'some words ' + Math.floor(r() * 99), skipped: r() < 0.3, parts: v.parts.map((p, k) => ({ picks: pickFrom(p.options, p.n, q.parts[k].keys) })) };
  if (v.form === 'type') return { texts: q.items.map((it) => (r() < 0.5 ? it.accept[Math.floor(r() * it.accept.length)] : 'nope ' + Math.floor(r() * 9))) };
  if (v.form === 'pairs') return { map: v.left.map(() => v.right[Math.floor(r() * v.right.length)]) };
  if (v.form === 'choose') return { choices: v.items.map((it) => it.opts[Math.floor(r() * it.opts.length)]) };
  if (v.form === 'gaps') return { fills: q.gaps.map((g) => (v.pool ? v.pool[Math.floor(r() * v.pool.length)] : r() < 0.5 ? g.accept[0] : 'zzz')) };
  return {};
}
let trips = 0, tripFail = 0;
allQ.forEach(({ q }) => {
  for (let t = 0; t < 40; t++) {
    const seed = 'pupil' + t + '@c2ken.net|' + (1 + (t % 3));
    const v = ctx.viewFor_('pupil' + t + '@c2ken.net', 1 + (t % 3), q);
    const r = rnd(seed + '|a|' + q.id);
    const a = randAnswer(q, v, r);
    const direct = Judge.judge(q, a, v);
    const back = ctx.unpack_(v, JSON.parse(JSON.stringify(ctx.pack_(v, a))));
    const via = Judge.judge(q, back, v);
    trips++;
    if (direct.marks !== via.marks || JSON.stringify(direct.per) !== JSON.stringify(via.per) || JSON.stringify(direct.parts || null) !== JSON.stringify(via.parts || null)) {
      tripFail++; if (tripFail < 4) lines.push('  trip mismatch ' + q.id + ' ' + JSON.stringify(a).slice(0, 120));
    }
  }
});
ok(tripFail === 0, 'A pack->unpack->judge == judge on ' + trips + ' answers across ' + allQ.length + ' questions (' + tripFail + ' mismatches)');
// cleaning: a pick that is not an option, and a duplicate, are dropped
{
  const q = allQ.find((x) => x.q.form === 'pickN').q, v = ctx.viewFor_('x@c2ken.net', 1, q);
  const cleaned = ctx.unpack_(v, ctx.pack_(v, { picks: [v.options[0], v.options[0], 'NOT AN OPTION'] }));
  ok(cleaned.picks.length === 1 && cleaned.picks[0] === v.options[0], 'A cleaning drops duplicate and unknown picks (' + q.id + ')');
}
ok(!('keys' in ctx.viewFor_('x@c2ken.net', 1, allQ[0].q)) && allQ.every(({ q }) => !/"(keys|accept|dis|pairs|key)":/.test(JSON.stringify(ctx.viewFor_('x@c2ken.net', 1, q)))), 'A no view carries keys, accept lists, distractor lists or pair keys');

// ---------- B: the API through the harness ----------
function post(p, body, user) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body || {});
    const req = http.request({ host: '127.0.0.1', port: PORT, path: p, method: 'POST', headers: { 'content-type': 'application/json', 'x-dev-user': user || 'pupil1@c2ken.net', 'content-length': Buffer.byteLength(data) } }, (res) => {
      let b = ''; res.on('data', (c) => (b += c)); res.on('end', () => { try { resolve(JSON.parse(b)); } catch (e) { reject(new Error(p + ': ' + b.slice(0, 200))); } });
    });
    req.on('error', reject); req.end(data);
  });
}
const api = (fn, req, user) => post('/api/' + fn, req, user);
const OWNER = 'dgartland021@c2ken.net';

async function main() {
  try { fs.unlinkSync(STORE); } catch (e) {}
  const child = spawn(process.execPath, [path.join(ROOT, 'tools', 'dev-server.js'), String(PORT)], { env: Object.assign({}, process.env, { S1U1_STORE: STORE }), stdio: ['ignore', 'pipe', 'pipe'] });
  let log = ''; child.stdout.on('data', (d) => (log += d)); child.stderr.on('data', (d) => (log += d));
  for (let i = 0; i < 50 && !/harness on/.test(log); i++) await new Promise((r) => setTimeout(r, 100));
  try { await flows(); } catch (e) { ok(false, 'B threw: ' + (e && e.stack || e)); }
  child.kill();
  if (/Error/.test(log)) lines.push('harness log: ' + log.split('\n').filter((l) => /Error/.test(l)).slice(0, 5).join(' | '));
  const head = 'G0 server ' + (fails ? 'RED' : 'GREEN') + ' · ' + new Date().toISOString() + ' · build ' + fs.readFileSync(path.join(DESIGN, 'deploy', 'BUILD.txt'), 'utf8').trim();
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, [head].concat(lines).join('\n') + '\n');
  console.log(head); lines.filter((l) => !/^PASS/.test(l)).forEach((l) => console.log(l)); console.log(lines.filter((l) => /^PASS/.test(l)).length + ' passes');
  process.exit(fails ? 1 : 0);
}

async function playStage(user, cls, round, st, opts) {
  const s = await api('apiStage', { cls, topic: 'digital-data', round, stage: st }, user);
  let sum = 0, n = 0;
  for (let i = 0; i < s.order.length; i++) {
    if (opts && opts.limit != null && n >= opts.limit) break;
    const qid = s.order[i], v = s.views[i];
    if (s.done[qid]) continue;
    const a = Policy.answer(v, user + '|' + round);
    const r = await api('apiMark', { cls, topic: 'digital-data', round, qid, answer: a, idk: !!a.idk }, user);
    if (!r.ok) throw new Error('mark ' + qid + ' ' + r.error);
    const q = allQ.find((x) => x.q.id === qid).q;
    const want = Judge.judge(q, a.idk ? { texts: v.items.map(() => '') } : a, v).marks;
    if (r.r.marks !== want) throw new Error('marks differ on ' + qid + ': server ' + r.r.marks + ' node ' + want);
    sum += r.r.marks; n++;
  }
  return { s, sum, n };
}

async function flows() {
  const T = 'digital-data';
  let r = await api('apiBoot', { cls: '' });
  ok(r.ok && r.staff === true, 'B boot with no class is the staff door');
  r = await api('apiBoot', { cls: 'nope' });
  ok(!r.ok && r.error === 'unknown-class', 'B unknown class refused (' + r.error + ')');
  r = await api('apiBoot', { cls: 'x' }, 'someone@gmail.com');
  ok(!r.ok && r.error === 'domain', 'B non-c2ken account refused (' + r.error + ')');
  r = await api('apiStaff', { op: 'check' }, 'teacher2@c2ken.net');
  ok(r.ok && r.admitted === false, 'B staff door: stranger without passcode not admitted');
  r = await api('apiStaff', { op: 'classes' }, 'teacher2@c2ken.net');
  ok(!r.ok && r.error === 'not-staff', 'B staff ops refused before the passcode');
  r = await api('apiStaff', { op: 'check', pass: 'wrong-one-11' }, 'teacher2@c2ken.net');
  ok(!r.ok && r.error === 'bad-pass', 'B wrong passcode refused');
  r = await api('apiStaff', { op: 'check', pass: PASS }, 'teacher2@c2ken.net');
  ok(r.ok && r.admitted, 'B right passcode admits');
  r = await api('apiStaff', { op: 'check' }, 'teacher2@c2ken.net');
  ok(r.ok && r.admitted, 'B passcode remembered for that account');
  r = await api('apiStaff', { op: 'check' }, OWNER);
  ok(r.ok && r.admitted && r.owner, 'B owner admitted by email');
  r = await api('apiStaff', { op: 'create', name: '11A DT' }, OWNER);
  ok(r.ok && r.slug === '11a-dt', 'B class made: 11A DT -> 11a-dt');
  r = await api('apiStaff', { op: 'create', name: '11a dt' }, OWNER);
  ok(!r.ok && r.error === 'taken', 'B same class name refused');
  r = await api('apiStaff', { op: 'create', name: '   ' }, OWNER);
  ok(!r.ok && r.error === 'bad-name', 'B blank class name refused');
  const cls = '11a-dt';

  // topic locking (DECISIONS §16): a new class starts locked; staff open and lock it; a class made before locking stays open
  r = await api('apiStaff', { op: 'topics', cls }, OWNER);
  ok(r.ok && r.topics.length === 1 && r.topics[0].id === T && r.topics[0].open === false, 'B a new class starts with Digital Data locked');
  r = await api('apiBoot', { cls }, 'early@c2ken.net');
  ok(r.ok && r.topic.open === false, 'B pupil boot says the topic is locked');
  r = await api('apiStage', { cls, topic: T, round: 1, stage: 1 }, 'early@c2ken.net');
  ok(!r.ok && r.error === 'locked', 'B locked: a stage will not load (' + r.error + ')');
  r = await api('apiMark', { cls, topic: T, round: 1, qid: BANK.stages[0].questions[0].id, answer: {} }, 'early@c2ken.net');
  ok(!r.ok && r.error === 'locked', 'B locked: nothing is marked (' + r.error + ')');
  r = await api('apiEval', { cls, topic: T, round: 1, stage: 1, payload: { rating: 3 } }, 'early@c2ken.net');
  ok(!r.ok && r.error === 'locked', 'B locked: no stage card is saved (' + r.error + ')');
  const q1 = BANK.stages[0].questions[0].id;
  r = await api('apiDraft', { cls, topic: T, round: 1, qid: q1, text: 'kept while locked' }, 'early@c2ken.net');
  ok(r.ok, 'B locked: typed writing is still saved as a draft');
  r = await api('apiStaff', { op: 'setTopic', cls, topic: T, open: true }, 'early@c2ken.net');
  ok(!r.ok && r.error === 'not-staff', 'B a pupil cannot open a topic');
  r = await api('apiStaff', { op: 'setTopic', cls, topic: 'networks', open: true }, OWNER);
  ok(!r.ok && r.error === 'bad-topic', 'B a topic not built yet cannot be opened');
  r = await api('apiStaff', { op: 'setTopic', cls, topic: T, open: true }, 'teacher2@c2ken.net');
  ok(r.ok && r.open === true, 'B passcode staff open Digital Data');
  r = await api('apiStaff', { op: 'classes' }, OWNER);
  ok(r.ok && r.classes.filter((c) => c.slug === cls)[0].open === true, 'B the class list shows it open');
  r = await api('apiStaff', { op: 'setTopic', cls, topic: T, open: false }, OWNER);
  const relock = await api('apiStage', { cls, topic: T, round: 1, stage: 1 }, 'early@c2ken.net');
  ok(r.ok && r.open === false && !relock.ok && relock.error === 'locked', 'B locked again: the stage refuses again');
  r = await api('apiStaff', { op: 'setTopic', cls, topic: T, open: true }, OWNER);
  const reopen = await api('apiStage', { cls, topic: T, round: 1, stage: 1 }, 'early@c2ken.net');
  ok(r.ok && reopen.ok && reopen.views.length === 27 && reopen.drafts[q1] === 'kept while locked', 'B opened again: the stage loads with the writing typed while locked');
  await post('/__set', { script: { 'cls:old-9z': JSON.stringify({ name: 'Old 9Z', o: OWNER, c: 1, r: { 'digital-data': 1 } }) } });
  r = await api('apiBoot', { cls: 'old-9z' }, 'early@c2ken.net');
  const oldSt = await api('apiStage', { cls: 'old-9z', topic: T, round: 1, stage: 1 }, 'early@c2ken.net');
  ok(r.ok && r.topic.open === true && oldSt.ok, 'B a class made before topic locking stays open');

  r = await api('apiBoot', { cls });
  ok(r.ok && r.name === 'Aoife' && !r.needName && r.topic.round === 1 && r.topic.stages.length === 4, 'B pupil boot: name from the account, round 1, four stages');
  const nn = await api('apiBoot', { cls }, 'noname7@c2ken.net');
  ok(nn.ok && nn.needName, 'B no readable name -> needName');
  r = await api('apiName', { cls, name: 'Orla' }, 'noname7@c2ken.net');
  ok(r.ok && r.name === 'Orla', 'B name typed and kept');
  r = await api('apiName', { cls, name: '<b>x</b>' }, 'noname7@c2ken.net');
  ok(!r.ok, 'B a name with markup refused');

  const s1 = await api('apiStage', { cls, topic: T, round: 1, stage: 1 });
  const wantOrder = Judge.shuffle(BANK.stages[0].questions.map((q) => q.id), Judge.rng('pupil1@c2ken.net|1|1'));
  ok(s1.ok && s1.views.length === 27 && JSON.stringify(s1.order) === JSON.stringify(wantOrder), 'B stage 1: 27 views in the seeded order');
  ok(!/"keys"|"accept"|"dis"|"key":/.test(JSON.stringify(s1.views)) && Object.keys(s1.done).length === 0, 'B stage views carry no keys; nothing marked yet');
  const v0 = s1.views[0], q0 = s1.order[0];
  r = await api('apiMark', { cls, topic: T, round: 1, qid: q0, answer: {} });
  ok(!r.ok && r.error === 'incomplete', 'B an incomplete answer is refused, not marked 0');
  const a0 = Policy.answer(v0, 'pupil1@c2ken.net|1');
  r = await api('apiMark', { cls, topic: T, round: 1, qid: q0, answer: a0, idk: !!a0.idk });
  const first = r;
  ok(r.ok && !r.repeat && typeof r.r.marks === 'number' && r.r.scheme && r.r.scheme.lines.length, 'B marked: result + mark scheme come back');
  const other = v0.options ? { picks: v0.options.slice(0, v0.n).reverse() } : a0;
  r = await api('apiMark', { cls, topic: T, round: 1, qid: q0, answer: other });
  ok(r.ok && r.repeat && r.r.marks === first.r.marks && JSON.stringify(r.a) === JSON.stringify(first.a), 'B repeat submission returns the stored result unchanged');
  r = await api('apiFlag', { cls, topic: T, round: 1, qid: s1.order[1], on: true });
  ok(!r.ok && r.error === 'not-marked', 'B cannot flag an unmarked question');
  r = await api('apiFlag', { cls, topic: T, round: 1, qid: q0, on: true });
  ok(r.ok && r.f === true, 'B flag a marked question');
  r = await api('apiEval', { cls, topic: T, round: 1, stage: 1, payload: { rating: 3 } });
  ok(!r.ok && r.error === 'not-finished', 'B stage card refused before the stage is finished');
  // drafts
  r = await api('apiDraft', { cls, topic: T, round: 1, qid: s1.order[2], text: 'half an answer' });
  const s1b = await api('apiStage', { cls, topic: T, round: 1, stage: 1 });
  ok(r.ok && s1b.drafts[s1.order[2]] === 'half an answer' && s1b.done[q0] && s1b.done[q0].f === true, 'B draft kept; marked question and its flag restore');

  // play the whole round for pupil1
  let total = 0, sums = [];
  for (let st = 1; st <= 4; st++) { const p = await playStage('pupil1@c2ken.net', cls, 1, st); total += p.sum + (st === 1 ? first.r.marks : 0); sums.push(p.sum); }
  const s1c = await api('apiStage', { cls, topic: T, round: 1, stage: 1 });
  ok(Object.keys(s1c.drafts).length === 0, 'B drafts deleted once marked');
  r = await api('apiEval', { cls, topic: T, round: 1, stage: 'topic', payload: { rating: 2, unsure: [1], note: '' } });
  ok(!r.ok && r.error === 'not-finished', 'B topic card refused before the four stage cards');
  r = await api('apiEval', { cls, topic: T, round: 1, stage: 1, payload: { ticks: [1] } });
  ok(!r.ok && r.error === 'no-rating', 'B stage card needs a rating');
  for (let st = 1; st <= 4; st++) {
    r = await api('apiEval', { cls, topic: T, round: 1, stage: st, payload: { rating: st, ticks: [1, 0, 1], stageNote: st === 2 ? 'vectors' : '' } });
    if (!r.ok) ok(false, 'B stage card ' + st + ' ' + r.error);
  }
  ok(r.ok && r.allCards === true && r.done === false, 'B four stage cards saved -> allCards');
  r = await api('apiEval', { cls, topic: T, round: 1, stage: 1, payload: { rating: 4 } });
  ok(r.ok && r.repeat && r.e.rating === 1, 'B first save wins on a stage card');
  r = await api('apiEval', { cls, topic: T, round: 1, stage: 'topic', payload: { rating: 3, unsure: [0, 2], note: 'fine' } });
  ok(r.ok && r.done && JSON.stringify(r.e.unsure) === '[0]', 'B topic card saved; "fine" is exclusive');
  r = await api('apiBoot', { cls });
  const R1 = r.topic.rounds['1'];
  const m1 = [1, 2, 3, 4].reduce((t, k) => t + R1.s[k].m, 0), a1 = [1, 2, 3, 4].reduce((t, k) => t + R1.s[k].a, 0);
  ok(R1.done && a1 === 82 && m1 === total, 'B round 1 done: 82 answered, totals ' + m1 + ' = node judge ' + total);
  ok(R1.s[1].f.length === 1 && R1.s[1].f[0].id === q0, 'B flag shows on the round summary');

  // storage cost of one pupil-round
  const store = await post('/__store', {});
  const mine = Object.entries(store.script).filter(([k]) => k.indexOf(':pupil1@c2ken.net') !== -1);
  const bytes = mine.reduce((n, [k, v]) => n + k.length + v.length, 0);
  ok(bytes < 4096, 'B one pupil-round costs ' + bytes + ' bytes of Script Properties (budget 4096)');
  const big = Object.entries(store.script).reduce((m, [k, v]) => Math.max(m, k.length + v.length), 0);
  ok(big < 9216, 'B largest single value ' + big + ' bytes (< 9 KB)');

  // rounds: pupil2 part-way, pupil3 untouched
  await api('apiBoot', { cls }, 'pupil2@c2ken.net'); await api('apiBoot', { cls }, 'pupil3@c2ken.net');
  const p2 = await playStage('pupil2@c2ken.net', cls, 1, 1, { limit: 5 });
  r = await api('apiStaff', { op: 'openPupil', cls, email: 'pupil1@c2ken.net' }, OWNER);
  ok(r.ok && r.round === 2, 'B open round 2 for one pupil');
  const b1 = await api('apiBoot', { cls }), b3 = await api('apiBoot', { cls }, 'pupil3@c2ken.net'), b2 = await api('apiBoot', { cls }, 'pupil2@c2ken.net');
  ok(b1.topic.round === 2 && b3.topic.round === 1 && b2.topic.round === 1, 'B only that pupil moved (pupil1 2, pupil2 1, pupil3 1)');
  ok(b1.topic.rounds['1'].done && [1, 2, 3, 4].reduce((t, k) => t + b1.topic.rounds['1'].s[k].m, 0) === m1, 'B round 1 intact after round 2 opens');
  const r2 = await api('apiStage', { cls, topic: T, round: 2, stage: 1 });
  ok(r2.ok && JSON.stringify(r2.order) !== JSON.stringify(s1.order) && Object.keys(r2.done).length === 0, 'B round 2 is a new draw with nothing marked');
  const ro = await api('apiStage', { cls, topic: T, round: 1, stage: 1 });
  ok(ro.readOnly === true && Object.keys(ro.done).length === 27, 'B round 1 looks back read-only with all 27 answers');
  r = await api('apiStaff', { op: 'openClass', cls }, OWNER);
  ok(r.ok && r.round === 2, 'B open round 2 for the class');
  const unmarked = p2.s.order.find((id) => !p2.s.done[id] && p2.s.order.indexOf(id) >= 5);
  r = await api('apiMark', { cls, topic: T, round: 1, qid: unmarked, answer: Policy.answer(p2.s.views[p2.s.order.indexOf(unmarked)], 'x') }, 'pupil2@c2ken.net');
  ok(!r.ok && r.error === 'round-closed', 'B a closed round cannot be marked (' + r.error + ')');
  r = await api('apiBoot', { cls }, 'pupil2@c2ken.net');
  ok(r.topic.round === 2 && r.topic.rounds['1'].s[1].a === 5, 'B pupil2 now on round 2; round 1 keeps its 5 answers');
  r = await api('apiStaff', { op: 'openPupil', cls, email: 'pupil1@c2ken.net' }, OWNER);
  ok(r.ok && r.round === 3, 'B a pupil ahead of the class goes one further (3)');

  // tracker flags on synthetic records
  const syn = (e, m) => ({ s: { 1: { a: 27, m: m[0], f: [], e: e[0] }, 2: { a: 19, m: m[1], f: [], e: e[1] }, 3: { a: 14, m: m[2], f: [], e: e[2] }, 4: { a: 22, m: m[3], f: ['S4-N7'], e: e[3] } } });
  const x = BANK.stages.map((s) => s.questions.reduce((t, q) => t + q.marks, 0));
  await post('/__set', { script: {
    'p:11a-dt:flaghigh@c2ken.net': JSON.stringify({ n: 'High', j: 1, o: {}, R: { 2: syn([{ r: 4, t: [1] }, { r: 3, t: [1] }, null, null], [Math.floor(x[0] * 0.49), Math.floor(x[1] * 0.2), 0, 0]) } }),
    'p:11a-dt:flaglow@c2ken.net': JSON.stringify({ n: 'Low', j: 1, o: {}, R: { 2: syn([{ r: 1, t: [0] }, { r: 2, t: [0] }, null, null], [Math.ceil(x[0] * 0.75), x[1], 0, 0]) } }),
    'p:11a-dt:control@c2ken.net': JSON.stringify({ n: 'Control', j: 1, o: {}, R: { 2: syn([{ r: 3, t: [1] }, { r: 2, t: [1] }, { r: 4, t: [] }, { r: 1, t: [] }], [Math.ceil(x[0] * 0.5), Math.floor(x[1] * 0.74), x[2], 0]) } }),
  } });
  r = await api('apiStaff', { op: 'tracker', cls, round: 2 }, OWNER);
  const row = (em) => r.rows.find((w) => w.email === em);
  const hi = row('flaghigh@c2ken.net'), lo = row('flaglow@c2ken.net'), co = row('control@c2ken.net');
  ok(hi && hi.s[1].flags.join() === "Thinks it's fine, isn't" && hi.s[2].flags.join() === "Thinks it's fine, isn't", "B flag \"Thinks it's fine, isn't\" fires (rating 3-4, under 50%)");
  ok(lo && lo.s[1].flags.join() === "Doing fine, doesn't think so" && lo.s[2].flags.join() === "Doing fine, doesn't think so", "B flag \"Doing fine, doesn't think so\" fires (rating 1-2, 75% or more)");
  ok(co && [1, 2, 3, 4].every((k) => co.s[k].flags.length === 0), 'B control record: rating 3 at 50%, rating 2 at 74%, rating 4 at 100%, rating 1 at 0% -> no flags');
  ok(r.maxRound === 3 && r.rows.length >= 6, 'B tracker lists every pupil; max round 3');
  ok(hi.s[4].fl.join() === 'new' || hi.s[4].fl.length === 1, 'B flagged questions shown by paper reference');
  r = await api('apiStaff', { op: 'csv', cls, round: 1 }, OWNER);
  const head = r.csv.split('\r\n')[0];
  ok(head === 'class,pupil,email,round,stage,marks,max,rating,ticks,stageNote,topicRating,unsure,note,flags,flagged', 'B CSV columns in order');
  const p1rows = r.csv.split('\r\n').filter((l) => l.indexOf('pupil1@c2ken.net') !== -1);
  const tk = ',2 of ' + BANK.stages[0].outcomes.length + ',';
  if (!(p1rows.length === 4 && p1rows[0].indexOf(tk) !== -1)) lines.push('  csv: ' + p1rows.join(' // ').slice(0, 600));
  ok(p1rows.length === 4 && p1rows[0].indexOf(tk) !== -1 && /No, I'm fine with all of it/.test(p1rows[0]), 'B CSV: 4 rows per pupil, ticks "2 of ' + BANK.stages[0].outcomes.length + '" (padded to the outcomes), unsure spelled out');
  r = await api('apiStaff', { op: 'pupil', cls, email: 'pupil1@c2ken.net', round: 1 }, OWNER);
  ok(r.ok && r.items.length === 82 && r.items.some((it) => it.text && it.words > 0), 'B pupil drawer: 82 marked items with the writing');
  r = await api('apiStaff', { op: 'rounds', cls }, OWNER);
  ok(r.ok && r.round === 2 && r.pupils.find((p) => p.email === 'pupil1@c2ken.net').round === 3, 'B rounds tab: class round 2, pupil1 on 3');
  r = await api('apiStaff', { op: 'classes' }, OWNER);
  ok(r.ok && r.classes.length === 1 && r.classes[0].pupils >= 6 && r.classes[0].mine, 'B classes tab lists the class with its pupils');
  // clearMe
  await api('apiBoot', { cls }, OWNER); await playStage(OWNER, cls, 2, 3, { limit: 3 });
  r = await api('apiStaff', { op: 'clearMe', cls }, OWNER);
  const st2 = await post('/__store', {});
  ok(r.ok && !Object.keys(st2.script).some((k) => k.indexOf(':' + OWNER) !== -1) && Object.keys(st2.script).some((k) => k.indexOf(':pupil1@c2ken.net') !== -1), 'B clearMe removes only the caller\'s record');
}
main();
