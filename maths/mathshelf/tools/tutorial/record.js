/* record.js — record a set of scenes as one continuous browser session.
   ONE context for the whole film (so the store carries from chapter to
   chapter), ONE page per scene (so each scene is its own video file with its
   own lift/down marks for the assembler).
   Usage: node record.js <set> [sceneId ...]     e.g. node record.js teacher ch2 */
'use strict';
const fs = require('fs');
const path = require('path');
const { Cinema } = require('./lib/cinema');
const F = require('./lib/film');

async function runSet(setName, only) {
  const scenesMod = require(path.join(__dirname, 'scenes', setName + '.js'));
  const scenes = scenesMod.scenes.filter(s => !only.length || only.includes(s.id));
  if (!scenes.length) throw new Error('no scenes matched ' + JSON.stringify(only));
  const outDir = path.join(__dirname, 'out', setName);
  fs.mkdirSync(outDir, { recursive: true });
  const tmpDir = path.join(outDir, 'tmp');
  fs.mkdirSync(tmpDir, { recursive: true });
  const timingsPath = path.join(outDir, 'timings.json');
  const timings = fs.existsSync(timingsPath) ? JSON.parse(fs.readFileSync(timingsPath, 'utf8')) : {};

  const { browser, context } = await F.openBrowser(tmpDir);
  const violations = [];
  try {
    for (const scene of scenes) {
      let lastErr = null;
      for (let attempt = 1; attempt <= 2; attempt++) {
        const log = (m) => console.log('[' + scene.id + ' a' + attempt + '] ' + m);
        log('--- recording');
        const page = await context.newPage();
        const cine = new Cinema(page, log);
        try {
          await scene.run({ page, cine, log });
          const video = page.video();
          await page.close();
          /* saveAs waits for the recording to be fully written; a rename of
             the temp file raced it once (ch2, 15:36) and lost the take */
          const dest = path.join(outDir, scene.id + '.webm');
          await video.saveAs(dest);
          await video.delete().catch(() => {});
          timings[scene.id] = { file: scene.id + '.webm', marks: cine.marks, tailMs: scene.tailMs || 1300, recordedAt: new Date().toISOString() };
          fs.writeFileSync(timingsPath, JSON.stringify(timings, null, 1));
          log('saved ' + dest + ' marks=' + JSON.stringify(cine.marks));
          lastErr = null;
          break;
        } catch (e) {
          lastErr = e;
          violations.push(...cine.violations.map(v => Object.assign({ set: setName, sceneId: scene.id }, v)));
          log('FAILED: ' + e.message);
          try { await page.screenshot({ path: path.join(outDir, 'fail-' + scene.id + '-a' + attempt + '.png') }); } catch (e2) {}
          try { const v = page.video(); await page.close(); const tp = await v.path(); fs.unlinkSync(tp); } catch (e3) {}
        }
      }
      if (lastErr) throw new Error(scene.id + ': ' + lastErr.message);
    }
  } finally {
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
    if (violations.length) {
      fs.writeFileSync(path.join(outDir, 'film-law-violations.txt'), violations.map((v, i) =>
        (i + 1) + '. [' + v.law + '] ' + v.sceneId + ' — ' + v.scene + '\n     text: "' + (v.text || '') + '"\n     rect: ' + JSON.stringify(v.rect)).join('\n') + '\n');
      console.log('FILM LAWS: ' + violations.length + ' violation(s) written');
    } else console.log('FILM LAWS: no violations');
    try { for (const f of fs.readdirSync(tmpDir)) fs.unlinkSync(path.join(tmpDir, f)); fs.rmdirSync(tmpDir); } catch (e) {}
  }
  console.log('SET DONE: ' + scenes.map(s => s.id).join(', '));
}

if (require.main === module) {
  const [setName, ...only] = process.argv.slice(2);
  if (!setName) { console.error('usage: node record.js <set> [sceneId ...]'); process.exit(2); }
  runSet(setName, only).catch(e => { console.error('RUN FAILED:', e.message); process.exit(1); });
}
module.exports = { runSet };
