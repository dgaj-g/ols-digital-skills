/* timeconsts.js — ONE HOME FOR "WHERE ARE THE CLOCKS?".
 * Both qa-human-pace (the inventory) and the inventory generator read the same
 * scanner, so a constant cannot be in one list and not the other (DFM 144).
 * Keyed `file :: nearest function :: value`, which is what the inventory rows
 * are keyed by — the key IS the address, so a row can be found by eye. */
'use strict';
const fs = require('fs');
const path = require('path');
const { stripComments } = require('./decl.js');

/* a millisecond value only matters if a human waits on it: under 40ms is a
   frame, and a frame is not a budget. Printed as an exemption by the caller. */
const FLOOR = 40;

function scan(file, rel) {
  const src = stripComments(fs.readFileSync(file, 'utf8'));
  const lines = src.split('\n');
  const out = [];
  let fn = '(top level)';
  lines.forEach((l, i) => {
    const f = /function\s+([A-Za-z_$][\w$]*)|(?:var|const|let)\s+([A-Za-z_$][\w$]*)\s*=\s*function|\b([A-Za-z_$][\w$]*)\s*:\s*function/.exec(l);
    if (f) fn = f[1] || f[2] || f[3];
    const add = (v, how) => {
      const n = Number(v);
      if (!isFinite(n) || n < FLOOR) return;
      out.push({ key: rel + ' :: ' + fn + ' :: ' + n, file: rel, fn, value: n, how, line: i + 1, text: l.trim().slice(0, 100) });
    };
    let m;
    const reT = /\b(setTimeout|setInterval)\s*\(([\s\S]*?),\s*(\d+)\s*\)/g;
    while ((m = reT.exec(l))) add(m[3], m[1]);
    const reC = /\b([A-Z][A-Z0-9_]*(?:MS|POLL|DEBOUNCE|DELAY|TIMEOUT|IDLE|WAIT|WARN|GRACE|HOLD|EVERY|SECS?))\s*=\s*(\d+)/g;
    while ((m = reC.exec(l))) add(m[2], 'const ' + m[1]);
    const reS = /\b(\d+)\s*\*\s*1000\b/g;
    while ((m = reS.exec(l))) add(Number(m[1]) * 1000, 'seconds literal');
    const reU = /Utilities\.sleep\(\s*(\d+)/g;
    while ((m = reU.exec(l))) add(m[1], 'Utilities.sleep');
    /* A CLOCK HANDED IN THROUGH A VARIABLE IS STILL A CLOCK. The first cut of
       this scanner read only the literal second argument of setTimeout, so the
       save debounce — `var wait = Math.max(1500, 10000 - since)` — was invisible
       to the one gate whose job is to know where every clock is. Any number on
       a line that talks about time is a clock. */
    if (/\b(setTimeout|setInterval|wait|delay|poll|debounce|timeout|idle|sleep|backoff|ms\b)/i.test(l)) {
      const reN = /(?<![\w.])(\d{2,})(?![\w.])/g;
      while ((m = reN.exec(l))) add(m[1], 'time-bearing line');
    }
  });
  return out;
}

function all(APP) {
  const files = ['script.js', 'jotter.js', 'jotter-stats.js', 'staff.js', 'player.js', 'statchart.js', 'strings.js', 'server/Code.gs.template'];
  const rows = [];
  files.forEach(rel => {
    const p = path.join(APP, rel);
    if (!fs.existsSync(p)) return;
    scan(p, rel).forEach(r => rows.push(r));
  });
  /* one row per distinct key: the same value twice in one function is one clock */
  const seen = new Set();
  return rows.filter(r => (seen.has(r.key) ? false : (seen.add(r.key), true)));
}

module.exports = { scan, all, FLOOR };
