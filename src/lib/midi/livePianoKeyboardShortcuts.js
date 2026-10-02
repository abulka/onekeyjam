// Used by both jammer view and performance view

export function keyDownListener(e) {
    // console.log('keydown', e.key, e.keyCode, 'this', this);  // 'this' is the window
  
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
  
    // Transposition etc. shortcuts ctrl+1, ctrl+2 etc. with and without shift.
    // Match the physical key with e.code, because e.key changes to !/@/#/% when shift is held.
    // Ctrl-1 = bypass all filtering toggle (see src/components/ScaleFilteringToggles.vue)
    // Ctrl-2 = transpose up and down a semitone
    // Ctrl-3 = chord inversion
    // Ctrl-4 = unassigned
    // Ctrl-5 = circle of fifths
  
    const normal = () => e.ctrlKey && !e.shiftKey
    const shifted = () => e.ctrlKey && e.shiftKey
  
    if (e.code === "Digit2" && normal()) {
      document.broadcastEvent("chord-transpose", { direction: 1 })
    }
    if (e.code === "Digit2" && shifted()) {
      document.broadcastEvent("chord-transpose", { direction: -1 })
    }
  
    if (e.code === "Digit3" && normal()) {
      document.broadcastEvent("chord-invert", { direction: 1 })
    }
    if (e.code === "Digit3" && shifted()) {
      document.broadcastEvent("chord-invert", { direction: -1 })
    }
  
    if (e.code === "Digit5" && normal()) {
      document.broadcastEvent("chord-fifths", { direction: 1 })
    }
    if (e.code === "Digit5" && shifted()) {
      document.broadcastEvent("chord-fifths", { direction: -1 })
    }
  
    // if (e.code === "Digit4" && normal()) {
    //   console.log('4')
    //   document.broadcastEvent("bypass-all-filtering", { state: true })
    // }
  
  }
  