---
description: Build the next OLS Digital Skills request from the inbox queue
---

The user wants you to build the next unbuilt request in the OLS Digital Skills inbox queue.

**Read the full playbook first — do not skim it:**
`/Users/damiengartland/Sites/ols-digital-skills/docs/BUILD_PLAYBOOK.md`

The playbook is the authoritative process. In summary:

0. **Orient** — read the README, the shared `style.css`, the Mendeleev reference build (`chemistry/mendeleev-cards/`), and `intro-loader.js`. A fresh session needs this context.
1. **Find** the oldest open issue in `dgaj-g/ols-digital-skills-inbox`.
2. **Parse** every field of the issue body literally — extract a full requirements checklist.
3. **Download** the source materials (transform the SharePoint share URLs — see playbook Step 3).
4. **Read every download completely and carefully** — PDFs (including scanned/handwritten — OCR them), Word, PowerPoint, storyboard images (interpret every annotation), spreadsheets, audio (transcribe), video. The teacher's uploaded work is the activity's content; honour all of it.
5. **Restate the vision** and verify your plan honours every requirement. If the request is too vague or the source material is missing/contradictory — STOP, comment on the issue, and ask.
6. **Choose the activity pattern** (drag-drop, flashcards, timeline, quiz, interactive diagram, or your judgement).
7. **Build** in `~/Sites/ols-digital-skills/<department-slug>/<activity-slug>/` on a new draft branch. Pointer Events, OLS branding, intro-loader.js, brand footer, accessible, factually accurate.
8. **Test thoroughly** in Claude Preview — run the full QA checklist at phone/tablet/desktop widths.
9. **Push** and open a DRAFT PR using `Closes dgaj-g/ols-digital-skills-inbox#<N>`. The PR description must restate the teacher's vision, list the requirements checklist, give a confidence level, and flag anything for review.
10. **Notify** — comment on the inbox issue AND send a `PushNotification` so Damien knows it's ready.
11. **Stop.** Never merge or auto-publish — that's Damien's call.

**Quality bar:** Mendeleev's Cards (`chemistry/mendeleev-cards/`) is the reference. Match it.

**Before you start downloading and building**, show the user a one-screen summary:
- Which issue you found (number + title)
- The activity type you intend to build and why (one sentence)

Wait for the user to confirm before proceeding — they may want to redirect. After they confirm, work autonomously through to the PR and the push notification.

If there are no open issues, say "Queue's empty — nothing to build." and stop.
