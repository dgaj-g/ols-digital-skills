#!/usr/bin/env node
/* g3-strings — every S.<name> the page uses exists in strings.js; no slogans (all caps, or ending "!"); a number in a
   line always has its thing ("{n} of {m} marks", never "{n}/{m}" or a bare "{n} of {m}"); every string is a full
   sentence (ends . ? or …) or a label of five words or fewer. Failures print with their keys.
   CONTROL: a temp copy of strings.js with one used key deleted must fail. Run: node gates/g3-strings.js */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm'), os = require('os');
const { sheet } = require('./common.js');
const P = path.join(__dirname, '..', 'platform');
const sh = sheet('g3-strings');
const load = (src) => vm.runInNewContext(src + ';SOCS');
const SRC = fs.readFileSync(path.join(P, 'strings.js'), 'utf8'), SOCS = load(SRC), S = SOCS.S;
const USERS = ['app.js', 'engine.js', 'staff.js'];
// placeholders that carry words, not numbers (key.placeholder)
// checkN keeps T09's wording "Answer all 5 to check" (the five on screen are its thing)
const NUM_OK = new Set(["checkN"]);
const TEXT = new Set(['hi.name', 'stage.t', 'rightWas.k', 'badgeOn.d', 'badgeOff.r', 'badgeToast.n', 'progressRow.t', 'pupilHead.n']);
// toasts allowed to end in "!" (none today; add the key with its reason)
const BANG_OK = new Set([]);

function used(){ const out = new Map(); USERS.forEach((f) => { const s = fs.readFileSync(path.join(P, f), 'utf8'); let m; const re = /\bS\.([A-Za-z_]\w*)/g;
  while ((m = re.exec(s))) { if (!out.has(m[1])) out.set(m[1], f); } }); return out; }
function missing(strs){ return [...used()].filter(([k]) => !(k in strs)).map(([k, f]) => k + ' (' + f + ')'); }

const miss = missing(S);
sh.check(miss.length === 0, 'every S.<name> in app.js, engine.js and staff.js exists in strings.js', miss.join(', ') || used().size + ' names used');
const nonStr = Object.keys(S).filter((k) => typeof S[k] !== 'string');
sh.check(nonStr.length === 0, 'every S value is a string', nonStr.join(', '));

const strs = Object.keys(S).filter((k) => typeof S[k] === 'string');
const caps = strs.filter((k) => { const l = S[k].replace(/\{\w+\}/g, '').replace(/[^A-Za-z]/g, ''); return l.length >= 4 && l === l.toUpperCase() && !/^(WJEC|AO\d|CSV|PEEL|DIET)$/.test(l); });
sh.check(caps.length === 0, 'no all-caps slogans', caps.join(', '));
const bang = strs.filter((k) => /!\s*$/.test(S[k]) && !BANG_OK.has(k));
sh.check(bang.length === 0, 'no line ends in "!"', bang.map((k) => k + ': ' + S[k]).join(' | '));

// numbers with their things
const STOP = new Set(['to', 'and', 'or', 'the', 'a', 'an', 'of', 'is', 'are', 'was', 'with', 'in', 'on', 'at', 'for', 'placed', 'done', 'best', 'left', 'so', 'all', 'scored', 'found', 'had', 'than', 'by', 'from']);
function numberProblems(key, s){
  const out = [], re = /\{(\w+)\}/g; let m;
  if (/\{\w+\}\s*\/\s*(\{\w+\}|\d+)/.test(s)) out.push('slash pair');
  while ((m = re.exec(s))) {
    if (TEXT.has(key + '.' + m[1])) continue;
    const before = s.slice(0, m.index), wb = /([A-Za-z']+) $/.exec(before);
    let after = s.slice(m.index + m[0].length); const pair = /^\s+of\s+(the\s+)?(\{(\w+)\}|\d+)/.exec(after);
    if (pair) { after = after.slice(pair[0].length); if (pair[3]) re.lastIndex = m.index + m[0].length + pair[0].length; }
    const wa = /^(%|-?\s?([A-Za-z']+))/.exec(after);
    const okAfter = wa && (wa[1] === '%' || !STOP.has(wa[2].toLowerCase()));
    const okBefore = wb && !STOP.has(wb[1].toLowerCase());
    if (!okAfter && !okBefore) out.push('{' + m[1] + '}' + (pair ? ' of ' + pair[2] : '') + ' has no noun');
  }
  return out;
}
const nums = []; strs.filter((k) => !NUM_OK.has(k)).forEach((k) => { const p = numberProblems(k, S[k]); if (p.length) nums.push(k + ' "' + S[k] + '" (' + p.join('; ') + ')'); });
sh.check(nums.length === 0, 'every number placeholder has its thing', nums.join(' | '));

// full sentence or short label
const words = (s) => (s.match(/[A-Za-z0-9{][\w'{}’-]*/g) || []).length;
// a row of labels ("A · B · C", "Label: value") passes when every piece is five words or fewer; a line ending ":" leads in
// to what follows it. Three lines are held to their wording on purpose: ring (T04 sets it), cardsLeft (T29 sets it),
// clearMe (a staff button that must carry its two-press warning).
const SHAPE_OK = new Set(["ring", "cardsLeft", "clearMe"]);
const shape = strs.filter((k) => { const s = S[k].trim(); if (SHAPE_OK.has(k) || /[.?…:]["”)]?$/.test(s)) return false;
  return s.split(/ · |: /).some((piece) => words(piece) > 5); });
if (SHAPE_OK.size) sh.info("held to their wording: " + [...SHAPE_OK].map((k) => k + " \"" + S[k] + "\"").join(" | "));
sh.check(shape.length === 0, 'every string is a full sentence or a label of five words or fewer', shape.map((k) => k + ': "' + S[k] + '"').join(' | '));

// the parts, agents and badges lists carry words too
const lists = [].concat(SOCS.PARTS.map((p) => ['PARTS.' + p.id, p.t]), SOCS.AGENTS.map((a) => ['AGENTS.' + a.id, a.t]), SOCS.BADGES.map((b) => ['BADGES.' + b.id, b.t || b.name]));
const lbad = lists.filter(([, t]) => !t || words(t) > 6 || /!$/.test(t));
sh.check(lbad.length === 0, 'PARTS, AGENTS and BADGES names are short labels', lbad.map((x) => x[0]).join(', '));

// CONTROL: delete one used key from a temp copy of strings.js
const victim = 'checkN', tmp = path.join(os.tmpdir(), 'soc-g3-strings-' + process.pid + '.js');
const cut = SRC.split('\n').filter((l) => !new RegExp('^\\s*' + victim + ':').test(l)).join('\n');
fs.writeFileSync(tmp, cut);
let cmiss = []; try { cmiss = missing(load(fs.readFileSync(tmp, 'utf8')).S); } catch (e) { cmiss = ['load failed: ' + e.message]; }
fs.unlinkSync(tmp);
sh.check(cut !== SRC && cmiss.some((x) => x.indexOf(victim + ' ') === 0), 'CONTROL: strings.js with ' + victim + ' deleted fails', cmiss.join(', ') || 'not caught');
const cnum = numberProblems('ctl', 'You scored {n}/{m}').length + numberProblems('ctl', 'You scored {n} of {m}.').length;
sh.check(cnum >= 2, 'CONTROL: "{n}/{m}" and a bare "{n} of {m}" are caught', cnum + ' caught');
sh.finish();
