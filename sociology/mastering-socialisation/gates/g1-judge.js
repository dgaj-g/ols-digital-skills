#!/usr/bin/env node
/* gates/gates/g1-judge.js - runs the separated judge and its controls (DESIGN/judge/controls.js) on the DESIGN folder, copies
 * every line it prints to gates/out/g1.txt, and exits with its exit code. The script itself lives in DESIGN, beside the private
 * banks it reads, so nothing private enters the repo. Usage: node gates/g1-judge.js */
'use strict';
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const L = require('../tools/lib.js');

const script = path.join(L.DESIGN, 'judge/controls.js');
const out = path.join(__dirname, 'out', 'g1.txt');
fs.mkdirSync(path.dirname(out), { recursive: true });
if (!fs.existsSync(script)) {
  const l = 'FAIL g1 — ' + script + ' is missing';
  console.log(l); fs.writeFileSync(out, l + '\n'); process.exit(1);
}
const r = spawnSync(process.execPath, [script, L.DESIGN], { cwd: L.DESIGN, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const text = (r.stdout || '') + (r.stderr || '');
const code = r.status == null ? 1 : r.status;
const tail = 'g1: ' + (code === 0 ? 'PASS' : 'FAIL') + ' (exit ' + code + (r.signal ? ', signal ' + r.signal : '') + ')';
process.stdout.write(text);
console.log(tail);
fs.writeFileSync(out, text + (text.endsWith('\n') || !text ? '' : '\n') + tail + '\n');
process.exit(code);
