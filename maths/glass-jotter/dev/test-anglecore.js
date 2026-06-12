#!/usr/bin/env node
/* The Glass Jotter - dev/test-anglecore.js
   Node runner for anglecore.js selfTest(). Exit 0 = all green.

   anglecore only needs GJ_MATH for calc-string entries. Per INTERFACES.md we
   require() mathcore.js explicitly here; until mathcore.js lands in the repo,
   an exact-rational stub honouring the same evalCalc contract
   ({ok, val:{n,d}}) keeps this runner self-sufficient.
*/
'use strict';

var path = require('path');
var base = path.resolve(__dirname, '..');

// Browser-style global so each file attaches window.GJ_* exactly as in Chrome.
global.window = global;

/* ---------- exact-rational evalCalc stub (used only if mathcore.js absent) ---------- */

function makeEvalCalcStub() {
  function gcd(a, b) {
    a = Math.abs(a); b = Math.abs(b);
    while (b) { var t = a % b; a = b; b = t; }
    return a || 1;
  }
  function norm(r) {
    var n = r.n, d = r.d;
    if (d < 0) { n = -n; d = -d; }
    var g = gcd(n, d);
    return { n: n / g, d: d / g };
  }
  function evalCalc(str) {
    // numeric only: + - * / ( ) decimals; unicode − × ÷ tolerated
    var s = String(str)
      .replace(/−/g, '-').replace(/×/g, '*').replace(/÷/g, '/')
      .replace(/\s+/g, '');
    var i = 0;
    function fromDec(t) {
      var p = t.split('.');
      var d = p[1] ? Math.pow(10, p[1].length) : 1;
      return norm({ n: Math.round(parseFloat(t) * d), d: d });
    }
    function num() {
      var m = /^\d+(\.\d+)?/.exec(s.slice(i));
      if (!m) return null;
      i += m[0].length;
      return fromDec(m[0]);
    }
    function factor() {
      if (s[i] === '(') {
        i++;
        var v = expr();
        if (!v || s[i] !== ')') return null;
        i++;
        return v;
      }
      if (s[i] === '-') { i++; var f = factor(); return f && norm({ n: -f.n, d: f.d }); }
      return num();
    }
    function term() {
      var v = factor();
      while (v && (s[i] === '*' || s[i] === '/')) {
        var op = s[i]; i++;
        var r = factor();
        if (!r) return null;
        if (op === '*') v = norm({ n: v.n * r.n, d: v.d * r.d });
        else if (r.n === 0) return null;
        else v = norm({ n: v.n * r.d, d: v.d * r.n });
      }
      return v;
    }
    function expr() {
      var v = term();
      while (v && (s[i] === '+' || s[i] === '-')) {
        var op = s[i]; i++;
        var r = term();
        if (!r) return null;
        v = op === '+'
          ? norm({ n: v.n * r.d + r.n * v.d, d: v.d * r.d })
          : norm({ n: v.n * r.d - r.n * v.d, d: v.d * r.d });
      }
      return v;
    }
    var v = expr();
    if (!v || i !== s.length) return { ok: false, err: 'parse' };
    return { ok: true, val: v };
  }
  return { evalCalc: evalCalc, __stub: true };
}

/* ---------- load mathcore (real if present) then anglecore ---------- */

var M = null;
try {
  var mexp = require(path.join(base, 'mathcore.js'));
  M = global.GJ_MATH || (mexp && typeof mexp.evalCalc === 'function' ? mexp : null);
} catch (e) { /* mathcore.js not built yet */ }

if (M) {
  global.GJ_MATH = M;
  console.log('[test-anglecore] using mathcore.js evalCalc');
} else {
  global.GJ_MATH = makeEvalCalcStub();
  console.log('[test-anglecore] mathcore.js not found - using exact-rational evalCalc stub');
}

require(path.join(base, 'anglecore.js'));
var A = global.GJ_ANGLES;

/* ---------- run ---------- */

var runnerFailures = [];
function X(name, cond) { if (!cond) runnerFailures.push(name); }

X('GJ_ANGLES attached to window', !!A);
X('checkSteps is a function', !!A && typeof A.checkSteps === 'function');
X('selfTest is a function', !!A && typeof A.selfTest === 'function');
X('verifyGraph is a function', !!A && typeof A.verifyGraph === 'function');
X('REASONS canon (12 ids incl. GIVEN)', !!A && Array.isArray(A.REASONS) &&
  A.REASONS.length === 12 && A.REASONS.indexOf('GIVEN') > -1 && A.REASONS.indexOf('ALT') > -1);

var result = A ? A.selfTest() : { pass: false, failures: ['GJ_ANGLES missing'], count: 0 };

var i;
for (i = 0; i < runnerFailures.length; i++) {
  console.log('  RUNNER FAIL: ' + runnerFailures[i]);
}
for (i = 0; i < result.failures.length; i++) {
  console.log('  FAIL: ' + result.failures[i]);
}

var ok = result.pass && runnerFailures.length === 0;
console.log('anglecore selfTest: ' + result.count + ' cases, ' +
  result.failures.length + ' failures (+' + runnerFailures.length + ' runner failures)');
console.log(ok ? 'ALL GREEN' : 'RED');
process.exit(ok ? 0 : 1);
