// tools/gen_proto_data.js — bundles content for the prototype (a local file cannot fetch JSON): papers, twins, Fable twins, 2015 seed, expected rows.
const fs = require('fs'), path = require('path'); const root = path.join(__dirname, '..');
const rd = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const expected = {}; for (const f of fs.readdirSync(path.join(root, 'content/expected'))) expected[f.replace('.json', '')] = JSON.parse(rd('content/expected/' + f));
const data = { papers: JSON.parse(rd('content/papers.json')), twins: JSON.parse(rd('content/twins.json')), fable: JSON.parse(rd('content/twins-fable.json')), lessons: JSON.parse(rd('content/lessons.json')), seeds: { 2015: rd('seeds/2015.sql') }, expected };
fs.writeFileSync(path.join(root, 'prototype/data.js'), 'window.A2DATA = ' + JSON.stringify(data) + ';\n');
console.log('prototype/data.js', (fs.statSync(path.join(root, 'prototype/data.js')).size / 1024).toFixed(0) + ' KB');
