---
description: Post-merge handoff — generate the teacher's Word doc (URL + QR code) and a drafted email in Damien's style
---

The user wants you to generate the **handoff package** for a request that has already been built AND merged. This runs *after* the PR is merged — the activity is live on GitHub Pages — and produces two artefacts for Damien to send to the teacher:

1. A polished **Word document** (`.docx`) — OLS-branded, activity name, big QR code, plain-text website link. The teacher prints this / pops it on their board / hands it out.
2. A **drafted email** to the teacher in Damien's voice — short, warm, professional — that he can paste into Outlook, attach the doc, and send.

**The command argument is:** $ARGUMENTS

The first token is the **inbox issue number** (e.g. `11`). If no number was given, run `gh issue list --repo dgaj-g/ols-digital-skills-inbox --state closed --limit 20` and ask Damien which one to publish — only closed-via-merge issues qualify.

**Read the full playbook first — do not skim it:**
`/Users/damiengartland/Sites/ols-digital-skills/docs/BUILD_PLAYBOOK.md`

The handoff specification lives under **"Post-merge — Step 12: handoff package"** in the playbook. That is the authoritative source for what the doc must look like, what the email must say, and where to save them. Follow it precisely.

In summary:

1. **Verify the request was merged.** Run `gh issue view <N> --repo dgaj-g/ols-digital-skills-inbox --json state,closed,closedByPullRequestsReferences` — confirm `state == "CLOSED"` and there's a linked merged PR in `dgaj-g/ols-digital-skills`. If it's still open or the PR is still draft, STOP and tell Damien — he needs to merge first.
2. **Pull the facts you need from the inbox issue:**
   - Teacher's first name (from "Submitted by … (…)" line at the bottom of the issue body)
   - Teacher's email address (same line — the `@c2ken.net` address)
   - Department / Subject (from the Request details block)
   - Topic title (from the Request details block) — this is the **activity name** that goes on the doc
3. **Find the live activity path** from the merged PR's diff (look for the new directory it added under the repo root). Construct the URL: `https://dgaj-g.github.io/ols-digital-skills/<dept-slug>/<activity-slug>/`.
4. **Confirm the activity name** by reading the activity's own `index.html` `<title>` and `<h1>` — that is what pupils see. Use this exact wording on the doc. If it disagrees with the issue's "Topic title", prefer the on-screen wording (teachers see what pupils see).
5. **Generate the Word doc** per the playbook spec — crest, "OLS Digital Skills" wordmark, activity name, big QR code, plain-text URL, brand footer. **No year group on the doc. No teacher name on the doc.** Save to the Claude Work department folder as `<Activity_Slug>_Access.docx`.
6. **Draft the email** per the playbook tone guide. Save alongside the docx as `<Activity_Slug>_email.md`.
7. **Verify the QR code scans** — render it and open the doc to eyeball it. If the QR is fuzzy or the URL is wrong, redo.
8. **Report back** with the two file paths and the live URL, then send a `PushNotification`: `Handoff ready: <Topic>. Word doc + email draft in Claude Work/<Dept>/.`

**Don't ask permission first** — go straight to building the package once you've parsed the issue. Damien wants the artefacts in one go, same as `/build`. If something's genuinely unworkable (issue not merged, activity not on Pages yet, etc.) — STOP and tell him precisely what's blocking.
