#!/usr/bin/env node
/* qa-kit-facts.js — DFM 201d, from his 13 Aug Lesson 4 sit.
 *
 * HIS FINDING: Case 02's card told a pupil to "eat another fish", and the broken
 * game cannot produce a second fish — the fish-maker script has no loop (that
 * missing loop IS Case 03's bug) and the clone deletes itself when it is eaten.
 * HIS QUESTION: "why was this issue not picked up by you when you did your sit
 * through?"
 * THE HONEST ANSWER, and the gap this file closes: the sit-through walker drives
 * the PLATFORM — cards, buttons, logs — and has never once played the Scratch
 * game. No checker of any kind compared a card's CLAIM about the game against the
 * kit's real blocks, so a promise the file could not keep passed everything.
 *
 * WHAT THIS DOES
 *   1. Derives the real facts from each .sb3's project.json (no trusting notes).
 *   2. Fails if they disagree with sb3/kit-facts.json — the manifest cannot rot
 *      quietly, and a kit edited without updating it stops the run.
 *   3. Holds the pupil text of Case 02 to the fact it depends on (the text
 *      ratchet): no surface may ask for more fish than the kit can put in the
 *      water. This is deliberately narrow — the general "does this claim match
 *      the game?" question is cold-read question 12, which is judged, not
 *      mechanised. A gate that pretends to judge everything is the false
 *      assurance this round exists to remove.
 *
 * USAGE
 *   node qa-kit-facts.js                     check kits + the working-tree content
 *   node qa-kit-facts.js --print             print the derived facts and exit
 *   node qa-kit-facts.js --content <file>    check a specific lesson JSON (the
 *                                            DFM 196 control points this at the
 *                                            build he sat)
 *   node qa-kit-facts.js --expect-fail       exit 0 only if findings are raised
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/* overridable so the control can run against a DOCTORED copy of the kits without
   ever touching the real ones (DFM 196: a control that edits the shipping file is
   not a control, it is a risk) */
const SB3_DIR = process.env.KS3DT_SB3_DIR ||
  path.join(process.env.HOME, 'Desktop/Claude Work/KS3 DT Platform/sb3');
const FACTS = path.join(SB3_DIR, 'kit-facts.json');
const CONTENT_DIR = path.join(process.env.HOME, 'Desktop/Claude Work/KS3 DT Platform/content-src/j1/lessons');

const args = process.argv.slice(2);
const PRINT = args.includes('--print');
const EXPECT_FAIL = args.includes('--expect-fail');
const contentIdx = args.indexOf('--content');
const CONTENT_OVERRIDE = contentIdx >= 0 ? args[contentIdx + 1] : null;

const findings = [];
let manifestRef = null;
const fail = (m) => findings.push(m);
const ok = (m) => console.log('  ✓ ' + m);

/* read one member out of a .sb3 with the system unzip — the same way
   qa-sb3-layout.js and the sb3 tools do (one technique, one place to fix). */
function readProject(p) {
  return JSON.parse(execSync(`unzip -p ${JSON.stringify(p)} project.json`,
    { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }));
}

/* ---------- fact derivation: read the blocks, never the comments ---------- */
function chain(blocks, id) {
  const out = [];
  let cur = id, guard = 0;
  while (cur && guard++ < 500) {
    const b = blocks[cur];
    if (!b) break;
    out.push(b);
    cur = b.next;
  }
  return out;
}
/* every block reachable from a top-level id, INCLUDING the bodies of C-blocks —
   a `create clone` inside a `forever` is still a create clone. */
function deep(blocks, id, acc) {
  acc = acc || [];
  for (const b of chain(blocks, id)) {
    acc.push(b);
    for (const key of ['SUBSTACK', 'SUBSTACK2']) {
      const inp = b.inputs && b.inputs[key];
      if (inp && typeof inp[1] === 'string') deep(blocks, inp[1], acc);
    }
  }
  return acc;
}
function topLevels(target) {
  return Object.entries(target.blocks || {}).filter(([, b]) => b && b.topLevel);
}
function numField(b, key) {
  const inp = b.inputs && b.inputs[key];
  if (inp && Array.isArray(inp[1])) return Number(inp[1][1]);
  return NaN;
}

function deriveKitFacts(file) {
  const proj = readProject(path.join(SB3_DIR, file));
  const t = (name) => proj.targets.find(x => x.name === name);
  const stage = proj.targets.find(x => x.isStage);
  const fish = t('Fish');
  const shark = t('Shark');
  const out = { fish: {}, shark: {}, stage: {} };

  if (fish) {
    const flagTop = topLevels(fish).find(([, b]) => b.opcode === 'event_whenflagclicked');
    const cloneTop = topLevels(fish).find(([, b]) => b.opcode === 'control_start_as_clone');
    if (flagTop) {
      const all = deep(fish.blocks, flagTop[0]);
      const spawnHostIsLoop = chain(fish.blocks, flagTop[0])
        .some(b => /^control_(forever|repeat)/.test(b.opcode) &&
          deep(fish.blocks, (b.inputs.SUBSTACK || [])[1] || null)
            .some(x => x.opcode === 'control_create_clone_of'));
      out.fish.spawnerLoopWrapped = !!spawnHostIsLoop;
      out.fish.clonesCreatedPerFlag = all.filter(b => b.opcode === 'control_create_clone_of').length;
    }
    if (cloneTop) {
      const all = deep(fish.blocks, cloneTop[0]);
      out.fish.cloneDeletesItself = all.some(b => b.opcode === 'control_delete_this_clone');
      const chg = all.find(b => b.opcode === 'data_changevariableby');
      out.fish.biteScoreDelta = chg ? numField(chg, 'VALUE') : null;
    }
  }
  if (shark) {
    const hats = topLevels(shark)
      .filter(([, b]) => b.opcode === 'event_whenkeypressed')
      .map(([, b]) => b.fields.KEY_OPTION[0]);
    out.shark.arrowHats = hats.filter(k => /arrow/.test(k)).sort();
    out.shark.hatlessTopLevelStacks = topLevels(shark)
      .filter(([, b]) => !/^event_/.test(b.opcode)).length;
  }
  /* LESSON 5's starter kits are a different shape of claim: the pupil BUILDS on
     them, so what matters is what is NOT there yet (the if/else she adds, the
     counter she makes). Derived for every kit; only the L5 manifest rows use it. */
  out.kit = { ifElseBlocks: 0, counterVariables: [], arrowKeyHats: 0, backdrops: 0, sounds: 0 };
  const COUNTERS = (manifestRef && manifestRef.unfinishedKitClaim && manifestRef.unfinishedKitClaim.counterNames) ||
    ['score', 'lives', 'stars', 'points', 'count', 'timer'];
  for (const t of proj.targets) {
    for (const b of Object.values(t.blocks || {})) {
      if (b.opcode === 'control_if_else') out.kit.ifElseBlocks++;
      if (b.opcode === 'event_whenkeypressed' && b.topLevel &&
          /arrow/.test((b.fields.KEY_OPTION || [''])[0])) out.kit.arrowKeyHats++;
    }
    for (const v of Object.values(t.variables || {})) {
      const nm = String(v[0]).toLowerCase();
      if (COUNTERS.some(c => nm === c || nm.indexOf(c) !== -1)) out.kit.counterVariables.push(v[0]);
    }
    out.kit.sounds += (t.sounds || []).length;
    if (t.isStage) out.kit.backdrops = (t.costumes || []).length;
  }

  if (stage) {
    const flagTop = topLevels(stage).find(([, b]) => b.opcode === 'event_whenflagclicked');
    if (flagTop) {
      const seq = chain(stage.blocks, flagTop[0]);
      /* index every switch, then ask whether a wait sits between the FIRST and
         the LAST of them. (The first version of this took lastIndexOf on an
         opcode STRING, which finds the first of two identical opcodes — so it
         measured an empty span and reported "no wait" on a script that plainly
         waits. Caught by printing the derived facts before trusting them.) */
      const switchAt = seq.map((b, i) => (/switchbackdrop/.test(b.opcode) ? i : -1)).filter(i => i >= 0);
      out.stage.backdropSwitches = switchAt.length;
      out.stage.waitsBetweenSwitches = switchAt.length >= 2 &&
        seq.slice(switchAt[0], switchAt[switchAt.length - 1] + 1).some(b => b.opcode === 'control_wait');
    }
  }
  return out;
}

/* ---------- content walking ---------- */
function getPath(obj, dotted) {
  return dotted.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);
}
function findCase(lesson, caseId) {
  for (const ch of lesson.chunks || []) {
    const cases = ((ch.config || {}).cases) || [];
    const hit = cases.find(c => c.id === caseId);
    if (hit) return hit;
  }
  return null;
}

/* ---------- run ---------- */
const manifest = JSON.parse(fs.readFileSync(FACTS, 'utf8'));
manifestRef = manifest;

console.log('KIT FACTS — derived from the real blocks (DFM 201d)');
const derivedAll = {};
for (const [file, want] of Object.entries(manifest.kits)) {
  const p = path.join(SB3_DIR, file);
  if (!fs.existsSync(p)) { fail(`kit missing from disk: ${file}`); continue; }
  const got = deriveKitFacts(file);
  derivedAll[file] = got;
  if (PRINT) { console.log('\n' + file + ':\n' + JSON.stringify(got, null, 2)); continue; }
  for (const group of Object.keys(want)) {
    if (group.startsWith('_') || group === 'role') continue;
    for (const [k, wv] of Object.entries(want[group])) {
      const gv = (got[group] || {})[k];
      const same = JSON.stringify(gv) === JSON.stringify(Array.isArray(wv) ? [...wv].sort() : wv);
      if (!same) {
        fail(`${file} · ${group}.${k}: manifest says ${JSON.stringify(wv)}, the file really says ${JSON.stringify(gv)}`);
      }
    }
  }
  if (!findings.length || !findings.some(f => f.startsWith(file))) ok(`${file} — every derived fact matches the manifest`);
}
if (PRINT) process.exit(0);

/* ---------- the text ratchet ---------- */
const R = manifest.textRatchet;
const contentFile = CONTENT_OVERRIDE || path.join(CONTENT_DIR, R.lesson + '.json');
console.log('\nTEXT RATCHET — Case 02 against ' + R.kit);
console.log('  content: ' + contentFile);
const kitFacts = derivedAll[R.kit] || {};
const fishPerFlag = (kitFacts.fish || {}).clonesCreatedPerFlag;
const loopWrapped = (kitFacts.fish || {}).spawnerLoopWrapped;

if (loopWrapped) {
  ok('the kit loops its spawner — the ratchet does not apply to this file');
} else if (!fs.existsSync(contentFile)) {
  fail('content file not found: ' + contentFile);
} else {
  const lesson = JSON.parse(fs.readFileSync(contentFile, 'utf8'));
  const cs = findCase(lesson, R.caseId);
  if (!cs) fail(`case ${R.caseId} not found in ${path.basename(contentFile)}`);
  else {
    const pats = [new RegExp(R.banPattern, 'i')].concat((R.alsoBan || []).map(s => new RegExp(s, 'i')));
    let clean = 0;
    for (const field of R.fields) {
      const val = getPath(cs, field);
      if (typeof val !== 'string') continue;
      const hit = pats.find(rx => rx.test(val));
      if (hit) {
        fail(`${R.lesson} ${R.caseId}.${field} asks for more fish than the kit can show ` +
          `(kit makes ${fishPerFlag} per green flag; ${R.reason})\n        "${val.trim().slice(0, 150)}"` +
          `\n        matched: ${hit}`);
      } else clean++;
    }
    if (clean && !findings.length) ok(`all ${clean} Case 02 surfaces stay inside what the kit can do`);
  }
}

/* ---------- LESSON 5: the "deliberately unfinished kit" claim (DFM 201d, §C q12) ----------
   Lesson 5's kit card promises every pupil that her starter "cannot choose, count or end
   yet". That is a claim about three real files, of exactly the class his Case 02 find
   belongs to — so it is checked here BEFORE he sits Lesson 5, not after. */
const U = manifest.unfinishedKitClaim;
if (U) {
  console.log('\nLESSON 5 — the "deliberately unfinished kit" claim');
  const l5file = CONTENT_OVERRIDE && /j1-05/.test(CONTENT_OVERRIDE)
    ? CONTENT_OVERRIDE : path.join(CONTENT_DIR, U.lesson + '.json');
  if (!fs.existsSync(l5file)) fail('Lesson 5 content not found: ' + l5file);
  else {
    const txt = fs.readFileSync(l5file, 'utf8');
    const claimed = txt.indexOf(U.claimMustAppear) !== -1;
    if (!claimed) {
      /* the claim was reworded or removed — say so rather than silently passing:
         a check that quietly stops applying is the false assurance this round removes */
      fail(`the kit card no longer says "${U.claimMustAppear}" — this check was written for that ` +
        `sentence and must be re-pointed at whatever replaced it (it has NOT been silently skipped)`);
    } else {
      ok(`the kit card still promises "${U.claimMustAppear}" — so the files must be in that state`);
      for (const k of U.kits) {
        const got = derivedAll[k] || deriveKitFacts(k);
        const kf = got.kit || {};
        if (kf.ifElseBlocks !== U.requires.ifElseBlocks) {
          fail(`${k}: the kit card says it cannot CHOOSE yet, but the file already contains ` +
            `${kf.ifElseBlocks} if/else block(s) — ${U.reason}`);
        } else if (U.requires.counterVariablesEmpty && kf.counterVariables.length) {
          fail(`${k}: the kit card says it cannot COUNT yet, but the file already carries ` +
            `the variable(s) ${kf.counterVariables.join(', ')} — ${U.reason}`);
        } else {
          ok(`${k} — no if/else, no counter variable: the promise is true of this file`);
        }
      }
    }
  }
}

/* ---------- verdict ---------- */
console.log('');
if (findings.length) {
  console.log(`FINDINGS: ${findings.length}`);
  findings.forEach((f, i) => console.log(`  ${i + 1}. ${f}`));
  if (EXPECT_FAIL) { console.log('\n(--expect-fail: findings were expected — this is the control passing)'); process.exit(0); }
  process.exit(1);
}
console.log('ALL PASSED — every kit fact matches, and Case 02 promises nothing the file cannot do.');
if (EXPECT_FAIL) { console.log('\n--expect-fail was set but NOTHING was found — the control did not reproduce.'); process.exit(1); }
