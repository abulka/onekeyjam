> **Obsolete.** The app no longer uses Firebase. It is now a fully client-side
> static site, with featured projects and keyboard configs as static JSON and
> user projects in IndexedDB. This document is kept only as a historical record
> of the former Firebase setup and emulator workflow.

## Situation on a fresh Mac

I checked your Mac's current state:

- **Firebase CLI is not installed.** There is no `firebase` command, and `firebase-tools` is not in the project or global `node_modules`.
- **Java is not installed.** Firebase's Firestore emulator is a Java program and needs Java 11 or newer. You only have the macOS stub at `/usr/bin/java`, which reports that no runtime is present.
- **Homebrew is installed** (version 7, Apple silicon), so installing the missing pieces is straightforward.
- **Ports 8085 and 9099 are free**, so nothing is currently running.
- **There is no seed data.** `bin/firebase-emulator` starts the emulator with `--import firebase-persist`, but that folder does not exist on disk and is gitignored. The emulator would therefore start completely empty.

## Can you run without it?

Yes, but messily. In development the app is hardwired to talk to the local emulator: `src/lib/settings.js` sets `isProduction` to false, so `firebaseUtils.js` connects Firestore to `localhost:8085` and Auth to `localhost:9099` unconditionally.

Concretely, at boot:

- `bootKeyboardFirebase()` awaits a Firestore read of `keyboards/_lookup`. With no emulator that promise rejects, and `src/lib/main.js` catches it and shows an `alert(e)`.
- `linkProjectToKeyboard()` then calls `listFeaturedProjects()` and `listUserProjects()` without awaiting them, so you would see unhandled promise rejections in the console.
- Basic jamming still works, because the project and the keyboard octaves fall back to defaults (`lhTriggerOctave` 3, `rhJamSoundOctave` 4).
- Login, saved and featured projects, and keyboard configs would not work at all.

So it is not strictly blocked, but you would get an alert on startup and console errors, and the Firebase-backed features would be dead.

## How hard is it to install

Easy, roughly five to ten minutes, with one caveat about seed data.

1. Install a JDK: `brew install --cask temurin` (or `brew install openjdk`). This may ask for your admin password.
2. Install the CLI: `npm install -g firebase-tools`.
3. Optionally run `firebase login`. Emulators usually start without it, but you may be prompted.
4. Start them with `npm run firebase`, or use `bin/firebase-emulator` for persistence.

The caveat is that an empty emulator is not very useful. The app expects a `keyboards` collection with a `_lookup` document and a `projects` collection with a `_lookup` document. Without them you get the warning that you need to populate the `keyboards` collection, and there are no featured projects. You would seed it either through the running app (there are helpers like `saveKeyboardConfigToFirebase` and `localMidiKeyboardsToFirebase`) or by hand in the emulator UI.

## Options

- **A. Install the emulator properly.** Full experience: login, saved projects and keyboard configs. Then seed the `keyboards` and `projects` collections.
- **B. Run without Firebase.** Leave the emulator out and accept the startup alert and console errors; local jamming still works. If you want this to be clean, it would need a small code change to skip the Firebase boot when the emulator is absent.
- **C. Install the CLI and JDK, then only start Auth and Hosting.** This does not help, because Firestore is still required by the app.

I have not changed anything, since I am in plan mode. Tell me which option you want and I will put together the exact steps, including a short seeding recipe.

---

**Summary**

Neither the Firebase command line tool nor Java is installed on your Mac, and Homebrew is available, so setting both up is easy. The app connects to the local emulator automatically in development, so without it you will see a startup alert and console errors, though basic jamming still runs on default settings. The bigger practical issue is that the emulator has no saved data, so the keyboard and project collections would start empty and need seeding. I have not modified anything and am waiting for you to choose an approach.
