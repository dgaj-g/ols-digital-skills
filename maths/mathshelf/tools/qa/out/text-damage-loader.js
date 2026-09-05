'use strict';
var fs = require('fs');
var mathcorePath = process.argv[2], anglecorePath = process.argv[3], packPath = process.argv[4], book = process.argv[5];
global.window = global;
try { require(mathcorePath); } catch (e) {}
try { require(anglecorePath); } catch (e) {}
require(packPath);
var C = global.GJ_CONTENT || {};
var rows = [];
function walk(obj, p) {
  if (typeof obj === 'string') { if (/\s/.test(obj)) rows.push({ path: p, value: obj }); return; }
  if (Array.isArray(obj)) { obj.forEach(function (item, i) { var key = (item && typeof item === 'object' && typeof item.id === 'string') ? item.id : String(i); walk(item, p + '[' + key + ']'); }); return; }
  if (obj && typeof obj === 'object') { Object.keys(obj).forEach(function (k) { walk(obj[k], (p ? p + '.' : '') + k); }); }
}
walk(C[book], book);
process.stdout.write(JSON.stringify(rows));
