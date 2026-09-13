const fs=require("fs");let s=fs.readFileSync("server/DEPLOY_LOG.md","utf8");
const head="# MathShelf — the deploy log\n\n";
if(!s.startsWith(head)) throw new Error("head");
const entry = `## 13 September 2026, 02:46 — FRONT DOOR Version 35 (BOOK B · Averages) — a CLIENT-ONLY cut; DATA stays the standalone project's Version 1

From commit \`7175f3d\`. \`Index.html\` md5 \`45b243fd92f738eb1ffb3dd1cf962c3d\` (1,546,777 chars) fetched into the editor from the pushed commit on raw.githubusercontent (\`cache: no-store\`), set into \`file_2.html\` by name, saved (Cmd+S on the open file — the toolbar save had not taken), the editor reloaded and the length and rolling hash read back equal to the repo's (1,546,777 / 2393194489); \`Code.gs\` NOT pasted — its md5 \`3e3f4819fa809c04cc2af310c3faabcd\` (46,004 chars) is byte-identical to Version 34's, and the editor's own copy read back at 46,004 / 3891900974 = the repo's. Manifest read in the editor before the cut: \`USER_ACCESSING\` + \`DOMAIN\`, untouched (the Book A cut and the split made every book a client-only cut plus one Sheet cell — this is the first one done that way). Manage deployments → the one active deployment, the FRONT DOOR by its Deployment ID \`AKfycbzUZ3bDjcFas_zQ02VrJQCEkPQgEjs3Re4JZ1OQtLACa090AC1B0Md2yUkL4aX81LwP\` → edit → Version "New version" → **Version 35 on 13 Sept 2026, 02:46**. Same \`/exec\`. Then the Sheet's Config tab row 10: \`acts\` = \`["stats-collect","stats-averages"]\` (typed by the session, 02:48 — the line \`qa-tickbox\` prints).

**Proof from outside Google, 02:50:** the served page (the top frame's \`OLS_BOOT\` scriptlet) carries \`stats-averages\` four times, the table kind's host and its Check label; the page's own store token, POSTed to the standalone store → 302 → \`{"ok":true, …, "acts":{"angles":true,"algebra":true,"stats-quartiles":false,"stats-collect":false,"stats-averages":false}, "summaries":{…,"stats-averages":null}}\` — the Config row is read and Book B arrives UNTICKED, as designed. (A note for the next reader: \`curl -L\` re-issues the 302 as a GET without the body and lands on "Page not found"; take the \`Location\` header and GET it.)

`;
s = head + entry + s.slice(head.length);
const row = "| 2026-09-13 02:46 | FRONT DOOR | Version 35 | `USER_ACCESSING` (and `DOMAIN`), read in the editor's manifest before the cut and untouched — BOOK B (Averages), client-only: Index.html only, Code.gs unchanged from Version 34; the Config row `acts` gained `\"stats-averages\"` | 7175f3d | 45b243fd92f738eb1ffb3dd1cf962c3d | 3e3f4819fa809c04cc2af310c3faabcd |";
const anchor = "\n## Proof rows";
if(!s.includes(anchor)) throw new Error("anchor");
s = s.replace(anchor, "\n" + row + anchor);
fs.writeFileSync("server/DEPLOY_LOG.md", s);
