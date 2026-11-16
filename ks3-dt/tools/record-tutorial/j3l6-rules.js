/* J3 L6 THE NIGHT DESK · gate (V87, from the live test-pupil walk of V86): the rule lines and the Count first help.
   1 c2: phone_hours >= 5 on its own finds the same 6 rows, but only because every heavy phone user is a teen. It must NOT
     pass: no green line and no points, but the "only by luck" line. The two-part rule with AND passes.
   2 c2 with OR gets the line that says what OR keeps; c2 with one rule gets "Add AND". c4 with AND gets the line that says
     what AND keeps; c4 with one rule gets "Use OR". The right c4 rule passes.
   3 Count first: every one of the 16 rules gets 3 help steps of 10 words or fewer; the middle step names the rule's own
     joining word or sign; no step gives the number.
   CONTROLS (each must FAIL): the right two-part c2 rule put through the "refused by luck" check; a Count first step
     swapped for one that gives the number.
   NODE_PATH=$(npm root -g) node j3l6-rules.js [--url <served hour.html>] */
'use strict';
const path = require('path'), lib = require('./j3l6-lib.js'), J = lib.judge('j3l6-rules');
global.window = global; require(path.resolve(__dirname, '../../platform/assets/nightdesk/hour/strings.js'));
const S = global.NightStrings || global.S || global.Strings;
const fill = (s, got) => s.replace('{got}', got);
async function tryRule(p, screen, rule) {
  await p.evaluate(id => Hour.go(Hour.ids().indexOf(id)), screen); await lib.sleep(250);
  await p.evaluate(() => { const b = document.getElementById('qbox'); b.value = ''; b.focus(); }); await p.type('#qbox', rule); await p.keyboard.press('Enter'); await lib.sleep(250);
  return p.evaluate(id => ({ ok: !!Hour.state.ok, line: Hour.state.line || '', got: (Hour.state.rows || []).length, paid: !!(Hour.state.paid || {})[id] }), screen);
}
const refusedByLuck = r => !r.ok && r.line === S.c2.luck && !r.paid;
(async () => {
  const p = await lib.page(1366, 625, 'at=c2-ask');
  const luck = await tryRule(p, 'c2-ask', 'phone_hours >= 5');
  J.must(refusedByLuck(luck), 'c2: phone_hours >= 5 alone does not pass; it gets "' + luck.line + '"');
  const right2 = await tryRule(p, 'c2-ask', 'age < 20 AND phone_hours >= 5');
  J.must(right2.ok, 'c2: age < 20 AND phone_hours >= 5 passes');
  J.control(!refusedByLuck(right2), 'the right two-part c2 rule put through the "refused by luck" check');
  const or2 = await tryRule(p, 'c2-ask', 'age < 20 OR phone_hours >= 5');
  J.must(!or2.ok && or2.line === fill(S.c2.wrongOr, or2.got), 'c2 with OR: "' + or2.line + '"');
  const one2 = await tryRule(p, 'c2-ask', 'age < 20');
  J.must(!one2.ok && one2.line === fill(S.c2.wrongOne, one2.got), 'c2 with one rule: "' + one2.line + '"');
  const and4 = await tryRule(p, 'c4-ask', 'pet = "dog" AND pet = "cat"');
  J.must(!and4.ok && and4.line === fill(S.c4.wrongAnd, and4.got).replace(/\b1 rows\b/, '1 row'), 'c4 with AND: "' + and4.line + '"');
  const one4 = await tryRule(p, 'c4-ask', 'pet = "dog"');
  J.must(!one4.ok && one4.line === fill(S.c4.wrongOne, one4.got), 'c4 with one rule: "' + one4.line + '"');
  const right4 = await tryRule(p, 'c4-ask', 'pet = "dog" OR pet = "cat"');
  J.must(right4.ok, 'c4: pet = "dog" OR pet = "cat" passes');
  J.must(!p._errs.length, 'no page errors' + (p._errs.length ? ' — ' + p._errs[0] : '')); await p.close();

  /* Count first: the help shows how, never the number */
  const q = await lib.page(1366, 625, 'late=1'); await q.click('[data-x="count"]'); await lib.sleep(200);
  const items = S.late.count.items, seen = [];
  for (let i = 0; i < items.length; i++) {
    const h = await q.evaluate(() => { Hour.help(true); const s = [...document.querySelectorAll('#helpText li')].map(e => e.textContent.trim()); const code = (document.querySelector('main .demo code') || {}).textContent || ''; Hour.help(false); return { s, code }; });
    seen.push(Object.assign({ it: items.find(x => x.rule === h.code) }, h));
    await q.click('[data-cnt="0"]'); await lib.sleep(120); const more = await q.$('[data-act="late-next"]'); if (!more) break; await q.click('[data-act="late-next"]'); await lib.sleep(150);
  }
  const word = r => /\bBETWEEN\b/.test(r) ? 'BETWEEN' : /^\s*NOT\b/.test(r) ? 'NOT' : /\bOR\b/.test(r) ? 'OR' : /\bAND\b/.test(r) ? 'AND' : /<=/.test(r) ? '<=' : /</.test(r) ? '<' : />/.test(r) ? '>' : '';
  const bad = it => { const f = []; if (!it.it) return ['no rule on screen']; if (it.s.length !== 3) f.push(it.s.length + ' steps'); it.s.forEach(t => { if (t.split(/\s+/).length > 10) f.push('long: ' + t); });
    const w = word(it.it.rule); if (w && (it.s[1] || '').indexOf(w) < 0) f.push('middle step does not name ' + w + ': ' + it.s[1]);
    if (it.s.some(t => new RegExp('(^|\\D)' + it.it.opts[0] + '(\\D|$)').test(t))) f.push('a step gives the number ' + it.it.opts[0]); return f; };
  const faults = seen.flatMap(it => bad(it).map(b => (it.code || '?') + ': ' + b));
  J.must(seen.length === items.length && !faults.length, 'Count first help: ' + seen.length + ' of ' + items.length + ' rules each get 3 steps that name the rule\'s word or sign and never the number' + (faults.length ? ' — ' + faults.slice(0, 6).join(' · ') : ''));
  const planted = Object.assign({}, seen[0], { s: [seen[0].s[0], 'It keeps ' + seen[0].it.opts[0] + ' rows.', seen[0].s[2]] });
  J.control(bad(planted).some(t => /gives the number/.test(t)), 'a Count first step swapped for one that gives the number');
  J.must(!q._errs.length, 'no page errors in the late shift' + (q._errs.length ? ' — ' + q._errs[0] : '')); await q.close();
  await J.end();
})();
