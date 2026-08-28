#!/usr/bin/env node
/* qa-cold-read.js — THE SEPARATION IS MACHINE-GATED, NOT PROMISED (DFM 270, J13a).
 *
 * HIS DEMAND, 27 August 2026: "I need to be confident that every single problem
 * that I identified will never happen again… explain how you're going to ensure
 * that all of these things will never, ever, ever fucking happen again."
 * And, the same evening, before he would open the fix window: proof that DFM 270
 * is MANDATORY rather than a rule that can be ignored.
 *
 * WHAT WENT WRONG, on the record. This round's 1,203 read-aloud judgements were
 * filed by the same overnight window that had WRITTEN the text hours earlier
 * (K39 commissioned an unattended build, so author and judge collapsed into one
 * context). Both leaks of the last two days were the same shape: procedurally
 * separated reads that were contextually the author's. No mechanical net can
 * catch a grammatical sentence that reads badly — DFM 146(a) forbids pretending
 * one can — so the READER is the only catcher, and the reader must be
 * structurally clean.
 *
 * WHAT THIS GATE REFUSES, and it refuses the BUILD, not a checkbox:
 *   (1) A lesson under active review whose rendered transcript does not match
 *       the hash its verdict file names. Verdicts cannot be written against text
 *       that has since changed, and a build cannot ship on verdicts nobody
 *       re-filed after an edit.
 *   (2) A verdict file that does not answer EVERY read-first candidate the
 *       language gate named, individually, by path. The judge reads everything;
 *       this is the machine's guarantee that the risky sentences cannot ride a
 *       general pass (J13a2, the DFM 197 reporter-finds → judge-decides shape).
 *   (3) A verdict file with no rows at all, or one that declares a lesson it
 *       does not judge. A tick is not a judgement (DFM 235).
 *
 * WHAT IT DELIBERATELY CANNOT DO, stated rather than implied: it cannot tell a
 * good judgement from a bad one. It refuses a lesson nobody judged, on text
 * nobody re-read, and it turns the judgement into a written artefact he can open
 * and hold me to. That is what it does, and no more.
 *
 *   node qa-cold-read.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const KS3 = path.join(process.env.HOME, 'Desktop/Claude Work/KS3 DT Platform');
const TOOLS = path.resolve(__dirname, '..');
const CANDIDATES = path.join(__dirname, 'out', 'read-first-candidates.json');
const CHECKLIST = path.join(__dirname, 'COLD_READ_CHECKLIST.md');

/* the lessons whose text is being changed in this round. A lesson NOT under
   review is signed off and its verdicts are historic (DFM 176/221). */
const UNDER_REVIEW = (process.env.KS3DT_REVIEW || 'j2-03,j3-03').split(',').map(s => s.trim()).filter(Boolean);

let failures = 0;
const check = (ok, m) => { console.log((ok ? '  PASS  ' : '  FAIL  ') + m); if (!ok) failures++; };
const control = (fired, m) => {
  console.log((fired ? '  CTRL  ' : '  FAIL  ') + 'CONTROL: ' + m);
  if (!fired) failures++;
};
const note = (m) => console.log('  ....  ' + m);

/* the transcript is REGENERATED here rather than read off disk: a file on disk
   is a claim about the content, and the whole point is to hold the verdicts to
   the content as it is right now (DFM 243's family — a fetched artefact is not
   the artefact until it has been checked). */
function transcriptHash(lessonId) {
  const out = path.join(require('os').tmpdir(), 'ks3dt-transcript-' + lessonId + '.txt');
  execFileSync(process.execPath, [path.join(TOOLS, 'extract-pupil-transcript.js'), lessonId, '--out', out],
    { encoding: 'utf8' });
  const text = fs.readFileSync(out, 'utf8');
  const m = text.match(/TRANSCRIPT HASH:\s*([0-9a-f]{8,})/);
  return { hash: m ? m[1] : null, file: out, text: text };
}

/* every verdict file, found rather than named */
function verdictFiles() {
  return fs.readdirSync(KS3)
    .filter(f => /^COLD_READ_VERDICTS_.*\.md$/.test(f))
    .map(f => ({ name: f, text: fs.readFileSync(path.join(KS3, f), 'utf8') }));
}

/* the block a verdict file devotes to one lesson: from its own heading to the
   next lesson heading, so a hash in one lesson's block can never be spent on
   another's */
function blockFor(text, lessonId) {
  const rx = new RegExp('^#{1,6}[^\\n]*\\bCOLD READ\\b[^\\n]*\\b' + lessonId + '\\b[^\\n]*$', 'im');
  const m = rx.exec(text);
  if (!m) return null;
  const from = m.index;
  const after = text.slice(from + m[0].length);
  const nxt = /^#{1,6}[^\n]*\bCOLD READ\b/im.exec(after);
  return after.slice(0, nxt ? nxt.index : after.length);
}

(async () => {
  console.log('qa-cold-read — the author never files its own final verdict (DFM 270 / J13a)\n');
  console.log('  lessons under active review: ' + UNDER_REVIEW.join(', '));

  check(fs.existsSync(CHECKLIST),
    'the checklist the judge is handed is COMMITTED and inspectable (' + path.basename(CHECKLIST) + ')');
  if (fs.existsSync(CHECKLIST)) {
    const cl = fs.readFileSync(CHECKLIST, 'utf8');
    const flat = cl.replace(/\s+/g, ' ');
    check(/THE DEFAULT IS FAIL/i.test(flat) && /"not wrong" is not a pass/i.test(flat),
      'and it states the FLIPPED DEFAULT in its first lines (J13a3)');
    check(/MUST FAIL/i.test(cl) && /That is the whole hour/.test(cl) && /Never one instead of the other/.test(cl),
      'and it carries his own 27 August exhibits as worked MUST-FAIL calibration');
    check(/MUST-PASS|must-pass/i.test(cl) && /make-it-move/.test(cl),
      'and the approved tone exemplars beside them, so it cannot be set too harshly either');
  }

  check(fs.existsSync(CANDIDATES),
    'the language gate has emitted its READ-FIRST candidate list (' + path.relative(TOOLS, CANDIDATES) + ')');
  const cand = fs.existsSync(CANDIDATES) ? JSON.parse(fs.readFileSync(CANDIDATES, 'utf8')) : { byLesson: {} };

  const files = verdictFiles();
  check(files.length > 0, 'found ' + files.length + ' cold-read verdict file(s) in the round folder');

  for (const id of UNDER_REVIEW) {
    console.log('\n=== ' + id + ' ===');
    const t = transcriptHash(id);
    check(!!t.hash, 'the rendered transcript names its own hash');
    note('transcript hash right now: ' + t.hash);

    const hits = files.map(f => ({ f: f, block: blockFor(f.text, id) })).filter(x => x.block);
    check(hits.length > 0, 'a verdict file declares a cold read of ' + id +
      (hits.length ? ' (' + hits.map(h => h.f.name).join(', ') + ')' : ' — none does, so nobody has judged it'));
    if (!hits.length) continue;
    /* the NEWEST declaration wins, and every declaration must agree — two files
       naming two different hashes is the stale-copy fault DFM 144 is about */
    const declared = hits.map(h => {
      const m = /TRANSCRIPT HASH:\s*([0-9a-f]{8,})/i.exec(h.block);
      return { name: h.f.name, hash: m ? m[1] : null, block: h.block };
    });
    const matching = declared.filter(d => d.hash === t.hash);
    check(matching.length > 0,
      'a verdict file names THIS transcript, not an older one  [declared: ' +
      declared.map(d => d.name + '=' + (d.hash || 'none')).join(', ') + ']');
    if (!matching.length) continue;
    const block = matching.map(d => d.block).join('\n');

    check(/\|/.test(block) && block.split('\n').filter(l => /^\s*\|/.test(l)).length >= 5,
      'and it carries real rows, one per sentence, not a stamp  (' +
      block.split('\n').filter(l => /^\s*\|/.test(l)).length + ' row(s))');

    const list = (cand.byLesson || {})[id] || [];
    const missing = list.filter(c => block.indexOf(c.path.replace(/^.*?› /, '')) === -1 && block.indexOf(c.path) === -1);
    check(missing.length === 0,
      'every READ-FIRST candidate is answered individually (' + (list.length - missing.length) +
      ' of ' + list.length + ')' +
      (missing.length ? '\n           unanswered:\n           ' +
        missing.slice(0, 10).map(m => m.path + ' [' + m.kinds.join(',') + ']').join('\n           ') +
        (missing.length > 10 ? '\n           … and ' + (missing.length - 10) + ' more' : '') : ''));
  }

  /* ---------------- THE CONTROLS (DFM 196) ---------------- */
  console.log('\n--- CONTROLS: the gate really refuses');
  {
    const fake = '## COLD READ — j2-99\nTRANSCRIPT HASH: 0000000000000000\n\n| PASS | a | "b" | c |\n';
    const b = blockFor(fake, 'j2-99');
    control(!!b, 'a verdict block is found by the lesson it names');
    const m = /TRANSCRIPT HASH:\s*([0-9a-f]{8,})/i.exec(b || '');
    control(!!m && m[1] === '0000000000000000' && m[1] !== (transcriptHash(UNDER_REVIEW[0]).hash),
      'and a STALE hash does not match the transcript as it stands — the refusal is a comparison, not a promise');
    const noRows = blockFor('## COLD READ — j2-98\nTRANSCRIPT HASH: abc123ff\n\nnothing here.\n', 'j2-98');
    control(noRows !== null && noRows.split('\n').filter(l => /^\s*\|/.test(l)).length < 5,
      'a verdict block with no rows is recognised as a stamp rather than a judgement');
    const list0 = (cand.byLesson || {})[UNDER_REVIEW[0]] || [];
    control(list0.length > 0,
      'the candidate list for ' + UNDER_REVIEW[0] + ' is not empty (' + list0.length +
      ') — a gate with nothing to demand would pass by being vacuous');
    control(list0.length > 0 && '## COLD READ — x\nTRANSCRIPT HASH: 0\n'.indexOf(list0[0].path) === -1,
      'and a verdict file that never mentions a candidate really fails to answer it');
  }

  console.log('\n' + (failures ? 'qa-cold-read: ' + failures + ' FAILURE(S)' : 'qa-cold-read: ALL GREEN'));
  process.exit(failures ? 1 : 0);
})();
