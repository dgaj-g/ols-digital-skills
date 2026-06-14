# HANDOVER — Isotope Snap / Isotope Lab (inbox issue #19)

**Status legend:** ✅ done · 🔄 in progress · ⏭️ next · ⛔ blocked

> **If you are resuming after a usage-limit reset, do these first:**
> 1. `cd ~/Sites/ols-digital-skills && git checkout draft/issue-19-chemistry-isotope-snap`
> 2. Read this whole file (it is the single source of truth for the build state).
> 3. Find the first ⏭️ in the **Build progress** list and continue from there.
> 4. The macOS may show a one-time permission popup when a new session first touches files — approve it.

---

## What this is

CCEA GCSE Chemistry, **S1 (Year 11)**, Atomic Structure: Isotopes (spec 1.1.10–1.1.12). Teacher: **Teresa Quigg**. Issue: `dgaj-g/ols-digital-skills-inbox#19`. Her preferred types: Interactive diagram + Drag-and-drop. Her uploaded design is a handwritten game called **"Isotope Snap"** plus a mass-spectrometry **Ar calculation** exercise (Data Set 2).

**Damien's extra instructions (high-priority, decomposed):**
1. Incorporate **Data Set 2** (the abundance dataset). ✅ read.
2. **Incredibly ambitious; real 3D interactive models** (Three.js atoms/isotopes).
3. **"Comes alive" — beat any high-end app** (top production values, motion, sound).
4. **Pupil + teacher logins** (Path B / Apps Script HtmlService, C2k Google identity).
5. **Teacher admin / dashboard.**
6. **Leaderboard** (server-authoritative ranking).
7. **Trackable per-pupil response set** (teacher sees each pupil's progress).
8. **NEW collaborative-groups feature** (never built before):
   - 8a. Teacher assigns pupils in a class into groups to work on a task together.
   - 8b. Option: members **hidden** until the teacher **reveals**.
   - 8c. Option: members **visible** if the teacher allows (teacher-controlled toggle).
9. Elevate into a supercharged, beautiful, visual masterpiece.
10. Use Teresa's **"Young Bunsens"** characters richly (study Mendeleev, go further).
11. Use the playbook toolbox to lift aesthetic + mechanics.

Damien chose **Opus 4.8 (1M)**, **hybrid** burn rate (Opus on core/creative, cheaper subagents for grunt-work).

---

## The activity (what we're building)

A single-page **"Isotope Lab"**, transport-pluggable (works offline AND as Path B login-gated app), with:

- **Intro** (`intro-loader.js`, mandatory) → **sign-in gate** (Path B: real Google identity; offline: type-name demo) → **hub** with the Young Bunsens narrating.
- **Mode A — Build-an-Atom (3D):** real WebGL Three.js Bohr atom. Add/remove protons, neutrons, electrons; element name/symbol/nuclide notation update live. Free-explore + "build this isotope" challenges. THE headline 3D feature.
- **Mode B — Isotope Snap (the teacher's game):** two cards shown (a *Drawing* = Bohr model, a *Coding* = nuclide notation, any combo). Pupil presses **SNAP** when the two are an isotope pair (same Z, different mass). Web-Audio correct/incorrect sounds. Timed/streak scoring → leaderboard.
- **Mode C — Mass Spectrometer (Ar calc):** 3 questions/play, data shown 3 ways (custom SVG bar chart, % abundance chart, table). Pupil **drags numbers + `×`/`+` operators** into the Ar formula `Ar = [(m₁×a₁)+(m₂×a₂)+…] / (a₁+a₂+…)`, presses `=` (denominator resolves to the abundance SUM, shown ≠ 100 sometimes), then **types the element symbol** to identify it. Uses Data Set 2.
- **Leaderboard** (class, server-ranked).
- **My Group** panel (groups feature, pupil side).
- **Staff panel** (passcode): class CRUD + link/QR, per-pupil dashboard, leaderboard, **Groups manager** (create/assign/auto-shuffle/reveal), CSV export.

### Assessment integrity (genuine consequence) — must hold
- Snap: real fail state (pressing Snap on a non-pair is wrong; a pair you skip is a miss). Cards/elements randomised each round. No colour/shape giveaway between Drawing & Coding beyond the actual physics.
- Mass spec: drag-all-then-`=`; pupil can place wrong; element-ID requires knowledge.
- Build-an-atom challenges: must actually require knowing proton/neutron counts.

---

## Source data (verified from Teresa's files — TRANSCRIBE EXACTLY)

**Data Bank 1 (Section 1 / Snap) isotopes** — element (Z): mass numbers
- H (1): 1, 2, 3 · He (2): 3, 4 · Li (3): 6, 7, 8 · B (5): 10, 11 · C (6): 12, 13, 14 · N (7): 14, 15 · O (8): 16, 17, 18
- (Be is absent — only one stable isotope ⁹Be, can't form a pair. FLAG in PR.)

**Data Set 2 (Section 2 / mass spec)** — element | mass | %abundance (sample-size columns A–D exist but the **% column is authoritative for Ar**):
- Li: 6/7%, 7/93% · B: 10/20%, 11/80% · O: 16/99.5%, 18/0.5% · Ne: 20/90%, 21/0.5%, 22/9.5% · Mg: 24/79%, 25/10%, 26/11% · N: 14/99%, 15/1%
- S: 32/94%, 33/1%, 34/4%, 36/1% · Cl: 35/75%, 37/25% · Si: 28/92%, 29/5%, 30/3% · K: 39/93%, 40/0.5%, 41/6.5% · Ca: 40/96%, 42/1%, 44/3%
- Example worked answer from PDF: Ar = (24×79)+(25×10)+(26×11) / (79+10+11) = Mg.

**FLAGS for PR:** (1) "first 8 atoms" lists 7 elements, Be missing. (2) ¹⁷O in Bank 1 but not in Data Set 2 (only ¹⁶O/¹⁸O). (3) Cl sample-D values tiny (deliberate small sample). (4) "3 questions/play" confirmed. (5) char names ("Young Bunsens") come from Mendeleev build, not Teresa's file.

---

## Characters — "The Young Bunsens"

**Beaker** (blue beaker, googly eyes, green test tube) + **Burner** (Bunsen burner, pink test tube + lit match). Assets copied into `assets/characters/` — 15 animated `.webp` (anim_01..15) + 15 static `.png` (static_01..15), all transparent.

Key webps: `anim_03_both_wink` (intro), `anim_06_confetti_celebration` (win), `anim_05_thumbs_down_sad` (wrong), `anim_07_success_check`, `anim_09_lightbulb_idea`, `anim_11_rocket_takeoff`, `anim_12_goggles_shine`, `anim_14_magnifier_scan`, `anim_15_level_up_stars`, `anim_10_typing_laptop`, `anim_08_dance_bounce`, `anim_13_bubbles_pop`.

Mendeleev used them as: narrator panel (cross-fade `.swap-out` img swap), celebrate overlay, wrong-answer toast. **Up the game:** narrator reacts per-mode, in-3D coaching, group cheers.

---

## Architecture decisions (locked)

- **One front-end codebase**, pluggable transport `window.OLS_TRANSPORT.call(params)` → `google.script.run` on Path B; `jsonp()`/offline `localStorage` stub otherwise. Offline stub MUST mock every server call (incl. groups/dashboard/leaderboard) with demo data (passcode `demo`) so Damien reviews everything on localhost before any deploy. (Mon Carnet parity principle.)
- **Path B server** copied/adapted from GG (`Claude Work/.../GG/server/Code.gs.template` + `build-pathb.js`). Data model = Google Sheet (Results + Config tabs). Identity `Session.getActiveUser().getEmail()`. `OLS_BOOT` injection in `doGet`. ASCII assembler (`asciiJs`/`asciiHtml`/`guardAscii`). Gotchas: `setNumberFormat('@')`, `LockService`, primitive coercion, passcode trim/lowercase, `.catch` on every call.
- **Groups data model (NEW):** per-class `groups` registry in Config: `{ groups:[{id,name,members:[email],revealed:bool}], groupsRevealed:bool }`. Server: `apiAdmin` subs `groups/createGroup/assignPupil/autoGroup/setReveal/deleteGroup`; pupil `apiMyGroup` returns group name always, members only if revealed, + group collective progress. Collaborative task = shared group score (each member's contributions sum to a group total + group leaderboard).
- **Libraries:** vendor **Three.js r149 UMD** at `assets/vendor/three.min.js` (global `THREE`, ✅ downloaded). Custom drag-to-rotate camera (no OrbitControls). Sounds = Web Audio API. Charts = custom SVG. NO other third-party libs. Path B: rewrite `three.min.js` + crest + intro paths to absolute github.io URLs (assembler), keep Index.html small.
- **Drag engine:** canonical Pointer-Events engine from `chemistry/mendeleev-footsteps/script.js` (TAP_PX=6, `body.dragging-active` selection lock, `selectstart` guard, `position:fixed` lift, document-level move/up). Used for Mode C number/operator dragging and the staff groups drag-assign.

---

## Build progress

- ✅ Branch `draft/issue-19-chemistry-isotope-snap` created off main.
- ✅ Character assets (30 files) copied to `assets/characters/`.
- ✅ Three.js r149 vendored; qrcode.min.js vendored (from GG).
- ✅ `data.js` — verified isotope + Data Set 2 content.
- ✅ `index.html` — full shell (sign-in, hub, 3 modes, staff panel, overlays).
- ✅ `style.css` — brand glass/gradient aesthetic, responsive.
- ✅ `engine.js` — transport shim + offline demo stub (seeded class, groups, leaderboard), Web-Audio synth, narrator, canonical drag engine, modals/router.
- ✅ `atom3d.js` — 3D Build-an-Atom (Three.js), controls, readout, challenges. QA: C→N on proton add, Li-7 challenge check + XP. ✓
- ✅ `snap.js` — Isotope Snap, Bohr SVG + nuclide cards, sounds, scoring, teaching feedback. QA: pair detection + advance. ✓
- ✅ `massspec.js` — drag Ar formula, SVG charts, denominator reveal, element ID. QA: full Si question correct, Ar 28.1, denom=200 teaching. ✓ (FIXED: tile.slot reserved-prop bug → tile._slot)
- ✅ `staff.js` + leaderboard + My Group. QA: leaderboard populated, dashboard 9 pupils + CSV, groups auto-shuffle + drag-assign + reveal toggle. ✓
- ✅ `app.js` — boot/sign-in/router glue.
- ✅ QA in Claude Preview: console clean; mouse+touch drag verified; desktop/tablet/mobile screenshots good; groups hidden+reveal both verified; zero-knowledge holds (Snap needs Z+mass compare, Mass spec needs formula+ID).
- ✅ Path B `server/Code.gs.template` (Pupils+Config tabs, all 7 APIs + 10 admin subs incl groups, GG gotchas) + `server/build-pathb.js` (ASCII assembler, abs github.io rewrites, OLS_TRANSPORT shim) + `server/DPO_Summary.md` + `server/DEPLOYMENT_RECIPE.md`. Reviewed; mirrors the verified offline stub. Live verify happens WITH Teresa at deploy (build→deploy→verify).
- ⏭️ Draft PR + inbox comment + PushNotification.

## To produce deploy files later (at /publish or deploy time)
`cd chemistry/isotope-snap/server && node build-pathb.js` → emits `PathB_Code.gs` + `PathB_Index.html`. (Three.js loads from the absolute github.io URL, which only resolves AFTER the branch is merged to main — so build + deploy after merge.) Then follow `server/DEPLOYMENT_RECIPE.md`. Record the `/exec` URL in `docs/deployed-apps.md`.

## Server API contract (offline stub + Path B Code.gs must match)
Pupil: `whoami`→{ok,email,name,preview}; `setName`{firstName,surname}→{ok,name}; `state`→{ok,name,xp,progress}; `save`{xp,progress}→{ok,xp}; `leaderboard`→{ok,top:[{rank,name,xp,isMe}],me:{pos,total,xp}}; `myGroup`→{ok,inGroup,groupName,revealed,members|null,memberCount,teamXp,myXp}.
Staff `admin`{passcode,sub,...}: subs `classes`,`addClass`{name},`deleteClass`{name},`data`{className}→participants[], `groups`{className}→{groups,groupsRevealed,pupils}, `createGroup`{className,name}, `assignPupil`{className,email,groupId|null}, `autoGroup`{className,n}, `setReveal`{className,revealed}, `deleteGroup`{className,groupId}.
progress shape: `{atom:{done,best}, snap:{plays,bestStreak,bestScore}, massspec:{done,correct}}`. xp = leaderboard + group-team key.

## Resume checklist / open questions
- Verify Three.js renders inside the Apps Script sandboxed iframe on the live deploy (cross-origin script from github.io — crest already loads this way, should be fine; verify with Teresa's deploy).
- Path B deploy + live identity verification happens WITH Teresa later (build → she deploys → verify together).

## Commits so far
- (pending first commit: scaffold + handover)
