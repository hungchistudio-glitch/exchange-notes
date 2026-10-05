# Claude handoff audit — completed 2026-10-05

Base: `31d3511`. Claude stopped; the user authorized Codex to complete the
handoff and publish after verification. The obsolete return-home draft is
archived in git stash. Main's return transition (`9e24c67`), cookie glyphs
(`8eb7bb7`), dictionary and built-in IPA (`31d3511`) are preserved.

The source handoff described approximately 60 issues but did not include the
individual checklist. This ledger records verified findings and changes;
it does not claim an independent reproduction of 60 separate bugs.

## Completed changes

### J — library and data safety

- Removed automatic remote image deletion based on a potentially stale device
  mirror. Refreshing a device cannot delete photos saved on another device.
- Flush pending writes before loading a server snapshot, then overlay anything
  still pending. Edits/deletes to an offline insert queue behind that insert.
- Fetch vocabulary in ordered 500-row pages, including libraries over 1,000.
- Ignore snapshots overtaken by edits, account changes or unmount. Same-account
  auth refresh no longer blanks the library or triggers a loading spinner.
- Serialize mirror replacement and logout cleanup so an old write cannot
  repopulate the previous account's device copy after logout.
- Apply background translations only if the source texts/examples still match,
  both in SQL updates and client state. Preserve later edits and nonempty text.

### K — home, search and shell

- Keyboard and sheet scroll locks now share ownership. Closing them in either
  order restores the original styles instead of leaving the app unscrollable.
- An HTTP error is no longer classified as a lost network connection. Only a
  current request's transport failure changes the network indicator.
- The error screen retries with a complete reload, including server rendering.
- A late save acknowledgement cannot undo a second cookie feed.
- Gemini word lookup has a persistent 150-per-user daily allowance. Memory and
  shared-cache hits bypass it; unsuccessful model requests are refunded;
  dictionary fallback remains available after exhaustion. Five-language copy
  explains the daily limit without offering an ineffective retry.
- Restricted the development-origin exception to 127.0.0.1 so the local mobile
  preview can hydrate in Next 16. Production behavior is unaffected.

### L — friends, messages and sharing

- Note-share UPDATE validates ownership of the resulting note. Shared-note
  reads validate both ownership and current friendship.
- Unfriend revokes note shares in both directions and blocks new messages;
  existing conversation history remains readable. Re-friending does not
  silently restore old private-note shares.
- Message and friend-accepted push events require current friendship, including
  replayed old events. The composer explains when only history is available.
- Conversations open on the newest 100 messages and load earlier pages with a
  stable timestamp/id cursor; histories over 500 are no longer stuck at the
  oldest page. Loading earlier messages preserves the scroll position.
- News shares fit the 2,000-character message limit. Inbox and push previews
  display titles/words instead of encoded JSON. Existing payloads still decode.
- Logout removes the browser push subscription even if its server cleanup
  fails; existing native push cleanup remains in place.

### M — discovery, voice, pronunciation and scanning

- Discovery reopens the same day's cached batch, scoped by account/language.
  Explicit radar refresh replaces it; only opened stories are marked read.
- Voice and pronunciation recording own their asynchronous sessions. Late
  microphone permission is immediately released after cancel/navigation;
  callbacks from previous sessions cannot submit into a later recording.
- Search submits final speech once, waits for recorder completion before an
  audio fallback, and releases a stalled recording after 15 seconds.
- Pronunciation scoring uses the recognizer's first final alternative; cancelling
  settles the old analysis without an old timeout aborting the next one.
  A completed attempt keeps its target despite weakness-ranking changes.
- Cancelling menu analysis aborts the request, ignores late responses and lets
  the same captured frame be tried again. Transport failures have offline copy.

## Database rollout and verification

Migration `20261005021044_protect_note_shares_and_friend_contact.sql` was
applied to the existing Supabase project on 2026-10-05. The regression script
`supabase/tests/friend_contact.sql` passed against that database inside a
transaction rolled back at the end. It verified:

- a share cannot be redirected to another person's private note;
- a legitimate recipient can read an active share, but not unrelated notes;
- unfriend revokes access and cannot be bypassed by re-enabling the share;
- old message history stays readable and new messages are rejected.

No test users, notes or conversations remain from that transaction.

Post-migration security advisors show the same pre-existing categories:
10 server-only RLS tables without client policies; eight deliberately exposed,
auth-bound security-definer RPCs; the `public_profiles` projection; and disabled
leaked-password checking. The profile view exposes only id, display name,
exchange id, avatar and the two language preferences to authenticated readers;
`anon` has no SELECT grant. Its definer behavior is the existing public-directory
access model, not a private-profile projection introduced by this change.
Account password-policy changes are outside this bug-fix rollout.

## App verification

- Full local Vitest run: **206 files / 1,599 tests passed**.
- Final focused regressions after lint cleanup and push-event protection:
  **3 files / 11 tests passed**, including three new push boundary cases.
- TypeScript: passed. Full ESLint: zero errors; 12 existing unused-variable
  warnings in `tests/aiDailyQuota.test.ts`. Final touched-file lint: clean.
- Next production build: passed (compile, type-check, 69 static pages).
  The sandboxed build stalled; the permitted local build completed normally.
- Mobile-size local preview (390 × 844): search + Yumi return clears input;
  drag opens the ring; blank-space tap closes it; bilingual icon controls switch
  playback state; card dismissal works; star gathering releases; no console
  errors observed. Preview fixtures were used, not user account mutations.
- Additional authenticated-home browser verification was blocked by the desktop
  automatic approval review's usage limit. Physical iPhone PWA keyboard motion,
  microphone/camera hardware, actual spoken audio quality and OS push delivery
  were not measured by these desktop checks.

No native Apple files were changed, so a new native build was not applicable.
