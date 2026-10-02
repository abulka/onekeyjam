# Architecture

OneKeyJam is a browser-based MIDI jam app. It is a Vue 3 single page
application built with Vite that talks to hardware MIDI devices and a DAW, and
synthesises sound in the browser. It has no backend: projects and keyboard
configs are static JSON files, and user projects are saved in the browser with
IndexedDB. It can be hosted as a static site (for example on Netlify).

## Top level pieces

- `index.html` declares the app root and loads the two g200kg custom-element
  libraries (`webaudio-controls` and `webaudio-pianoroll`) from the self-hosted
  copies in `public/vendor/`. jQuery and Fomantic UI are bundled from npm by
  `src/vendor/index.js`. It then boots the app with `/src/main.js`.
- `src/main.js` creates the Vue app, waits for the Fomantic plugins to register,
  installs the router and mounts it on `#app`.
- `src/App.vue` renders the top menu. Its `onMounted()` hook calls
  `mainOneKeyJam()` from `src/lib/main.js`, which starts the one-time MIDI and
  project boot.
- `src/router/index.js` maps routes to views: `/` (HomeView), `/perform`
  (PerformView), `/about` (AboutView) and `/research` (ResearchView). The
  Perform route is lazy loaded.
- `src/views/` holds the routed pages. `src/components/` holds the UI widgets
  such as the piano keyboards, chord pickers, scale pickers and status panels.
- `src/lib/` holds the framework-independent domain logic and the MIDI and
  audio plumbing. This is the largest part of the codebase. The hardware MIDI
  runtime is grouped in `src/lib/midi/` and the in-browser sound in
  `src/lib/audio/`; the rest sits flat in `src/lib/`.
- `src/vendor/index.js` loads jQuery and Fomantic UI from npm and exposes
  `$`/`jQuery` as globals.
- `bin/generate-manifests.mjs` scans `public/projects` and `public/keyboards`
  and writes manifest JSON files listing the available files. Static hosting
  cannot list a directory, so the app reads these manifests to discover the
  libraries. It runs automatically before `npm run dev` and `npm run build`.
- `public/` holds static assets: project JSON in `public/projects/`, keyboard
  configs in `public/keyboards/`, the self-hosted g200kg libraries in
  `public/vendor/`, plus MIDI files, images and CSS.
- `test/` holds the Vitest tests.

## Shared state

`src/lib/globals.js` exports a single Vue `reactive` object named `globals`.
It holds the current project, the chord and scale trigger maps, the current
chord and scale, the project library lists, and the MIDI input and output
channels. Vue components read it reactively, and the plain JavaScript in
`src/lib/` mutates it. Because it is a single shared object, it acts as the
boundary between the UI layer and the MIDI and audio logic.

## Boot sequence

1. `index.html` loads the self-hosted vendor scripts, then `/src/main.js`.
2. `main.js` waits for the bundled jQuery/Fomantic plugins, then mounts the Vue
   app and sets `globals.boot.status`.
3. `App.vue` calls `mainOneKeyJam()` in `src/lib/main.js`.
4. `wireProjectEvents()` registers the project and keyboard event handlers, then
   `bootGeneralMidi()` prepares the in-browser sounds and `await bootWebMidi()`
   enables WebMidi.js, records the detected keyboards in
   `globals.keyboardsDetected`, and finds the IAC Driver output channels.
5. `bootKeyboard()` loads the keyboard config that matches a detected device,
   and `bootProject()` loads the starting (empty) project.
6. `regen()` allocates the project chords into `globals.chordTriggerMap`.
7. `keyDetection()`, `initChordPlayEvents()` and `linkProjectToKeyboard()`
   finish the setup by wiring the MIDI input listeners and building the scale
   mapping.

## Data model

- A project has a `name`, an array of `chords` (each a chord config), `songs`,
  `options` and `chordSequences`.
- A chord config has a chord symbol, its `chordNotes`, an optional `bass`, up
  to three scale names (`scale1`, `scale2`, `scale3`) and the notes of the
  chord as a scale (`scaleNotesOfChord`).
- `chordTriggerMap` maps a left-hand MIDI note to a chord config. It is built
  by `regen()` from the project chords, capped by `globals.maxChordConfigs`.
- `scaleTriggerMap` maps a right-hand played note to the allowed scale note.
  It is rebuilt whenever the current scale changes.
- A keyboard config sets `lhTriggerOctave` (where chords are triggered) and
  `rhJamSoundOctave` (where jam notes sound). A project may override these in
  `options.keyboard`.

See `doco/DATA-MODEL.md` for the full field reference, the static file schemas
and the validation commands.

## Runtime flows

- Playing a note in the left-hand trigger octave that is in `chordTriggerMap`
  plays the chord and changes the current scale, which rebuilds the scale
  mapping (see `src/lib/midi/play-chord.js` and `src/lib/change-scale.js`).
- Playing any other note calls `jam()` in `src/lib/midi/jam.js`. If scale filtering
  is on, the played note is translated through `scaleTriggerMap` to an allowed
  note; otherwise it is echoed through. Pending note-offs are tracked in
  `globals.pendingNoteOffs` so the correct note can be stopped later.
- Left-hand black keys act as modifiers: `C#` is a shift key, and `D#`, `F#`,
  `G#` and `A#` toggle scale filtering, switch scales or transpose the chords.
  Right-hand black keys switch scale and transpose as well. See `onNoteOn()` in
  `src/lib/midi/wire-events.js`.
- MIDI output goes to three channels of the IAC Driver: channel 1 for jam
  notes, channel 2 for chords and channel 3 for bass. When `globals.GM` is
  true, sounds are instead made in the browser with the npm `soundfont-player`
  package (`src/lib/audio/general-midi.js`).
- The on-screen keyboard is the `webaudio-keyboard` custom element from g200kg
  webaudio-controls, self-hosted from `public/vendor/`. Alongside mouse and
  touch it maps computer keys to notes (the QWERTY rows), so it
  can be played without an external MIDI keyboard. It emits the same `change`
  events that `LivePianoKeyboard.vue` handles in `onChange()`, which means
  computer-keyboard notes flow through `onNoteOn()` and `onNoteOff()` in
  `src/lib/midi/wire-events.js` exactly like mouse or MIDI notes. It only responds
  while the keyboard canvas has focus, so the user must click it first.
- The separate `src/components/PianoKeyboard.vue` component (reachable only from
  the research view) is an older experiment. It highlights keys when computer
  keys are pressed but does not emit events, so it does not produce sound.

## Persistence and backend

- There is no backend. The app is a static site.
- Featured projects are static JSON files in `public/projects/`. They are
  discovered through `public/projects/projects-manifest.json`, which is
  generated by `bin/generate-manifests.mjs`. Saving a featured project means
  editing the JSON and redeploying.
- Keyboard configs are static JSON files in `public/keyboards/`, discovered
  through `public/keyboards/keyboards-manifest.json`.
- Projects the user saves are stored in the browser with IndexedDB, in
  `src/lib/localStore.js`. `src/lib/projectLibrary.js` is the single module the
  rest of the app uses to list, fetch and save projects and keyboard configs.
- `src/lib/projectSave.js` wires the Save, Save As, Import and Export actions to
  the local store. Projects can also be exported and imported as JSON files, so
  they can be backed up or moved between browsers and machines.

## Further reading

- `README.md` covers what the app is, how to run it and how to use it.
- `doco/NOTES.md` covers detailed MIDI setup, usage reference and the many
  deployment options.
- `doco/implementation-notes.md` records detailed WebMidi.js findings.
- `doco/chord-scale-ref.md` covers the chord and scale reference material.
