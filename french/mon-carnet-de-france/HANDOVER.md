# Mon Carnet de France — BUILD HANDOVER (read me first)

> **Purpose of this file:** a complete, self-contained handover so a NEW Claude
> session can continue this build seamlessly with zero loss of context. If you
> are a fresh session: **read this entire file before touching anything**, then
> read `content-pack.json` (verified facts) in this folder. The auto-memory file
> `project_labelle_france.md` (in the user's Claude memory) mirrors the key points.
>
> **Branch:** `draft/issue-18-french-mon-carnet-de-france` · **PR:** dgaj-g/ols-digital-skills#17 (draft)
> **Inbox issue:** dgaj-g/ols-digital-skills-inbox#18 · **Status (2026-06-08):** all 4 stations built + signed off by the user; back-end finish remaining.

---

## 0. Who / what / why

- **School:** Our Lady's Grammar School (OLS), Newry — all-girls Catholic grammar, C2k-managed Google Workspace (`@c2ken.net`). the user = head of digital skills. Teacher = **the French teacher** (French), **not technical at all**.
- **Request:** the traditional **J1 (Year 8) "La Belle France"** Term-1 culture project. Source of truth = the teacher's Word doc (`Year 8 project La Belle France.docx`), which has **four fixed sections**: (1) a **map of France** with main cities; (2) **La Cuisine** — French foods you would/wouldn't try + why; (3) **Le 14 Juillet** — how/why Bastille Day is celebrated; (4) **Les Personnes Célèbres** — favourite French person + why (≤100 words). Plus research-skills rules (range of sources, **own words**, clear paragraphs, back opinions with reasons). All content in **English** (culture knowledge, not language drilling). Pupils produce the project digitally (Google Sites preferred / PowerPoint / Word), homework over ~6 weeks, submitted to Google Classroom as the Christmas assessment.
- **The pivot that defines this build:** the user was **underwhelmed** by an early lightweight "explorer that prints a passport" concept. He wanted **genuine Google Workspace integration** and **login + saved progress**. Research established (see `reference_google_sites_no_api` memory) that **New Google Sites has NO build/edit API** — so we cannot auto-build the pupil's Site. The chosen design integrates instead by **generating the pupil's actual project as a Google DOC in their own Drive**, via a login-gated Apps Script web app.
- **The hand-holding mandate (the user, emphatic):** the whole thing must be **utterly hand-held** for both pupils (11-12, "fun not scary") and the non-technical teacher.

---

## 1. The product: "Mon Carnet de France"

A **login-gated Google Apps Script (HtmlService) web app**, deployed **Execute as: USER ACCESSING the web app**, **Who has access: within the C2k domain**. Pupils sign in invisibly with their C2k account; the app:
- identifies them by verified email (`Session.getActiveUser().getEmail()`),
- saves their progress (follows them across devices),
- runs **four interactive stations** (the four project sections),
- and on finishing **generates a formatted Google Doc in the pupil's own Drive** (their project first-draft), **auto-shared with their teacher** and **filed into `OLS Digital Skills / French / J1`** in their Drive.
- The pupil then refines that Doc and builds her Google Site from it; an **in-app screenshot walkthrough** teaches the Sites step (no video — YouTube is blocked on C2k).

Same codebase runs two ways (`window.OLS_TRANSPORT`): on Apps Script it routes through `google.script.run`; on github.io / local preview it falls back to a localStorage offline stub (so the front-end can be QA'd without deploying).

---

## 2. Where the code is (files in this folder)

```
french/mon-carnet-de-france/
├── index.html        front-end shell + all 4 station views (offline-capable)
├── style.css         activity styles (uses ../../style.css brand vars)
├── script.js         all front-end logic: 4 stations + transport + save/restore
├── qrcode.min.js     vendored (for the teacher QR, used by the staff panel later)
├── content-pack.json VERIFIED, fact-checked content for all 4 stations (READ THIS)
├── assets/
│   ├── france-map.svg          Station 1 base map (public domain outline)
│   ├── cuisine/*.jpg           Station 2: 10 dish photos (Commons, optimized)
│   ├── people/*.jpg            Station 4: 6 portraits (Commons, optimized)
│   └── juillet/eiffel-night.jpg Station 3 backdrop (Commons, Gussisaurio CC BY-SA 3.0 — CREDIT shown on scene)
└── server/
    ├── Code.gs.template  THE Apps Script server (edit this, not Code.gs)
    ├── build-pathb.js    assembler: inlines everything -> PathB deploy files (PURE ASCII)
    ├── Code.gs           generated server (paste into Apps Script Code.gs)
    └── Index.html        generated activity page (paste into Apps Script HTML file named "Index")
```

**Build/deploy loop:** edit `index.html`/`style.css`/`script.js`/`server/Code.gs.template` → run `node server/build-pathb.js` → it regenerates `server/Code.gs` + `server/Index.html` (pure ASCII, with guards) → the user pastes those two into the Apps Script project and re-deploys a NEW VERSION.

---

## 3. Architecture (all PROVEN on real C2k accounts — do not re-litigate)

- **Execute as USER ACCESSING** (not "Execute as Me" — that's what the other OLS class boards use). Required so `DocumentApp.create()` lands the Doc in the **pupil's** Drive.
- **Drafts** (per-pupil working text) → `PropertiesService.getUserProperties()` (private, follows pupil across devices).
- **Completion metadata** (for the teacher dashboard) → `PropertiesService.getScriptProperties()` — a SINGLE SHARED store that a pupil-context call can write and a teacher-context call can read. **This is the key insight that avoids needing a shared Sheet.** (The other builds used a Sheet + Execute-as-Me; we deliberately don't.)
- **The Doc** = the pupil's long-term artefact, in their own Drive.
- **Auto-share:** `apiMakeDoc` best-effort `doc.addViewer(teacherEmail)` so the teacher can open it from the dashboard (no "request access"). PROVEN: the Drive-sharing scope grants for pupils on C2k.
- **Drive foldering:** reusable `ensureFolderPath_(['OLS Digital Skills', subject, yearGroup])` files the Doc tidily; `subject`/`yearGroup` are Script Properties. PROVEN on C2k.
- **doGet** injects `OLS_BOOT` (classCode, baseUrl) + `OLS_ASSET_BASE` (absolute github.io URL so JS-built `<img>` paths resolve in the sandboxed iframe). SandboxMode.IFRAME.

### C2k deploy facts proven by probe + live tests (the user ran these)
- Apps Script + within-domain deploy work; `getActiveUser` returns the **pupil's** verified email under Execute-as-user.
- `DocumentApp.create` + `SlidesApp.create` land in the **pupil's own Drive** — no admin "restricted scope" block on the pupil OU.
- `doc.addViewer(teacher)` works (teacher can open the pupil-owned Doc).
- Folder create/move (`DriveApp`) works on a pupil account.
- Pupils see an "unverified app → Advanced → continue (unsafe)" consent click-through. Harmless, but **a C2k admin should mark the app's OAuth client "trusted"** before a 30-pupil rollout to remove it. (Flag this to the user for admin before go-live.)
- **Deploy gotcha:** always re-deploy a **NEW VERSION** (Manage deployments → Edit → Version: New version). A stale pinned version once threw a phantom "no access to library …" error even though HEAD was clean.

---

## 4. The four stations (current state + WHY — do NOT undo these)

All use a shared **Pointer-Events** drag engine (mouse+touch, `body.dragging-active` selection lock, place-all-then-Check where graded, genuine fail states, randomised order, no answer giveaways). Per-station output saved in `state.data['1'|'2'|'3'|'4']`.

1. **La Carte** — drag 9 city labels onto the PD France map (dots placed from real lat/long). Place-all-then-Check; wrong cities bounce back; correct lock + reveal a verified fun-fact. **SIGNED OFF by the user.**
2. **La Cuisine** — drag 10 real dish photos into "J'aimerais essayer / Non merci" baskets, type a "because…" reason for each (opinion task; reason required to finish). Tap a dish for a description. Compact basket thumbnails.
3. **Le 14 Juillet — "Allume le ciel" (fireworks quiz)** — **IMPORTANT REWORK HISTORY:** v1 was card-ordering (the user: "a little boring, mechanics-wise"); v2 was a drag-things-onto-the-scene builder (the user REJECTED: "what is the gameplay? where is the enjoyment?" + emoji-on-photo looked wrong); **v3 (current) = a 6-question how/why quiz over the night Eiffel photo where each CORRECT answer launches a real CSS-animated firework, a WRONG answer fires nothing + locks ("try another answer"), 6 correct → fireworks finale → own-words write-up.** Do NOT revert to ordering or the scene-builder.
4. **Les Personnes Célèbres** — **IMPORTANT REWORK HISTORY:** v1 was a big-portrait grid + side tray of achievement chips (the user hit a real bug: couldn't drag the last chips to bottom slots without off-screen dragging). **v2 (current) = one compact row per person (portrait thumbnail + name + fact card); facts start deranged (none correct); drag a fact card a short distance to swap onto the right person; Check; then pick a favourite + write ≤100 words.** Portraits were then **enlarged to 88×110** on the user's note ("pictures too small"). Roster: **Marie Curie, Claude Monet, Louis Pasteur, Édith Piaf, Joan of Arc, Sophie Germain** — **Coco Chanel was REMOVED** (documented WWII Nazi-intelligence collaboration = ETI/reputational risk); Sophie Germain added (keeps 4 women / 2 men).

The home hub shows a passport progress strip (4 stamps) and a "Créer mon projet" button (locked until all 4 done). Mandatory OLS crest intro (intro-loader.js) + brand footer. Responsive phone→board.

---

## 5. Content sign-offs (the user said "yes to all", 2026-06-07)

Full verified content in `content-pack.json`. Headlines:
- **Cities (9):** Paris, Marseille, Lyon, Toulouse, Nice, Nantes, Strasbourg, Bordeaux, Lille (Montpellier deliberately omitted for spread).
- **Cuisine (10):** croissant, crêpe, quiche lorraine, ratatouille, steak-frites, macaron, camembert, tarte tatin, bouillabaisse, **escargots** (deliberate adventurous "would you try it?" item, confirmed OK for J1).
- **Roster:** as above (Chanel→Germain swap confirmed).
- Fact corrections folded in (tarte tatin = Sologne not Loire Valley; Curie = "Polish-born French", died Passy, "two different sciences"; Lyon ~thousands of restaurants; Eiffel ~6–7M visitors; Bastille law "made official 6 July 1880").
- Image re-check notes: Pasteur photo carries a Getty source credit (legally PD; optional swap); Sophie Germain engraving uploaded to Commons Nov 2025 (confirm it still resolves).

---

## 6. WHAT'S DONE vs WHAT'S LEFT

### DONE
- Deploy model proven end-to-end on real C2k pupil + teacher accounts.
- All 4 stations built, QA'd (mouse+touch, responsive, no console errors), and reworked to the user's satisfaction.
- The shell + the `apiMakeDoc` **STUB** (creates a placeholder Doc, auto-shares, folders).

### LEFT (the back-end finish)
1. **Real Doc generator** — replace the stub `apiMakeDoc` body so it builds the formatted Doc from ALL FOUR sections' saved content:
   - **FIRST FIX THE SAVE PATH:** the server `apiSave`/`apiLoad` currently persist only `name`+`stations` to UserProperties — they DO NOT persist `req.data` (the per-station content). Add `data` to the UserProperties draft, so the Doc generator can read the pupil's actual cities/reasons/write-ups. (Offline localStorage already persists `data`; the server does not yet.)
   - Then generate: a TITLE + 4 HEADING1 sections (Ma Carte / La Cuisine / Le 14 Juillet / Les Personnes Célèbres) filled from `state.data`. Accented headings via `\uXXXX` escapes in Code.gs OR pass heading text from the client (it travels as real Unicode over google.script.run). Frame the Doc as a FIRST DRAFT with a deletable "✏️ polish checklist" box at the top (the in-app "Now make it brilliant" guidance already exists on the front end).
   - For Station 1 the Doc map section = the city list + facts as TEXT + a "paste your map of France here" line (inserting a generated map image is unproven — deferred).
2. **Multi-teacher staff panel** (the user decision): several teachers, each runs their OWN classes. One shared staff passcode; each **class owned by its creating teacher** (verified email); teacher sees **own classes by default with a "see all" toggle** (for HOD viewing a year group / cover). Each pupil Doc auto-shares to the **owning teacher of that pupil's class** (replaces the single global `teacherEmail`, kept as fallback). Reuse the GG/constitution staff-panel patterns (class create/select/delete, copy link, in-page QR, dashboard, CSV).
3. **In-app Google Sites walkthrough** — screen-by-screen, **needs the user's ~12 real screenshots** (capture on a C2k account; the shot-list is in the auto-memory / the earlier plan). Possibly via Claude for Chrome.
4. Then **one bundled Path B redeploy** + re-verify on a pupil account (the build→deploy→verify loop).
5. Then `/publish` (a separate session) for the teacher handoff — see §8.

---

## 7. the user's preferences / working style (the nuance)

- Wants **ambitious, beautiful, genuinely game-like** activities (Mendeleev's Cards is the bar). Weak/quiz-ish builds get rejected — he pushed back twice on Le 14 Juillet until it had real gameplay + payoff.
- **Total hand-holding** for the non-technical teacher and for pupils is paramount.
- Reviews on the **local preview** (`http://localhost:8098/french/mon-carnet-de-france/`) — restart with the `digital-skills` preview server.
- **Clipboard handoffs:** put deploy files on the macOS clipboard with `pbcopy < file` — never dump code in chat.
- **Plain-text URLs** (not markdown links); **never** the AskUserQuestion dialog (it hides the message); short warm professional teacher emails.
- He runs the Apps Script deploy himself (clipboard-guided); the build→deploy→verify rhythm is real and spans exchanges — never imply background work between turns.

---

## 8. The publish email (when the user runs /publish)

**the user explicitly asked (2026-06-07):** the teacher email to the teacher MUST surface the build decisions and their reasons so she understands them and isn't surprised — especially the **Chanel→Germain swap and why**, the **escargots** deliberate choice, the **9-city selection** (Montpellier omitted), and the fact corrections. Weave them naturally into the user's voice. NOTE this is a **login-gated (Path B) build** → use the Path-B handoff variant of /publish (no github.io QR/access-doc; the email gives the `/exec` link, says pupils sign in with their school account, points to the Staff panel for class links/QR, mentions the dashboard). See BUILD_PLAYBOOK Step 12.

---

## 9. How to continue (fresh session checklist)

1. `cd ~/Sites/ols-digital-skills && git fetch origin && git checkout draft/issue-18-french-mon-carnet-de-france && git pull`
2. Read this file + `content-pack.json` + the `project_labelle_france` auto-memory.
3. Start the preview (`digital-skills` server) and open the activity to see current state.
4. Pick up at §6 LEFT — most likely the Doc generator (start by adding `data` persistence to the server `apiSave`/`apiLoad`).
5. Keep committing to THIS branch (never open a second PR). Re-run `node server/build-pathb.js` after any front-end/server change. Keep CSS/HTML/JS comments ASCII (the assembler inlines CSS raw and guards against non-ASCII).

---

## 10. Source materials (where they are)

- **The verified, fact-checked content** for all four stations — including the exact **Wikimedia Commons File: URLs, licences and attributions** for every image, and the source citations behind every fact — is in **`content-pack.json`** in this folder (committed to git = backed up here).
- **The original teacher brief** (the Word doc the build is based on) lives in the user's local **Claude Work** folder (under the "French" department folder), which syncs across the user's two Macs (so it is backed up). It is deliberately **not** committed to this PUBLIC repo. The exact path is recorded in the private auto-memory (`project_labelle_france`).
- The four sections, the research-skills rules and the sign-offs derived from that brief are summarised in §0 and §5 above, so the build can continue from this file alone even without re-opening the original.

---

## 11. PENDING TWEAKS — do these BEFORE the back-end (user, 2026-06-08)

The user reviewed the stations and asked for these changes. They are NOT optional polish — build them first, then proceed to the Doc generator (§6).

### 11a. La Carte (Station 1) — make it richer (it currently feels a little stale)
1. **Tighten the layout** — there is too much empty space between the map and the city-tag tray (`.carte-stage`). Close the gap / rebalance the columns so it feels intentional.
2. **Rich city info cards with imagery.** When a city is placed **correctly** (on Check), instead of the current plain one-line facts list, show a **beautiful pop-up card** for that city containing: a **real photo of the city**, the city name, and **rich fun facts** (2-3 sentences, expand from the verified one-liners — keep accurate, sources in content-pack.json).
3. **Carousel.** The pop-up holds **all** correctly-placed cities and the pupil can **cycle/swipe through them fluidly** (prev/next buttons + Pointer-Events swipe). It **accumulates** as more cities are got right.
4. **Order = order they got them right** (first-correct first). If a pupil misses one and gets it right later, it appends after the earlier-correct ones.
5. **NEW ASSET TASK:** source **9 real Wikimedia Commons city photos** (one per city: Paris, Marseille, Lyon, Toulouse, Nice, Nantes, Strasbourg, Bordeaux, Lille), optimize like the cuisine/people images (sharp, ~440px, into `assets/carte/<city>.jpg`), record File:/licence/attribution. Use the Commons API search + verify each exists (as done for the Eiffel backdrop).

### 11b. La Carte needs a TYPED write-up too (consistency + Doc + "own words")
La Carte is currently the ONLY station with no pupil-authored text. Add a short own-words write-up after the map is complete — recommended prompt: **"Which French city would you most like to visit, and why?"** — saved into `state.data['1'].writeup` so it flows into the Doc's map section. (The other three stations already capture own-words text: cuisine reasons, Bastille how/why, person ≤100-word.)

### 11c. The Doc collation spec (build this into the real `apiMakeDoc`)
The generated Google Doc assembles all four sections from `state.data`, each as a HEADING1 + the pupil's OWN words, framed as a first draft (deletable "polish checklist" box at top):
- **1. Ma Carte de France** — the labelled main-cities list + the pupil's "city I'd most like to visit & why" sentence + a line "[Paste your map of France here]".
- **2. La Cuisine** — each dish as "[I would try / I would not try] [dish] — because [the pupil's reason]".
- **3. Le 14 Juillet** — the pupil's own-words how/why write-up.
- **4. Les Personnes Célèbres** — the favourite person's name + the pupil's ≤100-word write-up.
Reminder: FIRST make the server `apiSave`/`apiLoad` persist `req.data` (they currently only persist name+stations) so this content survives server-side.
