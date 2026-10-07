import { globals } from './globals.js';
import { maxChordConfigs as maxChordConfigsDefault } from './globals-config.js'

// WOW the slider in the UI is direct control of globals.maxChordConfigs

export function clampGridRowCount(requested, totalChords) {
    const total = Number.isFinite(totalChords) && totalChords > 0 ? Math.floor(totalChords) : 0
    const fallback = maxChordConfigsDefault
    let n = Math.floor(Number(requested))
    if (!Number.isFinite(n))
        n = fallback
    if (total > 0)
        return Math.min(Math.max(n, 1), total)
    return Math.min(Math.max(n, 1), 235)
}

export function updateGridSliderMax(project = globals.project) {
    const tempMax = project && Array.isArray(project.chords) ? project.chords.length : maxChordConfigsDefault;
    const nearestMultipleOfSeven = Math.round(tempMax / 7 + 0.5) * 7;

    // The slider only exists on the Edit view; a project can be loaded from
    // other views (for example the DEMO button), so guard against it missing.
    // The grid drag handle uses aria-valuemax instead, so this is best effort.
    const slider = document.getElementById("max-chord-configs");
    if (slider)
        slider.max = String(nearestMultipleOfSeven);
    return nearestMultipleOfSeven
}

export function applyUserGridRowCount(requested, project = globals.project) {
    const chordCount = Array.isArray(project?.chords) ? project.chords.length : 0
    globals.maxChordConfigs = clampGridRowCount(requested, chordCount)
    updateGridSliderMax(project)
    return globals.maxChordConfigs
}

export function setMaxDisplayed(project = globals.project, maxChordConfigs) {
    // v1.
    // deprecated - reset the max number of chord configs to the number of candidate chord configs in the project
    // globals.maxChordConfigs = project.chords.length;
    // const nearestMultipleOfSeven = Math.round(globals.maxChordConfigs / 7 + 0.5) * 7;

    // v2.
    // Generated songs mark every chord as a favourite in song order, so a
    // fresh load must be at least that tall or the last chord (and its demo
    // pattern note) would be dropped. This expansion only applies to fresh
    // loads where no explicit size was requested; an explicit user size from
    // the drag handle, the import slider or a restored working size is always
    // kept as requested, so a grid deliberately shrunk to fewer rows stays
    // shrunk even when favourites cover every chord.
    const explicit = maxChordConfigs !== undefined
    if (!explicit)
        maxChordConfigs = maxChordConfigsDefault
    const chordCount = Array.isArray(project?.chords) ? project.chords.length : 0
    const favourites = project?.songs?.default?.favourites
    const favouritesCount = Array.isArray(favourites) ? favourites.length : 0
    const coversAll = chordCount > 0 && favouritesCount >= chordCount
    if (explicit) {
        // An explicit size (drag handle, slider, restored working size) is
        // always kept as requested, so shrinking below the favourite count
        // stays shrunk. Larger-than-total sizes are kept for compatibility
        // with restored working sizes; allocation still clamps to available
        // chords. User drags use applyUserGridRowCount() which clamps to total.
        let n = Math.floor(Number(maxChordConfigs))
        if (!Number.isFinite(n))
            n = maxChordConfigsDefault
        globals.maxChordConfigs = Math.min(Math.max(n, 1), 235)
    } else {
        globals.maxChordConfigs = coversAll
            ? Math.max(maxChordConfigs, favouritesCount)
            : maxChordConfigs;
    }
    // console.log('setMaxDisplayed', globals.maxChordConfigs);  // TODO maxChordConfigs debugging 2
    updateGridSliderMax(project)
}
