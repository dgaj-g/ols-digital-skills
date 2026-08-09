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
     node ledger-tool.js --prune                     drop entries whose path is gone */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const SRC = process.env.KS3DT_SRC ||
  path.join(process.env.HOME, 'Desktop/Claude Work/KS3 DT Platform/content-src');
const LEDGER_FILE = path.join(SRC, 'language-ledger.json');
const sha1 = (s) => crypto.createHash('sha1').update(s, 'utf8').digest('hex').slice(0, 16);

const READERS = { j1: 'an 11 or 12-year-old', j2: 'a 12 or 13-year-old', j3: 'a 13 or 14-year-old' };
const MACHINE_KEYS = new Set([
  'id', 'src', 'href', 'url', 'file', 'poster', 'img', 'icon', 'engine', 'phase',
  'mode', 'year', 'kind', 'kinds', 'logTerms', 'skin', 'clearToast_dev'
]);

function collectStrings(lesson, fileId) {
  const out = [];
  const push = (p, s) => { if (typeof s === 'string' && s.trim()) out.push({ path: p, text: s }); };
  const walk = (node, p) => {
    if (node === null || node === undefined) return;
    if (typeof node === 'string') { push(p, node); return; }
    if (Array.isArray(node)) { node.forEach((v, i) => walk(v, p + '[' + i + ']')); return; }
    if (typeof node !== 'object') return;
    Object.keys(node).forEach(k => { if (!MACHINE_KEYS.has(k)) walk(node[k], p + ' › ' + k); });
  };
  ['title', 'tagline'].forEach(k => push(fileId + ' › ' + k, lesson[k]));
  (lesson.chunks || []).forEach(ch => {
    const base = fileId + ' › ' + ch.id;
    push(base + ' › title', ch.title);
    if (ch.badge && ch.badge.name) push(base + ' › badge › name', ch.badge.name);
    walk(ch.config || {}, base + ' › config');   /* mirrors qa-language.js exactly */
  });
  Object.keys(lesson.keys || {}).forEach(k => {
    if (k !== '_brief' && lesson.keys[k] && lesson.keys[k].explain) {
      push(fileId + ' › keys › ' + k + ' › explain', lesson.keys[k].explain);
    }
  });
  return out.filter(s => !/›\s*mis(\s|›|\[)/.test(s.path));
}

function loadAll(only) {
  const dir = path.join(SRC, 'j1/lessons');
  return fs.readdirSync(dir)
    .filter(f => /^j\d-.*\.json$/.test(f) && !f.includes('.bak'))
    .map(f => {
      const fileId = f.replace(/\.json$/, '');
      if (only && fileId !== only) return null;
      const json = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
      return { fileId, json, strings: collectStrings(json, fileId) };
    })
    .filter(Boolean)
    .sort((a, b) => Number(a.json.num || 99) - Number(b.json.num || 99));
}

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
      const reader = READERS[L.json.year] || READERS.j1;
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

  if (cmd === '--prune') {
    const lessons = loadAll();
    const live = new Set();
    lessons.forEach(L => L.strings.forEach(s => live.add(s.path)));
    let n = 0;
    Object.keys(ledger.entries).forEach(p => { if (!live.has(p)) { delete ledger.entries[p]; n++; } });
    save(ledger);
    console.log('pruned ' + n + ' entry(ies) for sentences that no longer exist');
    return;
  }

  console.log(fs.readFileSync(__filename, 'utf8').split('*/')[0].split('Usage:')[1] || 'see header');
}
main();
