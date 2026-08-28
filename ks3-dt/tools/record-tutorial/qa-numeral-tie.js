#!/usr/bin/env node
/* qa-numeral-tie.js — AN AUTHORED NUMERAL MAY NOT DISAGREE WITH A DERIVED COUNT
 * (J5 widened to J13f, his 27 August 2026 charter).
 *
 * HIS EXHIBIT: the mybot verdict read **"ALL FOUR"** over a checklist of THREE,
 * at the exact moment of her success. `matchedLabel` was AUTHORED and the count
 * beside it was DERIVED from the build's feature list, so the two could disagree
 * — and one day they did, on the showcase card of the hour.
 *
 * THE CLASS, not the instance. Any label a person types that carries a number
 * about something a MACHINE counts is the same trap, on any engine. So this
 * gate walks every lesson of every year, derives the counts each chunk really
 * has, and holds the words to them.
 *
 * SECTION 1 IS BLOCKING, because the relationship is mechanical. The LABELS the
 * engine renders literally beside the count — matchedLabel, matchedAllLabel,
 * notYetLabel, pendingLabel, doneLabel, checklistLabel, planLabel — are about
 * the count and nothing else, so any numeral in one of them must BE that count.
 * The verdict PROSE (matchedSay, notYetSay) is held more narrowly, to the shapes
 * that are unmistakably about the list itself — "all three", "three of them" —
 * because "Three questions, three answers, one verdict" counts QUESTIONS, and a
 * gate that condemned it would have me mangling a correct sentence to go green.
 * (`{n}` is not a numeral: it is the engine being asked to fill the count in,
 * which is the fix, so a templated string is exactly what this gate wants to
 * see.)
 *
 * SECTION 2 IS A REPORTER, and it is deliberately not a gate (DFM 146a, and the
 * 197 reporter-finds → judge-decides pattern). "Two questions", "three rungs",
 * "five songs" are ordinary English about real things, and a machine that
 * condemned them would have me mangling correct sentences to go green — which is
 * the failure mode the whole battery exists to avoid. So every OTHER pupil
 * string carrying a numeral next to a countable the chunk owns is PRINTED BY
 * NAME, with the derived counts beside it, for the cold read to answer.
 *
 * THE CONTROL (DFM 196): the content he sat, read out of git, must FAIL §1 on
 * `j2-03 › mybot`. A gate that cannot reproduce his own finding is not evidence.
 *
 *   node qa-numeral-tie.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const BASE_REF = '7d9c274';
const REPO = path.resolve(__dirname, '..', '..', '..');
const SRC = process.env.KS3DT_SRC ||
  path.join(process.env.HOME, 'Desktop/Claude Work/KS3 DT Platform/content-src');

const LOCKED = new Set(['j1-01', 'j1-02', 'j1-03', 'j1-04', 'j1-05', 'j1-sq1',
  'j2-01', 'j2-02', 'j3-01', 'j3-02']);

let failures = 0;
const waived = [], reported = [];
const check = (ok, m) => { console.log((ok ? '  PASS  ' : '  FAIL  ') + m); if (!ok) failures++; };
const control = (fired, m) => {
  console.log((fired ? '  CTRL  ' : '  FAIL  ') + 'CONTROL: ' + m);
  if (!fired) failures++;
};

const WORDS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
const NUMRE = /\b(one|two|three|four|five|six|seven|eight|nine|ten|\d{1,2})\b/ig;

/* THE LABELS the engine renders literally beside a derived count. A numeral in
   one of these is ABOUT the count and nothing else, so any disagreement is a
   fault by construction. */
const LABEL_KEYS = ['matchedLabel', 'matchedAllLabel', 'notYetLabel', 'pendingLabel', 'doneLabel',
  'checklistLabel', 'planLabel'];
/* THE VERDICT PROSE. Here a numeral may honestly be about something else — "Three
   questions, three answers, one verdict" counts QUESTIONS, not checklist rows, and
   condemning it would be the gate inventing a fault (DFM 146a). Only the shapes
   that are unmistakably about the list itself are held: "all three", "three of
   them", "three of the four". Everything else goes to the reporter. */
const SAY_KEYS = ['matchedSay', 'notYetSay'];
const ABOUT_THE_LIST = /\b(?:all|only|just)\s+(one|two|three|four|five|six|seven|eight|nine|ten|\d{1,2})\b|\b(one|two|three|four|five|six|seven|eight|nine|ten|\d{1,2})\s+of\s+(?:them|the)\b/ig;
const VERDICT_KEYS = LABEL_KEYS.concat(SAY_KEYS);

/* things a chunk owns that a sentence might legitimately count */
const COUNTABLE = /\b(job|jobs|thing|things|question|questions|line|lines|step|steps|build|builds|check|checks|rung|rungs|song|songs|answer|answers|box|boxes|variable|variables|part|parts)\b/i;

function numeralsIn(s) {
  const out = [];
  String(s).replace(NUMRE, (m) => {
    const v = /^\d+$/.test(m) ? Number(m) : WORDS[m.toLowerCase()];
    if (v) out.push({ text: m, value: v });
    return m;
  });
  return out;
}

function lessonsFrom(dir) {
  const out = [];
  for (const year of ['j1', 'j2', 'j3']) {
    const d = path.join(dir, year, 'lessons');
    if (!fs.existsSync(d)) continue;
    for (const f of fs.readdirSync(d).filter(n => /\.json$/.test(n))) {
      out.push(JSON.parse(fs.readFileSync(path.join(d, f), 'utf8')));
    }
  }
  return out;
}

/* every count in this build that a machine derives */
function derivedCounts(chunk, build) {
  const c = {};
  if (build) {
    if (build.features) c['features'] = build.features.length;
    if (build.lines) c['lines'] = build.lines.length;
    if (build.palette) c['palette'] = build.palette.length;
    if (build.target) c['target lines'] = build.target.length;
    if (build.shape) c['shape lines'] = build.shape.length;
  }
  const cfg = chunk.config || {};
  if (cfg.builds) c['builds'] = cfg.builds.length;
  if (cfg.lines) c['briefing lines'] = cfg.lines.length;
  if (cfg.demo) c['demo turns'] = cfg.demo.length;
  if (cfg.item && cfg.item.blocks) c['blocks'] = cfg.item.blocks.length;
  if (cfg.items) c['items'] = cfg.items.length;
  return c;
}

/* §1 — the verdict family, held to the feature count */
function verdictFaults(lesson) {
  const out = [];
  for (const ch of (lesson.chunks || [])) {
    const cfg = ch.config || {};
    const builds = cfg.builds || [];
    if (!builds.length) continue;
    for (const b of builds) {
      const n = (b.features || []).length;
      if (!n) continue;
      const scope = Object.assign({}, cfg, b);
      for (const k of VERDICT_KEYS) {
        const v = scope[k];
        if (typeof v !== 'string' || !v.trim()) continue;
        let found;
        if (LABEL_KEYS.indexOf(k) !== -1) {
          found = numeralsIn(v);
        } else {
          found = [];
          ABOUT_THE_LIST.lastIndex = 0;
          let m;
          while ((m = ABOUT_THE_LIST.exec(v)) !== null) {
            const w = m[1] || m[2];
            const val = /^\d+$/.test(w) ? Number(w) : WORDS[w.toLowerCase()];
            if (!val) continue;
            /* A BARE "all three" IS A PRONOUN, and it points at whatever the same
               sentence has just counted. "Your bot asks three questions, keeps three
               answers, and ends with one line that uses all three" counts ANSWERS —
               condemning it would be the gate making me mangle a correct sentence to
               go green, which is the exact failure DFM 146(a) forbids and which this
               file's own header promises not to do. So: if the numeral is attached to
               a noun here it is held as before; if it is bare AND the same string has
               already used that numeral with a noun of its own, it goes to the §2
               reporter for the cold read to answer instead. His own exhibit is a
               LABEL, which never takes this path. */
            const bare = !/^(?:all|only|just)\s+\S+\s+\S/.test(m[0]) &&
              !/\b(?:of\s+(?:them|the))\b/i.test(m[0]);
            const antecedent = new RegExp('\\b' + w + '\\s+[a-z]{3,}', 'i');
            if (bare && val !== n && antecedent.test(v.slice(0, m.index))) {
              waived.push(lesson.id + ' › ' + ch.id + ' › ' + b.id + ' › ' + k +
                ': bare "' + m[0].trim() + '" points back at "' +
                (v.slice(0, m.index).match(antecedent) || [''])[0] + '" in the same sentence');
              continue;
            }
            found.push({ text: m[0].trim(), value: val });
          }
        }
        found.forEach(num => {
          if (num.value !== n) {
            out.push({
              where: lesson.id + ' › ' + ch.id + ' › ' + b.id + ' › ' + k,
              text: v, said: num.text, n: n
            });
          }
        });
      }
    }
  }
  return out;
}

/* §2 — every other pupil numeral about something the chunk owns */
function reporterRows(lesson) {
  const rows = [];
  for (const ch of (lesson.chunks || [])) {
    const cfg = ch.config || {};
    const builds = cfg.builds && cfg.builds.length ? cfg.builds : [null];
    for (const b of builds) {
      const counts = derivedCounts(ch, b);
      const values = Object.keys(counts).map(k => counts[k]);
      const scope = Object.assign({}, cfg, b || {});
      for (const k of Object.keys(scope)) {
        if (VERDICT_KEYS.indexOf(k) !== -1) continue;
        const v = scope[k];
        if (typeof v !== 'string' || v.length < 8) continue;
        if (!COUNTABLE.test(v)) continue;
        numeralsIn(v).forEach(num => {
          if (values.indexOf(num.value) !== -1) return;      /* it IS one of the counts */
          rows.push({
            where: lesson.id + ' › ' + ch.id + (b ? ' › ' + b.id : '') + ' › ' + k,
            said: num.text, counts: counts,
            text: v.replace(/\s+/g, ' ').slice(0, 120)
          });
        });
      }
    }
  }
  return rows;
}

(async () => {
  console.log('qa-numeral-tie — an authored numeral never disagrees with a derived count (J5/J13f)\n');
  const lessons = lessonsFrom(SRC);
  check(lessons.length > 0, 'walked ' + lessons.length + ' lesson(s), DERIVED from the content tree');

  console.log('\n=== §1 THE VERDICT FAMILY, HELD TO THE FEATURE COUNT (blocking) ===');
  let clean = 0;
  for (const L of lessons) {
    const bad = verdictFaults(L);
    if (!bad.length) { clean++; continue; }
    for (const f of bad) {
      const line = f.where + ': says "' + f.said + '" beside a list of ' + f.n +
        '\n           “' + f.text.replace(/\s+/g, ' ').slice(0, 110) + '”';
      if (LOCKED.has(L.id)) waived.push(line);
      else check(false, line);
    }
  }
  check(true, clean + ' of ' + lessons.length + ' lesson(s) carry no authored numeral in the verdict family at all' +
    ' (a templated {n} is the engine filling it in, which is the fix)');

  console.log('\n=== §2 EVERY OTHER PUPIL NUMERAL ABOUT SOMETHING THE CHUNK COUNTS (reporter) ===');
  console.log('  These are NOT failures. Ordinary English about real things lives here, and a');
  console.log('  machine that condemned it would have correct sentences mangled to go green');
  console.log('  (DFM 146a). They are named so the cold read can answer them.');
  for (const L of lessons) {
    reporterRows(L).forEach(r => reported.push(r.where + ': "' + r.said + '" — derived here: ' +
      (Object.keys(r.counts).map(k => k + '=' + r.counts[k]).join(', ') || 'nothing countable') +
      '\n           “' + r.text + '”'));
  }
  console.log('  ' + reported.length + ' candidate(s) surfaced for judgement.');
  reported.slice(0, 24).forEach(r => console.log('    · ' + r));
  if (reported.length > 24) console.log('    … and ' + (reported.length - 24) + ' more (all written to the run log).');

  console.log('\n--- CONTROL: the content he sat');
  let old = null;
  try {
    old = JSON.parse(execFileSync('git', ['-C', REPO, 'show',
      BASE_REF + ':ks3-dt/content/j2/lessons/j2-03.json'], { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 }));
  } catch (e) { /* reported */ }
  check(!!old, 'the content he sat is readable out of git at ' + BASE_REF);
  if (old) {
    const bad = verdictFaults(old);
    const his = bad.find(f => /mybot/.test(f.where));
    control(!!his, 'the shipped j2-03 really fails §1' +
      (his ? ' — ' + his.where + ' says "' + his.said + '" over ' + his.n : ''));
  }

  if (waived.length) {
    console.log('\n' + waived.length + ' WAIVED FINDING(S) — a locked lesson, or a bare numeral pointing back at its own sentence — printed rather than hidden (DFM 221):');
    waived.forEach(w => console.log('  - ' + w));
  }
  console.log('\n' + (failures ? 'qa-numeral-tie: ' + failures + ' FAILURE(S)' : 'qa-numeral-tie: ALL GREEN'));
  process.exit(failures ? 1 : 0);
})();
