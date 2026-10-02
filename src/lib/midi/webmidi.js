// Single place where the Web MIDI API is pulled in from the npm package, so
// that the rest of the app does not depend on the unpinned `webmidi@next` CDN
// global. Re-exports the pieces the app uses: the `WebMidi` singleton and the
// WebMidi `Note` class (distinct from Tonal's `Note`).
export { WebMidi, Note } from 'webmidi'
