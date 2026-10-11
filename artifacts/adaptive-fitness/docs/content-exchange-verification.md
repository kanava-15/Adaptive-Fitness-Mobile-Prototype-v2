# Content exchange verification

## Automated

- App typecheck passed.
- App tests: public/custom selective exports and round trips; exact pinned older and differing same-ID/version knowledge; duration, repetitions, breaths, all four distance units, kg/lb and explicit zero load; nested/repeated ordered sequence members and fresh-ID mapping.
- Import checks cover malformed JSON, encoding markers, size/count limits, unknown fields, unsupported versions/units/metrics, missing dependencies/sources, duplicate refs, cycles, depth and excessive expansion.
- Trust-spoofing claims remain original attribution, never local verification/adaptation permission. Missing doses remain absent drafts; only explicitly approved complete targets confirm. Existing launch/scheduling validation rejects incomplete items.
- Collision, duplicate, intentional copy, altered/stale review, storage rejection and successful persistence checks preserve original identifiers and profile, presets, bookmarks, active sessions, history, schedules and existing library entries.
- Whole-device backup/restore and stored restart with imported metadata pass alongside existing Tempo compatibility regression tests.
- Catalog tests passed; no catalog mutation or coverage-rule changes.

## Focused web pass

Verified in an isolated browser: pasted malformed JSON error; file preview of mixed example; dependency/attribution/target review; preview cancellation; draft import; missing targets blocked; persistence after reload; identical-package duplicate block; intentional-copy rapid double-click adds only one copy; explicit approval of complete targets; selective export JSON with zero load/units; Copy confirmation; browser JSON-download event; guide and copyable schema/prompt/examples.

Initial Expo navigation was briefly white during cold loading, then rendered fully without a runtime failure. Picker cancellation sometimes returned an empty file list rather than a cancellation flag; transport now treats both as cancellation. This small follow-up was checked by typecheck/code, without repeating the full browser pass.

The browser pass did not exercise invalid-UTF-8/oversized picker files (paste/package validation is covered by unit tests), reopen the downloaded file's bytes, or visit every compact export shortcut. Sharing/selection transport uses the official Expo modules with explicit read/encoding/size checks and visible failures.

## Native verification still needed

Android and iOS share sheets and document pickers cannot be driven in this environment. On physical devices, verify:

1. Export a routine with nested/repeated dependencies, distance units and zero load; save/share the actual `.json` file, cancel sharing, and use Copy when sharing is unavailable.
2. Import that file from the system picker (including Files/cloud document providers), cancel selection, reject invalid encoding or an oversized file, and preview before approving.
3. Keep a running session and existing history/schedule/profile during import. Reload the app and verify those records and imported drafts remain intact.
4. Confirm complete proposed targets explicitly, edit an imported activity/sequence, and verify repeat imports and rapid submissions do not create unintended copies.

No native success is claimed. This feature does not introduce live AI/provider connections, schedules imported from packages, or automatic workouts.
