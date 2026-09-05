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
 *   4. The last two deployment rows are a MATCHED PAIR - one DATA at
 *      USER_DEPLOYING, one FRONT DOOR at USER_ACCESSING - on the same commit.
 *   5. appsscript.json lists the FULL scope set. Auto-detect is disabled the
 *      moment oauthScopes exists, so a short list is a silent breakage.
 */
'use strict';
const A = require('./lib/app.js');
const { Gate } = require('./lib/report.js');

const TIER = 'full';
const ORDER = 81;
const COVERS = { books: '*', kinds: [], surfaces: [], widths: [], projector: false, tier: ['built'], cells: ['deploy'] };
const CONTROLS = [
  { id: 'front-door-cut-as-me', kind: 'fixture', plant: 'DEPLOY_LOG.bad.md', mustFail: /every pupil would run as/ },
  { id: 'missing-proof-row', kind: 'fixture', plant: 'DEPLOY_LOG.bad.md', mustFail: /no proof row/ },
  { id: 'over-tightening', kind: 'shipped', mustPass: true }
];

const POST = process.env.MS_POST_DEPLOY === '1';
const g = new Gate('qa-manifest');
g.exempt([
  'before a deploy this gate checks the CHECKLIST and the SCOPES; the matched pair and its proof rows are required only post-deploy (MS_POST_DEPLOY=1)'
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
  const pair = rows.slice(-2);
  g.check(pair.length === 2, 'server/DEPLOY_LOG.md', 'manifest',
    'the log does not carry two deployment rows for this release — a version cut with no record is a version nobody can check');
  if (pair.length === 2) {
    const data = pair.filter(r => /DATA/i.test(r[2]))[0];
    const front = pair.filter(r => /FRONT/i.test(r[2]))[0];
    g.check(!!data && !!front, 'server/DEPLOY_LOG.md', 'manifest',
      'the last two rows are not one DATA and one FRONT DOOR');
    if (data) g.check(/USER_DEPLOYING/.test(data.join(' ')), 'DEPLOY_LOG', 'manifest',
      'the DATA deployment was cut with executeAs ' + data[4] + ' — it must be USER_DEPLOYING or it cannot reach the Sheet');
    if (front) g.check(/USER_ACCESSING/.test(front.join(' ')), 'DEPLOY_LOG', 'manifest',
      'the FRONT DOOR was cut with executeAs ' + front[4] + ' — every pupil would run as Damien, which is the 24 June fault exactly');
    if (data && front) g.check(data[5] === front[5], 'DEPLOY_LOG', 'manifest',
      'the two deployments were cut from different commits (' + data[5] + ' and ' + front[5] + ') — both artefacts come from ONE build');
    g.check(proofs.length >= 2, 'server/DEPLOY_LOG.md', 'manifest',
      'there is no proof row quoting the Executions log for each cut — the dialog is not evidence and neither is a row somebody typed');
    /* the md5s in the log are the md5s of the pair the repo holds */
    if (A.exists(A.out('built-pair.json'))) {
      const built = JSON.parse(A.read(A.out('built-pair.json')));
      [data, front].filter(Boolean).forEach(r => {
        g.check(r.join(' ').indexOf(built.index) >= 0, 'DEPLOY_LOG', 'manifest',
          'a deployment row does not carry the md5 of the Index.html the repo holds — the pair he pasted may not be the pair the repo has');
      });
    }
  }
}
g.done();
