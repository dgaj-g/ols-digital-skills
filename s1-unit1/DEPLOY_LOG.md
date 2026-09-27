# S1 Unit 1 Revision — deploy log

| Date | Version | Build | Description | Checked |
|---|---|---|---|---|
| 27 Sep 2026 17:25 | 1 | 50d29029f7-4827878d | v1 S1 Unit 1 50d29029f7-4827878d | token found in /exec; the G4 sit ran on the test deployment first and its records were wiped; Classes then read "No classes yet", and 11A DT was made on /exec (0 pupils, round 1) |
| 27 Sep 2026 18:10 | 2 | 50d29029f7-b699f68f | v2 S1 Unit 1 50d29029f7-b699f68f | warm look + phone layout (his rulings); token found in /exec staff footer 18:11; 11A DT still listed (1 pupil, round 1); no records touched |

- Project: OLS Unit 1 Revision (owner dgartland021@c2ken.net)
- Script ID: 1yS6ubuXCs4N05yeAESr_TpIaLaaNIIPHOH0XNTPZxXE_M_VOIPonBjvs
- Deployment ID: AKfycbxI4chI8MnTziXAC3Y-QaMsguiP7nErsAb7JpkOhBNo3s8aMojYPMlCmTgoJ2qhdt6C7w
- Web app: https://script.google.com/a/macros/c2ken.net/s/AKfycbxI4chI8MnTziXAC3Y-QaMsguiP7nErsAb7JpkOhBNo3s8aMojYPMlCmTgoJ2qhdt6C7w/exec
- Runs as: the user accessing the web app. Access: anyone within c2ken.net.
- Ground-truth token in the served page: s1u1-50d29029f7-b699f68f (version 2)

## How a new version goes out
1. Build: node s1-unit1/tools/build-server.js (the private Code.gs is written to Claude Work/S1 Unit 1 Platform/deploy/, never to this repo).
2. Paste Code.gs and server/Index.html into the editor and save.
3. Deploy → Manage deployments → edit (pencil) → Description first ("v<N> S1 Unit 1 <build>") → Version: New version (check it says New version) → Deploy.
4. Read the confirmation panel for the new version number, open /exec?build&authuser=1 and find the new token at the foot (from version 3 the footer shows only with ?build; the token is always on the body tag), add a row to the table (newest last), update gates/out/g6-exec-seen.txt, then run node s1-unit1/gates/g6-deploy.js.
