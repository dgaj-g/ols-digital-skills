/* J3 L6 THE NIGHT DESK — G9 assets gate. The two photographs and the poster font are present under
   platform/assets with their credit lines and the OFL file, and the hour page asks for them by a path that
   resolves. Control: the same checks over a copy with one photograph removed must FAIL.
   node ks3-dt/tools/record-tutorial/j3l6-assets.js            (gate + control)
   node ks3-dt/tools/record-tutorial/j3l6-assets.js --root DIR (checks one assets root, exit 1 on a miss) */
'use strict';
const fs = require('fs'), path = require('path'), os = require('os');
const ASSETS = path.join(__dirname, '../../platform/assets');
const PHOTOS = ['harbour-night', 'press-1'];

function check(root) {
  const miss = [], need = f => { if (!fs.existsSync(path.join(root, f)) || fs.statSync(path.join(root, f)).size < 1000) miss.push('missing ' + f); };
  PHOTOS.forEach(p => need('img/nightdesk/' + p + '.jpg'));
  need('fonts/playfair-display.woff2'); need('fonts/OFL-playfair.txt');
  const cred = fs.existsSync(path.join(root, 'img/CREDITS.md')) ? fs.readFileSync(path.join(root, 'img/CREDITS.md'), 'utf8') : '';
  PHOTOS.forEach(p => { if (!new RegExp('nightdesk/' + p + '\\.jpg.*(CC|public domain)', 'i').test(cred)) miss.push('no credit line for ' + p); });
  const fc = fs.existsSync(path.join(root, 'fonts/CREDITS.md')) ? fs.readFileSync(path.join(root, 'fonts/CREDITS.md'), 'utf8') : '';
  if (!/playfair-display\.woff2[\s\S]{0,200}Open Font License/.test(fc)) miss.push('no font credit for playfair-display.woff2');
  const hp = path.join(root, 'nightdesk/hour.html');
  if (!fs.existsSync(hp)) miss.push('missing nightdesk/hour.html');
  else {
    const h = fs.readFileSync(hp, 'utf8'), refs = (h.match(/url\(([^)]+)\)/g) || []).map(u => u.slice(4, -1).replace(/['"]/g, ''));
    PHOTOS.forEach(p => { if (!refs.some(r => r.endsWith('img/nightdesk/' + p + '.jpg'))) miss.push('hour.html never asks for ' + p + '.jpg'); });
    if (!refs.some(r => r.endsWith('fonts/playfair-display.woff2'))) miss.push('hour.html never asks for playfair-display.woff2');
    refs.filter(r => !/^data:/.test(r)).forEach(r => { if (!fs.existsSync(path.resolve(path.dirname(hp), r))) miss.push('hour.html asks for ' + r + ' which does not resolve'); });
  }
  return miss;
}

const ri = process.argv.indexOf('--root');
if (ri > 0) { const m = check(process.argv[ri + 1]); m.forEach(x => console.log('  ✗ ' + x)); process.exit(m.length ? 1 : 0); }

const m = check(ASSETS);
m.forEach(x => console.log('  ✗ ' + x));
/* control: a copy with press-1.jpg gone must fail */
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'j3l6-assets-'));
fs.cpSync(ASSETS + '/img', tmp + '/img', { recursive: true }); fs.cpSync(ASSETS + '/fonts', tmp + '/fonts', { recursive: true });
if (fs.existsSync(ASSETS + '/nightdesk')) fs.cpSync(ASSETS + '/nightdesk', tmp + '/nightdesk', { recursive: true });
fs.rmSync(tmp + '/img/nightdesk/press-1.jpg', { force: true });
const c = check(tmp); fs.rmSync(tmp, { recursive: true, force: true });
const ctrl = c.some(x => /press-1/.test(x));
console.log('control (press-1.jpg removed) ' + (ctrl ? 'FAILS as it must' : 'PASSED — the gate is blind'));
console.log(m.length || !ctrl ? 'G9 ASSETS FAIL · ' + m.length : 'G9 ASSETS PASS · 2 photos, font, OFL, credits, hour.html paths');
process.exit(m.length || !ctrl ? 1 : 0);
