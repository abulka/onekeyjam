// @ts-check

/*
 * Definitions for the generated "rock" project library. Each entry is a
 * simplified 4 to 8 chord excerpt of a rock song, for jamming rather than a
 * full transcription. The generator turns each entry into a project JSON with
 * voicings and engine-chosen scales.
 *
 * Straight rock uses the diatonic colour; Steely Dan fusion entries use the
 * jazz colour so the engine can pick richer extensions.
 */

/** @param {string} tonic @param {string} type */
function key(tonic, type) {
    return { tonic, type, source: 'user' }
}

/** @type {Array<{name: string, chords: string[], key?: {tonic:string, type:string, source:string}, colour?: string}>} */
export const DEFINITIONS = [
    // Progressive rock and Pink Floyd
    { name: 'Wish You Were Here - Pink Floyd in G', chords: ['Em7', 'G', 'A7sus4', 'G', 'C', 'D', 'Am', 'G'], key: key('G', 'major'), colour: 'diatonic' },
    { name: 'Comfortably Numb - Pink Floyd in B minor', chords: ['Bm', 'A', 'G', 'Em', 'Bm', 'A', 'G', 'Em'], key: key('B', 'minor'), colour: 'diatonic' },
    { name: 'Another Brick in the Wall - Pink Floyd in D minor', chords: ['Dm', 'F', 'C', 'G', 'Dm', 'F', 'C', 'G'], key: key('D', 'minor'), colour: 'diatonic' },
    { name: 'Time - Pink Floyd in Fsharp minor', chords: ['F#m', 'A', 'E', 'Bm', 'F#m', 'A', 'E', 'Bm'], key: key('F#', 'minor'), colour: 'diatonic' },
    { name: 'Stairway to Heaven - Led Zeppelin in A minor', chords: ['Am', 'G', 'C', 'D', 'F', 'G', 'Am', 'E7'], key: key('A', 'minor'), colour: 'diatonic' },
    { name: 'Kashmir - Led Zeppelin in D', chords: ['D', 'C', 'G', 'D', 'Bb', 'C', 'D', 'D'], key: key('D', 'major'), colour: 'diatonic' },
    { name: 'Owner of a Lonely Heart - Yes in A minor', chords: ['Am', 'C', 'F', 'G', 'Am', 'C', 'F', 'E7'], key: key('A', 'minor'), colour: 'diatonic' },
    { name: 'Tom Sawyer - Rush in E minor', chords: ['Em', 'D', 'C', 'Bm', 'Em', 'D', 'C', 'B7'], key: key('E', 'minor'), colour: 'diatonic' },
    { name: 'Land of Confusion - Genesis in D minor', chords: ['Dm', 'Bb', 'F', 'C', 'Dm', 'Bb', 'G', 'A'], key: key('D', 'minor'), colour: 'diatonic' },
    { name: '21st Century Schizoid Man - King Crimson in A minor', chords: ['Am', 'Bb', 'C', 'D', 'Am', 'Bb', 'C', 'E7'], key: key('A', 'minor'), colour: 'diatonic' },
    { name: 'Aqualung - Jethro Tull in G minor', chords: ['Gm', 'F', 'Eb', 'D', 'Gm', 'F', 'Eb', 'D'], key: key('G', 'minor'), colour: 'diatonic' },
    { name: 'Logical Song - Supertramp in C minor', chords: ['Cm', 'Ab', 'Eb', 'Bb', 'Cm', 'Ab', 'Fm', 'G7'], key: key('C', 'minor'), colour: 'diatonic' },
    { name: 'Smoke on the Water - Deep Purple in G minor', chords: ['Gm', 'Bb', 'Eb', 'F', 'Gm', 'Bb', 'C', 'D7'], key: key('G', 'minor'), colour: 'diatonic' },
    { name: 'Paranoid - Black Sabbath in E minor', chords: ['Em', 'D', 'G', 'A', 'Em', 'D', 'G', 'B7'], key: key('E', 'minor'), colour: 'diatonic' },
    // Steely Dan and fusion rock
    { name: "Reelin In the Years - Steely Dan in F", chords: ['F', 'Dm', 'Bb', 'C', 'F', 'Dm', 'Gm', 'C'], key: key('F', 'major'), colour: 'diatonic' },
    { name: 'Do It Again - Steely Dan in G minor', chords: ['Gm7', 'C7', 'Fmaj7', 'Ebmaj7', 'Dm7', 'G7', 'Cm7', 'D7'], key: key('G', 'minor'), colour: 'jazz' },
    { name: 'Rikki Do Not Lose That Number - Steely Dan in D', chords: ['Dmaj7', 'G', 'A', 'Bm', 'G', 'D', 'Em', 'A7'], key: key('D', 'major'), colour: 'jazz' },
    { name: 'Deacon Blues - Steely Dan in C', chords: ['Cmaj7', 'B7', 'E7', 'A7', 'Dm7', 'G7', 'C6', 'G7'], key: key('C', 'major'), colour: 'jazz' },
    { name: 'Kid Charlemagne - Steely Dan in C minor', chords: ['Cm7', 'F7', 'Bbm7', 'Eb7', 'Abmaj7', 'G7', 'Cm7', 'G7'], key: key('C', 'minor'), colour: 'jazz' },
    { name: 'Aja - Steely Dan in B', chords: ['Bm7', 'E7', 'Amaj7', 'Gmaj7', 'F#m7', 'B7', 'Em7', 'F#7'], key: key('B', 'major'), colour: 'jazz' },
    { name: 'FM - Steely Dan in C minor', chords: ['Cm7', 'F7', 'Bbm7', 'Eb7', 'Abmaj7', 'Db7', 'Cm7', 'G7'], key: key('C', 'minor'), colour: 'jazz' },
    // Traditional hard rock
    { name: 'Highway to Hell - ACDC in A', chords: ['A', 'D', 'G', 'D', 'A', 'D', 'G', 'E'], key: key('A', 'major'), colour: 'diatonic' },
    { name: 'Back in Black - ACDC in E', chords: ['E', 'D', 'A', 'E', 'D', 'A', 'B', 'E'], key: key('E', 'major'), colour: 'diatonic' },
    { name: 'Thunderstruck - ACDC in B minor', chords: ['Bm', 'G', 'A', 'E', 'Bm', 'G', 'A', 'F#7'], key: key('B', 'minor'), colour: 'diatonic' },
    { name: 'Hells Bells - ACDC in A minor', chords: ['Am', 'C', 'G', 'E', 'Am', 'C', 'G', 'E'], key: key('A', 'minor'), colour: 'diatonic' },
    { name: 'TNT - ACDC in E', chords: ['E', 'A', 'B', 'A', 'E', 'A', 'D', 'B'], key: key('E', 'major'), colour: 'diatonic' },
    { name: 'Crazy Little Thing Called Love - Queen in D', chords: ['D', 'G', 'C', 'G', 'Bb', 'C', 'D', 'A7'], key: key('D', 'major'), colour: 'diatonic' },
    { name: 'Pinball Wizard - The Who in B minor', chords: ['Bm', 'G', 'D', 'A', 'Bm', 'G', 'A', 'F#7'], key: key('B', 'minor'), colour: 'diatonic' },
    { name: 'Brown Sugar - Rolling Stones in C', chords: ['C', 'G', 'F', 'C', 'Bb', 'F', 'C', 'G'], key: key('C', 'major'), colour: 'diatonic' },
    { name: 'Hotel California - Eagles in B minor', chords: ['Bm', 'F#', 'A', 'E', 'G', 'D', 'Em', 'F#'], key: key('B', 'minor'), colour: 'diatonic' },
]
