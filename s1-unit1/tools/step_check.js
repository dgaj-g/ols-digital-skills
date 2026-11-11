#!/usr/bin/env node
/* step_check.js — are a slide set's click-state pictures right? (v12, 11 Nov 2026). Used by gate G9 and by render_steps.sh.
 * For each slide with clicks, state k (NN-k.webp) must:
 *   1. be the same size as the finished slide NN.webp;
 *   2. differ from the next state (NN-(k+1), or NN for the last), so each click shows something new;
 *   3. match the finished slide everywhere outside the boxes of the parts that appear after click k. PowerPoint sometimes lays
 *      a line of text out differently from one export to the next; this catches a picture where anything else on the slide
 *      moved, so nothing jumps when a pupil clicks.
 * CLI: node step_check.js <id> <source.pptx>  -> one line "bad <slide> <k> <reason>" per failing state, nothing if all good. */
'use strict';
const fs = require('fs'), path = require('path'), { execFileSync, execSync } = require('child_process');
const sharp = require(path.join(execSync('npm root -g').toString().trim(), 'sharp'));
const REPO = process.env.S1_REPO || '/Users/damiengartland/Sites/s1-wt-platform';
const pad = (i) => (i < 10 ? '0' : '') + i;
const T = 48, MIN_PX = 30, MAX_OUTSIDE = 20, MARGIN = 8, Q = 4; // big titles differ by up to ~7 spots between exports; a word that moves line is 50+
// full size for "did the click show something"; quarter size (averaged) for "did anything else move", so the sub-pixel
// differences in letter edges between two exports never count, but a word that moved to another line does
async function raw(f, q) { const b = fs.readFileSync(f); let im = sharp(b).removeAlpha(); if (q) { const m = await sharp(b).metadata(); im = im.resize(Math.round(m.width / q), Math.round(m.height / q), { kernel: 'linear' }); }
  const { data, info } = await im.raw().toBuffer({ resolveWithObject: true }); return { data, w: info.width, h: info.height }; }
function diff(A, B, allowed) { let px = 0; for (let y = 0; y < A.h; y++) for (let x = 0; x < A.w; x++) { const i = (y * A.w + x) * 3;
  if (Math.abs(A.data[i] - B.data[i]) > T || Math.abs(A.data[i + 1] - B.data[i + 1]) > T || Math.abs(A.data[i + 2] - B.data[i + 2]) > T) { if (!allowed || !allowed.some((b) => x >= b[0] && x <= b[2] && y >= b[1] && y <= b[3])) px++; } } return px; }
// rows: [[click, x0, y0, x1, y1] as fractions]; returns [{slide, k, why}] and the smallest click change seen
async function checkSlide(dir, slide, clicks, rows) {
  const bad = [], fin = path.join(dir, pad(slide) + '.webp'); let least = Infinity;
  if (!fs.existsSync(fin)) return { bad: [{ slide, k: -1, why: 'no finished picture' }], least };
  const F = await raw(fin), Fq = await raw(fin, Q), seq = [];
  for (let k = 0; k < clicks; k++) seq.push(path.join(dir, pad(slide) + '-' + k + '.webp')); seq.push(fin);
  const pics = []; for (const f of seq) pics.push(fs.existsSync(f) ? await raw(f) : null);
  for (let k = 0; k < clicks; k++) {
    const S = pics[k], N = pics[k + 1];
    if (!S) { bad.push({ slide, k, why: 'no picture' }); continue; }
    if (S.w !== F.w || S.h !== F.h) { bad.push({ slide, k, why: 'size ' + S.w + 'x' + S.h + ' not ' + F.w + 'x' + F.h }); continue; }
    if (N) { const d = diff(S, N); least = Math.min(least, d); if (d < MIN_PX) bad.push({ slide, k, why: 'click ' + (k + 1) + ' changes only ' + d + ' pixels' }); }
    const allowed = rows.filter((r) => r[0] > k).map((r) => [(r[1] * F.w - MARGIN) / Q, (r[2] * F.h - MARGIN) / Q, (r[3] * F.w + MARGIN) / Q, (r[4] * F.h + MARGIN) / Q]);
    const out = diff(await raw(seq[k], Q), Fq, allowed); if (process.env.STEP_DEBUG) console.log('dbg', slide, k, out); if (out > MAX_OUTSIDE) bad.push({ slide, k, why: out + ' spots differ from the finished slide outside the parts still to come (something moved)' });
  }
  return { bad, least };
}
async function checkDeck(dir, steps, boxes, only) { const bad = []; let least = Infinity; for (const s of Object.keys(steps)) { if (only && !only.includes(s)) continue;
    const r = await checkSlide(dir, +s, steps[s], boxes[s] || [[1, 0, 0, 1, 1]]); bad.push(...r.bad); least = Math.min(least, r.least); } return { bad, least }; }
function readDeck(src) { const py = path.join(__dirname, 'deck_steps.py');
  return { steps: JSON.parse(execFileSync('python3', [py, 'map', src], { encoding: 'utf8' })), boxes: JSON.parse(execFileSync('python3', [py, 'boxes', src], { encoding: 'utf8' })) }; }
module.exports = { checkDeck, checkSlide, readDeck, MIN_PX, MAX_OUTSIDE };
if (require.main === module) (async () => { const [id, src] = process.argv.slice(2); const { steps, boxes } = readDeck(src);
  const r = await checkDeck(path.join(REPO, 's1_platform', 'decks', id), steps, boxes); r.bad.forEach((b) => console.log('bad', b.slide, b.k, b.why)); })().catch((e) => { console.error(e); process.exit(2); });
