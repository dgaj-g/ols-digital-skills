# S1 Unit 1 Revision — deploy log

| Date | Version | Build | Description | Checked |
|---|---|---|---|---|
| 27 Sep 2026 17:25 | 1 | 50d29029f7-4827878d | v1 S1 Unit 1 50d29029f7-4827878d | token found in /exec; the G4 sit ran on the test deployment first and its records were wiped; Classes then read "No classes yet", and 11A DT was made on /exec (0 pupils, round 1) |
| 27 Sep 2026 18:10 | 2 | 50d29029f7-b699f68f | v2 S1 Unit 1 50d29029f7-b699f68f | warm look + phone layout (his rulings); token found in /exec staff footer 18:11; 11A DT still listed (1 pupil, round 1); no records touched |
| 27 Sep 2026 18:38 | 3 | 785c4a9f9c-0e1c3ba2 | v3 S1 Unit 1 785c4a9f9c-0e1c3ba2 | build code hidden (only /exec?build shows it) and Topics tab added (open or lock per class; new classes start locked), his rulings; token found on /exec?build staff page 18:39; 11A DT and test still listed; the 11A DT class link shows Digital data Open with no code at the foot (classes made before v3 stay open); no records touched |
| 28 Sep 2026 20:20 | 4 | bce5082dd8-801b0f7f | v4 S1 Unit 1 bce5082dd8-801b0f7f | Classes tab like A2 (Copy class link and Delete class buttons, no long link), a pulse on whatever was clicked until the answer comes back, tracker scores with percentages, ratings in the pupils' own words, graphs, and a readable page per pupil (his rulings); token found on /exec?build staff page 20:21; 11A DT (2 pupils), test (0) and S1DG-26-27 (9 pupils) still listed; no records touched |
| 28 Sep 2026 20:42 | 5 | fc41c997cb-a423e1de | v5 S1 Unit 1 fc41c997cb-a423e1de | Named teachers get in with their school account (private list); every teacher but the owner and heads of department sees only the classes they made; the owner sees "made by" on other teachers' classes; tracker "Last used" column, pupil page line and CSV column (his asks); token found on /exec?build staff page 20:43; S1DG-26-27 (9 pupils, 9 last-used times) intact; the two test classes had been deleted before this deploy |
| 14 Oct 2026 15:00 | 6 | 24d3d4f8ad-7f0b7102 | v6 S1 Unit 1 24d3d4f8ad-7f0b7102 | Software topic added (29 past-paper questions, 59 marks, including 2026; LOCKED in every class until opened on Topics) and the 2026 questions in Digital data round 2; live-look clarity fixes (no "Pick two." said twice, Look back ends with "Back to the topic", shorter flagged-row names); both topics sat PASS on the test link first and the test class was deleted; token found on /exec?build staff page 15:00; S1DG-26-27 (9 pupils, Digital data Open, Software Locked) and 11B DT (11 pupils) intact; no records touched |
| 15 Oct 2026 09:05 | 7 | d082cb2a5b-fa15c989 | v7 S1 Unit 1 d082cb2a5b-fa15c989 | Database applications (62 questions, 123 marks, 5 stages) and Spreadsheet applications (72 questions, 110 marks, 5 stages) added, both LOCKED in every class until opened on Topics; cell and range hints on typed spreadsheet answers; wide tables on a phone scroll sideways with a swipe line; both topics sat PASS on the test link first (Databases 30/123 33056cb1, Spreadsheets 18/110 72bf05b3) and the test class was deleted; token found on /exec?build staff page 09:05; S1DG-26-27 (9 pupils, Digital data and Software Open, the two new topics Locked) and 11B DT (11 pupils, Digital data Open, the rest Locked) intact; no records touched |
| 15 Oct 2026 11:40 | 8 | ea4110fe09-c59479cf | v8 S1 Unit 1 ea4110fe09-c59479cf | writing box in write-then-pick questions 200 -> 1,000 characters and taller (his ask: a pupil was cut off on a utility-programs answer); if the store is ever full the writing is shortened before the marks are lost; token s1u1-ea4110fe09-c59479cf found on /exec?build 11:40; no records touched |

- Project: OLS Unit 1 Revision (owner dgartland021@c2ken.net)
- Script ID: 1yS6ubuXCs4N05yeAESr_TpIaLaaNIIPHOH0XNTPZxXE_M_VOIPonBjvs
- Deployment ID: AKfycbxI4chI8MnTziXAC3Y-QaMsguiP7nErsAb7JpkOhBNo3s8aMojYPMlCmTgoJ2qhdt6C7w
- Web app: https://script.google.com/a/macros/c2ken.net/s/AKfycbxI4chI8MnTziXAC3Y-QaMsguiP7nErsAb7JpkOhBNo3s8aMojYPMlCmTgoJ2qhdt6C7w/exec
- Runs as: the user accessing the web app. Access: anyone within c2ken.net.
- Ground-truth token in the served page: s1u1-ea4110fe09-c59479cf (version 8; shown only when the link has ?build)

## How a new version goes out
1. Build: node s1-unit1/tools/build-server.js (the private Code.gs is written to Claude Work/S1 Unit 1 Platform/deploy/, never to this repo).
2. Paste Code.gs and server/Index.html into the editor and save.
3. Deploy → Manage deployments → edit (pencil) → Description first ("v<N> S1 Unit 1 <build>") → Version: New version (check it says New version) → Deploy.
4. Read the confirmation panel for the new version number, open /exec?build&authuser=1 and find the new token at the foot (from version 3 the footer shows only with ?build; the token is always on the body tag), add a row to the table (newest last), update gates/out/g6-exec-seen.txt, then run node s1-unit1/gates/g6-deploy.js.
