import { bootProject, bootKeyboard, linkProjectToKeyboard, regen } from './boot-project.js';
import { bootWebMidi } from "./boot-webmidi.js"
import { bootGeneralMidi } from "./general-midi.js"
import * as demos from "./demos.js"
import { keyDetection } from "./keyDetection"
import { messageFromTypescriptModule } from "./typescript-module.ts"
import {initChordPlayEvents} from './wire-chord-play-events';

export default async function () {
    // console.log(messageFromTypescriptModule)
    bootGeneralMidi()
    await bootWebMidi()  // wait for WebMidi.js to be ready so that it populates globals.keyboardsDetected

    let bk = bootKeyboard()
    let bp = bootProject()
    try {
        let values = await Promise.all([bp, bk]);
    } catch (e) {
        alert(e);
    }
    regen()
    keyDetection()
    initChordPlayEvents() // one time only, no need to wire again

    linkProjectToKeyboard() // done every time a new project is loaded

    // demos.scenario2();
    console.log('one time app boot complete')
}
