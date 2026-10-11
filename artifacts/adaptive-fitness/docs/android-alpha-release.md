# Tempo Android alpha handoff

This is a preparation checklist, not approval to submit or publish Tempo.

## Hold points

- Confirm whether the Google Play Console owner is a personal account or an organization.
- Choose and check the permanent Android application ID with the owner before the first Play upload. `app.json` intentionally does not set `android.package` yet. Expo may show a placeholder in config inspection or generate an environment-specific package during prebuild; neither is an approved store ID.
- Complete the account's verification before using Play Console. Do not put account credentials or signing keys in this repository.
- No Play upload, test-track release, or production submission is authorized by this document.

## App identity and assets

- Current app name: `Tempo — Adaptive Fitness` (25 characters); Expo version: `1.0.0`.
- Android `versionCode` starts at `1`; increment it for every uploaded bundle.
- `assets/images/icon.png` is the 1024 × 1024 launcher artwork.
- `assets/images/play-store-icon.png` is a 512 × 512, RGBA Play listing icon under the 1 MiB limit.
- Before a Play listing is ready, prepare its short description (80 characters maximum), full description, phone screenshots, and 1024 × 500 feature graphic. Confirm the final listing name and artwork in Play Console.
- Google Play requires new apps and updates to target Android 16 / API 36 or higher from 31 August 2026. The installed Expo SDK 57 Android default is API 36; confirm the generated release bundle still targets API 36 before upload.

## Permissions and data flow reviewed

- Tempo's workout state uses device-local AsyncStorage: profile preferences (including excluded body areas), routines, schedules, active sessions, and completed-workout history.
- The app requests the read-only shared exercise catalog from Tempo's API. Its catalog endpoints do not accept workout/profile data and expose no account or write endpoints.
- The bundled starter catalog is available immediately offline. A previously cached catalog remains available offline after it has been downloaded.
- The preview API was checked on 11 October 2026 and its catalog manifest returned 503 because the connected database did not contain `catalog_releases`. This does not prevent bundled/offline browsing. Before relying on network catalog refresh in an Android alpha, initialize the API database through the project's approved development flow and verify that a reviewed release is active; recheck the intended API environment before building.
- Export is user-initiated and opens Android's share sheet with a JSON backup. The destination app selected by the user receives that backup. Deleting Tempo removes local data unless the user exported a copy.
- The Settings disclosure now distinguishes catalog requests from personal workout data and warns about sharing an export.
- `expo-image-picker` and `expo-location` were unused. They have been removed, and their camera, media-storage, microphone, and location permissions are blocked in static Expo config. Haptics still need vibration; catalog refresh needs Internet access.
- Before a closed test or production release, publish a public privacy-policy URL, link it in the app and Play listing, and complete the Data safety form using the actual shipped SDKs and any hosting/provider practices. Recheck the share-sheet disclosure when answering data-sharing questions.
- Complete Play Console's health-app declaration and the app-content questionnaires (target audience, ads, content rating, and app access). Tempo is general fitness/wellness software, not a medical device or medical advice.

## Checks and Android device verification

The existing tests cover immediate offline use of the bundled catalog, last-known-good catalog caching, stored active-session restoration, and paused/running clock recovery. These are code-level checks, not proof of native Android behavior.

Before calling the alpha ready, install the signed build on an Android phone and verify:

- first launch, setup, and empty-state flow;
- search and open the bundled catalog in airplane mode, including after a force-stop/relaunch;
- create and save a routine, schedule it, start it, log work, background the app, return, and confirm the session is intact;
- force-stop and relaunch during that session, confirm it resumes with the latest logged work and correct paused/running clock behavior;
- complete a session, confirm it appears in history, and verify export/import on a test backup;
- no permission prompts appear for location, camera, microphone, or media access.

No Android emulator or `adb` device is available in the Replit workspace, so native Android installation, backgrounding, and restart behavior remain unverified here.

## External build and Play testing route

Replit's current Expo publishing flow does not submit Android apps to Google Play. Use Expo's documented **local Android production build** route on a computer with Android Studio/Android SDK and the JDK required by the current Expo SDK:

1. In a separate local clone, install the workspace dependencies and set the approved `android.package` in `artifacts/adaptive-fitness/app.json`.
2. Set `EXPO_PUBLIC_DOMAIN` to the intended live API server host for catalog updates; do not bake a Replit development-preview host into a store build. Without a live API host, the bundled and cached catalog still work, but catalog refresh will not.
3. Generate the Android project with Expo prebuild, then use Android Studio's signed Android App Bundle flow (or Gradle's `app:bundleRelease`) to produce a signed `.aab`.
4. Enroll in Play App Signing and protect the upload key and passwords outside the repository. Back up the upload key securely.
5. Upload the first `.aab` to **Internal testing** first (optional, up to 100 testers) for fast QA. The first upload fixes the package name permanently.
6. After the internal check, use **Closed testing** for a controlled group. For a personal Play Console account created after 13 November 2023, keep at least 12 testers continuously opted in for the 14 days immediately before requesting production access. If someone opts out, their consecutive period restarts. Then request production access in Play Console and answer its testing/readiness questions.
7. Do not move to production or submit a release without the owner's explicit approval.

Google Play account requirements differ by owner type. Personal accounts use identity details from the linked Google Payments profile and may require real-device verification through the Play Console mobile app. Organization accounts require organization details and ordinarily a D‑U‑N‑S number; Google says to check existing records and apply directly through Dun & Bradstreet if needed. The owner must complete verification and account setup themselves.

## Official references

- [Expo local Android production build](https://docs.expo.dev/guides/local-app-production/)
- [Replit native mobile app publishing support](https://docs.replit.com/features/artifact-types/building-mobile-apps)
- [Google Play testing tracks](https://support.google.com/googleplay/android-developer/answer/9845334)
- [Testing requirements for new personal accounts](https://support.google.com/googleplay/android-developer/answer/14151465)
- [Google Play Data safety](https://support.google.com/googleplay/android-developer/answer/10787469)
- [Google Play privacy policy requirements](https://support.google.com/googleplay/android-developer/answer/9859455)
- [Target API level requirements](https://support.google.com/googleplay/android-developer/answer/11926878)
- [Required Play Console account information](https://support.google.com/googleplay/android-developer/answer/13628312)
