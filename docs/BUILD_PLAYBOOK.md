# Build playbook — OLS Digital Skills

The durable, step-by-step process Claude follows when Damien turns a submitted request into a live activity. Two entry points:

- **`/next`** — build the oldest open issue in the queue.
- **`/build <N> [extra instructions]`** — build a specific issue by number. Any text after the number is extra instructions from Damien that must be folded into the build as high-priority requirements alongside the issue's own content.

**Read this whole file before doing anything.** Do not skim. Each request represents real, careful work by a teacher — the playbook exists to make sure that work is honoured precisely.

---

## The two repos

- `dgaj-g/ols-digital-skills-inbox` (PRIVATE) — Power Automate creates the request issue here and stores file links. Source of truth for "what to build".
- `dgaj-g/ols-digital-skills` (PUBLIC) — activities live here; GitHub Pages serves `main`. Source of truth for "what's live".

## The flow at a glance

```
inbox issue → orient → parse → download → read everything → restate the vision
→ build → test → push + draft PR → notify Damien → stop (Damien reviews + merges)
```

---

## Guiding principles (the spirit of this playbook)

1. **The teacher's request is sacred.** Every word in "What should the activity do?" and "Anything else" is a requirement, not a suggestion. If a teacher wrote "cards flip with a soft click", the cards flip with a soft click.
2. **Read everything, fully.** Not skim. A scanned page of handwritten notes gets OCR'd and read line by line. A storyboard sketch gets every arrow and annotation interpreted. A teacher's uploaded PowerPoint gets read slide by slide.
3. **Accuracy is non-negotiable.** These activities may be shown to pupils on a Promethean board in front of an ETI inspector. Every fact must be verifiable against the source material. Never invent content.
4. **When unsure, build your best interpretation — then flag it. Never halt to ask.** Damien wants a finished activity to react to, not mid-build questions. If something is ambiguous, make the most sensible decision, build the activity through to completion, and record every assumption and uncertainty in the PR description. Damien reviews the completed build and requests tweaks afterwards. A complete activity with honest flagged notes always beats a halted build with a question.
5. **Match the Mendeleev bar.** `chemistry/mendeleev-cards/` is the quality reference. If you can't match it, say so in the PR.

---

## Step 0 — Orient yourself

A fresh session has no context. Before touching the request, read these files so you understand the project, the brand, and the quality bar:

```bash
cd ~/Sites/ols-digital-skills
```

Read, in order:
1. `README.md` — repo structure and conventions
2. `docs/BUILD_PLAYBOOK.md` — this file (you're reading it)
3. `style.css` — the shared brand stylesheet (CSS variables, footer styles)
4. `chemistry/mendeleev-cards/index.html`, `style.css`, `script.js` — **the reference build.** This is what "good" looks like.
5. `assets/intro-loader.js` — the intro animation loader every activity includes

**Context you can rely on (the environment):**
- The repo is cloned at `~/Sites/ols-digital-skills`. `gh` CLI is authenticated as `dgaj-g`.
- A static preview server named `digital-skills` is defined in `/Users/damiengartland/Desktop/Claude Work/.claude/launch.json` (serves the repo on port 8098).
- Skills available: `pdf`, `docx`, `pptx`, `xlsx` — use them for reading those file types.
- Node global packages: `react`, `sharp`, `puppeteer`, `mermaid-cli`, `qrcode`, `highlight.js`. `ffmpeg` and `pdftoppm` are installed.
- `python3` is available; `NODE_PATH=$(npm root -g)` lets node scripts find global packages.

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
| **Audio (.mp3/.m4a/.wav/voice memo)** | A teacher may have recorded their explanation. Whisper is **pre-installed** on this Mac — transcribe with: `/Users/damiengartland/Library/Python/3.9/bin/whisper file.mp3 --model small --output_dir /tmp --output_format txt`. Then Read the produced .txt. Use `--model base` if you want it faster; `--model small` is the sensible default. Read the transcript in full — that's the teacher's voice in writing. |
| **Video (.mp4/.mov)** | Extract the audio (`ffmpeg -i file.mp4 -vn -acodec mp3 /tmp/audio.mp3`) and transcribe with Whisper as above for the verbal content. Sample frames (`ffmpeg -i file.mp4 -vf fps=1/10 /tmp/frame%03d.jpg`) and Read them multimodally for visual content (e.g. a teacher pointing at something). If the file is >300 MB, flag in the PR that you sampled rather than analysed exhaustively. |

For **each** file, write a short note: what it contains, and which part of the activity it informs. If a file seems unrelated to the topic in the form, flag it — it may be an upload mistake.

### Large files — handle them, don't skip them

The form allows up to 10 files × 1 GB each, so very large uploads are possible. Apply these rules, in this order:

1. **Always download every file.** Disk space on the Mac is not a concern for a single build.
2. **Chunked reading is the expectation for big text-bearing files.** The Read tool has a per-call cap of about 20 pages for PDFs, but the underlying file can be far larger. Read in chunks across multiple calls — don't give up because page-1 of a 200-page PDF doesn't show you everything. Focus on the topic the teacher named (use `Bash + grep` to locate relevant sections quickly, then `Read` those page ranges fully).
3. **Audio/video over ~10 minutes:** transcribe in full with Whisper — it's fast on the M5 — and read the transcript. But in the PR, note that you worked from the transcript, so the teacher can sanity-check specific timings if it matters.
4. **Files genuinely too big to analyse exhaustively** (e.g. a 1 GB raw lesson recording): read/transcribe what you reasonably can (the first 10-15 minutes of audio, the first chapter of a textbook scan, the most-annotated frames of a long video), build from that plus the form text, and **flag prominently in the PR** that the file exceeded practical full-analysis scope. State exactly what you read and what you didn't. This is the build-and-flag principle applied to size — never quietly skip content.
5. **If a download itself fails (network, malformed URL, file >2 GB):** flag in the PR that the file couldn't be retrieved and proceed with the form text + other files. Do not halt.

In every case the deliverable is a complete activity plus an honest record of what *was* read and what wasn't.

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

### Flashcards — reference: *(none yet — first build sets it)*
A deck of cards. Front = prompt/term, back = answer/definition. Tap/click flips the card (CSS 3D transform, smooth). Next/previous navigation; swipe on touch via Pointer Events. Shuffle. Progress indicator (e.g. "7 / 20"). Optional "got it" / "review again" sorting. Audio per card where the topic needs it (language pronunciation, music).

### Timeline — reference: *(none yet)*
Events on a chronological axis. Each event is a clickable marker; clicking opens a detail panel (date, headline, description, optional image). Drag to scroll the axis (Pointer Events). Collapses to vertical on narrow phones. Good for History, evolution-of-X topics.

### Quiz — reference: *(none yet)*
A sequence of questions. Multiple choice (or matching/true-false where it fits). Select → immediate feedback (correct/incorrect) + a short explanation. Score + progress tracking. End screen with score and a review of missed questions. Feedback must teach, not just mark.

### Interactive diagram — reference: *(none yet)*
A base image (labelled diagram, map, scene). Clickable hotspots positioned over it; clicking reveals a label + explanation. Offer an "explore" mode and, where it fits, a "find the X" challenge mode. Hotspots scale responsively with the image.

### You decide
Pick the pattern that best serves the topic and the described pupil experience. Justify the choice in the PR description.

### Other (teacher typed their own)
Read what they typed; build the closest fit from the patterns above, or a sensible hybrid. Explain your interpretation in the PR.

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
- **Real dragging (if the activity involves dragging):** the dragged element must follow the finger (on touch) or the cursor (on mouse) **continuously and in real time** — literal dragging, not a tap-source-then-tap-target substitute. **Never** use the HTML5 native drag-and-drop API (`draggable`, `dragstart`) — it is broken on touchscreens. See the Drag-and-drop pattern in Step 6 for the full requirement.
- **No build step:** pure HTML/CSS/JS. Must work opened from `file://` — use relative paths only, never absolute `/`.
- **Branding:** OLS deep blue `#1A3A6B`, gold `#E4B824`, borders `#595959`. Reference `../../style.css` for shared variables.
- **Intro animation — MANDATORY on every activity.** Every activity opens with the OLS crest particle-assembly animation, which then leads straight into the activity. You get all of this by including ONE line just before `</body>`:
  ```html
  <script src="../../assets/intro-loader.js"></script>
  ```
  `intro-loader.js` does everything automatically — do not rebuild or modify it:
  - It **auto-selects the right video for the device**: portrait phones get `intro-portrait.mp4` (1080×1920); everything else gets `intro.mp4` (1920×1080 landscape). The decision is made from `window.innerHeight > window.innerWidth` at load time. You do not write any orientation code — including the script is all that's needed.
  - **Timings are already correct and agreed — do not change them:** 3-second animation, then an 800 ms hold so the wordmark can be read, then a 450 ms fade into the activity.
  - It plays **once per browser session** (so a pupil doing several activities in a lesson only sees it the first time), has a **Skip** button, and a safety timeout so the activity is never stuck behind the overlay.
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

Two notifications:

1. **Comment on the inbox issue** so there's a trail:
   ```bash
   gh issue comment <N> --repo dgaj-g/ols-digital-skills-inbox \
     --body "Built — see PR dgaj-g/ols-digital-skills#<PR-number> for review."
   ```

2. **Send a push notification** so Damien knows it's ready even if he walked away:
   Use the `PushNotification` tool. One line, under 200 chars, lead with the actionable bit. Example:
   > `Built: <Dept> — <Topic>. PR #<N> ready to review in ols-digital-skills.`

   This pings his Mac terminal always, and his phone if Remote Control is connected.

---

## Step 11 — Stop

Do not merge. Do not auto-publish. The draft PR waits in Damien's review queue.

If Damien comments on the PR with changes: address them on the **same branch**, push a follow-up commit, re-test, and re-notify. Never open a second PR for the same request.

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
