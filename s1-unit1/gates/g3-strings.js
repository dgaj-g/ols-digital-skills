#!/usr/bin/env node
/* G3 — strings (SPEC §7). Every pupil string in platform/strings.js equals the prototype's S word for word (the cold-read
 * wording, SPEC §3), the eight topic names match, every guard / system / staff line in X is in SPEC §3 (or, where SPEC
 * says "as A2", in the A2 platform's strings.json), every S.key / X.key the page uses exists, and the served Index.html
 * carries exactly these strings. The cold read is on file (COLD_READ_VERDICTS.md — not rerun, his word).
 * CONTROLS (must fail): one changed word in S, one changed word in X, and a page that uses a string that does not exist.
 * Run: node s1-unit1/gates/g3-strings.js  (exit 0 = GREEN). Output: gates/out/g3-strings.txt */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert');
const ROOT = path.join(__dirname, '..');
const DESIGN = process.env.S1U1_DESIGN || '/Users/damiengartland/Desktop/Claude Work/S1 Unit 1 Platform';
const A2 = path.join(ROOT, '..', 'a2-ssd', 'platform', 'strings.json');
const OUT = path.join(__dirname, 'out'); fs.mkdirSync(OUT, { recursive: true });
const log = [], res = { pass: 0, fail: 0 };
function check(name, good, detail) { good ? res.pass++ : res.fail++; log.push((good ? 'PASS ' : 'FAIL ') + name + (detail != null && !good ? ' · ' + detail : '')); }
const read = (p) => fs.readFileSync(p, 'utf8');
// ---- the design's wording
const proto = read(path.join(DESIGN, 'prototype', 'app.js'));
const sFrom = proto.indexOf('var S = {'), tFrom = proto.indexOf('var TOPICS = [');
const tTo = proto.indexOf('];', tFrom);
const P = vm.runInNewContext(proto.slice(sFrom, tFrom) + proto.slice(tFrom, tTo + 2) + '\n;({S: S, TOPICS: TOPICS})', {});
const spec = read(path.join(DESIGN, 'SPEC.md'));
const s3 = spec.slice(spec.indexOf('## 3. Screens'), spec.indexOf('## 4. Rounds'));
const ticks = new Set((s3.match(/`[^`]+`/g) || []).map((t) => t.slice(1, -1)));
const bold = new Set((s3.match(/\*\*[^*]+\*\*/g) || []).map((t) => t.slice(2, -2)));
const a2 = JSON.parse(read(A2)), a2vals = new Set(Object.values(a2).filter((v) => typeof v === 'string'));
const fmt = (s, o) => s.replace(/\{(\w+)\}/g, (_, k) => o[k]);
function deepEq(a, b) { try { assert.deepStrictEqual(JSON.parse(JSON.stringify(a)), JSON.parse(JSON.stringify(b))); return ''; } catch (e) { return e.message.split('\n').slice(0, 8).join(' '); } }
// ---- the audit; returns the list of failures (empty = clean)
function audit(W, pageSrc) {
  const f = [];
  const dS = deepEq(W.S, P.S); if (dS) f.push('S differs from the prototype: ' + dS.slice(0, 300));
  const dT = deepEq(W.TOPICS, P.TOPICS); if (dT) f.push('TOPICS differ: ' + dT.slice(0, 200));
  Object.keys(W.X).forEach((k) => {
    const v = W.X[k], vals = Array.isArray(v) ? v : [fmt(v, { n: /Round \{n\} open/.test(v) ? 1 : 2 })];
    vals.forEach((t) => { if (!ticks.has(t) && !bold.has(t) && !a2vals.has(t)) f.push('X.' + k + ' "' + t + '" is not in SPEC §3 or A2'); });
  });
  const used = (re) => { const out = new Set(); let m; while ((m = re.exec(pageSrc))) out.add(m[1]); return out; };
  used(/\bS\.(\w+)/g).forEach((k) => { if (!(k in W.S)) f.push('page uses S.' + k + ', which does not exist'); });
  used(/\bX\.(\w+)/g).forEach((k) => { if (!(k in W.X)) f.push('page uses X.' + k + ', which does not exist'); });
  return f;
}
const load = (src) => vm.runInNewContext(src + '\n;S1S', {});
const stringsSrc = read(path.join(ROOT, 'platform', 'strings.js'));
const W = load(stringsSrc);
const pageSrc = ['app.js', 'staff.js'].map((f) => read(path.join(ROOT, 'platform', f))).join('\n');
const real = audit(W, pageSrc);
check('strings.js = prototype S, TOPICS, SPEC §3 / A2 lines; every used key exists', real.length === 0, real.slice(0, 8).join(' | '));
log.push('INFO ' + Object.keys(W.S).length + ' pupil strings · ' + W.TOPICS.length + ' topics · ' + Object.keys(W.X).length + ' guard/system/staff lines');
// ---- the served page carries these strings
const html = read(path.join(ROOT, 'server', 'Index.html'));
const blocks = html.split(/<script[^>]*>/).slice(1).map((b) => b.split('</script>')[0]);
const sb = blocks.find((b) => /var S1S = \{/.test(b));
let served = null; try { served = sb && load(sb); } catch (e) { served = null; }
check('the served Index.html carries strings.js unchanged', served && !deepEq(served, W), served ? deepEq(served, W).slice(0, 200) : 'no S1S block');
// ---- the cold read is on file
const cr = path.join(DESIGN, 'coldread', 'COLD_READ_VERDICTS.md');
check('cold read on file (two readers, not rerun)', fs.existsSync(cr) && /Two separated readers/.test(read(cr)) && /Reader A/.test(read(cr)) && /Reader B/.test(read(cr)));
// ---- controls: each must fail
const mS = JSON.parse(JSON.stringify(W)); mS.S.check = 'Check my answers';
check('CONTROL one changed word in S is caught', audit(mS, pageSrc).length > 0);
const mX = JSON.parse(JSON.stringify(W)); mX.X.offline = "We can't reach the server. Check the WiFi, then press Try again.";
check('CONTROL one changed word in X is caught', audit(mX, pageSrc).length > 0);
check('CONTROL a page using a missing string is caught', audit(W, pageSrc + '\nS.nextQuestion; X.wrongPass;').filter((f) => /^page uses/.test(f)).length === 2);
const txt = 'G3 strings · ' + new Date().toISOString() + '\n' + log.join('\n') + '\n' + (res.fail ? 'RED' : 'GREEN') + ' · ' + res.pass + ' pass · ' + res.fail + ' fail\n';
fs.writeFileSync(path.join(OUT, 'g3-strings.txt'), txt); process.stdout.write(txt); process.exit(res.fail ? 1 : 0);
