import { globals } from "./globals.js";


export function resolveTriggerNote(originalPureTriggerNoteName) {
    // Converts a pure trigger note name (e.g. 'C' or C_2) to a full note name (e.g. 'C6').
    // Algorithm needs globals.keyboard.lhTriggerOctave which defines the octave of where
    // the trigger notes are supposed to start on a real life keyboard.
    const _noteNameHasOctave = (noteName) => { return !isNaN(noteName.charAt(1)); }; // e.g. 'C2'
    const isPureExtendedTriggerNoteName = (noteName) => { return noteName.length === 3 && noteName.charAt(1) === '_'; }; // e.g. 'C_2'
    const isAlreadyResolvedTriggerNoteName = (noteName) => { return noteName.length === 2 && _noteNameHasOctave(noteName); };

    if (isAlreadyResolvedTriggerNoteName(originalPureTriggerNoteName))
        throw (`Improper project config detected, triggerNoteName ${originalPureTriggerNoteName} cannot have an octave`);

    let octaveOffset = 0;

    // Handle multiple octaves of the same triggerNoteName // e.g. C_2, C_3
    if (isPureExtendedTriggerNoteName(originalPureTriggerNoteName)) {
        octaveOffset = parseInt(originalPureTriggerNoteName.charAt(2)) - 1;
        originalPureTriggerNoteName = originalPureTriggerNoteName.charAt(0);
    }

    // Create a new triggerNoteName with an octave, and assign an expanded chordConfig to it
    if (Object.keys(globals.keyboard).length == 0) // vue reactive variables are never 'undefined', so check for length instead
        throw ('No keyboard config loaded, so cannot do chordConfigInit');

    let key = `${originalPureTriggerNoteName}${globals.keyboard.lhTriggerOctave + octaveOffset}`;
    // console.log(originalPureTriggerNoteName, '-> allocating Resolved trigger note', key, 'cos globals.keyboard.lhTriggerOctave=', globals.keyboard.lhTriggerOctave, ' + _ extended offset=', octaveOffset)
    return key;
}
