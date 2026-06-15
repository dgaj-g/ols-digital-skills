# Data Protection Summary -- Isotope Lab (OLS Digital Skills)

**Activity:** Isotope Lab (Chemistry / Atomic Structure)
**Type:** Login-gated interactive web activity (Google Apps Script / HtmlService, Path B)
**Audience:** Post-primary pupils, Our Lady's Grammar School, Newry

---

## What data is collected

| Category | Fields stored | Notes |
|---|---|---|
| Identity | Pupil's school email address (C2k Google Workspace account) | Read from `Session.getActiveUser()` server-side; never sent to the browser other than back to the pupil themselves |
| Name | First name, surname, display name | Read automatically from the pupil's signed-in C2k Google profile (`given_name` + `family_name` via the OpenID Connect userinfo endpoint); no manual entry required |
| Activity progress | XP (experience points); Build-an-Atom (levels done, best); Isotope Snap (plays, best streak, best score); Mass Spectrometer (questions done, correct) | Numeric progress counters only; no free-text answers captured |
| Group membership | Internal group identifier (e.g. "Curie"); assigned by the class teacher | No sensitive information; used to display team totals |

---

## Where data is stored

All data is held in the **ScriptProperties store of the Apps Script project** within the school's **C2k Google Workspace** (educational domain). Storage is internal to the Apps Script project; no Google Sheet is used and no data leaves the Workspace or is transmitted to any third-party server. Pupil name is read automatically from the signed-in C2k profile (first name + surname via the Google OIDC userinfo endpoint); no third party is involved.

---

## Who can access the data

| Role | Access level |
|---|---|
| Class teacher | Staff panel in the activity (passcode-protected) shows per-class results and group assignments; script owner can view raw Script Properties in the Apps Script console |
| Pupils | Their own XP and progress only; the leaderboard shows first name + surname of named classmates in the same class (no email addresses); group view shows the pupil's own group name, member count and (if the teacher enables reveal) other members' names and XP |
| Other school staff | No access unless the teacher shares the Apps Script project with them directly |
| Third parties | None |

The staff passcode is stored in Script Properties and set by the teacher; it is not stored client-side.

---

## Lawful basis for processing

**Legitimate educational interest** (Article 6(1)(f) UK GDPR / Article 6(1)(e) for public-authority tasks): the activity is used as part of curriculum teaching of GCSE Chemistry (Atomic Structure). Processing is limited to what is necessary for the educational purpose.

---

## Data retention and deletion

- Each class's records are stored under a named class code (e.g. `S1-Chem-1`).
- The teacher can delete an individual class at any time using the "Delete class" option in the staff panel; this permanently removes all property keys for that class (pupil records, groups, reveal flag) from the ScriptProperties store.
- The entire Apps Script project (and all data) should be deleted at the end of the academic year or when the class cohort moves on, in line with the school's records retention policy.
- Pupils do not have a mechanism to delete their own record; requests for erasure should be directed to the class teacher.

---

## Third-party processors

None. The activity is served by Google Apps Script (part of Google Workspace for Education, covered by the school's existing data processing agreement with Google). Pupil names are retrieved from Google's OpenID Connect userinfo endpoint as part of the same Google sign-in session -- no external API or third party is involved. No analytics or advertising calls are made.

---

## International transfers

None. Data is held within Google Workspace for Education under the school's existing agreement; Google's Workspace for Education product is covered by standard contractual clauses and operates within the EEA/UK adequacy framework.

---

## Contacts

Any queries regarding data held in this activity should be directed to the class teacher in the first instance, or to the school's Data Protection Officer (DPO) via the school office.
