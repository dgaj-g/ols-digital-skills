#!/usr/bin/env node
/* G9 — slides that build on a click (v12, 11 Nov 2026). The slide pictures must not show an answer before the click that
 * brings it in, so every slide with click animations has one picture per click state (NN-0.webp … NN-(c-1).webp) before
 * the finished picture NN.webp, and the app's slide set carries the matching steps map.
 * COVERAGE (derived from the source decks listed in the design folder's deck_sources.tsv, read by tools/deck_steps.py):
 *   every slide set in S1L has a source deck; the deck's shown slides equal n; its derived click map equals the slide set's
 *   `steps` in lessons.js (a slide missing from the map, or an extra one, fails); the picture folder holds exactly
 *   01..n.webp plus NN-k.webp for each click state, nothing else; every state is the same size as the finished picture;
 *   every state differs from the one after it (so each click shows something new and the first state is not the answer); and
 *   every state matches the finished slide outside the parts still to come (tools/step_check.js), so nothing jumps on a click.
 * CONTROLS (must fail): a steps map with one slide removed, a folder with one step picture missing, a folder with a stray
 *   step picture, a step picture that is a copy of the finished slide, and a first state whose title has moved 8 pixels.
 * Run: node s1-unit1/gates/g9-steps.js  (exit 0 = GREEN). Output: gates/out/g9-steps.txt */
'use strict';
const fs = require('fs'), path = require('path'), os = require('os'), { execFileSync, execSync } = require('child_process');
const ROOT = path.join(__dirname, '..');
const DESIGN = process.env.S1U1_DESIGN || '/Users/damiengartland/Desktop/Claude Work/S1 Unit 1 Platform';
const REPO = process.env.S1_REPO || '/Users/damiengartland/Sites/s1-wt-platform';
const sharp = require(path.join(execSync('npm root -g').toString().trim(), 'sharp'));
const S1L = require(path.join(ROOT, 'platform', 'lessons.js'));
const OUT = path.join(__dirname, 'out'); fs.mkdirSync(OUT, { recursive: true });
const log = [], res = { pass: 0, fail: 0 };
function check(name, good, detail) { good ? res.pass++ : res.fail++; log.push((good ? 'PASS ' : 'FAIL ') + name + (detail != null && !good ? ' · ' + detail : '')); }
function info(s) { log.push('INFO ' + s); }
const pad = (i) => (i < 10 ? '0' : '') + i;
const same = (a, b) => JSON.stringify(Object.keys(a).sort().map((k) => [k, a[k]])) === JSON.stringify(Object.keys(b).sort().map((k) => [k, b[k]]));

function wantFiles(n, steps) { const w = []; for (let i = 1; i <= n; i++) { w.push(pad(i) + '.webp'); for (let k = 0; k < (steps[i] || 0); k++) w.push(pad(i) + '-' + k + '.webp'); } return w.sort(); }
function folderProblems(dir, n, steps) { let have = []; try { have = fs.readdirSync(dir).filter((f) => /\.webp$/.test(f)).sort(); } catch (e) {}
  const want = wantFiles(n, steps), bad = [];
  want.filter((f) => !have.includes(f)).forEach((f) => bad.push('missing ' + f)); have.filter((f) => !want.includes(f)).forEach((f) => bad.push('stray ' + f)); return bad; }
const SC = require(path.join(ROOT, 'tools', 'step_check.js'));
const boxesOf = (src) => JSON.parse(execFileSync('python3', [path.join(ROOT, 'tools', 'deck_steps.py'), 'boxes', src], { encoding: 'utf8' }));

(async () => {
  const src = {}; fs.readFileSync(path.join(DESIGN, 'deck_sources.tsv'), 'utf8').split('\n').filter(Boolean).forEach((l) => { const [id, p] = l.split('\t'); src[id] = p; });
  const decks = [].concat(...S1L.topics.map((t) => t.decks));
  let states = 0, clicks = 0;
  for (const d of decks) {
    const steps = d.steps || {};
    if (!src[d.id]) { check(d.id + ': has a source deck in deck_sources.tsv', false, 'none'); continue; }
    let got; try { got = JSON.parse(execFileSync('python3', [path.join(ROOT, 'tools', 'deck_steps.py'), 'info', src[d.id]], { encoding: 'utf8' })); } catch (e) { check(d.id + ': source deck reads', false, String(e.stderr || e.message).slice(0, 200)); continue; }
    check(d.id + ': the source deck has ' + d.n + ' shown slides', got.n === d.n && got.all === d.n, got.n + ' shown of ' + got.all);
    check(d.id + ': the steps in lessons.js equal the click animations in the source deck (' + Object.keys(got.steps).length + ' slides)', same(steps, got.steps), 'lessons ' + JSON.stringify(steps) + ' · deck ' + JSON.stringify(got.steps));
    const dir = path.join(REPO, 's1_platform', 'decks', d.id), fp = folderProblems(dir, d.n, steps);
    check(d.id + ': the picture folder holds exactly the ' + wantFiles(d.n, steps).length + ' pictures', fp.length === 0, fp.slice(0, 6).join(', ') + (fp.length > 6 ? ' … ' + fp.length : ''));
    if (Object.keys(steps).length) { const sp = await SC.checkDeck(dir, steps, boxesOf(src[d.id]));
      check(d.id + ': every click shows something new, nothing else on the slide moves between clicks, all states the same size', sp.bad.length === 0, sp.bad.slice(0, 6).map((b) => 'slide ' + b.slide + ' state ' + b.k + ': ' + b.why).join(', '));
      info(d.id + ' smallest click change: ' + sp.least + ' pixels'); }
    Object.values(steps).forEach((c) => { clicks += c; states += c + 1; });
  }
  info('slides with clicks: ' + decks.reduce((t, d) => t + Object.keys(d.steps || {}).length, 0) + ', clicks: ' + clicks + ', pictures shown in all: ' + (decks.reduce((t, d) => t + d.n, 0) + clicks));

  // ---- controls: each must fail
  const sw = decks.find((d) => d.id === 'sw'), sws = sw.steps || {}, first = Object.keys(sws)[0];
  if (!first) check('CONTROL: the Software slide set has steps to test with', false, 'none');
  else try {
    const cut = Object.assign({}, sws); delete cut[first];
    const got = JSON.parse(execFileSync('python3', [path.join(ROOT, 'tools', 'deck_steps.py'), 'map', src.sw], { encoding: 'utf8' }));
    check('CONTROL a steps map with slide ' + first + ' removed is caught', !same(cut, got));
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'g9-')), real = path.join(REPO, 's1_platform', 'decks', 'sw');
    fs.readdirSync(real).forEach((f) => fs.copyFileSync(path.join(real, f), path.join(tmp, f)));
    const n1 = pad(+first) + '-1.webp', n0 = pad(+first) + '-0.webp', last = pad(+first) + '-' + (sws[first] - 1) + '.webp';
    fs.renameSync(path.join(tmp, n1), path.join(tmp, 'x')); check('CONTROL a folder with ' + n1 + ' missing is caught', folderProblems(tmp, sw.n, sws).length > 0); fs.renameSync(path.join(tmp, 'x'), path.join(tmp, n1));
    let plain = 1; while (sws[plain]) plain++; const stray = pad(plain) + '-0.webp';
    fs.copyFileSync(path.join(tmp, n0), path.join(tmp, stray)); check('CONTROL a stray step picture (' + stray + ') is caught', folderProblems(tmp, sw.n, sws).length > 0); fs.unlinkSync(path.join(tmp, stray));
    const swBoxes = boxesOf(src.sw), keep = fs.readFileSync(path.join(tmp, last));
    fs.copyFileSync(path.join(tmp, pad(+first) + '.webp'), path.join(tmp, last)); check('CONTROL ' + last + ' copied from the finished slide is caught', (await SC.checkDeck(tmp, sws, swBoxes, [first])).bad.some((b) => /changes only/.test(b.why))); fs.writeFileSync(path.join(tmp, last), keep);
    const s0 = path.join(tmp, n0), band = await sharp(s0).extract({ left: 0, top: 50, width: 900, height: 50 }).toBuffer();
    fs.writeFileSync(s0 + '.tmp', await sharp(s0).composite([{ input: band, left: 0, top: 58 }]).webp().toBuffer()); fs.renameSync(s0 + '.tmp', s0);
    check('CONTROL ' + n0 + ' with its title moved down 8 pixels is caught', (await SC.checkDeck(tmp, sws, swBoxes, [first])).bad.some((b) => /moved/.test(b.why)));
    fs.rmSync(tmp, { recursive: true, force: true });
  } catch (e) { check('CONTROL: the controls could run (the Software step pictures exist)', false, e.message.slice(0, 160)); }

  const head = 'G9 slide click steps — ' + new Date().toISOString() + '\n' + (res.fail ? 'RED' : 'GREEN') + ' ' + res.pass + ' pass, ' + res.fail + ' fail\n\n';
  fs.writeFileSync(path.join(OUT, 'g9-steps.txt'), head + log.join('\n') + '\n');
  console.log(head + log.filter((l) => !/^PASS/.test(l)).join('\n'));
  process.exit(res.fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
