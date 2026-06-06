# Deployed login-gated apps — `/exec` URL registry

A lookup of the **live Google Apps Script web-app URLs** for our login-gated activities
(the ones served from Apps Script, not GitHub Pages). These `/exec` URLs are created by the
teacher at deploy time and can't be known by Claude otherwise, so they're recorded here:
**any future session can `git pull` and answer "give me the link for the … activity".**

The `/exec` URL is **not secret** — the within-domain Google sign-in gate protects the data,
so an outsider with the link still can't get in. Safe to keep in this public repo.

When a login-gated activity is (re)deployed and the teacher pastes the new `/exec` URL,
update its row here. If ownership is transferred to another teacher, they redeploy and the
URL changes — update it.

| Activity | What it is | `/exec` URL | Deployed by | Last updated |
|---|---|---|---|---|
| Girls Coding with Confidence — Computational Thinking Challenge | Login-gated Bebras-style timed competition (40 min, 20 questions); named class boards, per-class QR, teacher dashboard + stats | https://script.google.com/a/macros/c2ken.net/s/AKfycbxo_jz7qYI4dlfA_onu-1dEqPgXv7vw2DOxpf6-pkoS-TV-BAlJiq01xAES1PJc6mqQ/exec | dgartland021@c2ken.net | 2026-06-06 |
| Government & Politics — The US Constitution Diagram | Login-gated collaborative class board (build shared notes) | _URL needed — paste when handy_ | Carol McMullan (handover) | — |

**Notes**
- The teacher reaches the **bare `/exec`** for the Staff/admin landing; pupils use a **per-class link** (`…/exec?class=NAME`) that the teacher generates and shares from inside the activity's admin panel.
- Source code: GG lives in Claude Work `0. Digital Skills Web Activities/GG/`; the Constitution Diagram lives in `government-politics/constitution-diagram/` (+ a server package in Claude Work).
