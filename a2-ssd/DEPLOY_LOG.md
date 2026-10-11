# A2 SSD Platform — deploy log

| Date | Version | Build | Description | Checked |
|---|---|---|---|---|
| 27 Sep 2026 10:33 | 1 | f309a5fa51-d2d1d70f | v1 A2 SSD f309a5fa51-d2d1d70f | token found in /exec after the owner's permission click; live smoke passed |
| 27 Sep 2026 11:15 | 2 | f309a5fa51-79b672b1 | v2 A2 SSD f309a5fa51-79b672b1 | /exec carries the v2 token and not v1's; Classes reads "U6-SSD · 0 pupils" with the owner's record present (F59); owner's test record cleared |
| 28 Sep 2026 15:04 | 3 | b50b28c59f-aa1a6edc | v3 A2 SSD b50b28c59f-aa1a6edc spelling rule + re-mark | /exec carries the v3 token and not v2's; pupils' calls land on Version 3 in Executions; the owner-only re-mark dry run ran on live (11 records, 194 attempts re-judged, 10 marks would go up, nothing changed) |
| 29 Sep 2026 15:59 | 4 | 1faf886c6a-bb8ebc49 | v4 A2 SSD 1faf886c6a-bb8ebc49 activity tracking | deployed after the class had finished; /exec carries the v4 token; encrypted bundle branch deleted |
| 11 Oct 2026 12:34 | 5 | ea32e53ed6-928db73a | v5 A2 SSD ea32e53ed6-928db73a coursework guide + class grid | /exec carries the v5 token; staff page loads for the owner; the Coursework tab shows class U6-26-27, 12 pupils, chapters 0–12 and 0/934 screens; Code.gs reached the editor through a file input on the editor page (nothing public), Index.html from main 8b95c7c by commit hash |
| 11 Oct 2026 13:46 | 6 | ea32e53ed6-fd6702b4 | (description did not stick: shows Untitled) chapter links fix | the pupil check found that opening a chapter gave a blank page (the page's links went to Google's sandbox frame); links now stay inside the page; main ac3eb39 (PR #60) |
| 11 Oct 2026 13:49 | 7 | db5ae55e3f-7ee35a4e | (shows Untitled) tile wording | home tile reads "Build a bike shop system…"; main 72738e8 (PR #61) |
| 11 Oct 2026 13:55 | 8 | db5ae55e3f-0858c8a2 | v8 A2 SSD db5ae55e3f-0858c8a2 Reload fix | the "papers were updated" Reload button gave a blank page; it now reloads the real address; Code.gs SHA-1 8317a62bde matches local, Index.html = main 7d81ee5 (PR #62). Pupil smoke as the dummy account in TEST-CW: chapter list, chapters 0 and 3 open, crumbs work, a ticked step shows on the staff Coursework grid (ch 3 1/165, whole guide 1/934); TEST-CW then deleted |

- Project: OLS A2 SSD Platform (owner dgartland021@c2ken.net)
- Script ID: 1B53FthiVBjLCQYsDCtKimL2ueSD7qpNbZBx26W4O-eFPRtKwNXbWsF1X
- Deployment ID: AKfycbzbXXmMRQ71koD0eStF6888zc1EVELY4JdxkzkN6_fdiUgpUgMiQO3YgvFeLEzsPWus
- Web app: https://script.google.com/a/macros/c2ken.net/s/AKfycbzbXXmMRQ71koD0eStF6888zc1EVELY4JdxkzkN6_fdiUgpUgMiQO3YgvFeLEzsPWus/exec
- Runs as: the user accessing the web app. Access: anyone within c2ken.net.
- Ground-truth token in the served page: a2ssd-f309a5fa51-79b672b1 (version 2)

## How a new version goes out
1. Build: node tools/pack-content.js, then node tools/build-server.js (the private server file is built outside this repo).
2. Paste Code.gs and Index.html into the editor and save (Code.gs is private: load it through a file input on the editor page, never from GitHub).
3. Deploy → Manage deployments → edit (pencil) → Description first → Version: New version (check it says New version) → Deploy.
4. Read the confirmation panel for the new version number, then open /exec and find the new token.
