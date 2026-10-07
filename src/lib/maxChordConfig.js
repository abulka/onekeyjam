import { globals } from './globals.js';
import { maxChordConfigs as maxChordConfigsDefault } from './globals-config.js'

// WOW the slider in the UI is direct control of globals.maxChordConfigs

export function setMaxDisplayed(project = globals.project, maxChordConfigs = maxChordConfigsDefault) {
    // v1.
    // deprecated - reset the max number of chord configs to the number of candidate chord configs in the project
    // globals.maxChordConfigs = project.chords.length;
    // const nearestMultipleOfSeven = Math.round(globals.maxChordConfigs / 7 + 0.5) * 7;

    // v2.
    // Generated songs mark every chord as a favourite in song order, so the
    // grid must be at least that tall or the last chord (and its demo pattern
    // note) would be dropped. This expansion only applies when the favourites
    // cover every chord; hand-built projects with a partial favourite list
    // keep the requested size, so a grid deliberately shrunk to fewer rows
    // stays shrunk. An explicit larger choice (for example a restored working
    // size) is always kept.
    const chordCount = Array.isArray(project?.chords) ? project.chords.length : 0
    const favourites = project?.songs?.default?.favourites
    const favouritesCount = Array.isArray(favourites) ? favourites.length : 0
    const coversAll = chordCount > 0 && favouritesCount >= chordCount
    globals.maxChordConfigs = coversAll
        ? Math.max(maxChordConfigs, favouritesCount)
        : maxChordConfigs;
    // console.log('setMaxDisplayed', globals.maxChordConfigs);  // TODO maxChordConfigs debugging 2
    const tempMax = project ? project.chords.length : maxChordConfigsDefault;
    const nearestMultipleOfSeven = Math.round(tempMax / 7 + 0.5) * 7;

    // The slider only exists on the Edit view; a project can be loaded from
    // other views (for example the DEMO button), so guard against it missing.
    const slider = document.getElementById("max-chord-configs");
    if (slider)
        slider.max = nearestMultipleOfSeven;
}
