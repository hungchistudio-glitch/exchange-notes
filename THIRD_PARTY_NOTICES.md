# Third-party notices

## CC-CEDICT

Exchange Notes uses CC-CEDICT dictionary data as a resilient Chinese–English
lookup fallback.

- Source: https://www.mdbg.net/chinese/dictionary?page=cc-cedict
- License: Creative Commons Attribution-ShareAlike 4.0 International
  (https://creativecommons.org/licenses/by-sa/4.0/)
- Packaged derivative: `data/cc-cedict-vocabulary-index.json.gz`, distributed
  under the same CC BY-SA 4.0 license

The packaged index changes the storage format and selects one best-effort
translation per lookup key; it does not claim ownership of the dictionary
content. Application-created examples and interface code are separate from the
CC-CEDICT dataset.

## jsQR

Friend QR codes are decoded in the browser with jsQR. Safari does not
implement the `BarcodeDetector` API, so an in-app scanner on iPhone needs a
JavaScript decoder rather than a platform one.

- Source: https://github.com/cozmo/jsQR
- License: Apache License 2.0
  (https://www.apache.org/licenses/LICENSE-2.0)

## Free Dictionary API

English dictionary metadata is retrieved from https://dictionaryapi.dev/ as a
best-effort, keyless fallback.

## Emil Kowalski's agent skills

Five agent skills (instructions for coding agents, not shipped code) are kept
in `.claude/skills/` (Codex reads them through `.agents/skills/`):
`review-animations`, `animation-performance`, `mobile-native`, `break-ui` and
`learn-taste`.

- Source: https://github.com/emilkowalski/skills (commit 64eb3de)
- License: MIT, Copyright (c) 2026 Emil Kowalski; the full text is in each
  skill's `LICENSE`
