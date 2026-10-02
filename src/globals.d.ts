/**
 * Ambient declarations for globals that are provided by <script src> tags in
 * index.html (jQuery/Fomantic, WebMidi.js, g200kg webaudio-controls, the
 * WebAudioFont player and soundfont data). They are intentionally loose (`any`)
 * because the third-party libraries do not ship usable types here.
 */
export {}

// WebMidi (and its Note class) are imported from the npm package in
// src/lib/webmidi.js, so they are not declared as browser globals here.
// In-browser sound uses the npm `soundfont-player` package, so the WebAudioFont
// player and soundfont data globals are gone too.

declare global {
  var $: any
  var jQuery: any

  interface Document {
    broadcastEvent(name: string, detail?: any): void
  }
}
