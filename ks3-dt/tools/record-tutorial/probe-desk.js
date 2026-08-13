const { chromium } = require('playwright');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch({ headless: true });
  const page = await b.newPage({ viewport: { width: 1280, height: 1000 } });
  const U='http://localhost:8121/ks3-dt/platform/index.html?class=Demo-8A&as=anya';
  await page.goto(U,{waitUntil:'domcontentloaded'}); await sleep(1400);
  await page.evaluate(()=>localStorage.clear()); await page.reload({waitUntil:'domcontentloaded'}); await sleep(2000);
  await page.evaluate(()=>{const db=JSON.parse(localStorage.getItem('ks3dt-dev'));
    const now=Math.floor((Date.now()-1767225600000)/60000);
    for(const n of ['1','2','3','4','5','S1'])db.locks['Demo-8A'][n]={u:now,on:1};
    db.cfg['Demo-8A']=db.cfg['Demo-8A']||{}; db.cfg['Demo-8A'].pairing={on:0};
    db.pupils=db.pupils||{}; db.pupils['Demo-8A:anya.murphy@demo']=Object.assign(db.pupils['Demo-8A:anya.murphy@demo']||{n:'Anya Murphy',cn:'',j:1,xp:0,g:''},{L:{}});
    localStorage.setItem('ks3dt-dev',JSON.stringify(db));});
  await page.reload({waitUntil:'domcontentloaded'}); await sleep(2400);
  await page.evaluate(()=>{const s=document.querySelector('.intro-skip'); if(s)s.click();}); await sleep(700);
  await page.evaluate(()=>{const t=Array.from(document.querySelectorAll('.tile')).find(e=>/Lesson\s*5(?!\d)/i.test(e.textContent)); if(t)t.click();}); await sleep(2500);
  // drive: hook -> contracts -> pick -> sign -> desk -> tick kit
  for (let i=0;i<14;i++){
    const m = await page.evaluate(()=>{
      const vis=e=>e&&e.offsetParent!==null; const q=s=>document.querySelector(s);
      const cta=q('.dossier-cta'); if(vis(cta)&&!cta.hidden){cta.click();return 'cta';}
      const pick=Array.from(document.querySelectorAll('.std-contract:not(.signed)')).filter(vis)[0];
      if(pick){pick.click();return 'pick';}
      const inp=q('.std-sig-input');
      if(vis(inp)&&inp.value.trim().length<3){inp.value='Pixel Otter Studio';inp.dispatchEvent(new Event('input',{bubbles:true}));return 'name';}
      const sign=q('.std-sign:not(.locked)'); if(vis(sign)){sign.click();return 'sign';}
      const kc=q('.std-kit-confirm:not([disabled])'); if(vis(kc)){kc.click();return 'kit';}
      const on=Array.from(document.querySelectorAll('.chunk-host .primary-btn:not([disabled]):not(.locked)')).filter(vis)
        .filter(e=>!/shred|back to/i.test(e.textContent||''))[0];
      if(on){on.click();return 'go:'+(on.textContent||'').trim().slice(0,20);}
      return 'stuck';
    });
    if(m==='stuck')await sleep(900); else await sleep(900);
    if (await page.evaluate(()=>!!document.querySelector('.std-qadesk'))) break;
  }
  await sleep(1200);
  const state = await page.evaluate(()=>{
    const out={};
    const kc=document.querySelector('.std-kit-confirm');
    out.kitConfirm = kc?{cls:kc.className,disabled:kc.disabled,aria:kc.getAttribute('aria-disabled'),
      innerBox:(kc.querySelector('.confirm-box')||{}).className,text:(kc.textContent||'').trim().slice(0,60)}:null;
    out.qaHeads=Array.from(document.querySelectorAll('.std-qa-head')).slice(0,3).map(h=>({
      tag:h.tagName,cls:h.className,disabled:h.disabled,aria:h.getAttribute('aria-disabled'),
      text:(h.textContent||'').replace(/\s+/g,' ').trim().slice(0,40)}));
    out.hasQaDesk=!!document.querySelector('.std-qadesk');
    return out;
  });
  console.log(JSON.stringify(state,null,1));
  await page.screenshot({path:'/tmp/studio-desk.png',fullPage:true});
  await b.close();
})().catch(e=>{console.error('PROBE FAILED',e.message);process.exit(1);});
