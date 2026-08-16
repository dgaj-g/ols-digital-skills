const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ headless: true });
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  await p.goto('http://localhost:8121/ks3-dt/platform/index.html?class=Demo-8A&as=anya', { waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => document.querySelectorAll('button.tile').length > 0, null, {timeout:20000});
  await p.evaluate(() => { App.state.me.th='violet'; App.applyKit(); App.openKit(); });
  await p.waitForTimeout(1000);
  await p.addStyleTag({content:'.ols-modal, .ols-modal-card, #kit-body { max-height:none !important; overflow:visible !important; }'});
  await p.waitForTimeout(400);
  const info = await p.evaluate(() => {
    const el = document.querySelector('#kit-body .primary-btn');
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return { rect: {x:r.left+scrollX, y:r.top+scrollY, w:r.width, h:r.height},
             color: cs.color, background: cs.background.slice(0,90), boxShadow: cs.boxShadow.slice(0,80),
             docH: document.documentElement.scrollHeight, viewH: innerHeight, scrollY };
  });
  console.log(JSON.stringify(info,null,1));
  await b.close();
})();
