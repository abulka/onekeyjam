import { globals } from './globals.js';
import { maxChordConfigs as maxChordConfigsDefault } from './globals-config.js'

// WOW the slider in the UI is direct control of globals.maxChordConfigs

export function setMaxDisplayed(project, maxChordConfigs = maxChordConfigsDefault) {
    // v1.
    // deprecated - reset the max number of chord configs to the number of candidate chord configs in the project
    // globals.maxChordConfigs = project.chords.length;
    // const nearestMultipleOfSeven = Math.round(globals.maxChordConfigs / 7 + 0.5) * 7;

    // v2.
    globals.maxChordConfigs = maxChordConfigs;
    // console.log('setMaxDisplayed', globals.maxChordConfigs);  // TODO maxChordConfigs debugging 2
    const tempMax = project ? project.chords.length : maxChordConfigsDefault;
    const nearestMultipleOfSeven = Math.round(tempMax / 7 + 0.5) * 7;

    // The slider only exists on the Edit view; a project can be loaded from
    // other views (for example the DEMO button), so guard against it missing.
    const slider = document.getElementById("max-chord-configs");
    if (slider)
        slider.max = nearestMultipleOfSeven;
}
