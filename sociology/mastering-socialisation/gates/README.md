# Gates — Mastering Socialisation

Run each one from `sociology/mastering-socialisation`. Each one writes its result sheet to `gates/out/<gate>.txt` and exits 1 on any FAIL. Sheet lines read `PASS|FAIL|SKIP <check> — <detail>`, and a count line ends each sheet. The private material stays in the DESIGN folder (`Claude Work/Digital Skills Roadmap/0. Digital Skills Web Activities/Sociology`). That means the banks, the judge, the staff passcode, `TEACHERS.txt` and `deploy/`. No gate copies any of it into the repo or into a sheet.

| Gate | Command | What it proves |
|---|---|---|
| g0 server | `node gates/g0-server.js` | Builds into a scratch deploy folder and starts `tools/dev-server.js` on port 8781 with a throw-away store. It then calls every API call over HTTP:<br>• the guards<br>• classes and names<br>• for every act: the view carries no key; an incomplete answer is refused; all wrong scores 0; all right scores full (answers from the DESIGN banks); best never falls; attempts count; the view reshuffles<br>• badges<br>• lock and the board<br>• daily and weekly<br>• writing (gzip+base64 `w:` keys)<br>• ticks, the pile, ping, streak and the 1,500-byte header<br>• every staff role and op<br>• archive by padding |
| g1 judge | `node gates/g1-judge.js` | Runs `DESIGN/judge/controls.js DESIGN`. The separated judge must pass its controls, and the controls must fail on bad answers. |
| g4 banks | `node gates/g4-banks.js` | Runs `DESIGN/tools/check-banks.js DESIGN`. It checks every bank and content file. |
| g7 deploy | `node gates/g7-deploy.js` | Builds `DESIGN/deploy`. It then checks:<br>• Index.html has the four scriptlets once each, balanced script blocks and pure ASCII<br>• `window.CONTENT` equals `content/`<br>• the page has no key text, judge, staff secret or teacher address<br>• Code.gs is mode 600<br>• git holds nothing private, tracked or untracked<br>• the `appsscript.json` scopes match s1-unit1 |

`SOC_SCRATCH=<dir>` moves g0's scratch folder; the default is `<tmp>/soc-gates`. `SOC_STANDIN=1` makes g0 and g7 build the stand-in page instead of `platform/`.

Rebuild: `node tools/build-server.js`

Dev server, which needs the build first:

```
SOC_STORE="/Users/damiengartland/Desktop/Claude Work/Digital Skills Roadmap/0. Digital Skills Web Activities/Sociology/deploy/dev-store.json" nohup node tools/dev-server.js 8771 > /tmp/soc-dev.log 2>&1 &
```

Then open `http://localhost:8771/?class=<slug>&as=pupil1@c2ken.net`. The bare `/` is the staff page.
