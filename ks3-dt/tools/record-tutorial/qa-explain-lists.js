/* WARM-UP EXPLAIN LINES · she reads ONE line, the line for the option she clicked (25 Nov 2026, live walk).
   The fault: 15 warm-up questions (J2 and J3 recap pools) keep one explain line per option as a list. The server
   hands every explain on as a string, so the pupil read all three lines glued with commas ("7 days.,> 40 AND...").
   And the warm-up shuffles its options on the server, so a line picked by position would be the wrong line.
   This gate replays the real path for every question that has one line per option:
     the packed key (dev-keys.json)  ->  the server's str_() and its option shuffle (many random orders)
     ->  the page's own explainFor (read out of platform/engines.js), called as the item runner calls it.
   For every option in every order: the shown text is exactly that option's line from content-src, and no
   other line's words are in it. No raw explain list is left in a packed key. The lesson questions already keyed by
   position (J2 L5 on) still show the right line unshuffled, as before.
   CONTROL=1 replays the keys as they are in content-src (before the pack fix): must go RED.
   CONTROL=2 replays the packed keys through explainFor as it is on origin/main (before the page fix): must go RED.
   node tools/record-tutorial/qa-explain-lists.js            (run from ks3-dt/, after node tools/pack-content.js) */
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const KS = path.resolve(__dirname, '../..');
const SRC = process.env.KS3DT_SRC || '/Users/damiengartland/Desktop/Claude Work/KS3 DT Platform/content-src';
const CONTROL = process.env.CONTROL || '';
let PASS = 0; const FAILS = [];
const check = (ok, msg) => { if (ok) PASS++; else { FAILS.push(msg); if (FAILS.length <= 12) console.log('  FAIL  ' + msg); } };

/* the page's own explainFor, lifted out of engines.js (CONTROL=2: the one on origin/main) */
const engSrc = CONTROL === '2'
  ? execFileSync('git', ['show', 'origin/main:ks3-dt/platform/engines.js'], { cwd: KS, maxBuffer: 1 << 27 }).toString()
  : fs.readFileSync(path.join(KS, 'platform/engines.js'), 'utf8');
const at = engSrc.indexOf('function explainFor(');
const end = engSrc.indexOf('\n  }\n', at);
if (at < 0 || end < 0) { console.log('FAIL explainFor not found in engines.js'); process.exit(2); }
const explainFor = new Function(engSrc.slice(at, end + 4) + '\nreturn explainFor;')();
const str_ = v => String(v == null ? '' : v);               // the server's str_, as in PathB_Code.gs
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

function optionsOf(node, id) {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node)) { for (const x of node) { const o = optionsOf(x, id); if (o) return o; } return null; }
  if (node.id === id && Array.isArray(node.options)) return node.options;
  for (const k of Object.keys(node)) { if (k === 'keys') continue; const o = optionsOf(node[k], id); if (o) return o; }
  return null;
}
function walk(dir, out) {
  fs.readdirSync(dir, { withFileTypes: true }).forEach(d => {
    const p = path.join(dir, d.name);
    if (d.isDirectory()) walk(p, out); else if (d.name.endsWith('.json')) out.push(p);
  });
  return out;
}

const packed = JSON.parse(fs.readFileSync(path.join(KS, 'content/dev-keys.json'), 'utf8'));
let lists = 0, positional = 0;
walk(SRC, []).forEach(file => {
  let src; try { src = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { return; }
  if (!src || !src.keys) return;
  const fileId = path.relative(SRC, file).replace(/\\/g, '/').replace(/\.json$/, '');
  const pk = packed[fileId] || {};
  Object.keys(src.keys).forEach(id => {
    const sk = src.keys[id] || {};
    const live = CONTROL === '1' ? sk : (pk[id] || {});
    /* no raw list survives the pack (a sort's per-card map, like the J1 vault, is sent whole by vaultInfo and stays a map) */
    if (!CONTROL) check(!Array.isArray(live.explain), fileId + ' ' + id + ': no raw explain list in the packed key');
    const opts = optionsOf(src, id);
    if (Array.isArray(sk.explain)) {
      lists++;
      check(!!opts && opts.length === sk.explain.length, fileId + ' ' + id + ': one line per option');
      if (!opts) return;
      /* the warm-up: the server shuffles the options, sends the explain through str_, she clicks one */
      for (let round = 0; round < 12; round++) {
        const ord = shuffle(opts.map((_, i) => i));
        const shownOpts = ord.map(oi => str_(opts[oi]));
        const sent = str_(live.explain || '');
        ord.forEach((oi, pos) => {
          const shown = explainFor(sent, pos, shownOpts[pos]);
          const want = sk.explain[oi];
          const others = sk.explain.filter((_, j) => j !== oi);
          check(shown === want && !others.some(l => l && String(shown).indexOf(l) >= 0),
            fileId + ' ' + id + ': she clicks "' + opts[oi] + '" and reads its line' + (shown !== want ? ' (read "' + String(shown).slice(0, 70) + '")' : ''));
        });
      }
    } else if (typeof sk.explain === 'string' && sk.explain.charAt(0) === '[' && opts) {
      /* a lesson question already keyed by position: the item runner passes the source index, unshuffled */
      let arr; try { arr = JSON.parse(sk.explain); } catch (e) { return; }
      if (!Array.isArray(arr)) return;
      positional++;
      opts.forEach((o, i) => check(explainFor(str_(live.explain), i, o) === arr[i], fileId + ' ' + id + ': lesson line ' + (i + 1) + ' still shows'));
    }
  });
});
check(lists >= 15, 'found the warm-up questions with one line per option (' + lists + ')');
check(positional >= 30, 'found the lesson questions keyed by position (' + positional + ')');
/* a plain one-sentence explain is never touched */
check(explainFor('Seven days, both ends counted.', 2, 'x') === 'Seven days, both ends counted.', 'a plain sentence shows as it is');
console.log('\nqa-explain-lists' + (CONTROL ? ' (CONTROL=' + CONTROL + ')' : '') + ': ' + lists + ' list questions, ' + positional +
  ' positional · ' + (FAILS.length ? 'RED ' + FAILS.length + ' of ' + (PASS + FAILS.length) : 'PASS ' + PASS));
process.exit(FAILS.length ? 1 : 0);
