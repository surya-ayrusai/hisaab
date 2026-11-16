# Fonts

Both files are copied from npm packages and served from this origin. The page
makes no request to Google Fonts or any other third party, so it loads at the
same speed on a weak connection and keeps working offline.

| File | Size | Source package | Licence |
| --- | --- | --- | --- |
| `ibm-plex-sans-latin-wght-normal.woff2` | 45 KB | `@fontsource-variable/ibm-plex-sans` | SIL Open Font License 1.1 |
| `hisaab-wordmark.woff2` | 3 KB | `@fontsource/ibm-plex-serif` | SIL Open Font License 1.1 |

**IBM Plex Sans** is the whole interface. The full latin variable font — one
file covering weights 100 to 700 — because it has to render any customer name,
shop name or note that is typed in.

It was chosen over Plus Jakarta Sans, Source Sans 3 and Inter on one test that
matters here: at display size Plus Jakarta's `1` reads as a lowercase `l`, so
`Rs 11,820` looked like `Rs ll,820`. Plex draws an unmistakable `1`, and every
digit sits on the same 600-unit advance, so columns of money line up without
needing the `tnum` feature (which this font does not carry).

**IBM Plex Serif** is the HISAAB wordmark and nothing else — the designed
superfamily partner of Plex Sans. The copy here is pinned to weight 600 and
subset to capitals and a space, which takes it from 44 KB to 3 KB. Worth doing
for a product whose customers are on weak mobile connections.

To rebuild the wordmark file:

```bash
npm i -D @fontsource/ibm-plex-serif
pip install fonttools brotli
pyftsubset node_modules/@fontsource/ibm-plex-serif/files/ibm-plex-serif-latin-600-normal.woff2 \
  --output-file=src/app/fonts/hisaab-wordmark.woff2 \
  --flavor=woff2 --layout-features=kern --unicodes="U+0041-005A,U+0020"
```

Keep the subset to capitals: the wordmark is set in capitals, and adding
lowercase would triple the file for glyphs nothing draws.

To refresh the interface font, reinstall `@fontsource-variable/ibm-plex-sans`
and copy `files/ibm-plex-sans-latin-wght-normal.woff2` into this folder.
