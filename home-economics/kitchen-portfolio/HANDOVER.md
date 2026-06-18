# My Kitchen Portfolio — BUILD HANDOVER (read me first)

> **Purpose:** a complete, self-contained handover so a NEW Claude session can
> continue this build with zero context loss. If you are a fresh session:
> read this whole file, then skim `script.js`'s header comment and
> `server/Code.gs.template`'s header comment.
>
> **Branch:** `draft/home-economics-kitchen-portfolio` · **No inbox issue** (request came
> to Damien by email from Helena, Home Economics — the email text is restated in §2).
> **Status (2026-06-12): BUILD COMPLETE on the offline preview. A 37-agent adversarial
> review ran; all confirmed findings are FIXED (submit idempotency by entry id;
> addClass now CLAIMS unowned/pupil-auto-registered classes so the year can always be
> attached; share-heal on every submit + a "not shared" warning chip on the dashboard;
> apiSave never deletes a draft without an explicit clearDraft; media-busy guards on
> Next/submit + stale-draft guards in upload callbacks; photo-quota and video-size
> messages made honest; CSV formula-injection neutralised; dish-name gate before
> uploads; year-switch recovery on home when the class link carries no year; ISO dates
> formatted on the dashboard; AA-contrast button tones; focus restoration on
> star/MCQ re-renders). NOT yet deployed to Apps Script — deploy + live verification
> on real C2k accounts is next (§7).**

---

## 1. What this is

**"My Kitchen Portfolio"** — the Home Economics departmental **KS3 Digital Portfolio**.
A login-gated Google Apps Script (HtmlService) web app, deployed **Execute as: USER
ACCESSING**, **within the C2k domain**. Every pupil keeps a running portfolio of her
practical cooking classes:

- One **practical reflection** per cooking class, via a 4-step wizard:
  1. **Today's dish** — name, date, **photos + video from her phone** (saved straight
     into her own Drive, auto-foldered).
  2. **My focus** — the year group's focus areas from the department's Schemes of Work
     (J1/J2/J3 — see §2), each with a tailored prompt. J3's *Costing of Recipe* has a
     live **costing calculator** (ingredients, total, cost per portion).
  3. **The taste test** — star ratings (look/taste/texture) + two multiple-choice
     evaluations (outcome, independence).
  4. **Reflect** — What went well / Even better if / Next time (open text), then
     **Add to my portfolio**.
- Each submitted reflection **appends a page to ONE portfolio Google Doc** in the
  pupil's own Drive (created on her first entry, **auto-shared with her class's
  teacher**, filed into `OLS Digital Skills / Home Economics / <Year>`). Photos are
  embedded in the Doc; videos are linked.
- Media files into `… / <Year> / Evidence / <date dish> /` (per-practical folders,
  best-effort shared to the teacher so video links open for her).
- Home view = the pupil's "shelf": chef-level progression (Apprentice Chef →
  Executive Chef), timeline of recipe-card entries, portfolio Doc card.
- **Teacher area** (key button): one shared staff passcode; multi-teacher class
  manager where **every class is created WITH a year group (J1/J2/J3)** — that drives
  both the focus options and the colour theme; per-class link + in-page QR +
  dashboard (entries count, last cooked, portfolio links) + CSV.
- **Year tones:** J1 honey/apricot, J2 sage/olive, J3 terracotta/copper — all on a
  warm-kitchen cream chrome, OLS crest intro + footer.

## 2. The brief (verbatim requirements)

Helena's email (Home Econ): KS3 pupils complete a Digital Portfolio for practical
classes; key areas from Schemes of Work —
- **J1** T1: Hygiene and Safety · Skills/Equipment; T2/3: Food Groups · Food Provenance.
- **J2** T1: Hygiene and Safety · Skills/Equipment · Nutrients · Exploration of a food
  label; T2/3: Priority Health Issues (adapting recipes for health conditions).
- **J3** T1: Hygiene and Safety (cross-contamination) · Skills/Equipment (electrical
  appliances) · Nutrients (nutritional analysis with the **Explore Food** program) ·
  Costing of Recipe; T2/3: adapting recipes for life-cycle stages.

Damien's instructions: C2k login; teacher admin + class creation like Mon Carnet;
**year group chosen at class creation aligns the options**; type thoughts + upload
photos/video in-app into their own Drives, organised; everything into a Google Doc
auto-shared with the teacher; beautiful warm-kitchen UI with per-year tones;
evaluation (MCQ + open) in every reflection; "can take a few seconds" messages on
saving buttons; go to town.

## 3. Architecture (Mon Carnet Path B + the deltas)

Read `french/mon-carnet-de-france/HANDOVER.md` §3 for the proven base. Deltas here:

- **Append-model portfolio Doc** (not one-shot): `core.docId` in UserProperties;
  `apiSubmitEntry` opens it (`DocumentApp.openById`) or creates it on first entry
  (then shares + folders, both retried once). If a pupil deletes her Doc, the next
  submit transparently creates a fresh one (old entries stay only in the deleted Doc).
- **Two UserProperties keys per class:** `kp:<cls>` (name/year/docId/docUrl/entry
  summaries, oldest summaries dropped if near the 9KB value cap) and `kpd:<cls>`
  (the in-progress draft; server rejects >8.8KB with `draft-too-big`).
- **Photos:** client downscales to ≤1600px JPEG on a canvas (also kills HEIC) →
  base64 over `google.script.run` → `folder.createFile`. Embedded into the Doc at
  submit by fileId, scaled to ≤440px width.
- **Video:** `apiGetUpload` returns `ScriptApp.getOAuthToken()` (the PUPIL'S OWN
  token under execute-as-user) + the Evidence folder id; the browser does a
  **resumable upload** (`uploadType=resumable`, 8MB chunks, 308 handling, progress
  bar) straight to the Drive REST API. Fallback for ≤15MB files: base64 via
  `apiUploadVideo`. Hard cap 200MB with a friendly "short clips" message.
- **Year on the class registry:** `classes` entries are `{name, owner, created, year}`;
  `apiAdmin addClass` REQUIRES year ∈ {J1,J2,J3}; `doGet` injects `OLS_BOOT.classYear`.
  If a class has no year (bare `/exec`, legacy, pupil-auto-registered), the pupil
  picks her year once on the welcome screen (class year always wins when present).
- **Drive thumbnails** for the timeline use `https://drive.google.com/thumbnail?id=…`
  (cookie-authed as the signed-in pupil) with an emoji fallback on error.
- Offline preview parity: full journey reviewable at
  `http://localhost:8098/home-economics/kitchen-portfolio/` — `?reset` wipes,
  `?year=J2` previews a year's tone/options, staff passcode `demo`.

## 4. UNPROVEN on C2k — probe these at deploy verification (§7)

All the Mon Carnet facts (identity, Doc creation in pupil Drive, addViewer,
foldering) are PROVEN and reused. NEW unknowns this build adds:

1. **Resumable Drive upload from the sandboxed iframe** (CORS from
   `googleusercontent.com` to `googleapis.com` with the pupil token, and reading the
   `Location` response header). The ≤15MB base64 fallback covers small clips if this
   fails; big-video support depends on it.
2. **`drive.google.com/thumbnail` images inside the iframe** (cookie auth) — purely
   cosmetic; emoji fallback if blocked.
3. **`DocumentApp.openById` + append on a Doc created in an earlier session** —
   expected fine (pupil owns it), but exercise a 2nd and 3rd entry explicitly.
4. Apps Script **OAuth scopes**: the script uses DocumentApp, DriveApp, ScriptApp
   token — first run shows the consent screen; ask a C2k admin to trust the client
   before whole-class rollout (same as Mon Carnet).

## 5. Files

```
home-economics/kitchen-portfolio/
├── index.html / style.css / script.js   the activity (offline-capable)
├── qrcode.min.js                        vendored (staff QR)
├── HANDOVER.md                          this file
├── DPO_Summary.md                       one-page data-protection summary
└── server/
    ├── Code.gs.template   THE server (edit this, never Code.gs)
    ├── build-pathb.js     assembler -> server/Code.gs + server/Index.html (pure ASCII)
    ├── Code.gs            generated (paste into Apps Script "Code.gs")
    └── Index.html         generated (paste into Apps Script HTML file named "Index")
```
Edit loop: change source → `node server/build-pathb.js` → re-paste both files →
**Deploy → Manage deployments → ✏️ → Version: NEW VERSION → Deploy** (never reuse a
pinned version — stale-version phantom errors are documented in the French build).

## 6. Decisions a future session must not undo

- **Photos are optional** on an entry (kitchens ban phones some days); the submit
  checklist shows it as a soft "optional but lovely" item. Helena can ask us to
  make it required.
- **No drag mechanics** — this is a journal/portfolio tool, not a game; delight comes
  from the warm theme, stars, confetti, chef levels. (The genuine-consequence rules
  apply to assessed games; reflections are opinion tasks like La Cuisine's reasons.)
- **One Doc per pupil per class**, append-only; regeneration after deletion is
  non-destructive (new Doc, media untouched).
- Focus-area keys are unique per year (`hygiene` vs `hygiene2` vs `crosscon`) so
  saved answers can never collide across years.
- The "year can't be changed later" line in the staff panel is deliberate: changing
  a class's year mid-stream would silently switch every pupil's prompts.

## 7. DEPLOYED 2026-06-12 (by Claude, driving Damien's signed-in Chrome) — verify next

**LIVE:** the web app is deployed (standalone Apps Script project "My Kitchen
Portfolio" on dgartland021@c2ken.net; Execute as: User accessing; access: Anyone
within c2ken). The `/exec` URL is recorded in `docs/deployed-apps.md`. Script
Properties set by hand (no initBoard run needed): `staffPasscode=kitchen26`
(CHANGE/share as Damien prefers), `teacherEmail=dgartland021@c2ken.net` (testing
fallback — switch to Helena's address at handover), `subject=Home Economics`.
Deploy method worth keeping: the editor's Monaco model is scriptable
(`monaco.editor.getEditors()[0].getModel().setValue(...)` after fetching the
generated files from raw.githubusercontent.com — no hand-pasting). NOTE: an
earlier same-night project was binned because its OAuth consent screen froze the
name "Untitled project" (first auth attempt happened pre-rename). The live one
shows "My Kitchen Portfolio (Unverified)" correctly. **Name a project BEFORE any
auth attempt.**

**STILL TO DO (needs a human click — the OAuth popup is outside automation reach):**
1. Damien opens the `/exec` URL → Review permissions → choose his account →
   Advanced → Go to My Kitchen Portfolio (unsafe) → Allow. (Once per user, same
   click-through as Mon Carnet.)
2. Verify end-to-end on his account, then the **pupil test account** (incognito):
   full entry with 2 photos + 1 short video (probe list §4 — the resumable upload
   is THE unknown), Doc created/filed/shared, second entry appends, staff panel
   (passcode above; add class WITH year), per-class link, dashboard.
3. Re-deploys after code changes: edit source → `node server/build-pathb.js` →
   update the two files in the Apps Script project → Manage deployments → ✏️ →
   **Version: New version** → Deploy (never reuse the pinned version).
4. Ask a C2k admin to mark the OAuth client trusted before whole-class rollout
   (removes the unverified-app interstitial).
5. `/publish` later = **Path-B variant** (no QR Word doc; email gives the `/exec`
   link, pupils sign in with school accounts, teacher uses the Staff panel for class
   links/QR + dashboard). Flag to Helena: photos optional, video size guidance
   (short clips), and the §4 probe outcomes.

## 8. Damien's standing preferences (apply throughout)

Clipboard handoffs via `pbcopy` (never dump code in chat); plain-text URLs; never
the AskUserQuestion dialog; he deploys himself, clipboard-guided, across exchanges —
never imply background work between turns; review happens on the local preview
(`digital-skills` server, port 8098).
