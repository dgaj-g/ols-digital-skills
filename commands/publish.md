---
description: Publish-and-handoff — merge the reviewed PR, wait for GitHub Pages, then generate the teacher's Word doc (URL + QR code) and a drafted email in Damien's style
---

The user has finished reviewing a built activity and is ready to ship it. This one command:

1. **Merges the draft PR** — this is the step that pushes the activity live to GitHub Pages.
2. **Waits for the deployment** to finish so the URL actually resolves.
3. **Generates the Word document** (`.docx`) — OLS-branded, activity name, big QR code, clickable URL. The teacher prints this / pops it on their board.
4. **Drafts the email** to the teacher in Damien's voice — short, professional, "Dear …" / "Kind regards" — that he pastes into Outlook, attaches the doc, and sends.

Damien only runs this *after* reviewing the activity in preview / on the branch. Running `/publish` IS his "yes, ship it" decision.

**The command argument is:** $ARGUMENTS

Parse the arguments:
- The **first token** is the **inbox issue number** (e.g. `13`).
- **Any text after the issue number** is **extra instructions from Damien** — things he wants folded into the handoff. Almost always these are for the **email to the teacher**: an extra paragraph about audio files he's planning to add, a note about something he tweaked, a thank-you for the teacher's patience on a tricky build, mentioning the QR-code printout differently for this particular teacher. Read every word; treat them as high-priority guidance sitting alongside the playbook's email tone spec. If they conflict with the playbook (e.g. he wants a different opener or sign-off for this specific teacher), Damien's extras win — but call out the override in your final report so he knows.
- If no number was given, run `gh issue list --repo dgaj-g/ols-digital-skills-inbox --state open --limit 20` AND `gh issue list --repo dgaj-g/ols-digital-skills-inbox --state closed --limit 10`, list both sets, and ask Damien which to publish.

**Handling extra instructions — do it rigorously:**
- Decompose them into a numbered checklist of discrete items, the same way `/build` does. Each instruction is its own tracked requirement.
- The **email draft is the natural home** for most extras. Read the existing playbook tone guide, then weave the extras in so the email still reads as one continuous message in Damien's voice — not the canonical email with extras tacked on.
- A few extras may also affect the **Word doc** (e.g. "use the teacher's preferred shortened title on the printout") — apply there if so.
- In your final report to Damien, **list every extra instruction and state, item by item, exactly how it was honoured.** If any item could not be applied, say so explicitly and why — never silently drop one.

**Read the full playbook first — do not skim it:**
`/Users/damiengartland/Sites/ols-digital-skills/docs/BUILD_PLAYBOOK.md`

The handoff specification lives under **"Post-merge — Step 12: the handoff package (`/publish`)"** in the playbook. That is the authoritative source for what the doc must look like, what the email must say, and where to save them. Follow it precisely.

In summary:

1. **Locate the PR** linked to inbox issue `<N>`. Use:
   ```bash
   gh pr list --repo dgaj-g/ols-digital-skills --search "Closes dgaj-g/ols-digital-skills-inbox#<N>" --state all --json number,state,isDraft,headRefName,mergeStateStatus
   ```
   You should find exactly one. If zero — STOP and tell Damien there's no PR for that issue. If more than one — list them and ask which.
2. **Branch on PR state:**
   - **Already merged** → skip to step 4. (Maybe Damien merged manually on GitHub.)
   - **Open + draft** → mark it ready, then merge:
     ```bash
     gh pr ready <PR-N> --repo dgaj-g/ols-digital-skills
     gh pr merge <PR-N> --repo dgaj-g/ols-digital-skills --squash --delete-branch
     ```
   - **Open + ready** → merge straight away:
     ```bash
     gh pr merge <PR-N> --repo dgaj-g/ols-digital-skills --squash --delete-branch
     ```
   - **Closed but NOT merged** → STOP and tell Damien — something's off (PR was closed without merge). Don't speculate.
3. **Wait for GitHub Pages to redeploy.** After merging, poll the live URL until it returns HTTP 200 (timeout at ~3 minutes — Pages usually finishes in 30–60 s):
   ```bash
   for i in {1..18}; do code=$(curl -s -o /dev/null -w "%{http_code}" "<URL>"); if [ "$code" = "200" ]; then echo "Live"; break; fi; sleep 10; done
   ```
   If after 3 minutes it's still not 200, continue anyway — Pages occasionally lags; flag it in the report so Damien knows to re-check before sending the email.
4. **Pull the facts you need from the inbox issue:**
   - Teacher's first name (from the "Submitted by … (…)" line at the bottom of the issue body)
   - Teacher's email address (same line — the `@c2ken.net` address) — for the email's `To:` line and Damien's records, but NOT for putting anywhere on the public doc
   - Department / Subject (from the Request details block)
   - Topic title (from the Request details block)
5. **Confirm the activity's on-screen name** by reading the activity's own `index.html` `<title>` and `<h1>` — that is what pupils see. Use this exact wording on the doc. If it disagrees with the issue's "Topic title", prefer the on-screen wording.
6. **Construct the live URL:** `https://dgaj-g.github.io/ols-digital-skills/<dept-slug>/<activity-slug>/` (matches the new directory the PR added under the repo root).
7. **Generate the Word doc** per the playbook spec — crest, "OLS Digital Skills" wordmark, activity name, big QR code, clickable URL displayed as the URL itself, brand footer. **No year group on the doc. No teacher name on the doc.** Save to the Claude Work department folder as `<Activity_Slug>_Access.docx`.
8. **Draft the email** per the playbook tone guide — `Dear <FirstName>,` / fixed closing line / `Kind regards,` then `Damien`. Save alongside the docx as `<Activity_Slug>_email.md`.
9. **Verify the QR code scans** — render it and open the doc to eyeball it. If the QR is fuzzy or the URL is wrong, redo.
10. **Report back to Damien** with:
    - The live URL (one line, plain text — clickable in his terminal)
    - The Word doc path (full absolute path)
    - The email draft path (full absolute path)
    - The email's subject + body inlined in the chat so he can copy-paste without opening the file if he prefers
    - Any flag (e.g. "Pages took longer than 3 min to come up — re-check before sending")

    Then send a `PushNotification`: `Published: <Topic>. Live + handoff ready in Claude Work/<Dept>/.`

**Don't ask permission to merge** — running `/publish` IS the permission. The exceptions where you stop: no PR found, multiple PRs found, or PR was closed without merging (step 2). Otherwise proceed end-to-end.
