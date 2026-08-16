/* ledger-tool.js — the writing end of the read-aloud ledger (DFM 172, 178).

   qa-language.js REFUSES a build when a pupil-facing sentence has no recorded
   judgement. This is how the record gets written. It is deliberately plain: a
   list and a prompt, no editor integration, no magic.

   THE THREE KINDS OF ENTRY, and why there are three (honesty matters more here
   than tidiness - a ledger that flatters itself is worth nothing):

     readAloud      A real, specific judgement of THIS sentence, made as the year
                    group's own reader: what she DOES, what she can PICTURE, what
                    she would say it is FOR. Every sentence written or rewritten
                    from 9 Aug 2026 onwards carries one of these.

     reviewed       A provenance stamp for a sentence that was read in a
                    full-lesson read-aloud pass and judged to pass without
                    change. It names the pass and its date, so the claim can be
                    audited against the evidence file. It is NOT a substitute for
                    a judgement - it is a record of one that was made in bulk.

     grandfathered  Lessons 1, 2 and the side quest, LOCKED by DFM 176 and
                    already sat by Damien himself. Honest provenance: it does not
                    pretend a read-aloud pass happened. Its real job is the
                    tripwire - the moment any locked sentence is edited, its hash
                    changes, the entry is void, and a REAL judgement is demanded.

   Usage:
     node ledger-tool.js --missing [lessonId]        what has no record yet
     node ledger-tool.js --stats                     counts by kind, per lesson
     node ledger-tool.js --grandfather j1-01 j1-02 j1-sq1
     node ledger-tool.js --reviewed j1-03 --note "..."   (only for paths with no entry)
     node ledger-tool.js --set "<path>" "<do>" "<picture>" "<for>"
     node ledger-tool.js --prune                     drop entries whose path is gone

   FILM CAPTIONS (DFM 179) are in the same ledger, under content-addressed keys
   ("film:l4:ch3 › <hash>"), because a caption is a sentence written to explain
   something to a child exactly like a card is:
     node ledger-tool.js --missing-film [set]
     node ledger-tool.js --set-film "<key>" "<do>" "<picture>" "<for>"
     node ledger-tool.js --grandfather-film l2
     node ledger-tool.js --reviewed-film l3 --note "..." */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const SRC = process.env.KS3DT_SRC ||
  path.join(process.env.HOME, 'Desktop/Claude Work/KS3 DT Platform/content-src');
const LEDGER_FILE = path.join(SRC, 'language-ledger.json');
const sha1 = (s) => crypto.createHash('sha1').update(s, 'utf8').digest('hex').slice(0, 16);

/* HIS K10 RULING, 15 Aug 2026: one reading age for the whole platform, and it
   is J1's. This table is the WRITING end of the same contract qa-language.js
   reads at; if the two ever disagree, a judgement gets written against a
   question the gate is not asking. qa-language asserts they agree. */
const J1_READER = 'an 11 or 12-year-old';
const READERS = { j1: J1_READER, j2: J1_READER, j3: J1_READER };
/* The string COLLECTOR is qa-language.js's too — same reason as the walk below.
   This file used to carry a copy "that mirrors qa-language.js exactly", which is
   a promise no comment can keep. */
/* THE LESSON WALK LIVES IN qa-language.js AND ONLY THERE (DFM 144). It used to
   be copied here, and on 12 Aug 2026 Damien asked "will these persist to J2 and
   J3?" — both copies read `j1/lessons` and nothing else, so a J2 lesson would
   have been invisible to the gate AND to this tool at the same time. Two copies
   of a rule are two chances to be wrong; there is now one walk, and its
   multi-year control lives with it. */
/* THE DECKS ARE IN THE LEDGER TOO (DFM 225d), so this tool has to see them.
   Until 15 Aug 2026 it did not: --missing walked lesson content only and reported
   "0 sentence(s) need a record" while 115 projected deck strings had none, and
   --set answered "no such string path" for every one of them. The gate was
   honest — the pack failed loudly — but a tool that reports coverage it does not
   have is DFM 204's class, and it is the tool a human reads. The deck walk comes
   from qa-language.js for the same reason the lesson walk does: one walk, one
   home. Deck strings are presented as a pseudo-lesson so every command below
   (--missing, --set, --stats, --prune) reaches them without knowing the
   difference. */
const loadAll = (only) => {
  const lessons = require('./qa-language.js').loadLessons();
  const deck = require('./qa-language.js').collectDeckStrings();
  const byDeck = {};
  deck.strings.forEach(s => {
    const id = s.deck + '.deck';
    (byDeck[id] = byDeck[id] || { fileId: id, year: s.year, strings: [] }).strings.push(s);
  });
  return lessons.concat(Object.values(byDeck)).filter(L => !only || L.fileId === only);
};

const load = () => fs.existsSync(LEDGER_FILE)
  ? JSON.parse(fs.readFileSync(LEDGER_FILE, 'utf8'))
  : { _why: 'The read-aloud ledger (DFM 172/178). One record per pupil-facing sentence: could the year group\'s own reader DO it, PICTURE every noun, and SAY what it is for. qa-language.js blocks any build containing a sentence with no record, and editing a sentence voids its record - so the question is asked again at the exact moment the text changes.', entries: {} };
const save = (l) => fs.writeFileSync(LEDGER_FILE, JSON.stringify(l, null, 1));
const today = () => new Date().toISOString().slice(0, 10);

function main() {
  const args = process.argv.slice(2);
  const cmd = args[0];
  const ledger = load();

  if (cmd === '--missing') {
    const lessons = loadAll(args[1]);
    let n = 0;
    lessons.forEach(L => {
      const reader = READERS[L.year || L.json.year] || READERS.j1;
      L.strings.forEach(s => {
        const e = ledger.entries[s.path];
        const stale = e && e.sha1 !== sha1(s.text);
        if (e && !stale) return;
        n++;
        console.log('\n' + (stale ? 'CHANGED  ' : 'MISSING  ') + s.path + '   [read as ' + reader + ']');
        console.log('  ' + s.text.replace(/\n/g, '\n  '));
      });
    });
    console.log('\n' + n + ' sentence(s) need a record.');
    return;
  }

  if (cmd === '--stats') {
    const lessons = loadAll();
    const kinds = {};
    lessons.forEach(L => {
      const k = { readAloud: 0, reviewed: 0, grandfathered: 0, missing: 0, stale: 0 };
      L.strings.forEach(s => {
        const e = ledger.entries[s.path];
        if (!e) k.missing++;
        else if (e.sha1 !== sha1(s.text)) k.stale++;
        else if (e.grandfathered) k.grandfathered++;
        else if (e.reviewed) k.reviewed++;
        else k.readAloud++;
      });
      kinds[L.fileId] = k;
      console.log(L.fileId.padEnd(8) + ' ' + L.strings.length.toString().padStart(4) + ' strings   ' +
        Object.keys(k).map(x => x + ':' + k[x]).join('  '));
    });
    return;
  }

  if (cmd === '--grandfather') {
    const ids = args.slice(1);
    if (!ids.length) { console.error('name the locked lessons, e.g. --grandfather j1-01 j1-02 j1-sq1'); process.exit(1); }
    let n = 0;
    ids.forEach(id => {
      const L = loadAll(id)[0];
      if (!L) { console.error('no such lesson: ' + id); process.exit(1); }
      L.strings.forEach(s => {
        ledger.entries[s.path] = {
          sha1: sha1(s.text),
          grandfathered: 'locked by DFM 176 (Damien, 9 Aug 2026: "Lesson 1 and 2 are locked in and don\'t need changed at this point at all"); shipped, deployed and sat by him. No read-aloud pass is claimed. Editing this sentence voids the entry and demands a real judgement.',
          by: 'opus-5',
          date: today()
        };
        n++;
      });
    });
    save(ledger);
    console.log('grandfathered ' + n + ' locked sentence(s) across ' + ids.join(', '));
    return;
  }

  if (cmd === '--reviewed') {
    const id = args[1];
    const noteIdx = args.indexOf('--note');
    const note = noteIdx > 0 ? args[noteIdx + 1] : '';
    if (!id || !note) { console.error('usage: --reviewed <lessonId> --note "<what pass, when>"'); process.exit(1); }
    const L = loadAll(id)[0];
    if (!L) { console.error('no such lesson: ' + id); process.exit(1); }
    let n = 0;
    L.strings.forEach(s => {
      if (ledger.entries[s.path] && ledger.entries[s.path].sha1 === sha1(s.text)) return;  // never overwrite a real judgement
      ledger.entries[s.path] = { sha1: sha1(s.text), reviewed: note, by: 'fable-5 read, opus-5 recorded', date: today() };
      n++;
    });
    save(ledger);
    console.log('stamped ' + n + ' unrecorded sentence(s) in ' + id + ' as reviewed-in-pass');
    return;
  }

  if (cmd === '--set') {
    const [, p, doIt, picture, forWhat] = args;
    if (!p || !doIt || !picture || !forWhat) {
      console.error('usage: --set "<path>" "<what she does>" "<what she pictures>" "<what it is for>"');
      process.exit(1);
    }
    const lessons = loadAll();
    let found = null;
    lessons.forEach(L => L.strings.forEach(s => { if (s.path === p) found = s; }));
    /* HUB TEXT (his 14 Aug 2026 ruling): the year map's titles, taglines and
       block names, and the recap pool's stems, are pupil-facing and now gated.
       They are not inside any lesson file, so the lesson walk above cannot see
       them — this reads the SAME collector qa-language uses, never a copy. */
    if (!found) {
      const { collectHubStrings } = require('./qa-language.js');
      found = collectHubStrings().strings.find(s => s.path === p) || null;
    }
    if (!found) { console.error('no such string path: ' + p); process.exit(1); }
    ledger.entries[p] = {
      sha1: sha1(found.text),
      readAloud: { do: doIt, picture: picture, for: forWhat },
      by: 'opus-5', date: today()
    };
    save(ledger);
    console.log('recorded ' + p);
    return;
  }

  /* ---- the film side. The extractor lives in qa-language.js and is imported,
     never copied: two readers of the same source would drift apart the first
     time one of them was taught something new (DFM 144). ---- */
  const films = () => {
    const { collectFilmStrings, filmKey } = require('./qa-language.js');
    const r = collectFilmStrings();
    if (r.errs.length) { console.error(r.errs.join('\n')); process.exit(1); }
    return r.strings.map(f => Object.assign(f, { key: filmKey(f) }));
  };

  if (cmd === '--missing-film') {
    const set = args[1];
    let n = 0;
    films().filter(f => !set || f.set === set).forEach(f => {
      if (ledger.entries[f.key]) return;
      n++;
      console.log('\nMISSING  ' + f.key + '   [' + f.set + ' ' + f.chapter + ' line ' + f.line + ', read as an 11 or 12-year-old]');
      console.log('  ' + f.text);
    });
    console.log('\n' + n + ' caption(s) need a record.');
    return;
  }

  if (cmd === '--set-film') {
    const [, key, doIt, picture, forWhat] = args;
    if (!key || !doIt || !picture || !forWhat) {
      console.error('usage: --set-film "<key>" "<what she does>" "<what she pictures>" "<what it is for>"');
      process.exit(1);
    }
    const f = films().find(x => x.key === key);
    if (!f) { console.error('no such caption key: ' + key); process.exit(1); }
    ledger.entries[key] = {
      label: f.text.slice(0, 60),
      sha1: key.split(' › ')[1],
      readAloud: { do: doIt, picture: picture, for: forWhat },
      by: 'opus-5', date: today()
    };
    save(ledger);
    console.log('recorded ' + key);
    return;
  }

  if (cmd === '--grandfather-film') {
    const sets = args.slice(1);
    if (!sets.length) { console.error('name the locked film(s), e.g. --grandfather-film l2'); process.exit(1); }
    let n = 0;
    films().filter(f => sets.includes(f.set)).forEach(f => {
      if (ledger.entries[f.key]) return;
      ledger.entries[f.key] = {
        label: f.text.slice(0, 60),
        sha1: f.key.split(' › ')[1],
        grandfathered: 'THE LESSON 2 FILM IS LOCKED. Damien, 3 Aug 2026: "this video is fantastic, just two tweaks... Once those are fixed, that is the video locked in" (DFM 141). No read-aloud pass is claimed. Editing this caption changes its key and demands a real judgement.',
        by: 'opus-5', date: today()
      };
      n++;
    });
    save(ledger);
    console.log('grandfathered ' + n + ' caption(s) in ' + sets.join(', '));
    return;
  }

  if (cmd === '--reviewed-film') {
    const set = args[1];
    const noteIdx = args.indexOf('--note');
    const note = noteIdx > 0 ? args[noteIdx + 1] : '';
    if (!set || !note) { console.error('usage: --reviewed-film <set> --note "<what pass, when>"'); process.exit(1); }
    let n = 0;
    films().filter(f => f.set === set).forEach(f => {
      if (ledger.entries[f.key]) return;                 // never overwrite a real judgement
      ledger.entries[f.key] = {
        label: f.text.slice(0, 60), sha1: f.key.split(' › ')[1],
        reviewed: note, by: 'opus-5', date: today()
      };
      n++;
    });
    save(ledger);
    console.log('stamped ' + n + ' unrecorded caption(s) in ' + set + ' as reviewed-in-pass');
    return;
  }

  if (cmd === '--prune') {
    const lessons = loadAll();
    const live = new Set();
    lessons.forEach(L => L.strings.forEach(s => live.add(s.path)));
    /* film captions are live too — without this, one --prune would have deleted
       every caption record in the ledger and the next pack would have demanded
       250 fresh judgements */
    films().forEach(f => live.add(f.key));
    let n = 0;
    Object.keys(ledger.entries).forEach(p => { if (!live.has(p)) { delete ledger.entries[p]; n++; } });
    save(ledger);
    console.log('pruned ' + n + ' entry(ies) for sentences that no longer exist');
    return;
  }

  console.log(fs.readFileSync(__filename, 'utf8').split('*/')[0].split('Usage:')[1] || 'see header');
}
main();
