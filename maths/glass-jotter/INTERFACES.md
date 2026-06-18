# Glass Jotter — module interfaces (build contract)

Plain ES5-compatible vanilla JS, no modules/build step. Each file attaches ONE global.
Load order in index.html:
`qrcode.min.js → mathcore.js → anglecore.js → content-angles.js → content-algebra.js → player.js → jotter.js → staff.js → script.js`
(script.js is the shell and boots last. All files must parse standalone — no top-level await,
no template-literal `</script>` hazards, ASCII-safe where possible; UI strings may use Unicode.)

## Rational numbers
Everywhere a number can be non-integer use `{n: int, d: int}` (normalised, d>0, gcd 1).
Helpers live in mathcore (`GJ_MATH.rat(n,d)`, `.radd .rsub .rmul .rdiv .req .rneg .rfromstr .rtostr`).

## window.GJ_MATH (mathcore.js — pure, no DOM)
- `parse(str)` → `{ok:true, ast}` | `{ok:false, err}`. Accepts: ints, decimals, fractions `a/b`,
  `x`, `x²` (also `x^2`, `x2` rejected), implicit mult `5(x−3)`, `2x`, unary minus, ASCII `-*/+`
  AND unicode `− × ÷`, brackets, `=` (0 or 1 per line). Whitespace-tolerant.
- `canonSide(ast)` → `{c2:{n,d}, c1:{n,d}, c0:{n,d}}` (quadratic-or-lower poly in x) | `null`.
- `lineKind(parsed)` → `'eq'` (has =) | `'expr'`.
- `eqStep(prevStr, nextStr)` → verdict for a solving step:
  `{ok:'sound'|'notequiv'|'identity'|'parse', dxText?:string}` — sound iff both are linear-or-
  factorable equations with EXACTLY equal solution sets (exact rational; identity/contradiction
  guarded; degree-change guarded e.g. multiplying both sides by x).
- `exprStep(prevStr, nextStr)` → same idea for expression manipulation (canonical poly equality).
- `inferOp(prevStr, nextStr)` → `{op:'+'|'-'|'*'|'/', operand:{n,d}}` | `{op:'rewrite'}` | `null`
  (inference from canonical deltas; used as teacher-facing cross-check, never pupil-facing).
- `evalCalc(str)` → `{ok, val:{n,d}}` — numeric calc strings like `180-38-74`, `(2*4)+7`, no x.
- `substEval(exprStr, vars)` → `{ok, val}` where `vars = {a:{n,d}, …}`.
- `checkQuestion(q, attempt)` → THE marker. `attempt = {L:[{op,t}], fin}` (see jotter state).
  Returns `{perLine:[{ok:0|1|2, dx:string|null, note?:string}], res:'OK'|'X@n'|'AMBER', mk:[method,acc],
  mkMax:[m,a]}` where ok: 1 sound · 0 first error · 2 follow-through-sound-after-error.
  Implements: any-valid-route, FT after first error (consistency vs pupil's own wrong line),
  answer-without-working → AMBER + method withheld, dx matched from `q.dx` map (canonicalised
  comparison, not string match) else auto-cluster key = canonical form of the wrong line.
- `selfTest()` → `{pass:bool, failures:[string]}` — ≥60 cases incl. every dx, ÷5-first routes,
  fraction answers, negative coefficients, identity traps, degree traps, parse traps.

## window.GJ_ANGLES (anglecore.js — pure, no DOM)
- Reason ids (canonical, shared with content + UI):
  `STR` straight line 180 · `PNT` point 360 · `VOP` vertically opposite · `TRI` triangle 180 ·
  `QUAD` quadrilateral 360 · `ALT` alternate · `COR` corresponding · `INT` interior/U-shape 180 ·
  `ISO` isosceles base angles · `PGRAM` opposite angles of parallelogram · `EQT` equilateral ·
  `GIVEN`.
- `checkSteps(q, steps)` — `steps = [{ang, val:{n,d}|number, calc?:str, rsn}]`.
  Valid iff: value arithmetically correct for that angle AND rsn is an authored edge rule linking
  `ang` to angles all of which are given or previously established by the pupil (prerequisite/DAG
  check; report `preqMissing:[angleIds]` when the value is right but the route isn't shown) AND the
  edge's arithmetic matches (e.g. STR partners sum 180). Returns
  `{perStep:[{val:0|1|2, rsn:0|1, preq:bool, dx}], res, mk:[m,a], mkMax}` (FT honoured: correct rule
  applied to pupil's earlier wrong value ⇒ val:2 hollow).
- `selfTest()` → ≥40 cases: multi-route, circular-reasoning catch, ALT↔COR swap dx, COINT_EQUAL dx,
  TRI_SUM_360 dx, calc-string entries, FT chains.

## Content packs — `window.GJ_CONTENT.angles` / `.algebra` (content-*.js)
```
{ id, title, cover:{accent:'teal'|'plum', motif:'protractor'|'radical'},
  reasonBank: [{id:'STR', group:'Lines & points', text:'Angles on a straight line add up to 180°'}…]   // angles only; exact CCEA phrasings; groups: 'Lines & points'|'Triangles & quadrilaterals'|'Parallel lines'|'Special shapes'
  sections: [{ id:'s1', title, walt,                       // walt = the teacher's WALT wording
     movie: MOVIE, questions:[Q…] }] }
```
### MOVIE (consumed by player.js)
```
{ title, mode:'paper'|'diagram', diagram?:DIAGRAM,
  steps:[{ say:string,                                  // caption, ≤140 chars, pupil-voice teacherly
           do:[OP…] }] }
OP (paper mode): {write:{text:'5x − 15 = 35', margin:'(expand)'}} · {sub:{from:'5(x − 3)', to:'5x − 15', glow:true}}
  · {tick:{line:n}} · {box:{line:n}} · {note:{text, red:true}} · {grid:{a:'3',b:['x','6'],vals:['3x','18']}}
  · {balance:{l:'5x−15', r:'35', tip:0}} · {balance:{op:'+15', tip:[-6,0]}} · {clear:{}}
OP (diagram mode): {seg:{id}} · {arc:{ang}} · {value:{ang, to:number}} · {label:{ang|seg, text}}
  · {stamp:{reason:'ALT'}} · {pulse:{ang}} · {zshape:{angs:[..]}} (draws the Z/F/U overlay)
Player animates ops sequentially within a step; steps advance on ▶ or auto after delay; ◀ steps back.
```
### DIAGRAM (shared renderer in player.js, reused by jotter.js)
```
{ w:100, h:70,                                          // abstract units, viewBox scaled
  pts:{A:[x,y],…},
  segs:[{id, from:'A', to:'B', par?:1|2, dash?:true}],  // par draws arrowheads (1 or 2)
  angles:{ AEF:{at:'E', from:'A', to:'F', reflex?:true,
           value:number, given?:true, label?:'x'} … } } // never render value unless given or established
```
### Q — angles
```
{ id, marks:[m,a], prompt, diagram:DIAGRAM,
  graph:[{find:'EFD', rule:'ALT', from:['AEF']}, …],     // EVERY valid derivation edge, multi-route
  target:'x', dx:{…optional value-pattern → code} }
```
### Q — algebra
```
{ id, marks:[m,a], type:'solve'|'expand'|'simplify'|'subst'|'form',
  prompt, start?:'5(x − 3) = 35',                        // line 0, pre-written, pencil grey
  given?:{a:{n,d},…},                                    // subst questions
  answer:{x:{n,d}} | {canon:{c2,c1,c0}} | {val:{n,d}},
  form?: {accept:[canonical equation strings]},          // 'form' questions: the form-the-equation line is marked
  dx:{'5x-3=35':'EXPAND_PARTIAL', …} }                   // keys parsed+canonicalised at load
```
dx codes (full library, use these exact ids): EXPAND_PARTIAL, EXPAND_SIGN, SUB_INSTEAD_DIV,
DIV_BEFORE_SUB, SIGN_FLIP_MOVE, COLLECT_X_NUM, NEG_MUL_SIGN, BOTHSIDES_ONE_SIDE, SWAP_NOFLIP,
ALT_CORR_SWAP, COINT_EQUAL, TRI_SUM_360, STRAIGHT_360, VOP_SUPP.

## Jotter attempt state (owned by jotter.js; saved via script.js)
```
state = {v:1, act, start:epochSec,
  qs:{ q4:{ att:[ {L:[{op:'exp'|'+15'|'/5'|'rw'|'col', t:'5x−15=35', s:sec, e:editCount}…],
                   steps?:[{ang,val,calc,rsn,s}…],       // angles questions use steps not L
                   res:'OK'|'X@1'|'AMBER', dur}… ],      // res written at Check
            fin?, mk:[m,a], lock:bool, ovr:null|{...} } } }
summary = {v:1, act, name, marks:[got,max], done:n, total:n, upd:epochSec,
  qs:{ q4:{st:'ok'|'amber'|'err'|'open'|'un', errAt?:n, dx?:code, mk:[m,a], t:sec} }}
```
script.js exposes to jotter/staff: `GJ.app.save(state)` (debounced ≤1/10 s, builds summary),
`GJ.app.content(actId)`, `GJ.app.boot` = `{classCode, baseUrl, email, name, acts}`.

## window.GJ_PLAYER (player.js)
- `mount(el, movie)` → controller `{play, pause, step(+1|-1), goto(n), destroy, onend(cb)}`.
- `renderDiagram(el, diagram, opts)` → handle `{showValue(ang), pulse(ang), arcEl(ang), …}` —
  exported because jotter.js reuses it for angle questions and staff.js for drill-down re-render.

## window.GJ_JOTTER (jotter.js)
- `mount(el, q, savedAttempts, hooks)` → controller; hooks = `{onSave(qid, attemptsState), onDone}`.
  Owns chips/keypad/reason-picker/check sequence/attempt locking. Marks via GJ_MATH/GJ_ANGLES.

## window.GJ_STAFF (staff.js)
- `open()` — the whole teacher experience; uses `GJ.app.call('admin', {...})` transport
  (sequence tokens, in-flight guards, clipboard fallback chain, two-tap delete, per playbook).

## Transport (script.js)
`GJ.app.call(action, payload)` → Promise. Actions: whoami, hello, load, save, setname, admin.
Online: `window.OLS_TRANSPORT` (injected by assembler). Offline: localStorage stub with FULL
parity + demo mode (staff passcode `demo`, seeded class `10B Maths` with ~12 fake pupils whose
states contain authentic misconceptions across both activities).

## Server (server/Code.gs.template) — see DESIGN.md §3 for tabs/API; GG-lineage hygiene mandatory:
setNumberFormat('@') everywhere, LockService on writes, primitive coercion on every return,
passcode trim/lowercase server-side, classes registry in Config, per-class acts map honoured in
`hello` (a pupil NEVER receives a disabled activity's content gate as openable).

### Per-teacher scoping (markbook only — pupils are unaffected)
The shared `staffPasscode` lets any staff member in; their **verified active email**
(`Session.getActiveUser`, same identity the pupil API trusts within c2ken.net) then scopes the
markbook. Each class record carries an `owner` (lower-cased email), stamped at `addClass` =
caller. A teacher sees and manages ONLY classes they own; the **deploy owner** (`Session.getEffectiveUser`
= whoever deployed the web app, the HOD) sees and manages ALL — a no-maintenance rule that
survives staff handover (re-deploying transfers it). A legacy class with no `owner` is deploy-owner-only.
`guardClass_` enforces ownership on EVERY admin sub that names a class (deleteClass/setActs/wall/
jotter/override) — **list filtering alone is not enough**; a passcode-holder could otherwise reach
another teacher's class by name. Class names stay GLOBALLY unique (the `?class=` routing key), so
`addClass` collision is checked across all owners. `admin` `classes` returns `{me, isAdmin, classes:[{name,acts,count}]}`.
Proof: `node dev/test-server-scoping.js` (mocks Apps Script globals, runs apiAdmin as A/B/deployer).
