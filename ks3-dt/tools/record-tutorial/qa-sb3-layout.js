#!/usr/bin/env node
/* qa-sb3-layout.js — L4_SIT_FIXES_SPEC Part E1 + L5_SIT_PREP_SPEC Part E.
 *
 * WHY THIS EXISTS (DFM 192d). Damien loaded the broken game and found the left
 * arrow script sitting on top of the up arrow script. Nothing in the pack could
 * see it: the kits are binary, and every gate we had reads text. A kit whose
 * code is unreadable on screen fails the lesson before a word of it is read, so
 * the kit files themselves are now gated.
 *
 * THE MODEL. Each top-level script gets a bounding box:
 *   height = 40 for the hat + 48 per following block, PLUS every C-block's arm
 *            (its wrapped substack's own height + 24 for the closing arm) —
 *            a `repeat until` wrapping three blocks is ONE chain entry but
 *            roughly 200px tall, and ignoring that was how L5's kits looked
 *            fine to a naive counter (L5 spec Part E).
 *   width  = 280 (a Scratch stack's practical width in the code area).
 * Two scripts may not intersect, and must clear each other by >= 80px.
 *
 * CONTROL (this harness is only worth having if it fails the real defect):
 *   run with --expect-fail against the pre-fix kits and it asserts that at
 *   least one file DOES overlap. That is the evidence, not the claim.
 *
 * Usage:  node qa-sb3-layout.js            (all 11 kit files must pass)
 *         node qa-sb3-layout.js --expect-fail
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/* read one member out of a .sb3 with the system unzip — the same way
   sb3/build-l5-templates.js handles these files. No new dependency. */
function readProject(p) {
  return JSON.parse(execSync(`unzip -p ${JSON.stringify(p)} project.json`,
    { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }));
}

const SB3_DIR = '/Users/damiengartland/Desktop/Claude Work/KS3 DT Platform/sb3';
const FILES = [
  // the four shark variants (Lesson 4)
  'shark-attack-broken-edition.sb3',
  'shark-attack-c1-fixed.sb3',
  'shark-attack-v2-working.sb3',
  'shark-attack-stretch-demo.sb3',
  // the three Lesson 5 starters a pupil actually builds in
  'catch-it-starter.sb3',
  'maze-escape-starter.sb3',
  'quiz-master-starter.sb3',
  // the film variants: they must share the starters' layout, or the film shows
  // a code area the pupil's own screen does not match (rule 35)
  'catch-it-score-only.sb3',
  'catch-it-complete.sb3',
  'maze-escape-complete.sb3',
  'quiz-master-complete.sb3',
];

const BLOCK_H = 48, HAT_H = 40, ARM_H = 24, WIDTH = 280, CLEAR = 80;

function chainHeight(blocks, id, isTopOfScript) {
  let h = 0, cur = id, first = true;
  const seen = new Set();
  while (cur && blocks[cur] && !seen.has(cur)) {
    seen.add(cur);
    const b = blocks[cur];
    h += (first && isTopOfScript && /^event_when/.test(b.opcode || '')) ? HAT_H : BLOCK_H;
    for (const key of ['SUBSTACK', 'SUBSTACK2']) {
      const inp = b.inputs && b.inputs[key];
      const child = inp && inp[1];
      if (typeof child === 'string' && blocks[child]) h += chainHeight(blocks, child, false) + ARM_H;
    }
    first = false;
    cur = b.next;
  }
  return h;
}

function boxes(target) {
  return Object.entries(target.blocks)
    .filter(([, b]) => b && typeof b === 'object' && b.topLevel)
    .map(([id, b]) => ({
      id,
      opcode: b.opcode,
      key: (b.fields && b.fields.KEY_OPTION) ? b.fields.KEY_OPTION[0] : '',
      x: Number(b.x) || 0,
      y: Number(b.y) || 0,
      w: WIDTH,
      h: chainHeight(target.blocks, id, true),
    }));
}

function label(s) {
  return `${s.opcode}${s.key ? ' [' + s.key + ']' : ''} @(${s.x},${s.y})`;
}

/* gap between two boxes on one axis: negative means they overlap on it */
function gapX(a, b) { return Math.max(a.x, b.x) - Math.min(a.x + a.w, b.x + b.w); }
function gapY(a, b) { return Math.max(a.y, b.y) - Math.min(a.y + a.h, b.y + b.h); }

const failures = [];
const perFileCommon = {};

for (const file of FILES) {
  const p = path.join(SB3_DIR, file);
  if (!fs.existsSync(p)) { failures.push(`${file}: MISSING`); continue; }
  const proj = readProject(p);
  const common = {};
  for (const t of proj.targets) {
    const scripts = boxes(t);
    for (const s of scripts) common[`${t.name}|${s.opcode}|${s.key}`] = `${s.x},${s.y}`;
    for (let i = 0; i < scripts.length; i++) {
      for (let j = i + 1; j < scripts.length; j++) {
        const a = scripts[i], b = scripts[j];
        const gx = gapX(a, b), gy = gapY(a, b);
        if (gx < 0 && gy < 0) {
          failures.push(`${file} · ${t.name}: OVERLAP — ${label(a)} intersects ${label(b)} ` +
            `(x by ${-gx}px, y by ${-gy}px)`);
        } else if (Math.max(gx, gy) < CLEAR) {
          failures.push(`${file} · ${t.name}: TOO TIGHT — ${label(a)} and ${label(b)} clear each other ` +
            `by only ${Math.max(gx, gy)}px (need ${CLEAR})`);
        }
      }
    }
  }
  perFileCommon[file] = common;
}

/* The four shark variants must share ONE layout for the scripts they have in
   common, and so must catch-it's starter and its two film variants. */
function assertSharedLayout(group, name) {
  const present = group.filter((f) => perFileCommon[f]);
  if (present.length < 2) return;
  const base = perFileCommon[present[0]];
  for (const f of present.slice(1)) {
    for (const k of Object.keys(base)) {
      if (perFileCommon[f][k] && perFileCommon[f][k] !== base[k]) {
        failures.push(`${name}: ${f} places ${k} at (${perFileCommon[f][k]}) but ` +
          `${present[0]} places it at (${base[k]}) — one layout, or the film shows a screen the pupil has not got`);
      }
    }
  }
}
assertSharedLayout(FILES.slice(0, 4), 'shark variants');
assertSharedLayout(['catch-it-starter.sb3', 'catch-it-score-only.sb3', 'catch-it-complete.sb3'], 'catch-it variants');

const expectFail = process.argv.includes('--expect-fail');
if (expectFail) {
  if (!failures.length) {
    console.error('CONTROL FAILED: --expect-fail was asked for, but every kit passed. ' +
      'The harness cannot be credited for catching a defect it does not catch.');
    process.exit(1);
  }
  console.log(`CONTROL OK — the pre-fix kits fail, as they must. ${failures.length} finding(s):`);
  failures.forEach((f) => console.log('  ✗ ' + f));
  process.exit(0);
}

if (failures.length) {
  console.error(`qa-sb3-layout: ${failures.length} FAILURE(S)`);
  failures.forEach((f) => console.error('  ✗ ' + f));
  process.exit(1);
}
console.log(`qa-sb3-layout: PASS — ${FILES.length} kit files, every top-level script clear of every other by >= ${CLEAR}px.`);
