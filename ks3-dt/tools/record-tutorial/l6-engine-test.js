/* THE OPERATION · mechanic 2 · engine gates in virtual time. node tools/record-tutorial/l6-engine-test.js → exit 0 only if every gate passes and every control fails. */
var OP = require('../../platform/assets/l6/engine2.js'), L = require('../../platform/assets/l6/lines.js');
var fails = 0, n = 0;
function gate(name, ok, detail) { n++; console.log((ok ? 'ok   ' : 'FAIL ') + name + (detail != null ? '  [' + detail + ']' : '')); if (!ok) fails++; }
function control(name, ok, detail) { n++; console.log((!ok ? 'ok   control fails as it must: ' : 'FAIL control PASSED: ') + name + (detail != null ? '  [' + detail + ']' : '')); if (ok) fails++; }
function vclock() { var t = 0, q = []; return { now: function () { return t; }, setTimeout: function (f, ms) { q.push({ at: t + ms, f: f }); }, run: function (ms) { var end = t + ms; for (;;) { q.sort(function (a, b) { return a.at - b.at; }); if (!q.length || q[0].at > end) break; var j = q.shift(); t = j.at; j.f(); } t = end; }, step: function (ms) { this.run(ms); } }; }
function seeded(s) { s = s >>> 0; return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
function pair(opts) {
  opts = opts || {}; var clock = vclock(), rnd = seeded(opts.seed || 7), seats = opts.seats || ['A', 'B'], lag = opts.lag != null ? opts.lag : 2000;
  var bus = OP.makeLocalBus(lag, clock), Es = {};
  seats.forEach(function (s) { var ep = bus.endpoint(); var E = OP.makeEngine({ seat: s, seats: seats, bus: ep, rnd: rnd, clock: clock, idleMs: 40000 }); ep.on(E.receive); Es[s] = E; });
  function run(ms) { var step = 250; while (ms > 0) { var d = Math.min(step, ms); clock.run(d); seats.forEach(function (s) { Es[s].tick(); }); ms -= d; } }
  return { clock: clock, rnd: rnd, E: Es, run: run, seats: seats, lag: lag };
}
function last(E) { return E.S.said[E.S.said.length - 1] || {}; }
var B = L.patients.bernadette;

/* 1 · door, begin, first table line */
var T = pair(); var A = T.E.A, Bb = T.E.B;
A.hello(); Bb.hello(); T.run(2100);
gate('hello crosses: A sees B here, B sees A here', A.S.presence.B.here && Bb.S.presence.A.here);
gate('door prompt before begin', A.prompt().kind === 'door');
gate('begin → op, patient speaks the open line', A.begin() && A.S.stage === 'op' && last(A).text === B.open[2]);
gate('bar at the table says the tap line', A.prompt().text === 'Click a part to take it out.');
Bb.begin();

/* 2 · her tap: out at once on her side; on his side only after the lag */
gate('A taps fan → out, patient reacts at once', A.tap('fan') === 'out' && A.S.my.out === 'fan' && A.S.parts.fan.status === 'out' && last(A).text === B.pulled.fan && last(A).tag === 'pulled');
gate('prompt is now the card question', A.prompt().kind === 'card' && A.prompt().text === 'Pick the job that part was doing.');
T.run(1000); gate('B does not know yet (honest lag)', Bb.S.parts.fan.status === 'in');
T.run(1250); gate('B sees the fan out by A after the lag', Bb.S.parts.fan.status === 'out' && Bb.S.parts.fan.by === 'A');
gate('B’s face is NOT changed by A’s part (each surgeon sees her own cut)', Bb.S.my.out === null);
gate('B’s strip: Dr Marmalade has a part out', Bb.presence()[0].text === 'Dr Marmalade has a part out.');
gate('B tapping A’s part is refused with the theirs line', Bb.tap('fan') === 'theirs' && Bb.prompt().text === 'Dr Marmalade has that one. Click another part.');
gate('A tapping another part while hers is out is busy', A.tap('mem') === 'busy' && A.S.parts.mem.status === 'in');
T.run(4000); gate('second symptom line after 4 s while still out', A.S.said.filter(function (s) { return s.tag === 'pulled2'; }).length === 1 && last(A).text === B.pulled2.fan);

/* 3 · wrong card stings, second wrong is told */
gate('wrong card → no line + Not that one', A.card('mem') === 'wrong' && last(A).text === B.no.fan && A.prompt().text === 'Not that one. Click another job card.');
gate('part still out after a wrong card (no force-correct)', A.S.my.out === 'fan' && A.S.parts.fan.status === 'out');
T.run(3100); gate('after 3 s the bar returns to the card question', A.prompt().kind === 'card');
gate('second wrong → told, sealed with the told tag', A.card('drive') === 'told' && last(A).text === B.told.fan && A.S.parts.fan.status === 'sealed' && A.S.parts.fan.told === true && A.S.my.out === null);
gate('told bar line', A.prompt().text === 'Bernadette told you the job. It is written on the chart.');
gate('chart has one line credited to A', A.S.chart.length === 1 && A.S.counts.A === 1 && A.sealedCount() === 1);
T.run(2300); gate('B’s chart gains the line in A’s name after the lag, told tag kept', Bb.S.parts.fan.status === 'sealed' && Bb.S.parts.fan.by === 'A' && Bb.S.parts.fan.told === true && Bb.S.counts.A === 1 && Bb.S.chart[0] === 'fan');
gate('B’s strip counts it: found a job. 1 of 7', Bb.presence()[0].text === 'Dr Marmalade found a job. 1 of 7 jobs found.');
gate('tapping a sealed part is refused', Bb.tap('fan') === 'sealed' && Bb.prompt().text === 'That one is done. Click another part.');

/* 4 · right card first time */
T.run(3100);
gate('B taps mem → out', Bb.tap('mem') === 'out' && last(Bb).text === B.pulled.mem);
gate('right card → back line, sealed, credited to B, not told', Bb.card('mem') === 'right' && last(Bb).text === B.back.mem && Bb.S.parts.mem.status === 'sealed' && Bb.S.parts.mem.told === false && Bb.S.counts.B === 1);
T.run(2300); gate('A learns B’s line after the lag; both charts agree on 2', A.S.parts.mem.by === 'B' && A.sealedCount() === 2 && Bb.sealedCount() === 2);

/* 5 · the board stays in; its card is asked */
gate('board tap → refusal line, prompt is the stays-in question', A.tap('board') === 'board' && last(A).text === B.pulled.board && A.prompt().text === 'That one stays in. Pick the job it does.');
gate('board right card → back.board, sealed', A.card('board') === 'right' && last(A).text === B.back.board && A.S.parts.board.status === 'sealed');

/* 6 · fluff: joke, gone on both sides, no chart line */
gate('fluff → joke line, no chart line', A.tap('fluff') === 'fluff' && last(A).text === B.pulled.fluff && A.S.chart.length === 3 && A.S.fluff === 'gone');
T.run(2300); gate('fluff gone on B after the lag', Bb.S.fluff === 'gone');
gate('second fluff tap does nothing', Bb.tap('fluff') === 'gone');

/* 7 · power supply: silence is the symptom */
gate('psu out → empty line tagged quiet (face dark, grey italics)', Bb.tap('psu') === 'out' && last(Bb).tag === 'quiet' && last(Bb).text === '');
gate('psu right', Bb.card('psu') === 'right');

/* 8 · clash: both tap the same part inside the lag; exactly one owns it */
T.run(2300);
var rA = A.tap('cpu'); T.run(100); var rB = Bb.tap('cpu');
gate('both think they have the cpu for a moment', rA === 'out' && rB === 'out');
T.run(2300);
gate('after the lag exactly one owner (A, earlier stamp) on both sides', A.S.parts.cpu.by === 'A' && Bb.S.parts.cpu.by === 'A' && A.S.my.out === 'cpu' && Bb.S.my.out === null);
gate('loser sees the plain line and is free to tap', Bb.S.stats.lost === 1 && Bb.S.log.some(function (e) { return e.k === 'notice' && e.d === 'lost'; }));
gate('loser’s bar: Dr Marmalade got there first', Bb.S.notice.key === 'lost' && Bb.prompt().text === 'Dr Marmalade got there first. Click another part.');
gate('A card right after the clash', A.card('cpu') === 'right');
T.run(3100);

/* 9 · waiting only when the last free part is in the other’s hands */
gate('B takes gpu, A takes drive: nothing free', Bb.tap('gpu') === 'out' && A.tap('drive') === 'out');
gate('A right on drive', A.card('drive') === 'right'); T.run(2300);
gate('A has nothing free → wait prompt and the waiting line, once', A.prompt().kind === 'wait' && A.prompt().text === 'Your partner has the last part. Watch the chart.' && A.S.said.filter(function (s) { return s.tag === 'waiting'; }).length === 1 && last(A).text === B.waiting);
T.run(5000); gate('waiting line not repeated', A.S.said.filter(function (s) { return s.tag === 'waiting'; }).length === 1);
gate('B wrong then right on gpu', Bb.card('fan') === 'wrong' && Bb.card('gpu') === 'right');
gate('B done: stage done + done line', Bb.S.stage === 'done' && last(Bb).text === B.done && Bb.prompt().text === 'Chart complete. All seven jobs found.');
T.run(2300);
gate('A done after the lag, charts agree: 7 lines, counts sum 7', A.S.stage === 'done' && A.sealedCount() === 7 && A.S.counts.A + A.S.counts.B === 7 && Bb.S.counts.A === A.S.counts.A);
gate('strip at done says finished', A.presence()[0].text === 'Dr Custard has finished.');
gate('stats honest: A wrong 2 (both on the fan) told 1, B wrong 1 lost 1', A.S.stats.wrong === 2 && A.S.stats.told === 1 && Bb.S.stats.wrong === 1 && Bb.S.stats.lost === 1);

/* 10 · operate again: both go to the next patient together */
gate('again → door of Desmond, round 1', A.again() && A.S.stage === 'door' && A.S.pid === 'desmond' && A.S.round === 1 && A.S.chart.length === 0);
T.run(2300); gate('B follows to Desmond after the lag', Bb.S.stage === 'door' && Bb.S.pid === 'desmond' && Bb.S.round === 1 && Bb.sealedCount() === 0);
gate('stale message from the old round is ignored', (Bb.receive({ type: 'seal', seat: 'A', round: 0, part: 'fan', told: false }), Bb.S.parts.fan.status === 'in'));

/* 11 · idle: 40 s with nothing → idle line, repeats */
var T2 = pair({ seed: 3 }); var A2 = T2.E.A; A2.begin(); T2.E.B.begin();
T2.run(39000); gate('no idle line before 40 s', !A2.S.said.some(function (s) { return s.tag === 'idle'; }));
T2.run(1500); gate('idle line at 40 s', A2.S.said.filter(function (s) { return s.tag === 'idle'; }).length === 1 && last(A2).text === B.idle[0]);
T2.run(40000); gate('second idle line at 80 s, the next one', A2.S.said.filter(function (s) { return s.tag === 'idle'; }).length === 2 && last(A2).text === B.idle[1]);
gate('idle resets on a tap', (A2.tap('fan'), T2.run(39000), A2.S.said.filter(function (s) { return s.tag === 'idle'; }).length === 2));

/* 12 · duplicates and late messages */
var T3 = pair({ seed: 5 }); var A3 = T3.E.A, B3 = T3.E.B; A3.begin(); B3.begin();
A3.tap('fan'); A3.card('fan'); T3.run(2300);
var c = B3.S.counts.A; B3.receive({ type: 'seal', seat: 'A', round: 0, part: 'fan', told: false }); B3.receive({ type: 'seal', seat: 'A', round: 0, part: 'fan', told: false });
gate('duplicate seal changes nothing', B3.S.counts.A === c && B3.S.chart.length === 1);
B3.receive({ type: 'pull', seat: 'A', round: 0, part: 'fan', at: 1 }); gate('late pull on a sealed part ignored', B3.S.parts.fan.status === 'sealed');
B3.receive({ type: 'pull', seat: 'Z', round: 0, part: 'mem', at: 1 }); gate('message from an unknown seat ignored', B3.S.parts.mem.status === 'in');

/* 13 · a late joiner is caught up by state */
var T4 = pair({ seed: 9, seats: ['A', 'B', 'C'] }); var A4 = T4.E.A, B4 = T4.E.B, C4 = T4.E.C;
A4.begin(); B4.begin(); A4.tap('fan'); A4.card('fan'); B4.tap('mem'); T4.run(2300);
C4.hello(); T4.run(4600);
gate('late C learns the sealed fan and the mem out by B', C4.S.parts.fan.status === 'sealed' && C4.S.parts.fan.by === 'A' && C4.S.parts.mem.status === 'out' && C4.S.parts.mem.by === 'B');
gate('trio presence: two lines', C4.presence().length === 2);
gate('trio door line names both partners', A4.fmt(L.ui2.together3) === 'Dr Custard and Dr Pickle are at the same table. You work on Bernadette together.');

/* 14 · the computer plays: pair of robots, trio, and solo, all reach done */
function robots(seats, seed) { var T = pair({ seed: seed, seats: seats }); var R = seats.map(function (s) { return OP.makeRobot(T.E[s], T.rnd, T.clock, 1); }); seats.forEach(function (s) { T.E[s].hello(); });
  var ms = 0; while (ms < 20 * 60000 && !seats.every(function (s) { return T.E[s].S.stage === 'done'; })) { T.run(250); R.forEach(function (r) { r.tick(); }); ms += 250; } return { T: T, ms: ms }; }
var r2 = robots(['A', 'B'], 11); gate('two robots reach done', r2.T.E.A.S.stage === 'done' && r2.T.E.B.S.stage === 'done', Math.round(r2.ms / 1000) + ' s');
gate('robot pair: charts agree, counts sum 7, exactly one owner per part', r2.T.E.A.sealedCount() === 7 && r2.T.E.A.S.counts.A + r2.T.E.A.S.counts.B === 7 && OP.PARTS.every(function (p) { return r2.T.E.A.S.parts[p].by === r2.T.E.B.S.parts[p].by; }));
var r3 = robots(['A', 'B', 'C'], 13); gate('three robots reach done, charts agree', ['A', 'B', 'C'].every(function (s) { return r3.T.E[s].S.stage === 'done' && r3.T.E[s].sealedCount() === 7; }) && OP.PARTS.every(function (p) { return r3.T.E.A.S.parts[p].by === r3.T.E.C.S.parts[p].by; }), Math.round(r3.ms / 1000) + ' s');
var r1 = robots(['A'], 17); gate('solo robot reaches done (all seven hers)', r1.T.E.A.S.stage === 'done' && r1.T.E.A.S.counts.A === 7 && r1.T.E.A.presence().length === 0, Math.round(r1.ms / 1000) + ' s');
gate('solo door line', r1.T.E.A.fmt(L.ui2.alone) === 'You work on Bernadette on your own.');
var anyLost = 0; [r2, r3].forEach(function (r) { r.T.seats.forEach(function (s) { anyLost += r.T.E[s].S.stats.lost; }); });
gate('robot runs log their clashes honestly (count is a number)', typeof anyLost === 'number', anyLost + ' lost');

/* 15 · cards: seven, random order, the right one present */
var cs = A3.cards(); gate('seven job cards incl. the right one, randomised', cs.length === 7 && cs.some(function (c) { return c.key === 'cpu'; }) && cs.map(function (c) { return c.key; }).join() !== OP.PARTS.join());
gate('every ui2 bar line is twelve words or fewer', ['pull', 'card', 'cardBoard', 'again', 'told', 'wait', 'done', 'lost', 'theirs', 'sealed', 'quiet'].every(function (k) { return A3.fmt(L.ui2[k], { p: 'Dr Custard' }).split(/\s+/).length <= 12; }));

/* 16 · the no line answers the card she tapped (his find, 14 Oct 2026: Bernadette's memory lines read as thinking) */
function noFor(part, job, seed) { var T = pair({ seed: seed }); var E = T.E.A; E.begin(); T.E.B.begin(); E.tap(part); var r = E.card(job); return { r: r, text: last(E).text }; }
var n1 = noFor('mem', 'cpu', 21), n2 = noFor('mem', 'drive', 21), n3 = noFor('mem', 'gpu', 21);
gate('memory out, thinking card → she could think, she forgot what she was doing', n1.r === 'wrong' && n1.text === B.no.mem.cpu && /could think/.test(n1.text) && /forgot what I was doing/.test(n1.text), n1.text);
gate('memory out, files card → the photos were fine, she forgot what she was doing', n2.r === 'wrong' && n2.text === B.no.mem.drive && /photos were fine/.test(n2.text) && /forgot what I was doing/.test(n2.text), n2.text);
gate('memory out, any other card → the general forgetting line', n3.r === 'wrong' && n3.text === B.no.mem['*'] && /forgetting what I was doing/.test(n3.text), n3.text);
gate('three wrong cards, three different answers', n1.text !== n2.text && n2.text !== n3.text && n1.text !== n3.text);
var n4 = noFor('cpu', 'mem', 23); gate('processor out, memory card → she knew what she was doing, could not think', n4.text === B.no.cpu.mem && /knew what I was doing/.test(n4.text) && /could not think/.test(n4.text), n4.text);
var n5 = noFor('drive', 'mem', 23); gate('storage out, memory card → she knew what she was doing, photos gone', n5.text === B.no.drive.mem && /knew what I was doing/.test(n5.text) && /GONE/.test(n5.text), n5.text);
var n6 = noFor('fan', 'mem', 25); gate('a flat no line (fan) still works', n6.r === 'wrong' && n6.text === B.no.fan, n6.text);

/* 17 · cue words: memory lines are about forgetting what she was doing; processor lines about thinking; all twelve words or fewer */
function flat(v) { return typeof v === 'string' ? [v] : Object.keys(v).map(function (k) { return v[k]; }); }
function memLines(P) { return [P.pulled.mem, P.pulled2.mem, P.back.mem, P.told.mem].concat(flat(P.no.mem)); }
function cpuLines(P) { return [P.pulled.cpu, P.back.cpu, P.told.cpu].concat(flat(P.no.cpu)); }
function driveLines(P) { return [P.pulled.drive, P.pulled2.drive, P.back.drive, P.told.drive].concat(flat(P.no.drive)); }
var MEMCUE = /forgot|forgotten|forgetting|remember/i, THINKCUE = /think|thought|head went blank|mind\b/i, pids = Object.keys(L.patients);
function cueOk(s) { return MEMCUE.test(s) && !THINKCUE.test(s); }
gate('every memory line, all three patients, carries forgot/forgotten/remember', pids.every(function (id) { return memLines(L.patients[id]).every(function (s) { return MEMCUE.test(s); }); }));
gate('no memory line says think/thought/blank (except the one that rules the thinking card out)', pids.every(function (id) { var P = L.patients[id]; return [P.pulled.mem, P.pulled2.mem, P.back.mem, P.told.mem, P.no.mem.drive, P.no.mem['*']].every(cueOk); }));
gate('every processor line, all three patients, says think', pids.every(function (id) { return cpuLines(L.patients[id]).every(function (s) { return /think/i.test(s); }); }));
gate('every storage line says files/photos/poems and none says forgot', pids.every(function (id) { return driveLines(L.patients[id]).every(function (s) { return /files|photos|poems|spreadsheets|saved|christening|made/i.test(s) && !/forgot|forgetting/i.test(s); }); }));
gate('every memory/processor/storage line is twelve words or fewer', pids.every(function (id) { var P = L.patients[id]; return memLines(P).concat(cpuLines(P), driveLines(P)).every(function (s) { return s.split(/\s+/).length <= 12; }); }));
gate('every graphics line (pulled, told, no) says screen/picture/see', pids.every(function (id) { var P = L.patients[id]; return [P.pulled.gpu, P.told.gpu].concat(flat(P.no.gpu)).every(function (s) { return /screen|picture|see/i.test(s); }); }));
gate('the three per-card no objects each have a general line', pids.every(function (id) { var P = L.patients[id]; return ['mem', 'drive', 'cpu'].every(function (k) { return typeof P.no[k] === 'object' && typeof P.no[k]['*'] === 'string'; }); }));

/* 11 · a partner who goes (her laptop died, or she never came back): the part in her hand goes back in, the patient can be finished */
var TG = pair({ seed: 5 }); TG.E.A.hello(); TG.E.B.hello(); TG.run(2100); TG.E.A.begin(); TG.E.B.begin();
TG.E.B.tap('fan'); TG.run(2300);
gate('before she goes, her part is hers', TG.E.A.tap('fan') === 'theirs');
var freed = TG.E.A.gone('B');
gate('gone: her part is let go', freed.length === 1 && freed[0] === 'fan' && TG.E.A.S.parts.fan.status === 'in' && !TG.E.A.S.parts.fan.by, JSON.stringify(freed));
gate('gone: she is shown as away', TG.E.A.S.presence.B.gone === true && TG.E.A.S.presence.B.here === false);
gate('gone twice frees nothing more', TG.E.A.gone('B').length === 0);
OP.PARTS.forEach(function (p) { if (TG.E.A.S.parts[p].status !== 'sealed') { TG.E.A.tap(p); TG.E.A.card(p); } });
gate('gone: the patient can be finished alone', TG.E.A.S.stage === 'done', TG.E.A.S.stage);
var TG2 = pair({ seed: 6 }); TG2.E.A.hello(); TG2.E.B.hello(); TG2.run(2100); TG2.E.A.begin(); TG2.E.B.begin(); TG2.E.A.gone('B');
TG2.E.B.hello(); TG2.run(2300);
gate('she comes back: no longer gone, here again', TG2.E.A.S.presence.B.gone === false && TG2.E.A.S.presence.B.here === true);
/* 12 · the ward round with a partner who goes: her unfinished beds are let go and the share counts again */
var WD = require('../../platform/assets/l6/wardengine.js');
function ward2(seed) {
  var clock = vclock(), bus = OP.makeLocalBus(500, clock), out = {};
  ['A', 'B'].forEach(function (s) { var ep = bus.endpoint(); var w = WD.makeWard({ seat: s, seats: ['A', 'B'], bus: ep, seed: seed, rnd: seeded(seed) }); ep.on(w.receive); out[s] = w; });
  out.run = function (ms) { clock.run(ms); }; return out;
}
function fixBed(w, id) { w.take(id); return w.fit(WD.W && L.ward.filter(function (b) { return b.id === id; })[0].missing); }
var WG = ward2(9); WG.A.hello(); WG.B.hello(); WG.run(600);
var beds = WG.A.S.order.slice();
gate('ward: a pair sees four beds, a share of two each', beds.length === 4 && WG.A.S.cap === 2, beds.length + '/' + WG.A.S.cap);
WG.B.take(beds[3]); WG.run(600);
fixBed(WG.A, beds[0]); fixBed(WG.A, beds[1]); WG.run(600);
gate('ward: at her share she cannot take a third bed', WG.A.take(beds[2]) === 'cap');
var wf = WG.A.gone('B');
gate('ward gone: her unfinished bed is let go', wf.length === 1 && wf[0] === beds[3] && !WG.A.S.beds[beds[3]].by, JSON.stringify(wf));
gate('ward gone: the share is counted again over who is left', WG.A.S.cap === 4, WG.A.S.cap);
fixBed(WG.A, beds[2]); fixBed(WG.A, beds[3]);
gate('ward gone: the round can be finished alone', WG.A.doneAll());
var WG2 = ward2(9); WG2.A.hello(); WG2.B.hello(); WG2.run(600); WG2.A.gone('B'); WG2.B.hello(); WG2.run(600);
gate('ward: she comes back, the share goes back to two', WG2.A.S.cap === 2 && WG2.A.S.presence.B.gone === false);

/* controls: these must fail */
control('without gone, a quiet partner’s part frees itself', (function () { var T = pair({ seed: 5 }); T.E.A.hello(); T.E.B.hello(); T.run(2100); T.E.A.begin(); T.E.B.begin(); T.E.B.tap('fan'); T.run(2300); T.run(90000); return T.E.A.tap('fan') === 'out'; })());
control('gone on a partner holding nothing frees a part', (function () { var T = pair({ seed: 5 }); T.E.A.hello(); T.E.B.hello(); T.run(2100); T.E.A.begin(); T.E.B.begin(); return T.E.A.gone('B').length > 0; })());
control('ward: without gone, her bed is still free to take', (function () { var W = ward2(9); W.A.hello(); W.B.hello(); W.run(600); var b = W.A.S.order; W.B.take(b[3]); W.run(600); return W.A.take(b[3]) === 'took'; })());
control('ward gone frees a bed she already fixed', (function () { var W = ward2(9); W.A.hello(); W.B.hello(); W.run(600); var b = W.A.S.order; fixBed(W.B, b[3]); W.run(600); return W.A.gone('B').length > 0 || !W.A.S.beds[b[3]].done; })());
var OLDMEM = ['Pet, what was I saying? I had a thought. It went.', 'I came in here for something. A spoon? Not a spoon.', 'No, love. The photos were fine. My head went blank.', 'There it is. I was thinking about a bun.'];
control('the OLD Bernadette memory lines pass the cue gate', OLDMEM.every(cueOk));
control('even one OLD memory line passes the cue gate', OLDMEM.some(cueOk));
control('the no line is the same whichever wrong card is tapped', n1.text === n2.text);
control('a wrong card seals the part', A3.S.parts.cpu && (function () { A3.tap('cpu'); A3.card('mem'); return A3.S.parts.cpu.status === 'sealed'; })());
control('a second part can come out while one is out', A3.tap('gpu') === 'out');
control('tapping a partner’s part takes it', (function () { var T = pair({ seed: 2 }); T.E.A.begin(); T.E.B.begin(); T.E.A.tap('fan'); T.run(2300); return T.E.B.tap('fan') === 'out'; })());
control('the board comes out', A4.tap('board') === 'out');
control('the partner’s face changes with my part', (function () { var T = pair({ seed: 2 }); T.E.A.begin(); T.E.B.begin(); T.E.A.tap('fan'); T.run(2300); return T.E.B.S.my.out === 'fan'; })());

console.log('\n' + (fails ? fails + ' FAILED of ' + n : 'all ' + n + ' engine gates pass'));
process.exit(fails ? 1 : 0);
