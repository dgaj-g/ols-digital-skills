#!/usr/bin/env node
/* MathShelf - dev/test-statcore.js
   Node runner for statcore.js selfTest(). Exit 0 = all green.
   mathcore.js is loaded first, as index.html loads it first: statcore reuses
   GJ_MATH's exact rationals and says so loudly if they are missing.
*/
'use strict';

var path = require('path');
var base = path.resolve(__dirname, '..');

global.window = global;

var M = require(path.join(base, 'mathcore.js'));
global.GJ_MATH = global.GJ_MATH || M;

require(path.join(base, 'statcore.js'));
var S = global.GJ_STATS;

var runnerFailures = [];
function X(name, cond) { if (!cond) runnerFailures.push(name); }

X('GJ_STATS attached to window', !!S);
X('check is a function', !!S && typeof S.check === 'function');
X('selfTest is a function', !!S && typeof S.selfTest === 'function');
X('gist is a function', !!S && typeof S.gist === 'function');
X('DX_NAMES is a table', !!S && S.DX_NAMES && typeof S.DX_NAMES.QL_UNORDERED === 'string');
X('MK_LABELS covers every kind', !!S && ['qlist','cftable','cfplot','cfread','boxplot','compare','judge','values']
  .every(function (k) { return Array.isArray(S.MK_LABELS[k]) && S.MK_LABELS[k].length === 2; }));
X('the follow-through rule table is closed', !!S && S.FT_RULE_IDS.length === 10);

var result = S ? S.selfTest() : { pass: false, failures: ['GJ_STATS missing'], count: 0 };

var i;
for (i = 0; i < runnerFailures.length; i++) console.log('  RUNNER FAIL: ' + runnerFailures[i]);
for (i = 0; i < result.failures.length; i++) console.log('  FAIL: ' + result.failures[i]);

var ok = result.pass && runnerFailures.length === 0;
console.log('statcore selfTest: ' + result.count + ' cases, ' +
  result.failures.length + ' failures (+' + runnerFailures.length + ' runner failures)');
console.log(ok ? 'ALL GREEN' : 'RED');
process.exit(ok ? 0 : 1);
