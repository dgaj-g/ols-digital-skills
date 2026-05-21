# Build playbook — OLS Digital Skills

This is the durable, step-by-step process Claude follows whenever Damien types `/next` (or `/build <N>`) to turn a submitted request into a live activity.

**Two repos involved:**

- `dgaj-g/ols-digital-skills-inbox` (PRIVATE) — where Power Automate creates the request issue and stores file links. Source of truth for "what to build".
- `dgaj-g/ols-digital-skills` (PUBLIC) — where activities live. Source of truth for "what's live". Pages serves `main` from here.

**The flow at a glance:**

```
inbox issue
   ↓
parse + download files
   ↓
build activity in a draft branch on the main repo
   ↓
push + open PR
   ↓
Damien reviews + merges → activity goes live
   ↓
issue auto-closes (linked via "Closes" keyword in PR body)
```

---

## Step 1 — Find the next unbuilt request

```bash
gh issue list \
  --repo dgaj-g/ols-digital-skills-inbox \
  --state open \
  --json number,title,body,createdAt,labels \
  --limit 50 \
  | jq 'sort_by(.createdAt)'
```

Pick the **oldest open issue** that doesn't already have an associated PR in the main repo (check the issue body / comments for a PR link).

For `/build <N>`, skip this step and use issue `<N>` directly.

If there are no open issues, tell Damien: "No requests in the queue." Stop.

---

## Step 2 — Parse the issue body

The body has a predictable shape:

```markdown
## Request details
- **Department / Subject:** <dept>
- **Year group:** <year>
- **Exam board:** <board>
- **Topic title:** <topic>
- **Activity type preferred:** <type>

## What should the activity do?
<long-text>

## Source materials
- [filename1.pdf](onedrive-share-url)
- [filename2.docx](onedrive-share-url)

## Anything else
<long-text or empty>

---
*Request ID: <id>*
```

Extract every field. Note:
- **Activity type preferred** comes through as a JSON-stringified array (e.g. `["Drag-and-drop"]`). Parse it.
- **Source materials** can be 1-10 files; treat all of them.
- **Anything else** is optional — may be blank.

Some fields may have edge-case values like "Other" with a typed override — accept whatever Microsoft Forms returned.

---

## Step 3 — Download the source materials

Each "Source materials" link is an anonymous OneDrive share URL. Download each file:

```bash
mkdir -p /tmp/ols-build-<issue-number>/materials
cd /tmp/ols-build-<issue-number>/materials
# For each file URL:
curl -L -o "<filename>" "<share-url>"
```

If a download fails, retry once. If still failing, comment on the issue with the failure reason and stop. **Do not guess at content.**

---

## Step 4 — Read and synthesise

For each downloaded file:
- **PDFs** — use the Read tool with `pages:` parameter for anything over 10 pages.
- **Word docs (.docx)** — use the docx skill (`pandoc --track-changes=all <file> -o /tmp/file.md`).
- **PowerPoint (.pptx)** — use the pptx skill (`python -m markitdown <file>`).
- **Images** — use Read directly (multimodal).
- **Spreadsheets** — use the xlsx skill.
- **Audio/video** — note their existence but don't transcribe unless essential.

Synthesise the source material against the form's "What should the activity do?" instruction. Your job is to design an activity that:
1. Uses the source content for the factual basis.
2. Matches the HoD's described pupil experience.
3. Fits the preferred activity type (or, if "You decide", picks the most appropriate).

---

## Step 5 — Choose the activity pattern

Activity type options from the form map to these patterns:

| Form choice | Pattern | Mendeleev reference |
|---|---|---|
| **Drag-and-drop** | Sortable items with target slots. Pointer Events drag-drop. Snap on correct, bounce on wrong. | See `chemistry/mendeleev-cards/` for full reference |
| **Flashcards** | Tappable card flip with front (prompt) / back (answer). Shuffle, "got it" / "review later" actions. | New pattern |
| **Timeline** | Horizontal scroll timeline with clickable events. TimelineJS-style. | New pattern |
| **Quiz** | Multiple choice, immediate feedback, explanation on reveal. | New pattern |
| **Interactive diagram** | Image with clickable hotspots, info on click. | New pattern |
| **You decide** | Pick the best of the above based on the topic. Justify the choice in the PR description. | n/a |
| **Other** | Read what the HoD typed; build the closest matching pattern from the list above. | n/a |

Whatever pattern you pick, the **non-negotiables** are:

- **Pointer Events** for any input — works on mouse + touch + pen
- **`touch-action: none`** on draggable elements
- **No build step** — pure HTML/CSS/JS, opens from disk
- **OLS branding** — `#1A3A6B` blue, `#E4B824` gold, `#595959` borders
- Include `<script src="../../assets/intro-loader.js"></script>` just before `</body>`
- Include the activity footer:
  ```html
  <footer class="act-footer">
    <img src="../../assets/crest.png" alt="" class="footer-crest" aria-hidden="true" />
    <span>OLS Digital Skills</span>
  </footer>
  ```
- Tested at phone (375px), tablet (768px), and desktop (1280px+) widths
- No console errors

---

## Step 6 — Build

Create a new branch off `main` in the main repo:

```bash
cd ~/Sites/ols-digital-skills
git fetch origin main
git checkout main
git pull
git checkout -b draft/issue-<N>-<dept-slug>-<topic-slug>
```

Create the activity folder: `<department-slug>/<activity-slug>/`. Structure:

```
<department>/<activity>/
├── index.html
├── style.css
├── script.js
└── assets/    (optional — element images, audio, etc.)
```

Add the new activity to the hub `index.html` as a new dept-card.

Reference `../../style.css` for shared brand variables. Add activity-specific styles in the local `style.css`. Keep scripts simple — no frameworks.

---

## Step 7 — Test in preview

Use the Claude Preview tools to verify the activity works:

```bash
# Activity should already serve via the digital-skills server on port 8098
# (defined in /Users/damiengartland/Desktop/Claude Work/.claude/launch.json)
```

Then via Preview MCP:
1. `preview_start` with name `digital-skills`
2. `preview_eval` to navigate to the activity URL
3. `preview_resize` to test at 375 / 768 / 1280
4. `preview_eval` to simulate key interactions
5. `preview_console_logs` to verify no errors

Don't skip this step. Test at least:
- The activity loads with no JS errors
- The intro animation plays (or skips cleanly if autoplay blocked)
- Primary interaction works (drag, click, flip, whatever the pattern is)
- Layout is intact at phone width

---

## Step 8 — Commit + push + open PR

```bash
git add -A
git commit -m "Add <dept>: <activity-name>

Built from issue dgaj-g/ols-digital-skills-inbox#<N>.
<short description of the activity>.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
git push -u origin draft/issue-<N>-<dept-slug>-<topic-slug>
```

Open a PR in the main repo:

```bash
gh pr create \
  --repo dgaj-g/ols-digital-skills \
  --base main \
  --head draft/issue-<N>-<dept-slug>-<topic-slug> \
  --draft \
  --title "[BUILD] <Dept> — <Topic>" \
  --body "$(cat <<EOF
Builds the activity requested in dgaj-g/ols-digital-skills-inbox#<N>.

## Live preview
Once GitHub Pages rebuilds for this branch (~30s), the activity will be at:
https://dgaj-g.github.io/ols-digital-skills/<dept>/<activity>/

## What I built
<2-3 sentence description of the activity and how it matches the request>

## Confidence
- **High** / **Medium** / **Low** — and one-line justification.

## Notes for review
- <Any flag worth Damien noticing — e.g. an assumption I made, a part where I picked an interpretation, a fact I'd like spot-checked>

## Source material
- <Filename 1>
- <Filename 2>

Closes dgaj-g/ols-digital-skills-inbox#<N>
EOF
)"
```

The `Closes dgaj-g/ols-digital-skills-inbox#<N>` line is important — it auto-closes the inbox issue when Damien merges the PR.

Mark the PR as **draft** initially so Damien knows it's awaiting his review.

---

## Step 9 — Notify

Comment on the original inbox issue:

```bash
gh issue comment <N> \
  --repo dgaj-g/ols-digital-skills-inbox \
  --body "Built — see PR dgaj-g/ols-digital-skills#<PR-number>."
```

---

## Step 10 — Stop

Don't merge. Don't auto-publish. The PR sits in Damien's review queue until he merges.

If Damien comments on the PR with changes, address them on the same branch and push a follow-up commit. Don't open a new PR.

---

## Quality bar

Mendeleev's Cards (`chemistry/mendeleev-cards/`) is the bar. Read its `index.html`, `style.css`, and `script.js` as the reference for what "good" looks like in this repo.

If you can't match that bar, **say so in the PR description** rather than ship a weaker activity quietly.

## Things to refuse

- Any request whose content you can't verify against the source material — say so in a PR comment and ask Damien.
- Any request that would require external API keys or paid services.
- Any request where the uploaded files don't match the topic in the form (likely an HoD upload mistake).

In each case, comment on the issue explaining the block and stop.
