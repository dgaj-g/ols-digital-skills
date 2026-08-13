/* Scene runner: records each scene as its own webm with a timing log, so the
   assembler can trim the hidden setup (behind the curtain title card) and
   concat navy-to-navy with no crossfade math.
   Usage: node lib/record.js <set> [sceneId ...]   e.g. node lib/record.js l2 ch2 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { Cinema, dataUri } = require('./cinema');
const { MakeCode, ScratchDriver, sleep } = require('./driver');

async function runSet(setName, only) {
  const scenesMod = require(path.join(__dirname, '..', 'scenes', setName + '.js'));
  const scenes = scenesMod.scenes.filter(s => !only.length || only.includes(s.id));
  if (!scenes.length) throw new Error('no scenes matched ' + JSON.stringify(only));
  const outDir = path.join(__dirname, '..', 'out', setName);
  fs.mkdirSync(outDir, { recursive: true });
  const timingsPath = path.join(outDir, 'timings.json');
  const timings = fs.existsSync(timingsPath) ? JSON.parse(fs.readFileSync(timingsPath, 'utf8')) : {};

  /* DFM 201a/b: in 'report' mode nothing throws, so the film-law violations of the
     PRE-FIX build are collected across every scene and written out as one file —
     the DFM 196 control evidence, and an honest enumeration of "this repeats in
     other parts of the video" rather than a single first-fault throw. */
  const filmLawViolations = [];
  const browser = await chromium.launch({ headless: true });
  for (const scene of scenes) {
    let lastErr = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      const log = (m) => console.log('[' + scene.id + ' a' + attempt + '] ' + m);
      log('--- recording (attempt ' + attempt + ')');
      const context = await browser.newContext({
        viewport: { width: 1280, height: 720 },
        /* DFM 169: films are recorded as the SCHOOL'S machines will show the
           site. The school runs Windows; recording from a Mac with no override
           put macOS screen furniture into the Lesson 3 film (Damien's find,
           9 Aug 2026 — Apple-drawn emoji in MakeCode's own Create-a-Project
           title). Keep the Chrome major in step with the bundled Chromium. */
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36',
        recordVideo: { dir: path.join(outDir, 'tmp'), size: { width: 1280, height: 720 } }
      });
      /* The UA string alone is not enough: MakeCode reads the LEGACY
         navigator.platform for its keyboard hints, which is how a toast saying
         "Press ⌘ / for help on keyboard controls" — the Mac command symbol —
         got into the Lesson 3 film (his find, DFM 169). On a Windows platform
         the same toast says Ctrl, which is what the school's machines show. */
      await context.addInitScript(() => {
        Object.defineProperty(Navigator.prototype, 'platform', { get: () => 'Win32' });
      });
      const page = await context.newPage();
      const cine = new Cinema(page, log);
      const DriverClass = scenesMod.driver === 'scratch' ? ScratchDriver : MakeCode;
      const drv = new DriverClass(page, log);
      try {
        await scene.run({ page, cine, drv, log, dataUri, sleep });
        if (scene.verify) await scene.verify({ page, drv, log });
        filmLawViolations.push(...cine.violations.map(v => Object.assign({ set: setName, sceneId: scene.id }, v)));
        const video = page.video();
        await context.close();
        const tmp = await video.path();
        const dest = path.join(outDir, scene.id + '.webm');
        if (fs.existsSync(dest)) fs.unlinkSync(dest);
        fs.renameSync(tmp, dest);
        timings[scene.id] = { file: scene.id + '.webm', marks: cine.marks, tailMs: scene.tailMs || 1300, recordedAt: new Date().toISOString() };
        fs.writeFileSync(timingsPath, JSON.stringify(timings, null, 1));
        log('saved ' + dest + ' marks=' + JSON.stringify(cine.marks));
        lastErr = null;
        break;
      } catch (e) {
        lastErr = e;
        filmLawViolations.push(...cine.violations.map(v => Object.assign({ set: setName, sceneId: scene.id }, v)));
        log('FAILED: ' + e.message);
        try { await page.screenshot({ path: path.join(outDir, 'fail-' + scene.id + '-a' + attempt + '.png') }); } catch (e2) {}
        await context.close().catch(() => {});
      }
    }
    if (lastErr) { await browser.close(); writeLawReport(); throw new Error(scene.id + ': ' + lastErr.message); }
  }
  await browser.close();
  writeLawReport();

  function writeLawReport() {
    if (!filmLawViolations.length) { console.log('FILM LAWS: no violations'); return; }
    const dest = process.env.KS3DT_FILM_LAW_OUT ||
      path.join(outDir, 'film-law-violations-' + (process.env.KS3DT_FILM_LAWS || 'enforce') + '.txt');
    const byLaw = {};
    filmLawViolations.forEach(v => { byLaw[v.law] = (byLaw[v.law] || 0) + 1; });
    const body = [
      'FILM-LAW REPORT — set ' + setName + ', mode ' + (process.env.KS3DT_FILM_LAWS || 'enforce'),
      'scenes: ' + scenes.map(s => s.id).join(', '),
      'TOTAL VIOLATIONS: ' + filmLawViolations.length + '  ' + JSON.stringify(byLaw),
      ''
    ].concat(filmLawViolations.map((v, i) =>
      (i + 1) + '. [' + v.law + '] ' + v.sceneId + ' — ' + v.scene +
      '\n     text: "' + (v.text || '') + '"' +
      '\n     rect: ' + JSON.stringify(v.rect) +
      (v.cursor ? '\n     cursor: ' + JSON.stringify(v.cursor) : '') +
      (v.viewport ? '\n     viewport: ' + JSON.stringify(v.viewport) : '')
    )).join('\n');
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, body + '\n');
    console.log('FILM LAWS: ' + filmLawViolations.length + ' violation(s) -> ' + dest);
  }
  // clear leftover tmp webms
  const tmpDir = path.join(outDir, 'tmp');
  if (fs.existsSync(tmpDir)) {
    for (const f of fs.readdirSync(tmpDir)) fs.unlinkSync(path.join(tmpDir, f));
    fs.rmdirSync(tmpDir);
  }
  console.log('SET DONE: ' + scenes.map(s => s.id).join(', '));
}

if (require.main === module) {
  const [setName, ...only] = process.argv.slice(2);
  if (!setName) { console.error('usage: node lib/record.js <set> [sceneId ...]'); process.exit(2); }
  runSet(setName, only).catch(e => { console.error('RUN FAILED:', e.message); process.exit(1); });
}
module.exports = { runSet };
