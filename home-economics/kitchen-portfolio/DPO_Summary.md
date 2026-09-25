# My Kitchen Portfolio — Data Protection Summary (one page)

**What it is.** A school web app (Google Apps Script, inside the school's own C2k
Google Workspace) where KS3 Home Economics pupils keep a digital portfolio of their
practical cooking classes: typed reflections, photos/short videos of their dishes,
and a self-evaluation, collected into a Google Doc.

**Sign-in.** Pupils and staff sign in with their existing school (C2k) Google
accounts. Google enforces the gate ("Anyone within the domain"); there are **no new
usernames and no passwords are ever created or stored by the app**.

**Where data lives — all inside the school's Workspace:**

| Data | Where | Who can see it |
|---|---|---|
| Pupil's typed reflections (in progress) | Apps Script User Properties (private per-account store) | That pupil only |
| Photos / videos of her food | The pupil's **own Google Drive** (`OLS Digital Skills / Home Economics / <Year> / Evidence`) | The pupil + her class teacher (viewer) |
| The portfolio Google Doc | The pupil's **own Google Drive** | The pupil (owner) + her class teacher (viewer) |
| Dashboard record (name, count of entries, last dish, Doc link) | Apps Script Script Properties | Staff who hold the passcode |
| Class list (class name, year group, owning teacher's email) | Apps Script Script Properties | Staff who hold the passcode |

**What is deliberately NOT collected:** no photos of pupils are requested (the app
asks for photos *of the food*); no marks/grades; no third-party services — the QR
codes are drawn in-page, nothing leaves the Workspace.

**Sharing.** Each pupil's Doc and Evidence folder are shared **only** with the one
teacher who owns her class (viewer access). Nothing is ever shared "anyone with the
link" or outside the domain.

**Video uploads.** Large videos go from the pupil's browser directly into the
pupil's own Drive using her own short-lived Google credential — the same authority
her browser already has when she uses Drive; no extra access is created.

**Retention & deletion.** "Delete class" in the teacher area removes that class's
dashboard records and its registry entry; recommended at the end of each school
year. Pupils' own Docs, photos and videos are theirs, in their own Drive, and are
untouched by deletion — they leave with the pupil, like an exercise book. A pupil
can delete any photo/video from inside the app (it goes to her own Drive bin).

**Safeguarding notes for staff.** Teachers should remind pupils that photos are of
the *dish*, not of classmates; anything inappropriate appears only in that pupil's
own Drive and the teacher-shared Doc, where the class teacher will see it — the
same visibility as work handed in on Google Classroom.
