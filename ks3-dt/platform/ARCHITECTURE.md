# OLS KS3 DT Platform — Architecture (Session A build)

> Implements "Architecture C" from `Digital Skills Roadmap/0. KS3 Digital Technology Overhaul/05. Platform Architecture & Build Plan.md`,
> red-team-hardened. One Apps Script web app, **execute-as-USER**, access **Anyone within c2ken.net**.
> Lesson content is static JSON on github.io; adding a lesson = a git push, no redeploy.
> Proven foundations: probe app 7/7 pass (17 Jul 2026), Isotope Lab + Mon Carnet reference patterns.

## 1. The pieces

```
ks3-dt/
  platform/                  # the app (authored once, assembled for Apps Script by server/build-pathb.js)
    index.html               # dev/preview entry (localhost / github.io)
    style.css                # house style: navy #1A3A6B / gold #E4B824 / tint #F4F6FA
    app.js                   # boot, state, transport, save-resilience, hub, lesson player
    engines.js               # activity engine registry (see §6)
    staff.js                 # teacher admin panel
    qrcode.min.js            # vendored (from isotope-snap)
    server/
      Code.gs.template       # the server (ASCII-only source of truth)
      appsscript.json
      build-pathb.js         # assembler -> PathB_Code.gs + PathB_Index.html (ASCII-guarded)
  content/                   # PUBLIC static content (no plaintext answer keys — see §4)
    index.json               # global manifest: contentVersion + years
    j1/manifest.json         # 17 lesson entries (id, title, block, icon, status,
                             #   coverSuitability, coverNote, absenceInferenceEligible, videos)
    j1/lessons/j1-01.json …  # full lesson spec: chunks + engine configs + keysEnc
    j1/recap-pool.json       # cumulative Do-Now pool (items + keysEnc)
```

Plaintext content SOURCE (with answer keys) lives OUTSIDE the public repo:
`Claude Work/KS3 DT Platform/content-src/` (iCloud-synced between Damien's Macs).
`node tools/pack-content.js` reads content-src, encrypts the keys, and emits the public
`ks3-dt/content/` files + a git-ignored `ks3-dt/content/dev-keys.json` for local preview marking.

## 2. Identity & storage (per doc 05, unchanged)

- Identity: `Session.getActiveUser().getEmail()`; display name auto-read via OIDC userinfo
  (`userinfo.profile` scope) — pupils return full first name, staff an initial. Guard screen while
  `whoami` resolves; type-once fallback if blank.
- **ScriptProperties** (shared, lean): `classes` registry `[{name, owner, year, created}]`;
  `lock:<class>` = `{lessonId: unlockTs}` (first unlock ts IS the delivered date);
  `cfg:<class>` = leaderboard mode (default OFF/private), absenceDays (default 5), coverMode;
  `team:<class>` = groups + reveal flag (Isotope pattern);
  `p:<class>:<email>` = lean pupil record (§3) — each pupil writes only her own key, no lock needed;
  registry/lock/cfg mutations take `LockService`.
- **UserProperties** (private per pupil): recap history (successive-relearning streaks),
  in-progress activity drafts, profile extras. Never needs purging; DPO caveat stands (doc 05 §6).
- **Pupil Drive**: artefacts via `ensureFolderPath_(['OLS Digital Skills','KS3 DT','J1'])`,
  best-effort share-to-teacher with one retry (Mon Carnet pattern). Drive calls NEVER inside a lock.
- September rollover: out of scope this session (design in doc 05; build before Sept).

## 3. The lean pupil record `p:<class>:<email>`

JSON, target < 500 B: `{ n: name, cn: codename, j: joinedTs, xp: int, L: { "<lessonId>": Larr } }`
`Larr` positional: `[status(0/1/2), badgesBits, actScore, exitChosen("2" per item), exitRight,
selfEval("2101" = 3 confidence chips + difficulty), tsLast, activeMin, absentOverride, catchupDone,
extra]` — `extra` is per-lesson (L1: baseline answer string). Everything primitive; server coerces
with `String()`/`Number()` before returning (RPC dies on stray objects).

## 4. Server-side marking — the no-readable-keys rule (red team #1)

Public JSON never contains a plaintext answer key. Each content file carries `keysEnc`:
`base64( XOR(keysJson, keystream) )`, keystream blocks = `SHA256(secret + "|" + fileId + "|" + n)`.
The secret lives in Script Property `KS3DT_SECRET` (server) and
`Claude Work/KS3 DT Platform/.ks3dt-secret` (content pipeline). Not military crypto — it only has to
beat DevTools + repo browsing, and it does. Marking flow: client submits answers →
server fetches the SAME public JSON (CacheService, keyed by contentVersion, ~1 UrlFetch per file
per 6 h total), decrypts `keysEnc`, marks, stores, replies. Applies to exit checks, recap items
(immediate per-item feedback comes from the server), and the L1 baseline (neutral ack — marks are
stored for the dashboard but never shown, per doc 07 L1). Misconception labels for the dashboard
live inside the encrypted keys blob and are only returned on passcode-gated staff calls.

## 5. API surface (all via `OLS_TRANSPORT.call` → `google.script.run`)

Pupil: `whoami` · `joinClass` · `getState(class)` (locks+cfg+my record+absence flags+team-if-revealed)
· `recapStart(class, lesson)` (SERVER picks 3–6 items: due keystones first, then 40/40/20 recency mix,
options shuffled server-side) · `recapAnswer(item, choice)` → `{correct, correctIdx, explain}`
· `saveEvent(class, lesson, evt)` (badge/score/draft/activeMin — debounced, outbox-buffered)
· `submitExit(class, lesson, payload)` (client waits 0–5 s jitter first — red team #3)
· `submitBaseline(class, answers)` · `markCatchup(class, lesson)` ·
`setKit(class, themeId?/insigniaId?)` (Agent Kit equip — server re-validates clearance vs XP, §10) ·
`ping(class, lessonNum, ci, cc)` (presence beacon, §12) · `pairJoin(class, lessonId, stageIdx)` ·
`pairSend(class, lessonId, pid, kind, text)` · `pairChannel(class, lessonId, pid, since)` ·
`pairComplete(class, lessonId, pid)` (§12 auto-pairing + monitored chat).

Staff (every call carries the passcode; validated server-side, trim/lowercase): `staffCheck` ·
`classList/Create/Delete` (owner-only delete, two-tap client confirm) · `setLock(class, lesson, on)`
(records deliveredTs on first unlock; relock never deletes the ts) · `dashboard(class)` (lock-free
full read of `p:<class>:` keys, primitives only) · `absence(class)` (computed at read time: delivered
+ eligible + no meaningful work + N school days elapsed; meaningful work = exit attempted OR
activity submitted OR ≥3 active min) · `absenceDismiss` (override bit — never re-flags) ·
`coverPack(class)` + `setCover` (D3: suggests next lesson, auto-defers `coverSuitability:"sensitive"`
with the manifest's alternative, returns a printable cover sheet payload) · `teamSet/Shuffle/Reveal` ·
`setConfig(class, cfg)` (leaderboard modes: off → hidden-team → public-with-options; risky configs are
a deliberate choice, never the default — decision #8) · `lessonKeyInfo(lesson)` (decrypted
misconception labels for the dashboard) · `brief(class, lesson)` (the lesson's teacher run sheet —
authored as content-src `teacherBrief`, packed INSIDE the encrypted keys blob as `_brief` so the
public JSON never carries it; rendered from the lock grid's Brief chip, printable) ·
`pairs(class, lessonId)` / `pairTranscript` / `pairRelease` / `pairForce` / `pairReset`
(§12 Pairing lens: live queue + pairs + laggards, channel reading, teacher overrides).

## 6. Client shell

Screens: **guard** (Getting your details…) → **class join** (per-class link `?class=`, else chooser)
→ **HUB** (year map: 17 tiles, locked/unlocked/done, progress ring, private personal-best, catch-up
chips on absence-flagged tiles) → **LESSON PLAYER** (chunk rail, one chunk at a time: Do-Now →
hook → main activity → exit + self-eval; <90 s evaluation law) → **catch-up flow** ("Absent for this
lesson? Here's what you missed") → **STAFF panel** (tabs: Classes / Lock grid / Live lesson +
misconceptions + stuck flags / Absence / Teams / Options / Cover Mode).

Engines (`engines.js` registry, each mounts a chunk from lesson JSON config):
`video` (github.io mp4, chapter markers, graceful placeholder until filmed) · `recap` (Do-Now runner,
also powers L1's ungraded calibration ping) · `quest` (badge mission board) · `steps` (guided
do-this-check-that ladder) · `tour` (spotlight tour of the real UI) · `vault` (drag-drop filing with
genuine fail state + paired-work prompts + sync/async debrief) · `diagnostic` (neutral-ack baseline
runner) · `codename` (agent codename + oath + belonging video) · `exitcheck` · `selfeval` ·
`parsons` (distractor-free, for L2+ exits). Client laws: save-resilience outbox (localStorage,
retry/backoff, clear on ack — red team #4), lesson JSON cached in localStorage by contentVersion
(red team #9), submit jitter, active-time heartbeat, every RPC has `.catch` + gold busy pulse
(never bland "Loading…"), no native alert/confirm, `<base target="_top">`, OLS_BOOT not location.

## 7. Dev/preview parity

`OLS_TRANSPORT` absent → FakeServer: localStorage-backed implementation of the full API, marking via
git-ignored `content/dev-keys.json` (staff panel passcode `demo`). Damien reviews everything on
localhost/github.io before any deploy round-trip (Mon Carnet parity rule).

## 8. Decisions taken this session (flag-in-PR level)

- Encrypted `keysEnc` in public JSON (vs keys in a second private repo): keeps add-lesson = one git
  push, no PAT expiry risk, satisfies red-team #1 in letter and spirit.
- OLS intro video plays on sign-in once per device per day, skippable — not between lessons (a
  fortnightly *platform* is not a one-off activity; brand moment preserved without friction).
- School-days arithmetic for absence = weekdays only (no term calendar in v1; N configurable).
- L1 pairing is social (partners at one machine, "confer before you drop"); the synchronous-
  collaboration debrief visual is simulated, not real-time networking (doc 07 intent, zero risk).

## 9. Post-review hardening (adversarial review, 17 Jul 2026)

- **XP idempotency**: XP is granted only when an event's `detail` introduces a NEW `k=v` key into
  the lesson record (outbox retries and console replays add nothing), capped 40/event + 150/lesson.
  Exit submissions are first-wins; the baseline is write-once. Same-pupil record writes serialise
  under the script lock (fetch/mark stays outside it).
- **Vault check = salted hashes** (`vhash_`), never the plaintext map; explanations only released
  after the placement result is recorded. Beats zero-effort DevTools dumps while keeping drag instant.
- **Storage quota is monitored, and bounded work remains**: the shared ScriptProperties store has a
  hard 500 KB script-wide cap. Realistic full-year whole-school data exceeds it, so (a) every write
  is guarded (`store-full` surfaces to pupils + teacher instead of silent loss), (b) the staff panel
  shows live usage %, and (c) **REQUIRED BEFORE WHOLE-SCHOOL SCALE (Session B): the nightly archival
  trigger** — runs as the owner, sweeps verbose fields of completed lessons to the Archive Sheet and
  prunes live records lean. Growth is gradual (~3 lessons/class by Oct half-term), so launch is safe
  with monitoring; the trigger must land before the store passes ~60%.
- Absence inference skips lessons whose manifest `status` isn't `ready` (an eager unlock of an
  unauthored lesson can't flood a class with false flags); Cover Mode only offers ready lessons.
- Recap: review-mode re-reads never re-record; the 40/40/20 bands fill round-robin so due keystones
  can't starve the oldest band; short/empty Do-Nows are served rather than repeating same-day items.
- UserProperties keys are year-qualified (`draft:<year>:<num>`, `recap:<year>`) so a pupil's J1
  state can't leak into her J2 year.
- Public leaderboard (teacher opt-in) is rendered pupil-side via `apiBoard`, codenames by default.
- Teachers can remove a wrong-class join from the Live roster (`removePupil`).

## 10. Agent Kit (Session B — pupil customisation, Damien's requirement 21 Jul 2026)

Pupils personalise the SHELL (never lesson reading surfaces) and earn unlocks with the
existing XP economy. Rules:

- **Registry = `content/themes.json`** (packed via content-src, no keys): 6 Clearance
  Levels (0/100/300/600/1000/1500 XP — L1's ~107 XP guarantees the first unlock), 12
  curated themes, 11 insignia. Adding kit = a git push, no redeploy.
- **Curated, never free-form**: each theme is an art-directed variant of Mission Control
  v2 expressed as CSS custom-property overrides (`:root` THEME KNOB block in style.css)
  + starfield params + optional fx layer. All keep AA contrast; none use
  `background-attachment:fixed` or per-card `backdrop-filter` (compositor rule); fx
  layers animate transform/opacity only.
- **Cosmetic only — no XP surface**: `setKit` never grants/touches XP; the server
  re-fetches the registry and enforces `xp >= clearance.xp` (DevTools equip of locked
  kit is refused: `kit-locked`). Equipped ids live on the lean record as `th`/`fx`
  (~24 bytes); store-full guarded.
- **Client**: equip is optimistic (instant restyle) with revert-on-refusal; clearance-up
  celebration fires on the HUB only (never mid-lesson), tracked per device; the staff
  modal pins brand gold (`.staff-modal` var reset) so teacher tools are theme-immune.
- Default theme = Midnight Command (stored as `''`; the approved v2 look is untouched).

## 11. Side Quests (Session B — decision A, 22 Jul 2026)

Optional self-paced skills missions alongside the 17-lesson spine. Manifest entries carry
`side: true` (+ `num` like `"S1"`, block `side`): excluded from the year ring, hero CTA,
absence inference and Cover Mode; rendered under a "Side Quests" header; labelled
"Side Quest" everywhere instead of "Lesson N". Same lock grid, records, XP, recap-pool
and dashboard plumbing as core lessons. First instance: `j1-sq1` "Files That Follow You"
(real Drive folder build verified server-side by `apiDriveCheck` — execute-as-user,
read-only, capped iteration, badge granted via the normal idempotent saveEvent path;
OneDrive half is confirm-only, no API exists). Preview simulates the inspection and
says so on screen.

## 12. Auto-pairing + monitored chat (Session C — spec agreed with Damien 22 Jul 2026)

Any chunk may declare `config.paired: true` (first instance: L1 `b3-vault`). The activity
becomes a genuinely SHARED, turn-based experience between platform-matched pupils on
separate machines, with a monitored "Comms Channel" chat. Catch-up and review runs stay
solo (existing `ctx.catchup`/`ctx.review` behaviour unchanged). Teacher can switch the
whole feature off per class (`cfg.pairing.on`, default ON) — off = the Session-B
one-machine social pairing, verbatim.

**Matching (FIFO, stage-matched, agreed spec):**
- Presence: every active client pings `apiPing` (~60 s, piggybacked on the existing
  heartbeat) → CacheService map `pres:<class>` `{email: [tmin, lessonNum, chunkIdx,
  chunkCount]}`. "Live-present" = pinged within 10 min on this lesson. Lock-free
  (self-healing); queue/pair mutations run under `withLock_`.
- On reaching a paired chunk the client calls `apiPairJoin` (idempotent; doubles as the
  waiting poll, ~2 s). Under the lock the server computes `expected` = live-present
  pupils not yet paired/solo/past-stage. Rules: pair the two longest-waiting whenever
  `expected > 3`; when `expected == 3` HOLD everyone until all three are queued, then
  form the TRIO (the last three always finish together); `expected == 2` pairs the final
  two; `expected == 1` releases that pupil SOLO. A formed pair/trio is sealed — a
  late-joiner never joins a started pair; they queue for the next match.
- Registry: queue + pairs live in cache `pq:<class>:<lessonId>`; formed pairs are ALSO
  mirrored to ScriptProperties `pair:<class>:<lessonId>` (tiny: members + ts) so a cache
  eviction can never orphan a mid-activity pair.
- Staff overrides (Live tab): release a waiter to solo, force-pair the current queue.

**Channel (CacheService transport, agreed spec):**
- `pch:<pairId>` holds `{seq, ev:[...]}` — typed events `msg` / `drop` / `done`, appended
  by `apiPairSend` under the lock (atomic append), read by `apiPairChannel` (~2 s poll,
  `since` cursor). Last ~150 events kept; messages ≤ 240 chars, HTML-escaped at render,
  server rate-limited (~1.2 s/sender). TTLs 6 h.
- Pupils see each other as CODENAME + insignia only; `apiPairComplete` flips the reveal —
  first names are returned only after completion ("Identity declassified" card).
- A pinned banner on the chat dock: monitored channel — the teacher can read every
  message. Transcript: on completion the server flushes a compact transcript
  (≤ ~500 chars head+tail + message counts) to store key `chat:<class>:<lessonId>`;
  live monitoring reads the CACHE (full recent events), the store copy is the durable
  audit record. `archiveSweep_` gains a chat pass: transcripts ≥ 7 days old move to a
  second "Chat Archive" tab of the Archive Sheet (write-verify-then-delete), keeping the
  store lean (§9 quota discipline).
- Partner-stale rule: a member silent > 45 s on the channel is marked stale; driving
  falls to the active member(s), with a calm banner. Rejoining replays events from seq 0
  (placements are derived state — reload-safe with no extra draft machinery).

**Shared vault protocol (turn-based):** driver rotates on every ATTEMPT (drop right or
wrong) among active members, round-robin in trios — both/all hands touch the controls and
the wrong-drop handover forces real discussion. Only the driver can drag; others watch
live (drop events animate in) and advise on the channel. Score (`firstTryRight`) derives
from the shared event stream; each member records her own result through the normal
idempotent saveEvent/awardBadge path (XP economy untouched). The sync/async debrief now
narrates an experience that genuinely happened over the school network.

**Laggard alert (agreed spec):** staff Live tab gains a Pairing lens (visible when a
delivered lesson has a paired chunk): live queue with wait times, formed pairs with
message counts + last line, transcript viewer, laggard chips = live-present pupils far
behind the pairing stage while classmates wait. While open it auto-polls (~5 s) and a
waiter stuck > 90 s triggers the alert row + a WebAudio chime (no asset; mute toggle
persisted per device). Alerts exist to unblock waiters — the chips name exactly who the
class is waiting for.

**Quota/consent:** CacheService + LockService need no OAuth scope — zero consent-screen
change, nothing new for the DPO beyond the monitored-chat retention note (7-day live
store window → yearly Archive Sheet). Store cost is bounded: pair registry ~1 KB +
transcripts ~7 KB per class-lesson, swept weekly.

**Dev parity:** FakeServer mirrors all five APIs + admin subs against the shared
localStorage blob — two same-origin tabs are two REAL paired pupils (per-tab identity
via `?as=<seeded-pupil>`, sessionStorage-sticky, preview only). Waiting alone > 8 s in
preview spawns a simulated partner bot (flagged on screen) that chats scripted lines,
takes its turns via dev-keys, and fumbles one drop so the return path shows — the
single-tab demo stays complete.
