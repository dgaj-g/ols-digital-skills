#!/usr/bin/env node
/* gates/g0-server.js - the API contract gate (API.md). Builds the server into a scratch deploy folder, starts the dev harness
 * on port 8781 with a throw-away store, then calls every pupil and staff call over HTTP the way the page does. Right answers
 * come from the DESIGN banks (option text -> bank key), never from the server. Writes gates/out/g0.txt; exit 1 on any FAIL.
 * Usage: node gates/g0-server.js      (SOC_SCRATCH=<dir> moves the scratch folder; default <tmp>/soc-gates) */
'use strict';
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');
const { spawn } = require('child_process');
const { SCRATCH, sheet, pagePlan, build, redact, L } = require('./common.js');

const PORT = 8781, BASE = 'http://localhost:' + PORT;
const OWNER = 'dgartland021@c2ken.net', P1 = 'pupil1@c2ken.net', P2 = 'pupil2@c2ken.net', P3 = 'pupil3@c2ken.net';
const T2 = 'teacher2@c2ken.net', HOD = 'hod@c2ken.net';
const CLS = 'g0-class', OTHER = 'g0-other';
const ARCHIVE_AT = 400 * 1024;
const sh = sheet('g0');
const STORE = path.join(SCRATCH, 'g0-store.json');

const { banks } = L.readBanks(L.DESIGN);
const FIVE = Array.isArray(banks.five) ? banks.five : (banks.five && banks.five.qs) || [];
const PASS = L.readPass(L.DESIGN);

// ---------- HTTP ----------
async function call(fn, req, as) {
  const h = { 'content-type': 'application/json', 'x-dev-user': as === undefined ? P1 : as };
  const r = await fetch(BASE + '/api/' + fn, { method: 'POST', headers: h, body: JSON.stringify(req || {}) });
  const j = await r.json();
  if (j && j.__error) return { ok: false, error: '__error', detail: j.__error };
  return j;
}
const post = async (p, body) => (await fetch(BASE + p, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body || {}) })).json();
const store = () => post('/__store');
const staff = (op, x, as) => call('apiStaff', Object.assign({ op }, x || {}), as === undefined ? OWNER : as);
const E = (r) => (r && r.ok === false ? 'error ' + r.error + (r.detail ? ' (' + String(r.detail).slice(0, 120) + ')' : '') : 'ok');
const sum = (m) => Object.values(m || {}).reduce((t, v) => t + (Number(v) > 0 ? Number(v) : 0), 0);
const ptsOf = (H) => sum(H.b) + sum(H.pr) + sum(H.dl) + (H.dlx || 0) + sum(H.wk) + (H.wkx || 0);
const sizeOf = (all) => Object.keys(all).reduce((n, k) => n + k.length + String(all[k]).length, 0);
const unzipB64 = (s) => JSON.parse(zlib.gunzipSync(Buffer.from(String(s), 'base64')).toString('utf8'));
const flat = (v) => (typeof v === 'string' ? [v] : v && typeof v === 'object' ? Object.values(v).flatMap(flat) : []);

// ---------- per-check tallies (one line per check across all acts, failures named) ----------
const tally = {};
function t(name, act, ok, why) { const x = (tally[name] = tally[name] || { n: 0, bad: [] }); x.n++; if (!ok) x.bad.push(act + (why ? ' (' + why + ')' : '')); }
function flushTally() {
  for (const [name, x] of Object.entries(tally)) {
    if (x.bad.length) sh.fail(name, x.bad.length + ' of ' + x.n + ': ' + x.bad.slice(0, 8).join('; ') + (x.bad.length > 8 ? '; ...' : ''));
    else sh.pass(name, x.n + ' acts');
  }
}

// ---------- the view must carry no key ----------
const BANNED = ['k', 'why', 'model', 'whys', 'ph_k', 'ph_ok', 'lex', 'why_marks'];
function keyHits(o, form) {
  const hits = [];
  (function walk(v, p) {
    if (!v || typeof v !== 'object') return;
    for (const [k, x] of Object.entries(v)) {
      const q = p + '.' + k;
      if (BANNED.includes(k)) hits.push(q);
      if (k === 'then' && !(form === 'branch' && /^\.view\.steps\.\d+\.choices\.\d+$/.test(p))) hits.push(q);
      walk(x, q);
    }
  })(o, '');
  return hits;
}
// bank key text (why/whys/why_marks/model, 30+ characters) that must never be in an open reply. A key sentence that is also
// shown text somewhere (an option, a step, a card: a model is built from right options) or public in content/ is not counted.
const KEYTEXT = [], SHOWN = [];
(function visit(v) {
  if (!v || typeof v !== 'object') return;
  for (const [k, x] of Object.entries(v)) {
    if (['why', 'whys', 'why_marks', 'model'].includes(k)) flat(x).forEach((s) => { if (s.trim().length >= 30) KEYTEXT.push(s.trim()); });
    else if (!['k', 'ph_k', 'ph_ok', 'then', 'ao', 'lex'].includes(k)) { if (typeof x === 'string') SHOWN.push(x.trim()); else visit(x); }
  }
})(banks);
const shownText = SHOWN.concat(flat(L.readContent())).join('\u0000');
const KEYONLY = KEYTEXT.filter((s) => shownText.indexOf(s) === -1);

// ---------- right and wrong answers from the banks ----------
function bankOf(act) {
  let m;
  if ((m = /^(d5|w5)-(\d\d)$/.exec(act))) return { kind: 'five', q: FIVE[+m[2] - 1] };
  if ((m = /^(d10|w10)-(\d+)$/.exec(act))) return { kind: 'ten', q: banks['ten-q' + m[2]] };
  return { B: banks[act] };
}
const pickIn = (opts, o) => opts.indexOf(o);
function need(i, what) { if (i < 0 || i == null) throw new Error('cannot map ' + what + ' from the view to the bank'); return i; }
const FIVE_PART = { d: 'd', i2: 'i', e: 'e', t: 't' };
function builderRight(act, v) {
  const b = bankOf(act);
  if (b.kind === 'five') {
    const q = b.q;
    return v.slots.map((s) => (s.type === 'tap' ? q.ph_k.map((j) => need(s.phrases.indexOf(q.phrases[j]), 'phrase')).sort((x, y) => x - y)
      : need(pickIn(s.opts, q.build[FIVE_PART[s.part]].opts[q.build[FIVE_PART[s.part]].k]), act + ' slot ' + s.part)));
  }
  const T = b.q;
  return v.slots.map((s, i) => {
    const bs = T.slots[i];
    if (s.type === 'tap') return [need(s.phrases.indexOf(bs.phrases[bs.k[0]]), act + ' tap')];
    if (s.type === 'order') return bs.steps.slice();
    return need(pickIn(s.opts, bs.opts[bs.k]), act + ' slot ' + i);
  });
}
function builderWrong(act, v) {
  const b = bankOf(act), right = builderRight(act, v);
  return v.slots.map((s, i) => {
    if (s.type === 'order') return rot(right[i]);
    if (s.type === 'tap') {
      let k;
      if (b.kind === 'five') k = right[i];
      else { const bs = b.q.slots[i]; k = bs.k.map((j) => s.phrases.indexOf(bs.phrases[j])); }
      const out = s.phrases.map((_, j) => j).filter((j) => k.indexOf(j) === -1);
      return out.length ? [out[0]] : k.slice(1);
    }
    return (right[i] + 1) % s.opts.length;
  });
}
const rot = (a) => a.slice(1).concat(a.slice(0, 1));
function mcqRight(qs, bankQs) { return qs.map((q) => { const bq = bankQs(q); return need(q.opts.indexOf(bq.opts[bq.k]), 'option ' + q.i); }); }
function right(act, form, v) {
  const B = bankOf(act).B;
  if (form === 'builder') return builderRight(act, v);
  if (form === 'mcq') return mcqRight(v.qs, (q) => B.qs[q.i]);
  if (form === 'branch') return mcqRight(v.asks, (q) => B.asks[q.i]);
  if (form === 'tick') return v.rows.map((r) => B.rows[r.i].k);
  if (form === 'scenes') return v.scenes.map((s) => need(s.opts.indexOf(B.scenes[s.i].opts[B.scenes[s.i].k]), 'scene ' + s.i));
  if (form === 'order') return B.steps.slice();
  if (form === 'tap') return v.items.map((it) => B.items[it.i].k.map((j) => need(it.phrases.indexOf(B.items[it.i].phrases[j]), 'phrase')).sort((x, y) => x - y));
  if (form === 'bins') return { round: v.round, bin: v.cards.map((c) => B.cards[c.i].bin) };
  if (form === 'match') return v.cards.map((c) => B.cards[c.i].chip);
  throw new Error('no answer for form ' + form);
}
function wrong(act, form, v) {
  const r = right(act, form, v), B = bankOf(act).B;
  if (form === 'builder') return builderWrong(act, v);
  if (form === 'mcq') return r.map((k, i) => (k + 1) % v.qs[i].opts.length);
  if (form === 'branch') return r.map((k, i) => (k + 1) % v.asks[i].opts.length);
  if (form === 'tick') return r.map((k) => 1 - k);
  if (form === 'scenes') return r.map((k, i) => (k + 1) % v.scenes[i].opts.length);
  if (form === 'order') return rot(r);
  if (form === 'tap') return r.map((k, i) => { const n = v.items[i].phrases.length, out = []; for (let j = 0; j < n; j++) if (k.indexOf(j) === -1) out.push(j); return out.length ? [out[0]] : k.slice(1); });
  if (form === 'bins') { const ids = B.bins.map((b) => b.id); return { round: v.round, bin: r.bin.map((b) => ids[(ids.indexOf(b) + 1) % ids.length]) }; }
  if (form === 'match') { const chips = v.chips; return r.map((c) => chips[(chips.indexOf(c) + 1) % chips.length]); }
  return null;
}
const incomplete = (form) => (form === 'bins' ? { round: 1, bin: [] } : []);
const perLen = (form, v) => ({ builder: () => v.slots.length, mcq: () => v.qs.length, branch: () => v.asks.length, tick: () => v.rows.length, scenes: () => v.scenes.length,
  order: () => v.steps.length, tap: () => v.items.length, bins: () => v.cards.length, match: () => v.cards.length })[form]();

// ---------- the dev harness ----------
let server = null;
async function up() {
  for (let i = 0; i < 80; i++) { try { const r = await fetch(BASE + '/'); if (r.status === 200) return true; } catch (e) { /* not yet */ } await new Promise((r) => setTimeout(r, 100)); }
  return false;
}
function stop() { if (server) { try { server.kill(); } catch (e) { /* gone */ } server = null; } }
process.on('exit', stop);

// ---------- the key words quiz: one question per key word ----------
// Found live 16 Nov 2026: one quiz asked "the best definition of values" and later "which term means [that definition]", so one
// question gave away another's answer. The server now draws at most one question per key word (bank field t). Checked on 300 pupils'
// draws straight from the built Code.gs. CONTROL (must fail as expected): the same Code.gs with the old draw put back shows repeats.
// a phrase activity whose items are about different terms shows each item's question, or she cannot tell what the phrase must link to
// (found live 16 Nov 2026: Part 8 showed four items and no question). CONTROL: the old tap view without q.
function tapQuestions(code) {
  const vm = require('vm');
  const AF = banks['ao2-find'];
  const views = (src) => { const box = {}; vm.runInNewContext(src + '\n;this.build_ = build_; this.actOf_ = actOf_;', box);
    return box.build_(box.actOf_('ao2-find'), 'pq@c2ken.net', 0, 0).view.items; };
  sh.check(AF.items.every((it) => /^Explain the meaning of [a-z ]+ \(5 marks\)\.$/.test(it.q || '')), 'every Part 8 "find the phrase" item names its five-mark question in the bank', AF.items.map((it) => it.q || '(none)').join(' / '));
  const NEW = "tv.push({ i: i, q: str_(it.q), item:", OLD = "tv.push({ i: i, item:";
  sh.check(code.indexOf(NEW) >= 0, 'the gate can find the question in the tap view in Code.gs (so the control can undo it)', code.indexOf(NEW) >= 0 ? 'found' : 'not found');
  try {
    const miss = (v) => v.filter((x) => !x.q || x.q !== (AF.items[x.i] || {}).q).length;
    const real = views(code);
    sh.check(real.length === AF.items.length && miss(real) === 0, 'the page is sent each Part 8 item with its own question', miss(real) + ' of ' + real.length + ' items without their question');
    const ctl = miss(views(code.replace(NEW, OLD)));
    sh.check(ctl === AF.items.length, 'CONTROL with the old tap view put back, the items come without their question (the check above can see the bug)', ctl + ' of ' + AF.items.length + ' without');
  } catch (e) { sh.fail('Part 8 item questions', e.message); }
}

// an item and a pupil's answer sit in their own boxes, not packed into the question. Found live 16 Nov 2026: Part 9's Examiner's eye
// and seven Part 2 questions showed the question, the item and a pupil's answer as one long bold paragraph. Banks now carry item,
// ans and ask; the server sends them; the page draws an Item box and an "A pupil writes" box. CONTROLS: an old packed question is
// reported by the bank scan, and Code.gs without the new line sends no item, answer or ask.
function itemBoxes(code) {
  const vm = require('vm');
  const PACKED = /\bItem:|A pupil writes:/;
  const packed = (B) => ((B && B.qs) || []).filter((q) => PACKED.test(q.q || '')).length;
  const hits = Object.keys(banks).filter((id) => packed(banks[id]) > 0);
  sh.check(!hits.length, 'no question in any bank packs an item or a pupil\'s answer into the question text', hits.length ? 'packed in: ' + hits.join(', ') : Object.keys(banks).length + ' banks');
  const OLDQ = 'Question: Explain the meaning of sanctions (5 marks). Item: “People learn what behaviour is expected.” A pupil writes: “Norms are social rules.” Which mistake costs this answer marks?';
  sh.check(packed({ qs: [{ q: OLDQ }] }) === 1, 'CONTROL an old packed Examiner\'s eye question is reported by the bank scan', 'reported');
  const EE = banks['ex-eye'], CB = banks['c-bel'];
  sh.check(EE.qs.every((q) => q.item && q.ans && q.ask), 'every Examiner\'s eye question in the bank has its item, the pupil\'s answer and the question to answer', EE.qs.filter((q) => !(q.item && q.ans && q.ask)).length + ' of ' + EE.qs.length + ' missing a part');
  const LINE = "if (q.item) v.item = str_(q.item); if (q.ans) v.ans = str_(q.ans); if (q.ask) v.ask = str_(q.ask);";
  sh.check(code.indexOf(LINE) >= 0, 'the gate can find the item line in Code.gs (so the control can undo it)', code.indexOf(LINE) >= 0 ? 'found' : 'not found');
  const views = (src, id) => { const box = {}; vm.runInNewContext(src + '\n;this.build_ = build_; this.actOf_ = actOf_;', box);
    return box.build_(box.actOf_(id), 'ib@c2ken.net', 0, 0).view.qs; };
  try {
    const ee = views(code, 'ex-eye'), eeOk = (v) => v.filter((x) => x.item && x.ans && x.ask && !PACKED.test(x.q)).length;
    sh.check(ee.length > 0 && eeOk(ee) === ee.length, 'the page is sent each Examiner\'s eye question with its item, the pupil\'s answer and the question in their own fields', eeOk(ee) + ' of ' + ee.length);
    const cbItems = CB.qs.filter((q) => q.item).length, cb = views(code, 'c-bel').filter((x) => x.item).length;
    sh.check(cbItems > 0 && cb === cbItems, 'the page is sent the Part 2 beliefs item question with its item in its own field', cb + ' of ' + cbItems);
    const off = code.replace(LINE, '');
    const ctl = eeOk(views(off, 'ex-eye')), ctl2 = views(off, 'c-bel').filter((x) => x.item).length;
    sh.check(ctl === 0 && ctl2 === 0, 'CONTROL with the item line taken out, no item, answer or question reaches the page (the checks above can see the bug)', ctl + ' Examiner\'s eye, ' + ctl2 + ' beliefs');
  } catch (e) { sh.fail('item boxes', e.message); }
}

function quizDraws(code) {
  const vm = require('vm');
  const VQ = banks.vquiz, byText = {}, terms = L.cardTerms(L.readContent(L.DESIGN));
  VQ.qs.forEach((q, i) => { byText[q.q] = i; });
  const draws = (src) => {
    const box = {}; vm.runInNewContext(src + '\n;this.build_ = build_; this.actOf_ = actOf_;', box);
    const A = box.actOf_('vquiz'), out = [];
    for (let k = 0; k < 300; k++) out.push(box.build_(A, 'p' + k + '@c2ken.net', k % 3, 0).view.qs.map((v) => byText[v.q]));
    return out;
  };
  const repeats = (ds) => ds.filter((d) => { const seen = {}; return d.some((i) => [].concat(VQ.qs[i].t).some((w) => { if (seen[w]) return true; seen[w] = 1; return false; })); }).length;
  const OLD = "idx = shuffle_(idx, r).slice(0, A.max);", NEW = "idx = oneEach_(shuffle_(idx, r), B.qs, A.max);";
  const bad = VQ.qs.map((q, i) => [].concat(q.t || []).filter((w) => terms.indexOf(w) < 0).map((w) => 'q' + i + ' ' + w)).flat();
  sh.check(VQ.qs.every((q) => [].concat(q.t || []).length) && !bad.length, 'every key words quiz question names its key word, and each is a flashcard key word', bad.length ? bad.join(', ') : VQ.qs.length + ' questions');
  sh.check(code.indexOf(NEW) >= 0, 'the gate can find the one-per-key-word draw in Code.gs (so the control can undo it)', code.indexOf(NEW) >= 0 ? 'found' : 'not found');
  try {
    const real = draws(code), n = repeats(real), short = real.filter((d) => d.length !== Math.min(10, VQ.qs.length) || d.some((i) => i === undefined)).length;
    sh.check(n === 0, 'no key words quiz asks about the same key word twice (300 pupils\' draws)', n + ' of 300 draws repeat a key word');
    sh.check(short === 0, 'every key words quiz still has 10 questions', short + ' of 300 draws are short');
    const ctl = repeats(draws(code.replace(NEW, OLD)));
    sh.check(ctl > 0, 'CONTROL with the old draw put back, some quizzes repeat a key word (the check above can see the bug)', ctl + ' of 300 draws repeat');
  } catch (e) { sh.fail('key words quiz draws', e.message); }
}

async function main() {
  fs.mkdirSync(SCRATCH, { recursive: true });
  // build into a scratch deploy folder so the gate never replaces DESIGN/deploy
  const plan = pagePlan(sh);
  plan.deploy = path.join(SCRATCH, 'g0-deploy');
  fs.mkdirSync(plan.deploy, { recursive: true });
  const b = build(plan);
  const lastLine = b.out.trim().split('\n').filter(Boolean).slice(-1)[0] || '';
  sh.check(b.code === 0 && fs.existsSync(path.join(plan.deploy, 'Code.gs')), 'build', b.code === 0 ? lastLine : redact(b.out.trim().split('\n').slice(-3).join(' | ')));
  if (b.code !== 0) return;
  quizDraws(fs.readFileSync(path.join(plan.deploy, 'Code.gs'), 'utf8'));
  tapQuestions(fs.readFileSync(path.join(plan.deploy, 'Code.gs'), 'utf8'));
  itemBoxes(fs.readFileSync(path.join(plan.deploy, 'Code.gs'), 'utf8'));
  if (!PASS) sh.fail('staff passcode', 'DESIGN/STAFF_PASSCODE.txt has no passcode line');
  try { const busy = await fetch(BASE + '/'); sh.fail('port ' + PORT, 'something is already listening (' + busy.status + ')'); return; } catch (e) { /* free */ }
  try { fs.unlinkSync(STORE); } catch (e) { /* none */ }
  const logf = fs.openSync(path.join(SCRATCH, 'g0-dev.log'), 'w');
  server = spawn(process.execPath, [path.join(L.REPO, 'tools', 'dev-server.js'), String(PORT)], { env: Object.assign({}, b.env, { SOC_STORE: STORE }), stdio: ['ignore', logf, logf] });
  if (!(await up())) { sh.fail('dev server', 'did not answer on ' + PORT + ' (see ' + path.join(SCRATCH, 'g0-dev.log') + ')'); return; }
  sh.pass('dev server', 'port ' + PORT + ', store ' + STORE);
  await post('/__reset');
  await post('/__clock', { days: 0 });

  // ---------- guards ----------
  let r = await call('apiBoot', { cls: CLS }, '');
  sh.check(r.ok === false && r.error === 'not-signed-in', 'guard not-signed-in', E(r));
  r = await call('apiStaff', { op: 'check' }, '');
  sh.check(r.ok === false && r.error === 'not-signed-in', 'guard not-signed-in (staff)', E(r));
  r = await call('apiBoot', { cls: CLS }, 'bob@gmail.com');
  sh.check(r.ok === false && r.error === 'domain', 'guard domain', E(r));
  r = await call('apiStaff', { op: 'check' }, 'bob@gmail.com');
  sh.check(r.ok === false && r.error === 'domain', 'guard domain (staff)', E(r));
  r = await call('apiBoot', { cls: 'no-such-class' });
  sh.check(r.ok === false && r.error === 'unknown-class', 'guard unknown-class', E(r));
  r = await call('apiOpen', { cls: 'no-such-class', act: 't1p' });
  sh.check(r.ok === false && r.error === 'unknown-class', 'guard unknown-class (open)', E(r));

  // ---------- classes and names ----------
  r = await staff('create', { name: 'G0 Class' });
  sh.check(r.ok && r.slug === CLS, 'owner creates a class', E(r) + ' slug ' + r.slug);
  r = await staff('create', { name: 'G0 Other' });
  sh.check(r.ok && r.slug === OTHER, 'owner creates a second class', E(r));
  r = await staff('create', { name: 'G0 Class' });
  sh.check(r.ok === false && r.error === 'taken', 'create a taken name', E(r));
  r = await staff('create', { name: '!!!' });
  sh.check(r.ok === false && r.error === 'bad-name', 'create a bad class name', E(r));
  r = await call('apiBoot', {});
  sh.check(r.ok && r.cls === null && r.staff === false, 'boot with no class', E(r));
  const boot = await call('apiBoot', { cls: CLS });
  sh.check(boot.ok && boot.named === true && boot.name === 'Aoife', 'boot names the pupil from her account', E(boot) + ' name ' + boot.name);
  r = await call('apiBoot', { cls: CLS }, 'noname1@c2ken.net');
  sh.check(r.ok && r.named === false && r.name === '', 'boot with no account name asks for one', E(r));
  r = await call('apiName', { cls: CLS, name: 'Aoife B' });
  sh.check(r.ok && r.name === 'Aoife B', 'name set', E(r));
  for (const bad of ['', 'x'.repeat(41), 'Ao<b>ife', 'R2D2']) {
    r = await call('apiName', { cls: CLS, name: bad });
    t('bad-name refused', JSON.stringify(bad).slice(0, 12), r.ok === false && r.error === 'bad-name', E(r));
  }
  r = await call('apiBoot', { cls: CLS });
  sh.check(r.ok && r.name === 'Aoife B' && r.hdr.n === 'Aoife B', 'name persists', r.name);

  // ---------- boot shape ----------
  const hk = ['n', 'b', 'r', 'a', 'w', 'wq', 'pr', 'pts', 'bd', 'bdt', 'st', 'ck', 'pile', 'dl', 'wk', 't'];
  const miss = ['email', 'name', 'named', 'hdr', 'cls', 'max', 'today', 'week', 'staff'].filter((k) => !(k in boot))
    .concat(hk.filter((k) => !(boot.hdr && k in boot.hdr)).map((k) => 'hdr.' + k))
    .concat(['slug', 'name', 'lb', 'lock'].filter((k) => !(boot.cls && k in boot.cls)).map((k) => 'cls.' + k));
  sh.check(!miss.length && /^\d{4}-\d\d-\d\d$/.test(boot.today) && /^\d{4}-W\d\d$/.test(boot.week) && boot.hdr.ck.length === 12 && boot.staff === false && boot.v,
    'boot shape', miss.length ? 'missing ' + miss.join(', ') : 'today ' + boot.today + ', week ' + boot.week + ', v ' + boot.v);
  const MAXA = boot.max.acts, MAXP = boot.max.parts;
  const acts = Object.keys(MAXA).filter((a) => a !== 'daily' && a !== 'weekly');
  const partSum = Object.values(MAXP).reduce((x, y) => x + y, 0), actSum = acts.reduce((x, a) => x + MAXA[a], 0);
  sh.check(partSum === actSum && MAXA.daily === 5 && MAXA.weekly === 20 && MAXP.p10 === 0, 'maxima', acts.length + ' acts, parts sum ' + partSum + ' = acts sum ' + actSum + ', daily 5, weekly 20');
  sh.check(acts.filter((a) => /^d5-/.test(a)).length === FIVE.length && acts.filter((a) => /^d10-/.test(a)).length === Object.keys(banks).filter((k) => /^ten-q\d+$/.test(k)).length,
    'every five and ten in the banks is an act', FIVE.length + ' fives, ' + acts.filter((a) => /^d10-/.test(a)).length + ' tens');

  // ---------- every act ----------
  const fired = [];
  const keep = (res) => { if (res && Array.isArray(res.badges)) fired.push(...res.badges); };
  let leaksText = [];
  const markActs = acts.filter((a) => !/^w(5|10)-/.test(a));
  for (const act of markActs) {
    const o0 = await call('apiOpen', { cls: CLS, act });
    if (!o0.ok) { t('open', act, false, E(o0)); continue; }
    t('open', act, true);
    const form = o0.form;
    t('max matches boot', act, o0.max === MAXA[act], o0.max + ' vs ' + MAXA[act]);
    const kh = keyHits(o0, form);
    t('view has no key fields', act, !kh.length, kh.slice(0, 3).join(', '));
    const js = JSON.stringify(o0);
    const lk = KEYONLY.filter((s) => js.indexOf(JSON.stringify(s).slice(1, -1)) !== -1);
    if (lk.length) leaksText.push(act + ': ' + lk.length + ' key sentence(s), text withheld so this file stays public');
    let v = o0.view, a = o0.a;
    try {
      r = await call('apiMark', { cls: CLS, act, a, round: o0.round, ans: incomplete(form) });
      t('incomplete answer refused', act, r.ok === false && r.error === 'incomplete', E(r));
      const ansW = wrong(act, form, v);
      r = await call('apiMark', { cls: CLS, act, a, round: o0.round, ans: ansW }); keep(r);
      t('all-wrong scores 0', act, r.ok && r.score === 0, E(r) + ' score ' + r.score);
      t('per has one entry per item', act, r.ok && Array.isArray(r.per) && r.per.length === perLen(form, v) && r.per.every((p) => p.ok === false), r.per && r.per.length + ' vs ' + perLen(form, v));
      t('attempts increment', act, r.ok && r.attempts === 1, 'attempts ' + r.attempts);
      if (form === 'builder') t('builder mark returns the model after the check', act, r.extra && r.extra.model != null && r.extra.why_marks != null);
      // the note under each ten-mark answer is the note for that part: positional on the 5+5 questions, the part's band on her own 3+2+2+2+1 (found live 16 Nov 2026)
      if (form === 'builder' && bankOf(act).kind === 'ten') { const T = bankOf(act).q;
        const BAND = (part) => { const b = part.replace(/\d+$/, ''), d = +(part.match(/\d+$/) || [1])[0]; return { how: 0, example: 1, research: 1 + d, shows: 1 + d, conclusion: 4 }[b]; };
        const want = (i) => T.why_marks[T.scheme === '3+2+2+2+1' ? BAND(T.slots[i].part) : i];
        const fits = (whys) => whys.length === T.slots.length && whys.every((w, i) => w && w === want(i));
        const got = (r.per || []).map((p) => p.why);
        t('ten-mark builder: every answer\'s note is the note for its part', act, r.ok && fits(got), got.map((w, i) => w === want(i) ? '' : 'slot ' + i).filter(Boolean).join(' ') || '');
        if (T.scheme === '3+2+2+2+1') t('CONTROL ten-mark builder: the old by-position notes are reported on her own scheme', act, !fits(T.slots.map((s, i) => T.why_marks[i]))); }
      // the note under each five-mark part fits that part: D, the phrases, I, E and T each get their own note, never her
      // mark-scheme list by position (found live 16 Nov 2026). CONTROL: the old by-position notes are reported.
      if (form === 'builder' && bankOf(act).kind === 'five') { const Q = bankOf(act).q, JOB = [/\bD\b/, /item/, /\bI\b/, /\bE\b/, /\bT\b/];
        const fits5 = (whys) => whys.length === 5 && whys.every((w, i) => w && JOB[i].test(w) && (Q.why_marks || []).indexOf(w) === -1);
        const got5 = (r.per || []).map((p) => p.why);
        t('five-mark builder: every part\'s note is the note for its part', act, r.ok && fits5(got5), got5.map((w, i) => fits5Part(w, i) ? '' : 'part ' + i).filter(Boolean).join(' ') || '');
        function fits5Part(w, i) { return w && JOB[i].test(w) && (Q.why_marks || []).indexOf(w) === -1; }
        t('CONTROL five-mark builder: the old by-position mark-scheme notes are reported', act, !fits5((Q.why_marks || []).slice(0, 5))); }
      if (form === 'order') t('order mark returns the whys after the check', act, r.extra && Array.isArray(r.extra.whys));
      // reshuffle: the next attempt's view
      let o1 = await call('apiOpen', { cls: CLS, act, round: o0.round });
      let same = JSON.stringify(o1.view) === JSON.stringify(o0.view), tries = [o1.a];
      for (let aa = 2; same && aa < 8; aa++) { const ox = await call('apiOpen', { cls: CLS, act, a: aa, round: o0.round }); tries.push(aa); same = JSON.stringify(ox.view) === JSON.stringify(o0.view); }
      t('the next attempt reshuffles the view', act, o1.ok && o1.a === 1 && !same, 'a ' + o1.a + (same ? ', same view for a = 0..' + tries.slice(-1)[0] : ''));
      // all right (every round for bins)
      let best = null, att = 1;
      const rounds = form === 'bins' ? o0.rounds : 1;
      for (let rd = 1; rd <= rounds; rd++) {
        const o = await call('apiOpen', { cls: CLS, act, round: form === 'bins' ? rd : undefined });
        r = await call('apiMark', { cls: CLS, act, a: o.a, round: form === 'bins' ? rd : undefined, ans: right(act, form, o.view) }); keep(r);
        att++;
        const max = form === 'bins' ? o.roundMax : o.max;
        t('all-right scores full', act + (form === 'bins' ? ' round ' + rd : ''), r.ok && r.score === max && r.per.every((p) => p.ok), E(r) + ' ' + r.score + '/' + max);
        best = r.best;
      }
      t('best reaches the act maximum', act, best === MAXA[act], best + ' of ' + MAXA[act]);
      t('attempts count every check', act, r.attempts === att, r.attempts + ' vs ' + att);
      const o2 = await call('apiOpen', { cls: CLS, act, round: form === 'bins' ? 1 : undefined });
      r = await call('apiMark', { cls: CLS, act, a: o2.a, round: form === 'bins' ? 1 : undefined, ans: wrong(act, form, o2.view) }); keep(r);
      t('best never decreases', act, r.ok && r.score === 0 && r.best === MAXA[act] && r.newBest === false, 'best ' + r.best);
      t('pts in every reply = the sum of the header', act, r.ok && r.pts === ptsOf(r.hdr) && r.hdr.pts === r.pts, r.pts + ' vs ' + ptsOf(r.hdr || {}));
      // BC (found live 16 Nov 2026): any two phrases that earn the item marks are right; a phrase that earns them stays green in a wrong pair;
      // CONTROL: a single tap is wrong even when the phrase earns marks (without the count check it scored)
      if (form === 'builder' && bankOf(act).kind === 'five' && bankOf(act).q.ph_ok) { const Q = bankOf(act).q, ACC = Q.ph_ok, PK = Q.ph_k.slice().sort((x, y) => x - y);
        const OUT = Q.phrases.map((_, j) => j).filter((j) => ACC.indexOf(j) === -1), EXTRA = ACC.filter((j) => PK.indexOf(j) === -1);
        const tapWith = async (pick) => { const ox = await call('apiOpen', { cls: CLS, act }); const ans = right(act, ox.form, ox.view), ti = ox.view.slots.findIndex((x) => x.type === 'tap');
          const vi = (j) => need(ox.view.slots[ti].phrases.indexOf(Q.phrases[j]), 'phrase'); ans[ti] = pick.map(vi).sort((x, y) => x - y);
          const rx = await call('apiMark', { cls: CLS, act, a: ox.a, ans }); keep(rx); return { p: rx.ok && rx.per[ti], want: (js) => JSON.stringify(js.map(vi).sort((x, y) => x - y)) }; };
        let z = await tapWith([EXTRA[0], PK[0]]);
        t('five-mark phrases: another pair that earns the item marks is right and is the pair shown', act, z.p && z.p.ok && JSON.stringify(z.p.k) === z.want([EXTRA[0], PK[0]]), z.p ? JSON.stringify(z.p.k) : 'no reply');
        z = await tapWith([EXTRA[0], OUT[0]]);
        t('five-mark phrases: a phrase that earns the marks stays green in a wrong pair', act, z.p && !z.p.ok && JSON.stringify(z.p.k) === z.want([EXTRA[0], PK[0]]), z.p ? JSON.stringify(z.p.k) : 'no reply');
        z = await tapWith([OUT[0], OUT[1] != null ? OUT[1] : PK[0]]);
        t('five-mark phrases: a pair outside the phrases that earn the marks is wrong', act, z.p && !z.p.ok, z.p ? 'marked right' : 'no reply');
        z = await tapWith([PK[0]]);
        t('CONTROL five-mark phrases: one tap is wrong, even on a phrase that earns marks', act, z.p && !z.p.ok, z.p ? 'marked right' : 'no reply'); }
    } catch (e) { t('answers derived from the banks', act, false, e.message); }
  }
  flushTally();
  for (const k of Object.keys(tally)) delete tally[k];
  sh.check(!leaksText.length, 'no bank key text in any open reply', leaksText.length ? leaksText.slice(0, 3).join('; ') : KEYONLY.length + ' key-only strings checked over ' + markActs.length + ' acts (' + (KEYTEXT.length - KEYONLY.length) + ' key sentences are also shown text, not counted)');

  // ---------- badges ----------
  sh.check(fired.includes('family'), 'family badge fires', 'fired: ' + Array.from(new Set(fired)).join(', '));
  sh.check(fired.includes('culture'), 'culture badge fires');
  let o = await call('apiOpen', { cls: CLS, act: 'f-match' });
  r = await call('apiMark', { cls: CLS, act: 'f-match', a: o.a, ans: wrong('f-match', o.form, o.view) }); keep(r);
  sh.check(r.ok && r.hdr.bd.includes('family') && !(r.badges || []).includes('family'), 'family badge never un-fires (after an all-wrong f-match)', 'bd ' + (r.hdr && r.hdr.bd.join(',')));
  // AG: passing the four Part 1 mini-tests now ticks all twelve lines, so this pupil earns the badge without ticking by hand
  sh.check(fired.includes('socialisation'), 'socialisation badge fires once the four Part 1 mini-tests and the quiz are passed (they tick all twelve lines)', 'fired: ' + Array.from(new Set(fired)).join(', '));
  {
    // a second pupil unticks a line before her last pass: the badge waits for that line, then fires when she ticks it
    const PB = 'pupilbadge@c2ken.net';
    const passB = async (act) => { const ox = await call('apiOpen', { cls: CLS, act }, PB); return call('apiMark', { cls: CLS, act, a: ox.a, ans: right(act, ox.form, ox.view) }, PB); };
    await call('apiName', { cls: CLS, name: 'Badge Pupil' }, PB);
    for (const t of ['vquiz', 't1p', 't1s', 't1f']) await passB(t);
    await call('apiTick', { cls: CLS, ck: [0, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0] }, PB);
    r = await passB('t1i');
    sh.check(r.ok && !r.hdr.bd.includes('socialisation') && r.hdr.ck.join('') === '011111111111', 'socialisation badge waits for all twelve ticks (one line unticked after every test is passed)', E(r) + ', ck ' + (r.hdr && r.hdr.ck.join('')));
    r = await call('apiTick', { cls: CLS, ck: Array(12).fill(1) }, PB);
    sh.check(r.ok && (r.badges || []).includes('socialisation'), 'socialisation badge fires on the twelfth tick', 'badges ' + JSON.stringify(r.badges));
  }
  r = await call('apiTick', { cls: CLS, ck: Array(12).fill(0) });
  sh.check(r.ok && r.hdr.bd.includes('socialisation') && r.hdr.ck.every((x) => x === 0), 'socialisation badge stays when ticks are cleared', 'bd ' + r.hdr.bd.join(','));

  // ---------- AG (found live 16 Nov 2026): the Part 1 page says the checklist ticks itself as mini-tests are passed; it never did ----------
  // passing a Part 1 mini-test (4 or 5 of 5) ticks its lines; failing ticks nothing; a line she unticks stays unticked.
  // CONTROL: the same page on a second harness with the auto-tick line taken out must tick nothing on a pass.
  {
    const PCK = 'pupilck@c2ken.net', ckOf = (x) => (x && x.hdr && x.hdr.ck) || [];
    const callAt = async (base, fn, req, as) => (await fetch(base + '/api/' + fn, { method: 'POST', headers: { 'content-type': 'application/json', 'x-dev-user': as }, body: JSON.stringify(req || {}) })).json();
    const markT = async (base, cls, act, as, good) => { const ox = await callAt(base, 'apiOpen', { cls, act }, as); return callAt(base, 'apiMark', { cls, act, a: ox.a, ans: (good ? right : wrong)(act, ox.form, ox.view) }, as); };
    const only = (ck, on) => ck.length === 12 && ck.every((x, i) => x === (on.indexOf(i) >= 0 ? 1 : 0));
    await callAt(BASE, 'apiName', { cls: CLS, name: 'Ciara K' }, PCK);
    let a = await markT(BASE, CLS, 't1s', PCK, false);
    sh.check(a.ok && a.score < a.max - 1 && only(ckOf(a), []), 'AG a failed Part 1 mini-test ticks no checklist line', 'score ' + a.score + '/' + a.max + ', ck ' + JSON.stringify(ckOf(a)));
    a = await markT(BASE, CLS, 't1p', PCK, true);
    sh.check(a.ok && a.score >= a.max - 1 && only(ckOf(a), [0, 1, 2]), 'AG passing the primary socialisation mini-test ticks its three checklist lines and no others', 'score ' + a.score + '/' + a.max + ', ck ' + JSON.stringify(ckOf(a)));
    a = await callAt(BASE, 'apiBoot', { cls: CLS }, PCK);
    sh.check(only(ckOf(a), [0, 1, 2]), 'AG the auto-ticks are saved', 'ck ' + JSON.stringify(ckOf(a)));
    await callAt(BASE, 'apiTick', { cls: CLS, ck: [1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0] }, PCK);
    a = await markT(BASE, CLS, 't1s', PCK, false);
    sh.check(only(ckOf(a), [0, 2]), 'AG a line she unticks stays unticked when she marks another test', 'ck ' + JSON.stringify(ckOf(a)));
    const LINE = 'if (S.score >= Bv.max - 1) CK_TESTS.forEach(function (t, i) { if (t === id) H.ck[i] = 1; });';
    const code = fs.readFileSync(path.join(plan.deploy, 'Code.gs'), 'utf8');
    sh.check(code.indexOf(LINE) >= 0, 'AG the gate can find the auto-tick line in Code.gs (so the control can undo it)', code.indexOf(LINE) >= 0 ? 'found' : 'not found');
    const cdir = path.join(SCRATCH, 'g0-control-deploy'), cstore = path.join(SCRATCH, 'g0-control-store.json'), cbase = 'http://localhost:' + (PORT + 1);
    fs.rmSync(cdir, { recursive: true, force: true }); fs.cpSync(plan.deploy, cdir, { recursive: true }); fs.writeFileSync(path.join(cdir, 'Code.gs'), code.replace(LINE, ''));
    try { fs.unlinkSync(cstore); } catch (e) { /* none */ }
    const csrv = spawn(process.execPath, [path.join(L.REPO, 'tools', 'dev-server.js'), String(PORT + 1)], { env: Object.assign({}, process.env, { SOC_STORE: cstore, SOC_DEPLOY: cdir }), stdio: 'ignore' });
    try {
      let on = false; for (let k = 0; k < 60 && !on; k++) { try { await fetch(cbase + '/'); on = true; } catch (e) { await new Promise((ok) => setTimeout(ok, 250)); } }
      const made = await callAt(cbase, 'apiStaff', { op: 'create', name: 'Control Class' }, OWNER);
      const ccls = ((made.classes || []).map((c) => c.slug).find((s) => /control/.test(s))) || 'control-class';
      await callAt(cbase, 'apiName', { cls: ccls, name: 'Ciara K' }, PCK);
      const c = await markT(cbase, ccls, 't1p', PCK, true);
      sh.check(c.ok && c.score >= c.max - 1 && !only(ckOf(c), [0, 1, 2]), 'CONTROL with the auto-tick line taken out, passing the mini-test ticks nothing (the checks above can see the bug)', 'score ' + c.score + '/' + c.max + ', ck ' + JSON.stringify(ckOf(c)));
    } catch (e) { sh.fail('AG control', e.message); } finally { csrv.kill(); }
  }

  // ---------- tick and pile persist ----------
  const ck = [1, 0, 1, 0, 0, 1, 0, 0, 0, 0, 1, 1];
  await call('apiTick', { cls: CLS, ck });
  r = await call('apiBoot', { cls: CLS });
  sh.check(JSON.stringify(r.hdr.ck) === JSON.stringify(ck), 'ticks persist', JSON.stringify(r.hdr.ck));
  const terms = L.cardTerms(L.readContent());
  if (terms.length >= 2) {
    r = await call('apiPile', { cls: CLS, pile: { [terms[0]]: 1, [terms[1]]: 0, 'not a card term': 1, constructor: 1 } });
    const b2 = await call('apiBoot', { cls: CLS });
    sh.check(r.ok && b2.hdr.pile[terms[0]] === 1 && b2.hdr.pile[terms[1]] === 0 && !('not a card term' in b2.hdr.pile) && Object.keys(b2.hdr.pile).length === 2, 'pile persists (card terms only)', JSON.stringify(b2.hdr.pile));
    await call('apiPile', { cls: CLS, pile: { [terms[0]]: null } });
    const b3 = await call('apiBoot', { cls: CLS });
    sh.check(!(terms[0] in b3.hdr.pile) && b3.hdr.pile[terms[1]] === 0, 'pile: null takes a card off', JSON.stringify(b3.hdr.pile));
  } else sh.skip('pile persists', 'content/p5/cards.json has fewer than two terms');

  // ---------- writing ----------
  const writeActs = acts.filter((a) => /^w(5|10)-/.test(a));
  o = await call('apiOpen', { cls: CLS, act: 'w5-01' });
  sh.check(o.ok && o.form === 'write' && !keyHits(o, 'write').length && Array.isArray(o.view.phrases), 'write view has no model or key', E(o) + ' ' + keyHits(o, 'write').join(','));
  r = await call('apiWrite', { cls: CLS, act: 'w5-01', text: '   ' });
  let st = await store();
  sh.check(r.ok && r.n === 0 && !('model' in r) && !st.script['w:' + CLS + ':' + P1 + ':w5-01'], 'empty text: n 0, no model, nothing stored', E(r) + ' n ' + r.n);
  r = await call('apiWrite', { cls: CLS, act: 'd5-01', text: 'x' });
  sh.check(r.ok === false && r.error === 'bad-act', 'apiWrite on a build act refused', E(r));
  let quoted = 0, wfail = [];
  for (const act of writeActs) {
    const b = bankOf(act), m = b.q.model || {};
    const text = b.kind === 'five' ? flat(m).join(' ') : flat(m.p1 || m).join(' '), text2 = b.kind === 'five' ? '' : flat(m.p2 || {}).join(' ');
    const ow = await call('apiOpen', { cls: CLS, act });
    if (!ow.ok || keyHits(ow, 'write').length) wfail.push(act + ' open ' + E(ow));
    r = await call('apiWrite', { cls: CLS, act, text, text2 }); keep(r);
    const lines = b.kind === 'five' ? Array.isArray(r.lines) : Array.isArray(r.paras);
    if (!r.ok || r.model == null || !lines || r.n < (b.kind === 'five' ? 3 : 6) || !r.practice) wfail.push(act + ' ' + E(r) + ' n ' + r.n + ' practice ' + r.practice);
    if (r.quoted) quoted++;
  }
  sh.check(!wfail.length, 'every write: the model only after a check, judge lines, practice point for the model answer', wfail.length ? wfail.slice(0, 4).join('; ') : writeActs.length + ' writes');
  st = await store();
  const wk1 = st.script['w:' + CLS + ':' + P1 + ':w5-01'];
  let wz = null; try { wz = unzipB64(wk1); } catch (e) { wz = null; }
  sh.check(!!wz && typeof wz.t === 'string' && wz.t.length > 0 && wz.t.length <= 900 && 'n' in wz && /^[A-Za-z0-9+/=]+$/.test(wk1), 'the w: key is gzip+base64 of {t, t2, n, tmin}', wz ? 'n ' + wz.n + ', ' + wk1.length + ' chars' : 'not decodable');
  r = await call('apiWritten', { cls: CLS, act: 'w5-01' });
  sh.check(r.ok && wz && r.t === wz.t && r.n === wz.n, 'apiWritten returns the stored answer', E(r));
  o = await call('apiOpen', { cls: CLS, act: 'w5-01' });
  sh.check(o.ok && o.written && o.written.t === wz.t && o.practice === true, 'apiOpen on a write returns the saved answer', E(o));
  r = await call('apiWrite', { cls: CLS, act: 'w5-01', text: 'Short.' });
  sh.check(r.ok && r.best >= wz.n && r.practice === true && r.newPractice === false, 'a weaker rewrite keeps the best and the practice point', 'best ' + r.best);
  sh.info('quoted (wq) set on ' + quoted + ' of ' + writeActs.filter((a) => /^w10-/.test(a)).length + ' ten-mark writes');

  // ---------- lock / unlock, board ----------
  r = await staff('setPart', { slug: CLS, part: 'p2', locked: true });
  const ol = await call('apiOpen', { cls: CLS, act: 'c-mat' }), bl = await call('apiBoot', { cls: CLS });
  sh.check(r.ok && ol.ok === false && ol.error === 'locked' && bl.cls.lock.includes('p2'), 'lock a part', E(ol) + ' lock ' + JSON.stringify(bl.cls.lock));
  r = await staff('setPart', { slug: CLS, part: 'p2', locked: false });
  const ou = await call('apiOpen', { cls: CLS, act: 'c-mat' });
  sh.check(r.ok && ou.ok && !r.lock.includes('p2'), 'unlock it', E(ou));
  r = await staff('setPart', { slug: CLS, part: 'p99', locked: true });
  sh.check(r.ok === false && r.error === 'bad-op', 'setPart refuses an unknown part', E(r));
  await staff('setPart', { slug: CLS, part: 'p10', locked: true });
  const d10 = await call('apiDaily', { cls: CLS });
  sh.check(d10.ok === false && d10.error === 'locked', 'a locked part 10 locks the daily five', E(d10));
  await staff('setPart', { slug: CLS, part: 'p10', locked: false });
  r = await call('apiBoard', { cls: CLS });
  sh.check(r.ok && r.lb === 1 && r.rows.some((x) => x.me) && r.me.rank >= 1, 'board on', E(r) + ' rank ' + (r.me && r.me.rank));
  r = await staff('lb', { slug: CLS, lb: 0 });
  const boff = await call('apiBoard', { cls: CLS }), bb = await call('apiBoot', { cls: CLS });
  sh.check(r.ok && boff.ok && boff.lb === 0 && !boff.rows && bb.cls.lb === 0, 'board off', JSON.stringify(boff).slice(0, 80));
  r = await staff('lb', { slug: CLS });
  sh.check(r.ok && r.lb === 1, 'board toggles back on', E(r));
  // the board counts pupils, adds up points, and always shows her own row (found live 16 Nov 2026: "You are number 1 of 157 pupils" with 157 points)
  {
    const boardOk = (b, n) => b && b.ok && b.total === n && b.sum === b.rows.reduce((t, x) => t + x.pts, 0) && b.rows.some((x) => x.me && x.rank === b.me.rank) && b.rows.filter((x) => !x.me).length <= 10;
    const bc = await staff('create', { name: 'G0 Board' }), BC = bc.slug, who = [];
    for (let i = 1; i <= 12; i++) { const u = 'board' + String(i).padStart(2, '0') + '@c2ken.net'; who.push(u); await call('apiName', { cls: BC, name: i === 12 ? 'Zz Last' : 'Board ' + 'ABCDEFGHIJK'[i - 1] }, u); }
    const last = await call('apiBoard', { cls: BC }, who[11]), first = await call('apiBoard', { cls: BC }, who[0]);
    sh.check(bc.ok && boardOk(last, 12) && last.me.rank === 12 && last.rows.length === 11 && last.rows[10].me, 'board: twelfth of 12 pupils sees the top ten and her own row ranked 12, total 12 pupils', E(last) + ' total ' + last.total + ' rows ' + (last.rows || []).length);
    sh.check(boardOk(first, 12) && first.me.rank === 1 && first.rows.length === 10, 'board: first of 12 sees ten rows, her own ranked 1', E(first));
    const p1 = await call('apiBoard', { cls: CLS });
    sh.check(p1.sum > 0 && p1.total < p1.sum, 'board: a class with points still counts pupils, not points', 'total ' + p1.total + ' sum ' + p1.sum);
    const old = { ok: true, lb: 1, rows: p1.rows.filter((x) => !x.me || p1.me.rank <= 10).slice(0, 10), me: p1.me, total: p1.sum };
    sh.check(!boardOk(old, p1.rows.length) && !boardOk(Object.assign({}, last, { rows: last.rows.slice(0, 10) }), 12), 'CONTROL: the old board (points as the pupil count; no own row past ten) is reported');
    await staff('delete', { slug: BC });
  }

  // ---------- daily ----------
  const dA = await call('apiDaily', { cls: CLS }), dB = await call('apiDaily', { cls: CLS });
  const sig = (d) => d.view.qs.map((q) => q.act + ':' + q.i).join(',');
  sh.check(dA.ok && dA.view.qs.length === 5 && dA.max === 5 && !keyHits(dA, 'mcq').length, 'daily: five questions, no key', E(dA) + ' ' + (dA.ok ? sig(dA) : ''));
  sh.check(dA.ok && dB.ok && JSON.stringify(dA.view) === JSON.stringify(dB.view), 'daily: the same set twice for the same class');
  await call('apiBoot', { cls: OTHER });
  const dO = await call('apiDaily', { cls: OTHER });
  sh.check(dO.ok && sig(dO) !== sig(dA), 'daily: another class gets a different set', dO.ok ? sig(dO) : E(dO));
  const od = await call('apiOpen', { cls: CLS, act: 'daily' });
  sh.check(od.ok && JSON.stringify(od.view) === JSON.stringify(dA.view) && od.max === 5, 'apiOpen daily = apiDaily', E(od));
  const dRight = mcqRight(dA.view.qs, (q) => banks[q.act].qs[q.i]);
  r = await call('apiMark', { cls: CLS, act: 'daily', ans: [] });
  sh.check(r.ok === false && r.error === 'incomplete', 'daily: incomplete answer refused', E(r));
  r = await call('apiMark', { cls: CLS, act: 'daily', ans: dRight }); keep(r);
  sh.check(r.ok && r.score === 5 && r.stored === true && r.hdr.dl[dA.date] === 5 && r.per.length === 5, 'daily: all right scores 5 and is stored', E(r) + ' ' + r.score);
  const p0 = r.pts;
  r = await call('apiMark', { cls: CLS, act: 'daily', ans: dRight.map((k, i) => (k + 1) % dA.view.qs[i].opts.length) });
  sh.check(r.ok && r.score === 0 && r.stored === false && r.hdr.dl[dA.date] === 5 && r.pts === p0 && r.gain === 0, 'daily: stored once (a second try changes nothing)', 'dl ' + JSON.stringify(r.hdr.dl));

  // ---------- weekly ----------
  const wA = await call('apiWeekly', { cls: CLS });
  const kinds = wA.ok ? wA.view.builds.map((x) => x.kind).join(',') : '';
  sh.check(wA.ok && kinds === 'five,five,ten' && wA.max === 20 && !keyHits(wA, 'builder').length, 'weekly: two five builds and one ten build, max 20, no key', E(wA) + ' ' + kinds + ' max ' + wA.max);
  sh.check(wA.ok && wA.view.builds[0].term.toLowerCase() !== wA.view.builds[1].term.toLowerCase(), 'weekly: the two fives are different terms', wA.ok ? wA.view.builds.map((x) => x.act).join(',') : '');
  const ow = await call('apiOpen', { cls: CLS, act: 'weekly' });
  sh.check(ow.ok && JSON.stringify(ow.view) === JSON.stringify(wA.view), 'apiOpen weekly = apiWeekly', E(ow));
  const wRight = { builds: wA.view.builds.map((x) => builderRight(x.act, x)) };
  r = await call('apiMark', { cls: CLS, act: 'weekly', ans: { builds: wRight.builds.slice(0, 2) } });
  sh.check(r.ok === false && r.error === 'incomplete', 'weekly: incomplete answer refused', E(r));
  r = await call('apiMark', { cls: CLS, act: 'weekly', ans: wRight }); keep(r);
  sh.check(r.ok && r.score === 20 && r.max === 20 && r.stored === true && r.hdr.wk[wA.week] === 20 && r.extra && r.extra.builds.length === 3, 'weekly: all right scores 20 and is stored', E(r) + ' ' + r.score);
  const p1 = r.pts;
  r = await call('apiMark', { cls: CLS, act: 'weekly', ans: { builds: wA.view.builds.map((x) => builderWrong(x.act, x)) } });
  sh.check(r.ok && r.score === 0 && r.stored === false && r.hdr.wk[wA.week] === 20 && r.pts === p1, 'weekly: stored once', 'wk ' + JSON.stringify(r.hdr.wk));
  sh.check(r.pts === ptsOf(r.hdr), 'pts = Σb + Σpr + Σdl + Σwk', r.pts + ' = ' + sum(r.hdr.b) + ' + ' + sum(r.hdr.pr) + ' + ' + sum(r.hdr.dl) + ' + ' + sum(r.hdr.wk));

  // ---------- ping ----------
  await post('/__set', { script: { ['s:' + CLS + ':' + P1]: null } });
  r = await call('apiPing', { cls: CLS });
  st = await store();
  sh.check(r.ok && /^\d+$/.test(String(st.script['s:' + CLS + ':' + P1] || '')), 'ping writes s:', E(r) + ' ' + st.script['s:' + CLS + ':' + P1]);

  // ---------- streak and the rolled dates (the clock moves) ----------
  const tick = async () => { const ox = await call('apiOpen', { cls: CLS, act: 't1p' }); return call('apiMark', { cls: CLS, act: 't1p', a: ox.a, ans: right('t1p', ox.form, ox.view) }); };
  r = await tick(); const n0 = r.hdr.st.n;
  await post('/__clock', { days: 1 }); r = await tick();
  sh.check(r.ok && r.hdr.st.n === n0 + 1, 'streak: a check the next day adds one', n0 + ' -> ' + r.hdr.st.n);
  await post('/__clock', { days: 3 }); r = await tick();
  sh.check(r.ok && r.hdr.st.n === 1, 'streak: a missed day starts again at one', 'n ' + r.hdr.st.n);
  // a daily on 10 more days and a weekly on 6 more weeks: dl keeps 8, wk keeps 5, the rest rolls into dlx/wkx
  let lastD = null;
  for (let dd = 4; dd < 14; dd++) {
    await post('/__clock', { days: dd });
    const dv = await call('apiDaily', { cls: CLS });
    lastD = await call('apiMark', { cls: CLS, act: 'daily', ans: mcqRight(dv.view.qs, (q) => banks[q.act].qs[q.i]) });
  }
  for (let ww = 1; ww <= 6; ww++) {
    await post('/__clock', { days: 14 + 7 * ww });
    const wv = await call('apiWeekly', { cls: CLS });
    lastD = await call('apiMark', { cls: CLS, act: 'weekly', ans: { builds: wv.view.builds.map((x) => builderRight(x.act, x)) } });
  }
  const H = lastD.hdr;
  sh.check(lastD.ok && Object.keys(H.dl).length === 8 && H.dlx === 5 * 3 && Object.keys(H.wk).length === 5 && H.wkx === 40 && H.pts === ptsOf(H),
    'old dailies and weeklies roll into dlx/wkx and still count', 'dl ' + Object.keys(H.dl).length + ', dlx ' + H.dlx + ', wk ' + Object.keys(H.wk).length + ', wkx ' + H.wkx + ', pts ' + H.pts);
  await post('/__clock', { days: 0 });
  st = await store();
  const hdrBytes = Buffer.byteLength(st.script['p:' + CLS + ':' + P1] || '');
  sh.check(hdrBytes > 0 && hdrBytes <= 1500, 'header ≤ 1500 bytes after a full run', hdrBytes + ' bytes (' + acts.length + ' acts, ' + writeActs.length + ' writes, 8 dailies, 5 weeklies, 6 badges max)');
  sh.info('badges fired over the run: ' + fired.join(', '));
  sh.check(fired.length === new Set(fired).size, 'each badge fires once', fired.join(','));

  // ---------- staff ----------
  r = await staff('classes', {}, P3);
  sh.check(r.ok === false && r.error === 'not-staff', 'a pupil calling a staff op gets not-staff', E(r));
  r = await staff('check', {}, P3);
  sh.check(r.ok && r.admitted === false && r.staff === false, 'check with no passcode: not admitted', E(r));
  r = await staff('check', { pass: 'wrong-pass' }, P3);
  sh.check(r.ok === false && r.error === 'bad-pass', 'a wrong passcode gives bad-pass', E(r));
  r = await staff('check', { pass: PASS }, P3);
  sh.check(r.ok && r.admitted === true && r.role === 'pass' && r.classes.length === 0, 'the right passcode admits (role pass, no classes)', E(r) + ' role ' + r.role);
  r = await staff('check', {}, P3);
  sh.check(r.ok && r.admitted === true, 'the passcode is remembered', E(r));
  r = await staff('tracker', { slug: CLS }, P3);
  sh.check(r.ok === false && r.error === 'unknown-class', 'a passcode user cannot see another teacher\'s class', E(r));
  r = await staff('check'); const chk = r;
  sh.check(r.ok && r.role === 'owner' && r.owner === true && r.classes.some((c) => c.slug === CLS), 'owner check: role owner', E(r) + ' role ' + r.role);
  r = await staff('classes');
  const mine = r.ok && r.classes.find((c) => c.slug === CLS);
  sh.check(r.ok && mine && mine.n >= 2 && r.role === 'owner', 'owner classes (with pupil counts)', E(r) + ' ' + (mine ? CLS + ' n ' + mine.n : ''));
  // found live 16 Nov 2026: the Classes tab said 0 pupils for every class, because the page builds that tab from 'check', which sent no counts
  const nOf = (cs) => { const c = (cs || []).find((x) => x.slug === CLS); return c ? c.n : undefined; };
  const countsOk = (cs, want) => typeof nOf(cs) === 'number' && want >= 2 && nOf(cs) === want;
  sh.check(chk.ok && countsOk(chk.classes, mine && mine.n), 'owner check carries each class\'s pupil count (the Classes tab is built from it)', 'check n ' + nOf(chk.classes) + ', classes n ' + (mine && mine.n));
  sh.check(!countsOk((chk.classes || []).map(({ n, ...c }) => c), mine && mine.n), 'CONTROL the count check fails on the old check reply, which had no counts');
  r = await staff('parts', { slug: CLS });
  sh.check(r.ok && r.parts.length === 11 && r.parts[10] === 'p11' && Array.isArray(r.lock), 'parts', E(r) + ' ' + (r.parts || []).join(','));
  r = await staff('tracker', { slug: CLS });
  const row = r.ok && r.rows.find((x) => x.email === P1);
  sh.check(r.ok && row && row.pts === H.pts && Object.keys(row.parts).length === 9 && row.parts.p1[1] === MAXP.p1 && row.bd.length >= 3, 'tracker', E(r) + (row ? ' pts ' + row.pts + ', parts ' + Object.keys(row.parts).length : ''));
  r = await staff('pupil', { slug: CLS, email: P1 });
  sh.check(r.ok && r.hdr && r.writes.length === writeActs.length && r.writes.every((w) => Array.isArray(w.lines) || Array.isArray(w.paras)) && r.acts.length === markActs.length,
    'pupil (marks and re-judged writes)', E(r) + (r.ok ? ' ' + r.writes.length + ' writes, ' + r.acts.length + ' acts' : ''));
  r = await staff('pupil', { slug: CLS, email: 'nobody@c2ken.net' });
  sh.check(r.ok === false && r.error === 'unknown-pupil', 'pupil: unknown pupil', E(r));
  r = await staff('csv', { slug: CLS });
  sh.check(r.ok && /\.csv$/.test(r.filename) && r.csv.indexOf(P1) !== -1 && r.csv.split('\r\n')[0].indexOf('Part 9') !== -1, 'csv', E(r) + ' ' + r.filename + ' ' + (r.csv || '').length + ' chars');
  r = await staff('nonsense', { slug: CLS });
  sh.check(r.ok === false && r.error === 'bad-op', 'an unknown op gives bad-op', E(r));
  // create / delete
  r = await staff('create', { name: 'G0 Temp' });
  await call('apiBoot', { cls: 'g0-temp' }, P2);
  await call('apiPing', { cls: 'g0-temp' }, P2);
  r = await staff('delete', { slug: 'g0-temp' });
  st = await store();
  const leftover = Object.keys(st.script).filter((k) => k.indexOf(':g0-temp:') !== -1 || k === 'cls:g0-temp');
  const bt = await call('apiBoot', { cls: 'g0-temp' }, P2);
  sh.check(r.ok && !leftover.length && bt.error === 'unknown-class' && JSON.parse(st.script.classes).indexOf('g0-temp') === -1, 'delete a class and every key under it', E(r) + ' leftover ' + leftover.length);
  // clearMe: the owner plays as a pupil, then clears it
  await call('apiBoot', { cls: CLS }, OWNER);
  r = await staff('clearMe');
  st = await store();
  sh.check(r.ok && !Object.keys(st.script).some((k) => /^(p|s|w):[^:]+:dgartland021@c2ken\.net/.test(k)), 'clearMe removes the owner\'s own pupil keys', E(r));
  r = await staff('archive');
  sh.check(r.ok && typeof r.moved === 'number' && typeof r.size === 'number', 'archive (owner, forced)', E(r) + ' moved ' + r.moved + ', size ' + r.size);

  // ---------- a teacher (the teachers script property) and a head of department ----------
  await post('/__set', { script: { teachers: JSON.stringify([T2]) } });
  r = await staff('check', {}, T2);
  sh.check(r.ok && r.admitted && r.role === 'teacher' && r.classes.length === 0, 'teacher (teachers property): admitted, role teacher', E(r) + ' role ' + r.role);
  r = await staff('create', { name: 'G0 T2' }, T2);
  const tc = await staff('classes', {}, T2);
  sh.check(r.ok && tc.ok && tc.classes.length === 1 && tc.classes[0].slug === 'g0-t2' && tc.classes[0].mine, 'a teacher sees only her own classes', E(tc) + ' ' + (tc.classes || []).map((c) => c.slug).join(','));
  r = await staff('tracker', { slug: CLS }, T2);
  sh.check(r.ok === false && r.error === 'unknown-class', 'a teacher cannot open another teacher\'s class', E(r));
  r = await staff('archive', {}, T2);
  sh.check(r.ok === false && r.error === 'owner-only', 'archive is owner-only', E(r));
  r = await staff('tracker', { slug: 'g0-t2' }, T2);
  sh.check(r.ok && Array.isArray(r.rows), 'a teacher opens her own class tracker', E(r));
  await post('/__set', { script: { hods: JSON.stringify([HOD]) } });
  r = await staff('classes', {}, HOD);
  const hs = r.ok ? r.classes.map((c) => c.slug).sort().join(',') : '';
  sh.check(r.ok && r.role === 'hod' && hs === [CLS, OTHER, 'g0-t2'].sort().join(','), 'a hods address sees every class', E(r) + ' ' + hs);
  r = await staff('delete', { slug: 'g0-t2' }, HOD);
  sh.check(r.ok === false && r.error === 'owner-only', 'a head of department cannot delete another teacher\'s class', E(r));
  if (L.readTeachers(L.DESIGN).length) {
    const tt = L.readTeachers(L.DESIGN)[0];
    r = await staff('check', {}, tt);
    sh.check(r.ok && r.role === 'teacher', 'teacher (TEACHERS.txt)', E(r));
  } else sh.skip('teacher (TEACHERS.txt)', 'DESIGN/TEACHERS.txt lists no address yet; the teachers script property is tested instead');

  // ---------- archive by padding ----------
  st = await store();
  let size = sizeOf(st.script), pad = {}, np = 0;
  while (size < ARCHIVE_AT + 8 * 1024) {
    const k = 'w:' + CLS + ':pad' + np + '@c2ken.net:w5-01';
    const v = zlib.gzipSync(Buffer.from(JSON.stringify({ t: crypto.randomBytes(4400).toString('base64'), t2: '', n: 1, tmin: 1 + np }))).toString('base64');
    pad[k] = v; size += k.length + v.length; np++;
  }
  await post('/__set', { script: pad });
  r = await staff('classes');
  st = await store();
  const after = sizeOf(st.script), sheetRows = Object.values(st.sheets || {}).reduce((n, s) => n + s.rows.length, 0);
  const keepP1 = await call('apiBoot', { cls: CLS });
  sh.check(r.ok && r.archived > 0 && after < ARCHIVE_AT * 0.8 && sheetRows === r.archived && keepP1.hdr.pr['w5-01'] === 1,
    'archive: the owner\'s visit moves the oldest writes to the Sheet', np + ' padding keys, store ' + Math.round(size / 1024) + ' KB -> ' + Math.round(after / 1024) + ' KB, ' + r.archived + ' moved, ' + sheetRows + ' Sheet rows, marks kept');
  const sheetName = Object.values(st.sheets || {}).map((s) => s.name)[0] || '';
  sh.check(/Archive/.test(sheetName), 'the archive Sheet is named', sheetName);

  // ---------- a teacher's visit archives too (16 Nov 2026: the page sends 'check', never 'classes', so before this nothing ever archived) ----------
  st = await store();
  const wOf = (who) => Object.keys(st.script).filter((k) => k.indexOf('w:' + CLS + ':' + who + ':') === 0).reduce((n, k) => n + k.length + st.script[k].length, 0);
  sh.info('one pupil who wrote every answer at model length keeps ' + (wOf(P1) / 1024).toFixed(1) + ' KB of written answers; the store holds 500 KB');
  size = sizeOf(st.script); pad = {}; np = 0;
  const otherK = 'w:' + CLS + ':old@c2ken.net:w5-01';
  pad[otherK] = zlib.gzipSync(Buffer.from(JSON.stringify({ t: 'the oldest answer, in a class that is not hers', t2: '', n: 1, tmin: 0 }))).toString('base64');
  while (size < ARCHIVE_AT + 8 * 1024) {
    const k = 'w:g0-t2:tpad' + np + '@c2ken.net:w5-01';
    const v = zlib.gzipSync(Buffer.from(JSON.stringify({ t: crypto.randomBytes(4400).toString('base64'), t2: '', n: 1, tmin: 5 + np }))).toString('base64');
    pad[k] = v; size += k.length + v.length; np++;
  }
  await post('/__set', { script: pad });
  r = await staff('check', {}, T2);
  st = await store();
  const hers = Object.values(st.sheets || {}).filter((x) => x.by === T2), afterT = sizeOf(st.script);
  sh.check(r.ok && r.admitted && r.archived > 0 && /docs\.google\.com/.test(r.archiveUrl || '') && hers.length === 1 && hers[0].rows.length === r.archived && afterT < ARCHIVE_AT && !!st.script['archiveId:' + T2],
    'a teacher opening the staff page moves her classes\' oldest answers to a Sheet in HER Drive', E(r) + ' ' + r.archived + ' moved, store ' + Math.round(afterT / 1024) + ' KB, her Sheets ' + hers.length);
  sh.check(!!st.script[otherK], 'a teacher\'s visit never moves answers from another teacher\'s class', st.script[otherK] ? 'kept' : 'moved');
  r = await staff('check', {}, T2);
  sh.check(r.ok && r.archived === 0, 'under the line, a staff visit moves nothing', E(r) + ' archived ' + r.archived);
  r = await staff('archive');
  sh.check(r.ok && r.moved === 0 && r.size > 0 && r.line === ARCHIVE_AT, 'the owner\'s Archive button, under the line, says how full the store is', E(r) + ' size ' + r.size + ' line ' + r.line);

  // ---------- a full store still keeps the mark ----------
  await call('apiBoot', { cls: CLS }, P2);
  const fb = bankOf('w5-01'), ftext = flat(fb.q.model || {}).join(' ');
  const fkey = 'w:' + CLS + ':' + P2 + ':w5-01', fneed = fkey.length + zlib.gzipSync(Buffer.from(JSON.stringify({ t: ftext.slice(0, 900), t2: '', n: 5, tmin: 29999999 }))).toString('base64').length;
  st = await store(); size = sizeOf(st.script); pad = {}; np = 0;
  const room = 500 * 1024 - (fneed - 80);
  while (size < room) { const k = 'zz:fill' + np, n = Math.min(9000, room - size - k.length); if (n <= 0) break; pad[k] = 'x'.repeat(n); size += k.length + n; np++; }
  await post('/__set', { script: pad });
  r = await call('apiWrite', { cls: CLS, act: 'w5-01', text: ftext }, P2);
  st = await store();
  const fh = (await call('apiBoot', { cls: CLS }, P2)).hdr || {};
  sh.check(r.ok && r.textLost === true && r.n >= 3 && fh.w && fh.w['w5-01'] === r.n && fh.pr && fh.pr['w5-01'] === 1 && !st.script[fkey],
    'when the store is full, a written answer still gets its mark and practice point, and the pupil is told her words were not kept', E(r) + ' textLost ' + r.textLost + ' n ' + r.n + ' saved mark ' + (fh.w || {})['w5-01'] + ', ' + (fneed - 80) + ' bytes free');
}

main().then(() => { stop(); sh.finish(); }, (e) => { sh.fail('g0 crashed', (e && e.stack || String(e)).split('\n').slice(0, 3).join(' | ')); stop(); sh.finish(); });
