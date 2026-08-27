const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..', '..');
const src = fs.readFileSync(path.join(ROOT, 'platform', 'dev-server.js'), 'utf8');
const mem = {};
const localStorage = {
  getItem: k => (Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null),
  setItem: (k, v) => { mem[k] = String(v); }, removeItem: k => { delete mem[k]; }
};
const CONTENT = path.join(ROOT, 'content');
const sandbox = {
  console, setTimeout, clearTimeout, Promise, Date, Math, JSON, String, Number, Object, Array, isNaN,
  localStorage, sessionStorage: localStorage,
  location: { search: '?as=orla', href: 'http://localhost/ks3-dt/platform/' },
  document: { addEventListener() {}, createElement: () => ({ setAttribute() {}, appendChild() {}, style: {} }),
              head: { appendChild() {} }, body: { appendChild() {} } },
  addEventListener() {},
  fetch: (u) => {
    const rel = String(u).replace(/^\.\.\/content\//, '').replace(/\?.*$/, '');
    const f = path.join(CONTENT, rel);
    if (!fs.existsSync(f)) return Promise.resolve({ ok: false, status: 404 });
    return Promise.resolve({ ok: true, json: () => Promise.resolve(JSON.parse(fs.readFileSync(f, 'utf8'))) });
  }
};
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(src, sandbox, { filename: 'dev-server.js' });
const api = sandbox.OLS_DEV_SERVER;
(async () => {
  const me = (await api.call({ action: 'whoami' })).email;
  const st = JSON.parse(localStorage.getItem('ks3dt-dev') || '{}');
  st.classes = [{ name: 'Demo-10A', owner: 'teacher@demo', year: 'j3', created: new Date().toISOString() }];
  st.locks = { 'Demo-10A': { '1': { u: 1, on: 1 }, '2': { u: 1, on: 1 }, '3': { u: 1, on: 1 } } };
  st.pairing = { 'Demo-10A|j3-03': { P: { pid1: { m: [me, 'bot@demo'], cn: ['Director 3', 'Pixel (simulated)'], bot: 1, t: 1 } }, solo: [] } };
  st.pch = { pid1: { seq: 0, ev: [], ls: {}, bot: { startS: 1, greeted: 0, wrongUsed: 0, msgKey: -1, msgAtS: 0, reactKey: -1, plan: null } } };
  localStorage.setItem('ks3dt-dev', JSON.stringify(st));
  const P = { classCode: 'Demo-10A', lessonId: 'j3-03', pid: 'pid1' };
  console.log('me =', me);
  const sent = await api.call(Object.assign({ action: 'pairSend', kind: 'msg', text: 'C0|whatever' }, P));
  console.log('sent:', JSON.stringify(sent).slice(0, 120));
  for (let i = 0; i < 6; i++) {
    await new Promise(r => setTimeout(r, 900));
    const got = await api.call(Object.assign({ action: 'pairChannel', since: 0 }, P));
    const ev = (got && got.ev) || [];
    const mine = ev.filter(e => Number(e[1]) === 1).map(e => String(e[3]).slice(0, 60));
    if (mine.length) { console.log('PIXEL SAID:', JSON.stringify(mine)); break; }
    if (i === 5) console.log('PIXEL SAID NOTHING. all events:', JSON.stringify(ev.map(e => [e[1], String(e[3]).slice(0, 40)])));
  }
})().catch(e => console.log('THREW:', e.message));
