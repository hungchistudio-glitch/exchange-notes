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

Small Widget:

- Opens Vocabulary.

Medium and large Widgets:

- Add Word → Vocabulary
- Camera → Capture
- Review → Review

## Refresh behavior

The script requests a refresh no earlier than 30 minutes after rendering. The actual refresh schedule remains controlled by iOS.

## Repository safety

Never paste a real Scriptable token into this repository or commit it to Git.
