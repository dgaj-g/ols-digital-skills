# S1 Food & Nutrition Portfolio — PROGRESS
Request: Helena & Niamh email (30 Sep 2026): S1 Food & Nutrition digital portfolio, same categories as J3, own build + own link.
Damien: surprise them with a different colour scheme — beautiful, elegant, calming animations. Window: Opus 5.5 high (his call).
Worktree: ~/Sites/ols-wt-food-s1 (branch draft/s1-food-nutrition-portfolio, from origin/main). Source copied from origin/draft/home-economics-kitchen-portfolio (9864a99).
## Steps
- [x] 1 worktree + copy
- [x] 2 theme preview: 3 palettes (a Sea Glass, b Lavender Mist, c Blush & Stone) via ?palette=; sheet in Claude Work/Digital Skills Roadmap/0. Digital Skills Web Activities/Home Economics/S1 Food Portfolio/S1_palette_choices.png — AWAITING HIS PICK
- [x] 3 fork done: YEARS=[S1], FOCUS.S1 = J3 list (term tags dropped), no year picker/switch/staff radios, server stamps S1, naming Food & Nutrition, LS key s1fn-, Marcellus titles, drifting light, sheen ribbon, rise-in, palette veil
- [x] 4 offline walk (_probes/walk_s1.js): full entry incl. photo + costing, hooray, timeline, staff add class (S1), phone 390 no overflow; only error = favicon 404
- [ ] 5 deploy new Apps Script project (NAME FIRST), consent (his click), live test
- [ ] 6 guide + email to Helena & Niamh

After his pick: collapse palettes to the chosen one (keep data-palette attr), rebuild (node server/build-pathb.js), push, then new Apps Script project NAMED "S1 Food & Nutrition Portfolio" BEFORE any auth (school Chrome account = authuser=1).

## 30 Sep 2026 15:11 — palette chosen + deployed
- He picked 3: Blush & Stone. Palettes a/b and the ?palette preview hook removed; body data-palette="blush". Commit 3c840fb, rebuilt (pure ASCII), offline walk re-run: pass.
- Apps Script project "S1 Food & Nutrition Portfolio" (school account), script ID 1ULY1DkYz6ezpM6Omr58glHfvnLKbVnV4cL4T32Wup5DLSTsCu5qx9BLj
- Script Properties: staffPasscode=s1food26*, subject=Food & Nutrition, teacherEmail=dgartland021@c2ken.net (fallback only; each class goes to the teacher who adds it)
- Version 1 deployed (User accessing, Anyone within c2ken):
  https://script.google.com/a/macros/c2ken.net/s/AKfycbwDKOZrTm5Qj0wXk_BsXUakBhb5_8jWlYz5nTfEf5EOtzmpmYBkTYTosottXgNFd8q2sw/exec
- NEXT: his consent click → live test (staff add class, pupil entry with photo) → guide + email → draft PR.
