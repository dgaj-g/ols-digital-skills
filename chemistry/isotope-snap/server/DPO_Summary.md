# Data Protection Summary — Isotope Lab (OLS Digital Skills)

**Activity:** Isotope Lab (Chemistry / Atomic Structure)
**Type:** Login-gated interactive web activity (Google Apps Script / HtmlService, Path B)
**Audience:** Post-primary pupils, Our Lady's Grammar School, Newry

---

## What data is collected

| Category | Fields stored | Notes |
|---|---|---|
| Identity | Pupil's school email address (C2k Google Workspace account) | Read from `Session.getActiveUser()` server-side; never sent to the browser other than back to the pupil themselves |
| Name | First name, surname, display name | Entered voluntarily by the pupil on first use |
| Activity progress | XP (experience points); Build-an-Atom (levels done, best); Isotope Snap (plays, best streak, best score); Mass Spectrometer (questions done, correct) | Numeric progress counters only; no free-text answers captured |
| Group membership | Internal group identifier (e.g. "Curie"); assigned by the class teacher | No sensitive information; used to display team totals |
| Timestamp | Last-updated ISO timestamp | Used to order records; not displayed to pupils |

---

## Where data is stored

All data is held in a **Google Sheet** created by the class teacher within the school's **C2k Google Workspace** (educational domain). The Sheet is bound to an Apps Script project and remains within the school's Google Workspace tenant. No data leaves the Workspace or is transmitted to any third-party server.

---

## Who can access the data

| Role | Access level |
|---|---|
| Class teacher | Full access to the bound Google Sheet; staff panel in the activity (passcode-protected) shows per-class results and group assignments |
| Pupils | Their own XP and progress only; the leaderboard shows first name + surname of named classmates in the same class (no email addresses); group view shows the pupil's own group name, member count and (if the teacher enables reveal) other members' first names and XP |
| Other school staff | No access unless the teacher shares the Google Sheet with them directly |
| Third parties | None |

The staff passcode is set by the teacher in the Config tab of the Sheet; it is not stored client-side.

---

## Lawful basis for processing

**Legitimate educational interest** (Article 6(1)(f) UK GDPR / Article 6(1)(e) for public-authority tasks): the activity is used as part of curriculum teaching of GCSE Chemistry (Atomic Structure). Processing is limited to what is necessary for the educational purpose.

---

## Data retention and deletion

- Each class's records are stored under a named class code (e.g. `S1-Chem-1`).
- The teacher can delete an individual class at any time using the "Delete class" option in the staff panel; this removes all pupil rows for that class from the Sheet and clears the class from the registry.
- The entire Sheet (and all data) should be deleted or cleared at the end of the academic year or when the class cohort moves on, in line with the school's records retention policy.
- Pupils do not have a mechanism to delete their own row; requests for erasure should be directed to the class teacher, who can delete the class or the individual row directly from the Sheet.

---

## Third-party processors

None. The activity is served by Google Apps Script (part of Google Workspace for Education, covered by the school's existing data processing agreement with Google). No analytics, advertising or external API calls are made from the server-side code.

---

## International transfers

None. Data is held within Google Workspace for Education under the school's existing agreement; Google's Workspace for Education product is covered by standard contractual clauses and operates within the EEA/UK adequacy framework.

---

## Contacts

Any queries regarding data held in this activity should be directed to the class teacher in the first instance, or to the school's Data Protection Officer (DPO) via the school office.
