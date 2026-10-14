/* make-l6-film.js — J1 L6 "Inside her head" (spec §3.5). Built by code: Bernadette's own face narrates
   the processor's loop, one caption a beat, silent (DFM 139), captions burned in at the bottom.
   Pacing law (DFM 289e/309): each caption holds at least 1.2 s + 0.35 s a word; the whole film ≤ 60 s.
   Usage: node make-l6-film.js   Out: platform/assets/video/l6/l6-inside.mp4 (+ poster l6-inside.jpg) */
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const fs = require('fs'), path = require('path'), os = require('os');
const ROOT = path.join(__dirname, '..', '..', 'platform', 'assets');
const OUT = path.join(ROOT, 'video', 'l6', 'l6-inside.mp4');
const W = 1280, H = 720;
const BEATS = [
  { say: 'Bernadette wants to add two numbers.', show: 'sum' },
  { say: 'Her memory holds the next step.', show: 'mem' },
  { say: 'Her processor reads the step.', show: 'read' },
  { say: 'Her processor does the step.', show: 'do' },
  { say: 'The answer goes back into memory.', show: 'back' },
  { say: 'Next step. Round and round, millions of times a second.', show: 'loop' }
];
const hold = s => Math.max(1.2 + 0.35 * s.split(/\s+/).length, 3.2) + 0.6;   // floor 3.2 s so nobody is rushed
function scene(b) {
  const u = p => 'file://' + path.join(ROOT, p);
  const card = (t, cls) => `<div class="card ${cls || ''}">${t}</div>`;
  const part = (p, label, on) => `<div class="part ${on ? 'on' : ''}"><img src="${u('img/l6/' + p + '.jpg')}"><span>${label}</span></div>`;
  const m = b.show;
  const mem = part('mem', 'memory', m === 'mem' || m === 'back' || m === 'loop');
  const cpu = part('cpu', 'processor', m === 'read' || m === 'do' || m === 'loop');
  const step = m === 'sum' ? card('3 + 4 = ?', 'big') : m === 'mem' ? card('Next step: add 3 and 4') : m === 'read' ? card('add 3 and 4 &rarr;') : m === 'do' ? card('3 + 4 = 7', 'big') : m === 'back' ? card('&larr; 7') : card('&#8635;', 'big');
  return `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:G;src:url(${u('fonts/space-grotesk.woff2')})}
html,body{margin:0;width:${W}px;height:${H}px;background:#0f2a30;color:#f4efe2;font-family:G,sans-serif;overflow:hidden}
.stage{position:absolute;inset:0 0 150px 0;display:grid;grid-template-columns:330px 1fr;align-items:center;gap:40px;padding:0 60px}
.face svg{width:100%;height:auto}
.right{display:flex;flex-direction:column;gap:26px;align-items:center}
.parts{display:flex;gap:30px}
.part{background:#fff;border-radius:14px;padding:10px;width:250px;display:flex;flex-direction:column;align-items:center;gap:6px;opacity:.45;border:5px solid transparent}
.part.on{opacity:1;border-color:#e4b824}
.part img{width:100%;aspect-ratio:4/3;object-fit:contain}
.part span{color:#1a1a1a;font-weight:700;font-size:28px}
.card{background:#f4efe2;color:#1a1a1a;border-radius:12px;padding:12px 22px;font-size:34px;font-weight:700}
.card.big{font-size:56px}
.cap{position:absolute;left:60px;right:60px;bottom:34px;height:92px;display:flex;align-items:center;justify-content:center;text-align:center;
 background:rgba(0,0,0,.72);border-radius:14px;font-size:40px;font-weight:600;line-height:1.15;padding:0 24px}
</style></head><body><div class="stage"><div class="face" id="face"></div><div class="right"><div class="parts">${mem}${cpu}</div>${step}</div></div>
<div class="cap">${b.say}</div>
<script src="${u('l6/lines.js')}"></script><script src="${u('l6/face.js')}"></script>
<script>document.getElementById('face').innerHTML = OPFACE('happy');</script></body></html>`;
}
(async () => {
  const tmp = fs.mkdtempSync(path.join(os.homedir(), '.l6film-'));
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  const list = [];
  for (let i = 0; i < BEATS.length; i++) {
    const f = path.join(tmp, 'b' + i + '.html'); fs.writeFileSync(f, scene(BEATS[i]));
    await page.goto('file://' + f); await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(150);
    const png = path.join(tmp, 'b' + i + '.png'); await page.screenshot({ path: png });
    list.push({ png, t: hold(BEATS[i].say) });
  }
  await browser.close();
  const args = ['-y'];
  list.forEach(x => args.push('-loop', '1', '-t', x.t.toFixed(2), '-i', x.png));
  const fc = list.map((_, i) => `[${i}:v]fps=30,format=yuv420p,setsar=1[v${i}]`).join(';') + ';' + list.map((_, i) => `[v${i}]`).join('') + `concat=n=${list.length}:v=1:a=0[out]`;
  args.push('-filter_complex', fc, '-map', '[out]', '-c:v', 'libx264', '-crf', '23', '-preset', 'medium', '-movflags', '+faststart', OUT);
  execFileSync('ffmpeg', args, { stdio: 'ignore' });
  fs.copyFileSync(list[0].png, path.join(tmp, 'poster.png'));
  execFileSync('ffmpeg', ['-y', '-i', list[0].png, '-q:v', '4', OUT.replace(/\.mp4$/, '.jpg')], { stdio: 'ignore' });
  fs.writeFileSync(OUT.replace(/\.mp4$/, '.beats.json'), JSON.stringify(BEATS.map((b, i) => ({ say: b.say, hold: +list[i].t.toFixed(2) })), null, 1));
  fs.rmSync(tmp, { recursive: true, force: true });
  const total = list.reduce((a, x) => a + x.t, 0);
  console.log('wrote ' + OUT + ' · ' + total.toFixed(1) + ' s · ' + BEATS.length + ' captions');
})();
