/* make-sq-films.js — build the side quest's two "Show me how" films from
   DAMIEN'S OWN SCREEN RECORDINGS (SIDEQUEST_FIX_SPEC §B1 + AMENDMENT 1 §A5).

   HIS CAPTIONS AND HIS TIMINGS ARE LAW. He wrote both lists himself and said
   they are non-negotiable, so every word and every in/out point below is his.
   THREE slips were smoothed and REPORTED, never silently (DFM 133b/141) - in the
   CONTENT, which is where the captions now live, so the fix is judged and gated
   rather than buried in a build script:
     1. OneDrive 1:50 read "and what how it saves automatically" -> "and watch how".
     2. Drive 0:06 opened a bracket it never closed -> closed after "instead".
     3. Drive listed "1 m 14 s - 1 m 31 s" TWICE with identical text -> once.
   Nothing else is touched: his quote marks, his hyphens and his capitals are
   exactly as he typed them.

   WHAT ELSE THIS DOES, and why:
   - HIS AUDIO IS STRIPPED. Every film on this platform is silent (DFM 139), and
     one talking machine in a room of thirty would be chaos.
   - Both recordings are 1920x1080, i.e. already the film frame's 16:9, so they
     scale straight to 1280x720 with no pillarboxing. The pad is still applied
     so a future re-record at another shape lands in the same frame rather than
     stretching (DFM 187a's precedent).
   - Captions are rendered by lib/caption-png.js — the same browser, font and CSS
     as every other caption on the platform — and burned in frame-accurately.
   - Captions sit at the BOTTOM. Checked frame by frame before choosing, not
     assumed (DFM 121a/141a): every control these captions point at is top-left
     (the Launch tiles, the grid of dots, "+ Create or upload", "+ New") or a
     centred dialog whose lowest edge is well above the lower third, so no
     caption covers the thing it is telling her to look at.

   Usage: node make-sq-films.js
   Out:   platform/assets/video/shared/sq-onedrive.mp4
          platform/assets/video/shared/sq-drive-build.mp4 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { renderCaptions } = require('./lib/caption-png');

const NAVY = '#1A3A6B';
const W = 1280, H = 720, FPS = 30, CRF = '23';
const IN_DIR = path.join(process.env.HOME, 'Desktop/Claude Work/KS3 DT Platform/extra videos');
const OUT_DIR = path.join(__dirname, '..', '..', 'platform', 'assets', 'video', 'shared');
const TMP_ROOT = path.join(__dirname, 'out', 'sq-films');

/* ─────────── HIS CAPTIONS, HIS TIMINGS — READ FROM THE CONTENT ───────────
   They are NOT kept here. They live in the lesson JSON, on the clip they belong
   to, for the reason DFM 190(d) gives: a sentence hardcoded in a build script
   never meets the language gate or the read-aloud ledger, and a caption is a
   pupil sentence like any other. Keeping one copy also means the words burned
   into the film and the words a separated reader judged can never come apart
   (DFM 144). Add or move a caption in the lesson file and re-run this. */
const SRC_CONTENT = path.join(process.env.HOME,
  'Desktop/Claude Work/KS3 DT Platform/content-src/j1/lessons/j1-sq1.json');

function filmsFromContent() {
  const lesson = JSON.parse(fs.readFileSync(SRC_CONTENT, 'utf8'));
  const out = [];
  (lesson.chunks || []).forEach(ch => {
    ((ch.config || {}).steps || []).forEach(st => {
      const clip = st.clip;
      if (!clip || !clip.src || !(clip.captions || []).length) return;
      const id = path.basename(String(clip.src)).replace(/\.mp4$/, '');
      out.push({
        id: id,
        src: id + '.mp4',
        where: ch.id + ' / ' + st.title,
        caps: clip.captions.map(c => [Number(c.from), Number(c.to), String(c.text)])
      });
    });
  });
  if (!out.length) throw new Error('no clip in j1-sq1.json carries captions - nothing to build');
  return out;
}
const FILMS = filmsFromContent();

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const probe = (file, entries) => execFileSync('ffprobe',
  ['-v', 'error', '-show_entries', entries, '-of', 'default=noprint_wrappers=1:nokey=1', file],
  { encoding: 'utf8' }).trim();

(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  for (const film of FILMS) {
    const src = path.join(IN_DIR, film.src);
    if (!fs.existsSync(src)) throw new Error('his recording is not where the spec says: ' + src);
    const tmp = path.join(TMP_ROOT, film.id);
    fs.mkdirSync(tmp, { recursive: true });

    const srcDur = parseFloat(probe(src, 'format=duration'));
    const last = film.caps[film.caps.length - 1][1];
    if (last > srcDur) throw new Error(film.id + ': a caption ends at ' + last +
      's but his footage is only ' + srcDur.toFixed(1) + 's long');

    /* one transparent 1280x720 PNG per caption, in the platform's own style */
    await renderCaptions(film.caps.map((c, ix) => ({ id: 'c' + ix, html: esc(c[2]) })), tmp, {});

    /* his footage: silent, in the film frame, every caption burned at his times */
    const args = ['-loglevel', 'error', '-y', '-i', src];
    film.caps.forEach((c, ix) => args.push('-i', path.join(tmp, 'c' + ix + '.png')));
    const chain = [
      '[0:v]scale=' + W + ':' + H + ':force_original_aspect_ratio=decrease',
      'pad=' + W + ':' + H + ':(ow-iw)/2:(oh-ih)/2:color=' + NAVY,
      'fps=' + FPS + ',format=yuv420p[base]'
    ].join(',');
    let steps = [chain], lbl = 'base';
    film.caps.forEach((c, ix) => {
      const out = (ix === film.caps.length - 1) ? 'vout' : ('v' + ix);
      steps.push('[' + lbl + '][' + (ix + 1) + ':v]overlay=0:0:enable=\'between(t,' +
        c[0] + ',' + c[1] + ')\'[' + out + ']');
      lbl = out;
    });
    const out = path.join(OUT_DIR, film.id + '.mp4');
    args.push('-filter_complex', steps.join(';'), '-map', '[vout]', '-an',
      '-c:v', 'libx264', '-preset', 'slow', '-crf', CRF, '-movflags', '+faststart', out);
    execFileSync('ffmpeg', args);

    /* the promises this file makes to the card that embeds it, asserted here so
       a rebuild cannot quietly break them */
    const streams = probe(out, 'stream=codec_type').split('\n').filter(Boolean);
    if (streams.length !== 1 || streams[0] !== 'video') {
      throw new Error(film.id + ' must be silent and video-only, got: ' + streams.join('+'));
    }
    const dur = parseFloat(probe(out, 'format=duration'));
    if (Math.abs(dur - srcDur) > 1.5) {
      throw new Error(film.id + ': length moved (' + srcDur.toFixed(1) + 's in, ' + dur.toFixed(1) + 's out)');
    }
    const dims = probe(out, 'stream=width,height').split('\n');
    if (dims[0] !== String(W) || dims[1] !== String(H)) {
      throw new Error(film.id + ': wrong frame ' + dims.join('x'));
    }
    /* WHAT WAS ACTUALLY BURNED IN, written down beside the film. qa-sq-films
       compares this to the lesson's captions, so an edited caption that was
       never re-burned FAILS instead of shipping. A file mtime cannot do that
       job: it moves whenever any other part of the lesson is touched, which
       made the first version of the check cry wolf on a teacher-brief edit. */
    fs.writeFileSync(out.replace(/\.mp4$/, '.captions.json'),
      JSON.stringify({ burned: film.caps.map(c => ({ from: c[0], to: c[1], text: c[2] })) }, null, 1) + '\n');
    console.log('WROTE ' + out);
    console.log('  ' + Math.floor(dur / 60) + ':' + String(Math.round(dur % 60)).padStart(2, '0') +
      '  (' + dur.toFixed(1) + 's, ' + (fs.statSync(out).size / 1048576).toFixed(2) + ' MB, ' +
      W + 'x' + H + ', video only, ' + film.caps.length + ' captions)');
  }
})().catch(e => { console.error('FAILED: ' + e.message); process.exit(1); });
