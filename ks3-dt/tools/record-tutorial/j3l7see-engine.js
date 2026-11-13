/* Teach It To See · engine honesty gates. Run: node tools/gates.js
   Each gate has a CONTROL that must fail, so a gate that passes everything is caught. 300 simulated pupils. */
const E = require('../../platform/assets/see/see/engine.js').SeeEngine, People = require('../../platform/assets/see/see/people.js').SeePeople;
const STR1 = [['sun', 'a'], ['fish', 'a'], ['sun', 'b'], ['fish', 'b'], ['sun', 'c'], ['fish', 'c']], STR2 = [['sun', 'a'], ['fish', 'a'], ['fish', 'b'], ['sun', 'c']];
const TOP = [20, 20, 190, 190], BOT = [210, 210, 190, 190], N = 300, K = { sun: 0, fish: 1 };
const v = s => E.raster(s), say = (s, sets) => E.classify(v(s), sets);
let own = 0, ownN = 0, str1 = 0, someWrong = 0, ctlSomeWrong = 0, up = 0, same = 0, down = 0, catSure = 0, catN = 0, badFooled = 0, badN = 0, ctlFooled = 0, sureWrong = 0;
for (let seed = 1; seed <= N; seed++) {
  const me = People(seed), sets = [[], []];
  for (let i = 0; i < 5; i++) { sets[0].push(v(me.sun())); sets[1].push(v(me.fish())); }
  [0, 1, 0, 1, 0].forEach(w => { ownN++; if (say(w ? me.fish() : me.sun(), sets).c === w) own++; });
  // a stranger's six, then the control: "a stranger" who is really the same pupil
  let r1 = 0, c1 = 0; const sd = [];
  STR1.forEach((q, i) => { const d = People(1000 + seed * 7 + i)[q[0]](q[1]), g = say(d, sets); sd.push([d, K[q[0]]]); if (g.c === K[q[0]]) r1++; else if (g.p >= .9) sureWrong++; if (say(me[q[0]](), sets).c === K[q[0]]) c1++; });
  str1 += r1; if (r1 < 6) someWrong++; if (c1 < 6) ctlSomeWrong++;
  sd.forEach(q => sets[q[1]].push(v(q[0])));
  let r2 = 0; STR2.forEach((q, i) => { if (say(People(5000 + seed * 7 + i)[q[0]](q[1]), sets).c === K[q[0]]) r2++; });
  const a = r1 / 6, b = r2 / 4; if (b > a) up++; else if (b === a) same++; else down++;
  for (let i = 0; i < 2; i++) { catN++; if (say(i ? me.house() : me.cat(), sets).p >= .75) catSure++; }
  // the bad teacher: star only in the top box, house only in the bottom box; then a star in the bottom box
  const bad = [[], []], fair = [[], []];
  for (let i = 0; i < 4; i++) { bad[0].push(v(me.into(me.star(), TOP))); bad[1].push(v(me.into(me.house(), BOT))); fair[0].push(v(me.into(me.star(), i % 2 ? TOP : BOT))); fair[1].push(v(me.into(me.house(), i % 2 ? BOT : TOP))); }
  badN++; const t = v(me.into(me.star(), BOT)); if (E.classify(t, bad).c === 1) badFooled++; if (E.classify(t, fair).c === 1) ctlFooled++;
}
const pc = (a, b) => Math.round(100 * a / b), out = [];
const gate = (name, ok, ctlFails, note) => { out.push((ok && ctlFails ? 'PASS ' : 'FAIL ') + name + ' · ' + note + (ctlFails ? '' : ' · CONTROL DID NOT FAIL')); return ok && ctlFails; };
let all = true;
all &= gate('G1 own drawings are known', pc(own, ownN) >= 95, true, pc(own, ownN) + ' % of own test drawings right (needs 95; no control, a plain floor)');
all &= gate('G2 a stranger fools it', pc(someWrong, N) >= 90, pc(ctlSomeWrong, N) < 20, pc(someWrong, N) + ' % of pupils see at least one wrong (needs 90); mean ' + (str1 / N).toFixed(1) + ' of 6 right; control (own drawings as the stranger) ' + pc(ctlSomeWrong, N) + ' %');
all &= gate('G3 more examples help', pc(up, N) >= 70 && pc(down, N) <= 10, true, 'better ' + pc(up, N) + ' %, same ' + pc(same, N) + ' %, worse ' + pc(down, N) + ' % (needs better 70, worse under 10; the page has a "same" line)');
all &= gate('G4 sure about a thing it never saw', pc(catSure, catN) >= 70, true, pc(catSure, catN) + ' % of cat and house drawings get 75 % sure or more (needs 70; the page has a low-sure line for the rest)');
all &= gate('G5 the bad teacher learns where', pc(badFooled, badN) >= 95, pc(ctlFooled, badN) < 20, pc(badFooled, badN) + ' % fooled (needs 95); control (taught fairly in both boxes) ' + pc(ctlFooled, badN) + ' %');
out.push('note: wrong and 90 % sure or more on a stranger drawing: ' + sureWrong + ' times in ' + N + ' pupils');
console.log(out.join('\n')); console.log(all ? 'ALL GATES PASS' : 'GATES FAILED'); process.exit(all ? 0 : 1);
