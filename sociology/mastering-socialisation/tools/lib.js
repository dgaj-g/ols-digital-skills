/* tools/lib.js - shared by build-server.js, dev-server.js and the gates: paths, the bank and content readers, the ASCII
 * encoders and the leak list (what must never appear in the served Index.html). Holds no secret itself. */
'use strict';
const fs = require('fs');
const path = require('path');

const REPO = path.resolve(__dirname, '..');
const DESIGN = process.env.SOC_DESIGN || '/Users/damiengartland/Desktop/Claude Work/Digital Skills Roadmap/0. Digital Skills Web Activities/Sociology';
const DEPLOY = process.env.SOC_DEPLOY || path.join(DESIGN, 'deploy');
const STAFF_DIR = path.join(DESIGN, 'deploy'); // staff.json always lives here, whatever SOC_DEPLOY says
const PLATFORM = process.env.SOC_PLATFORM || path.join(REPO, 'platform');
const PAGE_FILES = ['index.html', 'style.css', 'strings.js', 'app.js', 'engine.js', 'staff.js'];
const SCRIPT_NAMES = ['strings.js', 'app.js', 'engine.js', 'staff.js']; // + sit.js when present
const IMG_URL = 'https://dgaj-g.github.io/ols-digital-skills/sociology/mastering-socialisation/img/';
const SCRIPTLETS = ['<?= classCode ?>', '<?= baseUrl ?>', '<?= sit ?>', '<?= showBuild ?>'];

function walk(dir, ext) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1)).flatMap((d) => {
    const p = path.join(dir, d.name);
    if (d.isDirectory()) return walk(p, ext);
    return d.name.endsWith(ext) ? [p] : [];
  });
}
// every DESIGN/banks/**/*.json keyed by basename; a duplicate name is an error
function readBanks(design) {
  const banks = {}, where = {};
  for (const f of walk(path.join(design || DESIGN, 'banks'), '.json')) {
    const key = path.basename(f, '.json');
    if (where[key]) throw new Error('duplicate bank key "' + key + '": ' + where[key] + ' and ' + f);
    where[key] = f;
    try { banks[key] = JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { throw new Error('bank ' + f + ': ' + e.message); }
  }
  return { banks, where };
}
// every REPO/content/**/*.json keyed by its path without .json ("p1/primary", "home")
function readContent(repo) {
  const root = path.join(repo || REPO, 'content'), out = {};
  for (const f of walk(root, '.json')) {
    const key = path.relative(root, f).replace(/\\/g, '/').replace(/\.json$/, '');
    try { out[key] = JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { throw new Error('content ' + f + ': ' + e.message); }
  }
  return out;
}
function cardTerms(content) { const c = content['p5/cards']; return c && Array.isArray(c.terms) ? c.terms.map((t) => String(t.term || '')).filter(Boolean) : []; }
function readTeachers(design) {
  const f = path.join(design || DESIGN, 'TEACHERS.txt');
  return fs.existsSync(f) ? fs.readFileSync(f, 'utf8').split('\n').map((l) => l.replace(/#.*/, '').trim().toLowerCase()).filter(Boolean) : [];
}
function readPass(design) {
  const f = path.join(design || DESIGN, 'STAFF_PASSCODE.txt');
  if (!fs.existsSync(f)) return '';
  return (fs.readFileSync(f, 'utf8').split('\n').map((l) => l.trim()).filter(Boolean)[1]) || '';
}
function readStaff() { const f = path.join(STAFF_DIR, 'staff.json'); return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : null; }

const asciiJs = (s) => s.replace(/[\u0080-￿]/g, (c) => '\\u' + ('0000' + c.charCodeAt(0).toString(16)).slice(-4));
const asciiHtml = (s) => s.replace(/[\u0080-\u{10ffff}]/gu, (c) => '&#' + c.codePointAt(0) + ';');
const asciiCss = (s) => s.replace(/[\u0080-￿]/g, (c) => '\\' + c.charCodeAt(0).toString(16) + ' ');

// strings a page must never hold: the key fields' text from every bank (30+ characters), lex as JSON, the staff secrets
// and the private names. A bank string that is also, word for word, in the public content/ is exempt (it is public there).
const KEY_FIELDS = ['why', 'whys', 'why_marks', 'model', 'then', 'ao', 'lex'];
function leakList(opt) {
  const { banks, content, staff, pass, teachers } = opt;
  const pub = new Set();
  (function each(v) { if (typeof v === 'string') pub.add(v.trim()); else if (v && typeof v === 'object') Object.values(v).forEach(each); })(content);
  const guarded = new Map(), exempt = new Set();
  const add = (s, why) => { s = String(s).trim(); if (s.length < 30) return; if (pub.has(s)) { exempt.add(s); return; } if (!guarded.has(s)) guarded.set(s, why); };
  const strings = (v, f) => { if (typeof v === 'string') f(v); else if (v && typeof v === 'object') Object.values(v).forEach((x) => strings(x, f)); };
  (function visit(v, where) {
    if (!v || typeof v !== 'object') return;
    for (const [k, x] of Object.entries(v)) {
      if (KEY_FIELDS.includes(k)) {
        strings(x, (s) => add(s, where + '.' + k));
        if (k === 'lex' && x && typeof x === 'object') Object.values(x).forEach((arr) => { if (Array.isArray(arr) && arr.length > 1) add(JSON.stringify(arr), where + '.lex[json]'); });
      } else visit(x, where + '.' + k);
    }
  })(banks, 'banks');
  const fixed = ['var BANKS', 'JudgeFive', 'JudgeTen', 'JudgeCommon', '"k":', '"ph_k"', '"why_marks"', '"whys"', '"lex":', 'STAFF_SALT', 'STAFF_HASH'];
  const secrets = [staff && staff.salt, staff && staff.hash, pass].filter(Boolean).concat(teachers || []);
  return { guarded, exempt, fixed, secrets };
}
// the forms one string can take in the built page (raw, \u-escaped JS, &#N; HTML, JSON-escaped)
function forms(s) { const j = JSON.stringify(s).slice(1, -1); return Array.from(new Set([s, asciiJs(s), asciiHtml(s), j, asciiJs(j)])); }
function findLeaks(page, L) {
  const hits = [];
  for (const t of L.fixed) if (page.indexOf(t) !== -1) hits.push({ what: t, from: 'fixed' });
  for (const t of L.secrets) if (page.indexOf(t) !== -1) hits.push({ what: '(a staff secret or private address)', from: 'secret' });
  for (const [s, from] of L.guarded) if (forms(s).some((f) => page.indexOf(f) !== -1)) hits.push({ what: s.slice(0, 60), from });
  return hits;
}

module.exports = { REPO, DESIGN, DEPLOY, STAFF_DIR, PLATFORM, PAGE_FILES, SCRIPT_NAMES, IMG_URL, SCRIPTLETS, walk, readBanks, readContent, cardTerms,
  readTeachers, readPass, readStaff, asciiJs, asciiHtml, asciiCss, leakList, findLeaks };
