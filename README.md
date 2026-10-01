# OneKeyJam

Play chords with one finger in your left hand, and jam safely in the right hand.

OneKeyJam is a browser-based MIDI app. Left-hand notes trigger whole chords with a
single finger, and right-hand notes are filtered into the current scale, so
everything you play fits the chord. Change chord and the safe notes change with
it. It can drive a real MIDI keyboard and DAW (for example Ableton), or make the
sound in the browser.

**[Try it at onekeyjam.netlify.app](https://onekeyjam.netlify.app)**

![OneKeyJam screenshot 2](doco/images/onekeyjam-screenshot-1-ui.png)

## Features

- **Single-finger chords** - each left-hand key plays a full chord from your
  project. No chord shapes to learn.
- **Scale filtering** - right-hand notes snap to the scale that fits the current
  chord, so improvisation always sounds right.
- **Black-key modifiers** - switch scale, transpose chords and turn filtering on
  or off while you play.
- **Real MIDI, or built-in sounds** - send notes to a DAW over the macOS IAC
  Driver (jam notes, chords and bass on separate channels), or use the bundled
  General MIDI sounds in the browser.
- **Projects you control** - configure chords and scales with JSON, save projects
  in your browser, and export or import them as files.
- **Ready-made demo projects** - open a featured project and start playing
  straight away.
- **Import MIDI files** - load a MIDI file and OneKeyJam finds the chords inside
  it, then assigns them across the keyboard so you can trigger each chord with
  one note and jam over it in key. If you know [Cthulhu](https://xferrecords.com/products/cthulhu), this is the same idea.

## Using the app

1. Open the app and choose **File -> Open Featured...** to load a demo project.
2. Play the highlighted left-hand keys to trigger chords.
3. Play anywhere to the right to jam - the notes are filtered to fit the chord.
4. Use the black keys to switch scale or transpose.

A guided tour is available from the **Start Tour** item in the menu. To build a
project from an existing MIDI file, choose **File -> Import MIDI file...** and
OneKeyJam will detect the chords and lay them out on the keyboard.

### Use a MIDI keyboard

<img src="doco/images/example-external-midi-keyboard.avif" alt="OneKeyJam screenshot 3" width="200">

Plug in a MIDI keyboard and Chrome connects to it automatically through the
built-in Web MIDI support - no setup needed. Sound is made in the browser out of
the box, and you can also route notes to a DAW or synth such as Ableton via the
macOS IAC Driver. MIDI needs a secure context, so the page must be served over
HTTPS (or `localhost`). See [doco/NOTES.md](doco/NOTES.md) for the full MIDI and
DAW setup.

## Quick start

Requires [Node.js](https://nodejs.org/) 22.12 or later.

```sh
npm install
npm run dev
```

Then open http://localhost:8080/index.html.

## Development commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the Vite dev server on port 8080. Generates the project and keyboard manifests first. |
| `npm run build` | Build the production site into `dist/`. |
| `npm run preview` | Serve the production build locally on port 5050. |
| `npm test` | Run the Vitest test suite once. |
| `npm run test:watch` | Run the tests in watch mode. |
| `npm run lint` | Lint with ESLint. |
| `npm run typecheck` | Type-check the JavaScript that opts in with `// @ts-check`. |
| `npm run validate:data` | Validate the static project and keyboard JSON against `schemas/`. |

## Project structure

- `src/views/` - the routed pages (home, perform, about, research).
- `src/components/` - the UI widgets, such as the keyboards and pickers.
- `src/lib/` - the framework-independent domain logic and MIDI/audio plumbing.
- `public/projects/` - featured project JSON.
- `public/keyboards/` - keyboard config JSON.
- `bin/generate-manifests.mjs` - writes the manifests that list the static
  libraries, since static hosting cannot list a directory.
- `schemas/` - JSON Schema for the static data.
- `doco/` - architecture, data model and reference documentation.

The app has no backend. Featured projects and keyboard configs are static JSON,
and projects you save live in your browser via IndexedDB. You can export and
import projects as JSON to back them up or move them between machines.

## Deployment

The app is a static site. Netlify builds it and serves `dist`, with an SPA
fallback so deep links such as `/perform` resolve to `index.html` (see
`netlify.toml`).

```sh
npm run build
npx netlify deploy --prod
```

Other hosting options are documented in [doco/NOTES.md](doco/NOTES.md).

## Documentation

- [doco/ARCHITECTURE.md](doco/ARCHITECTURE.md) - how the app is put together and
  the boot sequence.
- [doco/DATA-MODEL.md](doco/DATA-MODEL.md) - the project and keyboard data
  model, plus the validation commands.
- [doco/NOTES.md](doco/NOTES.md) - detailed MIDI setup, usage reference,
  deployment history and development notes.

## More Screenshots

![OneKeyJam screenshot](doco/images/onekeyjam-screenshot-2-sequencer.png)

OneKeyJam has a built in sequencer, with the left-hand chords on one track and the right-hand jam notes on another. 

![OneKeyJam screenshot](doco/images/onekeyjam-screenshot-4-features.png)

## Contributing

Bug reports and feature requests are welcome in the
[issue tracker](https://github.com/abulka/onekeyjam/issues).

## License

[MIT](LICENSE) (c) Andy Bulka
