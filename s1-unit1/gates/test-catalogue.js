/* gates/test-catalogue.js — v13 (11 Nov 2026).
 * HIS RULING: the platform lists only the HQ activity sets made with him for the new course (Software, Databases,
 * Spreadsheets so far). Every one of them is scored and sits in a topic the gates open, so two code paths would go
 * untested: an activity with no score, and an activity in a locked topic. The gates add these two TEST entries to their
 * own COPY of Code.gs / Index.html (and to their own copy of S1L). They are never added to the platform itself.
 * zt* ids are for gates only; a real activity never takes one. */
'use strict';
const TEST = [
  { topic: 'impact', a: { id: 'zt1', title: 'Gate test: no score', path: 'S1_Ethics_Activity/activity1.html', scored: false } },
  { topic: 'networks', a: { id: 'zt2', title: 'Gate test: locked topic', path: 'software_revision/activity1.html', scored: true } }
];

function lit(a) {
  return '{ id: ' + JSON.stringify(a.id) + ', title: ' + JSON.stringify(a.title) + ', path: ' + JSON.stringify(a.path) + ', scored: ' + a.scored + ' }';
}

// Puts each TEST entry at the front of its topic's acts list in a built file (Code.gs or Index.html carry lessons.js verbatim).
function addToSource(src) {
  TEST.forEach(({ topic, a }) => {
    const key = '{ id: "' + topic + '", spec: ';
    const n = src.split(key).length - 1;
    if (n !== 1) throw new Error('test-catalogue: ' + key + ' is found ' + n + ' times');
    const at = src.indexOf(key), k = src.indexOf('acts: [', at);
    if (k === -1 || src.slice(at + key.length, k).indexOf(', spec: ') !== -1) throw new Error('test-catalogue: no acts list for ' + topic);
    const ins = k + 'acts: ['.length;
    src = src.slice(0, ins) + lit(a) + (src[ins] === ']' ? '' : ', ') + src.slice(ins);
  });
  return src;
}

// The same entries in a gate's own copy of S1L.
function addToL(S1L) {
  TEST.forEach(({ topic, a }) => { S1L.topics.find((t) => t.id === topic).acts.unshift(Object.assign({}, a)); });
  return S1L;
}

module.exports = { TEST, addToSource, addToL };
