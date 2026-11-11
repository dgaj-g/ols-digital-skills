#!/usr/bin/env node
/* step_patch.js — mend a click-state picture where PowerPoint laid out a fixed part differently (v12, 11 Nov 2026).
 * PowerPoint sometimes sets a title a touch tighter in one export than another, every time, so exporting again never
 * fixes it and the title would twitch when a pupil clicks. This rebuilds state k of a slide from the finished slide
 * NN.webp everywhere outside the boxes of the parts still to come (the same boxes, with the same margin, that
 * step_check.js uses), keeping the state's own export inside them. Everything outside those boxes then IS the finished
 * slide, so nothing can move on a click; inside them the state still shows what lies under the hidden parts.
 * CLI: node step_patch.js <id> <source.pptx> <slide> <k>   (render_steps.sh calls it for a state still "moved" after its retries) */
'use strict';
const path = require('path'), fs = require('fs'), { execSync } = require('child_process');
const sharp = require(path.join(execSync('npm root -g').toString().trim(), 'sharp'));
const { readDeck } = require('./step_check.js');
const REPO = process.env.S1_REPO || '/Users/damiengartland/Sites/s1-wt-platform';
const MARGIN = 8;
const pad = (i) => (i < 10 ? '0' : '') + i;
(async () => {
  const [id, src, slide, k] = process.argv.slice(2), s = +slide, kk = +k;
  const dir = path.join(REPO, 's1_platform', 'decks', id), fin = path.join(dir, pad(s) + '.webp'), st = path.join(dir, pad(s) + '-' + kk + '.webp');
  const rows = (readDeck(src).boxes[s] || []).filter((r) => r[0] > kk);
  const F = await sharp(fin).removeAlpha().raw().toBuffer({ resolveWithObject: true }), S = await sharp(st).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = F.info.width, h = F.info.height;
  if (S.info.width !== w || S.info.height !== h) throw new Error('state ' + st + ' is not the size of the finished slide');
  const boxes = rows.map((r) => [r[1] * w - MARGIN, r[2] * h - MARGIN, r[3] * w + MARGIN, r[4] * h + MARGIN]);
  const out = Buffer.from(F.data);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (boxes.some((b) => x >= b[0] && x <= b[2] && y >= b[1] && y <= b[3])) { const i = (y * w + x) * 3; out[i] = S.data[i]; out[i + 1] = S.data[i + 1]; out[i + 2] = S.data[i + 2]; }
  const tmp = st + '.tmp.png';
  await sharp(out, { raw: { width: w, height: h, channels: 3 } }).png().toFile(tmp);
  execSync('cwebp -quiet -q 72 -m 5 ' + JSON.stringify(tmp) + ' -o ' + JSON.stringify(st)); fs.unlinkSync(tmp);
  console.log('patched ' + id + ' ' + pad(s) + '-' + kk + ' (' + rows.length + ' parts still to come)');
})().catch((e) => { console.error(e.message); process.exit(1); });
