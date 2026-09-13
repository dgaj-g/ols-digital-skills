const fs=require("fs");
// HANDOVER — What is live
let h=fs.readFileSync("HANDOVER.md","utf8");
const hA="**Live since 13 September 2026 00:27, from commit `3e16a9c` — BOOK A (Handling Data · Collecting and displaying) + THE DATA SPLIT:";
if(!h.includes(hA)) throw new Error("handover anchor");
h=h.replace(hA, "**Live since 13 September 2026 02:46, from commit `7175f3d` — BOOK B (Handling Data · Averages): FRONT DOOR Version 35, a CLIENT-ONLY cut (Index.html only; Code.gs byte-identical to Version 34; no manifest touched) plus one Sheet cell — the Config row `acts` now `[\"stats-collect\",\"stats-averages\"]`. Book B arrives UNTICKED for every class (tick it per S1 class in Set-up). The store is unchanged: the standalone project's Version 1. Before that: live since 13 September 2026 00:27, from commit `3e16a9c` — BOOK A (Handling Data · Collecting and displaying) + THE DATA SPLIT:");
const hRow="| FRONT DOOR (everybody) | `https://script.google.com/a/macros/c2ken.net/s/AKfycbzUZ3bDjcFas_zQ02VrJQCEkPQgEjs3Re4JZ1OQtLACa090AC1B0Md2yUkL4aX81LwP/exec` | Version 34, 13 Sept 00:27 |";
if(!h.includes(hRow)) throw new Error("handover row");
h=h.replace(hRow, "| FRONT DOOR (everybody) | `https://script.google.com/a/macros/c2ken.net/s/AKfycbzUZ3bDjcFas_zQ02VrJQCEkPQgEjs3Re4JZ1OQtLACa090AC1B0Md2yUkL4aX81LwP/exec` | Version 35, 13 Sept 02:46 |");
fs.writeFileSync("HANDOVER.md",h);
// ADDING_A_TOPIC — the vocab sentence and a worked example line
let t=fs.readFileSync("ADDING_A_TOPIC.md","utf8");
t=t.replace("(angles/algebra don't have one\nof these yet — stats-collect and stats-quartiles do)", "(angles/algebra don't have one\nof these yet — stats-collect, stats-averages and stats-quartiles do)");
const tA="rather than typing the array by hand. Only add the id to the built-in `ACTS`";
if(!t.includes(tA)) throw new Error("topic anchor");
t=t.replace(tA, "rather than typing the array by hand. **Done exactly this way for Book B (Averages), 13 Sept 2026:** `content-stats-averages.js` + its ACTIVITIES line + index.html/build-pathb → one FRONT DOOR version (35) and the Config row `[\"stats-collect\",\"stats-averages\"]` — no server change, no manifest, ~5 minutes of Chrome. Only add the id to the built-in `ACTS`");
fs.writeFileSync("ADDING_A_TOPIC.md",t);
// AUDIT — approvals row
let a=fs.readFileSync("tools/qa/MATHS_GATES_AUDIT.md","utf8");
const aRow="| Handling Data B (Averages) | PENDING (not built) | — |";
if(!a.includes(aRow)) throw new Error("audit row");
a=a.replace(aRow, "| Handling Data B (Averages) | PENDING HIS SMOKE — LIVE 13 Sept 2026 02:46 (FRONT DOOR Version 35 from `7175f3d`, client-only; the store = the standalone project's V1; Config row `acts` = `[\"stats-collect\",\"stats-averages\"]`); `--full --book` and the whole-tree `--full` green, every cell closed; cold read 84 PASS / 0 / 0 after 13 REWRITEs honoured; controls: pending the post-deploy battery | 13 Sept 2026 |");
fs.writeFileSync("tools/qa/MATHS_GATES_AUDIT.md",a);
