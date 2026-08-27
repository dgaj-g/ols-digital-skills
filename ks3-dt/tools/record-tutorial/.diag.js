const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ headless: true });
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  p.on('console', m => { if (m.type()==='error') console.log('ERR', m.text()); });
  await p.goto('http://localhost:8121/ks3-dt/platform/index.html?class=Demo-9A&as=aoife', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(2500);
  await p.evaluate(() => {
    const db = JSON.parse(localStorage.getItem('ks3dt-dev'));
    const now = Math.floor((Date.now() - 1767225600000) / 60000);
    db.locks = db.locks || {}; db.locks['Demo-9A'] = db.locks['Demo-9A'] || {};
    for (const n of ['1','2','3']) db.locks['Demo-9A'][n] = { u: now, on: 1 };
    db.cfg = db.cfg || {}; db.cfg['Demo-9A'] = db.cfg['Demo-9A'] || {}; db.cfg['Demo-9A'].pairing = { on: 0 };
    localStorage.setItem('ks3dt-dev', JSON.stringify(db));
  });
  await p.reload({ waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(2500);
  await p.evaluate(() => { const b=document.querySelector('.intro-skip'); if(b) b.click(); });
  await p.waitForTimeout(600);
  await p.evaluate(() => { const t=[...document.querySelectorAll('.tile')].find(e=>e.textContent.includes('Chatbot Workshop')); if(t) t.click(); });
  await p.waitForTimeout(1800);
  // walk forward generically until we are standing on training-1
  for (let i = 0; i < 60; i++) {
    const at = await p.evaluate(() => (window.App && App.state && App.state.chunks[App.state.chunkIdx] || {}).id);
    if (at === 'training-1') break;
    await p.evaluate(() => {
      const pick = document.querySelector('.badge-pop button') ||
        document.querySelector('.dossier-cta') ||
        [...document.querySelectorAll('.q-opt:not(:disabled)')][0] ||
        document.querySelector('.q-feedback button') ||
        [...document.querySelectorAll('button.primary-btn:not([disabled])')].pop();
      if (pick) pick.click();
    });
    await p.waitForTimeout(700);
  }
  await p.waitForTimeout(1500);
  const dump = async (tag) => {
    const d = await p.evaluate(() => ({
      chunk: (window.App && App.state && App.state.chunks[App.state.chunkIdx] || {}).id,
      ask: !!document.querySelector('.pyx-ask:not([hidden]) .pyx-reply'),
      askHidden: (document.querySelector('.pyx-ask')||{}).hidden,
      enabled: [...document.querySelectorAll('button:not([disabled])')].map(b=>(b.className+'|'+b.textContent.trim().slice(0,24))).slice(0,12),
      logLines: document.querySelectorAll('.pyx-log .pyx-row').length,
      worked: !!document.querySelector('.pyw-card'),
      chosen: document.querySelectorAll('.pyw-chosen').length
    }));
    console.log(tag, JSON.stringify(d, null, 1));
  };
  await dump('AT training-1');
  for (let i=0;i<4;i++){
    await p.evaluate((n) => {
      const box=document.querySelector('.pyx-ask .pyx-reply:not([disabled])');
      if(box){ box.value='Aoife'+n; box.dispatchEvent(new Event('input',{bubbles:true}));
        const s=document.querySelector('.pyx-ask .pyx-send:not([disabled])'); if(s) s.click(); return 'replied'; }
      const first=[...document.querySelectorAll('button:not([disabled])')].find(b=>/pyw-|pyrun-run|primary/.test(b.className));
      if(first){ first.click(); return 'clicked '+first.className; }
      return 'nothing';
    }, i).then(r=>console.log('  step', i, r));
    await p.waitForTimeout(1500);
    await dump('  after '+i);
  }
  await b.close();
})();
