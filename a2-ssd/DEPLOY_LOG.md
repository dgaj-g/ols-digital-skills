# A2 SSD Platform — deploy log

| Date | Version | Build | Description | Checked |
|---|---|---|---|---|
| 27 Sep 2026 10:33 | 1 | f309a5fa51-d2d1d70f | v1 A2 SSD f309a5fa51-d2d1d70f | token check waits on the owner's first sign-in (see below) |

- Project: OLS A2 SSD Platform (owner dgartland021@c2ken.net)
- Script ID: 1B53FthiVBjLCQYsDCtKimL2ueSD7qpNbZBx26W4O-eFPRtKwNXbWsF1X
- Deployment ID: AKfycbzbXXmMRQ71koD0eStF6888zc1EVELY4JdxkzkN6_fdiUgpUgMiQO3YgvFeLEzsPWus
- Web app: https://script.google.com/a/macros/c2ken.net/s/AKfycbzbXXmMRQ71koD0eStF6888zc1EVELY4JdxkzkN6_fdiUgpUgMiQO3YgvFeLEzsPWus/exec
- Runs as: the user accessing the web app. Access: anyone within c2ken.net.
- Ground-truth token in the served page: a2ssd-f309a5fa51-d2d1d70f

## How a new version goes out
1. Build: node tools/pack-content.js, then node tools/build-server.js (the private server file is built outside this repo).
2. Paste Code.gs and Index.html into the editor and save.
3. Deploy → Manage deployments → edit (pencil) → Description first → Version: New version (check it says New version) → Deploy.
4. Read the confirmation panel for the new version number, then open /exec and find the new token.
