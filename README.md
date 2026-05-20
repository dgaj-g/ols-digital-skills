# OLS Digital Skills

Bespoke interactive web activities for departments at Our Lady's Grammar School, Newry — commissioned through the OLS Digital Skills Showcase request workflow and built one department at a time.

**Live:** https://dgaj-g.github.io/ols-digital-skills/

## Repo layout

```
ols-digital-skills/
├── index.html            ← Hub page (lists all department activities)
├── style.css             ← Shared OLS styling
├── assets/
│   └── crest.png         ← OLS crest
└── <department>/
    └── <activity-name>/  ← Self-contained activity folder
        ├── index.html
        ├── style.css
        ├── script.js
        └── elements/      ← (optional) images, audio, data
```

Each activity folder is self-contained: no build step, no framework, pure HTML + CSS + vanilla JS. Hosted on GitHub Pages.

## Current activities

| Department | Activity | Topic |
|---|---|---|
| Chemistry (GCSE) | [Mendeleev's Cards](chemistry/mendeleev-cards/) | Drag-drop sorting of 22 elements into the Mendeleev periodic-table grid |

## Adding a new activity

1. Create a folder: `<department>/<activity-slug>/`
2. Drop in `index.html` linking to `../../style.css` and the activity's own `style.css` + `script.js`
3. **Include the intro overlay** by adding this line just before `</body>`:
   ```html
   <script src="../../assets/intro-loader.js"></script>
   ```
   The intro plays once per browser session, has a Skip button, and fades into the activity automatically. Add `?intro` to the URL to force-replay (handy for demos). Add `?nointro` to suppress.
4. Add a card to the hub `index.html` pointing at the new folder
5. Commit and push — Pages serves the change within a minute

## Design principles

- **Works on phone, Chromebook, and Promethean board** without logins
- **Pointer Events API** for unified mouse + touch + pen input
- **No external APIs / keys** — fully client-side, works offline if downloaded
- **OLS branding**: deep blue `#1A3A6B`, gold `#E4B824`, border grey `#595959`
- **Specification-aligned**: every activity ties to a named CCEA/WJEC/AQA topic
