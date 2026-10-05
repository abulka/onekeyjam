# Architecture

OneKeyJam is a browser-based MIDI jam app. It is a Vue 3 single page
application built with Vite that talks to hardware MIDI devices and a DAW, and
synthesises sound in the browser. It has no backend: projects and keyboard
configs are static JSON files, and user projects are saved in the browser with
IndexedDB. It can be hosted as a static site (for example on Netlify).

## Top level pieces

- `index.html` declares the app root, loads jQuery and Fomantic UI from pinned
  jsDelivr CDN tags with SRI integrity, and loads the two g200kg
  custom-element libraries (`webaudio-controls` and `webaudio-pianoroll`) from
  the self-hosted copies in `public/vendor/`. It then boots the app with
  `/src/main.js`.
- `src/main.js` creates the Vue app, installs the router and mounts it on
  `#app`.
- `src/App.vue` renders the top menu. Its `onMounted()` hook calls
  `mainOneKeyJam()` from `src/lib/main.js`, which starts the one-time MIDI and
  project boot.
- `src/router/index.js` maps routes to views: `/` (HomeView, shown as "Edit"),
  `/perform` (PerformView), `/settings` (SettingsView), `/about` (AboutView) and
  `/research` (ResearchView). `/record` redirects to `/perform`. The Perform and
  Settings routes are lazy loaded. `SettingsView.vue` holds the MIDI Keyboard
  Config (`MidiKeyboardsDetected.vue`) and Debug (`DebugAdmin.vue`) sections.
  `src/components/PageMenubar.vue` is the shared second-level menu bar (File
  menu, guided tour, project library and keyboard shortcuts); it is used by the
  Edit, Perform and Settings views, with the Edit and Perform views supplying
  their own Actions items through a slot. The Start Tour button is right-aligned
  in this bar, and the tour only uses the steps whose targets exist on the
  current page. The current project name is shown, right-aligned and in larger
  text, on the top navigation bar in `App.vue`, next to the page tabs.
- `src/views/` holds the routed pages. `src/components/` holds the UI widgets
  such as the piano keyboards, chord pickers, scale pickers and status panels.
  The Help view (`AboutView.vue`) is a two-column documentation layout: the
  article on the left and a sticky right-hand sidebar on wide screens that holds
  the page links (Overview, Improvise, Reference) and a hierarchical
  "On this page" section list. The Overview is hand-written; Improvise renders
  `doco/IMPROVISING-TUTORIAL.md` and Reference renders `doco/REFERENCE.md`
  through the small renderer in `src/lib/markdown.js`
  (`src/components/help/HelpArticle.vue`). The renderer gives each heading a
  stable id and `extractHeadings()` lists them; the hand-written Overview
  headings carry their own ids, and the sidebar reads them from the rendered
  DOM. `AboutView.vue` can therefore build the section list for all three pages,
  highlight the current section while scrolling and jump to a section on click.
  On narrow screens the page links move above the article and
  the section list collapses into an "On this page" dropdown. The chosen page is
  remembered in `src/lib/uiPrefs.js`, so returning to Help restores it.
- `src/lib/` holds the framework-independent domain logic and the MIDI and
  audio plumbing. This is the largest part of the codebase. The hardware MIDI
  runtime is grouped in `src/lib/midi/` and the in-browser sound in
  `src/lib/audio/`; the rest sits flat in `src/lib/`.
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
chord and scale, the resolved project key (`globals.projectKey`, with
`getProjectKey()` and the `soloMode` getter), the project library lists, and
the MIDI input and output channels. Vue components read it reactively, and the
plain JavaScript in `src/lib/` mutates it. Because it is a single shared
object, it acts as the boundary between the UI layer and the MIDI and audio
logic.

## Boot sequence

1. `index.html` loads the pinned jQuery/Fomantic CDN tags and the self-hosted
   vendor scripts, then `/src/main.js`.
2. `main.js` mounts the Vue app.
3. `App.vue` calls `mainOneKeyJam()` in `src/lib/main.js`, which sets
   `globals.boot.status`.
4. `wireProjectEvents()` registers the project and keyboard event handlers, then
   `bootGeneralMidi()` prepares the in-browser sounds and `await bootWebMidi()`
   enables WebMidi.js, records the detected keyboards in
   `globals.keyboardsDetected`, and finds the IAC Driver output channels.
5. `bootKeyboard()` loads the keyboard config that matches a detected device,
   and `bootProject()` restores the last working project from the autosave (or
   seeds an empty project when there is none). The autosave is started later,
   once boot has finished (see Persistence and backend).
6. `regen()` allocates the project chords into `globals.chordTriggerMap`, then
   `resolveProjectKey()` (in `src/lib/projectKey.js`) stores the declared or
   detected project key in `globals.projectKey`.
7. `keyDetection()`, `initChordPlayEvents()` and `linkProjectToKeyboard()`
   finish the setup by wiring the MIDI input listeners and building the scale
   mapping (`linkProjectToKeyboard()` applies the key scale when the project
   uses solo mode `'key'`).

## Data model

- A project has a `name`, an array of `chords` (each a chord config), `songs`,
  `options` and `chordSequences`. `options.key` declares the musical key
  (`{ tonic, type, source }`, where `type` may be a mode), `options.soloMode`
  is `'chord'` or `'key'`, and `options.colour` is `'diatonic'`, `'jazz'` or
  `'adventurous'`; see `doco/MUSIC-THEORY.md`.
- A chord config has a chord symbol, its `chordNotes`, an optional `bass`, up
  to three scale names (`scale1`, `scale2`, `scale3`) and the notes of the
  chord as a scale (`scaleNotesOfChord`). Scale names can be rewritten by the
  key-aware engine (`src/lib/chordScaleEngine.js`, `src/lib/scaleMatching.js`)
  and by `bin/regenerate-project-scales.mjs`.
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
  When the project's `soloMode` is `'key'`, the chord trigger instead calls
  `applyKeyScale()`, so the right hand stays on the project key scale while the
  chords change; an explicit scale shortcut switches temporarily.
- The right-hand scale can also follow `globals.scaleFiltering.policy`:
  `'manual'` (the default, the scale1/2/3 slot behaviour above), `'follow'`
  (picks the stored slot that continues the previous scale and chord function
  best) or `'shuffle'` (draws a live scale from the top ranked alternatives for
  variety). The policy, history scoring and choosers live in
  `src/lib/autoScale.js`; `applyScalePolicy()` in `src/lib/change-scale.js`
  applies the decision, and `globals.chordHistory` holds the recent chord and
  scale pairs. Follow and shuffle can sound a scale that is not a stored slot;
  it is held in `globals.scaleFiltering.autoScaleName/Notes` and shown as
  `(auto)`. Shuffle's options (pool, dwell, change chance, reroll) live in
  `globals.scaleFiltering.policyOptions` and is persisted in `uiPrefs`; the
  ranked candidates are cached per chord, key, colour and pool size. The policy
  is remembered in `uiPrefs`, and the control sits above the chord/scale grid
  in `GrandSummary.vue`, next to Solo in key and Colour. The roadmap and full
  control reference are in `doco/SCALE-POLICIES.md`.
- Separately from the policies, `globals.heldNoteRepair` (`enabled`,
  `windowMs`) is a global preference on the Settings page: when a chord trigger
  changes the scale just after a solo note started, the still-sounding note is
  moved onto the new scale. It is applied by
  `src/lib/midi/remap-held-solo-notes.js` and persisted in `uiPrefs`. It is not
  part of the per-policy options.
- Changing the project key in the Key Detection section, or the colour above
  the scale grid, goes through `applyProjectKeySettings()` in
  `src/lib/projectScaleSettings.js`, which saves the setting, re-ranks every
  chord scale with the new key and colour
  (`findMatchingScalesForAllProjectChords()` in `src/lib/findMatchingScales.js`),
  syncs the allocated trigger-map entries, and refreshes the active scale.
  Chords added later are key-aware too, because `fillInChordConfig.js` and
  `expandChordConfig.js` pass the resolved key into `fillMissingScales()`.
- The Edit view's dedicated **Key Detection** accordion
  (`src/components/KeySignature.vue`) owns the project key: its detection
  candidates (chords, notes and the optional music21 server) each offer "set as
  project key", which re-ranks the scales, and it warns when a declared
  major/minor key disagrees with the whole-project detection. music21 is an
  optional local Python server on `localhost:8082`; with it off the panel
  ignores it. The **Solo in key** checkbox and the colour selector sit above
  the chord/scale grid in `GrandSummary.vue`, so they appear on both the Edit
  and Perform views.
- Playing any other note calls `jam()` in `src/lib/midi/jam.js`. If scale
  filtering is on, the played note is translated through `scaleTriggerMap` to an allowed
  note; otherwise it is echoed through. Pending note-offs are tracked in
  `globals.pendingNoteOffs` so the correct note can be stopped later.
- The Perform view captures a live performance into the two-track take in
  `globals.recording`. Recording and playing live share one page, so the Chord
  Sequencer can loop and merge into a take without any background instance.
  `src/lib/midi/recorder.js` is driven from the
  points where the sounding notes are known: `playChordNote`/`playChordOff`
  record the left-hand chord and bass notes, and `jam`/`jamOff` record the
  scale-filtered right-hand notes. Timing comes from `audioContext.currentTime`
  and the pure helpers in `src/lib/midi/timing.js` (120 BPM, 480 PPQ, no
  quantisation). `src/lib/midi/playback.js` plays the take back through the
  in-browser General MIDI sounds and supports scrubbing. While it plays (and
  while the scrubber is dragged) the keys light up: the sounding notes light red
  through the same `live-note` document event that real MIDI input uses, and the
  keys that were pressed are drawn in blue by `PlaybackKeysOverlay.vue`. A
  "Keys" combo chooses between sounding notes, played keys or both;
  `globals.recording.playback.highlightMode` holds the choice. `src/lib/midi/export-recording.js`
  turns the take into a two-track `.mid` file with `@tonejs/midi`, writing the
  solo part first and the chords second. The latest take is saved to
  `localStorage` (key `onekeyjam.latestTake`) and restored at boot, so a refresh
  does not lose it. The Perform view's Actions menu offers Record/Stop and
  Export MIDI, driven through the exposed methods on `RecordControls.vue`.
- The Perform view's accordions are, in order: Record (`RecordControls.vue`),
  Recording Sequencer (`RecordingPianoRoll.vue`), Chord Sequencer
  (`Sequencer.vue`), Chord / Scale Table (`GrandSummary.vue`), Active Chord and
  Active Scale. The Recording Sequencer is the take's piano roll, built on the
  reusable `PianoRollPanel.vue`, which wraps the g200kg `webaudio-pianoroll`
  widget. It shows the current take, lets the Chords or Solo track be edited
  (changes are written straight back to the take and saved), follows the playback
  position with a playhead, and auditions notes when the piano strip is clicked.
  Clicking and dragging along that strip plays a run of notes, and its keys light
  up for notes played on the main keyboard (and vice versa) through the same
  `live-note` event. `src/lib/sequencer-notes.js` holds the pure conversions
  between take notes and widget notes.
- The Chord Sequencer is a chord-sequence loop. It can be auditioned (a chord
  trigger plays its chord, anything else a single note) from the piano strip or
  by clicking a note, its loop markers can be fitted to the notes, and it is
  auto-saved to `localStorage` (`onekeyjam.pattern`) so a refresh does not lose
  it. While it plays, the trigger keys light up on the main keyboard and the
  panel strips in time with the sound (a `live-note` event tagged
  `source: 'pattern'`). With "Include in recording" ticked, pressing Record
  starts the pattern looping; its notes drive chords and scale changes but are
  not captured live (`globals.recording.suppressCapture`), and on Stop the loop
  is rendered to fill the take and merged into the Chords track
  (`patternToTakeNotes`), expanding each chord trigger into its chord notes.
  The recorder broadcasts `recording-started`/`recording-stopped` for this.
- Left-hand black keys act as modifiers: `C#` is a shift key, `D#` turns scale
  filtering off and `F#` turns it on, while `G#` and `A#` transpose the chords
  and Shift+A#/Bb toggles Solo in key. Right-hand black keys switch scale as
  well. The computer keys `1`-`5` switch scale1/scale2/scale3, the chord notes
  and lock from any page, and `0` toggles Solo in key, via
  `src/lib/midi/scaleFilterShortcuts.js`. See `onNoteOn()` in
  `src/lib/midi/wire-events.js`.
- Normal piano mode (`globals.bypass`) switches the computer keyboard to the
  standard Ableton/Logic layout (`a s d f g h j k l ;` white, `w e t y u o p`
  black, `z`/`x` octave shift) defined in `src/lib/midi/piano-key-map.js`, and
  replaces the magic overlays with the letter overlay. The `1`-`5` shortcuts are
  inactive there.
- MIDI output goes to three channels of the IAC Driver: channel 1 for jam
  notes, channel 2 for chords and channel 3 for bass. When `globals.GM` is
  true, sounds are instead made in the browser with the npm `soundfont-player`
  package (`src/lib/audio/general-midi.js`).
- The on-screen keyboard is the `webaudio-keyboard` custom element from g200kg
  webaudio-controls, self-hosted from `public/vendor/`. Alongside mouse and
  touch it can map computer keys to notes (the QWERTY rows), so it
  can be played without an external MIDI keyboard. OneKeyJam takes over that
  keyboard input in `LivePianoKeyboard.vue`: it clears the widget's hard-wired
  key codes (`keycodes1`/`keycodes2`) and handles the keys itself using the
  table in `src/lib/midi/piano-key-map.js`. This keeps the shortcuts under our
  control (for example Alt+digit does not also sound a note) and lets the
  keyboard shortcut list in `KeyboardShortcutsHelp.vue` be generated from
  the same table. Both mouse/touch and computer keys flow through the same
  `handleNote()` and then `onNoteOn()`/`onNoteOff()` in
  `src/lib/midi/wire-events.js`. The note listeners are attached to the window,
  so the computer keyboard plays whenever the app window is focused and only
  pauses while typing in a form field. The shortcuts help dialog is opened from
  the button above the on-screen keyboard, next to the Key labels control.
- The separate `src/components/PianoKeyboard.vue` component (reachable only from
  the research view) is an older experiment. It highlights keys when computer
  keys are pressed but does not emit events, so it does not produce sound.
- The main keyboard can show optional text labels on its keys
  (`src/components/KeyboardHelpOverlay.vue`). It layers absolutely positioned,
  click-through labels over the `webaudio-keyboard` canvas, reading the canvas's
  live key geometry, so the shared web component is never modified. Chord
  trigger white keys get a filled label to distinguish them from the plain
  soloing notes. The `globals.keyboardHelpMode` setting
  (`'off' | 'black' | 'white' | 'all'`, default `'all'`) chooses what to show,
  controlled by the "Key labels" dropdown in `LivePianoKeyboard.vue` and
  saved in `localStorage` by `src/lib/uiPrefs.js`. Label text and the
  horizontal/vertical fit decision live in `src/lib/keyboard-help.js`.
- The main keyboard draws a subtle focus outline (green when focused) and
  reserves a hint line above it telling the user to click the keyboard, because
  the computer-keyboard shortcuts only work once it is clicked. The hint keeps
  its space while focused so revealing it cannot shift the page under a click.
- A "Show computer keyboard shortcuts" checkbox (persisted as
  `globals.showKeyShortcuts` via `src/lib/uiPrefs.js`) adds small coloured key
  badges on top of the on-screen keys, taken from `src/lib/midi/piano-key-map.js`.
  The mapping covers the two main octaves (`Z X C V B N M`, `Q W E R T Y U` plus
  `2 3 5 6 7`), extends into the next octave on `I O P [ ] \` (with `9 0 - =`
  for its black keys), and keeps lower-row aliases (`, L . /`) for the right
  hand. The badges render even when the text labels are off.
- The DEMO button in the shared menu bar (`src/lib/demo-project.js` plus
  `DemoIntroDialog.vue`) loads the featured `C Major II-V-I` project, focuses the
  on-screen keyboard and shows a short welcome with a Jam! button. It waits for
  the `project-loaded` event (broadcast by the `switch-project` handler) so the
  message can list the real chord trigger notes and their computer keys. On the
  Settings view, Jam! first routes to Perform because that is where the keyboard
  lives. The GrandSummary empty state offers the same action. The welcome has a
  "Don't show again" checkbox; the choice is persisted as
  `globals.showWelcomeDialog` by `src/lib/uiPrefs.js` and can be turned back on
  in the Settings view's Preferences section.
- Fomantic accordion sections remember whether they are open through
  `src/lib/accordionState.js`, which snapshots the `.active` classes of every
  title (including nested accordions) and restores them when a view is shown
  again. The state lives in memory only, so it survives page navigation but not
  a full reload.

## Persistence and backend

- There is no backend. The app is a static site.
- Featured projects are static JSON files in `public/projects/featured/` and
  classic projects (ii-V-I progressions, turnarounds, blues and jazz standard
  changes) are generated into `public/projects/classic/` by
  `bin/generate-classic-projects.mjs`, which takes each progression's key from
  `bin/classic-project-definitions.mjs` and ranks its scales key-aware. Each
  library is discovered through its own manifest (`featured-manifest.json`,
  `classic-manifest.json`), generated by `bin/generate-manifests.mjs`. Saving a
  static project means editing or regenerating the JSON and redeploying; the
  featured projects with a clear key declare it in `options.key`, and
  `bin/regenerate-project-scales.mjs --write` re-ranks them (and any other
  project that declares a key) with the key-aware engine. `npm run
  validate:scales` reports guide-tone problems and deliberate out-of-key
  colour notes; see `doco/MUSIC-THEORY.md`.
- Keyboard configs are static JSON files in `public/keyboards/`, discovered
  through `public/keyboards/keyboards-manifest.json`.
- Projects the user saves are stored in the browser with IndexedDB, in
  `src/lib/localStore.js`. `src/lib/projectLibrary.js` is the single module the
  rest of the app uses to list, fetch and save projects and keyboard configs.
- `src/lib/projectSave.js` wires the Save, Save As, Import and Export actions to
  the local store. Projects can also be exported and imported as JSON files, so
  they can be backed up or moved between browsers and machines.
- The **current working project** is autosaved to `localStorage` (key
  `onekeyjam.currentProject`) by `src/lib/currentProjectStore.js`, so a browser
  reload does not lose unsaved edits. The snapshot holds the slim persisted
  project (`getProjectForPersistence()`), the project name and library category,
  the highlighted grid row and scale column (`currentChordTriggerNote`,
  `currentScaleFilter`) and the number of displayed chord rows. `bootProject()`
  restores it at boot, and `initCurrentProjectAutosave()` (called at the end of
  the boot in `src/lib/main.js`) keeps it up to date with a debounced deep watch,
  flushing on `pagehide`. Loading or creating another project simply replaces
  the snapshot; the take, sequencer pattern and UI prefs persist separately.

## Further reading

- `README.md` covers what the app is, how to run it and how to use it.
- `doco/NOTES.md` covers detailed MIDI setup, usage reference and the many
  deployment options.
- `doco/implementation-notes.md` records detailed WebMidi.js findings.
- `doco/chord-scale-ref.md` covers the chord and scale reference material.
- `doco/MUSIC-THEORY.md` explains the chord-scale matching engine in
  `src/lib/chordScaleEngine.js`, the project key model in
  `src/lib/projectKey.js`, the key-aware scoring rules, solo-in-key mode and
  the data checkers.
