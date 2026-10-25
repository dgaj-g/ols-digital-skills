/* j2l5 judge cases — copied from the design's L5_PROTOTYPES/hour/judge.test.js (14 Oct 2026). Two lines changed: the judge comes from J2L5_JUDGE (the SHIPPED judge), and the counts are exported, not exited. */
var J = require(process.env.J2L5_JUDGE), fails = 0, n = 0;
function eq(name, got, want) { n++; var g = JSON.stringify(got), w = JSON.stringify(want); if (g !== w) { fails++; console.log('FAIL ' + name + '\n   got  ' + g + '\n   want ' + w); } }
var st0 = { atPrint: 0, lit: false }, stF = { atPrint: 3, lit: false }, stL = { atPrint: 3, lit: true };
eq('fwd ok', J.line1('forward(10)', st0).key, 'fwdOk'); eq('fwd trailing space', J.line1('forward(10)  ', stL).key, 'fwdOk');
eq('look ok', J.line1('look()', stF).key, 'lookOk'); eq('look at gate', J.line1('look()', st0).key, 'lookTwice'); eq('look twice', J.line1('look()', stL).key, 'lookTwice');
eq('fwd before look', J.line1('forward(10)', stF).key, 'fwdTwice');
eq('Forward cap', J.line1('Forward(10)', st0).key, 'capF'); eq('FORWARD cap', J.line1('FORWARD(10)', st0).key, 'capF'); eq('Look cap', J.line1('Look()', stF).key, 'capL');
eq('forward 10', J.line1('forward 10', st0).key, 'noBr'); eq('forward bare', J.line1('forward', st0).key, 'noBr'); eq('forward(10 open', J.line1('forward(10', st0).key, 'noClose');
eq('forward()', J.line1('forward()', st0).key, 'noNum'); eq('forward(20)', J.line1('forward(20)', st0), { ok: false, key: 'fwdN', n: 20 });
eq('look bare', J.line1('look', stF).key, 'lookNoBr'); eq('look(10)', J.line1('look(10)', stF).key, 'lookArg'); eq('junk', J.line1('fly please', st0).key, 'notRun');
eq('loop for ok', J.loop1(0, 'for i in range(20):').key, 'forOk'); eq('loop no colon', J.loop1(0, 'for i in range(20)').key, 'forNoColon');
eq('loop no br', J.loop1(0, 'for i in range 20:').key, 'forNoBr'); eq('loop cap', J.loop1(0, 'For i in range(20):').key, 'forCap');
eq('loop 19', J.loop1(0, 'for i in range(19):'), { ok: false, key: 'forN', n: 19 }); eq('loop no i', J.loop1(0, 'for in range(20):').key, 'forNoI'); eq('loop range()', J.loop1(0, 'for i in range():').key, 'forNoNum');
eq('loop fwd in', J.loop1(1, '    forward(10)').key, 'fwdIn'); eq('loop fwd flat', J.loop1(1, 'forward(10)').key, 'fwdNoIndent'); eq('loop fwd 2sp', J.loop1(1, '  forward(10)').key, 'spaces');
eq('loop look in', J.loop1(2, '    look()').key, 'lookIn'); eq('loop look flat', J.loop1(2, 'look()').key, 'lookNoIndent'); eq('loop fwd cap in', J.loop1(1, '    Forward(10)').key, 'capF');
eq('say for', J.say1(0, 'for i in range(3):', 3).key, 'forOk'); eq('say for 5 wanted 3', J.say1(0, 'for i in range(5):', 3).key, 'forNcard'); eq('say ok', J.say1(1, '    say(i)').key, 'sayOk');
eq('say(3)', J.say1(1, '    say(3)').key, 'say3'); eq('say i', J.say1(1, '    say i').key, 'sayNoBr'); eq('say flat', J.say1(1, 'say(i)').key, 'sayNoIndent');
var SQ = { walls: 4, turn: 90 }, FO = { walls: 6, turn: 60 }, TR = { walls: 3, turn: 120 };
function p2(a, b, c, f) { var r = J.plan2([a, b, c], f); return [r.run, r.pass, r.key]; }
eq('sq 4', p2('for i in range(4):', '    forward(100)', '    left(90)', SQ), [true, true, 'ok']); eq('sq 3 must fail', p2('for i in range(3):', '    forward(100)', '    left(90)', SQ), [true, false, 'short1']);
eq('sq 2', p2('for i in range(2):', '    forward(100)', '    left(90)', SQ), [true, false, 'shortMore']); eq('sq 5', p2('for i in range(5):', '    forward(100)', '    left(90)', SQ), [true, false, 'over']);
eq('sq no num', p2('for i in range():', '    forward(100)', '    left(90)', SQ), [false, undefined, 'noNum']); eq('sq flat', p2('for i in range(4):', 'forward(100)', '    left(90)', SQ), [false, undefined, 'indent']);
eq('sq right 90 passes', J.plan2(['for i in range(4):', '    forward(100)', '    right(90)'], SQ).note, 'wrongTurn'); eq('sq right 90 pass', p2('for i in range(4):', '    forward(100)', '    right(90)', SQ), [true, true, 'ok']);
eq('sq left 60', p2('for i in range(4):', '    forward(100)', '    left(60)', SQ), [true, false, 'wrongTurn']); eq('sq no turn', p2('for i in range(4):', '    forward(100)', '', SQ), [true, false, 'noTurn']);
eq('sq fwd 50', p2('for i in range(4):', '    forward(50)', '    left(90)', SQ), [true, false, 'wrongLen']); eq('fold 6', p2('for i in range(6):', '    forward(100)', '    left(60)', FO), [true, true, 'ok']);
eq('fold 4', p2('for i in range(4):', '    forward(100)', '    left(60)', FO), [true, false, 'shortMore']); eq('fold 7', p2('for i in range(7):', '    forward(100)', '    left(60)', FO), [true, false, 'over']);
eq('tri 3', p2('for i in range(3):', '    forward(100)', '    left(120)', TR), [true, true, 'ok']); eq('tri 4 must fail', p2('for i in range(4):', '    forward(100)', '    left(120)', TR), [true, false, 'over']);
function p3(a, b, c) { var r = J.plan3([a, b, c]); return [r.run, r.pass, r.key]; }
eq('spiral found', p3('for i in range(10):', '    forward(i * 10)', '    left(90)'), [true, true, 'found']); eq('spiral 10*i', p3('for i in range(10):', '    forward(10 * i)', '    left(90)'), [true, true, 'found10i']);
eq('spiral fwd10 must fail', p3('for i in range(10):', '    forward(10)', '    left(90)'), [true, false, 'fwd10']); eq('spiral fwd i', p3('for i in range(10):', '    forward(i)', '    left(90)'), [true, false, 'fwdI']);
eq('spiral range5', J.plan3(['for i in range(5):', '    forward(i * 10)', '    left(90)']).m, 40); eq('spiral range5 key', p3('for i in range(5):', '    forward(i * 10)', '    left(90)'), [true, false, 'shortRange']);
eq('spiral range20', J.plan3(['for i in range(20):', '    forward(i * 10)', '    left(90)']).k, 10); eq('spiral range20 key', p3('for i in range(20):', '    forward(i * 10)', '    left(90)'), [true, true, 'longRange']);
eq('spiral no turn', p3('for i in range(10):', '    forward(i * 10)', ''), [true, false, 'noTurn']); eq('spiral right', p3('for i in range(10):', '    forward(i * 10)', '    right(90)'), [true, true, 'right90']);
eq('spiral flat', p3('for i in range(10):', 'forward(i * 10)', '    left(90)'), [false, undefined, 'indent']);
function f4(i, a, b, c) { var r = J.fix4(i, [a, b, c]); return [r.run, r.pass, r.key, r.k]; }
eq('lane fixed', f4(0, 'for i in range(6):', '    forward(100)', '    look()'), [true, true, 'fixed', 6]); eq('lane 7', f4(0, 'for i in range(7):', '    forward(100)', '    look()'), [true, false, 'over', 7]);
eq('lane 120', f4(0, 'for i in range(5):', '    forward(120)', '    look()'), [true, false, 'len', 5]); eq('lane unchanged must fail', f4(0, 'for i in range(5):', '    forward(100)', '    look()'), [true, false, 'still', 5]);
eq('yard fixed', f4(1, 'for i in range(4):', '    forward(100)', '    left(90)'), [true, true, 'fixed', 4]); eq('yard 100', f4(1, 'for i in range(4):', '    forward(100)', '    left(100)'), [true, false, 'turn', 4]);
eq('yard 5 at 80', f4(1, 'for i in range(5):', '    forward(100)', '    left(80)'), [true, false, 'turn', 5]); eq('yard unchanged', f4(1, 'for i in range(4):', '    forward(100)', '    left(80)'), [true, false, 'turn', 4]);
eq('barn fixed', f4(2, 'for i in range(6):', '    forward(10)', '    look()'), [true, true, 'fixed', 6]); eq('barn 60', f4(2, 'for i in range(60):', '    forward(10)', '    look()'), [true, false, 'big', 60]);
eq('barn while', J.fix4(2, ['while True:', '    forward(10)', '    look()']).key, 'whileAgain'); eq('barn no colon', J.fix4(2, ['for i in range(6)', '    forward(10)', '    look()']).key, 'noColon');
eq('expand', J.expand({ n: 3, body: [{ op: 'forward', arg: { k: 10, c: 0 } }] }).map(function (a) { return a.v; }), [0, 10, 20]);
eq('free star', J.free(['for i in range(5):', '    forward(80)', '    right(144)']).n, 5); eq('free junk', J.free(['print(1)', '', '']), null);
module.exports = { n: n, fails: fails };
