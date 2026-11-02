/* Turn Down the Heat — run-the-world model (pure; runs in the browser and in node).
   A simple, honest teaching model: warming follows the total carbon dioxide given off
   (about 0.45 °C per 1000 billion tonnes, IPCC AR6), plus a methane term. Each card cuts a
   share of one or more sectors' carry-on emissions, ramping up over its ramp years from the
   start of the round it is played in. Later = less saved, because the gas already given off stays. */
(function (root) {
  var START = 2025, END = 2100;
  var ROUND_START = [2025, 2030, 2040];
  var T0 = 1.35;            // long-term warming in 2025 vs 1850–1900 (single years reached ~1.5)
  var TCRE = 0.00045;       // °C per billion tonnes of CO2
  var SHARE = { power: 0.40, transport: 0.22, buildings: 0.12, industry: 0.20, land: 0.06 };
  var CH4_UP = 0.004, CH4_DOWN = 0.003; // °C per year: carry-on methane adds 0.30 °C by 2100

  // feel: 1 people like this, -1 some people grumble, -2 people are angry
  var DECK = {
    solar:      { g: 'B', cut: { power: 0.60 }, feel: 1, clean: true },
    roof:       { g: 'B', cut: { power: 0.20 }, feel: 1, clean: true },
    tidal:      { g: 'B', cut: { power: 0.10 }, feel: 1, clean: true },
    fossilban:  { g: 'B', cut: { power: 0.85 }, feel: -1, needsClean: { cut: { power: 0.30 }, feel: -2 } },
    evs:        { g: 'B', cut: { transport: 0.70 }, feel: 1, needsClean: { cut: { transport: 0.25 }, feel: 1 } },
    airtax:     { g: 'B', cut: { transport: 0.10 }, feel: -1 },
    homes:      { g: 'B', cut: { buildings: 0.60 }, feel: 1 },
    gasban:     { g: 'B', cut: { buildings: 0.40 }, feel: -1 },
    lights:     { g: 'B', cut: { power: 0.005 }, feel: 1 },
    fivehours:  { g: 'B', cut: { power: 0.50, industry: 0.30 }, feel: -2 },
    capture:    { g: 'A', cut: { industry: 0.50 }, ramp: 20, feel: 1 },
    forests:    { g: 'A', remove: 4, ramp: 20, feel: 1 },
    rainforest: { g: 'A', cut: { land: 0.80 }, feel: 1 },
    meatprice:  { g: 'C', methane: 0.30, feel: -1 },
    labmeat:    { g: 'C', methane: 0.25, feel: 1 },
    spray:      { g: 'D', cool: 0.4, ramp: 5, feel: -1, risk: true },
    whiteroofs: { g: 'D', cool: 0.02, feel: 1 },
    floodhomes: { g: 'E', protect: 1, feel: 1 },
    drycrops:   { g: 'E', protect: 1, feel: 1 }
  };

  function rng(seed) { var s = (seed >>> 0) || 1; return function () { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 100000) / 100000; }; }
  function baseline(y) { return 40 + 15 * (y - START) / (END - START); }
  function ramp(y, start, years) { return Math.max(0, Math.min(1, (y - start) / years)); }

  /* picks: [[ids round 1], [ids round 2], [ids round 3]] (up to 3 each).
     opts.ignoreTiming (control only) treats every card as played in round 1. */
  function runWorld(picks, seed, opts) {
    opts = opts || {};
    var active = [], support = 10, events = [], cleanSoFar = false, protect = 0, risk = false;
    for (var r = 0; r < 3; r++) {
      var round = (picks[r] || []).slice(0, 3);
      var cleanThisRound = round.some(function (id) { return DECK[id] && DECK[id].clean; });
      var played = round.filter(function (id) { return DECK[id]; }).map(function (id) {
        var c = DECK[id], eff = c;
        if (c.needsClean && !(cleanSoFar || cleanThisRound)) eff = Object.assign({}, c, c.needsClean);
        return { id: id, c: c, cut: eff.cut, feel: eff.feel, start: opts.ignoreTiming ? ROUND_START[0] : ROUND_START[r], round: r };
      });
      var before = support;
      played.forEach(function (p) { support = p.feel > 0 ? Math.min(10, support + 1) : support + (p.feel === -1 ? -3 : -6); });
      var cancelled = null;
      if (support <= 0 && played.length) {
        var worst = played.slice().sort(function (a, b) { return a.feel - b.feel; })[0];
        cancelled = worst.id;
        played = played.filter(function (p) { return p !== worst; });
        support = 3;
      }
      played.forEach(function (p) { if (p.c.protect) protect += p.c.protect; if (p.c.risk) risk = true; });
      if (cleanThisRound && played.some(function (p) { return p.c.clean; })) cleanSoFar = true;
      events.push({ round: r, supportBefore: before, supportAfter: support, cancelled: cancelled,
        feelings: played.map(function (p) { return [p.id, p.feel]; }) });
      active = active.concat(played);
    }
    var R = rng(seed || 7), years = [], cum = 0, ch4 = 0, emis = [];
    for (var y = START + 1; y <= END; y++) {
      var e = 0;
      Object.keys(SHARE).forEach(function (s) {
        var f = 1;
        active.forEach(function (p) { if (p.cut && p.cut[s]) f *= 1 - p.cut[s] * ramp(y, p.start, p.c.ramp || 10); });
        e += SHARE[s] * f;
      });
      e *= baseline(y);
      active.forEach(function (p) { if (p.c.remove) e -= p.c.remove * ramp(y, p.start, p.c.ramp || 10); });
      cum += e;
      var mf = 1;
      active.forEach(function (p) { if (p.c.methane) mf *= 1 - p.c.methane * ramp(y, p.start, p.c.ramp || 10); });
      ch4 += CH4_UP * mf - CH4_DOWN * (1 - mf);
      var cool = 0;
      active.forEach(function (p) { if (p.c.cool) cool += p.c.cool * ramp(y, p.start, p.c.ramp || 10); });
      var t = T0 + TCRE * cum + ch4 - cool;
      years.push({ y: y, t: t, shown: t + (R() - 0.5) * 0.12, gt: e });
      emis.push(e);
    }
    var t2100 = years[years.length - 1].t;
    return { years: years, t2100: Math.round(t2100 * 10) / 10, exact: t2100, support: support, events: events,
      protect: protect >= 2 ? 2 : protect, risk: risk, cumulative: cum, played: active.map(function (p) { return [p.id, p.round]; }) };
  }

  function carryOn() { return runWorld([[], [], []], 7); }
  function verdict(t, bands) { for (var i = 0; i < bands.length; i++) if (t <= bands[i].max) return bands[i]; return bands[bands.length - 1]; }

  var api = { runWorld: runWorld, carryOn: carryOn, verdict: verdict, DECK: DECK, ROUND_START: ROUND_START, START: START, END: END };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.TDTH_MODEL = api;
})(this);
