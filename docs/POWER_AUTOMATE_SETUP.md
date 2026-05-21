# Power Automate setup — Form → GitHub

This guide walks you through building a Power Automate flow that turns each Microsoft Forms submission ("Bespoke Web Activity Request") into a tracked request in GitHub.

**End result:** when a Head of Department submits the form, within ~30 seconds:
- A new **Issue** appears in `dgaj-g/ols-digital-skills` with all the fields, ready for `/next`.
- The uploaded files appear in `dgaj-g/ols-digital-skills-inbox/requests/<timestamp>/`.

**Time to complete:** ~20 minutes. Do it in one sitting.

---

## Prerequisites — confirm these first

| Check | How |
|---|---|
| You can sign in to Power Automate | https://make.powerautomate.com — should land on your dashboard |
| You can see the form in Forms | https://forms.office.com — open "Bespoke Web Activity Request" |
| You can sign in to GitHub as `dgaj-g` | https://github.com — top-right avatar should be you |
| The inbox repo exists and is private | https://github.com/dgaj-g/ols-digital-skills-inbox |

If all four are green, proceed.

---

## Part 1 — Create the flow shell (3 mins)

1. Open https://make.powerautomate.com
2. Left sidebar → **Create**
3. Choose **Automated cloud flow**
4. **Flow name:** `Bespoke Web Activity Request → GitHub`
5. **Choose your flow's trigger:** type *forms* in the search box and pick **"When a new response is submitted"** (Microsoft Forms)
6. Click **Create**

You now see the flow editor with one step (the trigger).

---

## Part 2 — Configure the trigger (1 min)

1. Click the trigger step (top box).
2. **Form Id:** dropdown → pick **"Bespoke Web Activity Request"**.
3. That's it. Click anywhere outside to close.

---

## Part 3 — Get the full response (1 min)

1. Below the trigger, click **+ New step**.
2. Search *forms* → pick **"Get response details"** (Microsoft Forms).
3. **Form Id:** same form as above ("Bespoke Web Activity Request").
4. **Response Id:** click in the field → from the **Dynamic content** panel that appears on the right, pick **"Response Id"** (under the trigger).

---

## Part 4 — Build the request ID + folder name (2 mins)

We need a unique folder name for each submission, like `2026-05-21-1432-geography`.

1. **+ New step** → search *compose* → pick **"Compose"** (Data Operation).
2. **Inputs:** click the field, then in the **Expression** tab paste:
   ```
   formatDateTime(utcNow(), 'yyyy-MM-dd-HHmm')
   ```
   Click **OK**.
3. Click the Compose box title (currently "Compose") and rename it to **`Timestamp`**.

4. **+ New step** → search *compose* → another **Compose**.
5. **Inputs:** click → switch to **Expression** tab → paste:
   ```
   toLower(replace(replace(outputs('Get_response_details')?['body/{department-question-id}'], ' ', '-'), '/', '-'))
   ```
   **Wait — read this carefully**: you need to swap `{department-question-id}` with the real ID of question 1. To get it:
   - Look at the **Dynamic content** panel on the right.
   - You'll see your form questions listed (Department / Subject, Year group, Exam board, etc).
   - Click on **"Department / Subject"** — it'll insert something like `@{outputs('Get_response_details')?['body/r4f8a2bc...']}` into the field.
   - Use that as a guide — the bit between the quotes is the question's ID.
   - **Easier shortcut:** instead of typing, just click "Department / Subject" from the Dynamic content panel inside the expression, and PA will fill the ID for you. Then wrap it with the `toLower(replace(replace(... , ' ', '-'), '/', '-'))` part.
6. Rename this Compose to **`DepartmentSlug`**.

7. **+ New step** → **Compose** again.
8. **Inputs:** in the **Dynamic content** picker (right panel), click **"Outputs"** from the Timestamp step, then type a dash, then click **"Outputs"** from the DepartmentSlug step. The field should now contain something like:
   ```
   @{outputs('Timestamp')}-@{outputs('DepartmentSlug')}
   ```
9. Rename to **`RequestId`**.

---

## Part 5 — Upload each attached file to the inbox repo (5 mins)

1. **+ New step** → search *apply to each* → pick **"Apply to each"** (Control).
2. **Select an output from previous steps:** open the Dynamic content panel and pick **"Question 7"** (the file-upload question) from the Get response details step. *(The exact label may say "Source materials" if that's how PA shows it.)*
3. Inside the Apply to each, click **Add an action**.
4. Search *github* → pick **"GitHub"** → action **"Create or update a file"**.

   First time only: sign in to GitHub when prompted, authorise the connector for `dgaj-g`.

5. Configure the action:
   - **Repository owner:** `dgaj-g`
   - **Repository name:** `ols-digital-skills-inbox`
   - **Branch:** `main`
   - **File path:** click in the field, then in Dynamic content panel use **"Outputs"** from the `RequestId` step, then type the rest. Final value should look like:
     ```
     requests/@{outputs('RequestId')}/materials/@{items('Apply_to_each')?['name']}
     ```
   - **File content:** Switch to **Expression** tab, paste:
     ```
     base64(body('Get_file_content_using_path'))
     ```
     *(Wait — you need another step first. Read on.)*

   Actually, scratch that. **Before this GitHub action, add a step** inside the Apply to each:
   
   - **Add an action** (still inside Apply to each, above the GitHub one) → search *onedrive* → **"Get file content using path"** (OneDrive for Business).
   - **File path:** in Expression: `items('Apply_to_each')?['link']` — *correction*: use the Dynamic content "Link" from Question 7 if available, otherwise the file's URL. The form upload stores files at `/Apps/Microsoft Forms/Bespoke Web Activity Request/Question/<filename>` — easier path:
     ```
     /Apps/Microsoft Forms/Bespoke Web Activity Request/Question/@{items('Apply_to_each')?['name']}
     ```

   Now back to the GitHub "Create or update a file" action:
   - **File content:** the Dynamic content panel now shows **"File content"** from the Get file content step — drag that in. PA will base64-encode for you.
   - **Commit message:** `Add file: @{items('Apply_to_each')?['name']} for @{outputs('RequestId')}`

---

## Part 6 — Create the GitHub issue in the main repo (3 mins)

1. After the Apply to each, **+ New step**.
2. Search *github* → action **"Create an issue"**.
3. Configure:
   - **Repository owner:** `dgaj-g`
   - **Repository name:** `ols-digital-skills`
   - **Title:** click in the field, then build it with dynamic content:
     ```
     [REQUEST] @{outputs('Get_response_details')?['body/<DEPT-ID>']} — @{outputs('Get_response_details')?['body/<TOPIC-ID>']}
     ```
     (Use the Dynamic content panel to insert "Department / Subject" and "Topic title" — same trick as before.)
   - **Body:** paste the template below, then use the Dynamic content picker to drag each form field into the matching placeholder. Each `<PLACEHOLDER>` should become a dynamic-content chip from the picker:

     ```markdown
     ## Request details

     - **Department / Subject:** <Department / Subject>
     - **Year group:** <Year group>
     - **Exam board:** <Exam board>
     - **Topic title:** <Topic title (and specification location if relevant)>
     - **Activity type preferred:** <Activity type preferred>

     ## What should the activity do?

     <What should the web activity do?>

     ## Source materials

     Files have been uploaded to the inbox repo:

     **Folder:** [`requests/<RequestId>/materials/`](https://github.com/dgaj-g/ols-digital-skills-inbox/tree/main/requests/<RequestId>/materials)

     ## Anything else

     <Anything else>

     ---
     *Submitted by <Responder's email> on <Submission time>.*
     *Request ID: `<RequestId>`*
     ```

     For the `<RequestId>` placeholders, use the dynamic content from the `RequestId` Compose step.

   - **Labels:** click "Add new item" and add (one at a time):
     - `request`
     - You can leave this for now and we'll automate label-adding from the Department field in a v2.

---

## Part 7 — Save, then test (5 mins)

1. Top-right → **Save**.
2. Submit a **test form response** yourself — pretend to be an HoD. Use any subject. Upload a small file (a 1-page PDF will do).
3. Wait ~30 seconds.
4. **Check 1:** open https://github.com/dgaj-g/ols-digital-skills/issues — you should see a new issue with your test data.
5. **Check 2:** open https://github.com/dgaj-g/ols-digital-skills-inbox/tree/main/requests — you should see a folder named with today's timestamp + the slug of whatever subject you typed. Inside it, the file you uploaded.

If both show up correctly: **🎉 done.** Reply to me with "test passed" and I'll set up the `/next` slash command so you can build the test issue.

If something didn't work:
- Open the flow's **Run history** (top of the flow editor)
- Click the failed run, find the red step
- Send me a screenshot of the error

---

## Common gotchas

- **"Get file content" can't find the file:** the path is case-sensitive and the form question number sometimes maps to "Question" without an explicit number. Try `/Apps/Microsoft Forms/Bespoke Web Activity Request/Question/<filename>` first; if that 404s, look in OneDrive for the actual subfolder name.
- **GitHub auth says "needs admin approval":** that's C2k's tenant policy. You might need to use a Personal Access Token instead. Tell me if you hit this.
- **Files over ~100 MB:** the GitHub Contents API won't accept them. Most teaching uploads are well under, but if an HoD ever uploads a big video, the flow will fail on that file. We'll add a fallback later.

---

## What this gives us

After this flow is live, the moment any HoD submits the form:
1. Their files land in a private GitHub folder I can see
2. An issue with all the structured data appears in your queue
3. You can review the queue any time on the GitHub mobile app
4. When you type `/next` to me, I have everything I need to build

**Next:** once you've tested this and seen an issue appear, I'll set up the `/next` slash command and we'll do a full end-to-end walkthrough.
