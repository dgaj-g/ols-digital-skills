#!/usr/bin/env node
/* gates/g7-lessons.js — v11 (11 Nov 2026): the server side of slides, activities and "How did this topic go?".
 * Runs the REAL built Code.gs through the dev harness (:8771, its own scratch store), as the pupil and as staff:
 *   apiLessons  finish / slide / at, the score rules (0 <= s <= m <= 5000, whole numbers, a scored activity needs marks,
 *               an unscored one is kept as 0/0), first go kept, best go kept, goes counted, a resent op counted once,
 *               a locked topic refused, the resume pointer, the 40-op cap, the 40-id memory.
 *   apiCheck    one rating per line (1-3), locked refused, comment cleaned and cut to 500, the newest send wins.
 *   apiStaff    acts / actsCsv / checks / checksCsv shapes and columns; a pupil is refused; a check sent before the lines
 *               changed is shown as not sent; Delete class removes the L: and E: records too.
 *   Storage     bytes of a heavy pupil (every activity, every slide set, every check) and a typical one, printed.
 * Controls: eight mutated copies of Code.gs, each must turn its own named check red.
 * Output: gates/out/g7-lessons.txt. Exit 1 on any failure. */
'use strict';
const fs = require('fs');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');

const ROOT = path.join(__dirname, '..');
const DESIGN = process.env.S1U1_DESIGN || '/Users/damiengartland/Desktop/Claude Work/S1 Unit 1 Platform';
const CODE = path.join(DESIGN, 'deploy', 'Code.gs');
const S1L = require(path.join(ROOT, 'platform', 'lessons.js'));
const OUT = path.join(ROOT, 'gates', 'out', 'g7-lessons.txt');
const PORT = 8771;
const STORE = path.join(DESIGN, 'gates', 'g7-store.json');
const OWNER = 'dgartland021@c2ken.net';
const P1 = 'g7pupil@c2ken.net', P2 = 'g7two@c2ken.net', HEAVY = 'g7heavy@c2ken.net', TYP = 'g7typical@c2ken.net';

const lines = [];
let fails = 0;

function post(p, body, user) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body || {});
    const req = http.request({ host: '127.0.0.1', port: PORT, path: p, method: 'POST', headers: { 'content-type': 'application/json', 'x-dev-user': user || P1, 'content-length': Buffer.byteLength(data) } }, (res) => {
      let b = ''; res.on('data', (c) => (b += c)); res.on('end', () => { try { resolve(JSON.parse(b)); } catch (e) { reject(new Error(p + ': ' + b.slice(0, 200))); } });
    });
    req.on('error', reject); req.end(data);
  });
}
const api = (fn, req, user) => post('/api/' + fn, req, user);
const T = (id) => S1L.topics.find((t) => t.id === id);

async function harness(codePath, fn) {
  try { fs.unlinkSync(STORE); } catch (e) {}
  const env = Object.assign({}, process.env, { S1U1_STORE: STORE });
  if (codePath) env.S1U1_CODE = codePath;
  const child = spawn(process.execPath, [path.join(ROOT, 'tools', 'dev-server.js'), String(PORT)], { env, stdio: ['ignore', 'pipe', 'pipe'] });
  let log = ''; child.stdout.on('data', (d) => (log += d)); child.stderr.on('data', (d) => (log += d));
  for (let i = 0; i < 80 && !/harness on/.test(log); i++) await new Promise((r) => setTimeout(r, 100));
  try { await fn(); } finally { child.kill(); await new Promise((r) => setTimeout(r, 150)); }
  return log;
}

// The flows: every check has a name, so a control can say which one it must turn red.
async function flows(ok, info) {
  let r = await api('apiStaff', { op: 'create', name: '12G7 Lessons' }, OWNER);
  const cls = r.slug;
  ok('setup', r.ok && !!cls, 'owner makes a class (' + cls + ')');
  for (const u of [P1, P2, HEAVY, TYP]) await api('apiBoot', { cls }, u);
  ['digital-data', 'software', 'databases', 'impact'].forEach(() => {});
  for (const id of ['digital-data', 'software', 'databases', 'impact']) await api('apiStaff', { op: 'setTopic', cls, topic: id, open: true }, OWNER);

  r = await api('apiBoot', { cls }, P1);
  ok('boot-shape', r.ok && r.lessons && JSON.stringify(r.lessons) === '{"a":{},"s":{},"p":{}}' && JSON.stringify(r.checks) === '{}' && Array.isArray(r.cat) && r.cat.length === 9,
    'boot gives a new pupil empty lessons, no checks, and all 9 topics in cat');
  ok('boot-open', r.cat && r.cat.filter((c) => c.open).map((c) => c.id).join(',') === 'digital-data,software,databases,impact', 'cat says which topics are open: ' + (r.cat || []).filter((c) => c.open).map((c) => c.id).join(','));

  const L = (ops, user) => api('apiLessons', { cls, ops }, user || P1);
  r = await L([{ op: 'finish', id: 'sw1', s: 3, m: 10, u: 'g7a1' }]);
  const sw1a = r.lessons && r.lessons.a.sw1;
  ok('first-go', r.ok && r.res[0] === 'ok' && sw1a && sw1a.slice(0, 5).join(',') === '3,10,3,10,1' && sw1a[5] > 0, 'first finish keeps first 3/10, best 3/10, 1 go: ' + JSON.stringify(sw1a));
  r = await L([{ op: 'finish', id: 'sw1', s: 3, m: 10, u: 'g7a1' }]);
  ok('dedupe', r.ok && r.res[0] === 'ok' && r.lessons.a.sw1[4] === 1, 'the same op sent twice (u g7a1) counts once: goes ' + (r.lessons && r.lessons.a.sw1[4]));
  r = await L([{ op: 'finish', id: 'sw1', s: 8, m: 10, u: 'g7a2' }]);
  ok('best-up', r.lessons.a.sw1.slice(0, 5).join(',') === '3,10,8,10,2', 'a better go lifts the best and keeps the first: ' + r.lessons.a.sw1.slice(0, 5).join(','));
  r = await L([{ op: 'finish', id: 'sw1', s: 2, m: 10, u: 'g7a3' }]);
  ok('best-keep', r.lessons.a.sw1.slice(0, 5).join(',') === '3,10,8,10,3', 'a worse go leaves the best alone, goes still counted: ' + r.lessons.a.sw1.slice(0, 5).join(','));
  r = await L([{ op: 'finish', id: 'sw1', s: 16, m: 20, u: 'g7a4' }]);
  ok('best-tie', r.lessons.a.sw1.slice(0, 5).join(',') === '3,10,16,20,4', 'the same share over more marks becomes the best: ' + r.lessons.a.sw1.slice(0, 5).join(','));

  const bad = [[11, 10, 'more than out of'], [1, 5001, 'out of over 5000'], [-1, 10, 'negative'], [2.5, 10, 'not whole'], ['3', 10, 'a string'], [0, 0, 'scored with no marks'], [null, 10, 'missing']];
  r = await L(bad.map((b, k) => ({ op: 'finish', id: 'sw2', s: b[0], m: b[1], u: 'g7b' + k })));
  ok('bad-score', r.ok && r.res.every((x) => x === 'bad-score') && !r.lessons.a.sw2, 'every bad score refused (' + bad.map((b) => b[2]).join(', ') + '): ' + (r.res || []).join(','));
  r = await L([{ op: 'finish', id: 'et1', s: 5, m: 9, u: 'g7c1' }, { op: 'finish', id: 'et1', s: 0, m: 0, u: 'g7c2' }]);
  ok('unscored', r.ok && r.res.join(',') === 'ok,ok' && r.lessons.a.et1 && r.lessons.a.et1.slice(0, 5).join(',') === '0,0,0,0,2', 'an unscored activity is kept as done, 0/0, two goes: ' + JSON.stringify(r.lessons && r.lessons.a.et1));
  r = await L([{ op: 'finish', id: 'zz9', s: 1, m: 2 }, { op: 'jump', id: 'sw1' }, { op: 'finish', id: 'nt1', s: 1, m: 2 }, { op: 'slide', deck: 'sw', i: 0 }, { op: 'slide', deck: 'sw', i: T('software').decks[0].n + 1 }, { op: 'slide', deck: 'sw', i: 1.5 }]);
  ok('refusals', r.ok && r.res.join(',') === 'bad-id,bad-op,locked,bad-slide,bad-slide,bad-slide', 'unknown id, unknown op, a locked topic, slides out of range: ' + (r.res || []).join(','));

  r = await L([{ op: 'slide', deck: 'sw', i: 5, u: 'g7d1' }, { op: 'slide', deck: 'sw', i: 3, u: 'g7d2' }]);
  ok('slides', r.ok && r.lessons.s.sw && r.lessons.s.sw.slice(0, 2).join(',') === '3,5' && r.lessons.p.software === 'd:sw', 'slides keep the last (3) and the furthest (5); resume points at the deck: ' + JSON.stringify(r.lessons && r.lessons.s.sw) + ' ' + (r.lessons && r.lessons.p.software));
  r = await L([{ op: 'slide', deck: 'db', i: 2, f: 9, u: 'g7z1' }]);
  ok('slide-f', r.ok && r.res[0] === 'ok' && r.lessons.s.db && r.lessons.s.db.slice(0, 2).join(',') === '2,9', 'a slide save carries the furthest seen in that browser (f 9) even when she has stepped back to 2: ' + JSON.stringify(r.lessons && r.lessons.s.db));
  r = await L([{ op: 'slide', deck: 'db', i: 4, f: 3, u: 'g7z2' }, { op: 'slide', deck: 'db', i: 2, f: 0, u: 'g7z3' }, { op: 'slide', deck: 'db', i: 2, f: T('databases').decks[0].n + 1, u: 'g7z4' }, { op: 'slide', deck: 'db', i: 2, f: '9', u: 'g7z5' }]);
  ok('slide-f-bad', r.ok && r.res.join(',') === 'bad-slide,bad-slide,bad-slide,bad-slide' && r.lessons.s.db.slice(0, 2).join(',') === '2,9', 'a furthest below the slide, 0, past the end or not a number is refused: ' + (r.res || []).join(','));
  r = await L([{ op: 'at', id: 'sw2', u: 'g7e1' }]);
  ok('resume', r.ok && r.lessons.p.software === 'a:sw2', 'opening an activity moves the resume point to it: ' + (r.lessons && r.lessons.p.software));
  r = await L([{ op: 'finish', id: 'sw3', s: 4, m: 5, u: 'g7f1' }, { op: 'finish', id: 'sw3', s: 9, m: 5, u: 'g7f2' }, { op: 'finish', id: 'sw4', s: 1, m: 5, u: 'g7f3' }]);
  ok('mixed', r.ok && r.res.join(',') === 'ok,bad-score,ok' && r.lessons.a.sw3[2] === 4 && r.lessons.a.sw4[2] === 1, 'a batch keeps the good ops and refuses the bad one: ' + (r.res || []).join(','));
  r = await api('apiLessons', { cls, ops: [] }, P1);
  ok('empty', !r.ok && r.error === 'bad-op', 'an empty batch is refused: ' + r.error);
  r = await L(Array.from({ length: 45 }, (_, k) => ({ op: 'at', id: 'sw1', u: 'g7g' + k })));
  const st = await post('/__store', {});
  const LP1 = JSON.parse(st.script['L:' + cls + ':' + P1] || '{}');
  ok('cap', r.ok && r.res.length === 40 && LP1.u && LP1.u.length === 40 && LP1.u[39] === 'g7g39', 'a batch is cut to 40 ops and the store remembers the last 40 ids: ' + (r.res || []).length + ' / ' + (LP1.u || []).length);
  r = await api('apiLessons', { cls: 'no-such-class', ops: [{ op: 'at', id: 'sw1' }] }, P1);
  ok('class', !r.ok && r.error === 'unknown-class', 'an unknown class is refused: ' + r.error);
  r = await api('apiLessons', { cls, ops: [{ op: 'at', id: 'sw1' }] }, 'someone@gmail.com');
  ok('domain', !r.ok && r.error === 'domain', 'an outside account is refused: ' + r.error);
  r = await api('apiBoot', { cls }, P1);
  ok('boot-back', r.ok && r.lessons.a.sw1[2] === 16 && r.lessons.p.software === 'a:sw1' && r.lessons.s.sw[1] === 5, 'signing in again brings back her scores, slides and where she was');

  // apiCheck
  const imp = T('impact'), np = imp.parts.length;
  const C = (req, user) => api('apiCheck', Object.assign({ cls, topic: 'impact' }, req), user || P1);
  r = await C({ r: Array(np - 1).fill(1), c: '' });
  ok('ck-len', !r.ok && r.error === 'no-rating', 'one line not rated is refused: ' + r.error);
  r = await C({ r: Array(np).fill(1).map((v, k) => (k === 0 ? 4 : v)), c: '' });
  ok('ck-range', !r.ok && r.error === 'no-rating', 'a rating of 4 is refused: ' + r.error);
  r = await C({ r: Array(np).fill('1'), c: '' });
  ok('ck-type', !r.ok && r.error === 'no-rating', 'a rating sent as text is refused: ' + r.error);
  r = await api('apiCheck', { cls, topic: 'networks', r: Array(T('networks').parts.length).fill(1), c: '' }, P1);
  ok('ck-locked', !r.ok && r.error === 'locked', 'a locked topic is refused: ' + r.error);
  r = await api('apiCheck', { cls, topic: 'nope', r: [1], c: '' }, P1);
  ok('ck-topic', !r.ok && r.error === 'bad-topic', 'an unknown topic is refused: ' + r.error);
  const long = 'Line one\r\nline two\u0007 ' + 'x'.repeat(600);
  r = await C({ r: Array(np).fill(2), c: long });
  ok('ck-clean', r.ok && r.e.c.length === 500 && r.e.c.indexOf('\r') === -1 && r.e.c.indexOf('\u0007') === -1 && r.e.c.indexOf('Line one\nline two') === 0, 'the comment is cleaned (no CR, no control characters) and cut to 500: ' + (r.e && r.e.c.length));
  const rr = Array.from({ length: np }, (_, k) => 1 + (k % 3));
  r = await C({ r: rr, c: '  I liked the grey zone game.  ' });
  ok('ck-newest', r.ok && r.e.r.join(',') === rr.join(',') && r.e.c === 'I liked the grey zone game.', 'the newest send replaces the last one: ' + (r.e && r.e.r.join(',')));
  await api('apiCheck', { cls, topic: 'software', r: Array(T('software').parts.length).fill(3), c: '' }, P2);
  r = await api('apiBoot', { cls }, P1);
  ok('ck-boot', r.ok && r.checks.impact && r.checks.impact.r.join(',') === rr.join(',') && !r.checks.software, 'boot gives her own checks back, not anyone else\'s');

  // staff
  r = await api('apiStaff', { op: 'acts', cls, topic: 'software' }, P1);
  ok('st-pupil', !r.ok && r.error === 'not-staff', 'a pupil cannot read the activities tab: ' + r.error);
  r = await api('apiStaff', { op: 'acts', cls, topic: 'software' }, OWNER);
  const row = r.rows && r.rows.find((x) => x.email === P1);
  ok('st-acts', r.ok && r.open === true && r.acts.length === T('software').acts.length && r.decks.length === 1 && r.rows.length === 4 && row && row.a.sw1.slice(0, 5).join(',') === '3,10,16,20,4' && row.s.sw[1] === 5 && !row.a.et1 && /T/.test(row.seen),
    'acts gives every pupil, this topic\'s activities only, and her first/best/goes and slides');
  r = await api('apiStaff', { op: 'actsCsv', cls, topic: 'software' }, OWNER);
  const csv = (r.csv || '').split('\r\n');
  const sw1line = csv.find((l) => l.indexOf(P1) !== -1 && l.indexOf('OS Control Room') !== -1) || '';
  ok('st-acsv', r.ok && /^class,pupil,email,activity,best score,best out of,best %,first score,first out of,goes,last played$/.test(csv[0]) && /,16,20,80,3,10,4,/.test(sw1line) && csv.some((l) => l.indexOf('Slides: Software') !== -1 && l.indexOf(P1) !== -1 && /,5,41,12,/.test(l)),
    'activities CSV has its columns, her best 16/20 = 80 %, first 3/10, 4 goes, and slides 5 of 41: ' + sw1line.slice(-60));
  r = await api('apiStaff', { op: 'checks', cls, topic: 'impact' }, OWNER);
  const crow = r.rows && r.rows.find((x) => x.email === P1), cnone = r.rows && r.rows.find((x) => x.email === P2);
  ok('st-checks', r.ok && r.parts.length === np && r.rate.length === 3 && crow && crow.e && crow.e.r.join(',') === rr.join(',') && crow.e.c === 'I liked the grey zone game.' && cnone && cnone.e === null,
    'checks gives each pupil\'s ratings and comment, and null for a pupil who has not sent one');
  r = await api('apiStaff', { op: 'checksCsv', cls, topic: 'impact' }, OWNER);
  const ccsv = (r.csv || '').split('\r\n');
  ok('st-ccsv', r.ok && /what they wrote$/.test(ccsv[0]) && ccsv.some((l) => l.indexOf(P1) !== -1 && l.indexOf(S1L.rate[0]) !== -1 && l.indexOf('I liked the grey zone game.') !== -1) && ccsv.some((l) => l.indexOf(P2) !== -1 && l.indexOf('not sent') !== -1),
    'topic-check CSV has the lines as columns, the rating words, her comment, and "not sent"');
  await post('/__set', { script: { ['E:' + cls + ':' + P2 + ':impact']: JSON.stringify({ r: [1, 1], c: 'old', t: 5 }) } });
  r = await api('apiStaff', { op: 'checks', cls, topic: 'impact' }, OWNER);
  ok('st-stale', r.ok && r.rows.find((x) => x.email === P2).e === null, 'a check sent before the lines changed shows as not sent');
  r = await api('apiStaff', { op: 'classes' }, OWNER);
  ok('st-store', r.ok && r.store > 0, 'the owner sees the storage figure (' + r.store + ' bytes)');

  // storage: a heavy pupil does everything in every topic; a typical one does one topic's worth
  for (const t of S1L.topics) await api('apiStaff', { op: 'setTopic', cls, topic: t.id, open: true }, OWNER);
  const heavyOps = [];
  S1L.topics.forEach((t) => {
    t.acts.forEach((a, k) => { heavyOps.push({ op: 'finish', id: a.id, s: a.scored ? 37 : 0, m: a.scored ? 120 : 0, u: 'h' + a.id + 'x' + k }); heavyOps.push({ op: 'finish', id: a.id, s: a.scored ? 118 : 0, m: a.scored ? 120 : 0, u: 'h' + a.id + 'y' + k }); });
    t.decks.forEach((d) => heavyOps.push({ op: 'slide', deck: d.id, i: d.n, u: 'h' + d.id }));
    heavyOps.push({ op: 'at', id: t.acts.length ? t.acts[0].id : '', u: 'h' + t.id });
  });
  for (let k = 0; k < heavyOps.length; k += 40) await L(heavyOps.slice(k, k + 40), HEAVY);
  for (const t of S1L.topics) await api('apiCheck', { cls, topic: t.id, r: t.parts.map(() => 2), c: 'y'.repeat(500) }, HEAVY);
  const sw = T('software');
  await L(sw.acts.map((a, k) => ({ op: 'finish', id: a.id, s: 7, m: 10, u: 'tq' + k })).concat([{ op: 'slide', deck: 'sw', i: 20, u: 'tqs' }]), TYP);
  await api('apiCheck', { cls, topic: 'software', r: sw.parts.map(() => 1), c: 'It was fine.' }, TYP);
  const st2 = await post('/__store', {});
  const bytes = (who) => Object.keys(st2.script).filter((k) => (k.indexOf('L:' + cls + ':' + who) === 0 || k.indexOf('E:' + cls + ':' + who + ':') === 0)).reduce((n, k) => n + k.length + String(st2.script[k]).length, 0);
  const hb = bytes(HEAVY), tb = bytes(TYP), nActs = S1L.topics.reduce((n, t) => n + t.acts.length, 0);
  const LH = JSON.parse(st2.script['L:' + cls + ':' + HEAVY] || '{}');
  ok('heavy-all', Object.keys(LH.a || {}).length === nActs && Object.keys(LH.s || {}).length === S1L.topics.reduce((n, t) => n + t.decks.length, 0), 'the heavy pupil has all ' + nActs + ' activities and every slide set stored');
  ok('heavy-size', hb < 9000 && JSON.stringify(LH).length < 9000, 'her activity record fits one Script Property (under 9 KB): ' + JSON.stringify(LH).length + ' bytes');
  info('storage: heavy pupil (all ' + nActs + ' activities, every slide set, every topic check with 500 characters) ' + hb + ' bytes; typical pupil (one topic) ' + tb + ' bytes');
  info('storage: a class of 25 heavy pupils is about ' + Math.round(hb * 25 / 1024) + ' KB; 25 typical pupils about ' + Math.round(tb * 25 / 1024) + ' KB');

  // A full store (500 KB): a topic check keeps its answers and loses comment length; a score is kept by keeping fewer resend ids
  const used = async () => { const x = await post('/__store', {}); return Object.entries(x.script).reduce((n, [k, v]) => n + Buffer.byteLength(k) + Buffer.byteLength(String(v)), 0); };
  let pads = 0;
  const clearPads = async () => { const z = {}; for (let k = 0; k < pads; k++) z['zzpad' + k] = null; if (pads) await post('/__set', { script: z }); pads = 0; };
  const fillTo = async (free) => { await clearPads(); let need = 500 * 1024 - (await used()) - free; const add = {};
    while (need > 0) { const key = 'zzpad' + pads, n = Math.min(9000, need - key.length); if (n <= 0) break; add[key] = 'x'.repeat(n); pads++; need -= key.length + n; }
    await post('/__set', { script: add }); };
  const dd = T('digital-data'), rrF = dd.parts.map(() => 2), eKeyF = 'E:' + cls + ':' + P1 + ':digital-data';
  await fillTo(Buffer.byteLength(eKeyF) + JSON.stringify({ r: rrF, c: 'x'.repeat(120), t: Date.now() }).length + 60);
  r = await api('apiCheck', { cls, topic: 'digital-data', r: rrF, c: 'z'.repeat(500) }, P1);
  ok('full-check', r.ok && r.e && r.e.c.length === 120 && r.e.r.join() === rrF.join(), 'a full store keeps her answers and cuts her comment to 120 characters: ' + (r.ok ? r.e.c.length + ' characters kept' : r.error + ' ' + (r.detail || '')));
  await fillTo(5);
  r = await L([{ op: 'finish', id: 'sw5', s: 3, m: 4, u: 'g7full' }]);
  ok('full-score', r.ok && r.res[0] === 'ok' && r.lessons.a.sw5 && r.lessons.a.sw5[2] === 3, 'a full store still saves her score (fewer resend ids kept): ' + (r.ok ? JSON.stringify(r.lessons.a.sw5) : r.error + ' ' + (r.detail || '')));
  await clearPads();

  // Delete class removes L: and E:
  r = await api('apiStaff', { op: 'delete', cls }, OWNER);
  const st3 = await post('/__store', {});
  const left = Object.keys(st3.script).filter((k) => k.indexOf(':' + cls + ':') !== -1);
  ok('delete', r.ok && left.length === 0, 'Delete class removes the activity and topic-check records too: ' + left.length + ' left');
}

// Controls: each mutated Code.gs must turn its named check red.
const CONTROLS = [
  { name: 'dedupe', why: 'the resent-op guard removed', from: "if (u && L.u.indexOf(u) !== -1) { res.push('ok'); return; }", to: '' },
  { name: 'unscored', why: 'unscored activities no longer forced to 0/0', from: 'if (!A.a.scored) { s = 0; m = 0; }', to: '' },
  { name: 'best-keep', why: 'every go overwrites the best', from: 'else if (better_(s, m, e[2], e[3]))', to: 'else if (true)' },
  { name: 'ck-locked', why: 'the lock check left out of apiCheck', from: "if (!ltOpen_(x.c, t.id)) return err_('locked');", to: '' },
  { name: 'slide-f', why: 'the furthest slide ignores f', from: 'g[1] = Math.max(g[1] || 1, f);', to: 'g[1] = Math.max(g[1] || 1, i);' },
  { name: 'full-check', why: 'a full store loses the whole topic check', from: 'E.c = E.c.slice(0, 120);', to: 'throw e;' },
  { name: 'full-score', why: 'a full store loses the score', from: 'catch (e) { L.u = L.u.slice(-8);', to: 'catch (e) { throw e;' },
  { name: 'delete', why: 'Delete class forgets the L: records', from: "'L:' + slugC + ':', ", to: '' }
];

async function main() {
  const real = {};
  const info = (s) => lines.push('INFO ' + s);
  const okReal = (name, cond, msg) => { real[name] = !!cond; lines.push((cond ? 'PASS ' : 'FAIL ') + msg); if (!cond) fails++; };
  let log = '';
  try { log = await harness(null, () => flows(okReal, info)); } catch (e) { okReal('threw', false, 'flows threw: ' + (e && e.stack || e)); }
  if (/Error/.test(log)) lines.push('harness log: ' + log.split('\n').filter((l) => /Error/.test(l)).slice(0, 5).join(' | '));
  const src = fs.readFileSync(CODE, 'utf8');
  for (const c of CONTROLS) {
    const n = src.split(c.from).length - 1;
    if (n !== 1) { lines.push('FAIL control ' + c.name + ': the line to change is found ' + n + ' times'); fails++; continue; }
    const p = path.join(DESIGN, 'gates', 'g7-control.gs');
    fs.writeFileSync(p, src.replace(c.from, c.to));
    const got = {};
    try { await harness(p, () => flows((name, cond) => { if (!(name in got)) got[name] = !!cond; else got[name] = got[name] && !!cond; }, () => {})); } catch (e) { got.threw = false; }
    const red = got[c.name] === false;
    lines.push((red ? 'PASS ' : 'FAIL ') + 'control (' + c.why + ') turns "' + c.name + '" red');
    if (!red) fails++;
    try { fs.unlinkSync(p); } catch (e) {}
  }
  const head = 'G7 lessons ' + (fails ? 'RED' : 'GREEN') + ' · ' + new Date().toISOString() + ' · build ' + fs.readFileSync(path.join(DESIGN, 'deploy', 'BUILD.txt'), 'utf8').trim();
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, [head].concat(lines).join('\n') + '\n');
  console.log(head); lines.filter((l) => !/^PASS/.test(l)).forEach((l) => console.log(l)); console.log(lines.filter((l) => /^PASS/.test(l)).length + ' passes');
  process.exit(fails ? 1 : 0);
}
main();
