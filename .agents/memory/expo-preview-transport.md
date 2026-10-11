---
name: Expo preview transport
description: Check the transport scheme when Expo Go fails before downloading the app.
---
When Expo Go reports “Failed to download remote update,” compare HTTP and HTTPS
reachability for the current preview host before changing application logic.
Expo Go interprets `exp://` as HTTP and `exps://` as HTTPS.

**Why:** The CLI emitted an `exp://` preview URL even though requests to the
preview host over HTTP were refused and HTTPS served both the Android manifest
and bundle successfully. Dependency alignment alone did not resolve the user's
download error. The user also reported the same error after being given the
secure link, so the transport difference is not an established root cause or
confirmed fix. Server reachability is not proof of successful native loading.

**How to apply:** Obtain the current host from the running workflow, never store
or reuse an old host. If HTTPS works and HTTP fails, test an `exps://` link on the
device. If that fails too, obtain phone-side browser reachability and the Expo
Go version rather than repeating reloads. Preserve the managed Expo sign-in
flow and local storage.

Treat development-preview failures separately from the published native app.
The user confirmed that the published Replit launcher opened Tempo inside Expo
Go while the development link and embedded Android preview failed.

**Why:** A broken embedded preview or development transport is not evidence
that the published native app cannot run; browser reachability alone is also
not native validation.

**How to apply:** Use the working published launch path for physical-device
checks, after confirming the app opens inside Expo Go rather than Chrome and
that the published version includes the code being tested. Do not claim
lifecycle persistence is verified merely because the app opens.
