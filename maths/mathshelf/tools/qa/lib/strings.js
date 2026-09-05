/* strings.js — WHERE EVERY SENTENCE A PERSON READS COMES FROM.
 *
 * ONE COLLECTOR, used by qa-language, qa-text-damage, qa-voice, qa-notation and
 * the strings ledger, so those five gates can never disagree about what "a
 * pupil sentence" is (DFM 144). A sentence one gate cannot see is a sentence
 * that gate does not hold.
 *
 * Each row: { path, text, register, locked, label }
 *   path     book › section › question › field, or the table it came from
 *   register 'pupil' or 'teacher' — the two readers of DFM 138.3
 *   locked   the string belongs to an APPROVED book: reported, never failed
 *   label    a name on a control or a mark, judged as a label and not as prose
 */
'use strict';
const A = require('./app.js');
const { objectEntries, stripComments } = require('./decl.js');

/* fields of a pack that a PUPIL reads */
const PUPIL_FIELDS = ['prompt', 'say', 'walt', 'title', 'sub', 'text', 'hint', 'note', 'caption', 'lockedWhy'];
const LABEL_FIELDS = new Set(['title', 'sub', 'label', 'commit', 'cta', 'chip', 'option', 'placeholder']);

function walk(obj, path, out, opts) {
  if (obj == null) return;
  if (typeof obj === 'string') {
    if (obj.trim().length < 2) return;
    if (!/[a-zA-Z]/.test(obj)) return;
    const field = path[path.length - 1];
    out.push({
      path: path.join(' > '), text: obj, register: opts.register,
      locked: opts.locked, label: LABEL_FIELDS.has(String(field).replace(/\[\d+\]$/, ''))
    });
    return;
  }
  if (Array.isArray(obj)) { obj.forEach((v, i) => walk(v, path.concat([path.pop() + '[' + i + ']']), out, opts)); return; }
  if (typeof obj !== 'object') return;
  Object.keys(obj).forEach(k => {
    if (opts.keys && !opts.keys.has(k) && typeof obj[k] === 'string') return;
    walk(obj[k], path.concat([k]), out, opts);
  });
}

/* which books are APPROVED (locked) — read from the audit table, one home */
function lockedBooks() {
  const md = A.exists(A.qa('MATHS_GATES_AUDIT.md')) ? A.read(A.qa('MATHS_GATES_AUDIT.md')) : '';
  const set = new Set();
  md.split('\n').forEach(l => {
    const m = /^\|\s*([A-Za-z][^|(]*?)\s*(?:\([^)]*\))?\s*\|\s*APPROVED/i.exec(l);
    if (m) set.add(m[1].trim().toLowerCase());
  });
  return set;
}

function packStrings() {
  const C = A.content();
  const locked = lockedBooks();
  const out = [];
  Object.keys(C).forEach(book => {
    const isLocked = locked.has(book);
    const pack = C[book];
    (pack.sections || []).forEach(sec => {
      ['title', 'walt', 'sub'].forEach(f => {
        if (typeof sec[f] === 'string') out.push({ path: book + ' > ' + sec.id + ' > ' + f, text: sec[f], register: 'pupil', locked: isLocked, label: f !== 'walt' });
      });
      (sec.cans || []).forEach((c, i) => { if (typeof c === 'string') out.push({ path: book + ' > ' + sec.id + ' > cans[' + i + ']', text: c, register: 'pupil', locked: isLocked, label: false }); });
      if (sec.movie) {
        if (sec.movie.title) out.push({ path: book + ' > ' + sec.id + ' > movie > title', text: sec.movie.title, register: 'pupil', locked: isLocked, label: true });
        (sec.movie.steps || []).forEach((st, i) => {
          if (st && typeof st.say === 'string') out.push({ path: book + ' > ' + sec.id + ' > movie > step' + (i + 1) + ' > say', text: st.say, register: 'pupil', locked: isLocked, label: false });
        });
      }
      (sec.questions || []).forEach(q => {
        PUPIL_FIELDS.forEach(f => {
          if (typeof q[f] === 'string') out.push({ path: book + ' > ' + sec.id + ' > ' + q.id + ' > ' + f, text: q[f], register: 'pupil', locked: isLocked, label: LABEL_FIELDS.has(f) });
        });
        (q.options || []).forEach((o, i) => { if (typeof o === 'string') out.push({ path: book + ' > ' + sec.id + ' > ' + q.id + ' > options[' + i + ']', text: o, register: 'pupil', locked: isLocked, label: true }); });
      });
    });
    (pack.reasonBank || []).forEach(r => {
      if (r && typeof r.text === 'string') out.push({ path: book + ' > reasonBank > ' + r.id, text: r.text, register: 'pupil', locked: isLocked, label: false });
    });
  });
  return out;
}

/* the app's own string table, once it exists (rule 23: one home for every
   sentence). Until P1's sweep lands, this returns nothing and the ledger is
   what says so. */
function appStrings() {
  const p = A.app('strings.js');
  if (!A.exists(p)) return [];
  const out = [];
  ['pupil', 'teacher'].forEach(reg => {
    const entries = objectEntries(p, new RegExp('GJ_STRINGS\\s*=\\s*\\{[\\s\\S]*?' + reg + '\\s*:\\s*'));
    const body = objectEntries(p, new RegExp('(?:^|\\n)\\s*' + reg + '\\s*:\\s*'));
    const table = body || entries;
    if (!table) return;
    Object.keys(table).forEach(k => {
      const raw = table[k].trim();
      const m = /^'((?:[^'\\]|\\.)*)'|^"((?:[^"\\]|\\.)*)"/.exec(raw);
      if (!m) return;
      const text = (m[1] != null ? m[1] : m[2]).replace(/\\'/g, "'").replace(/\\"/g, '"');
      if (!/[a-zA-Z]/.test(text)) return;
      out.push({ path: 'strings.js > ' + reg + ' > ' + k, text, register: reg, locked: false, label: /Label$|Btn$|Cta$|Title$|Name$/.test(k) });
    });
  });
  return out;
}

/* the tables that stay where they are and are read AS tables (rule 23) */
function tableStrings() {
  const out = [];
  const dx = objectEntries(A.app('staff.js'), /var\s+DX_NAMES\s*=\s*/);
  if (dx) Object.keys(dx).forEach(k => {
    const m = /'([^']*)'/.exec(dx[k]);
    if (m) out.push({ path: 'staff.js > DX_NAMES > ' + k, text: m[1], register: 'teacher', locked: false, label: true });
  });
  const com = objectEntries(A.app('jotter.js'), /var\s+COMMENTS\s*=\s*/);
  if (com) Object.keys(com).forEach(k => {
    (com[k].match(/'((?:[^'\\]|\\.)*)'/g) || []).forEach((s, i) => {
      const t = s.slice(1, -1).replace(/\\'/g, "'");
      if (/[a-zA-Z]/.test(t)) out.push({ path: 'jotter.js > COMMENTS > ' + k + '[' + i + ']', text: t, register: 'pupil', locked: false, label: true, bucket: k });
    });
  });
  const se = objectEntries(A.app('script.js'), /var\s+SELF_EVAL_TRIPS\s*=\s*/);
  if (se) Object.keys(se).forEach(k => {
    (se[k].match(/'((?:[^'\\]|\\.)*)'/g) || []).forEach((s, i) => {
      const t = s.slice(1, -1).replace(/\\'/g, "'");
      if (/[a-zA-Z]/.test(t)) out.push({ path: 'script.js > SELF_EVAL_TRIPS > ' + k + '[' + i + ']', text: t, register: 'pupil', locked: false, label: true });
    });
  });
  return out;
}

function all() { return packStrings().concat(appStrings()).concat(tableStrings()); }

module.exports = { all, packStrings, appStrings, tableStrings, lockedBooks, PUPIL_FIELDS };
