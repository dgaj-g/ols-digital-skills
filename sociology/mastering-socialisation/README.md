# Mastering Socialisation — WJEC AS Sociology, Unit 1 Acquiring Culture, Section A

Issue: dgaj-g/ols-digital-skills-inbox#42 (Aisling McPolin, L6). A sign-in revision platform served by an Apps Script web app (execute-as-user, school domain only), modelled on `s1-unit1/`.

- `platform/` — the page (index.html, style.css, strings.js, app.js, engine.js, staff.js) and vendored fonts.
- `content/` — public learn pages and print pages (JSON), inlined into the page by the build.
- `img/` — photos (Wikimedia Commons, see CREDITS.md) and OpenMoji marks.
- `server/` — `Code.gs.template` and `appsscript.json`. The build fills the template with the private banks and judge.
- `tools/` — `build-server.js` (writes Code.gs + Index.html into the private design folder) and `dev-server.js` (runs Code.gs locally for testing).
- `gates/` — the acceptance gates; outputs in `gates/out/`.

Private and never in this repository: question banks, model answers, the judge, the staff passcode, TEACHERS.txt, the built `deploy/`. They live in the design folder on Damien's Mac (`SOC_DESIGN`).
