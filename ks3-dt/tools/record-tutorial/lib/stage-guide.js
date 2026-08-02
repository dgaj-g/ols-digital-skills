/* The practice class the Guide video is filmed on (DFM 116: "built on a dummy
   class so it shows what teachers really see").
 *
 * Nothing here is a mock of the UI - it is REAL FakeServer state, written into
 * the same localStorage blob the preview's server reads, so every panel in the
 * film is the actual panel rendering actual data. Timestamps are computed IN
 * THE PAGE at load time, because the pairing panel measures waits in live
 * seconds and a hard-coded stamp would film as "waiting 4000s".
 *
 * Names are invented (Damien approved the list); the class name is 8A-DT
 * because that is what the panel's own Add class makes of "8A DT" - spaces
 * become hyphens, and the film must show what really happens.
 */

const CLASS = '8A-DT';
const STAFF = 'teacher@demo';
const LESSON_ID = 'j1-01';

/* name, email-stem, xp, baseline right/16, L1 [status, exit answers, self-eval,
   comment]. Spread deliberately: two still to start, one mid-lesson, one
   flagged as stuck, one carrying a private comment. */
const PUPILS = [
  ['Aoife Byrne',      'aoife.byrne',      60, 12, 2, '0121000000010000', '222|1', ''],
  ['Cara McParland',   'cara.mcparland',   55, 11, 2, '0120000000010000', '222|0', ''],
  ['Niamh O’Hare', 'niamh.ohare',     45, 10, 2, '0121000000010000', '212|1', ''],
  ['Róisín Campbell', 'roisin.campbell', 50, 13, 2, '0121000000010000', '222|1', ''],
  ['Ellie Hughes',     'ellie.hughes',     40, 9,  2, '0021000000010000', '211|1', ''],
  ['Sophie Magee',     'sophie.magee',     10, 5,  1, '',                 '',      ''],
  ['Grace Toner',      'grace.toner',      35, 8,  2, '0121000000000000', '221|1', ''],
  ['Lucy Sands',       'lucy.sands',       30, 7,  2, '0100000000010000', '111|2', 'I didn’t get the Vault bit'],
  ['Erin Quinn',       'erin.quinn',       25, 14, 1, '',                 '',      ''],
  ['Mia Larkin',       'mia.larkin',       20, 6,  1, '',                 '',      ''],
  ['Katie Fegan',      'katie.fegan',      15, 9,  1, '',                 '',      ''],
  ['Hannah Rice',      'hannah.rice',      0,  0,  0, '',                 '',      '']
];

/* Runs INSIDE the page, before the app boots. `opts` chooses the staging each
   chapter needs; everything else is identical, so the class looks like one
   continuous class across the whole film. */
function stageInPage(opts) {
  var CLASS = '8A-DT', STAFF = 'teacher@demo', LESSON = 'j1-01';
  var PUPILS = opts.pupils;
  var EPOCH = 1767225600000;
  var tmin = Math.floor((Date.now() - EPOCH) / 60000);
  var tsec = Math.floor(Date.now() / 1000);
  var weekAgo = tmin - 7 * 1440;

  var s = {
    passcode: 'demo',
    classes: [{ name: CLASS, owner: STAFF, year: 'j1', created: new Date(Date.now() - 7 * 864e5).toISOString() }],
    /* Lesson 1 delivered a week ago and open (the class is mid-Vault in it);
       Lesson 2 untouched, so chapter 2 can unlock it, lock it and film the
       "Not taught" pill appearing on a real state change. */
    locks: {},
    hods: opts.hod ? [STAFF] : [],
    archiveSheetUrl: opts.hod ? 'https://docs.google.com/spreadsheets/d/1KS3DTYearlyArchiveDemo/edit' : '',
    cfg: {}, team: {}, pupils: {}, userProps: {}
  };
  s.locks[CLASS] = { '1': { u: weekAgo, on: 1 } };

  /* Options under test (the point-7 verification drive). Seeded HERE rather
     than patched in afterwards, because this whole function re-runs on every
     navigation - anything written between loads is wiped by the next one. */
  if (opts.cfg) {
    s.cfg[CLASS] = {
      lb: Object.assign({ mode: 'off', basis: 'xp', names: 'codename', topN: 0 }, opts.cfg.lb || {}),
      absDays: opts.cfg.absDays != null ? opts.cfg.absDays : 5,
      cover: { on: 0, lesson: '', ts: 0 },
      pairing: { on: opts.cfg.pairingOn != null ? opts.cfg.pairingOn : 1 },
      tn: { mode: (opts.cfg.tn && opts.cfg.tn.mode) || 'team' }
    };
  }

  PUPILS.forEach(function (p) {
    var name = p[0], email = p[1] + '@demo', xp = p[2], bl = p[3];
    var status = p[4], exit = p[5], se = p[6], comment = p[7];
    var rec = { n: name, cn: '', j: weekAgo, xp: xp, g: '', L: {} };
    if (status > 0) {
      /* [status, xp, baseline, exit answers, self-eval, last seen, minutes,
          flags, comment, recap right, recap total] - the live shape. */
      rec.L['1'] = [status, xp, bl ? ('bl=' + bl + '/16|0121000000010000') : '', exit, se,
        tmin - 4, status === 2 ? 46 : 22, 0, comment,
        status === 2 ? 8 : 2, status === 2 ? 9 : 9];
      /* Sophie is the "needs you" flag: started, well under half the recap
         right - isStuck() decides that itself, this just gives it the data. */
      if (name.indexOf('Sophie') === 0) { rec.L['1'][9] = 1; rec.L['1'][10] = 9; }
    }
    s.pupils[CLASS + ':' + email] = rec;
  });

  if (opts.pairing) {
    var pid = 'pair-amber-copper';
    var aoife = 'aoife.byrne@demo', cara = 'cara.mcparland@demo';
    s.pairing = {};
    s.pairing[CLASS + '|' + LESSON] = {
      P: {},
      solo: ['erin.quinn@demo']
    };
    s.pairing[CLASS + '|' + LESSON].P[pid] = {
      m: [aoife, cara], cn: ['Amber Falcon', 'Copper Heron'],
      n: ['Aoife Byrne', 'Cara McParland'],
      trio: 0, done: 0, rv: 0, dis: 0, t: tsec - 240
    };
    /* A real transcript: this is what Channel opens, and it is the evidence
       for "you can read every message". Deliberately ordinary pupil talk. */
    s.pch = {};
    s.pch[pid] = {
      seq: 6, ls: {}, bot: null,
      ev: [
        [1, 0, 'msg', 'ok i think the photo goes in Pictures', tsec - 220],
        [2, 1, 'msg', 'agree. what about the maths one', tsec - 200],
        [3, 0, 'msg', 'homework folder?', tsec - 180],
        [4, 1, 'msg', 'yes because we made it in class', tsec - 150],
        [5, 0, 'msg', 'go on then, your turn', tsec - 120],
        [6, 1, 'msg', 'done! that one bounced back, trying again', tsec - 60]
      ]
    };
    /* One pupil still queuing, so Solo run and the waiting chip are on screen.
       `t` is when she started waiting (films as a plausible ~40 seconds and
       grows honestly from there). `p` is the freshness ping, and the panel
       drops a queue entry 45 REAL seconds after it - longer than a caption but
       shorter than a chapter, so a live-stamped ping would vanish mid-take.
       Held ahead of the clock instead: the pupil stays queued for the shoot. */
    s.pq = {};
    s.pq[CLASS + '|' + LESSON] = {
      q: [{ e: 'niamh.ohare@demo', cn: 'Kestrel', t: tsec - 41, p: tsec + 3600 }],
      stage: 4
    };
    /* Live presence: who the panel counts as "on this lesson right now". */
    s.pres = {};
    s.pres[CLASS] = {};
    [['aoife.byrne@demo', 4], ['cara.mcparland@demo', 4], ['niamh.ohare@demo', 4],
     ['erin.quinn@demo', 4], ['roisin.campbell@demo', 4], ['ellie.hughes@demo', 3],
     ['grace.toner@demo', 4], ['lucy.sands@demo', 3], ['sophie.magee@demo', 2]]
      .forEach(function (row) { s.pres[CLASS][row[0]] = [tmin, '1', row[1], 9]; });
  }

  if (opts.absence) {
    /* Two pupils with nothing logged against a delivered lesson: exactly what
       the Absence tab is for. Lesson 2 is delivered here (and re-locked) so
       there is an eligible lesson to flag - j1-01 is not absence-eligible. */
    /* on:1 matters - a LOCKED lesson is never flagged (a pupil cannot catch up
       on something she cannot open), so the flag only exists while it is still
       unlocked and delivered longer ago than the absence window. */
    s.locks[CLASS]['2'] = { u: tmin - 9 * 1440, on: 1 };
    s.pupils[CLASS + ':hannah.rice@demo'].L = {};
    s.pupils[CLASS + ':mia.larkin@demo'].L['1'] = s.pupils[CLASS + ':mia.larkin@demo'].L['1'] || [1, 20, '', '', '', tmin - 4, 10, 0, '', 2, 9];
  }

  /* Lesson 3 delivered, so its Reaction Rally shows a "Tournament view" row on
     the Live tab - the only way to check the projector reveal for real. */
  if (opts.tournament) s.locks[CLASS]['3'] = { u: tmin - 60, on: 1 };

  if (opts.teams) {
    /* group membership lives on the pupil record (`g`), the groups themselves
       on the class - the shape getTeam_/dashboard actually read. Three pupils
       are left unassigned on purpose, so the chip pool is not empty and the
       "tap a name to move" step has something to move. */
    s.team = {};
    s.team[CLASS] = {
      groups: [{ id: 'g1', name: 'Falcons' }, { id: 'g2', name: 'Herons' }, { id: 'g3', name: 'Kestrels' }],
      reveal: !!opts.reveal
    };
    /* The preview signs the browser in as its own persona (?as=anya), and that
       pupil JOINS the class on boot. For a pupil-side check she has to be a
       real member with a team and some XP, or the home page has nothing to
       show - so give her a record before she ever arrives. */
    if (opts.personaEmail) {
      s.pupils[CLASS + ':' + opts.personaEmail] = {
        n: opts.personaName || 'Anya Murphy', cn: 'Silver Fox', j: weekAgo,
        xp: 38, g: 'g1',
        L: { '1': [2, 38, 'bl=9/16|0121000000010000', '1', '221|1', tmin - 6, 40, 0, '', 7, 9] }
      };
    }
    var teamOf = {
      'aoife.byrne@demo': 'g1', 'cara.mcparland@demo': 'g1', 'niamh.ohare@demo': 'g1',
      'roisin.campbell@demo': 'g2', 'ellie.hughes@demo': 'g2', 'sophie.magee@demo': 'g2',
      'grace.toner@demo': 'g3', 'lucy.sands@demo': 'g3', 'erin.quinn@demo': 'g3'
    };
    Object.keys(teamOf).forEach(function (email) {
      var rec = s.pupils[CLASS + ':' + email];
      if (rec) rec.g = teamOf[email];
    });
  }

  localStorage.setItem('ks3dt-dev', JSON.stringify(s));
}

module.exports = { CLASS, STAFF, LESSON_ID, PUPILS, stageInPage };
