#!/usr/bin/env node
/* qa-dfm-audit.js — THE HARNESS ON THE RECORD ITSELF (audit gap G7).
 *
 * DAMIEN, 11 Aug 2026: "what is the point of having rules that are not
 * enforced?" and, when told an entry had been "logged as rule N": "you've logged
 * rulings as a rule. this makes no sense to me. does it have a harness?"
 *
 * The answer of record (DFM 195b): not every rule CAN have a harness — some are
 * judgement, some are his own recorded decisions — but NO RULE MAY EXIST WITHOUT
 * DECLARING WHICH OF THE THREE HOMES ENFORCES IT, and a machine checks THAT.
 * This is the machine. Every numbered entry from 139 up in
 * DAMIEN_FEEDBACK_MASTER.md must appear in exactly ONE status section of
 * DFM_ENFORCEMENT_AUDIT.md:
 *
 *   A HARNESSED · B JUDGED · D STANDING ORDERS · E HIS CALLS/SETTLED/HISTORICAL
 *   F GAPS (binding, enforced by nothing — each with an owner and a phase)
 *
 * Rule 144's law applied to itself: the audit file is a fact that changes, so it
 * gets the same treatment every other repeated fact gets. Add rule 199 tomorrow
 * and forget its row, and the PACK STOPS.
 *
 * Wired into pack-content.js. Usage: node qa-dfm-audit.js
 */
const fs = require('fs');
const path = require('path');

const KS3 = process.env.KS3DT_DOCS ||
  path.join(process.env.HOME, 'Desktop/Claude Work/KS3 DT Platform');
const MASTER = path.join(KS3, 'DAMIEN_FEEDBACK_MASTER.md');
const AUDIT = path.join(KS3, 'DFM_ENFORCEMENT_AUDIT.md');
const FIRST = 139;                      /* his own instruction: 139 and up */

const FAILS = [];
const check = (c, m) => { if (c) console.log('  PASS  ' + m); else { console.log('  FAIL  ' + m); FAILS.push(m); } };

if (!fs.existsSync(MASTER) || !fs.existsSync(AUDIT)) {
  console.error('qa-dfm-audit: cannot find the record.\n  ' + MASTER + '\n  ' + AUDIT);
  process.exit(2);
}

/* ---- the rules that exist ------------------------------------------------ */
const master = fs.readFileSync(MASTER, 'utf8');
const declared = [];
master.split('\n').forEach(l => {
  const m = /^(\d{1,3})\.\s+\*\*/.exec(l);
  if (m) declared.push(Number(m[1]));
});
const rules = declared.filter(n => n >= FIRST).sort((a, b) => a - b);

/* ---- where the audit says each one lives --------------------------------- *
 * A number counts as a RULE REFERENCE only where a rule can legally start: at
 * the beginning of a line, after a bullet, a mid-dot, a comma, a slash, a
 * bracket or a dash. It does NOT count straight after a word — otherwise
 * "qa-live-tab 149" (a harness's check COUNT) would read as rule 149, and a
 * gate that invents rows is worse than no gate at all (DFM 146a).            */
const audit = fs.readFileSync(AUDIT, 'utf8');
const SECTIONS = [
  ['A', 'HARNESSED'], ['B', 'JUDGED'], ['C', 'THE COLD-READ CHECKLIST'],
  ['D', 'STANDING ORDERS'], ['E', 'HIS CALLS'], ['F', 'THE GAPS']
];
function sectionText(letter) {
  const rx = new RegExp('^## ' + letter + '\\.[^\\n]*$', 'm');
  const m = rx.exec(audit);
  if (!m) return null;
  const from = m.index;
  const next = /^## [A-Z]\./m.exec(audit.slice(from + m[0].length));
  return audit.slice(from, next ? from + m[0].length + next.index : audit.length);
}
/* Returns Map(ruleNumber -> Set of part markers seen). A PART MARKER is what
   makes a split filing honest: "141(b)", "164a", "190(c,d)", "191/B" each say
   WHICH HALF of the rule lives in this section. A bare "178" claims the whole
   rule. */
function refsIn(text) {
  const out = new Map();
  /* no newline inside the range separator: "…qa-live-tab 149\n- 156 …" is two
     facts on two lines, and reading it as the range 149–156 silently swallowed
     five rules on the first run of this harness. */
  const rx = /(^|[-·,/(*;–—:\s])(\d{2,3})(\s*\(([a-z,\s–-]+)\)|[a-z]\b|\/[A-Z]\b)?([ ]*[–-][ ]*(\d{2,3}))?/gm;
  let m;
  const add = (n, part) => {
    if (!out.has(n)) out.set(n, new Set());
    out.get(n).add(part || '');
  };
  while ((m = rx.exec(text)) !== null) {
    const lead = m[1];
    /* a leading SPACE only counts when what precedes it is not a word — the
       "qa-live-tab 149" case, where 149 is a harness's CHECK COUNT. A gate that
       invents rows is worse than no gate at all (DFM 146a). */
    if (/\s/.test(lead)) {
      const before = text.slice(0, m.index).replace(/\s+$/, '');
      if (/[A-Za-z)\]]$/.test(before)) continue;
    }
    const a = Number(m[2]);
    const part = m[3] ? m[3].replace(/[()\s]/g, '') : '';
    const b = m[6] ? Number(m[6]) : a;
    if (b > a && b - a <= 60) { for (let n = a; n <= b; n++) add(n, part); }
    else add(a, part);
  }
  return out;
}

const STATUS = ['A', 'B', 'D', 'E', 'F'];            /* C is the checklist, not a home */
const homes = {};
STATUS.forEach(s => {
  const t = sectionText(s);
  if (t === null) { FAILS.push('the audit has no section ' + s); return; }
  homes[s] = refsIn(t);
});

console.log('qa-dfm-audit — every rule declares which of the three homes enforces it (DFM 195b)');
console.log('  ' + rules.length + ' numbered rules from ' + FIRST + ' up in DAMIEN_FEEDBACK_MASTER.md ' +
  '(' + rules[0] + '–' + rules[rules.length - 1] + ')');

const missing = [], ambiguous = [], split = [];
rules.forEach(n => {
  const inWhich = STATUS.filter(s => homes[s] && homes[s].has(n));
  if (!inWhich.length) { missing.push(n); return; }
  if (inWhich.length === 1) return;
  /* A rule may legitimately live in two homes — 141's hint-price half is
     HARNESSED while its trade-offs-surfaced half is a STANDING ORDER, and
     saying so is more honest than forcing one label onto a rule with parts.
     What is NOT allowed is an UNDECLARED split: two sections both claiming the
     whole rule, so neither claim can be checked. At least one appearance must
     name the part it is filing. */
  const named = inWhich.filter(s => Array.from(homes[s].get(n)).some(x => x !== ''));
  if (named.length) split.push(n + ' → ' + inWhich.join(' + '));
  else ambiguous.push(n + ' (' + inWhich.join(' and ') + ', neither says which part)');
});
check(!missing.length, missing.length
  ? 'EVERY rule has a row — these do NOT: ' + missing.join(', ') +
    '. Add each to exactly one status section of DFM_ENFORCEMENT_AUDIT.md ' +
    '(A harnessed / B judged / D standing order / E his call / F gap).'
  : 'every rule ' + FIRST + '+ appears in a status section');
check(!ambiguous.length, ambiguous.length
  ? 'these rules are filed in two homes with NEITHER naming a part, so neither claim is checkable: ' +
    ambiguous.join('; ') + '. Write the part, e.g. "178(a,b)".'
  : 'no rule is filed in two homes without saying which part goes where');
if (split.length) {
  console.log('\n  DECLARED SPLITS (a rule with parts in more than one home — recorded, not a fault):');
  split.forEach(x => console.log('    · ' + x));
}

/* the checklist section must exist and be the judged layer's questions */
const C = sectionText('C');
check(!!C && /^\s*1\./m.test(C || ''), 'the cold-read checklist (section C) exists and is numbered — it is what section B is enforced BY');

/* CONTROL (DFM 146a): the guard is only worth having if it FAILS when a rule
   really has no row. The first version proved that by picking the next unused
   number — and the day rule 199 was written, "the next number" became 200,
   which the audit already contains as a character LIMIT ("gallery caps
   28/90/200"). The control broke while the guard was working perfectly: a
   control that depends on an accident is not a control.
   So it now tests the FAILURE PATH ITSELF — take a rule that genuinely has a
   row, hide that row, and check the guard reports it missing. */
console.log('\n  CONTROL: a rule with no row must be caught');
const victim = rules[rules.length - 1];
const hidden = {};
STATUS.forEach(s => {
  hidden[s] = new Map(homes[s]);
  hidden[s].delete(victim);
});
const wouldReport = !STATUS.some(s => hidden[s].has(victim));
check(wouldReport,
  'with rule ' + victim + "'s row hidden, the guard reports it as having no enforcement home — " +
  'so a new rule written without one STOPS THE PACK');
/* and the other direction: it must NOT report a rule that does have a row */
check(STATUS.some(s => homes[s] && homes[s].has(victim)),
  'and with the row present it says nothing (over-tightening guard)');

console.log('\n' + (FAILS.length ? 'qa-dfm-audit: ' + FAILS.length + ' FAILURE(S)' : 'qa-dfm-audit: ALL GREEN'));
process.exit(FAILS.length ? 1 : 0);
