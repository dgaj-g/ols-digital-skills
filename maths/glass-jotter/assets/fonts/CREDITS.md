# Font credits — The Glass Jotter

All four families are licensed under the **SIL Open Font License 1.1** (OFL), which permits
self-hosting, embedding and redistribution with the font's reserved names left intact.
Files are the latin woff2 subsets served by the Google Fonts CSS2 API (fetched 12 June 2026
with a woff2-capable Chrome user agent); `fonts.css` preserves the API's `unicode-range`
declarations and adds `font-display: swap`.

| Family | Files | Version (name table) | Role in FAIR COPY |
|---|---|---|---|
| Fraunces (72pt optical cut, variable wght) | `fraunces-opsz72-400-700-latin.woff2` (serves 400/600/700) | Version 1.000;[b76b70a41] (API v38) | Display — cover foil, shelf labels, headings |
| STIX Two Text (variable wght) | `stix-two-text-400-700-latin.woff2` (serves 400/700), `stix-two-text-400-italic-latin.woff2` | Version 2.13 b171 (API v18) | Body + all mathematics (U+2212 minus, real ×, °) |
| Courier Prime | `courier-prime-400-latin.woff2`, `courier-prime-700-latin.woff2` | Version 3.018 (API v11) | Stationery, printed labels, buttons |
| Caveat (SemiBold 600) | `caveat-600-latin.woff2` | Version 2.000 (API v23) | Red teacher comments only |

Maths codepoint audit: U+2212 − · U+00D7 × · U+00F7 ÷ · U+00B0 ° · U+00B2 ² are all present
in every file's cmap (verified with fontTools 4.63.0). None of these families publishes a
separate `math`/`symbols` subset; the latin subset covers all five.

## Sources

- Fraunces — designed by Undercase Type (Phaedra Charles, Flavia Zimbardi).
  https://fonts.google.com/specimen/Fraunces · https://github.com/undercasetype/Fraunces
  CSS2 request: https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@72,400;72,600;72,700
- STIX Two Text — STI Pub Companies / Tiro Typeworks.
  https://fonts.google.com/specimen/STIX+Two+Text · https://github.com/stipub/stixfonts
  CSS2 request: https://fonts.googleapis.com/css2?family=STIX+Two+Text:ital,wght@0,400;0,700;1,400
- Courier Prime — designed by Alan Dague-Greene for Quote-Unquote Apps.
  https://fonts.google.com/specimen/Courier+Prime · https://quoteunquoteapps.com/courierprime/
  CSS2 request: https://fonts.googleapis.com/css2?family=Courier+Prime:wght@400;700
- Caveat — designed by Impallari Type.
  https://fonts.google.com/specimen/Caveat · https://github.com/googlefonts/caveat
  CSS2 request: https://fonts.googleapis.com/css2?family=Caveat:wght@600

OFL licence text: https://openfontlicense.org/open-font-license-official-text/
