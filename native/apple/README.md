# Exchange Notes Apple Platforms

## Free Personal Team build

The `ExchangeNotesPersonal` scheme installs the native app and the WidgetKit
extension with a free Apple Developer Personal Team. It keeps the App Group so
the app and widget can share Yumi data, but excludes the unsupported native
push-notification entitlement and bridge.

Generate and verify the project:

```bash
npm run generate:native
npm run test:native-personal
```

Install on a personal iPhone:

1. Open `ExchangeNotesApple/ExchangeNotesApple.xcodeproj` in Xcode.
2. Select the `ExchangeNotesPersonal` scheme.
3. Select the same Personal Team for the `ExchangeNotes`,
   `YumiWidgetExtension` and `PocketShareExtension` targets.
4. Connect the iPhone, enable Developer Mode, and press Run.
5. Add the Yumi widget, or Yumi Pocket Lookup (small or medium), from the
   iOS Home Screen widget gallery.

### Yumi Pocket Lookup (Chi, 2026-11-12)

- **The widget** (`Widget/PocketLookupWidget.swift`): the medium size offers
  typing and voice, the small one typing. Each opens `/lookup` in the app
  (`ExchangeNotesRoute.lookup`), which is on production: the app always
  loads `https://exchange-notes-app.vercel.app`. It wears the mode and the
  language pair the app last handed over (`PocketPreferences.swift`, from
  `components/pocket/PocketPreferencesSync.tsx`); iOS may tint it.
- **The share extension** (`Share/`): text selected in another app, then
  Share, then Exchange Notes. Stage one looks words up in the built-in
  dictionary (`Share/PocketDictionary.swift`, exported from
  `lib/vocabulary/coreLexiconData.ts` by `scripts/export-pocket-lexicon.mjs`)
  and saves nothing.
- **Shortcuts** (iOS 18+): `Shared/OpenPocketLookupIntent.swift`.
- `npm run test:native-personal` builds all three targets and checks the
  dictionary, the preferences and the deep links.

The free provisioning profile expires after seven days. Re-run the Personal
scheme from Xcode to renew the installation.

### Deep links

The native widget opens the installed Exchange Notes app directly:

```text
exchangenotes://vocabulary?widgetAction=add-word
exchangenotes://capture?widgetAction=camera
exchangenotes://review
exchangenotes://speak?language=en-US&text=example
```

These are widget-to-app links only. Nothing outside this build depends on the
`exchangenotes://` scheme — in particular the friend QR code encodes an
ordinary `https://<host>/friends?add=<exchangeId>` link, so the system camera
recognises it and it works on a phone that has never installed this app.

## Phase 1

- SwiftUI iPhone host app
- WidgetKit Home Screen widget
- Small and medium Yumi layouts
- Vocabulary and Review deep links

## Phase 2

- watchOS companion app
- WidgetKit complications
- Yumi cookie and study progress

## Phase 3

- App Group shared storage
- Supabase authenticated data
- Timeline refresh and offline cache

## Platforms

- iOS
- watchOS
- visionOS architecture prepared for a future Apple silicon build environment
