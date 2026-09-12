#!/usr/bin/env node
/* qa-manifest.js — THE DIALOG LIES. THE MANIFEST IS READ. THE LOG IS THE MEMORY.
 *
 * G-G2. THE INCIDENT, and it is why this gate exists: on 24 June a version was
 * cut from a source manifest that said `USER_ACCESSING` while the deployment
 * dialog displayed "Me", and every pupil in the school ran the app as the
 * deployer. Nothing in the interface told the truth; only the manifest did.
 *
 * v4 makes that flip a DESIGNED part of every release - the DATA deployment is
 * execute-as-Me and the FRONT DOOR is execute-as-User, from the same project -
 * so the hazard doubles and the discipline has to be written down and checked:
 *
 *   1. server/DEPLOY.md is an ORDERED checklist, DATA first, and it says in so
 *      many words that the dialog is not evidence.
 *   2. server/DEPLOY_LOG.md carries, per version cut, the executeAs value AS
 *      READ FROM THE MANIFEST in the editor, plus the commit and the md5s.
 *   3. Each cut is followed by a PROOF row quoting the Executions log.
 *   4. The last FRONT DOOR row and the last DATA row AGREE ON Code.gs: the
 *      front door's commit carries a Code.gs whose md5 is the md5 the DATA row
 *      was cut with. A matched pair when Code.gs changed; a front-door-only row
 *      otherwise (POLISH CUT 2, 12 Sept 2026 - a client-only cut re-cuts the
 *      front door ONLY, so no deploy needs Damien's hands: the desktop app
 *      refuses every session an edit of the manifest's executeAs/access
 *      lines, which is what made the 11 Sept front-door cut wait nine hours
 *      for him; the DATA deployment only needs a new version when Code.gs
 *      changes, and the manifest now RESTS at the front door's values).
 *      DATA stays USER_DEPLOYING, the FRONT DOOR stays USER_ACCESSING.
 *   5. appsscript.json lists the FULL scope set. Auto-detect is disabled the
 *      moment oauthScopes exists, so a short list is a silent breakage.
 */
'use strict';
const A = require('./lib/app.js');
const { Gate } = require('./lib/report.js');
const { execFileSync } = require('child_process');
const crypto = require('crypto');

const TIER = 'full';
const ORDER = 81;
const COVERS = { books: '*', kinds: [], surfaces: [], widths: [], projector: false, tier: ['built'], cells: ['deploy'] };
const CONTROLS = [
  { id: 'front-door-cut-as-me', kind: 'fixture', plant: 'DEPLOY_LOG.bad.md', mustFail: /every pupil would run as/ },
  { id: 'missing-proof-row', kind: 'fixture', plant: 'DEPLOY_LOG.bad.md', mustFail: /no proof row/ },
  /* a front-door-only row whose Code.gs is not the one DATA was cut with: the
     page would call a server that does not know its new acts, and nothing in
     the log would say so (12 Sept 2026) */
  { id: 'front-door-without-its-data', kind: 'fixture', plant: 'DEPLOY_LOG.stale-data.md', mustFail: /the DATA deployment is stale/ },
  { id: 'over-tightening', kind: 'shipped', mustPass: true }
];

const POST = process.env.MS_POST_DEPLOY === '1';
const g = new Gate('qa-manifest');
g.exempt([
  'before a deploy this gate checks the CHECKLIST and the SCOPES; the DATA/FRONT DOOR agreement and its proof rows are required only post-deploy (MS_POST_DEPLOY=1)',
  'a front-door-only row (Code.gs unchanged) is a legal release: the DATA row it pairs with may be older, on another commit'
]);

/* ---- the scopes ------------------------------------------------------- */
{
  const p = A.app('server/appsscript.json');
  if (!A.exists(p)) {
    g.fail('server/appsscript.json', 'manifest',
      'there is no manifest in the repo — the one thing that tells the truth about how a deployment runs is not under version control');
  } else {
    let m = {};
    try { m = JSON.parse(A.read(p)); } catch (e) { g.fail('server/appsscript.json', 'manifest', 'the manifest is not valid JSON'); }
    const need = ['https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/userinfo.profile',
      'https://www.googleapis.com/auth/script.external_request',
      'https://www.googleapis.com/auth/spreadsheets.currentonly'];
    const have = m.oauthScopes || [];
    g.check(have.length > 0, 'server/appsscript.json', 'manifest',
      'the manifest declares no oauthScopes — auto-detect would run, and the front door needs userinfo.profile, which auto-detect never asks for');
    need.forEach(s => g.check(have.includes(s), 'server/appsscript.json', 'manifest',
      'the manifest does not list ' + s.split('/').pop() + ' — adding an oauthScopes list DISABLES auto-detect, so every scope has to be there or the deployment silently lacks it'));
    g.note('manifest scopes: ' + have.map(s => s.split('/').pop()).join(', '));
  }
}

/* ---- the checklist ---------------------------------------------------- */
{
  const p = A.app('server/DEPLOY.md');
  const md = A.exists(p) ? A.read(p) : '';
  g.check(/DATA/.test(md) && /FRONT DOOR/.test(md), 'server/DEPLOY.md', 'manifest',
    'the deploy checklist does not name the two deployments — the whole hazard of v4 is that there are two and they run differently');
  g.check(/client-only/i.test(md) && /front door only|FRONT DOOR only|front-door-only/i.test(md), 'server/DEPLOY.md', 'manifest',
    'the checklist does not say that a client-only cut (Code.gs unchanged) re-cuts the FRONT DOOR only — without that sentence every release waits on a manifest flip nobody can make for him');
  g.check(/rests at|RESTS at/i.test(md) && /USER_ACCESSING/.test(md) && /DOMAIN/.test(md), 'server/DEPLOY.md', 'manifest',
    'the checklist does not say where the manifest RESTS between cuts (the front door\'s USER_ACCESSING + DOMAIN) — a cut that starts from an unknown manifest is the 24 June fault waiting');
  g.check(/USER_DEPLOYING/.test(md) && /USER_ACCESSING/.test(md), 'server/DEPLOY.md', 'manifest',
    'the checklist does not name the two executeAs values that have to be READ before each cut');
  g.check(/dialog/i.test(md) && /(lies|not evidence|do not trust|never trust)/i.test(md), 'server/DEPLOY.md', 'manifest',
    'the checklist does not say that the deployment dialog is not evidence — that sentence is the whole lesson of 24 June');
  g.check(md.indexOf('DATA') < md.indexOf('FRONT DOOR'), 'server/DEPLOY.md', 'manifest',
    'the checklist does not put DATA first — the front door cannot be cut until the data endpoint it relays to exists');
}

/* ---- the log ---------------------------------------------------------- */
{
  const p = A.app('server/DEPLOY_LOG.md');
  const md = A.exists(p) ? A.read(p) : '';
  const rows = md.split('\n').filter(l => /^\|\s*20\d\d-\d\d-\d\d/.test(l))
    .map(l => l.split('|').map(s => s.trim()));
  const proofs = md.split('\n').filter(l => /Executions log/i.test(l));
  if (!POST) {
    g.note(rows.length + ' deployment rows on record; ' + proofs.length + ' proof rows (the matched pair is required post-deploy)');
    g.done();
    process.exit(process.exitCode || 0);
  }
  /* the last row of each kind - NOT the last two rows: a client-only cut adds
     one FRONT DOOR row and leaves the DATA row where it was */
  const data = rows.filter(r => /DATA/i.test(r[2])).slice(-1)[0];
  const front = rows.filter(r => /FRONT/i.test(r[2])).slice(-1)[0];
  g.check(!!data && !!front, 'server/DEPLOY_LOG.md', 'manifest',
    'the log does not carry one DATA and one FRONT DOOR deployment row — a version cut with no record is a version nobody can check');
  if (data) g.check(/USER_DEPLOYING/.test(data.join(' ')), 'DEPLOY_LOG', 'manifest',
    'the DATA deployment was cut with executeAs ' + data[4] + ' — it must be USER_DEPLOYING or it cannot reach the Sheet');
  if (front) g.check(/USER_ACCESSING/.test(front.join(' ')), 'DEPLOY_LOG', 'manifest',
    'the FRONT DOOR was cut with executeAs ' + front[4] + ' — every pupil would run as Damien, which is the 24 June fault exactly');
  if (data && front) {
    /* THE FRONT DOOR'S COMMIT CARRIES THE CODE.GS DATA WAS CUT WITH. The row
       says what was pasted (column 7); git says what the commit holds; the
       two are asked separately so a row cannot be typed into agreement. */
    const dataCode = (data[7] || '').replace(/`/g, '').trim();
    const frontCode = (front[7] || '').replace(/`/g, '').trim();
    const same = !!dataCode && dataCode === frontCode;
    let gitCode = null;
    try {
      const rel = A.APP.split('/').slice(-2).join('/') + '/server/Code.gs';
      const repo = execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd: A.APP, encoding: 'utf8' }).trim();
      const text = execFileSync('git', ['show', front[5] + ':' + rel], { cwd: repo, encoding: 'utf8', maxBuffer: 32e6 });
      gitCode = crypto.createHash('md5').update(text).digest('hex');
    } catch (e) { gitCode = null; }
    g.note('last DATA row ' + data[3] + ' (' + data[5] + ', Code.gs ' + dataCode.slice(0, 8) + ') · last FRONT DOOR row ' + front[3] + ' (' + front[5] + ', Code.gs ' + frontCode.slice(0, 8) + (gitCode ? ', git says ' + gitCode.slice(0, 8) : ', commit not in this clone') + ')');
    g.check(same && (gitCode === null || gitCode === dataCode), 'DEPLOY_LOG', 'manifest',
      'the DATA deployment is stale: the FRONT DOOR (' + front[3] + ' from ' + front[5] + ') carries a Code.gs (' + (gitCode || frontCode).slice(0, 8) + ') that is not the one DATA ' + data[3] + ' was cut with (' + dataCode.slice(0, 8) + ') — Code.gs changed, so DATA needs a new version too (DEPLOY.md §1), then this row');
    if (data[5] !== front[5]) g.note('a front-door-only release: FRONT DOOR from ' + front[5] + ', DATA still from ' + data[5] + ' — legal because Code.gs is the same');
  }
  g.check(proofs.length >= 2, 'server/DEPLOY_LOG.md', 'manifest',
    'there is no proof row quoting the Executions log for each cut — the dialog is not evidence and neither is a row somebody typed');
  /* the md5s in the log are the md5s of the pair the repo holds: the FRONT
     DOOR row carries the Index.html, the DATA row the Code.gs */
  if (A.exists(A.out('built-pair.json'))) {
    const built = JSON.parse(A.read(A.out('built-pair.json')));
    if (front) g.check(front.join(' ').indexOf(built.index) >= 0, 'DEPLOY_LOG', 'manifest',
      'the FRONT DOOR row does not carry the md5 of the Index.html the repo holds — the page he pasted may not be the page the repo has');
    if (data) g.check(data.join(' ').indexOf(built.code) >= 0, 'DEPLOY_LOG', 'manifest',
      'the DATA row does not carry the md5 of the Code.gs the repo holds — the server he pasted may not be the server the repo has');
  }
}
g.done();
