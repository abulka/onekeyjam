// Used by both jammer view and performance view
import { globals } from '../globals.js'
import { transposeChordTriggerMap, circleOfFifthsChordTriggerMap, invertChordTriggerMap } from '../transpose.js'
import { resetTranspositionsEtc } from '../resetState.js'
import { isTypingTarget } from '../is-typing-target.js'

export function keyDownListener(e) {
    // console.log('keydown', e.key, e.keyCode, 'this', this);  // 'this' is the window

    if (handleAppShortcut(e))
      return

    if (handleTransposeShortcut(e))
      return

    // Chord audition and trigger shortcuts. All hold to sustain: keydown
    // starts the sound and keyup stops it. Matched on e.code so the shortcuts
    // do not depend on keyboard layout. Backquote and Quote are bound to
    // nothing in either note map, and the arrows are not notes either, so
    // these work globally without stealing piano notes.
    //
    // Old Fn bindings are gone: F1 opened browser help, F3 opened find, F5
    // reloaded the page, and F4 never had a listener. Up and Down arrows are
    // left alone so the page keeps scrolling vertically.
    if (e.repeat || e.ctrlKey || e.metaKey || e.altKey)
      return
    if (isTypingTarget(e.target))
      return

    switch (e.code) {
      case 'Backquote':
        e.preventDefault()
        document.broadcastEvent("chord-play", { state: 'on' })  // get params from globals area later
        break
      case 'Quote':
        e.preventDefault()
        document.broadcastEvent("chord-play-lh-trigger", { state: 'on' })  // get params from globals area later
        break
      case 'ArrowRight':
        if (isArrowControlTarget(e.target))
          return
        e.preventDefault()
        document.broadcastEvent("chord-play-lh-trigger-next", { state: 'on' })
        break
      case 'ArrowLeft':
        if (isArrowControlTarget(e.target))
          return
        e.preventDefault()
        document.broadcastEvent("chord-play-lh-trigger-previous", { state: 'on' })
        break
    }
  }

  /**
   * True when an arrow press belongs to a focused control that already uses
   * arrows itself, so the global chord-step shortcut leaves it alone. This
   * covers dropdowns, radio groups, range inputs and the chord-grid resize
   * slider in GrandSummary.vue.
   * @param {EventTarget|null} target
   */
  function isArrowControlTarget(target) {
    if (!target || !(/** @type {HTMLElement} */ (target)).tagName)
      return false
    const element = /** @type {HTMLElement} */ (target)
    const tag = element.tagName.toLowerCase()
    if (tag === 'select' || tag === 'textarea')
      return true
    if (tag === 'input') {
      const type = (element.getAttribute('type') || 'text').toLowerCase()
      if (type === 'radio' || type === 'range')
        return true
    }
    if (typeof element.closest === 'function' && element.closest('.grid-resize-handle, [role="slider"]'))
      return true
    return false
  }

  // Alt+1, Alt+2 and Alt+5..8. Handled on keydown so the modifier state is reliable, unlike
  // reading e.shiftKey on keyup. Alt is used instead of Ctrl because Ctrl+digit
  // switches browser tabs. Alt+1 and Alt+2 switch the scale filter off and on
  // while in magic mode (the same as the D and G keys); use , and . or the
  // Magic / Normal buttons to switch modes. Semitone transposing lives on the
  // - / + keys instead (see handleTransposeShortcut); the old Alt+3/Alt+4
  // bindings are gone.
  function handleAppShortcut(e) {
    if (!e.altKey || e.ctrlKey || e.metaKey || e.shiftKey)
      return false
    if (isTypingTarget(e.target))
      return false

    switch (e.code) {
      case 'Digit1':
        if (globals.bypass)
          return false  // scale filter shortcuts only work in magic mode
        globals.scaleFilteringEnabled = false
        document.broadcastEvent('scale-filtering-changed', { state: false, notes: globals.currentScaleNotes })
        break
      case 'Digit2':
        if (globals.bypass)
          return false  // scale filter shortcuts only work in magic mode
        globals.scaleFilteringEnabled = true
        document.broadcastEvent('scale-filtering-changed', { state: true, notes: globals.currentScaleNotes })
        break
      case 'Digit5': invertChordTriggerMap(-1); break
      case 'Digit6': invertChordTriggerMap(+1); break
      case 'Digit7': circleOfFifthsChordTriggerMap(-1); break
      case 'Digit8': circleOfFifthsChordTriggerMap(+1); break
      default: return false
    }
    e.preventDefault()
    return true
  }

  // Redundant one-hand shortcuts for transposing the live chords a semitone:
  // - (Minus, with or without Shift) transposes down, + (Shift+=, matched by
  // e.code so it works on any layout) transposes up, and Backspace resets all
  // transpositions. Minus is free because it sits over the E-F piano gap like
  // the unbound 4 and 8 keys (see piano-key-map.js); plain = keeps playing
  // the F# note, so transpose up needs Shift. All three leave keystrokes alone
  // while typing in a form field. Down/up allow key repeat so holding the key
  // walks several semitones; reset ignores repeat so holding Backspace cannot
  // spam the reset toast.
  function handleTransposeShortcut(e) {
    if (e.ctrlKey || e.metaKey || e.altKey)
      return false
    if (isTypingTarget(e.target))
      return false

    switch (e.code) {
      case 'Minus':
        e.preventDefault()
        transposeChordTriggerMap(-2)  // currently 2 is ignored, a semitone is used instead
        return true
      case 'Equal':
        if (!e.shiftKey)
          return false  // plain = plays the F# note; only + transposes
        e.preventDefault()
        transposeChordTriggerMap(+2)  // currently 2 is ignored, a semitone is used instead
        return true
      case 'Backspace':
        e.preventDefault()
        if (e.repeat)
          return true
        resetTranspositionsEtc()
        return true
      default: return false
    }
  }

  export function keyUpListener(e) {
    // Shortcuts via vuejs.

    // console.log('keyup', e.key, e.keyCode, 'this', this, 'meta', e.metaKey, 'ctrl', e.ctrlKey, 'shift', e.shiftKey);  // 'this' is the window

    // Turn this off for now, since it inteferes with computer keyboard playing of live piano keyboard
    // if (e.key === "r" && (!(e.ctrlKey || e.metaKey))) {
    //   reAllocateChords()
    // }

    // Matched by code alone so releasing a modifier first cannot leave a
    // chord stuck on. The typing guard is intentionally skipped here: a hold
    // started outside a field must still stop even if focus moved mid-hold.
    switch (e.code) {
      case 'Backquote':
        document.broadcastEvent("chord-play", { state: 'off' })  // get params from globals area later
        break
      case 'Quote':
        document.broadcastEvent("chord-play-lh-trigger", { state: 'off' })  // get params from globals area later
        break
      case 'ArrowRight':
        document.broadcastEvent("chord-play-lh-trigger-next", { state: 'off' })
        break
      case 'ArrowLeft':
        document.broadcastEvent("chord-play-lh-trigger-previous", { state: 'off' })
        break
    }
  }
