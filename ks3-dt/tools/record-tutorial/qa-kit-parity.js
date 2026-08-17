/* qa-kit-parity.js — THE KIT EQUIP IS RUN, IN BOTH HOMES, AND MUST ACTUALLY WORK.
 *
 * HIS FIND, 16 Aug 2026 (the J2/J3 Lesson 1 sit): "the same problem we
 * encountered before about the background skins not changing is happening for
 * J3 and J2" — and, decisively, "the J1 skins are saving no problem when i
 * change them."
 *
 * THE CAUSE, one line, and it was in BOTH servers: `apiSetKit`/`doSetKit` read
 * `cls.year`, but realClass_ returns the class NAME (a string). The year was
 * therefore always undefined, kitFor_ fell back to j1, and the server sliced
 * the theme registry to J1's looks for EVERY class of EVERY year. A J1 equip
 * was found in that slice and saved; every named J2/J3 look was refused
 * `unknown-theme`, so app.js reverted its optimistic apply and toasted "Could
 * not save your kit — try again." Exactly what he saw, in both years.
 *
 * WHY NOTHING CAUGHT IT, and it is the reason this file is shaped the way it
 * is. There WAS a two-homes check (qa-kit-years, "THE THREE COPIES OF THE RULE
 * AGREE") — but it greps the SOURCE for `clearancesByYear` and friends. Both
 * copies contained that text. Both copies were also wrong, in the same way, so
 * every check of the form "do the two homes agree?" passed while neither
 * worked. Agreement is not correctness: two identical mistakes agree perfectly.
 *
 * SO THIS GATE ASSERTS THE BEHAVIOUR, NOT THE AGREEMENT. It EXECUTES the real
 * code out of both files — the template's own functions, extracted and run, and
 * dev-server.js loaded whole under a stub window — and puts the same matrix
 * through each: every look of a year must SAVE on that year's class, every
 * other year's look must be REFUSED, and anything above her clearance must be
 * REFUSED. Agreement between the homes is then checked as well, but it is the
 * second question, never the first (DFM 234a).
 *
 * DFM 194(c) applies to this file's own history: the round's spec recorded that
 * only Code.gs carried the fault and that the preview resolved the year
 * correctly. That was a claim about behaviour, and reading dev-server.js line
 * 981 disproved it. The test is the behaviour.
 *
 *   node qa-kit-parity.js              # the matrix, both homes
 *   node qa-kit-parity.js --controls   # + the pre-fix build must FAIL it
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '../../..');
const SRC = process.env.KS3DT_SRC ||
  path.join(process.env.HOME, 'Desktop/Claude Work/KS3 DT Platform/content-src');
const REG_FILE = path.join(SRC, 'themes.json');
/* the build he sat, kept runnable for the whole round (DFM 196). Both pre-fix
   files are read from here so the controls fire against the real thing. */
const PREFIX_TREE = process.env.KS3DT_PREFIX_TREE || '';

const FAILS = [];
const check = (ok, m) => { console.log((ok ? '  PASS  ' : '  FAIL  ') + m); if (!ok) FAILS.push(m); };
const ctrl = (ok, m) => { console.log((ok ? '  CTRL  ' : '  FAIL  ') + m); if (!ok) FAILS.push('CONTROL: ' + m); };
const section = (t) => console.log('\n== ' + t + ' ==');

const registry = JSON.parse(fs.readFileSync(REG_FILE, 'utf8'));

/* ---------------------------------------------------------------- the classes
   One per year, named as the preview seeds them so both homes can be driven
   with the same request. */
const CLASSES = [
  { name: 'Demo-8A', year: 'j1' },
  { name: 'Demo-9A', year: 'j2' },
  { name: 'Demo-10A', year: 'j3' }
];
const YEARS = ['j1', 'j2', 'j3'];
const PUPIL = 'aoife.brennan@demo';
const RICH_XP = 400;   // above every threshold on every ladder

/* the looks each year OWNS, straight from the registry (never a hardcoded list,
   so a new look joins the matrix by existing) */
function looksOf(year) {
  const mine = (i) => (i && i.year) == null ? (year === 'j1') : (i.year === 'all' || String(i.year) === year);
  return {
    themes: (registry.themes || []).filter(mine),
    insignia: (registry.insignia || []).filter(mine)
  };
}
function ladderOf(year) {
  const by = registry.clearancesByYear;
  return (by && by[year]) || (by && by.j1) || registry.clearances || [];
}
function xpForLevel(year, level) {
  const row = ladderOf(year).find(c => Number(c.level) === Number(level));
  return row ? Number(row.xp) : 0;
}

/* =================================================================== HOME ONE
   Code.gs.template — its OWN functions, extracted and executed. Nothing here
   re-implements the rule; if the extraction fails, the gate fails. */
function templateHome(templatePath) {
  const src = fs.readFileSync(templatePath, 'utf8');
  const want = ['kitFor_', 'kitClearanceXp_', 'apiSetKit'];
  const grabbed = {};
  want.forEach(name => {
    /* from `function NAME(` to the line that closes it at column 0 */
    const start = src.indexOf('function ' + name + '(');
    if (start === -1) return;
    const end = src.indexOf('\n}', start);
    if (end === -1) return;
    grabbed[name] = src.slice(start, end + 2);
  });
  const missing = want.filter(n => !grabbed[n]);
  if (missing.length) {
    return { broken: 'could not extract ' + missing.join(', ') + ' from ' + path.basename(templatePath) };
  }

  const store = {};   // pupil records, keyed class:email
  const sandbox = {
    console,
    STORE_FULL_: { ok: false, error: 'store-full' },
    str_: (v) => String(v == null ? '' : v),
    num_: (v) => { const n = Number(v); return isNaN(n) ? 0 : n; },
    userEmail_: () => PUPIL,
    /* the real one returns the canonical NAME — the exact shape that caused the
       fault, reproduced faithfully so the control can bite */
    realClass_: (c) => {
      const hit = CLASSES.find(k => k.name.toLowerCase() === String(c || '').trim().toLowerCase());
      return hit ? hit.name : '';
    },
    classYear_: (cls) => {
      const hit = CLASSES.find(k => k.name === cls);
      return hit ? hit.year : 'j1';
    },
    kitRegistry_: () => registry,
    withLock_: (fn) => fn(),
    readPupil_: (cls, email) => store[cls + ':' + email] || null,
    tryWritePupil_: (cls, email, rec) => { store[cls + ':' + email] = rec; return true; },
    everXp_: (rec) => Math.max(Number((rec && rec.xp) || 0), Number((rec && rec.mx) || 0))
  };
  vm.createContext(sandbox);
  vm.runInContext(want.map(n => grabbed[n]).join('\n\n'), sandbox);

  return {
    name: path.basename(templatePath) === 'Code.gs.template' ? 'Code.gs' : templatePath,
    seed(cls, xp) { store[cls + ':' + PUPIL] = { n: 'Aoife Brennan', xp: xp, mx: xp, th: '', fx: '', L: {} }; },
    equip(cls, req) {
      return Promise.resolve(
        vm.runInContext('apiSetKit(' + JSON.stringify(Object.assign({ classCode: cls }, req)) + ')', sandbox)
      );
    },
    stored(cls) { const r = store[cls + ':' + PUPIL]; return { th: (r && r.th) || '', fx: (r && r.fx) || '' }; }
  };
}

/* =================================================================== HOME TWO
   dev-server.js — the whole file, loaded under a stub window. It is a browser
   FakeServer (localStorage-backed, no HTTP surface), so it is exercised the
   same way the template is: by running its real code. */
function devHome(devPath) {
  const src = fs.readFileSync(devPath, 'utf8');
  const mem = {};
  const localStorage = {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null),
    setItem: (k, v) => { mem[k] = String(v); },
    removeItem: (k) => { delete mem[k]; }
  };
  const sandbox = {
    console, setTimeout, clearTimeout, Promise, Date, Math, JSON, String, Number, Object, Array, isNaN,
    localStorage,
    sessionStorage: localStorage,
    location: { search: '', href: 'http://localhost/ks3-dt/platform/' },
    document: {
      addEventListener() {}, createElement: () => ({ setAttribute() {}, appendChild() {}, style: {} }),
      head: { appendChild() {} }, body: { appendChild() {} }
    },
    addEventListener() {},
    /* ── THE QUERY STRING IS STRIPPED, AND THIS GATE WAS BLIND WITHOUT IT ─────
       Found 17/18 Aug 2026 while running the full set for the J2/J3 teacher
       layer. DFM 236 put the content version INTO the request — `themes.json`
       became `themes.json?v=2026-08-17f` — because a cache key is only as good
       as the fetch that fills it. This stand-in fetch was never told, so it
       looked for a file literally named "themes.json?v=…", answered 404, and the
       preview home returned `no-registry` for EVERY equip.
       The gate then printed fifty-four failures and, worse, could never have
       printed a pass on the half it exists for: the only preview rows that could
       still go green were the ones asserting a REFUSAL. This is the gate written
       to catch the kit-save defect (DFM 234) having its own preview half switched
       off by an unrelated URL change — a harness reporting a fault the app does
       not have, which DFM 146(a) calls worse than no harness at all.
       Same class as DFM 143(b): a rule change re-stages every harness, not just
       the one in front of you. */
    fetch: (url) => {
      const rel = String(url).replace(/^\.\.\/content\//, '').replace(/[?#].*$/, '');
      const file = path.join(ROOT, 'ks3-dt/content', rel);
      if (!fs.existsSync(file)) return Promise.resolve({ ok: false, status: 404 });
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(JSON.parse(fs.readFileSync(file, 'utf8'))) });
    }
  };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox);
  const api = sandbox.OLS_DEV_SERVER;
  if (!api || typeof api.call !== 'function') return { broken: 'dev-server.js did not expose OLS_DEV_SERVER.call' };

  function state() { return JSON.parse(localStorage.getItem('ks3dt-dev') || '{}'); }
  function put(s) { localStorage.setItem('ks3dt-dev', JSON.stringify(s)); }

  return {
    name: 'dev-server.js',
    seed(cls, xp) {
      /* force the seed to exist, then set this class's pupil to a known record.
         The persona email is whatever the file itself uses, so read it back
         rather than assuming: the record we must move is the one it will read. */
      const s = state();
      s.classes = s.classes || [];
      CLASSES.forEach(c => { if (!s.classes.some(k => k.name === c.name)) s.classes.push({ name: c.name, owner: 'staff@demo', year: c.year, created: new Date().toISOString() }); });
      s.pupils = s.pupils || {};
      Object.keys(s.pupils).forEach(k => { if (k.indexOf(cls + ':') === 0) delete s.pupils[k]; });
      s.pupils[cls + ':' + this.email] = { n: 'Aoife Brennan', xp: xp, mx: xp, th: '', fx: '', L: {} };
      put(s);
    },
    email: '',
    equip(cls, req) { return api.call(Object.assign({ action: 'setKit', classCode: cls }, req)); },
    stored(cls) { const r = (state().pupils || {})[cls + ':' + this.email] || {}; return { th: r.th || '', fx: r.fx || '' }; },
    /* the persona the file picked for itself */
    discoverEmail() {
      const s = state();
      const anyKey = Object.keys(s.pupils || {}).find(k => k.indexOf('Demo-9A:') === 0 || k.indexOf('Demo-8A:') === 0);
      return anyKey ? anyKey.split(':')[1] : '';
    },
    prime() { return api.call({ action: 'whoami' }).then(r => { this.email = (r && r.email) || this.discoverEmail(); return this.email; }); }
  };
}

/* ================================================================ THE MATRIX
   The same questions, put to whichever home is handed in. Returns findings. */
async function runMatrix(home, label) {
  const out = [];
  const say = (ok, m) => out.push({ ok, m: label + ': ' + m });

  for (const cls of CLASSES) {
    const looks = looksOf(cls.year);

    /* 1. EVERY look this year owns must SAVE on this year's class. */
    for (const t of looks.themes) {
      home.seed(cls.name, RICH_XP);
      const r = await home.equip(cls.name, { themeId: t.id });
      say(r && r.ok === true && home.stored(cls.name).th === t.id,
        cls.year + ' pupil equips her own "' + t.name + '" (' + t.id + ') — saved' +
        (r && r.ok ? '' : ' [got ' + JSON.stringify(r) + ']'));
    }
    for (const g of looks.insignia) {
      home.seed(cls.name, RICH_XP);
      const r = await home.equip(cls.name, { insigniaId: g.id });
      say(r && r.ok === true && home.stored(cls.name).fx === g.id,
        cls.year + ' pupil equips her own insignia "' + g.id + '" — saved' +
        (r && r.ok ? '' : ' [got ' + JSON.stringify(r) + ']'));
    }

    /* 2. Clearing back to her year's default (stored as '') must save. */
    home.seed(cls.name, RICH_XP);
    const clear = await home.equip(cls.name, { themeId: '' });
    say(clear && clear.ok === true && home.stored(cls.name).th === '',
      cls.year + ' pupil clears back to her year default — saved');

    /* 3. Another year's look must be REFUSED. */
    for (const other of YEARS.filter(y => y !== cls.year)) {
      const theirs = looksOf(other).themes.filter(t => t.year === other)[0];
      if (!theirs) continue;
      home.seed(cls.name, RICH_XP);
      const r = await home.equip(cls.name, { themeId: theirs.id });
      say(r && r.ok === false && r.error === 'unknown-theme',
        cls.year + ' pupil is refused ' + other + '\'s "' + theirs.id + '" (unknown-theme)' +
        (r && r.ok === false ? '' : ' [got ' + JSON.stringify(r) + ']'));
    }

    /* 4. Above her clearance must be REFUSED — the rule the whole gate exists
          to protect, and the one a wrong year slice silently changes. */
    const gated = looks.themes.filter(t => Number(t.clearance) > 1)[0];
    if (gated) {
      home.seed(cls.name, 0);
      const r = await home.equip(cls.name, { themeId: gated.id });
      say(r && r.ok === false && r.error === 'kit-locked',
        cls.year + ' pupil at 0 XP is refused level-' + gated.clearance + ' "' + gated.id + '" (kit-locked)' +
        (r && r.ok === false ? '' : ' [got ' + JSON.stringify(r) + ']'));
      /* and the same look at the real threshold must go on */
      home.seed(cls.name, xpForLevel(cls.year, gated.clearance));
      const r2 = await home.equip(cls.name, { themeId: gated.id });
      say(r2 && r2.ok === true,
        cls.year + ' pupil AT the level-' + gated.clearance + ' threshold (' +
        xpForLevel(cls.year, gated.clearance) + ' XP) equips "' + gated.id + '"');
    }
  }
  return out;
}

/* ===================================================================== RUN */
(async function () {
  console.log('qa-kit-parity — the equip is RUN, in both homes, and must work');
  console.log('  registry: ' + REG_FILE);

  const homeA = templateHome(path.join(ROOT, 'ks3-dt/platform/server/Code.gs.template'));
  if (homeA.broken) { console.log('  FAIL  ' + homeA.broken); FAILS.push(homeA.broken); }
  const homeB = devHome(path.join(ROOT, 'ks3-dt/platform/dev-server.js'));
  if (homeB.broken) { console.log('  FAIL  ' + homeB.broken); FAILS.push(homeB.broken); }
  if (FAILS.length) { console.log('\nqa-kit-parity: could not execute one of the homes — that IS the failure.'); process.exit(1); }
  await homeB.prime();

  /* ── CAN EACH HOME SEE A REGISTRY AT ALL? ASKED FIRST, AND BY NAME ─────────
     Added 18 Aug 2026, because the alternative had just happened. When the
     preview home could not load `themes.json` (DFM 236 put a `?v=` on the URL and
     this file's stand-in fetch answered 404), the gate printed fifty-four
     equip failures — every one of them true, none of them the cause, and the real
     answer buried at the end of each line as "no-registry". A run that cannot
     even reach the registry has not tested a single equip, so it says THAT, once,
     before it says anything else. Coverage that does not exist must name itself
     (DFM 200/204). */
  for (const home of [homeA, homeB]) {
    const cls = CLASSES[0];
    home.seed(cls.name, 0);
    const probe = await home.equip(cls.name, { themeId: '__no_such_look__' });
    const noReg = probe && probe.ok === false && probe.error === 'no-registry';
    if (noReg) {
      const m = home.name + ' cannot load the theme registry at all (no-registry), so NOT ONE ' +
        'equip below has been tested. Check how this home fetches content — the URL ' +
        'convention has probably changed underneath it (DFM 236 added ?v=<contentVersion>).';
      console.log('  FAIL  ' + m);
      FAILS.push(m);
    } else {
      console.log('  ok    ' + home.name + ' can reach the theme registry');
    }
  }
  if (FAILS.length) {
    console.log('\nqa-kit-parity: a home cannot read the registry — every result below would be ' +
      'a refusal for the wrong reason, so the run stops here rather than printing them.');
    process.exit(1);
  }

  section('HOME 1 — Code.gs.template, its own functions, executed');
  (await runMatrix(homeA, 'Code.gs')).forEach(r => check(r.ok, r.m));

  section('HOME 2 — dev-server.js, the whole FakeServer, executed');
  (await runMatrix(homeB, 'preview')).forEach(r => check(r.ok, r.m));

  section('AND THE TWO HOMES AGREE (the second question, never the first)');
  for (const cls of CLASSES) {
    const t = looksOf(cls.year).themes.slice(-1)[0];
    if (!t) continue;
    homeA.seed(cls.name, RICH_XP); homeB.seed(cls.name, RICH_XP);
    const a = await homeA.equip(cls.name, { themeId: t.id });
    const b = await homeB.equip(cls.name, { themeId: t.id });
    check(!!a.ok === !!b.ok && String(a.error || '') === String(b.error || ''),
      cls.year + ' "' + t.id + '": both homes answer the same (' + JSON.stringify(a.ok ? 'ok' : a.error) + ')');
    const xa = await homeA.equip(cls.name, { themeId: 'no-such-look' });
    const xb = await homeB.equip(cls.name, { themeId: 'no-such-look' });
    check(xa.error === 'unknown-theme' && xb.error === 'unknown-theme',
      cls.year + ': both homes refuse a look that does not exist at all');
  }

  /* ------------------------------------------------------------- CONTROLS */
  if (process.argv.includes('--controls')) {
    section('CONTROLS — the build he sat must FAIL this gate (DFM 196)');
    if (!PREFIX_TREE || !fs.existsSync(PREFIX_TREE)) {
      const m = 'KS3DT_PREFIX_TREE must point at a worktree of the sat build for the controls to run';
      console.log('  FAIL  ' + m); FAILS.push(m);
    } else {
      const oldA = templateHome(path.join(PREFIX_TREE, 'ks3-dt/platform/server/Code.gs.template'));
      const oldB = devHome(path.join(PREFIX_TREE, 'ks3-dt/platform/dev-server.js'));
      await oldB.prime();
      for (const [home, label] of [[oldA, 'pre-fix Code.gs'], [oldB, 'pre-fix preview']]) {
        const res = await runMatrix(home, label);
        const bad = res.filter(r => !r.ok);
        ctrl(bad.length > 0, label + ' FAILS the matrix (' + bad.length + ' rows), as it must');
        const j2j3 = bad.filter(r => /j2 pupil equips|j3 pupil equips/.test(r.m));
        ctrl(j2j3.length > 0,
          label + ': the failing rows are the J2/J3 equips he could not save — e.g. ' +
          (j2j3[0] ? j2j3[0].m.slice(0, 120) : ''));
      }
      /* the sharpest control of all: the two BROKEN homes agreed with each
         other perfectly, which is why an agreement-only check proved nothing */
      const t = looksOf('j2').themes.filter(x => x.year === 'j2')[0];
      oldA.seed('Demo-9A', RICH_XP); oldB.seed('Demo-9A', RICH_XP);
      const a = await oldA.equip('Demo-9A', { themeId: t.id });
      const b = await oldB.equip('Demo-9A', { themeId: t.id });
      ctrl(a.error === 'unknown-theme' && b.error === 'unknown-theme',
        'and BOTH pre-fix homes gave the SAME wrong answer — proof that "the two homes agree" ' +
        'could never have caught this, and why this gate asserts behaviour first');
    }
  }

  console.log('');
  if (FAILS.length) {
    console.log('qa-kit-parity: ' + FAILS.length + ' FAILURE(S)');
    FAILS.forEach(f => console.log('   ' + f));
    process.exit(1);
  }
  console.log('qa-kit-parity: ALL GREEN — every year\'s own looks save on that year\'s class, no year');
  console.log('can wear another\'s, clearance still gates, and both homes behave identically.');
})();
