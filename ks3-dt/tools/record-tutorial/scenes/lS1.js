/* scenes/lS1.js — THE SIDE QUEST'S CLOUD EXPLAINER (DFM 253a, spec Job 1).
 *
 * One chapter, six beats, no editor on camera: the whole film is the drawn
 * scene in lib/cloud/cl.js. It is served on the side quest's OPENING card,
 * above the briefing lines, because his finding was that the card "talks about
 * clouds as if the pupils are going to know what the cloud means".
 *
 * THE CAPTIONS ARE NOT IN THIS FILE. They live in the lesson JSON, on the
 * briefing chunk, for the reason DFM 190(d) gives and DFM 144 insists on: a
 * sentence hardcoded in a build script never meets the language gate or the
 * read-aloud ledger, and a caption is a pupil sentence like any other. One
 * home means the words burned into the film and the words a separated reader
 * judged can never come apart. (This is the same arrangement his two "Show me
 * how" films already use — make-sq-films.js reads their captions from the same
 * lesson file.)
 *
 * THE TAKE GATE IS THE UNIFIED ANIMATION LAW (DFM 207d), and all THREE halves
 * of it are measured here, per beat, at the moment the thing is being taught:
 *   actor  >= 110px      the thing on screen she is meant to recognise
 *   label  >=  24px      every teaching word
 *   contrast >= 4.5:1    measured in rendered pixels, which has never been done
 *                        on an animation before this round — 207d made it law
 *                        and nothing had ever measured it.
 * A refused take RETRIES rather than killing the run (the l5 lesson: a check
 * that throws against a closed page took the whole recording down with it).
 */
const fs = require('fs');
const path = require('path');
const { dataUri } = require('../lib/cinema');

const DASH = '—';
const CREST = dataUri('crest-360.png');

/* ---- the film's words, read from the lesson (never kept here) ---- */
const SRC_CONTENT = path.join(process.env.HOME,
  'Desktop/Claude Work/KS3 DT Platform/content-src/j1/lessons/j1-sq1.json');

function filmFromContent() {
  const lesson = JSON.parse(fs.readFileSync(SRC_CONTENT, 'utf8'));
  const brief = (lesson.chunks || []).find(c => c.engine === 'briefing');
  const f = brief && brief.config && brief.config.videoFilm;
  if (!f) throw new Error('j1-sq1.json: the briefing carries no videoFilm block — ' +
    'the captions live in the content (DFM 190d), so there is nothing to record');
  if (!Array.isArray(f.captions) || f.captions.length !== 6) {
    throw new Error('j1-sq1.json: videoFilm.captions must be the six beats of the spec, got ' +
      (f.captions || []).length);
  }
  return f;
}
const FILM = filmFromContent();

/* ---- the take gate ---- */
const FLOORS = { actor: 110, label: 24, contrast: 4.5 };

/* WHAT EACH BEAT IS TEACHING, and WHEN inside the beat the thing is settled
   enough to measure. Sampling too early refuses an honest take for something
   that has simply not arrived yet (the l5 lesson: beat 3's snack was sampled at
   2.6s and does not leave the machine until 3.3s). */
const BEAT_SAMPLE = {
  1: { at: 3900, tokens: ['monitor', 'document', 'my work'] },
  2: { at: 8600, tokens: ['building', 'THE CLOUD', 'A BUILDING FULL OF COMPUTERS', 'document in the cloud'] },
  3: { at: 5000, tokens: ['building', 'document in the cloud'] },
  4: { at: 6400, tokens: ['laptop', 'phone'] },
  5: { at: 6400, tokens: ['building', 'second building', 'Google Drive', 'OneDrive'] },
  6: { at: 4400, tokens: ['School', 'DT Work'] }
};

/* Actors are things; labels are words. The floor a token is held to depends on
   which it is, and the animation itself says which (probeTokens tags them), so
   the two files cannot drift apart about it. */
async function gateBeat(page, beatNo, log) {
  const seen = await page.evaluate(() => window.cloud.probeTokens());
  const ink = await page.evaluate(() => window.cloud.probeInk());
  const contrast = await page.evaluate(() => window.cloud.probeContrast());
  const want = BEAT_SAMPLE[beatNo].tokens;
  const said = [];
  want.forEach(name => {
    const tok = (seen || []).find(t => t.name === name);
    if (!tok) {
      throw new Error('cloud beat ' + beatNo + ': "' + name + '" was not on screen at its ' +
        'teaching moment (saw ' + JSON.stringify((seen || []).map(s => s.name)) + ')');
    }
    const floor = tok.actor ? FLOORS.actor : FLOORS.label;
    if (tok.px < floor) {
      throw new Error('cloud beat ' + beatNo + ': ' + name + ' measures only ' + tok.px +
        'px tall — the floor is ' + floor + 'px (DFM 207d)');
    }
    if (!tok.actor) {
      /* SIZE IS NOT VISIBILITY (DFM 146b): a label texture that failed to upload
         measures the right height and draws nothing at all. */
      const i = (ink || []).find(t => t.name === name);
      if (!i || i.inkPixels < 40) {
        throw new Error('cloud beat ' + beatNo + ': "' + name + '" is the right size but ' +
          'nothing is drawn in it (' + ((i || {}).inkPixels || 0) + ' lit pixels) — the ' +
          'label texture did not render');
      }
      const c = (contrast || []).find(t => t.name === name);
      if (!c || c.ratio < FLOORS.contrast) {
        throw new Error('cloud beat ' + beatNo + ': "' + name + '" measures ' +
          ((c || {}).ratio || 0) + ':1 against its own ground — the floor is ' +
          FLOORS.contrast + ':1 (DFM 207d). Pixel size proves size, never legibility.');
      }
      said.push(name + ' = ' + tok.px + 'px, ' + c.ratio + ':1, ink ' + i.inkPixels);
    } else {
      said.push(name + ' = ' + tok.px + 'px');
    }
  });
  log('cloud legibility ok (beat ' + beatNo + '): ' + said.join('; '));
}

const BLOCKS_ON_CAMERA = [];   /* nothing from any code editor is on camera */

/* WHICH FILMS THIS SCENE ACTUALLY RECORDS. Declared, because the side quest is
   the first lesson to ship films from TWO sources: this one, made by the
   pipeline, and his two own screen captures, which have no scene script and are
   covered by qa-sq-films instead. Without this declaration qa-harness-coverage
   would have seen a scene file for the lesson and stopped asking who was
   checking the other two — a scene covering films it never recorded is exactly
   the silent-coverage fault DFM 204/206 exist to stop. */
const FILMS_RECORDED = ['sq-cloud-explainer.mp4'];

const scenes = [
  {
    id: 'ch1',
    label: 'What the cloud is',
    tailMs: 1500,
    run: async ({ page, cine, log }) => {
      const url = 'file://' + path.join(__dirname, '..', 'lib', 'cloud', 'index.html');
      await page.goto(url);
      await cine.install();
      await cine.curtain({
        crest: CREST,
        kicker: FILM.kicker,
        title: FILM.title,
        sub: FILM.sub
      });
      await cine.pause(2900);
      await cine.lift();

      await page.evaluate(() => window.cloud.ready);

      /* WHAT WAS ACTUALLY SHOWN, written down beside the film. These captions are
         drawn INTO the frame by the recorder rather than burned on afterwards by
         ffmpeg, so there is no build step that could be re-run without them —
         which is exactly why the record has to be made HERE, by the thing that
         showed them. make-sq-cloud.js publishes it beside the mp4 and qa-sq-films
         holds it equal to the lesson, so a caption edited after the recording
         fails instead of shipping un-filmed (the DFM 144 one-home law, and the
         sidecar pattern his two own captures already use). */
      const burned = [];
      for (let i = 0; i < FILM.captions.length; i++) {
        const beatNo = i + 1;
        await cine.captionShow(FILM.captions[i]);
        /* the moment it went up, on the recorder's own clock. assemble.js trims
           from (lift - 2200ms), so make-sq-cloud.js can turn these into times in
           the FINISHED film — which is what lets qa-sq-films check this film the
           same way it checks his two, by looking inside each caption's own
           window rather than at a fixed grid that can land in a 300ms fade. */
        if (burned.length) burned[burned.length - 1].hideMs = cine.ms();
        burned.push({ beat: beatNo, text: FILM.captions[i], showMs: cine.ms() });
        /* the beat is started, NOT awaited, so the take gate can measure inside
           it; a check that throws is caught by the runner's own retry rather
           than rejecting against a closed page (DFM 200 — a crashing harness is
           a failing harness) */
        const playing = page.evaluate(n => window.cloud.play(n), beatNo).catch(() => {});
        await page.waitForTimeout(BEAT_SAMPLE[beatNo].at);
        /* A MARK AT EVERY TEACHING MOMENT. The take gate measures the beat here;
           the still that gets READ, eyes on pixels, before any of this is wired
           has to be the SAME frame (DFM 225b/243), and a still pulled from a
           guessed timestamp is a still of something else. shoot-cloud-stills.js
           reads these marks out of timings.json and cuts exactly here. */
        await cine.mark('beat' + beatNo);
        await gateBeat(page, beatNo, log);
        if (beatNo === 1) {
          /* DFM 146b: prove the pixels, not the absence of an error. A software
             renderer that falls over draws a flat rectangle, and a flat
             rectangle records perfectly happily. */
          const first = await page.evaluate(() => window.cloud.probe());
          if (!first.some(p => p.max > 60)) {
            throw new Error('cloud drew nothing after beat 1 — WebGL failed: ' + JSON.stringify(first));
          }
          log('cloud probe ok: ' + JSON.stringify(first.map(p => p.max)));
        }
        await playing;
      }
      if (burned.length) burned[burned.length - 1].hideMs = cine.ms();
      await cine.captionHide();

      const last = await page.evaluate(() => window.cloud.probe());
      if (!last.some(p => p.max > 60)) throw new Error('cloud went blank mid-take');

      await cine.drop({});
      await cine.pause(900);

      const outDir = path.join(__dirname, '..', 'out', 'lS1');
      fs.mkdirSync(outDir, { recursive: true });
      fs.writeFileSync(path.join(outDir, 'burned-captions.json'),
        JSON.stringify({ film: 'sq-cloud-explainer.mp4', lesson: 'j1-sq1', chunk: 'sq-brief',
          title: FILM.title, kicker: FILM.kicker, sub: FILM.sub,
          liftMs: (cine.marks.find(m => m.name === 'lift') || {}).ms,
          titleHoldMs: 2200,            /* assemble.js's own trim constant */
          burned: burned }, null, 1) + '\n');
      log('wrote burned-captions.json (' + burned.length + ' captions actually shown)');
    }
  }
];

module.exports = { scenes, BLOCKS_ON_CAMERA, FILMS_RECORDED, FILM, FLOORS, BEAT_SAMPLE, SRC_CONTENT, DASH };
