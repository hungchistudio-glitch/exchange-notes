# Exchange Notes — Yumi Scriptable Widget

This directory contains the JavaScript used by the Scriptable iPhone Widget.

## Prerequisites

Before testing the Widget:

1. Deploy the `feature/scriptable-yumi-widget` application changes.
2. Apply the reviewed Scriptable Yumi Supabase migration.
3. Log in to Exchange Notes and open the Home page once so the first snapshot can be saved.
4. Open **Settings → iPhone Widget** and generate a private token.

The complete private token is shown only once. Exchange Notes stores only its SHA-256 hash.

## Install on iPhone

1. Install **Scriptable** from the App Store.
2. Create a new Scriptable script named `Exchange Notes Yumi Widget`.
3. Copy the complete contents of `ExchangeNotesYumiWidget.js` into the script.
4. Run the script inside Scriptable.
5. Choose **設定或更新連線**.
6. Enter the deployed Exchange Notes HTTPS URL.
7. Paste the private token created in Exchange Notes.
8. Choose a Widget preview to verify the layout.
9. Add a Scriptable Widget to the iPhone Home Screen.
10. Edit the Widget and select `Exchange Notes Yumi Widget`.

## Storage and security

- The plaintext token is stored only in the iOS Keychain.
- The token is sent through the `Authorization: Bearer` request header.
- The token is not included in the Widget cache.
- The latest successful Widget snapshot is stored in Scriptable local storage for offline display.
- Resetting the Scriptable connection removes the local URL, token, and cache.

## Widget links

All Widget sizes:

- Widget background → Home (`/`)
- Add Word → Vocabulary with the add-word dialog open (`/vocabulary?widgetAction=add-word`)
- Camera → Capture with the camera flow selected (`/capture?source=camera&from=widget`)

Medium and large Widgets also include:

- Previous/next → Run this Scriptable script and update the selected word
- `A` → English speech page (`/speak?language=en-US&text=...`)
- `ㄅ` → Traditional Chinese speech page (`/speak?language=zh-TW&text=...`)

The speech page is public because it only plays the text already present in
the URL. Home, Vocabulary, Capture, and Profile remain protected by the normal
Exchange Notes sign-in flow.

## Visual behavior

- Small and medium Widgets use 12-point padding on every outer edge.
- Large Widgets use 14-point padding on every outer edge.
- The background uses translucent space, orbit, grid, and particle artwork.
- iOS does not expose the Home Screen wallpaper through a normal Scriptable
  Widget. The glass effect is translucent artwork, not true wallpaper
  transparency.

## Automated verification

Run the Widget contract test from the project root:

```bash
npm run test:widget
```

The test compiles the Scriptable source in a mocked runtime, builds small,
medium, and large layouts, verifies equal outer padding and action sizes, and
checks that every HTTPS target maps to a real Next.js page with the expected
query-parameter handler.

## Refresh behavior

The script requests a refresh no earlier than 30 minutes after rendering. The actual refresh schedule remains controlled by iOS.

## Repository safety

Never paste a real Scriptable token into this repository or commit it to Git.
