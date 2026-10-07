// @ts-check

/*
 * Definitions for the generated "rock" project library. Each entry is a
 * simplified excerpt of a rock song, for jamming rather than a full
 * transcription. The generator turns each entry into a project JSON with
 * voicings and engine-chosen scales.
 *
 * Rock songs are mostly loop based, so the short excerpt (the automatic
 * `default` sequence) is often the whole groove. Where a song has a distinct
 * chorus or a longer form, `songSequences` adds a `full` version that runs the
 * sections; a `medium` middle section is included when the form is long
 * enough. Straight rock uses the diatonic colour; Steely Dan fusion entries
 * use the jazz colour so the engine can pick richer extensions.
 *
 * Tempos follow the records: slow Floyd ballads at the bottom, hard rock in
 * the middle, and punk-paced numbers at the top. Loading a song applies its
 * tempo to the global BPM.
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
 * a whole bar, or an array of chords splitting the bar equally.
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
 * The named sequences for a song: its full form, plus a middle section made of
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

/** @type {Array<{name: string, chords: string[], sequence?: Array<{chord: string, bars: number}>, sequences?: {[name: string]: Array<{chord: string, bars: number}>}, sequenceLabels?: {[name: string]: string}, tempo?: number, key?: {tonic:string, type:string, source:string}, colour?: string}>} */
export const DEFINITIONS = [
    // Progressive rock and Pink Floyd
    {
        name: 'Wish You Were Here - Pink Floyd in G',
        chords: ['Em7', 'G', 'A7sus4', 'G', 'C', 'D', 'Am', 'G'],
        sequences: songSequences([
            'Em7', 'G', 'Em7', 'G', 'Em7', 'A7sus4', 'Em7', 'A7sus4',
            'C', 'D', 'Am', 'G', 'C', 'D', 'Am', 'G',
            'Em7', 'G', 'Em7', 'G', 'Em7', 'A7sus4', 'Em7', 'A7sus4',
        ]),
        key: key('G', 'major'), colour: 'diatonic', tempo: 60,
    },
    {
        name: 'Comfortably Numb - Pink Floyd in B minor',
        chords: ['Bm', 'A', 'G', 'Em', 'Bm', 'A', 'G', 'Em'],
        sequences: songSequences([
            'Bm', 'A', 'G', 'Em', 'Bm', 'A', 'G', 'Em',
            'D', 'A', 'D', 'A', 'D', 'A', 'D', 'A',
            'Bm', 'A', 'G', 'Em', 'Bm', 'A', 'G', 'Em',
        ]),
        key: key('B', 'minor'), colour: 'diatonic', tempo: 64,
    },
    {
        name: 'Another Brick in the Wall - Pink Floyd in D minor',
        chords: ['Dm', 'F', 'C', 'G', 'Dm', 'F', 'C', 'G'],
        sequences: songSequences([
            'Dm', 'F', 'C', 'G', 'Dm', 'F', 'C', 'G',
            'Dm', 'F', 'C', 'G', 'Dm', 'F', 'C', 'G',
        ]),
        key: key('D', 'minor'), colour: 'diatonic', tempo: 100,
    },
    {
        name: 'Time - Pink Floyd in Fsharp minor',
        chords: ['F#m', 'A', 'E', 'Bm', 'F#m', 'A', 'E', 'Bm'],
        sequences: songSequences([
            'F#m', 'A', 'E', 'Bm', 'F#m', 'A', 'E', 'Bm',
            'F#m', 'A', 'E', 'Bm', 'F#m', 'A', 'E', 'Bm',
        ]),
        key: key('F#', 'minor'), colour: 'diatonic', tempo: 62,
    },
    {
        name: 'Stairway to Heaven - Led Zeppelin in A minor',
        chords: ['Am', 'G', 'C', 'D', 'F', 'G', 'Am', 'E7'],
        sequences: songSequences([
            'Am', 'G', 'C', 'D', 'F', 'G', 'Am', 'E7',
            'G', 'D', 'F', 'G', 'Am', 'G', 'C', 'D',
            'Am', 'G', 'C', 'D', 'F', 'G', 'Am', 'E7',
        ]),
        key: key('A', 'minor'), colour: 'diatonic', tempo: 76,
    },
    {
        name: 'Kashmir - Led Zeppelin in D',
        chords: ['D', 'C', 'G', 'D', 'Bb', 'C', 'D', 'D'],
        sequences: songSequences([
            'D', 'C', 'G', 'D', 'Bb', 'C', 'D', 'D',
            'D', 'C', 'G', 'D', 'Bb', 'C', 'D', 'D',
        ]),
        key: key('D', 'major'), colour: 'diatonic', tempo: 80,
    },
    {
        name: 'Owner of a Lonely Heart - Yes in A minor',
        chords: ['Am', 'C', 'F', 'G', 'Am', 'C', 'F', 'E7'],
        sequences: songSequences([
            'Am', 'C', 'F', 'G', 'Am', 'C', 'F', 'E7',
            'Am', 'C', 'F', 'G', 'Am', 'C', 'F', 'E7',
        ]),
        key: key('A', 'minor'), colour: 'diatonic', tempo: 120,
    },
    {
        name: 'Tom Sawyer - Rush in E minor',
        chords: ['Em', 'D', 'C', 'Bm', 'Em', 'D', 'C', 'B7'],
        sequences: songSequences([
            'Em', 'D', 'C', 'Bm', 'Em', 'D', 'C', 'B7',
            'Em', 'D', 'C', 'Bm', 'Em', 'D', 'C', 'B7',
        ]),
        key: key('E', 'minor'), colour: 'diatonic', tempo: 87,
    },
    {
        name: 'Land of Confusion - Genesis in D minor',
        chords: ['Dm', 'Bb', 'F', 'C', 'Dm', 'Bb', 'G', 'A'],
        sequences: songSequences([
            'Dm', 'Bb', 'F', 'C', 'Dm', 'Bb', 'G', 'A',
            'Dm', 'Bb', 'F', 'C', 'Dm', 'Bb', 'G', 'A',
        ]),
        key: key('D', 'minor'), colour: 'diatonic', tempo: 84,
    },
    {
        name: '21st Century Schizoid Man - King Crimson in A minor',
        chords: ['Am', 'Bb', 'C', 'D', 'Am', 'Bb', 'C', 'E7'],
        sequences: songSequences([
            'Am', 'Bb', 'C', 'D', 'Am', 'Bb', 'C', 'E7',
            'Am', 'Bb', 'C', 'D', 'Am', 'Bb', 'C', 'E7',
        ]),
        key: key('A', 'minor'), colour: 'diatonic', tempo: 120,
    },
    {
        name: 'Aqualung - Jethro Tull in G minor',
        chords: ['Gm', 'F', 'Eb', 'D', 'Gm', 'F', 'Eb', 'D'],
        sequences: songSequences([
            'Gm', 'F', 'Eb', 'D', 'Gm', 'F', 'Eb', 'D',
            'Gm', 'F', 'Eb', 'D', 'Gm', 'F', 'Eb', 'D',
        ]),
        key: key('G', 'minor'), colour: 'diatonic', tempo: 96,
    },
    {
        name: 'Logical Song - Supertramp in C minor',
        chords: ['Cm', 'Ab', 'Eb', 'Bb', 'Cm', 'Ab', 'Fm', 'G7'],
        sequences: songSequences([
            'Cm', 'Ab', 'Eb', 'Bb', 'Cm', 'Ab', 'Fm', 'G7',
            'Cm', 'Ab', 'Eb', 'Bb', 'Cm', 'Ab', 'Fm', 'G7',
        ]),
        key: key('C', 'minor'), colour: 'diatonic', tempo: 120,
    },
    {
        name: 'Smoke on the Water - Deep Purple in G minor',
        chords: ['Gm', 'Bb', 'Eb', 'F', 'Gm', 'Bb', 'C', 'D7'],
        sequences: songSequences([
            'Gm', 'Bb', 'Eb', 'F', 'Gm', 'Bb', 'C', 'D7',
            'Gm', 'Bb', 'Eb', 'F', 'Gm', 'Bb', 'C', 'D7',
        ]),
        key: key('G', 'minor'), colour: 'diatonic', tempo: 116,
    },
    {
        name: 'Paranoid - Black Sabbath in E minor',
        chords: ['Em', 'D', 'G', 'A', 'Em', 'D', 'G', 'B7'],
        sequences: songSequences([
            'Em', 'D', 'G', 'A', 'Em', 'D', 'G', 'B7',
            'Em', 'D', 'G', 'A', 'Em', 'D', 'G', 'B7',
        ]),
        key: key('E', 'minor'), colour: 'diatonic', tempo: 164,
    },
    // Steely Dan and fusion rock
    {
        name: "Reelin In the Years - Steely Dan in F",
        chords: ['F', 'Dm', 'Bb', 'C', 'F', 'Dm', 'Gm', 'C'],
        sequences: songSequences([
            'F', 'Dm', 'Bb', 'C', 'F', 'Dm', 'Gm', 'C',
            'F', 'Dm', 'Bb', 'C', 'F', 'Dm', 'Gm', 'C',
        ]),
        key: key('F', 'major'), colour: 'diatonic', tempo: 150,
    },
    {
        name: 'Do It Again - Steely Dan in G minor',
        chords: ['Gm7', 'C7', 'Fmaj7', 'Ebmaj7', 'Dm7', 'G7', 'Cm7', 'D7'],
        sequences: songSequences([
            'Gm7', 'C7', 'Fmaj7', 'Ebmaj7', 'Dm7', 'G7', 'Cm7', 'D7',
            'Gm7', 'C7', 'Fmaj7', 'Ebmaj7', 'Dm7', 'G7', 'Cm7', 'D7',
        ]),
        key: key('G', 'minor'), colour: 'jazz', tempo: 116,
    },
    {
        name: 'Rikki Do Not Lose That Number - Steely Dan in D',
        chords: ['Dmaj7', 'G', 'A', 'Bm', 'G', 'D', 'Em', 'A7'],
        sequences: songSequences([
            'Dmaj7', 'G', 'A', 'Bm', 'G', 'D', 'Em', 'A7',
            'Dmaj7', 'G', 'A', 'Bm', 'G', 'D', 'Em', 'A7',
        ]),
        key: key('D', 'major'), colour: 'jazz', tempo: 120,
    },
    {
        name: 'Deacon Blues - Steely Dan in C',
        chords: ['Cmaj7', 'B7', 'E7', 'A7', 'Dm7', 'G7', 'C6', 'G7'],
        sequences: songSequences([
            'Cmaj7', 'B7', 'E7', 'A7', 'Dm7', 'G7', 'C6', 'G7',
            'Cmaj7', 'B7', 'E7', 'A7', 'Dm7', 'G7', 'C6', 'G7',
        ]),
        key: key('C', 'major'), colour: 'jazz', tempo: 80,
    },
    {
        name: 'Kid Charlemagne - Steely Dan in C minor',
        chords: ['Cm7', 'F7', 'Bbm7', 'Eb7', 'Abmaj7', 'G7', 'Cm7', 'G7'],
        sequences: songSequences([
            'Cm7', 'F7', 'Bbm7', 'Eb7', 'Abmaj7', 'G7', 'Cm7', 'G7',
            'Cm7', 'F7', 'Bbm7', 'Eb7', 'Abmaj7', 'G7', 'Cm7', 'G7',
        ]),
        key: key('C', 'minor'), colour: 'jazz', tempo: 98,
    },
    {
        name: 'Aja - Steely Dan in B',
        chords: ['Bm7', 'E7', 'Amaj7', 'Gmaj7', 'F#m7', 'B7', 'Em7', 'F#7'],
        sequences: songSequences([
            'Bm7', 'E7', 'Amaj7', 'Gmaj7', 'F#m7', 'B7', 'Em7', 'F#7',
            'Bm7', 'E7', 'Amaj7', 'Gmaj7', 'F#m7', 'B7', 'Em7', 'F#7',
        ]),
        key: key('B', 'major'), colour: 'jazz', tempo: 100,
    },
    {
        name: 'FM - Steely Dan in C minor',
        chords: ['Cm7', 'F7', 'Bbm7', 'Eb7', 'Abmaj7', 'Db7', 'Cm7', 'G7'],
        sequences: songSequences([
            'Cm7', 'F7', 'Bbm7', 'Eb7', 'Abmaj7', 'Db7', 'Cm7', 'G7',
            'Cm7', 'F7', 'Bbm7', 'Eb7', 'Abmaj7', 'Db7', 'Cm7', 'G7',
        ]),
        key: key('C', 'minor'), colour: 'jazz', tempo: 100,
    },
    // Traditional hard rock
    {
        name: 'Highway to Hell - ACDC in A',
        chords: ['A', 'D', 'G', 'D', 'A', 'D', 'G', 'E'],
        sequences: songSequences([
            'A', 'D', 'G', 'D', 'A', 'D', 'G', 'E',
            'A', 'D', 'G', 'D', 'A', 'D', 'G', 'E',
        ]),
        key: key('A', 'major'), colour: 'diatonic', tempo: 116,
    },
    {
        name: 'Back in Black - ACDC in E',
        chords: ['E', 'D', 'A', 'E', 'D', 'A', 'B', 'E'],
        sequences: songSequences([
            'E', 'D', 'A', 'E', 'D', 'A', 'B', 'E',
            'E', 'D', 'A', 'E', 'D', 'A', 'B', 'E',
        ]),
        key: key('E', 'major'), colour: 'diatonic', tempo: 92,
    },
    {
        name: 'Thunderstruck - ACDC in B minor',
        chords: ['Bm', 'G', 'A', 'E', 'Bm', 'G', 'A', 'F#7'],
        sequences: songSequences([
            'Bm', 'G', 'A', 'E', 'Bm', 'G', 'A', 'F#7',
            'Bm', 'G', 'A', 'E', 'Bm', 'G', 'A', 'F#7',
        ]),
        key: key('B', 'minor'), colour: 'diatonic', tempo: 134,
    },
    {
        name: 'Hells Bells - ACDC in A minor',
        chords: ['Am', 'C', 'G', 'E', 'Am', 'C', 'G', 'E'],
        sequences: songSequences([
            'Am', 'C', 'G', 'E', 'Am', 'C', 'G', 'E',
            'Am', 'C', 'G', 'E', 'Am', 'C', 'G', 'E',
        ]),
        key: key('A', 'minor'), colour: 'diatonic', tempo: 76,
    },
    {
        name: 'TNT - ACDC in E',
        chords: ['E', 'A', 'B', 'A', 'E', 'A', 'D', 'B'],
        sequences: songSequences([
            'E', 'A', 'B', 'A', 'E', 'A', 'D', 'B',
            'E', 'A', 'B', 'A', 'E', 'A', 'D', 'B',
        ]),
        key: key('E', 'major'), colour: 'diatonic', tempo: 130,
    },
    {
        name: 'Crazy Little Thing Called Love - Queen in D',
        chords: ['D', 'G', 'C', 'G', 'Bb', 'C', 'D', 'A7'],
        sequences: songSequences([
            'D', 'G', 'C', 'G', 'Bb', 'C', 'D', 'A7',
            'D', 'G', 'C', 'G', 'Bb', 'C', 'D', 'A7',
        ]),
        key: key('D', 'major'), colour: 'diatonic', tempo: 154,
    },
    {
        name: 'Pinball Wizard - The Who in B minor',
        chords: ['Bm', 'G', 'D', 'A', 'Bm', 'G', 'A', 'F#7'],
        sequences: songSequences([
            'Bm', 'G', 'D', 'A', 'Bm', 'G', 'A', 'F#7',
            'Bm', 'G', 'D', 'A', 'Bm', 'G', 'A', 'F#7',
        ]),
        key: key('B', 'minor'), colour: 'diatonic', tempo: 104,
    },
    {
        name: 'Brown Sugar - Rolling Stones in C',
        chords: ['C', 'G', 'F', 'C', 'Bb', 'F', 'C', 'G'],
        sequences: songSequences([
            'C', 'G', 'F', 'C', 'Bb', 'F', 'C', 'G',
            'C', 'G', 'F', 'C', 'Bb', 'F', 'C', 'G',
        ]),
        key: key('C', 'major'), colour: 'diatonic', tempo: 124,
    },
    {
        name: 'Hotel California - Eagles in B minor',
        chords: ['Bm', 'F#', 'A', 'E', 'G', 'D', 'Em', 'F#'],
        sequences: songSequences([
            'Bm', 'F#', 'A', 'E', 'G', 'D', 'Em', 'F#',
            'G', 'D', 'Em', 'F#', 'G', 'D', 'Em', 'F#',
            'Bm', 'F#', 'A', 'E', 'G', 'D', 'Em', 'F#',
        ]),
        key: key('B', 'minor'), colour: 'diatonic', tempo: 75,
    },
]
