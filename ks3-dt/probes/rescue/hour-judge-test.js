/* Gates 2, 4 and 5 of J3_L4_RESCUE_SPEC.md section 15, run before any screen exists.
   node hour-judge-test.js
   2. Typed-line judge: tables of lines that must pass and lines that must be refused with the exact wording.
   4. Real Python: every program the judge accepts prints the same words as the story shows.
   5. The door, proved: all 1,092 function bodies of 1 to 6 lines made from open, shut and who.
   Each gate has controls that MUST fail: a planted bad judge has to be caught by the same tables. */
'use strict';
var J = require('../../platform/assets/rescue/rescue/hour-judge.js'); /* the SHIPPED judge */
var cp = require('child_process'), fs = require('fs'), os = require('os'), path = require('path');
var fails = 0, checks = 0;
function ok(name, cond, detail) { checks++; if (!cond) { fails++; console.log('  FAIL ' + name + (detail ? '  ' + detail : '')); } }
function head(s) { console.log('\n' + s); }

/* ---------- gate 2: the tables ---------- */
/* each row: [typed line, true | exact refusal wording]. A row with true may carry the exact pass wording as a third item. */
function TABLES(G) {
  return [
    { step: 'river make, def line', f: function (t) { return G.make(0, t); }, rows: [
      ['def cross(:', 'The def line needs a closing bracket before the colon. Type def cross():'],
      ['def cross():', true, 'def is short for define. You are defining a function called cross.'],
      ['def  cross ( ) :', true],
      ['Def cross():', 'Python needs def in small letters. Type def cross():'],
      ['def Cross():', 'Python needs the name in small letters. Type def cross():'],
      ['def rung():', 'Name the function cross this time. Type def cross():'],
      ['def cross:', 'The def line needs brackets after the name. Type def cross():'],
      ['def cross()', 'The def line needs a colon at the end. Type def cross():'],
      ['defcross():', 'The def line needs a space after def. Type def cross():'],
      ['def cross(who):', 'The brackets stay empty this time. Type def cross():'],
      ['cross()', 'That line did not work. The next line to type is def cross():'] ] },
    { step: 'river make, Billy line', f: function (t) { return G.make(1, t); }, rows: [
      ['print()', 'The brackets are empty. Put a word in them. Type print("Billy")'],
      ['print("Billy\')', 'The word needs the same speech marks on both sides. Type print("Billy")'],
      ['print("Billy")', true, 'The winch will ask for Billy. Billy will come to the bucket.'],
      ['    print("Billy")', true], ["print('billy')", true], ['print(“Billy”)', true],
      ['print("pull")', 'This line needs the word Billy. Type print("Billy")'],
      ['Print("Billy")', 'Python needs print in small letters. Type print("Billy")'],
      ['print(Billy)', 'The word needs speech marks round it. Type print("Billy")'],
      ['print("Billy)', 'The word needs speech marks on both sides. Type print("Billy")'],
      ['print("Billy"', 'The line needs a closing bracket at the end. Type print("Billy")'],
      ['print "Billy"', 'print needs brackets round the word. Type print("Billy")'],
      ['Billy', 'That line did not work. The next line to type is print("Billy")'] ] },
    { step: 'river make, pull line', f: function (t) { return G.make(2, t); }, rows: [
      ['print("pull")', true, 'pull will haul the bucket across the river.'],
      ['print("Pull")', 'This line needs the word pull. Type print("pull")'],
      ['print("tip")', 'This line needs the word pull. Type print("pull")'] ] },
    { step: 'river make, tip line', f: function (t) { return G.make(3, t); }, rows: [
      ['print("tip")', true, 'tip will set Billy down on the far bank.'],
      ['print(tip)', 'The word needs speech marks round it. Type print("tip")'] ] },
    { step: 'river first call', f: function (t) { return G.call1(t); }, rows: [
      ['cross()', true, 'cross() ran all 3 of its lines. Billy is across.'], ['cross ( )', true],
      ['cross', 'cross on its own does nothing. Add the brackets to make it run: cross()'],
      ['Cross()', 'Python needs the name in small letters, as in your def line: cross()'],
      ['print("Billy")', 'The function is already made. Type its name to use it: cross()'],
      ['def cross():', 'The function is already made. Type its name to use it: cross()'],
      ['cross(', 'cross needs both brackets after it to run: cross()'],
      ['cross("Billy")', 'The brackets stay empty this time. Type cross()'],
      ['go', 'That line did not work. The next line to type is cross()'] ] },
    { step: 'river, Bobby next', f: function (t) { return G.bobby(t); }, rows: [
      ['cross()', true, 'The winch asked for Billy again. Bobby is still on this bank.'],
      ['cross("Bobby")', true, 'Good thinking. cross cannot take a name in its brackets yet.'],
      ['cross(Bobby)', true, 'Good thinking. cross cannot take a name in its brackets yet.'],
      ['print("Bobby")', 'The function is already made. Use it to carry Bobby.'],
      ['Bobby()', 'There is no function called Bobby. Your function is called cross.'],
      ['bobby()', 'There is no function called Bobby. Your function is called cross.'],
      ['cross', 'cross on its own does nothing. Add the brackets to make it run.'],
      ['help', 'That line did not work. Your function is called cross. Type its name with the brackets.'] ] },
    { step: 'river gap, def line', f: function (t) { return G.gap(0, t); }, rows: [
      ['def cross(who):', true, 'cross now has a gap called who.'], ['def cross( who ) :', true],
      ['def cross():', 'The brackets are empty. Put the name of the gap in them.'],
      ['def cross("who"):', 'who is the name of the gap, not a word to print. Take the speech marks away.'],
      ['def cross(name):', 'A gap called name would work in Python. This gap is called who, so type who.'],
      ['def cross(Who):', 'Python treats Who and who as two different names. This gap is called who in small letters, so type who.'],
      ['def cross(who)', 'The def line needs a colon at the end.'],
      ['Def cross(who):', 'Python needs def in small letters.'],
      ['def Cross(who):', 'Python needs the name in small letters.'],
      ['def cross who:', 'That line did not work. The def line needs who in its brackets.'] ] },
    { step: 'river gap, print line', f: function (t) { return G.gap(1, t); }, rows: [
      ['print(who)', true, 'The winch will ask for whatever name is in the gap.'], ['    print( who )', true],
      ['print("who")', 'With speech marks the winch would ask for someone named who. Take them away.'],
      ['print("Billy")', 'Billy is the stuck name again. Put who in the brackets instead.'],
      ['print(Who)', 'Python needs who in small letters, the same as the def line.'],
      ['print(name)', 'The gap is called who. Put who in the brackets.'],
      ['Print(who)', 'Python needs print in small letters.'],
      ['print(who', 'The line needs a closing bracket at the end.'],
      ['print who', 'print needs brackets round the word.'],
      ['who', 'That line did not work. The print line needs who in its brackets.'] ] },
    { step: 'river, Bobby crosses', f: function (t) { return G.call2(t); }, rows: [
      ['cross("Bobby")', true, '"Bobby" went into the gap. Bobby is across.'],
      ['cross("bobby")', true, '"bobby" went into the gap. Bobby is across.'], ["cross('Bobby')", true],
      ['cross()', 'The gap is empty. Put a name in the brackets.'],
      ['cross(Bobby)', 'Bobby is a word, so it needs speech marks round it.'],
      ['cross("Billy")', 'Billy is already across. Bobby is the one waiting.'],
      ['cross("Rex")', 'Nobody on this bank has that name. Bobby is waiting.'],
      ['cross("Bobby)', 'The word needs speech marks on both sides.'],
      ['cross("Bobby"', 'The line needs a closing bracket at the end.'],
      ['cross', 'cross on its own does nothing. Add the brackets and the name.'],
      ['Cross("Bobby")', 'Your function is called cross, in small letters.'],
      ['print("Bobby")', 'The function is already made. Type its name to use it.'],
      ['Bobby', 'That line did not work. The next line to type is cross("Bobby")'] ] },
    { step: 'river, the hedgehog', f: function (t) { return G.hog(t); }, rows: [
      ['cross("Spike")', true, 'cross("Spike") carried Spike. You used the same function with a new name.'],
      ['cross("pip")', true, 'cross("pip") carried pip. You used the same function with a new name.'], ["cross('Conker')", true],
      ['cross()', 'The gap is empty. Who is crossing?'],
      ['cross(Spike)', 'A name is a word, so it needs speech marks round it.'],
      ['cross("Billy")', 'Billy is already across. Choose a new name for the hedgehog.'],
      ['cross("bobby")', 'Bobby is already across. Choose a new name for the hedgehog.'],
      ['cross("S")', 'Choose a different name. Use 2 to 10 letters.'],
      ['cross("Spike the Great")', 'Choose a different name. Use 2 to 10 letters.'],
      ['cross("Sp1ke")', 'Choose a different name. Use 2 to 10 letters.'],
      ['cross("who")', 'Choose a different name. Use 2 to 10 letters.'],
      ['cross("")', 'Choose a different name. Use 2 to 10 letters.'],
      ['cross("Spike)', 'The word needs speech marks on both sides.'],
      ['cross("Spike"', 'The line needs a closing bracket at the end.'],
      ['cross', 'cross on its own does nothing. Add the brackets and a name.'],
      ['print("Spike")', 'The function is already made. Type its name to use it.'],
      ['Spike', 'That line did not work. Your function is called cross.'] ] },
    { step: 'lane make, def line', f: function (t) { return G.dashMake(0, t); }, rows: [
      ['def dash():', true, 'You are defining a function called dash.'],
      ['def dash()', 'The def line needs a colon at the end.'],
      ['def dash:', 'The def line needs brackets after the name.'],
      ['Def dash():', 'Python needs def in small letters.'],
      ['def Dash():', 'Python needs the name in small letters.'],
      ['def run():', 'Name the function dash this time.'],
      ['def dash(who):', 'dash needs no gap. Leave its brackets empty.'],
      ['print("run")', 'Start with the def line. It names the function dash.'],
      ['dash()', 'That line did not work. Start with the def line for dash.'] ] },
    { step: 'lane make, first run line', f: function (t) { return G.dashMake(1, t); }, rows: [
      ['print("run")', true, 'Your first print line is inside dash now. Type the second print line.'],
      ['print("jump")', 'This line needs the word run.'],
      ['print(run)', 'The word needs speech marks round it.'],
      ['print("run"', 'The line needs a closing bracket at the end.'],
      ['Print("run")', 'Python needs print in small letters.'],
      ['def dash():', 'The def line is done. Now type a print line that prints the word run.'],
      ['run', 'That line did not work. Type a print line that prints the word run.'] ] },
    { step: 'lane make, second run line', f: function (t) { return G.dashMake(2, t); }, rows: [
      ['print("run")', true, 'dash is made. Each time you call dash, it prints the word run 2 times.'], ['print("Run")', 'This line needs the word run.'] ] },
    { step: 'lane plan, with 2 dashes in it', f: function (t) { return G.plan(2, t); }, rows: [
      ['dash()', true],
      ['dash', 'dash on its own does nothing. Add the brackets: dash()'],
      ['print("run")', 'The function is already made. Type its name to use it: dash()'],
      ['Dash()', 'Python needs the name in small letters, as in your def line: dash()'],
      ['dash(', 'dash needs both brackets after it to run: dash()'],
      ['run', 'That line did not work. The next line to type is dash()'] ] },
    { step: 'lane plan, with 5 dashes in it', f: function (t) { return G.plan(5, t); }, rows: [
      ['dash()', 'Your plan already has 5 dashes. Press Run the plan.'] ] },
    { step: 'lane, the mend', f: function (t) { return G.mend(t); }, rows: [
      ['print()', 'The brackets are empty. Put a word in them.'],
      ['print("jump\')', 'The word needs the same speech marks on both sides.'],
      ['print("jump")', true, 'Your new line is inside dash now. Press Run the plan.'], ["    print('jump')", true],
      ['jump()', 'jump is not a function. Put the word in a print line.'],
      ['dash()', 'Your plan already has its dashes. Add the new line inside dash.'],
      ['print("hop")', 'The animals jump over a fallen tree. Print the word jump.'],
      ['print("Jump")', 'The animals jump over a fallen tree. Print the word jump.'],
      ['print(jump)', 'The word needs speech marks round it.'],
      ['print("jump"', 'The line needs a closing bracket at the end.'],
      ['jump', 'That line did not work. The new line goes inside dash.'] ] },
    { step: 'door, def line', f: function (t) { return G.doorDef(t); }, rows: [
      ['def rescue(who:', 'The def line needs a closing bracket before the colon.'],
      ['def rescue(the pet):', 'The gap is one word with no spaces. Name it who.'],
      ['def rescue(who):', true, 'rescue has a gap called who.'],
      ['def rescue(name):', true, 'rescue has a gap called name. That works too. From now on, type name wherever a card or help line says who.'],
      ['def home(who):', 'Name the function rescue this time.'],
      ['def inside(who):', 'Name the function rescue this time.'],
      ['def rescue():', 'rescue needs a gap for the name. Put who in the brackets.'],
      ['def rescue("who"):', 'who is the name of the gap, not a word to print. Take the speech marks away.'],
      ['def rescue(who)', 'The def line needs a colon at the end.'],
      ['Def rescue(who):', 'Python needs def in small letters.'],
      ['def Rescue(who):', 'Python needs the name in small letters.'],
      ['def rescue:', 'The def line needs brackets after the name.'],
      ['def rescue(for):', 'Python already uses that word. Name the gap who.'],
      ['def rescue(gang):', 'gang is the name of the list. Name the gap who.'],
      ['rescue(who)', 'That line did not work. A def line starts with the word def.'] ] },
    { step: 'door, a line inside (2 lines so far, gap who)', f: function (t) { return G.doorBody(2, t, 'who'); }, rows: [
      ['print("open")', true, 'The door will open.'], ['print("shut")', true, 'The door will shut.'],
      ['print(who)', true, 'The door will ask for the name in the gap.'],
      ['print("Billy")', true, 'The door will ask for Billy every time.'],
      ['print("who")', true, 'This line prints the word who, with speech marks. The door will ask for the word who every time, not a name.'],
      ['', true],
      ['open()', 'open is not a function. Put the word in a print line.'],
      ['shut()', 'shut is not a function. Put the word in a print line.'],
      ['print(open)', 'The word needs speech marks round it.'],
      ['print(Who)', 'Python needs who in small letters, the same as the def line.'],
      ['print("open"', 'The line needs a closing bracket at the end.'],
      ['Print("open")', 'Python needs print in small letters.'],
      ['print("open the door")', 'Use one word inside the speech marks.'],
      ['open', 'That line did not work. Each line in here is a print line.'] ] },
    { step: 'door, finishing with no lines', f: function (t) { return G.doorBody(0, t, 'who'); }, rows: [
      ['', 'Your function has no lines in it yet. Type a print line first.'] ] },
    { step: 'door, a seventh line', f: function (t) { return G.doorBody(6, t, 'who'); }, rows: [
      ['print("shut")', 'Your function already has 6 lines. That is the most it can hold. Press the button My function is finished.'], ['', true] ] },
    { step: 'door loop, first line', f: function (t) { return G.doorLoop(null, t, ['Billy', 'Bobby', 'Spike']); }, rows: [
      ['for gang in gang:', 'The word after for must be a new name. Use the word who.'],
      ['for print in gang:', 'The word after for must be a new name. Use the word who.'],
      ['for who in gang:', true, 'The loop will take the names in gang one at a time.'],
      ['for animal in gang:', true, 'The loop will take the names in gang one at a time.'],
      ['rescue("Billy")', true, '"Billy" will go into the gap of rescue.'],
      ['for who in gang', 'The for line needs a colon at the end.'],
      ['For who in gang:', 'Python needs for in small letters.'],
      ['for who in list:', 'The list is called gang. Put gang at the end of the for line.'],
      ['rescue()', 'The gap is empty. Put a name in the brackets.'],
      ['rescue(Billy)', 'Billy is a word, so it needs speech marks round it.'],
      ['rescue(who)', 'Nothing has put a name into who yet. Write the loop line first.'],
      ['print("Billy")', 'A loop line looks like this: for name in list:'],
      ['gang', 'A loop line looks like this: for name in list:'] ] },
    { step: 'door loop, the line inside the loop', f: function (t) { return G.doorLoop({ mode: 'loop', v: 'pet', n: 1, calls: [] }, t, ['Billy', 'Bobby', 'Spike']); }, rows: [
      ['rescue(pet)', true, 'Each name will go into the gap of rescue.'], ['    rescue( pet )', true],
      ['rescue()', 'The gap is empty. Put the word after for in the brackets.'],
      ['rescue(who)', 'Your for line puts each name into pet. Put pet in the brackets.'],
      ['rescue("Billy")', 'Your for line puts each name into pet. Put pet in the brackets.'],
      ['Rescue(pet)', 'Your function is called rescue, in small letters.'],
      ['print(pet)', 'The loop must use your function. Your function is called rescue.'],
      ['rescue', 'rescue on its own does nothing. Add brackets and put pet in them.'],
      ['pet', 'This line must call your function. Your function is called rescue.'] ] },
    { step: 'door loop, after 3 direct calls', f: function (t) { return G.doorLoop({ mode: 'direct', v: null, n: 3, calls: ['Billy', 'Bobby', 'Spike'] }, t, ['Billy', 'Bobby', 'Spike']); }, rows: [
      ['rescue("Billy")', 'Your code already has 3 calls. Press Run my code.'],
      ['for who in gang:', 'Your code already calls rescue. Add another call or press Run my code.'] ] },
    /* the page makes the box wait once her loop is in, so she cannot meet this line; the judge still answers it */
    { step: 'door loop, after the loop is finished', f: function (t) { return G.doorLoop({ mode: 'loop', v: 'who', n: 2, calls: [] }, t, ['Billy', 'Bobby', 'Spike']); }, rows: [
      ['rescue(who)', 'Your loop is finished. Press Run my code.'] ] }
  ];
}
function runTables(G, quiet) {
  var bad = 0, n = 0;
  TABLES(G).forEach(function (tb) {
    tb.rows.forEach(function (r) {
      var res = tb.f(r[0]), want = r[1], good;
      n++;
      if (want === true) good = res.ok === true && (r[2] == null || res.msg === r[2]);
      else good = res.ok === false && res.msg === want;
      if (!good) { bad++; if (!quiet) console.log('  FAIL ' + tb.step + ' | ' + JSON.stringify(r[0]) + ' gave ' + JSON.stringify(res.ok) + ' ' + JSON.stringify(res.msg) + (want === true ? (r[2] ? ' wanted pass: ' + r[2] : ' wanted pass') : ' wanted: ' + want)); }
    });
  });
  return { bad: bad, n: n };
}
function plant(over) { var G = {}, k; for (k in J) G[k] = J[k]; for (k in over) G[k] = over[k]; return G; }

head('GATE 2. The typed-line judge');
var r = runTables(J);
checks += r.n; fails += r.bad;
console.log('  ' + r.n + ' typed lines judged, ' + r.bad + ' wrong');
/* every sentence the judge can say is short enough to read at a glance: none over 14 words */
(function () {
  var long = 0, seen = 0;
  TABLES(J).forEach(function (tb) { tb.rows.forEach(function (row) {
    var m = tb.f(row[0]).msg || '';
    m.split(/(?<=[.?!])\s+/).forEach(function (s) { if (!s) return; seen++; var w = s.replace(/print\(.*?\)|def \w+\(.*?\):|\w+\(.*?\)/g, 'code').trim().split(/\s+/).length; if (w > 14) { long++; console.log('  LONG (' + w + ' words): ' + s); } });
  }); });
  ok('no judge sentence is over 14 words', long === 0, long + ' of ' + seen);
})();
/* controls that must fail: a judge with one planted fault each, run through the same tables */
var CONTROLS = [
  ['a judge that takes the def line without its colon', plant({ make: function (n, t) { return n === 0 && /^def cross\(\)$/.test(J.norm(t)) ? { ok: true, msg: '' } : J.make(n, t); } })],
  ['a judge that takes cross without brackets', plant({ call1: function (t) { return J.norm(t) === 'cross' ? { ok: true, msg: '' } : J.call1(t); } })],
  ['a judge that takes print("who") as the gap', plant({ gap: function (n, t) { return n === 1 && /"who"/.test(J.norm(t)) ? { ok: true, msg: 'The winch will ask for whatever name is in the gap.' } : J.gap(n, t); } })],
  ['a judge that takes the old def line again', plant({ gap: function (n, t) { return n === 0 && J.norm(t) === 'def cross():' ? { ok: true, msg: '' } : J.gap(n, t); } })],
  ['a judge that takes Bobby without speech marks', plant({ call2: function (t) { return /^cross\(Bobby\)$/.test(J.norm(t)) ? { ok: true, msg: '' } : J.call2(t); } })],
  ['a judge that lets Billy be the hedgehog', plant({ hog: function (t) { return /Billy/.test(t) ? { ok: true, msg: '', name: 'Billy' } : J.hog(t); } })],
  ['a judge that takes Print with a capital', plant({ dashMake: function (n, t) { return /^Print/.test(J.norm(t)) ? { ok: true, msg: '' } : J.dashMake(n, t); } })],
  ['a judge that takes a sixth dash', plant({ plan: function (c, t) { return J.plan(0, t); } })],
  ['a judge that takes any word for the mend', plant({ mend: function (t) { return J.printWord(J.norm(t)) ? { ok: true, msg: 'Your new line is inside dash now. Press Run the plan.' } : J.mend(t); } })],
  ['a judge that takes a def line with no gap at the door', plant({ doorDef: function (t) { return J.norm(t) === 'def rescue():' ? { ok: true, msg: '', gap: 'who' } : J.doorDef(t); } })],
  ['a judge that takes a for line with no colon', plant({ doorLoop: function (s, t, g) { return J.norm(t) === 'for who in gang' ? { ok: true, msg: '' } : J.doorLoop(s, t, g); } })],
  ['a judge with a reworded refusal', plant({ bobby: function (t) { var o = J.bobby(t); return o.ok ? o : { ok: false, msg: 'Wrong. Try again.' }; } })]
];
CONTROLS.forEach(function (c) { var rr = runTables(c[1], true); ok('control caught: ' + c[0], rr.bad > 0); });
console.log('  ' + CONTROLS.length + ' planted judges, each caught by the tables');

/* ---------- gate 5: the door, proved ---------- */
head('GATE 5. The door, proved');
var GANG = ['Billy', 'Bobby', 'Spike'];
var KINDS = [{ k: 'open', w: 'open' }, { k: 'shut', w: 'shut' }, { k: 'gap', w: 'who' }];
function bodies() { var out = [], len, i, n, b, x; for (len = 1; len <= 6; len++) { n = Math.pow(3, len); for (i = 0; i < n; i++) { b = []; x = i; for (var d = 0; d < len; d++) { b.push(KINDS[x % 3]); x = Math.floor(x / 3); } out.push(b); } } return out; }
function prove(times) {
  var all = bodies(), safe = 0, late = 0, wrongSafe = 0, slowest = 0, noLine = 0;
  all.forEach(function (b) {
    var s = J.simDoor(b, GANG, GANG, times), endsRight = s.outside.length === 0 && !s.open;
    if (endsRight && s.time > times.clock + 1e-9) late++;
    if (s.safe !== (endsRight && s.time <= times.clock + 1e-9)) wrongSafe++;
    if (s.safe) { safe++; if (s.time > slowest) slowest = s.time; }
    if (!s.safe && !s.fail) noLine++;
  });
  return { n: all.length, safe: safe, late: late, wrongSafe: wrongSafe, slowest: slowest, noLine: noLine };
}
var P = prove(J.T);
ok('there are 1,092 bodies', P.n === 1092, String(P.n));
ok('no right program is failed on time', P.late === 0, P.late + ' late');
ok('the run ends safe exactly when everyone is in and the door is shut', P.wrongSafe === 0);
ok('every failed run has its one line', P.noLine === 0);
ok('the slowest right program is inside the clock', P.slowest <= J.T.clock, P.slowest + ' s');
console.log('  ' + P.n + ' bodies, ' + P.safe + ' end safe, slowest right program ' + P.slowest.toFixed(1) + ' s of ' + J.T.clock + ' s');
var slow = prove({ door: 0.5, enter: 2.0, bonk: 0.5, none: 0.3, clock: 12 });
ok('control caught: a planted slow move (2 seconds to run in)', slow.late > 0, slow.late + ' right programs would be failed');
/* the four fail lines, each from a real wrong program, and the step she is sent back to */
function B(s) { return s.split(' ').map(function (w) { return w === 'who' ? { k: 'gap', w: 'who' } : w === 'open' || w === 'shut' ? { k: w, w: w } : { k: 'word', w: w }; }); }
var FOUR = [
  ['who open shut', GANG, 'The door was shut when Billy ran at it.', 'body'],
  ['open "who" shut', GANG, 'The door asked for who. Nobody has that name.', 'body'],
  ['open who shut', ['Billy', 'Billy', 'Spike'], 'The door never asked for Bobby, so Bobby stayed outside.', 'loop'],
  ['open who', GANG, 'Everyone was inside, but the door was still open.', 'body'],
  ['open Billy shut', GANG, 'The door never asked for Bobby, so Bobby stayed outside.', 'body'],
  ['open who shut', ['Billy', 'Bobby', 'Spikey'], 'The door asked for Spikey. Nobody has that name.', 'loop']
];
FOUR.forEach(function (f) {
  var body = B(f[0].replace(/"who"/, 'WHOWORD')).map(function (l) { return l.w === 'WHOWORD' ? { k: 'word', w: 'who' } : l; });
  var s = J.simDoor(body, f[1], GANG);
  ok('fail line: ' + f[2], !s.safe && s.fail === f[2], 'gave ' + JSON.stringify(s.fail));
  ok('sent back to the ' + f[3] + ' for: ' + f[0], J.doorSite(body, GANG) === f[3]);
});
var right = J.simDoor(B('open who shut'), GANG, GANG);
ok('open, who, shut with the loop is safe', right.safe && right.time === 6, right.time + ' s');
ok('who, open, who, shut is safe (a bonk, then in)', J.simDoor(B('who open who shut'), GANG, GANG).safe);

/* ---------- gate 4: real Python ---------- */
head('GATE 4. Real Python');
var progs = [];
/* the river */
progs.push({ name: 'river: cross() carries Billy', src: 'def cross():\n    print("Billy")\n    print("pull")\n    print("tip")\ncross()\n', story: ['Billy', 'pull', 'tip'], how: 'equal' });
progs.push({ name: 'river: cross() again calls Billy again', src: 'def cross():\n    print("Billy")\n    print("pull")\n    print("tip")\ncross()\ncross()\n', story: ['Billy', 'pull', 'tip', 'Billy', 'pull', 'tip'], how: 'equal' });
progs.push({ name: 'river: the gap carries Bobby and Spike', src: 'def cross(who):\n    print(who)\n    print("pull")\n    print("tip")\ncross("Bobby")\ncross("Spike")\n', story: ['Bobby', 'pull', 'tip', 'Spike', 'pull', 'tip'], how: 'equal' });
/* the lane: the story shows the words up to the bonk, then the three dashes still to run */
progs.push({ name: 'lane: the first run, as far as the bonk', src: 'def dash():\n    print("run")\n    print("run")\n' + 'dash()\n'.repeat(5), story: ['run', 'run', 'run', 'run', 'run', 'run'], how: 'starts' });
progs.push({ name: 'lane: the mended run, the 3 dashes still to run', src: 'def dash():\n    print("run")\n    print("jump")\n    print("run")\n' + 'dash()\n'.repeat(5), story: ['run', 'jump', 'run', 'run', 'jump', 'run', 'run', 'jump', 'run'], how: 'ends' });
/* the door: every body with the loop, and a spread with direct calls and stuck names */
bodies().forEach(function (b, i) {
  var s = J.simDoor(b, GANG, GANG);
  progs.push({ name: 'door body ' + i, src: J.doorSource('who', b, { mode: 'loop', v: 'who' }, GANG), story: s.words, how: 'equal' });
});
[['open who shut', ['Billy', 'Bobby', 'Spike']], ['open who shut', ['Billy', 'Billy', 'Spike']], ['open Billy shut', ['Billy', 'Bobby', 'Spike']], ['open WHOWORD shut', ['Billy', 'Bobby', 'Spike']]].forEach(function (d, i) {
  var body = B(d[0]).map(function (l) { return l.w === 'WHOWORD' ? { k: 'word', w: 'who' } : l; });
  progs.push({ name: 'door direct ' + i, src: J.doorSource('who', body, { mode: 'direct', calls: d[1] }, GANG), story: J.simDoor(body, d[1], GANG).words, how: 'equal' });
});
/* control: a planted judge that reads print("who") as the gap. The story would then show the names; Python prints who. */
progs.push({ name: 'CONTROL planted: print("who") read as the gap', src: 'gang = ["Billy", "Bobby", "Spike"]\ndef rescue(who):\n    print("open")\n    print("who")\n    print("shut")\nfor who in gang:\n    rescue(who)\n', story: J.simDoor(B('open who shut'), GANG, GANG).words, how: 'equal', control: true });
var dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rescue-py-'));
fs.writeFileSync(path.join(dir, 'progs.json'), JSON.stringify(progs));
fs.writeFileSync(path.join(dir, 'run.py'), [
  'import json, io, sys, contextlib',
  'progs = json.load(open(sys.argv[1]))',
  'out = []',
  'for p in progs:',
  '    buf = io.StringIO()',
  '    try:',
  '        with contextlib.redirect_stdout(buf):',
  '            exec(p["src"], {})',
  '        words = buf.getvalue().split()',
  '    except Exception as e:',
  '        words = ["ERROR", type(e).__name__]',
  '    out.append(words)',
  'json.dump(out, open(sys.argv[2], "w"))'
].join('\n'));
var py = cp.spawnSync('python3', [path.join(dir, 'run.py'), path.join(dir, 'progs.json'), path.join(dir, 'out.json')], { encoding: 'utf8' });
if (py.status !== 0) { ok('python3 ran', false, py.stderr); }
else {
  var got = JSON.parse(fs.readFileSync(path.join(dir, 'out.json'), 'utf8')), diff = 0, caught = false;
  progs.forEach(function (p, i) {
    var g = got[i], s = p.story, same;
    if (p.how === 'equal') same = g.join(' ') === s.join(' ');
    else if (p.how === 'starts') same = g.slice(0, s.length).join(' ') === s.join(' ');
    else same = g.slice(g.length - s.length).join(' ') === s.join(' ');
    if (p.control) { caught = !same; return; }
    if (!same) { diff++; if (diff < 6) console.log('  FAIL ' + p.name + ': python ' + g.join(' ') + ' | story ' + s.join(' ')); }
  });
  checks += progs.length - 1; fails += diff;
  ok('control caught: the planted print("who") judge', caught);
  console.log('  ' + (progs.length - 1) + ' programs run in real Python, ' + diff + ' differ from the story');
}
fs.rmSync(dir, { recursive: true, force: true });

console.log('\n' + checks + ' checks, ' + fails + ' failed');
console.log(fails === 0 ? 'ALL PASS' : 'FAILED');
process.exit(fails === 0 ? 0 : 1);
