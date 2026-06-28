# Build playbook — OLS Digital Skills

The durable, step-by-step process Claude follows when Damien turns a submitted request into a live activity. Three entry points:

- **`/next`** — build the oldest open issue in the queue.
- **`/build <N> [extra instructions]`** — build a specific issue by number. Any text after the number is extra instructions from Damien that must be folded into the build as high-priority requirements alongside the issue's own content.
- **`/publish <N> [extra instructions]`** — run when Damien has reviewed the activity and is happy with it. This one command **merges the PR (going live on GitHub Pages), waits for the deployment, then generates the teacher handoff package** (OLS-branded Word doc with QR code + clickable URL, and a drafted email in Damien's voice). Any text after the issue number is extra instructions, almost always for the teacher's email — fold them in alongside the playbook's tone spec (Damien's extras win on conflict). See **Step 12** below.

**Read this whole file before doing anything.** Do not skim. Each request represents real, careful work by a teacher — the playbook exists to make sure that work is honoured precisely.

---

## The two repos

- `dgaj-g/ols-digital-skills-inbox` (PRIVATE) — Power Automate creates the request issue here and stores file links. Source of truth for "what to build".
- `dgaj-g/ols-digital-skills` (PUBLIC) — activities live here; GitHub Pages serves `main`. Source of truth for "what's live".

## The flow at a glance

```
inbox issue → orient → parse → download → read everything → restate the vision
→ build → test → push + draft PR → notify Damien → stop (Damien reviews on his time)
                                                              ↓
                                /publish <N> → merge PR → wait for Pages → Word doc + email draft
```

---

## Guiding principles (the spirit of this playbook)

1. **The teacher's request is sacred.** Every word in "What should the activity do?" and "Anything else" is a requirement, not a suggestion. If a teacher wrote "cards flip with a soft click", the cards flip with a soft click.
2. **Read everything, fully.** Not skim. A scanned page of handwritten notes gets OCR'd and read line by line. A storyboard sketch gets every arrow and annotation interpreted. A teacher's uploaded PowerPoint gets read slide by slide.
3. **Accuracy is non-negotiable.** These activities may be shown to pupils on a Promethean board in front of an ETI inspector. Every fact must be verifiable against the source material. Never invent content.
4. **When unsure, build your best interpretation — then flag it. Never halt to ask.** Damien wants a finished activity to react to, not mid-build questions. If something is ambiguous, make the most sensible decision, build the activity through to completion, and record every assumption and uncertainty in the PR description. Damien reviews the completed build and requests tweaks afterwards. A complete activity with honest flagged notes always beats a halted build with a question.
5. **Clear the bar — and the bar is the whole gallery, not one app.** The quality reference is the *ceiling of everything built so far*, not a single activity. See **"The reference gallery"** below: drag-drop polish (Mendeleev), a story-map journey (Costa Rica), a buildable collaborative diagram (Constitution), a login-gated project that writes the pupil's real Google Doc (Mon Carnet), a server-scored competition with a leaderboard and full teacher admin (Girls Coding), and a working-capture marking platform with a live markbook (Glass Jotter). Before building, look across the gallery, pick the build whose *shape* is closest, reuse its code — and then aim to **add something to the gallery**, not merely match one corner of it. If you fall short of what's already been achieved for this kind of activity, say so in the PR.
6. **Variation is a requirement — invent, don't reskin.** Every new activity must feel genuinely *different to play* from the ones already built, **especially** others in the same subject. The trap is shipping the same mechanic with new content (yet another drag-the-word-onto-the-picture). Damien wants the pupils' *experience* to vary across the whole set, not just the topic — so before choosing a pattern, name the interaction shape the existing builds share and then deliberately reach for a different one, or invent a new one, that still serves the brief. A clever, distinctive build whose *shape* pupils haven't met before beats a polished reskin every time. This is a standing expectation on **every** request, not only when Damien asks for it. The technique is in **Step 6's "Variation is mandatory"**.

---

## The reference gallery — the bar

The standard to clear is **the ceiling of everything built so far**, not one app. Each
build below pushed a different frontier; together they are "the bar". When a brief
arrives, find the one whose *shape* is closest, **read it and reuse its code**, then aim
to add to this gallery rather than merely match a corner of it. Lowering your sights to a
single example lowers the ambition of the build — don't.

- **Mendeleev's Cards** — `chemistry/mendeleev-cards/`. The reference for **tactile
  drag-and-drop polish and house feel**: the real Pointer-Events drag engine, snap-in /
  bounce-back, procedural audio feedback, a celebration reveal, fluid responsive scaling.
  Also where you learn the OLS look. (See also `chemistry/mendeleev-footsteps/` for the
  page-wide text-selection lock during drags.)
- **Costa Rica Ecotourism** — `geography/costa-rica-ecotourism/`. The reference for a
  **narrative journey that also builds evaluation skill**: an animated country-map intro,
  a quest-style trail-map hub, a *different* mini-mechanic at every station, a persistent
  field-notebook drawer, real licensed Wikimedia photos paired with "what does this
  *prove*?" mark-scheme questions, progress surviving reloads.
- **The US Constitution Diagram** — `government-politics/constitution-diagram/`. The
  reference for a **buildable / editable diagram** pupils construct over time (nodes, side
  drawers, colour-coded notes, a read-only "model answer" toggle, a separate
  genuine-consequence quiz) — and the first **login-gated collaborative class board**.
- **Mon Carnet de France** — `french/mon-carnet-de-france/`. The reference for a
  **Workspace project builder**: a department's existing project turned into guided
  stations that finish by **generating the pupil's real first-draft Google Doc in her own
  Drive**, auto-shared to her teacher and filed into a portfolio — plus a multi-teacher
  staff panel and screenshot guide decks. Reach for it when the brief is "turn our
  existing project into a guided digital experience that produces a real artefact".
- **Girls Coding — Computational Thinking Challenge** — in Claude Work at
  `0. Digital Skills Web Activities/GG/` (`challenge/` + `server/`). The reference for a
  **login-gated, server-scored competition with a full teacher admin**: server-authoritative
  scoring and timer, one attempt per pupil, **named class boards, per-class link + in-page
  QR, a passcode dashboard with per-pupil results, a leaderboard, question-performance
  analytics, CSV export, clear-per-class**. Copy from GG whenever a brief needs class
  management, shareable links/QRs, a leaderboard, or stats.
- **The Glass Jotter** — `maths/glass-jotter/`. The reference for **making pupils'
  thinking visible, bespoke marking, an extensible platform, and a premium non-"AI" visual
  identity**: pupils answer **line by line**, an exact-rational engine **marks like an
  examiner** (any valid route, follow-through, named misconceptions), the platform is
  **manifest-driven across topics** with per-class activity tickboxes, and the teacher gets
  a live **markbook** (Working Wall, per-pupil jotter drill-down with one-tap override,
  Marking Pile, Same-Question Sweep). Animated method movies; the "FAIR COPY" identity
  (committed fonts, grid-locked paper, drawn-not-faded motion). Add a topic via
  `maths/glass-jotter/ADDING_A_TOPIC.md`.

**Use the gallery actively, not as a museum.** "Match Mendeleev" is necessary, never
sufficient — for anything involving identity, saving work, scoring, class management, a
real artefact, or making thinking visible, a richer build above is the true bar. If a
brief could plausibly reach one of these ambitions and your build doesn't, justify why in
the PR.

---

## Work token-lean — Damien hits real usage limits

Quality rules above are untouchable; the savings come from *how* you work, not what you ship. Damien's plan has hard usage caps and a long build session can burn a day's allowance, so every build session follows these rules:

1. **Screenshots are the budget-killer — image-verify only when pixels matter.** Every screenshot/image read costs roughly 50–100× a text check. Verify layout/theming visually ONCE per view at the end, not after every tweak; in between, verify with text tools (console errors, DOM reads, `curl`, `grep`). Capture sessions are the exception — there the screenshot IS the deliverable, but even then verify each shot once, never re-screenshot "to be sure".
2. **Read big files once, surgically.** Open the handover/playbook/source fully ONCE, then work from memory of it — re-read only the specific line ranges you're editing. Never re-open a whole large file to check one function.
3. **Offload bulk reading to subagents — ON A CHEAPER MODEL (standing default).** When a step needs sweeping many files (orienting in a new repo, auditing content, extracting source PDFs/PPTX/docx, inventorying assets, broad QA sweeps), spawn a subagent **with `model: 'sonnet'`** (or `'haiku'` for the most mechanical) and keep only its summary — a long main conversation re-pays its whole context every single turn, so keeping it lean compounds, and the cheaper model burns the allowance far slower. Do this **automatically without being asked**: keep the demanding work (architecture, creative/UX core, tricky debugging, judgement) on the main session model, route the grunt-work down a tier, and say in one line when you do so. Damien calls this "hybrid" mode and it is the default on every multi-step build, not an opt-in.
4. **One plan, one pass.** Agree the design in a short exchange (or follow the issue + this playbook), then build straight through autonomously. Iterating a build through many review rounds costs far more than getting the spec right first — which is why the instructions in this playbook stay verbose and crystal-clear: precision here is what makes the build session cheap.
5. **Batch the browser.** When driving Chrome, combine actions (navigate + click + type) before looking, and look with `read_page`/`find` (text) rather than screenshots wherever possible.
6. **Don't re-derive what's written down.** The HANDOVER/memory/playbook pattern exists so a fresh session ramps in one read. Trust it; don't re-verify proven facts (deploy model, C2k probes, signed-off content) unless something contradicts them.
7. **Split phases into fresh sessions.** Design, build, capture, publish — each as its own session with a handover note beats one mega-session whose context grows (and bills) every turn. Damien: starting a fresh session after a big phase is cheaper than continuing a long one, even though it feels wasteful.
8. **Match the model to the phase** — at two levels. (a) **Per session** Damien picks the main model: top-tier (Fable/Opus) for design judgment and tricky debugging; a mid-tier model is fine for mechanical follow-the-handover work (capture sessions, asset processing, registry updates) and burns the allowance far slower. (b) **Within a session**, regardless of the main model, you still route delegated grunt-work down a tier per point 3 above — the two compose (Opus main thread + Sonnet/Haiku subagents is the cheapest way to run an ambitious build).

---

## Step 0 — Orient yourself

A fresh session has no context. Before touching the request, sync the repo so this playbook itself is up to date — Damien works across two Macs and the playbook evolves between builds — and then read the orient files:

```bash
cd ~/Sites/ols-digital-skills
git fetch origin main && git checkout main && git pull
```

The `git pull` is the bit that matters: this playbook is committed to the repo, so pulling first means *this very file* is the latest version before you read it. Without the pull, a stale local clone would have you following yesterday's instructions.

Then read, in order:
1. `README.md` — repo structure and conventions
2. `docs/BUILD_PLAYBOOK.md` — this file (you're reading it)
3. `style.css` — the shared brand stylesheet (CSS variables, footer styles)
4. **The reference gallery** (see the section "The reference gallery — the bar" below) — skim what's been built and open the ONE whose shape is closest to today's brief. `chemistry/mendeleev-cards/` (`index.html`, `style.css`, `script.js`) is the drag-and-drop polish reference and the place to learn the house feel; it is **not** the only bar. This is what "good" looks like — across a *range* of ambitions, not one app.
5. `assets/intro-loader.js` — the intro animation loader every activity includes

**Context you can rely on (the environment):**
- The repo is cloned at `~/Sites/ols-digital-skills`. `gh` CLI is authenticated as `dgaj-g`.
- A static preview server named `digital-skills` is defined in `/Users/damiengartland/Desktop/Claude Work/.claude/launch.json` (serves the repo on port 8098).
- Skills available: `pdf`, `docx`, `pptx`, `xlsx` — use them for reading those file types.
- Node global packages: `react`, `sharp`, `puppeteer`, `mermaid-cli`, `qrcode`, `highlight.js`. `ffmpeg` and `pdftoppm` are installed.
- `python3` is available; `NODE_PATH=$(npm root -g)` lets node scripts find global packages.
- **Clipboard handoffs (standing preference).** Whenever Damien needs to paste something — code, a config file, a big `Code.gs`/`Index.html` for an Apps Script deploy — put it **straight on the macOS clipboard** with `pbcopy < "<file>"` and tell him it's ready to ⌘V. Never dump code in chat for him to copy by hand. For multi-file handoffs, copy one, let him paste it, then copy the next when he's ready.
  - **ALWAYS run `pbcopy` (and `pbpaste`) under a UTF-8 locale — MANDATORY: prefix every call with `LC_CTYPE=en_US.UTF-8` (or `LC_ALL=en_US.UTF-8`).** Damien's Mac shell has **no `LANG`/`LC_CTYPE` set** (they're empty), so bare `pbcopy` falls back to **Mac Roman** and corrupts every non-ASCII character when pasted into a GUI app (Outlook/Word): `Roisín` → `Rois√≠n`, and the same for other fadas, `é`/`ü`/accents, curly quotes and em-dashes. **The terminal round-trip hides it** — `pbpaste` reverses the same bad mapping so the bytes look fine in the shell, but the *pasteboard* literally holds `√≠`; verify the real stored text with `osascript -e 'get the clipboard'` (the `í` must be bytes `c3 ad`, never `e2 88 9a`). Shell env does **not** persist between Bash tool calls, so the prefix must be on **every** `pbcopy`. **Never "fix" this by stripping the accents from a person's name** (e.g. Roisín → Roisin) — that's wrong and disrespectful; fix the locale instead.

**Who this is for:** Our Lady's Grammar School, Newry — an all-girls Catholic grammar school. Activities are used by pupils on phones, Chromebooks, and Promethean boards, and double as ETI inspection evidence. Tone: polished, professional, age-appropriate, never childish.

---

## Step 1 — Find the request

```bash
gh issue list --repo dgaj-g/ols-digital-skills-inbox --state open \
  --json number,title,body,createdAt --limit 50 | jq 'sort_by(.createdAt)'
```

- `/next` → take the **oldest open issue** that doesn't already have a linked PR.
- `/build <N>` → use issue `<N>` directly.
- No open issues → tell Damien "Queue's empty — nothing to build." and stop.

Check the issue's comments — if a "Built — see PR …" comment already exists, that issue is in progress; skip to the next.

---

## Step 2 — Parse the issue body — every field, literally

The body shape:

```markdown
## Request details
- **Department / Subject:** <dept>
- **Year group:** <year>           (J1/J2/J3/S1/S2/L6/U6)
- **Exam board:** <board>          (CCEA/WJEC/AQA/OCR/Pearson/N/A/Other)
- **Topic title:** <topic>
- **Activity type preferred:** <type>   (JSON array, e.g. ["Drag-and-drop"])

## What should the activity do?
<the teacher's description of the pupil experience>

## Source materials
- [filename](sharepoint-url)

## Anything else
<colour preferences, terminology, layout ideas — or blank>

---
*Request ID: <id>*
```

**Do this, deliberately:**
- Read **"What should the activity do?"** word by word. Extract a checklist of every requirement — explicit ("pupils drag electrons into shells") and implicit ("…to build atoms" implies a build/assembly mechanic and a success state). Note every noun (what objects exist), every verb (what pupils do), every adjective (how it should feel).
- Read **"Anything else"** the same way. When populated it is **binding** — colour schemes, specific terminology the department uses, named examples, layout requests. Every item gets honoured.
- **Activity type preferred** is a JSON array. Parse it. `["You decide"]` means you choose. Multiple ticks means the teacher sees value in a blend — respect that.
- Note the **Year group** — it sets reading level, complexity, and tone. J1 (Year 8) is very different from U6 (Year 14).
- Note the **Exam board** — terminology must match that board's specification (CCEA ≠ AQA wording).

Write the requirements checklist down explicitly. You will verify against it in Step 5.

---

## Step 3 — Download the source materials

Each "Source materials" link is an anonymous SharePoint share URL:

```
https://{tenant}-my.sharepoint.com/:b:/g/personal/{user}/{shareid}
```

These can't be `curl`'d directly — they redirect through a viewer. **Transform to the direct-download URL:**

```
https://{tenant}-my.sharepoint.com/personal/{user}/_layouts/15/download.aspx?share={shareid}
```

Given a share URL, match with regex `https://([^/]+)/:[a-z]:/[gt]/personal/([^/]+)/([^/?\s]+)`:
- $1 = tenant · $2 = user · $3 = share ID

```bash
mkdir -p /tmp/ols-build-<N>/materials && cd /tmp/ols-build-<N>/materials
curl -sL -A "Mozilla/5.0" -o "<filename>" \
  "https://{tenant}-my.sharepoint.com/personal/{user}/_layouts/15/download.aspx?share={shareid}"
file "<filename>"   # must report the real type, NOT "HTML document text"
```

If a download returns HTML or fails after one retry, note it — then **continue the build** with the files that did download plus the form's text. Flag the missing file prominently in the PR's "Notes for review" so Damien can re-supply it. Don't halt the build over one file.

---

## Step 4 — Read every download, completely and carefully

This is the heart of the playbook. The teacher uploaded these files because they contain what they want. Read **all of them, in full.**

| File type | How to read it — fully |
|---|---|
| **PDF (digital text)** | Read tool. For >10 pages use the `pages:` parameter and cover every page. Read tables, captions, diagrams. |
| **PDF (scanned / handwritten)** | A scanned PDF has no text layer. Convert each page to an image: `pdftoppm -jpeg -r 200 file.pdf /tmp/pg`. Then Read each image multimodally. **OCR handwriting carefully** — if a word is genuinely illegible, note it; do not invent it. |
| **Word (.docx)** | Use the `docx` skill (`pandoc --track-changes=all file.docx -o /tmp/x.md`). Read every paragraph, table, comment. |
| **PowerPoint (.pptx)** | Use the `pptx` skill — `python3 -m markitdown file.pptx` for text AND render thumbnails to see layout. Read every slide; slides often ARE the storyboard. |
| **Images (storyboards, sketches, photos)** | Read multimodally. Interpret **every** arrow, label, scribble, box, and annotation — a storyboard is the teacher drawing you the activity. Honour the layout they sketched. |
| **Spreadsheets (.xlsx/.csv)** | Use the `xlsx` skill. The data may be the activity's content (e.g. quiz questions, vocab lists). |
| **Audio (.mp3/.m4a/.wav)** | A teacher may have recorded their explanation. Attempt transcription with Whisper: `pip3 install -q openai-whisper` then `whisper file.mp3 --model small --output_dir /tmp`. If Whisper can't be installed/run in the session, **comment on the issue** asking Damien for a short summary of the audio — do not skip it silently. |
| **Video (.mp4/.mov)** | Extract the audio track (`ffmpeg -i file.mp4 /tmp/audio.mp3`) and transcribe as above. Sample key frames (`ffmpeg -i file.mp4 -vf fps=1/5 /tmp/frame%03d.jpg`) and Read them. If this isn't feasible, flag to Damien. |

For **each** file, write a short note: what it contains, and which part of the activity it informs. If a file seems unrelated to the topic in the form, flag it — it may be an upload mistake.

---

## Step 5 — Restate the vision and verify completeness

Before writing a single line of code, write out — for yourself, and later for the PR description:

1. **"Here is what I understand the teacher wants:"** — 3-5 sentences describing the activity as the teacher envisions it.
2. **The explicit requirements checklist** (from Step 2's "What should the activity do?" + "Anything else").
3. **The implicit requirements** (mechanics/states implied but not spelled out).
4. **The source-material map** — which file supplies which content.
5. **The completeness check** — go through the checklist item by item. Can each one be honoured? Anything that can't is a flag for the PR's "Notes for review" — you still build the activity, you just record what couldn't be done and why.

**If something is ambiguous or missing — do NOT halt. Build your best interpretation and flag it.** Damien needs a complete, finished activity to review; tweaks happen afterwards on the PR. Specifically:
- If "What should the activity do?" is thin → build the most reasonable activity the topic and source material support. In the PR say: "the brief was light; here's the interpretation I chose — happy to adjust."
- If the source material contradicts the form → trust the source material (it's the teacher's actual content), and note the discrepancy in the PR.
- If a fact can't be verified → use the source material's version, or omit that single claim, and flag it for spot-checking.

The deliverable is always a complete, reviewable activity plus an honest "Notes for review" list. Never a halted build with an open question.

---

## Step 6 — Choose and design the activity pattern

`Activity type preferred` maps to these patterns. The **first build of each pattern becomes its reference** — when you build a new pattern, add a note here pointing at it (and commit that playbook update with the build).

### Variation is mandatory — survey, ideate, differentiate (the *Sound Doctor* lesson)

`Activity type preferred` is a starting point, **not a licence to repeat**. Pupils experience the *whole set*, so each build must feel like a new kind of game — not the last one re-skinned. **Before** you settle on a pattern, do this every single time:

1. **Survey what already exists** — skim the activities already built, *especially in the same department*, and write down the **interaction shape** they share (e.g. all five Irish builds were "drag/flip/grid to match a word to a picture"). If your instinct is to build that same shape again, treat it as a red flag, not a plan.
2. **Generate several distinct concepts** from genuinely different angles — audio-first, embodied / TPR ("Simon says"), role-play / story, build-a-thing, arcade / reflex, simulation, a wildcard. Make them *different ideas*, not variations of one. Push past the obvious first answer.
3. **Pick the most distinctive concept that still honours the brief, the year group and the source material** — weigh candidates on distinctiveness *vs the existing set* (highest), genuine consequence, use of the teacher's actual material, "wow"/colour, and buildability. If nothing existing fits, **invent a new pattern** and add it to the gallery.
4. **Justify the choice in the PR** — state the shape the existing builds share and how this one deliberately differs.

On an **ultracode** session this is a multi-agent workflow: parallel readers survey the gallery → parallel ideators propose diverse concepts → an adversarial judge ranks them on distinctiveness/buildability → build the winner (then run an adversarial review of the build). That is exactly how **`irish/na-baill-beatha/` → *Dochtúir na bhFuaimeanna* / "The Sound Doctor"** was made: the survey showed every Irish build was the same match-word-to-picture shape, so it became a **listen-and-tap** game — the teacher's recorded voice is the *only* prompt and the body itself is the answer space, a shape pupils hadn't met. Aim for that level of deliberate differentiation on every build. (Reach for this even on non-ultracode sessions — just do the survey/ideate/differentiate in-thread rather than as a workflow.)

### Drag-and-drop — reference: `chemistry/mendeleev-cards/`
Sortable items with target slots. Correct drop → snap in + positive feedback (sound/glow). Wrong drop → gentle bounce-back, never punishing. Completion → a reveal/celebration moment. Tap an item for detail.

**"Drag-and-drop" means LITERAL, REAL-TIME DRAGGING — this is non-negotiable:**

- **On a computer:** the pupil presses the mouse button down on the item, and the item **follows the cursor continuously** while the button is held, then drops where the button is released. (Driven by `pointerdown` → `pointermove` → `pointerup`.)
- **On a smartphone or tablet:** the pupil touches the item with a finger, and the item **follows the finger continuously** as it slides across the glass, then drops where the finger lifts off.
- The dragged element must move **with** the pointer in real time — visibly tracking the finger/cursor frame by frame. The pupil sees the thing they grabbed travelling across the screen under their finger.

**This is mandatory. Do NOT instead build:**
- ❌ A "tap the item, then tap the destination" two-step — that is not dragging.
- ❌ The HTML5 native drag-and-drop API (`draggable="true"`, `dragstart`/`dragover`/`drop`) — it is mouse-only and **does not work on touchscreens at all**. Never use it.
- ❌ Any library or pattern that works on desktop but degrades to tapping on mobile.

**The only correct implementation is the Pointer Events API** (`pointerdown`/`pointermove`/`pointerup`/`pointercancel`), exactly as in the Mendeleev reference build. Pointer Events unify mouse, touch, and pen into one code path, so the *same* real-dragging behaviour works identically on a phone and a computer. Set `touch-action: none` on every draggable element so the browser doesn't steal the gesture for scrolling. Read `chemistry/mendeleev-cards/script.js` and replicate its drag model.

**Two real-pointer gotchas that synthetic tests will NOT catch (both shipped broken once — Costa Rica build):**
1. **Never re-parent the dragged element mid-gesture, and never rely on element-level listeners + `setPointerCapture` alone.** Moving an element in the DOM (`document.body.appendChild(chip)`) silently releases pointer capture, so with a real mouse the drag dies the moment the cursor outruns the element. Correct pattern: lift with `position: fixed` only (element stays in its parent), and track the gesture with **document-level** `pointermove`/`pointerup`/`pointercancel` listeners registered on `pointerdown` and removed on release — they can never lose the event stream.
2. **Synthetic-event QA masks this completely** — dispatching `PointerEvent`s *at the chip* bypasses capture and hit-testing, so the broken engine passes. Test drags by dispatching `pointerdown` on the chip but ALL moves and the release on `document.body` (that is what a real browser delivers once the cursor leaves the element). Better still, drive a real browser (Claude in Chrome) for one drag per mechanic.
3. Bonus: if the page sets `scroll-behavior: smooth`, any per-frame `scrollBy` auto-scroll during drags must pass `behavior: 'instant'`, or the smooth animations fight each other and the scroll stalls.
4. **Never store drag bookkeeping on a reserved DOM property.** A draggable element's `.slot` is a *native* `HTMLElement` property (a string, for shadow-DOM slotting). Writing `tile.slot = slotElement` silently stringifies it to `"null"`/`"[object HTMLElement]"`, so your placement logic reads a string and the drop silently fails (the Isotope Lab mass-spec builder shipped broken this way once). Use a clearly-custom key (`_slot`, `__home`, `dataset.*`) for any element bookkeeping — never bare `.slot`, `.value` on non-inputs, `.label`, `.title`, `.name`, etc. (NB synthetic-pointer QA also can't drop onto a target scrolled outside the viewport — `elementsFromPoint` returns null there — so give the page a tall viewport before drag-testing.)

**Three drag-feel rules Damien keeps having to ask for — MANDATORY on every drag activity (baked in after the Caitheamh Aimsire build).** These are not polish; a drag that lags, won't reach, or only drops on a tiny strip reads as broken on a board. Get all three right *by default*:

1. **The dragged element must track the pointer 1:1, instantly — zero lag.** The single most common cause of "the dragging is laggy" is a **CSS `transition` on `transform`** (e.g. a base `.chip { transition: transform .1s }` for hover): while dragging, every `pointermove` then *animates* the element toward the pointer over that duration, so it visibly chases the cursor/finger. **Kill the transition on the dragged element while it is dragging** — `.chip.dragging { transition: none; }` — this is the fix. Then: set the move with a GPU-composited `transform: translate3d(dx,dy,0)` (add `will-change: transform` on `.dragging`), applied **synchronously on every `pointermove`** so the visual never waits. **Do NOT do heavy work synchronously in `pointermove`** — `elementsFromPoint`/`closest` hit-testing and hover-class writes are expensive and, run on every event, they stall the paint and the element lags. **Coalesce the hit-testing to once per frame with `requestAnimationFrame`** (store the latest x/y in `pointermove`, do the hit-test + hover highlight in the rAF callback; cancel it on release). Reference: `irish/caitheamh-aimsire/script.js` (`onMove` + `hitTest`). Verify by reading `getComputedStyle(chip).transitionDuration` mid-drag — it must be `0s`.

2. **The drop target is the WHOLE visual item, not a sub-region.** Releasing the dragged item anywhere over the picture/card/tile must register the drop. Do not make only a small "slot"/placeholder strip the droppable area — pupils aim at the *picture*. Hit-test for the whole tile (`closest('.photo-slot')`) and resolve to its slot, rather than hit-testing the strip itself. Reference: `irish/caitheamh-aimsire/script.js` `zoneUnder()` returns `slot.querySelector('.ps-drop')` from `closest('.photo-slot')`, and the hover highlight is drawn on the whole tile.

3. **Keep the draggable items reachable from their targets — everything usable without long-distance dragging.** A long list of source items parked in a tray *below* a tall grid of targets means a pupil must drag from the bottom row all the way up to the top row (and fight the scroll). Don't ship that. Options, pick what fits: **(a) a sticky/always-in-view word bank** (`position: sticky; bottom: 0`) so a source item is always a short drag from whatever target is on screen — the Caitheamh Aimsire Match solution; **(b) a compact-enough layout that the whole board + tray fit one screen**; or **(c) rounds** of a handful of items at a time. Combine with edge auto-scroll during drag so off-screen targets are still reachable. Make the targets generous (rule 2 helps). Verify at 375 px and at 1280 px+ that no item requires an awkward long drag.

**Suppress text selection while dragging — MANDATORY.** When the pupil holds the mouse button and drags across the page, the browser's normal "select text" gesture fires at the same time, so every heading, label, and caption the cursor sweeps over gets highlighted blue. It is harmless but looks messy and unprofessional on a board. `touch-action: none` and `user-select: none` on the *draggable element itself* do **not** fix this, because the selection happens on the *other* text the cursor passes over. The fix is a page-wide selection lock that exists only for the duration of a drag:

1. On `pointerdown`, add a class to `<body>`: `document.body.classList.add('dragging-active')`.
2. On `pointerup` **and** `pointercancel`, remove it: `document.body.classList.remove('dragging-active')`.
3. CSS — kill selection page-wide only while that class is present:
   ```css
   body.dragging-active, body.dragging-active * {
     -webkit-user-select: none !important;
     -moz-user-select: none !important;
     user-select: none !important;
     -webkit-touch-callout: none;
   }
   ```
4. Belt-and-braces, cancel any selection the browser still tries to start mid-drag:
   ```js
   document.addEventListener('selectstart', (e) => {
     if (document.body.classList.contains('dragging-active')) e.preventDefault();
   });
   ```

Because the lock is scoped to the `dragging-active` class and removed on drop, normal text selection (and typing in any input/textarea) still works everywhere when no drag is in progress. Reference implementation: `chemistry/mendeleev-footsteps/` (`onPointerDown`/`onPointerUp`/`onPointerCancel` + the `body.dragging-active` rule in its `style.css`).

### Flashcards — reference: *(none yet — first build sets it)*
A deck of cards. Front = prompt/term, back = answer/definition. Tap/click flips the card (CSS 3D transform, smooth). Next/previous navigation; swipe on touch via Pointer Events. Shuffle. Progress indicator (e.g. "7 / 20"). Optional "got it" / "review again" sorting. Audio per card where the topic needs it (language pronunciation, music).

### Timeline — reference: *(none yet)*
Events on a chronological axis. Each event is a clickable marker; clicking opens a detail panel (date, headline, description, optional image). Drag to scroll the axis (Pointer Events). Collapses to vertical on narrow phones. Good for History, evolution-of-X topics.

### Quiz — reference: `sports-science/effects-of-exercise/`
A sequence of questions. Multiple choice (or matching/true-false where it fits). Select → immediate feedback (correct/incorrect) + a short explanation. Score + progress tracking. End screen with score and a review of missed questions. Feedback must teach, not just mark. The reference build is a **multi-mode** quiz: it blends click (multiple choice), drag (sort-into-buckets + match-to-row, real Pointer Events with the `body.dragging-active` selection lock), type (free text with synonym matching), and listen (Web Speech API `speechSynthesis` reads the clue aloud, with a "Show text" toggle as the accessible fallback) — one scored attempt per question, then a teaching explanation. Reach for this when a brief asks for several interaction styles in one revision activity.

### Interactive diagram — reference: `government-politics/constitution-diagram/`
A base image (labelled diagram, map, scene). Clickable hotspots positioned over it; clicking reveals a label + explanation. Offer an "explore" mode and, where it fits, a "find the X" challenge mode. Hotspots scale responsively with the image.

The reference build is an **editable / buildable** variant: instead of a fixed base image it lays out clickable nodes (three branch cards in a checks-and-balances triangle on wide screens, collapsing to a stacked list + chip grid on phones). Each node opens a side drawer where pupils write their own notes and add real-life examples, colour-coded from a small palette and auto-saved. A **"Model answer" toggle** reveals the worked example as a **read-only reference beneath each box** — it never overwrites a pupil's work (an earlier version *filled* the boxes; don't do that — it's a footgun). A separate "Test yourself" mode is the genuine-consequence quiz. Reach for this pattern when a brief wants pupils to *construct* a labelled diagram over time, not just read a fixed one.

When the brief wants pupils to **save their own work, sign in, or collaborate**, this same activity becomes a live class board — see **"Login-gated collaborative activities"** near the end of this playbook (the reference build does exactly this). A collaborative Google Slides deck is the no-code alternative when you just need shared real-time editing without a custom app.

### Story map / station expedition — reference: `geography/costa-rica-ecotourism/`
A narrative journey across a stylised map. An animated country-map intro (SVG flight path) lands on a quest-style trail-map **hub**; stations unlock sequentially along the path, and each station is a *different* mini-mechanic (definition builder, photo-evidence interpretation, drag-classify columns, red-string evidence board, counterpoint pairing, be-the-examiner marking, evidence scales + justified verdict). A persistent **field-notebook drawer** collects everything the pupil learns into a revision summary; progress survives reloads via localStorage. Reach for this when a brief says "story map", or when a large case study needs both knowledge AND evaluation skills built across one continuous experience. Implementation notes: the shared chip-drag engine includes **edge auto-scroll** (hold a drag near the top/bottom edge and the page scrolls) — without it, phone users cannot reach off-screen drop targets because `touch-action: none` blocks scrolling mid-drag.

**Real photos beat illustrative SVG, and "find the thing" is not a task.** The first cut of this build had a Station 2 that was a hand-drawn SVG cloud-forest scene where pupils tapped to *find* 8 features — it was both visually weak and pedagogically empty (a tap-hunt with no possible wrong answer teaches nothing). Rebuilt as **photo-evidence interpretation**: real Wikimedia-Commons photographs of the actual case-study location, each paired with a "what does this image *prove*?" multiple-choice question with mark-scheme feedback — the resource-interpretation skill the exam actually tests. Lessons that generalise: (1) for a real place, source **real licensed photos** (Wikimedia Commons API → `Special:FilePath/<file>?width=1100` → `sharp` resize to ~1100px/JPEG q78; respect CC BY-SA with an in-activity "ⓘ Image credits" toggle + an `assets/CREDITS.md`); a stylised SVG is a last resort, never a substitute when photos exist. (2) Every station must have **genuine consequence** — if a pupil can complete it without knowing anything (tap-to-find, match identical shapes), it is decoration, not assessment. A real photograph + an interpretation question clears both bars at once.

### Guided project builder — reference: `french/mon-carnet-de-france/`
A teacher's **existing departmental project brief** (the homework project they already set every year) turned into a sequence of interactive **stations** (one per section of the brief, each its own game pattern from this list), finished by a button that **generates the pupil's actual project document in her own Google Drive** — formatted first draft, auto-shared with her teacher, filed into a portfolio folder, with screenshot guide decks teaching the polish/submission steps. Login-gated (Path B), so progress follows the pupil across devices. Reach for this when the request is "our pupils already do project X — can we make it digital?" Full pattern: see "**Workspace project builders**" near the end of this playbook.

### 3D model / interactive simulation — reference: `chemistry/isotope-snap/` (Isotope Lab)
A real **WebGL 3D model the pupil manipulates** (rotate/zoom/build), not a flat diagram. Reach for this when a brief wants something to "come alive" in 3D (atoms, molecules, cells, the solar system). **Vendor the 3D lib locally** (Three.js r149 UMD at `assets/vendor/three.min.js` — global `THREE`, works from `file://`) — this is the repo's one sanctioned exception to "no third-party libs"; justify it in the PR. Write **custom drag-to-rotate + wheel/pinch-zoom** controls (don't vendor OrbitControls). Reuse shared geometries/materials and start/stop the `requestAnimationFrame` loop on mode enter/leave. On Path B, the lib loads from the **absolute github.io URL** (like the crest) — the assembler rewrites it; never inline 600 KB. Isotope Lab also pairs the 3D builder with a card game (Web-Audio synth feedback, no Tone.js) and a drag-the-formula task (custom branded SVG charts, no Chart.js) inside one login-gated hub.

### You decide
Pick the pattern that best serves the topic and the described pupil experience. Justify the choice in the PR description.

### Other (teacher typed their own)
Read what they typed; build the closest fit from the patterns above, or a sensible hybrid. Explain your interpretation in the PR.

---

## Step 6b — The capability toolbox (libraries you can reach for)

**Default to vanilla HTML/CSS/JS + SVG** — it's what every build above uses, it inlines
cleanly, and it never breaks the no-build / single-file / Chromebook constraints. Reach
for a library only when it genuinely lifts the activity, and only if it is **free for
school use, self-hostable, has no build step, needs no paid API key, and runs on a
low-end Chromebook**. For login-gated (Apps Script) builds it must also be **inline-able
into one self-contained HTML file** — verify that, not just "loads from a CDN". Vendor the
minified file into the activity folder (like `qrcode.min.js`) and keep the licence notice.

All of the following were licence- and fit-checked (Jun 2026). Consider them when a brief
would be *better* with one — don't bolt them on for show.

**Animation / polish**
- **GSAP** — became **100% free in 2025** (Webflow released the whole toolkit, incl. the
  old paid plugins; a free "no-charge" licence, commercial use fine). Pure JS, ~70KB,
  inlines into an Apps Script page, no WebGL. Best for **silky 2D motion, SVG draw/morph,
  and choreographing many-step sequences** reliably. The current builds hand-roll motion
  (pen-speed SVG, rAF) and look bespoke already — reach for GSAP when a future build needs
  an *elaborate* coordinated sequence, not as a blanket retrofit.
- **anime.js** (MIT) — the lighter free alternative for slick reveals, staggers and SVG
  animation.
- **canvas-confetti** (ISC, ~16KB) — the universal full-marks / completion celebration.

**Maths & data (your core departments)**
- **JSXGraph** (MIT/LGPL, zero-dep, fully inline-able) — the standout for **bespoke
  interactive maths**: drag a point and watch a tangent/angle update live, sliders,
  constructions — all in one self-contained file where GeoGebra/Desmos can't go.
- **MathJax in SVG mode** (`fontCache:'local'`, Apache-2.0) — publication-quality typeset
  equations with **no external font files**, so each equation is self-contained — the
  right fit for single-file maths/science pages. (KaTeX is faster/lighter but its CSS
  needs font files inlined for a true single-file build; fine over a CDN.)
- **Chart.js** (MIT, ~70KB) — highest impact-for-effort: pupils type numbers → polished
  animated graph. Stats, Science results, Geography/Home-Ec data.
- **p5.js** (LGPL) — a creative-coding canvas for genuine **simulations and generative
  art** (kinetic-theory particles, wave visualisers, build-your-own-Kandinsky). Stay 2D on
  Chromebooks.
- **Matter.js** (MIT) — 2D physics for real "build-a-bridge / stack-the-blocks /
  forces-and-motion" activities with genuine consequences.
- **D3.js** (ISC) / **Observable Plot** (ISC) — for bespoke data visuals no chart library
  can make; reach for Plot first (far less code), raw D3 only when you must.

**Other departments**
- **Tone.js** (MIT) — turns the browser into a playable instrument (Music; Science sound/
  waves). Audio must start on a tap (browser rule).
- **Leaflet** (BSD) — lightweight clickable maps (Geography/History/RE/Languages). The
  library is free; point map *tiles* at a genuinely free source (OpenFreeMap) for class
  use, not the default OSM tiles.
- **3Dmol.js** (BSD) — rotate real 3D molecules (Science); the best-fitting 3D tool, one
  self-contained file (needs WebGL — keep molecules small).
- **Three.js** (MIT) — full 3D, but ~600KB + WebGL: **reserve for genuinely 3D activities**,
  self-host on github.io rather than inlining, and keep scenes light. For almost everything
  GSAP + SVG/Canvas is the lighter, safer choice.
- **Mermaid** (MIT, already in the toolchain) — text→diagram (flowcharts, timelines,
  concept maps), auto-layout (not pixel-precise).

**Approach with caution — these fail one of the constraints, despite looking ideal:**
- **Desmos API** — needs a partnership-issued key for real use and loads its engine from
  Desmos's servers (not offline / not single-file). Use **JSXGraph** instead.
- **GeoGebra embeds** — free for your own teaching but a **non-commercial** licence (blocks
  redistribution) and it loads from geogebra.org / is multi-file (not self-contained).
  **JSXGraph** fits where GeoGebra can't.
- **KaTeX** (single-file builds), **Lottie** (needs its own `.json` asset), **MapLibre /
  Vega-Lite** (heavy/WebGL or large bundles on weak Chromebooks) — all free, but check the
  asset/weight catch before committing.

If a tool would materially raise a build and meets the constraints, use it and note it in
the PR. If you considered one and rejected it, that's worth a line too.

---

## Step 7 — Build

```bash
cd ~/Sites/ols-digital-skills
git fetch origin main && git checkout main && git pull
git checkout -b draft/issue-<N>-<dept-slug>-<topic-slug>
```

Create `<department-slug>/<activity-slug>/` with `index.html`, `style.css`, `script.js`, and an `assets/` folder if needed.

**Do NOT touch the root `/index.html` or add any "hub" / "directory" / "all activities" page.** There is no public hub. The root URL is a minimal branded landing on purpose — it deliberately does not list any activities. Each activity is standalone and accessed only via the direct URL a teacher shares with their class. Never add a card, link, or reference to the new activity anywhere outside its own folder.

**Non-negotiable build standards:**
- **Input:** Pointer Events (`pointerdown`/`pointermove`/`pointerup`/`pointercancel`) for all dragging and interaction — one code path for mouse, touch, and pen. `touch-action: none` on every draggable element. Tap vs drag disambiguation via a movement threshold.
- **Real dragging (if the activity involves dragging):** the dragged element must follow the finger (on touch) or the cursor (on mouse) **continuously and in real time** — literal dragging, not a tap-source-then-tap-target substitute. **Never** use the HTML5 native drag-and-drop API (`draggable`, `dragstart`) — it is broken on touchscreens. It must also be **lag-free** (no `transition` on `transform` while dragging; `translate3d` + rAF-coalesced hit-testing), **drop on the whole picture/tile** (not a tiny slot strip), and **keep the draggable items reachable** from their targets (sticky tray / compact / rounds). See the Drag-and-drop pattern in Step 6 — the "Three drag-feel rules" block — for the full requirement.
- **No text-selection during drag:** lock page-wide text selection for the duration of every drag (a `body.dragging-active` class toggled on `pointerdown`/`pointerup`, plus a `selectstart` guard) so the mouse gesture never sweeps a blue highlight across labels and headings. Full recipe in the Step 6 Drag-and-drop pattern — this is mandatory on every drag activity.
- **No build step:** pure HTML/CSS/JS. Must work opened from `file://` — use relative paths only, never absolute `/`.
- **Branding:** OLS deep blue `#1A3A6B`, gold `#E4B824`, borders `#595959`. Reference `../../style.css` for shared variables.
- **Intro animation — MANDATORY on every activity.** Every activity opens with the OLS crest particle-assembly animation, which then leads straight into the activity. You get all of this by including ONE line just before `</body>`:
  ```html
  <script src="../../assets/intro-loader.js"></script>
  ```
  `intro-loader.js` does everything automatically — do not rebuild or modify it:
  - It **auto-selects the right video for the device**: portrait phones get `intro-portrait.mp4` (1080×1920); everything else gets `intro.mp4` (1920×1080 landscape). The decision is made from `window.innerHeight > window.innerWidth` at load time. You do not write any orientation code — including the script is all that's needed.
  - **Timings are already correct and agreed — do not change them:** 3-second animation, then an 800 ms hold so the wordmark can be read, then a 450 ms fade into the activity.
  - It plays **once per browser session** (so a pupil doing several activities in a lesson only sees it the first time), can be dismissed early by tapping the overlay or pressing Escape, and has a safety timeout so the activity is never stuck behind the overlay.
  - After the intro it fades **directly into this activity** — see the "Standalone" rule below.
- **Standalone — straight to the activity, no menu, no hub, no cross-links.** After the intro animation, the pupil lands **directly on this one activity** — never a menu, never a list of other activities. Do **not** add a "back to OLS Digital Skills" link, a home button, a hub card, or any navigation to other activities. There is no public hub: the root `/index.html` is a minimal branded landing that deliberately lists nothing. A teacher shares a single activity's direct URL with their class; pupils must see only that one activity, and must have no way to reach others from inside it.
- **Footer — MANDATORY brand mark.** Every activity ends with the OLS crest + wordmark footer, so the activity is unmistakably tied to the school even if the link is shared beyond OLS:
  ```html
  <footer class="act-footer">
    <img src="../../assets/crest.png" alt="" class="footer-crest" aria-hidden="true" />
    <span>OLS Digital Skills</span>
  </footer>
  ```
  The `.act-footer` styles live in the shared `../../style.css` — just include the markup. (Reference: it's in the Mendeleev build.)
- **No personal attribution** — never put a teacher's or Damien's name on an activity. The footer says "OLS Digital Skills" and nothing else.
- **Responsive:** works at phone (≥360px), Chromebook (≥1024px), and Promethean board (≥1920px). Striking on a big board.
- **Accessibility:** semantic HTML, ARIA labels on interactive elements, keyboard-operable primary interactions, sufficient colour contrast.
- **Media rights:** only use Wikimedia Commons / public-domain / generated SVG / the teacher's own uploaded images. Never copyrighted media. Attribute where required.
- **Curriculum-appropriate:** content pitched to the year group; tone professional; nothing that could embarrass the school.
- **Factual accuracy:** every fact in the activity must trace to the source material or the exam-board spec. Spec terminology must match the stated exam board.

Honour every item from the Step 5 checklist. If the teacher said "colour-code alkali metals red", they are red.

### Assessment integrity — genuine consequence (MANDATORY)

An activity a pupil cannot fail teaches nothing, and one that hands them the answer teaches less. Every assessed interaction must let pupils be wrong, and must never give the answer away through layout, ordering, wording, colour **or shape**.

**THE ONE TEST THAT CATCHES THE REST — run it on every assessed task before you ship (MANDATORY).** Look at the **rendered** activity (not the code) and ask: *"Could a pupil who knows nothing about the topic still get full marks — just by matching pictures, shapes, icons, colours, positions, ordering or wording?"* If the answer is yes, the task is giving the answer away and **must** be fixed, whatever surface leaks it. Note the two traps that make this easy to miss:
- **A reachable fail state is not enough.** Having decoys / a way to be wrong satisfies rule 1, but a task can have a fail state *and still* be solvable with zero knowledge (the correct items are trivially matchable). Both must hold: wrong is reachable **and** right requires knowledge.
- **A clean code review is not enough.** "Shuffled, decoys present, all one neutral colour" can all be true in the code while the *rendered* items are matchable by eye. This check must be done by eye on the screenshot, every time.

*Cautionary tale this rule exists to prevent (a real miss):* an antibody→antigen "match the complementary shapes" task was built with each antibody drawn as the **identical** shape to its antigen (circle→circle, triangle→triangle). It was all one neutral gold (passed the colour check below) and had decoys (a fail state existed) — yet any pupil could score full marks by matching identical pictures with zero immunology, and it mis-taught "complementary" as "the same". The fix: render the antibody binding site as the **complement** (the antigen shape cut out as a socket — lock and key), so matching needs the concept. Watch for the same trap with icons, mirrored shapes, sizes and lengths.

1. **Build a real fail state — never force correctness.** Do not reject a wrong drag by snapping it back so the only possible outcome is correct, and do not advance only on the right answer. Wrong must be a reachable, visible outcome.
2. **Place-all-then-check for sorting / matching / ordering games.** Let pupils place every item wherever they choose (right or wrong), then grade only when they press a **Check** button that activates once everything is placed. On Check: mark each item right or wrong, lock the correct ones (revealing their teaching feedback), and let pupils move the incorrect ones and check again.
3. **Free rearrangement before checking.** Any placed item must stay freely movable until Check — between targets/positions and back to the tray — so pupils can change their mind. Dropping onto an occupied slot **swaps**; it never blocks. (Watch the drop-target lookup: a hit-test that resolves to the dragged item's *current* container will silently snap it back — exclude the dragged element from the `elementsFromPoint`/`closest` search.)
4. **Never reveal giveaways until after Check.** Hide any metadata that trivialises the task — chapter-and-verse numbers that betray a chronological order, sequence numbers, alphabetical IDs — and never name the answer item inside a "what does this mean?" info/clue panel. Surface them only after Check, where they become teaching feedback.
5. **Question stems must not give away their own answer.** Never embed or telegraph the answer in a question's wording or surrounding text (e.g. "How many were in *the Twelve*?"). Each stem must require knowledge to answer. Review every question for self-answering before shipping.
6. **Randomise order on every render.** Shuffle multiple-choice options and any "pick one" choices so the correct answer's position varies and never clusters (e.g. always first). Likewise shuffle draggable items and cards. Author the data with a *marked* correct answer and shuffle at render — never rely on hand-placed ordering. (True/False may keep its conventional order.)
7. **Don't let colour — or shape, icon, size or any visual — match an item to its target.** When items are sorted, grouped, ordered or matched, the target must **not** share a distinctive *anything* with the items that belong in it. Matching colours is the obvious case; **identical or near-identical shapes/icons are just as bad** — an antibody drawn as the same shape as its antigen is solved by eye, not knowledge (see the cautionary tale above). Keep targets visually neutral, or give every target and item the same neutral colour, so correct placement requires the *concept*. Where shape genuinely **is** the content (a complementary lock-and-key match), render the true relationship — the complement / socket, not a duplicate — so the pupil has to apply it. Colour and shape are for *post-Check* feedback (green correct / red wrong) — never a pre-Check hint.
8. **The answer must not hide in the accessibility tree or the DOM either — run the zero-knowledge test on the *invisible* layer too.** A task can look clean on screen yet hand the answer to a screen-reader user or anyone who inspects the page. **Never write the answer into a per-question/per-item accessible name** — an `aria-label`, `title`, `alt`, or a visually-hidden element — that is exposed *before* the pupil commits. This bit twice (Caitheamh Aimsire and Cluichí Gaelacha): the listening quiz set the play orb's `aria-label` to the spoken word (`Seinn an focal: Iománaíocht`), so AT read the answer aloud with zero listening and it sat in the DOM for any inspector. **For a listening quiz the spoken audio is the ONLY per-question signal** — the word is revealed solely by an explicit opt-in "Show the word" toggle and by the post-answer feedback, never by the orb's accessible name (keep that a generic, answer-free string). Descriptive `alt` on the *option photos* is fine (it is the accessible equivalent of *seeing* the picture and does not reveal which option is correct), but nothing may name the **correct** item pre-answer. For a memory/flip game, hide a face-down card's content from AT (`aria-hidden` on the front face), reveal it on flip, re-hide on flip-back, drop solved cards from the tab order, and announce match/mismatch + running score via one `aria-live` region — and give "matched" a non-colour cue (a ✓), not just a green border. Verify by reading the live DOM (`getComputedStyle`, the a11y tree, `aria-label`s) mid-task, not just the screenshot.

These rules apply to drag-to-sort, drag-to-match, ordering/sequencing and quiz patterns. Self-test patterns (flashcards) and recall games (memory pairs) are exempt from the Check-button rule but must still never give answers away.

---

## Step 8 — Test thoroughly (QA checklist)

Use the Claude Preview tools. `preview_start` the `digital-skills` server, then navigate to `http://localhost:8098/<dept>/<activity>/`.

Run through this checklist — don't declare done until all pass:

- [ ] Page loads with **no console errors** (`preview_console_logs` level error).
- [ ] Intro animation plays, then transitions into the activity (or skips cleanly if autoplay is blocked in the preview iframe — that's expected there).
- [ ] **Primary interaction works with a simulated mouse pointer** (`pointerType: 'mouse'`).
- [ ] **Primary interaction works with a simulated touch pointer** (`pointerType: 'touch'`).
- [ ] Correct-action feedback fires (snap/flip/reveal/score).
- [ ] Wrong-action handling is gentle and correct.
- [ ] **Wrong answers are reachable and graded on Check** — not snapped back or forced correct (sort/match/order games).
- [ ] **Placed items move freely** between targets and back to the tray before Check; dropping on an occupied slot swaps.
- [ ] **No giveaways before Check** — no order-revealing refs/IDs on items, no answer named in info panels, options/cards randomised, and no colour **or shape** match between options and their target sections.
- [ ] **Zero-knowledge test passed (Step 6)** — looking at the *rendered* task, a pupil who knows nothing could NOT get full marks by matching pictures/shapes/icons, position, ordering or wording. (A reachable fail state alone does not pass this.)
- [ ] Completion/end state fires when the activity is finished.
- [ ] Layout intact at **375px** (phone), **768px** (tablet), **1280px+** (desktop). Resize and screenshot each.
- [ ] Text is readable; nothing overflows or overlaps.
- [ ] Every Step 5 checklist requirement is visibly present.
- [ ] Spot-check facts against the source material.

Fix every issue found, then re-test. One fix often creates another — re-run the affected checks.

---

## Step 9 — Commit, push, open the draft PR

```bash
git add -A
git commit -m "Add <dept>: <activity-name>

Built from issue dgaj-g/ols-digital-skills-inbox#<N>.
<one-line description>.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
git push -u origin draft/issue-<N>-<dept-slug>-<topic-slug>
```

```bash
gh pr create --repo dgaj-g/ols-digital-skills --base main \
  --head draft/issue-<N>-<dept-slug>-<topic-slug> --draft \
  --title "[BUILD] <Dept> — <Topic>" \
  --body "$(cat <<'EOF'
Builds the activity requested in dgaj-g/ols-digital-skills-inbox#<N>.

## Live preview
https://dgaj-g.github.io/ols-digital-skills/<dept>/<activity>/
(Pages rebuilds ~30-60s after merge; for the branch preview, see the Actions tab.)

## What the teacher asked for
<the restated vision from Step 5 — 3-5 sentences>

## What I built
<2-3 sentences: the activity and how it realises the request>

## Requirements checklist
- [x] <explicit requirement 1> — how it's met
- [x] <explicit requirement 2> — how it's met
- [ ] <anything NOT done, and why>

## Confidence
**High / Medium / Low** — one-line justification.

## Notes for review
- <Assumptions made, interpretations chosen, any fact worth spot-checking, anything cut>

## Source material used
- <filename> — <what it supplied>

Closes dgaj-g/ols-digital-skills-inbox#<N>
EOF
)"
```

`Closes dgaj-g/ols-digital-skills-inbox#<N>` auto-closes the inbox issue when Damien merges. Keep the PR a **draft** — it signals "awaiting Damien's review".

---

## Step 10 — Notify Damien

Three notifications:

1. **Comment on the inbox issue** so there's a trail:
   ```bash
   gh issue comment <N> --repo dgaj-g/ols-digital-skills-inbox \
     --body "Built — see PR dgaj-g/ols-digital-skills#<PR-number> for review."
   ```

2. **Send a push notification** so Damien knows it's ready even if he walked away:
   Use the `PushNotification` tool. One line, under 200 chars, lead with the actionable bit. Example:
   > `Built: <Dept> — <Topic>. PR #<N> ready to review in ols-digital-skills.`

   This pings his Mac terminal always, and his phone if Remote Control is connected.

3. **Inline the PR body in the chat thread, with the local preview link on top** — this is the review surface. Damien doesn't want to flip between this thread and GitHub to read the review; the same description that's on the PR lives here too. The thread is the home for the conversation around the build, so keep all the relevant context in one place.

   After `gh pr create` succeeds, fetch the body back exactly and paste it as a quoted block in your reply to Damien, with a one-line lead-in identifying the PR (number, title, draft status) and a link to the PR on GitHub:

   ```bash
   gh pr view <PR-N> --repo dgaj-g/ols-digital-skills --json body --jq .body
   ```

   **Above the quoted PR body, include the local preview URL** so Damien can open the activity in his browser on the same Mac that ran the build and check it before reviewing. The URL is the `preview_start`'s `localhost:8098` plus the activity's path — e.g. `http://localhost:8098/irish/sa-seomra-ranga/`. Make sure the `digital-skills` preview server is still running when you post the link; if you stopped it during QA cleanup, restart it via `preview_start` first. (The GitHub Pages URL inside the PR body is the *post-merge* address — the local link is for review *before* merge. They coexist, they're not the same.)

   Caveat to mention only if it's actually relevant in the moment: the local link works only on the Mac that ran the build, and only while the preview server is running (it stops when the Claude session ends; restarting it in a fresh session via `preview_start` brings it back at the same URL). If Damien is on the other Mac, he'll need to start a session there too. We'll layer a public preview URL (Cloudflare Pages or similar) on later if local previews prove inconvenient — for now the local link is enough.

   Format the inline PR body as a top-level Markdown blockquote so it reads as a quoted artefact, not a fresh message — preserve the headings (one level down, e.g. PR `##` becomes `###` inside the quote), the checkboxes, the URLs, and every word of the body. The GitHub PR remains the canonical record; this is a mirror for Damien's convenience.

   Example shape:
   ```
   **Preview (local, same Mac only):** http://localhost:8098/<dept>/<activity>/

   > **PR #<N> — [BUILD] <Dept> — <Topic>** · *draft* · [open on GitHub](<PR-url>)
   >
   > <full PR body, verbatim, with one-level heading demotion>
   ```

---

## Step 11 — Stop

Do not merge. Do not auto-publish. The draft PR waits in Damien's review queue.

If Damien comments on the PR with changes: address them on the **same branch**, push a follow-up commit, re-test, and re-notify. Never open a second PR for the same request.

---

## Step 12 — `/publish`: go live + handoff package

This step does **not** run inside a `/build` or `/next` session — those stop at Step 11 and the draft PR sits in Damien's review queue. When Damien has reviewed the activity and decided it's ready, he runs **`/publish <issue-number>`** in a fresh Claude Code session. Running `/publish` IS his "yes, ship it" decision. The command:

- **Merges the draft PR** (squash merge, deletes the branch) — this is the going-live step. GitHub Pages picks it up in ~30–60 seconds.
- **Waits for Pages to redeploy** so the live URL actually resolves before producing materials that reference it.
- **Generates the handoff package** for the teacher — Word doc + email draft.

If the PR is already merged (e.g. Damien merged manually on GitHub before running `/publish`), the merge step is skipped and the command goes straight to handoff. If no PR is linked to the issue, or the PR was closed without merging, `/publish` stops with a clear message rather than guessing.

The two artefacts produced:

1. **`<Activity>_Access.docx`** — an A4 Word document the teacher prints, projects on the board, or shares as a PDF.
2. **`<Activity>_email.md`** — a short email drafted in Damien's voice that he pastes into Outlook, attaches the docx to, and sends to the teacher.

Both files land in the **department folder under Claude Work**, never in the public repo:

```
/Users/damiengartland/Desktop/Claude Work/Digital Skills Roadmap/0. Digital Skills Web Activities/<Department>/<Activity_Slug>_Access.docx
/Users/damiengartland/Desktop/Claude Work/Digital Skills Roadmap/0. Digital Skills Web Activities/<Department>/<Activity_Slug>_email.md
```

Use the existing department folder if one already exists (e.g. `Chemistry/`, `Music/`). Create a new title-case folder (`RE/`, `Irish/`, `Sports Science/`) if not. The Mendeleev precedent (`Chemistry/Mendeleev_Cards_Access.docx`) is the format reference.

### First: which KIND of activity is this? The handoff differs

The Word-doc-with-QR + "scan or click, no login needed" handoff below is for a **standard static (github.io) activity**. A **login-gated (Path B / Apps Script) activity is fundamentally different** and must NOT get that handoff:

- There is **no github.io URL to merge/publish** — the teacher deploys it themselves in Apps Script, and the live address is a long `…/exec` URL (record it in `docs/deployed-apps.md`).
- **Do NOT generate the QR/access Word doc for pupils.** A QR of the bare `/exec` only reaches the teacher landing/Staff area, not a pupil — pupils need a **per-class link (`…/exec?class=NAME`)**, and **those links + QR codes are generated inside the activity's own admin panel**, per class, by the teacher. A static publish-time QR is pointless and misleading here.
- The "**pupils don't need to log in, they just scan or click**" line is **wrong** — they DO sign in with their C2k account, that's the whole point.
- These builds usually never had a draft PR in the first place (they're delivered to Claude Work, not merged to Pages), so there is **nothing to merge**; `/publish` here is about producing the **teacher email**, not a Pages deployment.

So for a login-gated activity, `/publish` should skip the access-doc/QR step and instead produce an email in Damien's voice that:
- says the activity is **ready for you to check**;
- gives the **`/exec` link** on its own line (plain text), noting pupils **sign in with their school account**;
- tells the teacher to open the **key/Staff button → passcode → create a class → share that class's link or QR** (the in-app admin), and that each class is its own board;
- mentions the **teacher dashboard** (results, leaderboard, stats) behind the same passcode;
- keeps the standing "try it on a computer and a smartphone" line and the exact closing line;
- (if relevant) notes the **build → you deploy → we verify together** reality if it isn't yet live.

Everything below (Word doc spec, "scan or click" wording) applies to **standard static activities only**.

### Extra instructions on `/publish`

`/publish` accepts the same shape of extra instructions as `/build` does: anything Damien types after the issue number is high-priority guidance, almost always intended for the **email draft** rather than the Word doc. Typical extras:

- *"Mention that the audio files will follow next week once she sends the recordings."*
- *"Thank her for the long worksheet she uploaded — it made the build straightforward."*
- *"She prefers `Sa Seomra Ranga` as the printout title rather than `Sa Seomra Ranga — Bia agus Deoch`."*
- *"Apologise for the delay — life got in the way."*

Treat each item as a tracked requirement: decompose them into a numbered checklist, weave them into the email so it still reads as one continuous message in Damien's voice (not "canonical email plus tacked-on paragraph"), apply any doc-relevant ones to the Word doc, and in your final report list each item and exactly how it was honoured. If an extra conflicts with the canonical email tone spec below (e.g. Damien wants a warmer-than-usual opener for a teacher he knows well), Damien's extras win — but flag the override in the report so he can sanity-check it.

### What the Word doc must contain — strict spec

The doc is what pupils glance at on the board. Polished, professional, on-brand, sparing. A4 portrait. One page only.

In order, top to bottom:

1. **OLS crest** — centred, ~3 cm tall. Source: `~/Sites/ols-digital-skills/assets/crest.png`.
2. **Wordmark** — the text `OLS Digital Skills` centred under the crest. Georgia serif (or default serif if Georgia unavailable in `python-docx`), ~20 pt, colour `#1A3A6B` (OLS blue).
3. **Thin gold rule** — full-width or near-full-width horizontal line, ~0.75 pt, colour `#E4B824` (OLS gold).
4. **Activity name** — the human-readable activity title as it appears in the live activity's `<h1>` (or `<title>` if no h1). Centred, ~22 pt, bold, colour `#1A3A6B`. **No year group. No teacher name. No "Mr/Mrs/Miss". No "for Year 8". Just the activity title.**
5. **One short instruction line** — e.g. *"Scan the QR code, or visit the link below, to play."* Centred, ~11 pt, colour `#595959`.
6. **QR code** — large, centred, ~8 cm × 8 cm, error-correction level M or higher (Q is safer for projection). Encode the live activity URL exactly. Generate with Node's `qrcode` package (`require('qrcode').toFile(...)`) at a resolution that prints crisp (≥ 800 px square).
7. **Clickable URL** — centred under the QR, monospace (Courier New or default monospace), ~11 pt, colour `#1A3A6B`, underlined. **The displayed text is the URL itself** (e.g. `https://dgaj-g.github.io/ols-digital-skills/irish/sa-seomra-ranga/`) — never replaced with a label like "Click here" or "Visit the activity". The text is *also* a real Word hyperlink so that when the doc is opened in Word (or PDF-converted with hyperlinks preserved), clicking it opens the activity. This satisfies both modes: printable copy (the URL is readable text someone could type by hand) AND digital copy (the same text is hot). To add a Word hyperlink with `python-docx` you need to manipulate the XML directly — the docx skill knows the recipe, or use the standard `add_hyperlink(paragraph, url, text=url)` helper pattern.
8. **Footer band** — thin gold rule, then a small crest (~1 cm) and the text `OLS Digital Skills` side-by-side, centred, ~9 pt grey `#595959`.

**Do NOT put on the doc:** Damien's name, the teacher's name, year group, exam board, request ID, dates, "created by", any emojis.

Generate with **`python-docx`** (already installed via the new-Mac setup). Pseudocode is fine inside the session — the point is the artefact must match the spec. The Mendeleev access doc at `/Users/damiengartland/Desktop/Claude Work/Digital Skills Roadmap/0. Digital Skills Web Activities/Chemistry/Mendeleev_Cards_Access.docx` is the visual reference.

### What the email draft must say — tone guide

Damien's teacher comms are short, warm, professional. Match this register:

- **Greet with `Dear <FirstName>,`** — use the teacher's first name (extracted from the inbox issue's "Submitted by …" line). Not "Hi", not "Mrs X".
- **Lead with the result** in the first sentence — the activity is ready **for them to check**. Use the phrasing "is ready for you to check" (Damien's preferred wording — NOT "for your class to use", "for your pupils", etc.). Pattern: *"Just to let you know the bespoke web activity you requested for &lt;topic&gt; is ready for you to check."*
- **Give them the website link** on its own line. Write it as the URL itself in plain text — when Damien pastes the draft into Outlook, Outlook auto-linkifies it, so the recipient sees the URL displayed as a clickable link. Never replace the URL with label text like "Click here" — teachers don't all know what URL means, so the visible web address is what they need.
- **Mention the attached printout** — use this wording: *"I've attached a printout with a QR code and the website link on it, so you can display it on the board or print it, or share it however suits you. Pupils don't need to log in, they just scan or click and they're in."* (Damien's preferred phrasing — "display it on the board or print it", NOT "pop it up on the board".)
- **If the PR's "Notes for review" flagged anything that affects the teacher** (e.g. "uilleann pipes categorised as Wind, not Reed — let me know if you'd prefer the alternative"), mention it in one short sentence so they're not surprised.
- **Ask them to test on both a computer and a smartphone** — this is a STANDING line in every handoff email (not activity-specific). Use this wording, near the end just before the closing line: *"When you get a chance, you need to try the activity on both a computer and a smartphone, just to be sure it works smoothly on each, and come back to me if anything does not look right on either."*
- **Close with this exact line** — *"Please review it and let me know if there is anything that needs changed or isn't working the way you expected."* Use it verbatim. Do not paraphrase ("have a play with it", "give it a try", etc. — Damien does not use these).
- **Sign off** on two lines exactly:
  ```
  Kind regards,
  Damien
  ```

Save as a `.md` file with:
- Line 1: `Subject: ` followed by the subject.
- Blank line.
- Body — short paragraphs, plain text, no markdown formatting beyond paragraph breaks. The URL goes on its own line, no backticks, no `<>`, no `[link](...)` wrapping (Outlook auto-linkifies bare URLs on paste).

**Put the whole email on the clipboard in one go — standing handoff (do this on every `/publish`).** Copy the entire email to the macOS clipboard as a single block, with the `Subject: ` **label stripped** so the subject text sits as the **first line above the body**. Damien pastes once and splits the subject off into Outlook's subject field himself. Do **not** include the literal word `Subject:` (he doesn't want to delete it), and do **not** hand the subject and body over as two separate copies.

```bash
s=$(head -1 "…/<Activity_Slug>_email.md"); { printf '%s\n' "${s#Subject: }"; tail -n +2 "…/<Activity_Slug>_email.md"; } | LC_CTYPE=en_US.UTF-8 pbcopy
```

That places: the subject text, a blank line, then the body — all on the clipboard in one paste. Tell him it's ready to ⌘V. Never make him copy the email by hand. (Standing clipboard-handoff preference.) **The `LC_CTYPE=en_US.UTF-8` prefix is mandatory** — teacher emails routinely contain accented names (Roisín) and fadas; without it they paste into Outlook as mojibake (`Rois√≠n`). See the clipboard-handoffs note in Step 0.

**Don't use:** "Best wishes", "Please find attached", "I hope this email finds you well", em-dashes, exclamation marks (one is OK in the opener if it lands naturally — never more than one), emojis.

**Example shape** (do not copy verbatim — adapt to the actual activity):

```
Subject: Your "Sa Seomra Ranga" activity is ready

Dear Roisin,

Just to let you know the bespoke web activity you requested for Sa Seomra Ranga is ready for you to check.

The link is:
https://dgaj-g.github.io/ols-digital-skills/irish/sa-seomra-ranga/

I've attached a printout with a QR code and the website link on it, so you can display it on the board or print it, or share it however suits you. Pupils don't need to log in, they just scan or click and they're in.

When you get a chance, you need to try the activity on both a computer and a smartphone, just to be sure it works smoothly on each, and come back to me if anything does not look right on either.

Please review it and let me know if there is anything that needs changed or isn't working the way you expected.

Kind regards,
Damien
```

### Slug conventions

- **Department folder** — title case with spaces preserved: `Chemistry/`, `Music/`, `RE/`, `Irish/`, `Sports Science/`. Match an existing folder if one exists.
- **Activity slug for the filenames** — title case, underscores, no spaces, derived from the activity's on-screen title. e.g. `Sa_Seomra_Ranga_Access.docx`, `Mendeleev_Cards_Access.docx`, `Irish_Traditional_Instruments_Access.docx`. Keep it short — drop "An / The / A" prefixes if it helps.

### Don't commit the handoff package to the public repo

These files contain the teacher's email address (in the `_email.md`). They live in Claude Work, never in the public `ols-digital-skills` repo. Don't `git add` them.

### Merge mechanics (the details)

- Use **`gh pr list --repo dgaj-g/ols-digital-skills --search "Closes dgaj-g/ols-digital-skills-inbox#<N>" --state all`** to find the PR — search across all states so we also find already-merged ones.
- If the PR is a **draft**, mark it ready first (`gh pr ready <PR-N>`) then merge.
- Merge with **`--squash --delete-branch`**. Squash keeps `main` history tidy (one commit per delivered activity); delete-branch tidies up the draft branch since it's done.
- After merging, **poll the live URL** with `curl -s -o /dev/null -w "%{http_code}" <URL>` every 10 s until it's 200, with a ~3-minute ceiling. If it's still not 200 after 3 minutes, continue but flag it in the report — Pages occasionally lags, and Damien should re-check before sending the email.
- The "Closes dgaj-g/ols-digital-skills-inbox#<N>" trailer in the PR body auto-closes the inbox issue on merge — no manual close needed.

### What /publish reports back

After everything's done, Damien sees in chat:

- **Live URL** (plain text on its own line, clickable in his terminal)
- **Word doc path** (absolute path under Claude Work)
- **Email draft path** (absolute path under Claude Work)
- **Whole email on the macOS clipboard in one paste** — subject text as the top line (no `Subject:` label) above the body; he pastes once and moves the subject into the subject field himself
- **Email subject + body inlined** in the chat so he can copy-paste without opening the file if he prefers — useful when he's mobile or away from the file system
- **Any flag** worth surfacing (e.g. "Pages took >3 min — re-check before sending")

Plus a `PushNotification`: `Published: <Topic>. Live + handoff ready in Claude Work/<Dept>/.`

---

## Login-gated collaborative activities (the "class board" capability)

Some requests want pupils to **sign in, save their own work, be scored/tracked, and have the teacher manage classes and see results** — not just interact with a fixed activity. There are now **three reference builds** for this; start from whichever is closer and reuse its code rather than building from scratch:

- **Collaborative class board** — **Government & Politics — The US Constitution Diagram** (`government-politics/constitution-diagram/` on github.io + a server package in Claude Work). Pupils build up shared notes over a course. The first login-gated build.
- **Login-gated assessment / competition with a full teacher admin** — **Girls Coding with Confidence — Computational Thinking Challenge** (a one-off, in Claude Work at `0. Digital Skills Web Activities/GG/`, `challenge/` + `server/`). This is the richer reference: **named class boards (create / select / delete), per-class link + in-page QR, a passcode-gated teacher dashboard with per-pupil results, per-class comparison, filters, question-performance analytics, CSV export, and clear-per-class**, plus server-authoritative scoring/timer/ranking and one-attempt-per-pupil. **When a brief needs a teacher admin section, class management, shareable links/QRs, or stats, copy from GG** — the server (`GG/server/Code.gs.template`), the assembler (`GG/server/build-pathb.js`), and the front-end transport/dashboard (`GG/challenge/script.js`) are the starting point.
- **Login-gated platform WITH collaborative groups (teacher-controlled hidden/reveal)** — **Chemistry — Isotope Lab** (`chemistry/isotope-snap/`, server in-repo at `chemistry/isotope-snap/server/`). Adds a **groups** layer on top of the GG-style class board: the teacher creates groups, **auto-shuffles** the class into N groups, or **drag-assigns** pupils; each group is also a team (members' XP sums to a team total). Crucially, a teacher **reveal toggle** controls visibility — by default pupils know their group but **not who is in it** until the teacher reveals member names. Data model: pupils carry a `GroupId`; the class's group list + a `reveal:<class>` flag live in Config; `apiMyGroup` returns names only when revealed. **When a brief wants pupils grouped/teamed — especially "they shouldn't see who they're working with until I say" — copy the groups subs from `chemistry/isotope-snap/server/Code.gs.template` and the staff/My-Group UI from its `staff.js`.**
- **Workspace project builder (generates the pupil's project in HER OWN Drive)** — **French — Mon Carnet de France** (`french/mon-carnet-de-france/`, everything in the repo including `server/`). Guided stations + a one-button **Google Doc generator**, multi-teacher class ownership, Sheet-free storage, in-app screenshot guide decks. **When a brief is "turn our existing departmental project into a guided digital experience", copy from Mon Carnet** — see the dedicated section "**Workspace project builders**" right after this one.

Read this whole section before attempting another login-gated build.

### The three delivery tiers — pick the lightest that meets the brief

1. **Offline / standalone** (default, what most activities are). Pure github.io, work auto-saved to `localStorage`. Single user, no accounts, no server. This is always built and is what `/publish` ships.
2. **Path A — anonymous shared board.** A Google Apps Script web app (deployed "Anyone") the github.io page calls by **JSONP** (a `<script>` tag — the only cross-origin transport that reliably works to Apps Script). Pupils type a name; a per-browser id keeps their work theirs; the class link is shared via Classroom. No real sign-in gate. Superseded by Path B when identity matters, but kept as the lighter option.
3. **Path B — login-gated board (RECOMMENDED for anything involving pupil identity).** The activity is **served by Apps Script itself** (HtmlService), so the page and the data are same-origin. Pupils sign in with their school Google account; they are identified by their **verified email**; work follows them to any device; no impersonation; a real sign-in gate. **Data stays inside the school's own Workspace.** This is the gold standard and what the rest of this section documents.

### Path B architecture (the bits that are non-obvious)

- **Hosting:** the bound script of a Google Sheet returns the activity via `HtmlService.createTemplateFromFile('Index').evaluate()`. Deploy as a **Web app, Execute as: Me, Who has access: Anyone within your domain** — that last setting *is* the sign-in gate (Google enforces it).
- **Identity:** `Session.getActiveUser().getEmail()` returns the **accessing pupil's** verified email (not the owner's) under "Execute as: Me" within-domain.
- **Display name — AUTO-READ from C2k (proven 14 Jun 2026), prefer this over asking pupils to type it.** Under **"Execute as: User accessing"** with the `userinfo.profile` scope declared in `appsscript.json`, the server can read the pupil's real name with **zero typing**:
  ```js
  var resp = UrlFetchApp.fetch('https://openidconnect.googleapis.com/v1/userinfo',
    { headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() }, muteHttpExceptions: true });
  // 200 -> { given_name, family_name, name, email }
  ```
  **Pupils return their FULL first name** (e.g. "Anya"); **staff return an initial** (e.g. "D Gartland"). `apiWhoAmI` returns the name so the front-end skips the name form. Caveats: it returns the **token owner's** name, so it needs **execute-as-user** (token = pupil) → use the **ScriptProperties** storage model (below), not the Sheet/execute-as-me model. There's a **one-time per-pupil Google consent** (a C2k admin can pre-trust the OAuth client to remove it). Keep "type-once name, prefilled from the email" as the fallback if userinfo ever returns blank. Earlier failures used the auto-granted *contacts* scope (returns no name) — the **profile** scope is the fix. Reference build: `chemistry/isotope-snap/server/` (`autoName_()` + manifest). Full notes: memory `reference_c2k_name_extraction`.
- **Storage when execute-as-user:** a shared Sheet would need sharing to every pupil, so use **`PropertiesService` ScriptProperties** instead (Mon Carnet model): per-pupil key `p:<class>:<email>` (JSON record), class registry + groups + reveal flags as their own keys; cross-pupil reads (leaderboard/dashboard) enumerate keys by `p:<class>:` prefix; `LockService` on writes. (Under execute-as-Me you can keep the Sheet model — but then you can't auto-read the name.)
- **Transport:** the page talks to the server with **`google.script.run`** (same-origin RPC — no CORS, carries the session). The front-end stays ONE codebase across all three tiers via a pluggable transport: a `window.OLS_TRANSPORT.call(params)` shim (defined only in the HtmlService page) routes through `google.script.run`; when absent (github.io) the same `jsonp()` falls back to JSONP / offline. Search `OLS_TRANSPORT` in `script.js`.
- **The sandbox gotchas (these will bite you):** the HtmlService page runs in a **sandboxed iframe on `googleusercontent.com`**, so it **cannot read its own `/exec` URL or the `?class=` query parameter**, and JS `location.href = …` navigates the *iframe*, not the tab. Fixes, all in the reference build:
  - `doGet(e)` captures `e.parameter.class` and `ScriptApp.getService().getUrl()` and injects them into the page via a template scriptlet → `window.OLS_BOOT = { classCode, baseUrl }`. The client reads the class and builds links from `OLS_BOOT`, never from `location`.
  - "Go to class" navigates the whole tab with a programmatically-clicked `<a target="_top">` (set `<base target="_top">` in the page head too).
  - Templating safety: `createTemplateFromFile` evaluates `<? ?>`/`<?= ?>`, so the assembled page must contain **no stray `<?` or `?>`** (grep the bundle; the reference build's CSS/JS/QR-lib are all clean).
- **Data model:** a Google Sheet with a **Data** tab (`Year, Class, Email, Name, NodeId, FieldKey, Text, Colour, Updated` — `Year` is legacy/unused) and a **Config** tab (`staffPasscode`, `classes` JSON registry, and `name:<email>` rows). Boards are keyed by **named class**. Concurrent writes use `LockService`.
- **Class management (staff panel):** a passcode (validated **server-side**, never just hidden in the page) unlocks a dropdown of classes → **Copy link / Show QR / Go to class / Delete class**, plus **Add a class**. Each class is its own board via `…/exec?class=NAME`. There is no "academic year" — the class name carries the year (e.g. `L6Po26`), a new year is a new class, and clearing last year is just **Delete class**. The teacher can always get back in from **any** board's Staff button or the bare `/exec` (the `default` board), so there is no lock-out.
- **QR codes:** generated **in-page** by a vendored, esbuild-bundled **node-qrcode** (`qrcode.min.js`, MIT) — never a third-party QR service, so the link never leaves the Workspace. `QRCode.toCanvas(...)` in OLS blue.
- **Modal stacking:** dialogs opened *from* the staff panel (Delete confirm, QR popup) need a **higher z-index** than it (`#confirm-modal`, `#qr-modal` are `z-index: 500` vs the panel's `300`).

### Login-gated UX standard — MANDATORY (match the Isotope Lab bar)

Every login-gated build (anything that signs pupils in and reads/writes the server) **must** ship these — they are the standard, not polish-if-time, because a teacher demoing on a board judges the whole thing by them. Reference implementation: `chemistry/isotope-snap/` — copy it rather than reinventing.

1. **Zero-typing sign-in + a guard screen.** When auto-name is available (execute-as-user + the `userinfo.profile` scope, above), pupils **NEVER type their name**. On load, show a **"Getting your details…" guard screen** (spinner — `#signin-loading` + `.spinner`) while `whoami` resolves; **never flash the empty name form**. Reveal the type-once form **only as a fallback** if `whoami` returns no name. Pattern: `app.js` `startSignIn`. (Flashing the form for the 1–2s round-trip is a bug to fix, not ship — it was caught on the first Isotope Lab deploy.)

2. **Eye-catching wait feedback on EVERY server call (reads AND writes).** `google.script.run` round-trips take ~1–3s live (userinfo fetch, ScriptProperties reads, Sheet writes), so a teacher clicking Unlock / opening Results / adding a class always sees a beat. **Bland grey "Loading…" text is NOT acceptable** (it was rejected on sight). Use a **prominent pulsing GOLD card with a spinner and bold OLS-blue "…this can take a moment" text** (`.panel-loading` + `.panel-spinner` in `style.css`; `busyStatus()` in `staff.js`). Apply it to sign-in, teacher unlock (button → "Checking…", disabled), dashboard/results, groups, leaderboard, my-group, **and every mutation** (add/delete class, add/auto/assign/reveal groups → disable the button + show the busy card, then a brief confirmation). No silent beats anywhere.

3. **The dialog + admin aesthetic is the house standard.** Isotope Lab's `.ols-modal` / `.ols-modal-card`, the `Lab.confirm()` modal (two-tap; **never** native `confirm()` — unreliable in the sandboxed iframe), the QR popup, and the `.staff-*` teacher panel (tabbed Classes / Results / Groups, glass cards, brand colours) are the **reference aesthetic for all teacher-admin UIs and message boxes** — match them, don't reinvent a plainer look.

4. **Every button must be readable on its background.** Ghost buttons inside light modals/panels need dark-on-light text (white-on-transparent is for the dark header / mode-bars only). Default ghost buttons dark-on-light and override to white **only** in the dark header/mode bars (see `chemistry/isotope-snap/style.css`). Eyeball every button on a rendered screenshot — white-on-white Cancel/Copy buttons shipped twice before this rule.

### The build process — one source, an assembled server page

The activity is authored **once** as the normal github.io build. The Path B page is **assembled by a script** (`/tmp/ols-build-<N>/build_pathb.js` in the reference build), which: inlines the shared + activity CSS, the body HTML, the QR lib, the `OLS_TRANSPORT` shim and `script.js`; injects the `OLS_BOOT` scriptlet; rewrites relative asset paths (e.g. the crest) to **absolute github.io URLs**; and drops the intro loader.

**Intro video on a Path B page (OLS builds):** the OLS intro is **mandatory** on OLS activities, and it CAN run on an Apps-Script-served page — you just can't host the `.mp4` in the project, and the relative `../../assets/` path won't resolve from `googleusercontent.com`. So keep the video on **github.io** (`/assets/intro.mp4` + `/assets/intro-portrait.mp4`) and have the assembler **inline the intro-loader and point the `<video>` at the ABSOLUTE `https://dgaj-g.github.io/ols-digital-skills/assets/intro*.mp4` URLs** (the same absolute-URL rewrite already used for the crest); the portrait/landscape auto-pick still works, autoplay is muted, and the loader degrades gracefully if blocked. **Verify it on the live deployed page** (cross-origin video autoplay inside the sandboxed iframe is an Apps-Script-specific unknown — the crest image already loads this way, so video should too). The GG reference assembler *strips* the intro because GG was non-OLS; an OLS build re-adds it. **Re-run it after any activity change** and re-paste the output. The two deploy files are:
- **`PathB_Code.gs`** — the server (doGet template + `apiWhoAmI/apiLoad/apiSave/apiMyName/apiAdmin` for `google.script.run`).
- **`PathB_Index.html`** — the assembled activity page (the Apps Script project's `Index` HTML file).

These, plus the recipe and DPO note, live in **Claude Work / `<Dept>` /** — **never in the public repo** (they're operational, and the recipe/DPO doc reference the teacher). Big files go **straight onto the clipboard** with `pbcopy < "…/Index.html"` then the teacher hits ⌘V (this is Damien's strong preference for ALL code/file handoffs — never dump code in chat for manual copying; don't open these in TextEdit, it mangles the encoding).

### Gotchas the GG build added to the canon (do these from the start)

These cost real back-and-forth during the GG deploy. Bake them in next time:

- **Emit the deploy files as PURE ASCII.** Pasting a large UTF-8 file into the Apps Script editor + serving via HtmlService can corrupt smart quotes, em-dashes, accented names (Méabh) and emoji into mojibake (`’` → `,Äô`). The assembler must escape every non-ASCII char to a safe escape the browser restores — `\uXXXX` inside JS, `&#NNN;` inside HTML — and **refuse to write a file containing a raw non-ASCII byte** (guard). See `GG/server/build-pathb.js` (`asciiJs` / `asciiHtml` / `guardAscii`). Question text/accents survive because they travel as real Unicode over `google.script.run` and render in the UTF-8 page.
- **Store Sheet data as PLAIN TEXT (`setNumberFormat('@')`).** Google Sheets silently coerces values like `June-2026` or `10/2` into **dates** on write, so a later string match on the class name fails (`findRow_` returns null → crash). Set the Results range to text in `initBoard`, and write new rows with `getRange(...).setNumberFormat('@').setValues([...])`, not `appendRow`.
- **Coerce everything to primitives before returning over `google.script.run`.** A stray Date/object in a return value makes the RPC fail silently (looks like a wrong passcode / dead button). `String(...)`/`Number(...)` every field; wrap per-row processing in try/catch and skip bad rows.
- **Make the staff passcode forgiving** — compare `trim().toLowerCase()` both sides, so case/whitespace never bounces a correct passcode. Validate **server-side**.
- **Every `google.script.run` call needs a `.catch`** on the client so a server error shows a message and re-enables the control, instead of a button that hangs forever.

### Keep a registry of the deployed `/exec` URLs

The teacher generates the `/exec` URL at deploy time inside Apps Script — Claude **cannot** know it unless it's recorded somewhere readable. So whenever a login-gated activity is deployed, **capture its `/exec` URL into `docs/deployed-apps.md` in this repo** (name, description, URL, owner, date). Because that file is committed, any future session can `git pull` and answer "give me the link for the Government & Politics activity". The `/exec` URL is **not secret** (the within-domain sign-in gate protects the data), so it lives safely in the public repo. The only way Claude learns a URL is the teacher pasting it in — at which point Claude adds it to the registry.

### Prove the C2k-specific unknowns BEFORE building (probe-first)

C2k is a locked-down managed Workspace. Don't assume — prove each unknown with a tiny probe Damien deploys, exactly as we did:
1. **Apps Script + domain deploy work, and the script can read identity** — a one-line `doGet` returning `whoami` JSONP that shows the signed-in email.
2. **`getActiveUser` returns the *accessing* user, not the owner** — an HtmlService probe opened **in a second account (incognito)**; "Active user" must show *that* account. This is the make-or-break for Path B and a same-account test cannot prove it.
Only build the full thing once the probes pass. (The OAuth/Google-Identity-Services route is the *other* way to get identity on github.io, but it needs a Google Cloud project C2k may block — prefer the HtmlService same-origin route, which needs none.)

### GDPR / safeguarding posture (this is real, ETI cares)

- **Names + sign-in-gated + in-Workspace is the clean answer**, and it's what makes it lightweight to deploy: verified pupils, no third-party processor, no new international transfer, consistent with Classroom/Docs the school already uses. Pseudonyms were considered and dropped once the sign-in gate made real names safe; **never store pupil passwords** (a homemade password store is a safeguarding trap — refuse it and offer login-gating or tap-to-rejoin instead).
- **Retention:** data is per-named-class; "Delete class" wipes it; default practice is delete at year end. Generate a **one-page DPO summary** (what's stored, where, access, retention) for every login-gated build — see `DPO_Summary.md` in the reference build.
- **Handover to the teacher:** transfer the Sheet's ownership within the domain; the teacher re-deploys once from their account (new `/exec` URL, shared via Classroom); the github.io offline version is the always-available fallback. Steps are in `PathB_Deployment_Recipe.md`.

### Effort and honesty

A login-gated board is a **large** add-on (server + assembled page + staff panel + the deploy/handover loop), and the live sign-in flow can only be verified against the teacher's deployed endpoint — so the rhythm is **build → they deploy → verify together**, across several exchanges. Say so up front, and never imply background work between turns.

---

## Workspace project builders — the app writes the pupil's project INTO her own Drive (the "Mon Carnet" capability)

Some requests aren't a self-contained game at all — they're an **existing departmental project** (a brief the teacher already sets every year, often as a Word doc) that we turn into a guided, login-gated experience which **generates each pupil's actual project document in her own Google Drive**, ready to polish and submit through the school's normal route (Google Classroom / a Google Site). The pupil plays through one interactive **station per section of the brief**, types her own words at each one, and a single button collates everything into a formatted Google Doc **first draft** — hers, in her Drive, auto-shared with her teacher, filed into a portfolio folder.

**Reference build: French — "Mon Carnet de France"** (J1 "La Belle France" culture project). Everything is in this repo at `french/mon-carnet-de-france/`: the activity (`index.html` / `style.css` / `script.js`), the verified content + image provenance (`content-pack.json`), the server (`server/Code.gs.template`), the assembler (`server/build-pathb.js` → generated `server/Code.gs` + `server/Index.html`), and the complete build history with every decision and why (`HANDOVER.md`). Read the login-gated section above first — this pattern is **Path B plus the deltas below**. Reuse the Mon Carnet code; do not rebuild from scratch.

### Pitching it to a requesting department (the intake checklist)

This pattern sells itself to any department with a traditional homework project. What to collect from the teacher before building:

1. **The project brief itself** — the actual document they hand out. Its fixed sections become the stations 1:1 (don't invent a different structure; the teacher's marking habits are built around theirs).
2. **Year group + class structure** — which classes, and **which teacher runs which class** (the multi-teacher model below auto-shares each pupil's Doc to *her* class's owning teacher).
3. **The submission route** — what pupils hand in (a Doc? a Google Site built from the Doc? Classroom assignment?). This decides which guide decks to build (see below).
4. **Content to verify** — every fact, image, and example we'll bake into the stations gets fact-checked and licence-checked into a `content-pack.json`, then **signed off by Damien before building** (cities/dishes/people in the French build all went through this, including an ETI-risk roster swap).
5. **The hand-holding level** — these briefs usually involve non-technical teachers and young pupils; default to *total* hand-holding (screenshot guide decks, no jargon, no video — YouTube is blocked on C2k).

### The architecture delta vs classic Path B (this is the important bit)

- **Deploy as "Execute as: USER ACCESSING the web app"** — NOT "Execute as: Me" like the class boards. This is what makes `DocumentApp.create()` land the Doc in the **pupil's** Drive, owned by her. Identity still comes from `Session.getActiveUser().getEmail()` (returns the pupil's verified email under within-domain deploy — proven on real C2k pupil accounts).
- **No Google Sheet at all.** Under execute-as-user a shared Sheet would need sharing to every pupil. Instead:

  ```js
  function draftKey_(cls) { return 'draft:' + cls; }                    // UserProperties (per pupil, private)
  function pupilKey_(cls, email) { return 'p:' + cls + ':' + email; }   // ScriptProperties (shared)
  ```

  **Per-pupil drafts** (name, station progress, all typed content) live in `PropertiesService.getUserProperties()` — private to the pupil, follows her to any device. **Completion metadata for the teacher dashboard** lives in `PropertiesService.getScriptProperties()` — the one store a pupil-context call can write and a teacher-context call can read. Each pupil writes only her own key, so there's no write contention; registry mutations take `LockService`. This single insight is what makes execute-as-user viable with a dashboard.
- **The class registry also lives in ScriptProperties** (`classes` = JSON array of `{name, owner, created}`). `classOwner_(cls)` resolves which teacher gets shared on a pupil's Doc; global `teacherEmail` Script Property is the fallback.
- **Consent click-through:** pupils see Google's "unverified app → Advanced → continue" interstitial once. Harmless, but **ask a C2k admin to mark the app's OAuth client trusted before a whole-class rollout** to remove it.
- Everything else from classic Path B still applies: `doGet` injects `OLS_BOOT` (classCode, baseUrl) because the sandboxed iframe can't read its own URL; the `OLS_TRANSPORT` shim keeps one front-end codebase across Apps Script / github.io / offline; ASCII-only deploy files via the assembler; per-class links `…/exec?class=NAME`.

### The Doc generator

- **The CLIENT composes the Doc payload** (`composeDoc()` in `script.js`): a JSON spec — `{title, subtitle, checklist, skills, sections:[{heading, paras, bullets, placeholder}]}` — built from the pupil's saved station data. The server's `renderDocBody_()` just renders the spec generically. Two wins: the name maps and prose live in one place (the client), and **accents travel as real Unicode over `google.script.run`** so the ASCII-only server file never needs them.
- **Deletable guidance boxes** render as shaded 1-cell tables (right-click → Delete table): a gold "Make it brilliant" polish checklist (mirrors the marking criteria) and a blue "Show off your digital skills" formatting-tasks box. The renderer carries a hard-won lesson:

  ```js
  /* Paragraph.setText() returns void and ListItem has no setBold() - chaining
     either throws mid-render and aborts the whole Doc. Bold via editAsText(). */
  var title = cell.getChild(0).asParagraph();
  title.setText(String(box.title || ''));
  title.editAsText().setBold(true);
  ```

  (The chained version crashed the first live Doc *mid-render*, which also killed the share + foldering that came after it. Render first, then share/file.)
- **Auto-share + portfolio foldering, both best-effort with one retry.** A Doc that exists but didn't share is still a success — never let these block creation. Drive hiccups transiently (seen live: both steps failed once, identical rerun passed), so each is wrapped in a 2-attempt loop with `Utilities.sleep(600)` between. `ensureFolderPath_(['OLS Digital Skills', subject, yearGroup])` get-or-creates the nested path in the pupil's own Drive — reusable across every OLS app that generates files, so pupils build a portfolio over the years (`subject`/`yearGroup` are Script Properties).
- **Audit the invisible.** The share/file outcomes are invisible to the pupil, so `apiMakeDoc` logs them (`console.log` → Executions log) *and* persists them in the pupil's meta record (`shared: 'shared:teacher@…' | 'share-failed: …'`, `filed: 'J1' | 'file-failed: …'`). When a teacher says "I can't see X's Doc", the answer is one Script Properties lookup away.
- **Regeneration is non-destructive** — pressing Create again makes a NEW Doc, never touches the edited one.
- **UX during the build:** Doc creation takes 10–20 s — show a spinner + reassuring line ("Un instant…"). On failure show an **inline** message and re-enable the button; never `alert()` (a native popup exposing a raw `googleusercontent` URL terrifies an 11-year-old).

### The multi-teacher staff panel

Several teachers each run their own classes behind ONE shared passcode (validated server-side, trim/lowercase-forgiving):

- Each class is **owned by the teacher who created it** (verified email captured at creation). The panel shows **your own classes by default** with a "Show all teachers' classes" toggle (HOD view / cover). Delete is **owner-only** (unowned legacy classes deletable by any passcode holder) and **two-tap confirm** — native `confirm()` is unreliable inside the sandboxed iframe, so never use it.
- Per class: **Dashboard** (per-pupil stations + Doc links — the Doc opens for the teacher because it auto-shared at creation), **Copy CSV**, **Copy link**, **in-page QR** (vendored `qrcode.min.js`, never an external QR service).
- `realClass_()` canonicalises class codes **case-insensitively against the registry** so a hand-typed lowercase link can't silently split one class into two stores.
- Client robustness patterns worth copying (all in `script.js`, found by adversarial review): a sequence token on dashboard loads (stale async responses otherwise paint class A's pupils under class B's title), in-flight guards on Add/Unlock (double-Enter races), clipboard writes that fall back `navigator.clipboard` → hidden-textarea `execCommand` → show-the-text (the first is permission-blocked inside the iframe), and optimistic add/delete with surfaced reload failures.

### The guide decks (reusable screenshot walkthroughs)

`makeGuide(cfg)` in `script.js` is a **reusable card-deck engine** — swipe/chevrons/dots/Esc, one screenshot + title + plain-words step + a "✅ Your turn:" task per card. Instance it per guide with its own data array and assets folder:

```js
var docsGuide  = makeGuide({ dir: 'docs',  data: GUIDE_DOCS,  modal: 'docs-guide',  ... });
var sitesGuide = makeGuide({ dir: 'sites', data: GUIDE_SITES, modal: 'sites-guide', ... });
```

- The French build ships two: **"Mon guide Google Docs"** (7 steps: open → select → bold → colour → font → insert image → delete the boxes) and **"Mon guide Google Sites"** (12 steps: new site → name → editor → banner → text box → copy from the Doc → paste → upload the map → theme → preview → publish → hand in on Classroom). Build whichever decks match the department's submission route.
- **Screenshots must be REAL, captured on the C2k PUPIL test account** — under-18 EDU accounts show no Gemini UI, so adult-account shots show buttons pupils don't have. Cards degrade to a "Picture coming soon" placeholder until the images exist (`onerror` on the `<img>`), so the deck can ship before the capture session.
- **The images MUST be committed to MAIN**, not just the draft branch — the deployed app loads them from github.io, which serves main. (Bit us live: every station image 404'd on the deployed app while the preview looked perfect. Same rule for ALL assets a Path B app references.)
- The repeatable screenshot capture pipeline (Claude-in-Chrome staging + `screencapture` + sharp post-processing, with all its gotchas) is documented in `french/mon-carnet-de-france/HANDOVER.md` §12.2/§12.5, helpers in Claude Work `_mcdf_capture/`.

### Offline preview parity (review without deploying)

The `OLS_TRANSPORT` offline stub mimics **every** server call including `makeDoc` — which returns `{preview: true}` and the client renders the composed payload in a local **doc-preview modal** instead of a real Doc. The staff panel runs in a demo mode (passcode `demo`, two fake teachers, seeded classes) so ownership rules and the dashboard are reviewable on `localhost`/github.io. Damien reviews everything on the local preview **before** any deploy round-trip — keep this parity when extending.

### Deploy + handoff

The build→deploy→verify rhythm, the ASCII assembler, NEW-VERSION redeploys, `pbcopy` handoffs, and the probe-first rule are all as documented in the login-gated section. Additions for this pattern:

- **Probe list grows:** before building, also prove on a real pupil account that `DocumentApp.create()` lands in the pupil's Drive (no admin block on the pupil OU), `doc.addViewer(teacher)` grants, and `DriveApp` folder create/move works. (All proven for C2k on 2026-06.)
- `/publish` uses the **Path-B variant** (see Step 12): no QR Word doc, the email gives the `/exec` link, pupils sign in with school accounts, teacher uses the Staff panel for class links/QR and the dashboard. Record the `/exec` URL in `docs/deployed-apps.md`.

---

## Almost never refuse — build and flag instead

Damien wants a finished activity to review, not a blocked queue. So in almost every situation: **build your best interpretation, complete it, and flag the concern in the PR.** Examples:

- **Vague request** → build the most sensible activity the topic supports; flag the interpretation you chose.
- **Source files don't match the topic** → build from the form's text; flag the mismatch so Damien can re-supply files.
- **A fact you can't verify** → use the source's version, or omit that one claim; flag it for spot-checking.
- **Needs a paid API / external service** → build a fully client-side version that meets the same learning goal without it; flag the substitution.
- **Content not quite age-appropriate** → build a cleaned-up version pitched to the year group; flag what you adjusted.

**The only genuine hard stop** is if there is literally nothing to build from — no usable form description *and* no usable files at all. That should be vanishingly rare (the form makes the description required). Even then, don't leave the queue empty-handed: comment on the issue explaining precisely what's missing, and stop.

Every flagged concern goes in the PR's "Notes for review" so Damien sees a complete activity *and* an honest list of what to check or tweak.
