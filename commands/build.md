---
description: Build a specific OLS Digital Skills request by issue number, with optional extra instructions
---

The user wants you to build a SPECIFIC request from the OLS Digital Skills inbox queue — not necessarily the oldest one.

**The command arguments are:** $ARGUMENTS

Parse the arguments:
- The **first token** is the GitHub issue number to build (e.g. `9`).
- **Any text after the issue number** is EXTRA INSTRUCTIONS from Damien — additional context, constraints, or guidance he wants folded into this build. Treat them as high-priority requirements that sit ALONGSIDE the issue's own content. If the extra instructions conflict with the issue body, Damien's extra instructions win — but call out the conflict in the PR.
- If NO issue number was given, run `gh issue list --repo dgaj-g/ols-digital-skills-inbox --state open` and show the user the open issues, then ask which one to build. Do not guess.

**Handling extra instructions — this matters, do it rigorously:**
- Extra instructions may arrive **in the command** (after the number) **OR as a reply when you pause for confirmation** (see the pre-build summary step below). Damien may give detailed, multi-paragraph instructions either way. Read every word — they are never too long to act on fully.
- **Decompose the extra instructions into a numbered checklist of discrete, individually-verifiable items.** Do not treat them as one vague blob. Each instruction becomes its own tracked requirement.
- Honour **every** item. Before opening the PR, go through the checklist and confirm each one is genuinely met in the built activity — not "mostly", actually met.
- In the PR description, **list every extra instruction and state, item by item, exactly how it was honoured.** If any item could not be fully met, say so explicitly and why — never quietly drop one.

**Read the full playbook first — do not skim it:**
`/Users/damiengartland/Sites/ols-digital-skills/docs/BUILD_PLAYBOOK.md`

The playbook is the authoritative process. In summary:

0. **Orient** — read the README, the shared `style.css`, the Mendeleev reference build (`chemistry/mendeleev-cards/`), and `intro-loader.js`. A fresh session needs this context.
1. **Use the issue number from the command arguments** (NOT the oldest). Fetch it with `gh issue view <N> --repo dgaj-g/ols-digital-skills-inbox --json title,body`.
2. **Parse** every field of the issue body literally — extract a full requirements checklist. Add Damien's extra instructions to that checklist as their own line items.
3. **Download** the source materials (transform the SharePoint share URLs — see playbook Step 3).
4. **Read every download completely and carefully** — PDFs (including scanned/handwritten — OCR them), Word, PowerPoint, storyboard images (interpret every annotation), spreadsheets, audio (transcribe), video. The teacher's uploaded work is the activity's content; honour all of it.
5. **Restate the vision** — including Damien's extra instructions — and verify your plan honours every requirement. If the request is too vague or the source material is missing/contradictory — STOP, comment on the issue, and ask.
6. **Choose the activity pattern** (drag-drop, flashcards, timeline, quiz, interactive diagram, or your judgement).
7. **Build** in `~/Sites/ols-digital-skills/<department-slug>/<activity-slug>/` on a new draft branch. Pointer Events, OLS branding, intro-loader.js, brand footer, accessible, factually accurate.
8. **Test thoroughly** in Claude Preview — run the full QA checklist at phone/tablet/desktop widths.
9. **Push** and open a DRAFT PR using `Closes dgaj-g/ols-digital-skills-inbox#<N>`. The PR description must restate the teacher's vision, note Damien's extra instructions and how they were honoured, list the requirements checklist, give a confidence level, and flag anything for review.
10. **Notify** — comment on the inbox issue AND send a `PushNotification` so Damien knows it's ready.
11. **Stop.** Never merge or auto-publish — that's Damien's call.

**Quality bar:** Mendeleev's Cards (`chemistry/mendeleev-cards/`) is the reference. Match it.

**Before you start downloading and building**, show the user a one-screen summary:
- Which issue you're building (number + title)
- Damien's extra instructions, **decomposed into your numbered checklist and restated in your own words**, so he can confirm you understood every item correctly
- The activity type you intend to build and why (one sentence)

Then **wait for the user to confirm.** This pause is also Damien's opportunity to ADD detailed instructions he didn't put in the command — if he replies with further instructions instead of a plain "yes", treat that reply as extra instructions of equal priority: decompose it into the checklist, restate it, and confirm again before building. Only once he has clearly approved should you proceed.

After approval, work autonomously through to the PR and the push notification.
