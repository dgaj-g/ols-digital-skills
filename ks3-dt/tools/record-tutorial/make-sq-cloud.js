/* make-sq-cloud.js — publish the side quest's cloud explainer into the platform.
 *
 * The film itself is made by the ordinary pipeline:
 *     node lib/record.js lS1        (records scenes/lS1.js, take gate enforced)
 *     node assemble.js lS1          (trims, concatenates, writes chapters)
 * This step is the last one: it PROVES the assembled film is the one the lesson
 * currently asks for, and only then copies it — and its sidecar — into
 * platform/assets/video/shared/.
 *
 * WHY A SEPARATE STEP RATHER THAN A COPY BY HAND. The captions live in the
 * lesson JSON (DFM 190d), and the recorder wrote down what it actually showed.
 * If somebody edits a caption and does not re-record, the words in the film and
 * the words a separated reader judged come apart — silently, because the mp4
 * still plays perfectly. This refuses to publish in that case, and says which
 * caption moved. (qa-sq-films then holds the same line on every later run, so
 * the check is not merely a thing somebody remembered to do once.)
 *
 * Usage: node make-sq-cloud.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const HERE = __dirname;
const OUT = path.join(HERE, 'out', 'lS1');
const SHARED = path.join(HERE, '..', '..', 'platform', 'assets', 'video', 'shared');
const SRC_CONTENT = path.join(process.env.HOME,
  'Desktop/Claude Work/KS3 DT Platform/content-src/j1/lessons/j1-sq1.json');
const NAME = 'sq-cloud-explainer.mp4';

const probe = (f, e) => execFileSync('ffprobe',
  ['-v', 'error', '-show_entries', e, '-of', 'default=noprint_wrappers=1:nokey=1', f],
  { encoding: 'utf8' }).trim();

function die(msg) { console.error('FAILED: ' + msg); process.exit(1); }

const film = path.join(OUT, 'lS1-tutorial.mp4');
const side = path.join(OUT, 'burned-captions.json');
if (!fs.existsSync(film)) die('no assembled film at ' + film + ' — run node lib/record.js lS1 && node assemble.js lS1');
if (!fs.existsSync(side)) die('no burned-captions.json — the recording is older than the sidecar step; re-record');

const lesson = JSON.parse(fs.readFileSync(SRC_CONTENT, 'utf8'));
const brief = (lesson.chunks || []).find(c => c.engine === 'briefing') || {};
const want = ((brief.config || {}).videoFilm || {});
const burned = JSON.parse(fs.readFileSync(side, 'utf8'));

/* THE WORDS IN THE FILM ARE THE WORDS IN THE LESSON, or nothing is published */
const shown = (burned.burned || []).map(b => b.text);
const asked = (want.captions || []);
if (shown.length !== asked.length) {
  die('the film shows ' + shown.length + ' captions and the lesson now asks for ' +
    asked.length + ' — re-record (node lib/record.js lS1 && node assemble.js lS1)');
}
asked.forEach((t, i) => {
  if (t !== shown[i]) {
    die('caption ' + (i + 1) + ' has been edited since the film was recorded.\n' +
      '  the lesson says: ' + JSON.stringify(t) + '\n' +
      '  the film shows:  ' + JSON.stringify(shown[i]) + '\n' +
      '  re-record: node lib/record.js lS1 && node assemble.js lS1');
  }
});
['title', 'kicker', 'sub'].forEach(k => {
  if (String(want[k] || '') !== String(burned[k] || '')) {
    die('the film\'s ' + k + ' card was recorded as ' + JSON.stringify(burned[k]) +
      ' and the lesson now says ' + JSON.stringify(want[k]) + ' — re-record');
  }
});

/* the promises the card that embeds it depends on */
const streams = probe(film, 'stream=codec_type').split('\n').filter(Boolean);
if (streams.length !== 1 || streams[0] !== 'video') {
  die('every film on this platform is silent (DFM 139); this one has ' + streams.join('+'));
}
const dims = probe(film, 'stream=width,height').split('\n');
if (dims[0] !== '1280' || dims[1] !== '720') die('wrong frame: ' + dims.join('x'));
const dur = parseFloat(probe(film, 'format=duration'));

fs.mkdirSync(SHARED, { recursive: true });
fs.copyFileSync(film, path.join(SHARED, NAME));
/* THE SIDECAR IS WRITTEN IN THE SAME SHAPE HIS TWO OWN FILMS USE — {from, to,
   text} in FINISHED-FILM seconds — so qa-sq-films checks all three the same way
   instead of keeping a second, dumber path for this one (DFM 144/238a). The
   arithmetic is assemble.js's own: it trims each scene from (lift - 2200ms). */
const lift = Number(burned.liftMs || 0), hold = Number(burned.titleHoldMs || 2200);
const filmT = (ms) => Math.max(0, +(((Number(ms) - lift + hold) / 1000).toFixed(2)));
const rows = (burned.burned || []).map(b => ({
  from: filmT(b.showMs), to: filmT(b.hideMs != null ? b.hideMs : b.showMs), text: b.text
}));
if (rows.some(r => !(r.to > r.from))) {
  die('the recorder did not time every caption — re-record (node lib/record.js lS1)');
}
if (rows[rows.length - 1].to > dur + 1.5) {
  die('a caption is timed past the end of the film (' + rows[rows.length - 1].to +
    's v ' + dur.toFixed(1) + 's) — re-assemble');
}
fs.writeFileSync(path.join(SHARED, NAME.replace(/\.mp4$/, '.captions.json')),
  JSON.stringify({ burned: rows }, null, 1) + '\n');

console.log('WROTE ' + path.join(SHARED, NAME));
console.log('  ' + Math.floor(dur / 60) + ':' + String(Math.round(dur % 60)).padStart(2, '0') +
  '  (' + dur.toFixed(1) + 's, ' + (fs.statSync(film).size / 1048576).toFixed(2) + ' MB, 1280x720, ' +
  'video only, ' + shown.length + ' captions, all identical to the lesson)');
