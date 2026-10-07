import { globals } from './globals.js'
import { applyProjectTempo, bootProject, bootKeyboard, linkProjectToKeyboard, regen, wireProjectEvents } from './boot-project.js';
import { bootWebMidi } from "./midi/boot-webmidi.js"
import { bootGeneralMidi } from "./audio/general-midi.js"
import { restoreTake } from "./midi/recorder.js"
import { keyDetection } from "./keyDetection"
import { initChordPlayEvents } from './midi/wire-chord-play-events';
import { initCurrentProjectAutosave } from './currentProjectStore.js';
import { readDisabledKeyboards } from './keyboardStore.js';
import { applyProjectScaleStyle } from './scaleStyles.js';

export default async function () {
    globals.boot.status = 'booting'
    globals.boot.message = ''

    try {
        wireProjectEvents() // register project/keyboard event handlers before the UI can use them
        bootGeneralMidi()
        // Every connected keyboard is live unless the user switched it off.
        globals.keyboardsDisabled = readDisabledKeyboards()
        await bootWebMidi()  // wait for WebMidi.js to be ready so that it populates globals.keyboardsDetected

        // Keyboard and project boot in parallel; both fall back to safe
        // defaults internally, so a missing keyboard or project is not fatal.
        await Promise.all([bootProject(), bootKeyboard()])

        regen()
        keyDetection()
        // Apply the restored project's scale style before the keyboard is
        // linked, so the first chord already sounds with it.
        applyProjectScaleStyle()
        initChordPlayEvents() // one time only, no need to wire again

        linkProjectToKeyboard() // done every time a new project is loaded

        // Bring back the last recorded take, if there is one, so a refresh
        // does not lose it.
        restoreTake()

        // A restored song brings its own tempo, like a freshly loaded one. This
        // runs after restoreTake so the song's tempo wins over the take's.
        applyProjectTempo()

        // Start autosaving the working project now that the boot restore has
        // finished, so a refresh does not lose unsaved edits either.
        initCurrentProjectAutosave()

        globals.boot.status = 'ready'
        console.log('one time app boot complete')
    } catch (error) {
        globals.boot.status = 'error'
        globals.boot.message = error && error.message ? error.message : String(error)
        console.error('OneKeyJam boot failed:', error)
    }
}
