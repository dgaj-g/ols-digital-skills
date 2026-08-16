const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ headless: true });
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = [];
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto('http://localhost:8121/ks3-dt/platform/index.html?class=Demo-9A&as=aoife', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(9000);
  const info = await p.evaluate(() => ({
    tiles: document.querySelectorAll('button.tile').length,
    year: (window.App && App.state && App.state.year) || '?',
    th: (window.App && App.state && App.state.me && App.state.me.th),
    kitName: window.App && App.kitName && App.kitName(),
    themes: (window.App && App.state.kit && App.state.kit.themes || []).map(t => t.id),
    fx: document.getElementById('fx-layer') ? document.getElementById('fx-layer').className : 'none',
    space0: getComputedStyle(document.documentElement).getPropertyValue('--space-0').trim(),
    gold: getComputedStyle(document.documentElement).getPropertyValue('--gold').trim(),
    chunkHost: !!document.querySelector('.chunk-host'),
    h1: document.querySelector('h1') ? document.querySelector('h1').textContent.trim().slice(0,40) : null,
    bodyTextEls: document.body.querySelectorAll('*').length, hubRoots: Array.from(document.querySelectorAll('main, .hub, #hub, .hub-wrap, .lessons, .tiles, .chunk-host')).map(e=>e.className||e.id||e.tagName)
  }));
  console.log(JSON.stringify(info, null, 1));
  console.log('errors:', errs.slice(0,4));
  await p.screenshot({ path: '/private/tmp/claude-501/-Users-damiengartland-Desktop-Claude-Work/247b2e5f-4ab4-4925-9143-b7b0a6c4ca4a/scratchpad/j2-hub.png', fullPage: true });
  await b.close();
})();
