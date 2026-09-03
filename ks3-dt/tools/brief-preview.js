#!/usr/bin/env node
/**
 * Render a lesson's teacher brief as Markdown, straight from content-src, so it
 * can be read and reviewed without deploying. Written for the TEACHER BRIEF
 * STANDARD (see LESSON_QUALITY_GATE.md) — the sections and their order here are
 * the same ones staff.js draws in the panel.
 *
 * THE YEAR COMES FROM THE LESSON ID (fixed 3 Sep 2026). This file read
 * `j1/lessons/<id>.json` whatever id it was given, so the one way to read a
 * brief WITHOUT deploying could only ever open a J1 brief — asked for j2-03 it
 * crashed on a path that has never existed. It is DFM 234/238's shape again: a
 * J1-shaped assumption meeting the first year that is not J1, and it surfaced
 * the moment somebody tried to read the two Lesson 3 briefs this round rewrote.
 * The id already carries its year, so nothing needs to be passed in.
 *
 *   node ks3-dt/tools/brief-preview.js j1-01
 *   node ks3-dt/tools/brief-preview.js j2-03 > /path/to/read-me.md
 *   node ks3-dt/tools/brief-preview.js --all          (every year, not just J1)
 */
const fs = require('fs');
const path = require('path');
const SRC = process.env.KS3DT_SRC ||
  path.join(process.env.HOME, 'Desktop/Claude Work/KS3 DT Platform/content-src');

const yearOf = (lessonId) => (/^(j\d)-/.exec(lessonId) || [, 'j1'])[1];

function render(lessonId) {
  const file = path.join(SRC, yearOf(lessonId), 'lessons', lessonId + '.json');
  const d = JSON.parse(fs.readFileSync(file, 'utf8'));
  const b = d.teacherBrief || {};
  const out = [];
  out.push('# Lesson ' + d.num + ' · ' + d.title + ' — teacher brief');
  out.push('');
  out.push('*' + (d.tagline || '') + '  ·  ' + (d.durationMin || 60) + ' minutes*');
  out.push('');
  if (!b.purpose && !b.runningTheHour) {
    out.push('> **NOT YET REWRITTEN to the teacher brief standard.** Still using the old');
    out.push('> why / minuteByMinute / pitfalls shape.');
    out.push('');
    if (b.why) out.push('## Why the lesson is built this way\n\n' + b.why + '\n');
    (b.minuteByMinute || []).forEach((l, i) => out.push((i + 1) + '. ' + l));
    out.push('');
    (b.pitfalls || []).forEach(l => out.push('- ' + l));
    return out.join('\n');
  }
  if (b.purpose) {
    out.push('## The purpose of this lesson');
    out.push('');
    b.purpose.forEach(p => { out.push(p); out.push(''); });
  }
  if (b.prepare) {
    out.push('## Preparing for this lesson');
    out.push('');
    b.prepare.forEach(p => { out.push('- **' + p.title + '**  \n  ' + p.text); });
    out.push('');
  }
  if (b.resources) {
    out.push('## Resources for this lesson');
    out.push('');
    b.resources.forEach(r => {
      out.push('- **' + r.label + '**' + (r.href ? ' — ' + r.href : ''));
      out.push('  ' + r.what);
      if (r.where) out.push('  *Where to find it: ' + r.where + '*');
    });
    out.push('');
  }
  if (b.runningTheHour) {
    const mins = b.runningTheHour.reduce((a, h) => a + (Number(h.mins) || 0), 0);
    out.push('## Running the hour');
    out.push('');
    out.push('*' + mins + ' minutes across ' + b.runningTheHour.length + ' stages*');
    out.push('');
    b.runningTheHour.forEach((h, i) => {
      out.push('### ' + (i + 1) + '. ' + h.part + (h.mins ? '  ·  ' + h.mins + ' min' : ''));
      out.push('');
      out.push(h.text);
      if (h.say) { out.push(''); out.push('> **You could say:** ' + h.say); }
      out.push('');
    });
  }
  /* DFM 227a/b: below the run sheet, retitled. (It also said "the girls" here,
     which rule 26 killed on every other surface years ago and this file kept.) */
  if (b.atAGlance) {
    out.push('## Breakdown of what the pupils will actually do');
    out.push('');
    out.push('*The same hour again, part by part, in the order the pupils meet it.*');
    out.push('');
    b.atAGlance.forEach((g, i) => {
      out.push('**' + (i + 1) + '. ' + g.part + '**');
      out.push('');
      out.push(g.what);
      out.push('');
    });
  }
  if (b.goesWrong) {
    out.push('## What commonly goes wrong, and what to do');
    out.push('');
    b.goesWrong.forEach(w => { out.push('- **' + w.q + '**  \n  ' + w.a); });
    out.push('');
  }
  /* "If you fall behind" is gone (DFM 227c) — no brief carries it and none may. */
  return out.join('\n');
}

const arg = process.argv[2] || 'j1-01';
if (arg === '--all') {
  /* every year that exists, derived from the tree rather than listed (DFM 271) */
  fs.readdirSync(SRC).filter(y => /^j\d$/.test(y) && fs.existsSync(path.join(SRC, y, 'lessons')))
    .sort().forEach(y => {
      fs.readdirSync(path.join(SRC, y, 'lessons')).filter(f => f.endsWith('.json')).sort().forEach(f => {
        console.log(render(f.replace(/\.json$/, '')));
        console.log('\n\n---\n\n');
      });
    });
} else {
  console.log(render(arg.replace(/\.json$/, '')));
}
