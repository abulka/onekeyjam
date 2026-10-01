/**
 * Ambient declarations for globals that are provided by <script src> tags in
 * index.html (jQuery/Fomantic, WebMidi.js, g200kg webaudio-controls, the
 * WebAudioFont player and soundfont data). They are intentionally loose (`any`)
 * because the third-party libraries do not ship usable types here.
 */
export {}

declare global {
  var $: any
  var jQuery: any

  var WebMidi: any
  var Note: any
  var WebAudioFontPlayer: any
  var webAudioControlsWidgetManager: any
  var ac: AudioContext

  var _tone_0040_Chaos_sf2_file: any
  var _tone_0243_JCLive_sf2_file: any
  var _tone_0321_GeneralUserGS_sf2_file: any

  interface Document {
    broadcastEvent(name: string, detail?: any): void
  }
}
