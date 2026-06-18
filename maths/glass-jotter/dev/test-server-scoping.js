/* Server scoping proof: loads server/Code.gs under mocked Apps Script globals
   and exercises apiAdmin as different signed-in staff. Proves the per-teacher
   ownership filter AND the per-action enforcement (the part the one-identity
   offline preview cannot show). */
'use strict';
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const CODE = fs.readFileSync(path.join(__dirname, '..', 'server', 'Code.gs'), 'utf8');

const DEPLOYER = 'd.gartland@c2ken.net';   // effective user (whoever deployed)
let ACTIVE = '';                            // mutable: who is accessing now

/* ---- in-memory sheet ---- */
function makeSheet(width) {
  return {
    _rows: [],
    _pad(r) { const a = (this._rows[r] || []).slice(); while (a.length < width) a.push(''); return a; },
    _ensureRow(r) { while (this._rows.length <= r) this._rows.push(new Array(width).fill('')); },
    getLastRow() { return this._rows.length; },
    getMaxRows() { return Math.max(this._rows.length, 1000); },
    appendRow(r) { const a = r.slice(); while (a.length < width) a.push(''); this._rows.push(a); },
    getDataRange() { const self = this; return { getValues() { return self._rows.map(function (r) { const a = r.slice(); while (a.length < width) a.push(''); return a; }); } }; },
    insertRowsAfter(after, n) { for (let i = 0; i < n; i++) this._rows.push(new Array(width).fill('')); },
    deleteRow(idx) { this._rows.splice(idx - 1, 1); },
    getRange(row, col, numRows, numCols) {
      numRows = numRows || 1; numCols = numCols || 1;
      const self = this;
      return {
        setNumberFormat() { return this; },
        setValue(v) { self._ensureRow(row - 1); self._rows[row - 1][col - 1] = v; return this; },
        setValues(vals) {
          for (let i = 0; i < numRows; i++) {
            self._ensureRow(row - 1 + i);
            for (let j = 0; j < numCols; j++) self._rows[row - 1 + i][col - 1 + j] = vals[i][j];
          }
          return this;
        }
      };
    }
  };
}

const configSheet = makeSheet(2);
const dataSheet = makeSheet(7);
configSheet.appendRow(['Key', 'Value']);
configSheet.appendRow(['staffPasscode', '0lsMaths26*']);
configSheet.appendRow(['classes', '[]']);
dataSheet.appendRow(['Class', 'Email', 'Name', 'Act', 'Summary', 'State', 'Updated']);

const sandbox = {
  Session: {
    getActiveUser: function () { return { getEmail: function () { return ACTIVE; } }; },
    getEffectiveUser: function () { return { getEmail: function () { return DEPLOYER; } }; }
  },
  SpreadsheetApp: {
    getActiveSpreadsheet: function () {
      return { getSheetByName: function (n) { return n === 'Config' ? configSheet : n === 'Data' ? dataSheet : null; } };
    },
    flush: function () {}
  },
  LockService: { getScriptLock: function () { return { waitLock: function () {}, releaseLock: function () {} }; } },
  console: console
};
vm.createContext(sandbox);
vm.runInContext(CODE, sandbox);

/* ---- tiny assert harness ---- */
let pass = 0, fail = 0;
function as(who) { ACTIVE = who; }
function admin(req) { return vm.runInContext('apiAdmin', sandbox)(req); }
function check(label, cond) { if (cond) { pass++; console.log('  ok  ' + label); } else { fail++; console.log('  FAIL ' + label); } }

const PW = '0lsMaths26*';
const TA = 'a.teacher@c2ken.net';
const TB = 'b.teacher@c2ken.net';

/* 1. passcode still gates everything */
as(TA);
check('bad passcode rejected', admin({ passcode: 'wrong', sub: 'classes' }).error === 'bad-passcode');

/* 2. teacher A creates 10A, teacher B creates 10B */
as(TA); var rA = admin({ passcode: PW, sub: 'addClass', className: '10A Maths' });
check('A adds 10A', rA.ok && rA.name === '10A-Maths');
as(TB); var rB = admin({ passcode: PW, sub: 'addClass', className: '10B Maths' });
check('B adds 10B', rB.ok && rB.name === '10B-Maths');

/* 3. each teacher sees ONLY their own; deployer sees BOTH + isAdmin */
as(TA); var lA = admin({ passcode: PW, sub: 'classes' });
check('A list = [10A] only', lA.ok && lA.classes.length === 1 && lA.classes[0].name === '10A-Maths' && lA.isAdmin === false);
as(TB); var lB = admin({ passcode: PW, sub: 'classes' });
check('B list = [10B] only', lB.ok && lB.classes.length === 1 && lB.classes[0].name === '10B-Maths' && lB.isAdmin === false);
as(DEPLOYER); var lD = admin({ passcode: PW, sub: 'classes' });
check('deployer sees BOTH + isAdmin', lD.ok && lD.classes.length === 2 && lD.isAdmin === true && lD.me === DEPLOYER);

/* 4. B cannot touch A's class by NAME on ANY sub (enforcement, not just filter) */
as(TB);
['setActs', 'wall', 'jotter', 'override', 'deleteClass'].forEach(function (sub) {
  var r = admin({ passcode: PW, sub: sub, className: '10A-Maths', act: 'angles', email: 'p@c2ken.net', q: 'q1', idx: 'q', val: 1, acts: { angles: false, algebra: false } });
  check('B blocked from A.' + sub + ' (not-your-class)', r.ok === false && r.error === 'not-your-class');
});

/* 5. A CAN manage A's own class */
as(TA);
check('A setActs on 10A ok', admin({ passcode: PW, sub: 'setActs', className: '10A-Maths', acts: { angles: true, algebra: false } }).ok === true);
check('A wall on 10A ok', admin({ passcode: PW, sub: 'wall', className: '10A-Maths', act: 'angles' }).ok === true);

/* 6. deployer (admin) CAN manage A's class (HOD override) */
as(DEPLOYER);
check('deployer wall on 10A ok', admin({ passcode: PW, sub: 'wall', className: '10A-Maths', act: 'angles' }).ok === true);

/* 7. global name uniqueness: B cannot create a name A already used (even though B can't see it) */
as(TB);
var dup = admin({ passcode: PW, sub: 'addClass', className: '10a maths' });
check('B add duplicate name -> exists (global uniqueness)', dup.ok === false && dup.error === 'exists');

/* 8. legacy UNOWNED class: only the deployer sees / can touch it */
var reg = JSON.parse(vm.runInContext('getConfig_("classes")', sandbox));
reg.push({ name: 'legacy-class', acts: { angles: true, algebra: true } });   // no owner
vm.runInContext('setConfig_', sandbox)('classes', JSON.stringify(reg));
as(TA); var lA2 = admin({ passcode: PW, sub: 'classes' });
check('A does NOT see legacy unowned class', lA2.classes.every(function (c) { return c.name !== 'legacy-class'; }));
check('A blocked from legacy unowned class', admin({ passcode: PW, sub: 'wall', className: 'legacy-class', act: 'angles' }).error === 'not-your-class');
as(DEPLOYER); var lD2 = admin({ passcode: PW, sub: 'classes' });
check('deployer DOES see legacy unowned class', lD2.classes.some(function (c) { return c.name === 'legacy-class'; }));

/* 9. deployer can delete A's class (admin) */
as(DEPLOYER);
check('deployer deletes 10A (admin override)', admin({ passcode: PW, sub: 'deleteClass', className: '10A-Maths' }).ok === true);
as(TA); check('A list now empty after deployer deletes 10A', admin({ passcode: PW, sub: 'classes' }).classes.length === 0);

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
