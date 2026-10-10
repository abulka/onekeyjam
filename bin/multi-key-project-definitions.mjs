// @ts-check

/*
 * Definitions for the generated "multi-key" project library. Each entry is a
 * song or etude that changes key, so its chords carry section keys and the
 * right hand's scales follow the modulation. The generator turns a definition
 * into a project JSON with a row per distinct (chord, key) pair and
 * key-aware engine-chosen scales.
 *
 * Songs are chords only, no melodies, exactly like the classic library. The
 * difference is that each entry names its key areas: `section(key, bars)` marks
 * the start of a key group, and every later chord inherits that key until the
 * next section. See doco/MULTI-KEY.md.
 */

/** @param {string} tonic @param {string} type */
function key(tonic, type) {
    return { tonic, type, source: 'user' }
}

/**
 * One key group: the first chord in the list carries the key, the rest inherit
 * it. A bar may be a single chord or an array splitting the bar equally.
 * @param {{tonic:string, type:string}} keyObj
 * @param {Array<string|string[]>} barList
 * @returns {Array<{chord: string, bars: number, key?: {tonic:string, type:string}}>}
 */
function section(keyObj, barList) {
    const steps = []
    for (const bar of barList) {
        const chords = Array.isArray(bar) ? bar : [bar]
        const bars = 1 / chords.length
        for (let i = 0; i < chords.length; i++)
            steps.push({ chord: chords[i], bars, ...(i === 0 ? { key: keyObj } : {}) })
    }
    return steps
}

/** @type {Array<{name: string, sequences: {[name: string]: Array<{chord: string, bars: number, key?: {tonic:string, type:string}}>}, tempo?: number, key?: {tonic:string, type:string, source:string}, colour?: string, scaleStyle?: string}>} */
export const MULTI_KEY_DEFINITIONS = [
    // Synthetic etudes: plain diatonic chords in each key so the grouping is
    // obvious and the wrong-key bias is audible.
    {
        name: 'Two Key Etude in C and Eb',
        sequences: {
            default: [
                ...section(key('C', 'major'), ['Cmaj7', 'Am7', 'Dm7', 'G7']),
                ...section(key('Eb', 'major'), ['Ebmaj7', 'Cm7', 'Fm7', 'Bb7']),
            ],
        },
        key: key('C', 'major'),
        colour: 'diatonic',
        tempo: 100,
    },
    {
        name: 'Mode Shift Etude in D',
        sequences: {
            default: [
                ...section(key('D', 'dorian'), ['Dm7', 'Em7', 'Dm7', 'Em7']),
                ...section(key('D', 'minor'), ['Dm7', 'Gm7', 'A7', 'Dm7']),
            ],
        },
        key: key('D', 'dorian'),
        colour: 'diatonic',
        tempo: 96,
    },
    {
        name: 'Giant Steps Style Etude in C E and Ab',
        sequences: {
            default: [
                ...section(key('C', 'major'), ['Cmaj7', 'Am7', 'Dm7', 'G7']),
                ...section(key('E', 'major'), ['Emaj7', 'C#m7', 'F#m7', 'B7']),
                ...section(key('Ab', 'major'), ['Abmaj7', 'Fm7', 'Bbm7', 'Eb7']),
            ],
        },
        key: key('C', 'major'),
        tempo: 150,
    },
    // Modulating standards: each section starts a new key group.
    {
        name: 'All the Things You Are in Ab (multi-key)',
        sequences: {
            default: [
                ...section(key('Ab', 'major'), ['Fm7', 'Bbm7', 'Eb7', 'Abmaj7', 'Dbmaj7']),
                ...section(key('C', 'major'), ['Dm7', 'G7', 'Cmaj7']),
                ...section(key('Ab', 'major'), ['Fm7', 'Bbm7', 'Eb7', 'Abmaj7', 'Dbmaj7']),
                ...section(key('C', 'major'), ['Dm7', 'G7', 'Cmaj7']),
                ...section(key('G', 'major'), ['Am7', 'D7', 'Gmaj7', 'Gmaj7']),
                ...section(key('E', 'major'), ['F#m7b5', 'B7', 'Emaj7', 'Emaj7']),
                ...section(key('Ab', 'major'), ['Fm7', 'Bbm7', 'Eb7', 'Abmaj7', 'Dbmaj7']),
                ...section(key('C', 'major'), ['Dm7', 'G7', 'Cmaj7']),
                ...section(key('Ab', 'major'), ['Abmaj7', 'Dbmaj7', ['Bbm7', 'Eb7'], 'Abmaj7']),
            ],
        },
        key: key('Ab', 'major'),
        tempo: 160,
    },
    {
        name: 'Blue Bossa in C minor (multi-key)',
        sequences: {
            default: [
                ...section(key('C', 'minor'), ['Cm7', 'Fm7', 'Dm7b5', 'G7', 'Cm7', 'Fm7', 'Dm7b5', 'G7']),
                ...section(key('Db', 'major'), ['Ebm7', 'Ab7', 'Dbmaj7', 'Dbmaj7']),
                ...section(key('C', 'minor'), ['Dm7b5', 'G7', 'Cm7', 'Cm7']),
            ],
        },
        key: key('C', 'minor'),
        tempo: 126,
    },
    {
        name: 'The Girl from Ipanema in F (multi-key)',
        sequences: {
            default: [
                ...section(key('F', 'major'), ['Fmaj7', 'G7', 'Gm7', 'Gb7', 'Fmaj7', 'Gb7', 'Fmaj7', 'Fm7']),
                ...section(key('F', 'major'), ['Fmaj7', 'G7', 'Gm7', 'Gb7', 'Fmaj7', 'Gb7', 'Fmaj7', 'Fm7']),
                ...section(key('Gb', 'major'), ['Gbmaj7', 'Gbmaj7', 'Bmaj7', 'Bmaj7', 'F#maj7', 'F#maj7', 'Bmaj7', 'Bmaj7']),
                ...section(key('F', 'major'), ['Fmaj7', 'G7', 'Gm7', 'Gb7', 'Fmaj7', 'Gb7', 'Fmaj7', 'Fm7']),
            ],
        },
        key: key('F', 'major'),
        tempo: 130,
    },
    {
        name: 'Rhythm Changes in Bb (multi-key bridge)',
        sequences: {
            // The bridge cycles down in fifths, so each chord is labelled with
            // the key it points at. The G7 in the A section (key of Bb) and the
            // G7 in the bridge (key of C) are two separate grid rows.
            default: [
                ...section(key('Bb', 'major'), ['Bbmaj7', 'G7', 'Cm7', 'F7', 'Bbmaj7', 'G7', 'Cm7', 'F7']),
                ...section(key('G', 'major'), ['D7']),
                ...section(key('C', 'major'), ['G7']),
                ...section(key('F', 'major'), ['C7']),
                ...section(key('Bb', 'major'), ['F7']),
                ...section(key('Eb', 'major'), ['Bb7']),
                ...section(key('Ab', 'major'), ['Eb7']),
                ...section(key('Db', 'major'), ['Ab7']),
                ...section(key('Gb', 'major'), ['Db7']),
                ...section(key('Bb', 'major'), ['Bbmaj7', 'G7', 'Cm7', 'F7', 'Bbmaj7', 'G7', 'Cm7', 'F7']),
            ],
        },
        key: key('Bb', 'major'),
        tempo: 176,
    },
    {
        // Stella is a chain of ii-V's that never settles. Each pair is labelled
        // with the key it resolves to, and the project key stays Bb, its home.
        name: 'Stella by Starlight in Bb (multi-key)',
        sequences: {
            default: [
                ...section(key('D', 'minor'), ['Em7b5', 'A7b9']),
                ...section(key('Bb', 'major'), ['Cm7', 'F7']),
                ...section(key('Eb', 'major'), ['Fm7', 'Bb7']),
                ...section(key('Bb', 'major'), ['Ebmaj7', 'Ab7']),
                ...section(key('Bb', 'major'), ['Bbmaj7', 'Gm7', 'Cm7', 'F7', 'Bbmaj7', 'Gm7', 'Cm7', 'F7']),
                ...section(key('Eb', 'major'), ['Fm7', 'Bb7', 'Ebmaj7', 'Fm7', 'Bb7', 'Ebmaj7']),
                ...section(key('F', 'minor'), ['Gm7b5', 'C7b9']),
                ...section(key('Eb', 'major'), ['Fm7', 'Bb7', 'Ebmaj7', 'Ebmaj7']),
            ],
        },
        key: key('Bb', 'major'),
        tempo: 84,
    },
    {
        // Body and Soul's A section sits in Db and dips to F minor and Eb; the
        // bridge moves through Ab to C minor before returning.
        name: 'Body and Soul in Db (multi-key)',
        sequences: {
            default: [
                ...section(key('Db', 'major'), ['Ebm7', 'Ab7', 'Dbmaj7', 'Gbmaj7']),
                ...section(key('F', 'minor'), ['Gm7b5', 'C7b9']),
                ...section(key('Eb', 'major'), ['Fm7', 'Bb7']),
                ...section(key('Db', 'major'), ['Ebm7', 'Ab7', 'Dbmaj7', 'Gbmaj7']),
                ...section(key('F', 'minor'), ['Gm7b5', 'C7b9']),
                ...section(key('Eb', 'major'), ['Fm7', 'Bb7']),
                ...section(key('Db', 'major'), ['Ebm7', 'Ab7', 'Dbmaj7']),
                ...section(key('Ab', 'major'), ['Bbm7', 'Eb7', 'Abmaj7']),
                ...section(key('C', 'minor'), ['Dm7b5', 'G7']),
                ...section(key('Db', 'major'), ['Ebm7', 'Ab7', 'Dbmaj7', 'Gbmaj7']),
                ...section(key('F', 'minor'), ['Gm7b5', 'C7b9']),
                ...section(key('Eb', 'major'), ['Fm7', 'Bb7']),
            ],
        },
        key: key('Db', 'major'),
        tempo: 66,
    },
]
