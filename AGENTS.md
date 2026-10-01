# AGENTS.md

## Communication style

After each response to me add a summary section: Use concise, plain English in all communication with me. Avoid telegraphic coding jargon and fragments such as "inspect caller", "stale state", or "propagate change". Use complete, natural sentences. Keep explanations brief but readable. Technical terminology is fine when necessary; do not replace normal English with compressed developer shorthand.

## Running the project

- `npm run dev` (`bin/run`) - Vite dev server on port 8080.

Then visit http://localhost:8080/index.html.

The `predev` script generates the project and keyboard manifests before Vite
starts, so the static libraries are listed in the UI.

Tests: `npm test` runs the Vitest suite once. Use `npm run test:watch` while
developing.

Type-checking: `npm run typecheck` (TypeScript checks the JS files that opt in
with `// @ts-check`). Data validation: `npm run validate:data` checks the static
project and keyboard JSON against `schemas/`. See doco/DATA-MODEL.md.

## Deploying to Netlify

The app is a static site with no backend. Netlify builds it and serves the
`dist` folder (see netlify.toml). The SPA fallback redirect makes deep links
such as `/perform` resolve to `index.html`.

1. Build the app locally to check: `npm run build`
2. Deploy with the Netlify CLI (`netlify deploy --prod`) or connect the Git
   repository to Netlify and let it run `npm run build` with `publish = dist`.

The `prebuild` script generates the manifests automatically on Netlify.

## Running MIDI and audio

MIDI requires a secure context. The IAC Driver must be enabled in macOS Audio MIDI Setup, and a synth (for example Ableton) must listen on the IAC Driver input. See doco/NOTES.md for the full setup.

## Architecture

See doco/ARCHITECTURE.md for a description of how the app is put together, including the boot sequence, the shared state in src/lib/globals.js, the data model, the MIDI runtime flows, and the local persistence layer (static project and keyboard JSON plus IndexedDB).
