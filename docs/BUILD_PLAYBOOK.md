# Build playbook — OLS Digital Skills

The durable, step-by-step process Claude follows when Damien turns a submitted request into a live activity. Three entry points:

- **`/next`** — build the oldest open issue in the queue.
- **`/build <N> [extra instructions]`** — build a specific issue by number. Any text after the number is extra instructions from Damien that must be folded into the build as high-priority requirements alongside the issue's own content.
- **`/publish <N>`** — run *after* Damien merges the PR. Generates the teacher handoff package (OLS-branded Word doc with QR code + plain-text URL, and a drafted email in Damien's voice). See **Step 12** below.

**Read this whole file before doing anything.** Do not skim. Each request represents real, careful work by a teacher — the playbook exists to make sure that work is honoured precisely.

---

## The two repos

- `dgaj-g/ols-digital-skills-inbox` (PRIVATE) — Power Automate creates the request issue here and stores file links. Source of truth for "what to build".
- `dgaj-g/ols-digital-skills` (PUBLIC) — activities live here; GitHub Pages serves `main`. Source of truth for "what's live".

## The flow at a glance

```
inbox issue → orient → parse → download → read everything → restate the vision
→ build → test → push + draft PR → notify Damien → stop (Damien reviews + merges)
                                                              ↓
                                              /publish <N> → Word doc + email draft
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

## Post-merge — Step 12: the handoff package (`/publish`)

This step does **not** run inside a `/build` or `/next` session — those stop at Step 11. After Damien reviews and merges the PR, the activity is live on GitHub Pages. To get it into pupils' hands, Damien runs **`/publish <issue-number>`** in a fresh Claude Code session. That command produces two artefacts:

1. **`<Activity>_Access.docx`** — an A4 Word document the teacher prints, projects on the board, or shares as a PDF.
2. **`<Activity>_email.md`** — a short email drafted in Damien's voice that he pastes into Outlook, attaches the docx to, and sends to the teacher.

Both files land in the **department folder under Claude Work**, never in the public repo:

```
/Users/damiengartland/Desktop/Claude Work/Digital Skills Roadmap/0. Digital Skills Web Activities/<Department>/<Activity_Slug>_Access.docx
/Users/damiengartland/Desktop/Claude Work/Digital Skills Roadmap/0. Digital Skills Web Activities/<Department>/<Activity_Slug>_email.md
```

Use the existing department folder if one already exists (e.g. `Chemistry/`, `Music/`). Create a new title-case folder (`RE/`, `Irish/`, `Sports Science/`) if not. The Mendeleev precedent (`Chemistry/Mendeleev_Cards_Access.docx`) is the format reference.

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
- **Lead with the result** in the first sentence — the activity is ready.
- **Give them the website link** on its own line. Write it as the URL itself in plain text — when Damien pastes the draft into Outlook, Outlook auto-linkifies it, so the recipient sees the URL displayed as a clickable link. Never replace the URL with label text like "Click here" — teachers don't all know what URL means, so the visible web address is what they need.
- **Mention the attached printout** — say a QR code and the website link are on the page so they can pop it on the board or share it however suits them.
- **If the PR's "Notes for review" flagged anything that affects the teacher** (e.g. "uilleann pipes categorised as Wind, not Reed — let me know if you'd prefer the alternative"), mention it in one short sentence so they're not surprised.
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

**Don't use:** "Best wishes", "Please find attached", "I hope this email finds you well", em-dashes, exclamation marks (one is OK in the opener if it lands naturally — never more than one), emojis.

**Example shape** (do not copy verbatim — adapt to the actual activity):

```
Subject: Your "Sa Seomra Ranga" activity is ready

Dear Roisin,

Just to let you know the bespoke web activity you requested for Sa Seomra Ranga is ready for your class to use.

The link is:
https://dgaj-g.github.io/ols-digital-skills/irish/sa-seomra-ranga/

I've attached a printout with a QR code and the website link on it — pop it up on the board, or share it however suits you. Pupils don't need to log in, they just scan or click and they're in.

Please review it and let me know if there is anything that needs changed or isn't working the way you expected.

Kind regards,
Damien
```

### Slug conventions

- **Department folder** — title case with spaces preserved: `Chemistry/`, `Music/`, `RE/`, `Irish/`, `Sports Science/`. Match an existing folder if one exists.
- **Activity slug for the filenames** — title case, underscores, no spaces, derived from the activity's on-screen title. e.g. `Sa_Seomra_Ranga_Access.docx`, `Mendeleev_Cards_Access.docx`, `Irish_Traditional_Instruments_Access.docx`. Keep it short — drop "An / The / A" prefixes if it helps.

### Don't commit the handoff package to the public repo

These files contain the teacher's email address (in the `_email.md`). They live in Claude Work, never in the public `ols-digital-skills` repo. Don't `git add` them.

### What to do if /publish runs and the PR isn't merged yet

Stop. Tell Damien: *"Issue #N is still open / its PR is still draft — nothing live yet to publish. Merge first, then re-run."* Don't speculate-generate a URL that doesn't yet resolve.

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
