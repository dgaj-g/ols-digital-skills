#!/usr/bin/env node
/* ═══════════════════════════════════════════════════════════════════════════
   qa-staff-docs.js — A LESSON IS NOT FINISHED UNTIL ITS STAFF DOCS ARE
   ═══════════════════════════════════════════════════════════════════════════
   HIS RULING, DFM 279, 31 Aug 2026. He opened the slide deck from the J2
   Lesson 3 brief and the link was dead: *"the deck, slide deck and brief need
   to be updated after I approve a lesson… there's a gap here that needs
   addressed."*

   THE FAULT, precisely. Both Lesson 3 briefs shipped with BARE placeholder
   hrefs — `DECK_URL`, `DECK_COPY_URL`, `TEACHER_URL`, `CLASS_URL`. staff.js's
   briefHref() suppresses a placeholder only when it contains `_PENDING`, so
   these eight were not suppressed: they rendered as ordinary "open it" links,
   pointing at github.io/DECK_URL, in front of the teachers this platform has
   been handed to. The convention that would have saved them already existed and
   was simply not used. Underneath that: the Google Slides for both L3 decks
   had never been generated, so there were no real URLs to use — and NOTHING
   MACHINE-CHECKED ANY OF IT. qa-brief-deck-link pins the deckPath expression
   inside staff.js; no gate had ever asked whether an approved lesson has a
   brief, whether its links work, or whether its deck still describes it.

   So this gate asks those questions, of every lesson the manifest calls `ready`.

     1. THE BRIEF IS PRESENT AND WHOLE — purpose, atAGlance, prepare,
        resources, runningTheHour, goesWrong, none of them empty.
     2. NO BARE PLACEHOLDER, EVER AGAIN. A resource href that is a bare
        SHOUTING_TOKEN and does not carry `_PENDING` FAILS the pack — that is
        tonight's 404 class, killed at the source. A href WITH `_PENDING` passes
        but PRINTS as standing debt on every single pack, so a pending link
        cannot be forgotten quietly (DFM 200's lesson: a bounded check that says
        nothing about what it skipped reads as coverage).
     3. THE LINKS POINT AT A FILE THAT EXISTS. Every docs.google.com href is
        fetched, and the answer must not be 404/410.
        WHY NOT "< 400", WHICH IS WHAT THIS RULE FIRST SAID. Measured against
        the real links on 3 Sep 2026: a LIVE school deck's /edit URL answers
        **401** to an anonymous fetch — it exists, and Google is asking who is
        asking — while a deck id that does not exist answers **404**, and so
        does a bare placeholder pushed into the URL. So "< 400" condemned all
        eight approved, working decks, and a gate that condemns the whole
        estate on its first run is a gate that gets silenced. The fault class
        this rule is actually for is a link to a file that IS NOT THERE, and
        404 is exactly that line.
        AND THE /copy URL IS NOT A LIVENESS PROBE: /copy answers 200 even for
        an invented file id. So the ID is lifted out of every Slides href and
        probed at its /edit form, which is the form that tells the truth.
        `--offline` skips the network WITH A PRINTED WARNING and never
        silently.
     4. DECK AND BRIEF ARE TWO VIEWS OF ONE SEQUENCE. The run sheet names the
        deck's slides, and between them its stages account for every slide in
        the deck exactly once, in order; and every slide carries speaker notes,
        because a printed delivery script must never have a blank step.
        The correspondence key is the SLIDE NUMBERS THE RUN SHEET ITSELF NAMES
        ("STOP · Build it and run it · Slides 9–11"), which is the shipped house
        pattern in all seven briefs that have one — derived from the content,
        never a hand-kept list of stages per lesson (DFM 271).
     5. THE .gs IS MADE OF THE DECK WORDS. Regenerating the Apps Script file
        from these deck.jsons must produce byte-identical output to the file
        committed at tools/slides-deck/OLS_KS3_DT_Slide_Decks.gs. A deck.json
        edit that never reached the .gs fails the pack, exactly as a stale
        PathB bundle does (bundleFreshGate, DFM 259).

   WHAT IT DELIBERATELY DOES NOT DO. It does not re-check that a brief resolves
   to its own deck file — qa-brief-deck-link owns that, and one fact gets one
   home (DFM 144). It does not hold the SIDE QUEST to a deck: DFM 220(d) keeps
   it out of the teacher-delivered set, so it is named as deck-exempt and
   printed, never silently skipped.

   Reads content-src, like qa-brief-shape and qa-language: the packed briefs are
   folded into the encrypted keys blob, so a gate reading `content/` would find
   no briefs at all and pass everything (DFM 146a — a gate blind to its subject
   is worse than no gate, because it mints promises).

   CONTROLS (DFM 196 — every one filed BEFORE this gate was credited, and all
   re-run against the finished gate on a green tree. They live with the rest of
   this platform's evidence, in
   Claude Work/KS3 DT Platform/qa-l2-l5-review/staff-docs-controls/, because the
   repo gitignores *.log):
     (a) j2-03 with a bare `DECK_URL` href             → rule 2
     (b) the SHIPPED pre-mitigation brief, DECRYPTED
         out of git 588ba03's packed lesson — the
         fault he actually met, not a copy of it       → rule 2, all four hrefs
     (c) j2-03.deck.json with one section deleted      → rule 4
     (d) a deck.json edited without rebuilding the .gs → rule 5, from a CURRENT
         .gs, which is the only run that proves anything
     (e) a deck link repointed at a presentation id
         that has never existed, run online            → rule 3

   Usage: node qa-staff-docs.js [--offline]
   ═══════════════════════════════════════════════════════════════════════════ */

const fs = require('fs');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');

const SRC = process.env.KS3DT_SRC ||
  path.join(process.env.HOME, 'Desktop/Claude Work/KS3 DT Platform/content-src');
const ROOT = path.join(__dirname, '..', '..');
const DECK_GS = path.join(ROOT, 'tools', 'slides-deck', 'OLS_KS3_DT_Slide_Decks.gs');
const DECK_BUILDER = path.join(ROOT, 'tools', 'slides-deck', 'build-deck-gs.js');
const OFFLINE = process.argv.includes('--offline');

const fails = [];
const debt = [];
const notes = [];
const pass = m => console.log('  PASS  ' + m);
const fail = m => { fails.push(m); console.log('  FAIL  ' + m); };

/* ---- the lessons this gate is answerable for ---------------------------- */
/* DERIVED from the manifests, never enumerated (DFM 271): a year folder added
   next term is covered the day its manifest calls a lesson ready. */
function readyLessons() {
  const out = [];
  for (const y of fs.readdirSync(SRC)) {
    const man = path.join(SRC, y, 'manifest.json');
    if (!/^j\d$/.test(y) || !fs.existsSync(man)) continue;
    for (const le of (JSON.parse(fs.readFileSync(man, 'utf8')).lessons || [])) {
      if (le.status !== 'ready' || !le.file) continue;
      const abs = path.join(SRC, le.file);
      if (!fs.existsSync(abs)) { fail(le.id + ': manifest calls it ready and its file ' + le.file + ' is not there'); continue; }
      out.push({ ...le, abs, deckAbs: path.join(SRC, le.file.replace('/lessons/', '/decks/').replace(/\.json$/, '.deck.json')) });
    }
  }
  return out;
}

console.log('qa-staff-docs — an approved lesson\'s brief and deck are part of it (DFM 279)\n');
const LESSONS = readyLessons();
console.log('  ' + LESSONS.length + ' lesson(s) whose manifest says ready: ' +
  LESSONS.map(l => l.id).join(', ') + '\n');

/* ═════════ 1. THE BRIEF IS PRESENT AND WHOLE ═════════ */
console.log('1. every approved lesson has a whole brief');
const NEEDED = ['purpose', 'atAGlance', 'prepare', 'resources', 'runningTheHour', 'goesWrong'];
LESSONS.forEach(le => {
  le.data = JSON.parse(fs.readFileSync(le.abs, 'utf8'));
  const tb = le.data.teacherBrief;
  if (!tb) { fail(le.id + ': the manifest calls it ready and it has NO teacherBrief at all'); return; }
  const empty = NEEDED.filter(k => !Array.isArray(tb[k]) || !tb[k].length);
  if (empty.length) fail(le.id + ': the brief is missing or empty at ' + empty.join(', '));
  else pass(le.id + ': brief whole (' + NEEDED.map(k => k + ' ' + tb[k].length).join(', ') + ')');
});

/* ═════════ 2. NO BARE PLACEHOLDER HREF ═════════ */
/* The shape of tonight's fault: a SHOUTING_TOKEN standing in for a URL nobody
   ever came back and filled in. briefHref() renders it, because it only
   suppresses the ones carrying _PENDING — so the teacher gets a live-looking
   link to github.io/DECK_URL. Either it is a real URL, or it says _PENDING and
   the brief prints the description with no link at all. */
console.log('\n2. no resource href is a bare placeholder (the 404 class)');
const BARE = /^[A-Z][A-Z0-9_]*$/;
let hrefs = 0;
LESSONS.forEach(le => {
  const tb = le.data.teacherBrief || {};
  (tb.resources || []).forEach(res => {
    const h = String(res.href == null ? '' : res.href);
    if (!h) return;                      /* no href at all is the class-link pattern: fine */
    hrefs++;
    if (BARE.test(h)) {
      if (h.indexOf('_PENDING') === -1) {
        fail(le.id + ': resource "' + res.label + '" carries the bare placeholder ' + h +
          ' — staff.js renders that as a live "open it" link to a page that does not exist');
      } else {
        debt.push(le.id + ' · "' + res.label + '" · ' + h);
      }
    } else if (!/^https?:\/\//i.test(h) && !/^[a-z][a-z0-9+.\-]*:/i.test(h)) {
      notes.push(le.id + ': "' + res.label + '" is a repo-relative asset href (' + h + ')');
    }
  });
});
if (!fails.length) pass(hrefs + ' resource href(s) across ' + LESSONS.length + ' brief(s): none is a bare placeholder');
if (debt.length) {
  console.log('  ' + debt.length + ' PENDING LINK(S) — STANDING DEBT, printed on every pack:');
  debt.forEach(d => console.log('        · ' + d));
  console.log('        Those resources render with NO link until the real URL exists.');
} else {
  console.log('  0 PENDING LINKS — every staff resource that should be a link, is one.');
}
notes.forEach(n => console.log('  note  ' + n));

/* ═════════ 3. THE LINKS ANSWER ═════════ */
console.log('\n3. every docs.google.com link points at a file that exists');
/* the file id is what can be checked; /copy answers 200 for an id that was
   never a file, so it is probed at its /edit form instead */
const probeOf = h => {
  const m = /^https:\/\/docs\.google\.com\/([a-z]+)\/d\/([^/?#]+)/i.exec(h);
  return m ? 'https://docs.google.com/' + m[1] + '/d/' + m[2] + '/edit' : h;
};
const toCheck = [];
LESSONS.forEach(le => (le.data.teacherBrief || {}).resources &&
  le.data.teacherBrief.resources.forEach(res => {
    const h = String(res.href || '');
    if (/^https:\/\/docs\.google\.com\//i.test(h)) toCheck.push({ id: le.id, label: res.label, h, probe: probeOf(h) });
  }));
const otherExternal = [];
LESSONS.forEach(le => (le.data.teacherBrief || {}).resources &&
  le.data.teacherBrief.resources.forEach(res => {
    const h = String(res.href || '');
    if (/^https?:\/\//i.test(h) && !/^https:\/\/docs\.google\.com\//i.test(h)) otherExternal.push(le.id + ' · ' + h);
  }));
if (!toCheck.length) {
  console.log('  no docs.google.com links to check yet');
} else if (OFFLINE) {
  console.log('  ⚠ --offline: ' + toCheck.length + ' deck link(s) NOT FETCHED. This run proves nothing');
  console.log('    about whether they answer. Re-run without --offline before shipping.');
} else {
  const seen = {};
  const GONE = c => (c === 404 || c === 410);
  toCheck.forEach(t => {
    let code = seen[t.probe];
    if (code === undefined) {
      try {
        code = Number(execFileSync('curl', ['-sS', '-o', '/dev/null', '-w', '%{http_code}',
          '-L', '--max-time', '25', t.probe], { encoding: 'utf8' }).trim());
      } catch (e) { code = 0; }
      seen[t.probe] = code;
    }
    if (!code) fail(t.id + ' · "' + t.label + '" → no answer at all from ' + t.probe);
    else if (GONE(code)) fail(t.id + ' · "' + t.label + '" → HTTP ' + code + ' — that file is NOT THERE. ' +
      'A link that does not work is never rendered (DFM 279): fix the id, or take the href off ' +
      'and let the resource say what it will be.');
    else pass(t.id + ' · "' + t.label + '" → ' + code +
      (code === 401 || code === 403 ? ' (exists; Google asks an anonymous fetcher to sign in)' : ''));
  });
}
console.log('  ' + otherExternal.length + ' other external href(s) are NOT fetched by this gate ' +
  '(they are third-party sites, not ours to police):');
otherExternal.forEach(o => console.log('        · ' + o));

/* ═════════ 4. DECK AND BRIEF ARE TWO VIEWS OF ONE SEQUENCE ═════════ */
/* The run sheet's stage headings name their slides — "· Slides 9–11", "· Slide 6" —
   and that is the only place the two documents touch, so it is where they are
   held together. Between them the stages must account for every slide in the
   deck, in order. Delete a section from a deck.json and the brief now names
   slides that are not there; add one and the last ones are named nowhere. */
console.log('\n4. the deck and the run sheet describe the same hour');
const SLIDE_RE = /Slides?\s+(\d+)\s*(?:[–—-]\s*(\d+))?/g;
LESSONS.forEach(le => {
  const tb = le.data.teacherBrief || {};
  if (!fs.existsSync(le.deckAbs)) {
    if (le.side) {
      console.log('  EXEMPT ' + le.id + ' (the Side Quest): not teacher-delivered, so it has no deck ' +
        'and is held only to rules 1–3 (his ruling, DFM 220d)');
    } else {
      fail(le.id + ': the manifest calls it ready and there is no deck at ' +
        path.relative(SRC, le.deckAbs));
    }
    return;
  }
  const deck = JSON.parse(fs.readFileSync(le.deckAbs, 'utf8'));
  const slides = (deck.sections || []).flatMap(s => s.slides || []);
  const n = slides.length;

  /* 4a — every slide is spoken for */
  const named = [];
  const starts = [];
  (tb.runningTheHour || []).forEach(stage => {
    const src = String(stage.part || '') + ' ' + String(stage.slides || '');
    let m, first = null;
    SLIDE_RE.lastIndex = 0;
    while ((m = SLIDE_RE.exec(src))) {
      const a = Number(m[1]), b = Number(m[2] || m[1]);
      if (first === null) first = a;
      for (let i = a; i <= b; i++) named.push(i);
    }
    if (first !== null) starts.push(first);
  });
  const set = new Set(named);
  const missing = []; for (let i = 1; i <= n; i++) if (!set.has(i)) missing.push(i);
  const over = [...set].filter(i => i < 1 || i > n).sort((a, b) => a - b);
  const dupes = [...new Set(named.filter(i => named.filter(x => x === i).length > 1))].sort((a, b) => a - b);
  const ordered = starts.every((v, i) => i === 0 || v >= starts[i - 1]);

  if (!named.length) {
    fail(le.id + ': the deck has ' + n + ' slides and the run sheet names NONE of them — ' +
      'the two documents cannot be checked against each other, so neither can be trusted');
  } else if (missing.length || over.length || !ordered) {
    if (missing.length) fail(le.id + ': the run sheet never tells the teacher when to show slide(s) ' + missing.join(', ') + ' of ' + n);
    if (over.length) fail(le.id + ': the run sheet names slide(s) ' + over.join(', ') + ', and the deck has ' + n);
    if (!ordered) fail(le.id + ': the run sheet\'s slide numbers go backwards down the hour (' + starts.join(', ') + ')');
  } else {
    pass(le.id + ': ' + (tb.runningTheHour || []).length + ' stages account for all ' + n + ' slides, in order' +
      (dupes.length ? ' (slide ' + dupes.join(', ') + ' named twice — a stage returning to it)' : ''));
  }

  /* 4b — nothing is delivered off a blank note */
  const blank = [];
  let idx = 0;
  (deck.sections || []).forEach(sec => (sec.slides || []).forEach(sl => {
    idx++;
    if (!String(sl.notes || '').trim()) blank.push(idx + ' (' + sec.id + ': ' + (sl.heading || sl.kicker || 'untitled') + ')');
  }));
  if (blank.length) fail(le.id + ': slide(s) with no speaker notes — ' + blank.join(', ') +
    '. The printed delivery script would have a blank step where the teacher needs the words.');
  else pass(le.id + ': all ' + n + ' slides carry speaker notes');
});

/* ═════════ 5. THE .gs IS MADE OF THESE DECK WORDS ═════════ */
/* bundleFreshGate's shape, aimed at the other generated artefact he pastes.
   Rebuild from THESE decks into a scratch file and require the committed .gs
   not to move. It is built from source rather than from packed content because
   the pack runs its gates before it writes content/ — a check that read the
   packed decks would be checking the state of the last pack, not this one. */
console.log('\n5. OLS_KS3_DT_Slide_Decks.gs is a current build of these deck words');
if (!fs.existsSync(DECK_BUILDER) || !fs.existsSync(DECK_GS)) {
  fail('build-deck-gs.js or OLS_KS3_DT_Slide_Decks.gs is missing — freshness cannot be known');
} else {
  const tmp = path.join(require('os').tmpdir(), 'ks3dt-deck-fresh-' + process.pid + '.gs');
  const res = spawnSync(process.execPath, [DECK_BUILDER], {
    encoding: 'utf8',
    env: { ...process.env, KS3DT_DECK_ROOT: SRC, KS3DT_DECK_GS_OUT: tmp }
  });
  if (res.status !== 0) {
    fail('build-deck-gs.js failed, so what would be pasted cannot be known:\n' +
      ((res.stdout || '') + (res.stderr || '')).split('\n').map(l => '        ' + l).join('\n'));
  } else {
    /* The generator stamps the header with the DAY it ran and the contentVersion
       it read. Neither is a deck word, and holding the file to them would fail
       every pack after the one that built it — a gate that cries every morning
       gets silenced, which is how a real staleness gets through. So the STAMP
       LINE is lifted out of both sides and REPORTED, and the rest of the file —
       every slide, every note, every generated function — must match to the
       byte. */
    const STAMP = /^ \* Built \d{4}-\d\d-\d\d from contentVersion .*$/m;
    const readGs = f => { const t = fs.readFileSync(f, 'utf8'); return { stamp: (STAMP.exec(t) || [''])[0].trim(), body: t.replace(STAMP, ' * Built <stamp>') }; };
    const fresh = readGs(tmp);
    const onDisk = readGs(DECK_GS);
    console.log('        committed: ' + (onDisk.stamp || '(no build stamp)'));
    if (fresh.body !== onDisk.body) {
      const dsize = fs.statSync(DECK_GS).size, fsize = fs.statSync(tmp).size;
      const inGs = k => (onDisk.body.indexOf('"' + k + '": {') !== -1);
      const absent = LESSONS.filter(l => fs.existsSync(l.deckAbs) && !inGs(l.id)).map(l => l.id);
      fail('the committed .gs is STALE — rebuilding it from these deck words changes it ' +
        '(' + dsize + ' bytes on disk, ' + fsize + ' rebuilt)' +
        (absent.length ? '. It does not contain the deck(s) for ' + absent.join(', ') +
          ' at all, so runDeckRound could never have built them' : '') +
        '. Run `node ks3-dt/tools/slides-deck/build-deck-gs.js` and commit the result; ' +
        'never hand-edit the .gs.');
    } else {
      pass('identical but for the build stamp — the file he pastes is made of these deck words');
    }
    try { fs.unlinkSync(tmp); } catch (e) { /* scratch file */ }
  }
}

/* ═════════ the verdict ═════════ */
console.log('');
if (debt.length) console.log('qa-staff-docs: ' + debt.length + ' PENDING LINK(S) OF STANDING DEBT');
if (fails.length) {
  console.log('qa-staff-docs: ' + fails.length + ' FAILURE(S)');
  process.exit(1);
}
console.log('qa-staff-docs: ALL GREEN');
