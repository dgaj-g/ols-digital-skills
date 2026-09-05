/* report.js — ONE SHAPE FOR EVERY FAILURE LINE, AND THE TWO MATRICES.
 *
 * MATHS_GATES_DESIGN Part 0: every failure line has ONE shape —
 *   FAIL  <SURFACE> x <FAULT>: <one plain-English sentence>
 * surface first, so a log is scanned by WHAT IS BROKEN rather than by which
 * gate happened to speak. A gate that prints anything else is a gate whose
 * output he has to decode, and decoding is the cost this whole system exists
 * to remove.
 *
 * Exemptions are PRINTED on every run (L13 / DFM 204/213): an exemption nobody
 * prints reads as a pass.
 */
'use strict';

class Gate {
  constructor(name) {
    this.name = name;
    this.fails = [];
    this.passes = 0;
    this.notes = [];
    this.exemptions = [];
    this.covered = [];       /* cells this run actually closed, for the sidecar */
  }
  /* the only way to record a failure */
  fail(surface, fault, sentence) {
    const line = 'FAIL  ' + surface + ' x ' + fault + ': ' + sentence;
    this.fails.push(line);
    console.log('  ' + line);
    return false;
  }
  pass(msg) { this.passes++; if (msg) console.log('  PASS  ' + msg); return true; }
  check(cond, surface, fault, sentence) {
    return cond ? this.pass() : this.fail(surface, fault, sentence);
  }
  note(s) { this.notes.push(s); console.log('  ..    ' + s); }
  exempt(list) { (list || []).forEach(e => this.exemptions.push(e)); }
  cover(cell) { this.covered.push(cell); }
  /* finish: print the exemptions, then exit 0/1. Every gate ends this way, so
     the runner can treat "non-zero" as red without knowing anything else. */
  done() {
    if (this.exemptions.length) {
      console.log('  NOT MEASURED (printed every run, DFM 213):');
      this.exemptions.forEach(e => console.log('    - ' + e));
    }
    console.log((this.fails.length ? 'RED   ' : 'GREEN ') + this.name +
      '  (' + this.passes + ' checks passed, ' + this.fails.length + ' failed)');
    process.exitCode = this.fails.length ? 1 : 0;
    return this.fails.length === 0;
  }
}

/* a printed matrix: rows of cells, padded, with a title. He reads the matrix. */
function matrix(title, headers, rows) {
  const all = [headers].concat(rows).map(r => r.map(c => String(c == null ? '' : c)));
  const w = headers.map((_, i) => Math.max.apply(null, all.map(r => (r[i] || '').length)));
  const line = (r) => '  ' + r.map((c, i) => (c || '').padEnd(w[i])).join('  ').replace(/\s+$/, '');
  const out = [];
  out.push('');
  out.push('  ' + title);
  out.push(line(headers));
  out.push('  ' + w.map(n => '-'.repeat(n)).join('  '));
  rows.forEach(r => out.push(line(r.map(c => String(c == null ? '' : c)))));
  out.push('');
  return out.join('\n');
}

module.exports = { Gate, matrix };
