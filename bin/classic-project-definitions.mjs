// @ts-check

/*
 * Definitions for the generated "classic" project library. Each entry is a
 * jazz standard or blues tune; the generator turns it into a project JSON with
 * voicings and engine-chosen scales. Songs are chords only, no melodies.
 * Generic practice progressions live in bin/progressions-project-definitions.mjs
 * and rock songs in bin/rock-project-definitions.mjs.
 *
 * Each tune offers the short excerpt it always had (the automatic `default`
 * sequence derived from `chords`) and, for the standards and blues, a `medium`
 * middle section and a `full` form via `songSequences`. Repeats share a grid
 * row, so a full form only adds the distinct chords it introduces.
 *
 * Tempos are playable practice speeds for each tune's feel: medium swing for
 * standards, slow ballad speeds for Misty and Body and Soul, bossa range for
 * the Jobim tunes, and brisk bebop speeds for the Parker heads. Loading a
 * song applies its tempo to the global BPM.
 */

/** @param {string} tonic @param {string} type */
function key(tonic, type) {
    return { tonic, type, source: 'user' }
}

/** @param {string} chord @param {number} [bars] */
function at(chord, bars = 1) {
    return { chord, bars }
}

/**
 * Expand a bar list into sequence steps. Each entry is either a chord held for
 * a whole bar, or an array of chords splitting the bar equally (usually two
 * chords, one per half bar).
 * @param {Array<string|string[]>} list
 * @returns {Array<{chord: string, bars: number}>}
 */
function bars(list) {
    const steps = []
    for (const bar of list) {
        if (Array.isArray(bar)) {
            for (const chord of bar)
                steps.push(at(chord, 1 / bar.length))
        }
        else {
            steps.push(at(bar))
        }
    }
    return steps
}

/**
 * The named sequences for a tune: its full form, plus a middle section made of
 * the first `mediumBars` bars. The excerpt `default` is derived automatically
 * from `chords`, so it is not repeated here.
 * @param {Array<string|string[]>} fullBars
 * @param {number} [mediumBars]
 * @returns {{ medium?: Array<{chord: string, bars: number}>, full: Array<{chord: string, bars: number}> }}
 */
function songSequences(fullBars, mediumBars = 16) {
    const full = bars(fullBars)
    const totalBars = full.reduce((sum, step) => sum + step.bars, 0)
    /** @type {{ medium?: Array<{chord: string, bars: number}>, full: Array<{chord: string, bars: number}> }} */
    const sequences = {}
    if (totalBars > mediumBars) {
        const medium = []
        let played = 0
        for (const step of full) {
            if (played >= mediumBars)
                break
            medium.push(step)
            played += step.bars
        }
        sequences.medium = medium
    }
    sequences.full = full
    return sequences
}

/**
 * A classic AABA form: the A section twice, the bridge, then A again.
 * @param {Array<string|string[]>} a
 * @param {Array<string|string[]>} b
 * @returns {Array<string|string[]>}
 */
function aaba(a, b) {
    return [...a, ...a, ...b, ...a]
}

/** @type {Array<{name: string, chords: string[], sequence?: Array<{chord: string, bars: number}>, sequences?: {[name: string]: Array<{chord: string, bars: number}>}, sequenceLabels?: {[name: string]: string}, tempo?: number, key?: {tonic:string, type:string, source:string}, colour?: string}>} */
export const DEFINITIONS = [
    // Jazz standard changes (chords only)
    {
        name: 'Autumn Leaves in G minor',
        chords: ['Cm7', 'F7', 'Bbmaj7', 'Ebmaj7', 'Am7b5', 'D7', 'Gm7', 'Gm7'],
        sequences: songSequences([
            'Cm7', 'F7', 'Bbmaj7', 'Ebmaj7', 'Am7b5', 'D7', 'Gm7', 'Gm7',
            'Cm7', 'F7', 'Bbmaj7', 'Ebmaj7', 'Am7b5', 'D7', 'Gm7', 'Gm7',
            'Am7b5', 'D7', 'Gm7', 'Gm7', 'Cm7', 'F7', 'Bbmaj7', 'Ebmaj7',
            'Am7b5', 'D7', 'Gm7', 'Cm7', 'F7', 'Bbmaj7', 'Ebmaj7', ['Am7b5', 'D7'],
        ]),
        key: key('G', 'minor'),
        tempo: 132,
    },
    {
        name: 'Fly Me to the Moon in C',
        chords: ['Am7', 'Dm7', 'G7', 'Cmaj7', 'Fmaj7', 'Bm7b5', 'E7', 'Am7'],
        sequences: songSequences(aaba(
            ['Am7', 'Dm7', 'G7', 'Cmaj7', 'Fmaj7', 'Bm7b5', 'E7', 'Am7'],
            ['Dm7', 'G7', 'Cmaj7', 'Fmaj7', 'Bm7b5', 'E7', 'Am7', 'A7'],
        )),
        key: key('C', 'major'),
        tempo: 120,
    },
    {
        name: 'Blue Bossa in C minor',
        chords: ['Cm7', 'Fm7', 'Dm7b5', 'G7', 'Cm7', 'Ebm7', 'Ab7', 'Dbmaj7'],
        sequences: songSequences([
            'Cm7', 'Fm7', 'Dm7b5', 'G7', 'Cm7', 'Fm7', 'Dm7b5', 'G7',
            'Ebm7', 'Ab7', 'Dbmaj7', 'Dbmaj7', 'Dm7b5', 'G7', 'Cm7', 'Cm7',
        ], 8),
        key: key('C', 'minor'),
        tempo: 126,
    },
    {
        name: 'Take the A Train in C',
        chords: ['Cmaj7', 'D7', 'Dm7', 'G7', 'Cmaj7', 'D7', 'Dm7', 'G7'],
        sequences: {
            // The famous Dm7-G7 split shares one bar, twice through.
            default: [at('Cmaj7'), at('D7'), at('Dm7', 0.5), at('G7', 0.5), at('Cmaj7'), at('D7'), at('Dm7', 0.5), at('G7', 0.5)],
            ...songSequences(aaba(
                ['Cmaj7', 'D7', ['Dm7', 'G7'], 'Cmaj7', 'Cmaj7', 'D7', ['Dm7', 'G7'], 'Cmaj7'],
                ['Dm7', 'G7', 'Cmaj7', 'Cmaj7', 'Dm7', 'G7', 'Cmaj7', 'Cmaj7'],
            )),
        },
        key: key('C', 'major'),
        tempo: 152,
    },
    {
        name: 'All the Things You Are in Ab',
        chords: ['Fm7', 'Bbm7', 'Eb7', 'Abmaj7', 'Dbmaj7', 'Dm7', 'G7', 'Cmaj7'],
        sequences: songSequences([
            'Fm7', 'Bbm7', 'Eb7', 'Abmaj7', 'Dbmaj7', 'Dm7', 'G7', 'Cmaj7',
            'Fm7', 'Bbm7', 'Eb7', 'Abmaj7', 'Dbmaj7', 'Dm7', 'G7', 'Cmaj7',
            'Am7', 'D7', 'Gmaj7', 'Gmaj7', 'F#m7b5', 'B7', 'Emaj7', 'Emaj7',
            'Fm7', 'Bbm7', 'Eb7', 'Abmaj7', 'Dbmaj7', 'Dm7', 'G7', 'Cmaj7',
            'Abmaj7', 'Dbmaj7', ['Bbm7', 'Eb7'], 'Abmaj7',
        ]),
        key: key('Ab', 'major'),
        tempo: 160,
    },
    {
        name: 'Summertime in A minor',
        chords: ['Am7', 'E7', 'Am7', 'Am7', 'Dm7', 'Am7', 'E7', 'Am7'],
        sequences: songSequences([
            'Am7', 'E7', 'Am7', 'Am7', 'Dm7', 'Am7', 'E7', 'Am7',
            'Am7', 'E7', 'Am7', 'Am7', 'Dm7', 'Am7', 'E7', 'Am7',
        ], 8),
        key: key('A', 'minor'),
        tempo: 80,
    },
    {
        name: 'Rhythm Changes in Bb',
        chords: ['Bbmaj7', 'G7', 'Cm7', 'F7', 'Bbmaj7', 'G7', 'Cm7', 'F7'],
        sequences: songSequences(aaba(
            ['Bbmaj7', 'G7', 'Cm7', 'F7', 'Bbmaj7', 'G7', 'Cm7', 'F7'],
            ['D7', 'G7', 'C7', 'F7', 'Bb7', 'Eb7', 'Ab7', 'Db7'],
        )),
        key: key('Bb', 'major'),
        tempo: 176,
    },
    {
        name: 'Blues for Alice in F',
        chords: ['Fmaj7', 'Em7b5', 'A7', 'Dm7', 'G7', 'Cm7', 'F7', 'Bbmaj7'],
        // Parker bebop blues: the opening excerpt, plus the full twelve bar form.
        sequences: {
            default: [at('Fmaj7'), at('Em7b5', 0.5), at('A7', 0.5), at('Dm7', 0.5), at('G7', 0.5), at('Cm7', 0.5), at('F7', 0.5), at('Bbmaj7')],
            full: [
                at('Fmaj7'),
                at('Em7b5', 0.5), at('A7', 0.5),
                at('Dm7', 0.5), at('G7', 0.5),
                at('Cm7', 0.5), at('F7', 0.5),
                at('Bbmaj7'),
                at('Bbm7', 0.5), at('Eb7', 0.5),
                at('Am7', 0.5), at('D7', 0.5),
                at('Abm7', 0.5), at('Db7', 0.5),
                at('Gm7'),
                at('C7'),
                at('Fmaj7', 0.5), at('D7', 0.5),
                at('Gm7', 0.5), at('C7', 0.5),
            ],
        },
        key: key('F', 'major'),
        tempo: 152,
    },
    {
        name: 'There Will Never Be Another You in Eb',
        chords: ['Ebmaj7', 'Dm7b5', 'G7', 'Cm7', 'F7', 'Fm7', 'Bb7', 'Ebmaj7'],
        sequences: songSequences(aaba(
            ['Ebmaj7', 'Dm7b5', 'G7', 'Cm7', 'F7', 'Fm7', 'Bb7', 'Ebmaj7'],
            ['Abmaj7', 'Abm7', 'Db7', 'Ebmaj7', 'Cm7', 'F7', 'Fm7', 'Bb7'],
        )),
        key: key('Eb', 'major'),
        tempo: 168,
    },
    {
        name: 'Stella by Starlight in Bb',
        chords: ['Em7b5', 'A7b9', 'Cm7', 'F7', 'Fm7', 'Bb7', 'Ebmaj7', 'Ab7'],
        sequences: {
            // The opening bars split each bar between two chords.
            default: [at('Em7b5', 0.5), at('A7b9', 0.5), at('Cm7', 0.5), at('F7', 0.5), at('Fm7', 0.5), at('Bb7', 0.5), at('Ebmaj7', 0.5), at('Ab7', 0.5)],
            ...songSequences([
                ['Em7b5', 'A7b9'], ['Cm7', 'F7'], ['Fm7', 'Bb7'], ['Ebmaj7', 'Ab7'],
                ['Bbmaj7', 'Gm7'], ['Cm7', 'F7'], ['Bbmaj7', 'Gm7'], ['Cm7', 'F7'],
                ['Fm7', 'Bb7'], 'Ebmaj7', ['Fm7', 'Bb7'], 'Ebmaj7',
                ['Gm7b5', 'C7b9'], ['Fm7', 'Bb7'], 'Ebmaj7', 'Ebmaj7',
            ]),
        },
        key: key('Bb', 'major'),
        tempo: 84,
    },
    {
        name: 'Have You Met Miss Jones in F',
        chords: ['Fmaj7', 'Fm7', 'Bb7', 'Ebmaj7', 'Em7b5', 'A7', 'Dm7', 'G7'],
        sequences: songSequences(aaba(
            ['Fmaj7', ['Fm7', 'Bb7'], 'Ebmaj7', ['Em7b5', 'A7'], 'Dm7', 'G7', 'Cmaj7', 'Cmaj7'],
            ['Bbmaj7', ['Am7', 'D7'], 'Gmaj7', ['F#m7', 'B7'], 'Emaj7', ['Eb7', 'Abmaj7'], 'Dmaj7', ['Dm7', 'G7']],
        )),
        key: key('F', 'major'),
        tempo: 160,
    },
    {
        name: 'Days of Wine and Roses in F',
        chords: ['Fmaj7', 'Ebmaj7', 'Dm7', 'G7', 'Em7b5', 'A7', 'Dm7', 'G7'],
        sequences: songSequences(aaba(
            ['Fmaj7', 'Ebmaj7', 'Dm7', 'G7', 'Em7b5', 'A7', 'Dm7', 'G7'],
            ['Gm7', 'C7', 'Fmaj7', 'Bbmaj7', 'Am7', 'D7', 'Gm7', 'C7'],
        )),
        key: key('F', 'major'),
        tempo: 128,
    },
    {
        name: 'Blue Moon in C',
        chords: ['Cmaj7', 'Am7', 'Dm7', 'G7', 'Cmaj7', 'Am7', 'Dm7', 'G7'],
        sequences: songSequences(aaba(
            ['Cmaj7', 'Am7', 'Dm7', 'G7', 'Cmaj7', 'Am7', 'Dm7', 'G7'],
            ['Am7', 'D7', 'Gmaj7', 'Gmaj7', 'Am7', 'D7', 'Gmaj7', 'G7'],
        )),
        key: key('C', 'major'),
        tempo: 96,
    },
    // Real-song excerpts and full forms (chords only)
    {
        name: "Billie's Bounce in F",
        chords: ['F7', 'Bb7', 'F7', 'Cm7', 'F7', 'Bb7', 'F7', 'A7'],
        // Parker blues: the opening excerpt, plus the full twelve bar form.
        sequences: {
            default: [at('F7'), at('Bb7'), at('F7'), at('Cm7'), at('F7'), at('Bb7'), at('F7'), at('A7')],
            full: [
                at('F7'), at('Bb7'), at('F7'),
                at('Cm7', 0.5), at('F7', 0.5),
                at('Bb7'), at('Bdim7'), at('F7'),
                at('A7', 0.5), at('D7', 0.5),
                at('Gm7'), at('C7'),
                at('F7', 0.5), at('D7', 0.5),
                at('Gm7', 0.5), at('C7', 0.5),
            ],
        },
        key: key('F', 'major'),
        tempo: 140,
    },
    {
        name: "Now's the Time in F",
        chords: ['F7', 'Bb7', 'F7', 'F7', 'Bb7', 'Bdim7', 'F7', 'D7'],
        sequences: {
            default: [at('F7'), at('Bb7'), at('F7'), at('F7'), at('Bb7'), at('Bdim7'), at('F7'), at('D7')],
            full: [
                at('F7'), at('Bb7'), at('F7'), at('F7'),
                at('Bb7'), at('Bdim7'), at('F7'), at('D7'),
                at('Gm7'), at('C7'),
                at('F7', 0.5), at('D7', 0.5),
                at('Gm7', 0.5), at('C7', 0.5),
            ],
        },
        key: key('F', 'major'),
        tempo: 148,
    },
    {
        name: 'Au Privave in F',
        chords: ['F7', 'Bb7', 'F7', 'Cm7', 'F7', 'Bb7', 'F7', 'A7'],
        sequences: {
            default: [at('F7'), at('Bb7'), at('F7'), at('Cm7'), at('F7'), at('Bb7'), at('F7'), at('A7')],
            full: [
                at('F7'), at('Bb7'), at('F7'),
                at('Cm7', 0.5), at('F7', 0.5),
                at('Bb7'), at('Bdim7'), at('F7'),
                at('A7', 0.5), at('D7', 0.5),
                at('Gm7'), at('C7'), at('F7'), at('C7'),
            ],
        },
        key: key('F', 'major'),
        tempo: 180,
    },
    {
        name: 'Straight No Chaser in Bb',
        chords: ['Bb7', 'Eb7', 'Bb7', 'Fm7', 'Bb7', 'Eb7', 'Bb7', 'G7'],
        sequences: {
            default: [at('Bb7'), at('Eb7'), at('Bb7'), at('Fm7'), at('Bb7'), at('Eb7'), at('Bb7'), at('G7')],
            full: [
                at('Bb7'), at('Eb7'), at('Bb7'), at('Bb7'),
                at('Eb7'), at('Edim7'), at('Bb7'), at('G7'),
                at('Cm7'), at('F7'),
                at('Bb7', 0.5), at('G7', 0.5),
                at('Cm7', 0.5), at('F7', 0.5),
            ],
        },
        key: key('Bb', 'major'),
        tempo: 152,
    },
    {
        name: 'Tenor Madness in Bb',
        chords: ['Bb7', 'Eb7', 'Bb7', 'Fm7', 'Bb7', 'Eb7', 'Bb7', 'D7'],
        sequences: {
            default: [at('Bb7'), at('Eb7'), at('Bb7'), at('Fm7'), at('Bb7'), at('Eb7'), at('Bb7'), at('D7')],
            full: [
                at('Bb7'), at('Eb7'), at('Bb7'), at('Bb7'),
                at('Eb7'), at('Edim7'), at('Bb7'), at('D7'),
                at('Cm7'), at('F7'),
                at('Bb7', 0.5), at('D7', 0.5),
                at('Cm7', 0.5), at('F7', 0.5),
            ],
        },
        key: key('Bb', 'major'),
        tempo: 132,
    },
    {
        name: 'Misty in Eb',
        chords: ['Ebmaj7', 'Bbm7', 'Eb7', 'Abmaj7', 'Abm7', 'Db7', 'Ebmaj7', 'Cm7'],
        sequences: songSequences(aaba(
            ['Ebmaj7', 'Bbm7', 'Eb7', 'Abmaj7', 'Abm7', 'Db7', 'Ebmaj7', 'Cm7'],
            ['Fm7', 'Bb7', 'Gm7', 'C7', 'Fm7', 'Bb7', 'Ebmaj7', 'Bb7'],
        )),
        key: key('Eb', 'major'),
        tempo: 72,
    },
    {
        name: 'Body and Soul in Db',
        chords: ['Ebm7', 'Ab7', 'Dbmaj7', 'Gbmaj7', 'Gm7b5', 'C7b9', 'Fm7', 'Bb7'],
        sequences: songSequences(aaba(
            ['Ebm7', 'Ab7', 'Dbmaj7', 'Gbmaj7', 'Gm7b5', 'C7b9', 'Fm7', 'Bb7'],
            ['Ebm7', 'Ab7', 'Dbmaj7', 'Bbm7', 'Eb7', 'Abmaj7', 'Dm7b5', 'G7'],
        )),
        key: key('Db', 'major'),
        tempo: 66,
    },
    {
        name: 'In a Sentimental Mood in Db',
        chords: ['Dm7b5', 'G7', 'Cm7', 'F7', 'Bbm7', 'Eb7', 'Abmaj7', 'Dm7b5'],
        sequences: songSequences(aaba(
            ['Dm7b5', 'G7', 'Cm7', 'F7', 'Bbm7', 'Eb7', 'Abmaj7', 'Dm7b5'],
            ['Gm7b5', 'C7b9', 'Fm7', 'Bb7', 'Ebm7', 'Ab7', 'Dbmaj7', 'Dm7b5'],
        )),
        key: key('Db', 'major'),
        tempo: 76,
    },
    {
        name: 'The Girl from Ipanema in F',
        chords: ['Fmaj7', 'G7', 'Gm7', 'Gb7', 'Fmaj7', 'Gb7', 'Fmaj7', 'Fm7'],
        sequences: songSequences([
            'Fmaj7', 'G7', 'Gm7', 'Gb7', 'Fmaj7', 'Gb7', 'Fmaj7', 'Fm7',
            'Fmaj7', 'G7', 'Gm7', 'Gb7', 'Fmaj7', 'Gb7', 'Fmaj7', 'Fm7',
            'Gbmaj7', 'Gbmaj7', 'Bmaj7', 'Bmaj7', 'F#maj7', 'F#maj7', 'Bmaj7', 'Bmaj7',
            'Fmaj7', 'G7', 'Gm7', 'Gb7', 'Fmaj7', 'Gb7', 'Fmaj7', 'Fm7',
        ]),
        key: key('F', 'major'),
        tempo: 130,
    },
    {
        name: 'Corcovado in C',
        chords: ['Cm6', 'Fm7', 'Bb7', 'Ebmaj7', 'Ebm7', 'Ab7', 'Dbmaj7', 'Dm7b5'],
        sequences: songSequences([
            'Cm6', 'Fm7', 'Bb7', 'Ebmaj7', 'Ebm7', 'Ab7', 'Dbmaj7', 'Dm7b5',
            'Cm6', 'Fm7', 'Bb7', 'Ebmaj7', 'Ebm7', 'Ab7', 'Dbmaj7', 'Dm7b5',
        ], 8),
        key: key('C', 'major'),
        tempo: 120,
    },
    {
        name: 'Wave in D',
        chords: ['Dmaj7', 'Bb7', 'Am7', 'D7', 'Gmaj7', 'Gm6', 'F#m7', 'B7'],
        sequences: songSequences([
            'Dmaj7', 'Bb7', 'Am7', 'D7', 'Gmaj7', 'Gm6', 'F#m7', 'B7',
            'Em7', 'A7', 'Dmaj7', 'Dmaj7', 'Em7', 'A7', 'Dmaj7', 'Dmaj7',
            'Bbmaj7', 'Bbm7', 'Fmaj7', 'Fm7', 'Bbmaj7', 'Bbm7', 'Fmaj7', 'A7',
            'Dmaj7', 'Bb7', 'Am7', 'D7', 'Gmaj7', 'Gm6', 'F#m7', 'B7',
        ]),
        key: key('D', 'major'),
        tempo: 140,
    },
    {
        name: 'Desafinado in F',
        chords: ['Fmaj7', 'G7', 'Gm7', 'C7', 'Fmaj7', 'Bb7', 'Am7', 'D7'],
        sequences: songSequences([
            'Fmaj7', 'G7', 'Gm7', 'C7', 'Fmaj7', 'Bb7', 'Am7', 'D7',
            'Gm7', 'C7', 'Fmaj7', 'Fmaj7', 'Gm7', 'C7', 'Fmaj7', 'Fmaj7',
            'Bbmaj7', 'Bbmaj7', 'Ebmaj7', 'Ebmaj7', 'Am7', 'D7', 'Gm7', 'C7',
            'Fmaj7', 'G7', 'Gm7', 'C7', 'Fmaj7', 'Bb7', 'Am7', 'D7',
        ]),
        key: key('F', 'major'),
        tempo: 148,
    },
    // Modal vamps: the eight bar excerpt is the whole form.
    { name: 'Impressions in D minor', chords: ['Dm7', 'Dm7', 'Dm7', 'Dm7', 'Ebm7', 'Ebm7', 'Ebm7', 'Ebm7'], key: key('D', 'dorian'), tempo: 150 },
    { name: 'Footprints in C minor', chords: ['Cm7', 'Cm7', 'Cm7', 'Cm7', 'Fm7', 'Fm7', 'Fm7', 'Fm7'], key: key('C', 'minor'), tempo: 140 },
    { name: 'Maiden Voyage in C', chords: ['Cmaj7', 'Cmaj7', 'Cmaj7', 'Cmaj7', 'Dbmaj7', 'Dbmaj7', 'Dbmaj7', 'Dbmaj7'], key: key('C', 'major'), tempo: 116 },
    // The Oleo bridge is a complete eight bar form.
    { name: 'Oleo bridge in Bb', chords: ['D7', 'D7', 'G7', 'G7', 'C7', 'C7', 'F7', 'F7'], key: key('Bb', 'major'), tempo: 180 },
    {
        name: 'Anthropology in Bb',
        chords: ['Bbmaj7', 'G7', 'Cm7', 'F7', 'Bbmaj7', 'D7', 'G7', 'C7'],
        sequences: songSequences(aaba(
            ['Bbmaj7', 'G7', 'Cm7', 'F7', 'Bbmaj7', 'D7', 'G7', 'C7'],
            ['D7', 'G7', 'C7', 'F7', 'Bb7', 'Eb7', 'Ab7', 'Db7'],
        )),
        key: key('Bb', 'major'),
        tempo: 184,
    },
    {
        name: 'Beautiful Love in D minor',
        chords: ['Em7b5', 'A7b9', 'Dm7', 'Dm7', 'Gm7', 'C7', 'Fmaj7', 'Bbmaj7'],
        sequences: songSequences(aaba(
            ['Em7b5', 'A7b9', 'Dm7', 'Dm7', 'Gm7', 'C7', 'Fmaj7', 'Bbmaj7'],
            ['Em7b5', 'A7b9', 'Dm7', 'Dm7', 'Gm7', 'C7', 'Fmaj7', 'Fmaj7'],
        )),
        key: key('D', 'minor'),
        tempo: 120,
    },
    {
        name: 'Just Friends in F',
        chords: ['Fmaj7', 'Gm7', 'C7', 'Fmaj7', 'Bbmaj7', 'Bbm7', 'Eb7', 'Fmaj7'],
        sequences: songSequences(aaba(
            ['Fmaj7', 'Gm7', 'C7', 'Fmaj7', 'Bbmaj7', 'Bbm7', 'Eb7', 'Fmaj7'],
            ['Am7', 'D7', 'Gm7', 'C7', 'Fmaj7', 'Bbm7', 'Eb7', 'Fmaj7'],
        )),
        key: key('F', 'major'),
        tempo: 144,
    },
    {
        name: 'Out of Nowhere in G',
        chords: ['Gmaj7', 'Bbm7', 'Eb7', 'Gmaj7', 'Bm7', 'E7', 'Am7', 'D7'],
        sequences: songSequences(aaba(
            ['Gmaj7', 'Bbm7', 'Eb7', 'Gmaj7', 'Bm7', 'E7', 'Am7', 'D7'],
            ['Bbmaj7', 'Bbm7', 'Eb7', 'Abmaj7', 'Am7', 'D7', 'Gmaj7', 'D7'],
        )),
        key: key('G', 'major'),
        tempo: 152,
    },
    {
        name: 'Softly as in a Morning Sunrise in C minor',
        chords: ['Cm7', 'Cm7', 'Fm7', 'Fm7', 'Cm7', 'Cm7', 'Dm7b5', 'G7'],
        sequences: songSequences(aaba(
            ['Cm7', 'Cm7', 'Fm7', 'Fm7', 'Cm7', 'Cm7', 'Dm7b5', 'G7'],
            ['Abmaj7', 'Abmaj7', 'Abm7', 'Abm7', 'Gm7', 'Gm7', 'Dm7b5', 'G7'],
        )),
        key: key('C', 'minor'),
        tempo: 112,
    },
    {
        name: 'Yesterdays in D minor',
        chords: ['Dm7', 'Bb7', 'Gm7', 'A7', 'Dm7', 'Bb7', 'Gm7', 'A7'],
        sequences: songSequences(aaba(
            ['Dm7', 'Bb7', 'Gm7', 'A7', 'Dm7', 'Bb7', 'Gm7', 'A7'],
            ['Dm7', 'G7', 'Cmaj7', 'Fmaj7', 'Bm7b5', 'E7', 'Em7b5', 'A7'],
        )),
        key: key('D', 'minor'),
        tempo: 92,
    },
    {
        name: 'Alone Together in D minor',
        chords: ['Dm7', 'Dm7', 'Dm7', 'Dm7', 'Gm7', 'Gm7', 'Dm7', 'Dm7'],
        sequences: songSequences(aaba(
            ['Dm7', 'Dm7', 'Dm7', 'Dm7', 'Gm7', 'Gm7', 'Dm7', 'Dm7'],
            ['Am7b5', 'D7', 'Gm7', 'Gm7', 'Am7b5', 'D7', 'Gm7', 'Gm7'],
        )),
        key: key('D', 'minor'),
        tempo: 128,
    },
    {
        name: 'Night and Day in Eb',
        chords: ['Ebmaj7', 'Ebmaj7', 'Ebm7', 'Ab7', 'Ebmaj7', 'Cm7', 'Fm7', 'Bb7'],
        sequences: songSequences(aaba(
            ['Ebmaj7', 'Ebmaj7', 'Ebm7', 'Ab7', 'Ebmaj7', 'Cm7', 'Fm7', 'Bb7'],
            ['Abmaj7', 'Abm7', 'Db7', 'Gm7', 'C7', 'Fm7', 'Bb7', 'Ebmaj7'],
        )),
        key: key('Eb', 'major'),
        tempo: 120,
    },
]
