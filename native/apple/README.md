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
3. Select the same Personal Team for the `ExchangeNotes` and
   `YumiWidgetExtension` targets.
4. Connect the iPhone, enable Developer Mode, and press Run.
5. Add the Yumi widget from the iOS Home Screen widget gallery.

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
