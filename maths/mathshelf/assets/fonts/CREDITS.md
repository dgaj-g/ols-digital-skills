# Font credits — MathShelf

All four families are licensed under the **SIL Open Font License 1.1** (OFL), which permits
self-hosting, embedding and redistribution with the font's reserved names left intact.
Files are the latin woff2 subsets served by the Google Fonts CSS2 API (Fraunces and STIX Two
Text fetched 12 June 2026; Schibsted Grotesk and Spline Sans Mono fetched 5 Sept 2026 — both
fetches with a woff2-capable Chrome user agent); `fonts.css` preserves the API's
`unicode-range` declarations and adds `font-display: swap`.

| Family | Files | Version (name table) | Role in FAIR COPY |
|---|---|---|---|
| Fraunces (72pt optical cut, variable wght) | `fraunces-opsz72-400-700-latin.woff2` (serves 400/600/700) | Version 1.000;[b76b70a41] (API v38) | Display — cover foil, shelf labels, headings |
| STIX Two Text (variable wght) | `stix-two-text-400-700-latin.woff2` (serves 400/700), `stix-two-text-400-italic-latin.woff2` | Version 2.13 b171 (API v18) | Body + all mathematics (U+2212 minus, real ×, °) |
| Schibsted Grotesk (variable wght) | `schibsted-grotesk-400-700-latin.woff2` (serves 400/500/700) | Version 1.100;gftools[0.9.25] (API v7) | UI chrome — interface text, buttons, typeset comments (replaces Caveat) |
| Spline Sans Mono (variable wght) | `spline-sans-mono-400-600-latin.woff2` (serves 400/600) | Version 1.004 (API v13) | Mono — stationery, labels, eyebrows (replaces Courier Prime) |

Maths codepoint audit: U+2212 − · U+00D7 × · U+00F7 ÷ · U+00B0 ° · U+00B2 ² are all present
in every file's cmap (verified with fontTools 4.63.0). None of these families publishes a
separate `math`/`symbols` subset; the latin subset covers all five — including Schibsted
Grotesk and Spline Sans Mono, audited the same way when they replaced Caveat/Courier Prime.

## Sources

- Fraunces — designed by Undercase Type (Phaedra Charles, Flavia Zimbardi).
  https://fonts.google.com/specimen/Fraunces · https://github.com/undercasetype/Fraunces
  CSS2 request: https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@72,400;72,600;72,700
- STIX Two Text — STI Pub Companies / Tiro Typeworks.
  https://fonts.google.com/specimen/STIX+Two+Text · https://github.com/stipub/stixfonts
  CSS2 request: https://fonts.googleapis.com/css2?family=STIX+Two+Text:ital,wght@0,400;0,700;1,400
- Schibsted Grotesk — designed by Bakken & Bæck and Henrik Kongsvoll.
  https://fonts.google.com/specimen/Schibsted+Grotesk · https://github.com/schibsted/schibsted-grotesk
  CSS2 request: https://fonts.googleapis.com/css2?family=Schibsted+Grotesk:wght@400;500;700
- Spline Sans Mono — designed by Eben Sorkin and Mirko Velimirović.
  https://fonts.google.com/specimen/Spline+Sans+Mono · https://github.com/SorkinType/SplineSansMono
  CSS2 request: https://fonts.googleapis.com/css2?family=Spline+Sans+Mono:wght@400;600

OFL licence text: https://openfontlicense.org/open-font-license-official-text/
