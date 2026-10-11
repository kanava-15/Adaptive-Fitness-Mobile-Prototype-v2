# Native workout verification

## Status

Native verification is **pending**. This workspace has no connected iOS/Android
device, Android emulator/ADB, or iOS simulator. Node tests and Expo web are not
evidence that native AsyncStorage, operating-system suspension, keyboards, or
sharing work.

The domain regression tests in
`artifacts/adaptive-fitness/tests/activities.test.ts` cover serialized restart
data, running and paused clocks, midnight rollover, pinned planned snapshots,
logged breaths, all four distance units, left/right sides, explicit zero loads,
absent optional loads, and export/import payload validation. They do not mount
the provider or call the native storage bridge.

## Device procedure — run separately on iOS and Android

Use a disposable local data set. Export existing data first; import replaces
all local data. Do not uninstall the app or clear its storage to simulate a
restart: those actions deliberately delete local data.

Record device model, OS version, Expo Go/development-build version, app revision,
start/resume times, and the actual result of each check. Keep exported personal
data out of committed test evidence.

1. Create a routine with a breath-count activity (6 breaths), a timed activity
   (40 seconds), and distance targets in m, km, mi and yd (1.25 each). Choose
   compatible library activities or author compatible activities. Include left,
   right, both and alternating sides where supported. Include loadable targets
   with 10 kg, explicit 0 lb, and a cleared optional load.
2. Test each numeric field with the native keyboard: replace a value, delete to
   blank, enter 0, enter a decimal, and use plus/minus immediately after editing.
   For decimal keyboards using a comma separator, enter 12,5. Save while the
   keyboard is still visible; the saved number must match the displayed value.
   Cleared optional load must remain absent, distinct from 0.
3. Schedule the routine and start it. Log 5 breaths on the left and 2.75 of each
   distance unit with varied sides. On a loadable activity log 10 kg, then 0 lb.
   Check that the planned snapshot still contains the original targets, while
   logged sets contain the actual values.
4. Leave both session and exercise clocks running. Record displayed elapsed
   time, background the app for 60 seconds, then return. The clocks must include
   elapsed background time, not depend on interval ticks. An expired timed set
   must log once on return; background/resume again must not duplicate it.
5. Pause the clocks. Background for 60 seconds and return. Both must remain
   paused at the same values.
6. Wait for saves, close the app from the task switcher, and relaunch without
   deleting storage. Resume the active session from Today. Verify session
   identity, current activity, snapshots, sets, sides, units and 0 lb.
   Repeat once with clocks running and once paused. Running clocks include the
   time while closed; paused clocks do not. Also try closing immediately after
   a set is logged, recording any lost last edit separately.
7. If possible, background across local midnight. On return, today's generated
   suggestions may rebuild, but the active workout's date, schedule snapshot
   and logged sets must not be rewritten.
8. Finish and relaunch. Confirm history contains the same planned and executed
   items, measurements, units, sides and loads with the expected elapsed time.
9. In You, export through the native Share sheet to a destination that preserves
   the complete JSON text. Cancel once and retry. Check that cancellation/failure
   does not change workout data.
10. Copy the complete exported text back into You's import field. Malformed text
    must be rejected without modifying local data. For valid text, cancel the
    replacement confirmation first (no changes); then approve replacement.
    Relaunch and verify the restored schedule, active session if exported while
    running, and completed history. Import is currently paste-based; no file
    picker or inbound OS share-target handler is promised.

## Result record

| Check | iOS | Android |
| --- | --- | --- |
| Native numeric edits and immediate save | Not run | Not run |
| Optional load blank versus explicit zero | Not run | Not run |
| Running background/resume and timer expiry | Not run | Not run |
| Paused background/resume | Not run | Not run |
| Running and paused close/relaunch | Not run | Not run |
| Planned snapshots, actual sets and units | Not run | Not run |
| Local-midnight rollover | Not run | Not run |
| Completion persistence | Not run | Not run |
| Share cancellation and full JSON handoff | Not run | Not run |
| Import reject/cancel/replace and relaunch | Not run | Not run |

Do not mark native lifecycle verification complete until these results have
actual device evidence or the required scope is explicitly changed.
