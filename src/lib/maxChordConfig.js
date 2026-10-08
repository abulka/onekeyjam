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
    if (project) {
        if (!project.options)
            project.options = {}
        // Remember the size with the project so it survives save and reopen.
        project.options.gridRows = globals.maxChordConfigs
    }
    updateGridSliderMax(project)
    return globals.maxChordConfigs
}

export function setMaxDisplayed(project = globals.project, maxChordConfigs) {
    // The grid height, in order of preference:
    //   1. an explicit size from the caller (drag handle, import, restore);
    //   2. the size remembered on the project (`options.gridRows`);
    //   3. a fallback that shows the whole grid arrangement, with a minimum of
    //      the seven-row default. The arrangement length is used rather than
    //      the chord pool, so a large imported pool opens at its dealt size
    //      rather than showing every candidate.
    const chordCount = Array.isArray(project?.chords) ? project.chords.length : 0
    const arrangement = project?.songs?.default?.ids
    const arrangementCount = Array.isArray(arrangement) ? arrangement.length : 0
    const stored = project?.options?.gridRows

    if (maxChordConfigs !== undefined) {
        let n = Math.floor(Number(maxChordConfigs))
        if (!Number.isFinite(n))
            n = maxChordConfigsDefault
        globals.maxChordConfigs = Math.min(Math.max(n, 1), 235)
    }
    else if (Number.isFinite(stored)) {
        globals.maxChordConfigs = Math.min(Math.max(Math.floor(stored), 1), 235)
    }
    else {
        const basis = arrangementCount > 0 ? arrangementCount : chordCount
        globals.maxChordConfigs = Math.min(Math.max(basis, maxChordConfigsDefault), 235)
    }
    updateGridSliderMax(project)
}
