// Used by both jammer view and performance view
import { globals } from '../globals.js'
import { transposeChordTriggerMap, circleOfFifthsChordTriggerMap, invertChordTriggerMap } from '../transpose.js'
import { isTypingTarget } from '../is-typing-target.js'

export function keyDownListener(e) {
    // console.log('keydown', e.key, e.keyCode, 'this', this);  // 'this' is the window

    if (handleAppShortcut(e))
      return

    if (e.key === "F1" && (!(e.ctrlKey || e.metaKey)) && !e.repeat) {
      document.broadcastEvent("chord-play", { state: 'on' })  // get params from globals area later
    }
    if (e.key === "F2" && (!(e.ctrlKey || e.metaKey)) && !e.repeat) {
      document.broadcastEvent("chord-play-lh-trigger", { state: 'on' })  // get params from globals area later
    }
    if (e.key === "F3" && (!(e.ctrlKey || e.metaKey)) && !e.repeat) {
      document.broadcastEvent("chord-play-lh-trigger-next", { state: 'on' })
    }
    if (e.key === "F4" && (!(e.ctrlKey || e.metaKey)) && !e.repeat) {
      document.broadcastEvent("chord-play-lh-trigger-previous", {})
    }
  }

  // Alt+1..8. Handled on keydown so the modifier state is reliable, unlike
  // reading e.shiftKey on keyup. Alt is used instead of Ctrl because Ctrl+digit
  // switches browser tabs.
  function handleAppShortcut(e) {
    if (!e.altKey || e.ctrlKey || e.metaKey || e.shiftKey)
      return false
    if (isTypingTarget(e.target))
      return false

    switch (e.code) {
      case 'Digit1': globals.bypass = false; break  // Magic mode
      case 'Digit2': globals.bypass = true; break   // Normal piano
      case 'Digit3': transposeChordTriggerMap(-2); break
      case 'Digit4': transposeChordTriggerMap(+2); break
      case 'Digit5': invertChordTriggerMap(-1); break
      case 'Digit6': invertChordTriggerMap(+1); break
      case 'Digit7': circleOfFifthsChordTriggerMap(-1); break
      case 'Digit8': circleOfFifthsChordTriggerMap(+1); break
      default: return false
    }
    e.preventDefault()
    return true
  }

  export function keyUpListener(e) {
    // Shortcuts via vuejs.

    // console.log('keyup', e.key, e.keyCode, 'this', this, 'meta', e.metaKey, 'ctrl', e.ctrlKey, 'shift', e.shiftKey);  // 'this' is the window

    // Turn this off for now, since it inteferes with computer keyboard playing of live piano keyboard
    // if (e.key === "r" && (!(e.ctrlKey || e.metaKey))) {
    //   reAllocateChords()
    // }

    if (e.key === "F1" && (!(e.ctrlKey || e.metaKey))) {
      document.broadcastEvent("chord-play", { state: 'off' })  // get params from globals area later
    }
    if (e.key === "F2" && (!(e.ctrlKey || e.metaKey))) {
      document.broadcastEvent("chord-play-lh-trigger", { state: 'off' })  // get params from globals area later
    }
    if (e.key === "F3" && (!(e.ctrlKey || e.metaKey))) {
      document.broadcastEvent("chord-play-lh-trigger-next", { state: 'off' })
    }

    if (e.key === "F5" && (!(e.ctrlKey || e.metaKey || e.shiftKey))) {
      document.broadcastEvent("chord-add", {})  // get params from globals area later
    }
  }
