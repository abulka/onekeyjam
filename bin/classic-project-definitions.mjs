// @ts-check

/*
 * Definitions for the generated "classic" project library. Each entry is a
 * jazz standard or blues song excerpt; the generator turns it into a project
 * JSON with voicings and engine-chosen scales. Songs are chords only, no
 * melodies. Generic practice progressions live in
 * bin/progressions-project-definitions.mjs and rock songs in
 * bin/rock-project-definitions.mjs.
 */

/** @param {string} tonic @param {string} type */
function key(tonic, type) {
    return { tonic, type, source: 'user' }
}

/** @param {string} chord @param {number} [bars] */
function at(chord, bars = 1) {
    return { chord, bars }
}

/** @type {Array<{name: string, chords: string[], sequence?: Array<{chord: string, bars: number}>, key?: {tonic:string, type:string, source:string}, colour?: string}>} */
export const DEFINITIONS = [
    // Jazz standard changes (chords only)
    { name: 'Autumn Leaves in G minor', chords: ['Cm7', 'F7', 'Bbmaj7', 'Ebmaj7', 'Am7b5', 'D7', 'Gm7', 'Gm7'], key: key('G', 'minor') },
    { name: 'Fly Me to the Moon in C', chords: ['Am7', 'Dm7', 'G7', 'Cmaj7', 'Fmaj7', 'Bm7b5', 'E7', 'Am7'], key: key('C', 'major') },
    { name: 'Blue Bossa in C minor', chords: ['Cm7', 'Fm7', 'Dm7b5', 'G7', 'Cm7', 'Ebm7', 'Ab7', 'Dbmaj7'], key: key('C', 'minor') },
    {
        name: 'Take the A Train in C',
        chords: ['Cmaj7', 'D7', 'Dm7', 'G7', 'Cmaj7', 'D7', 'Dm7', 'G7'],
        // The famous Dm7-G7 split shares one bar, twice through.
        sequence: [at('Cmaj7'), at('D7'), at('Dm7', 0.5), at('G7', 0.5), at('Cmaj7'), at('D7'), at('Dm7', 0.5), at('G7', 0.5)],
        key: key('C', 'major'),
    },
    { name: 'All the Things You Are in Ab', chords: ['Fm7', 'Bbm7', 'Eb7', 'Abmaj7', 'Dbmaj7', 'Dm7', 'G7', 'Cmaj7'], key: key('Ab', 'major') },
    { name: 'Summertime in A minor', chords: ['Am7', 'E7', 'Am7', 'Am7', 'Dm7', 'Am7', 'E7', 'Am7'], key: key('A', 'minor') },
    { name: 'Rhythm Changes in Bb', chords: ['Bbmaj7', 'G7', 'Cm7', 'F7', 'Bbmaj7', 'G7', 'Cm7', 'F7'], key: key('Bb', 'major') },
    {
        name: 'Blues for Alice in F',
        chords: ['Fmaj7', 'Em7b5', 'A7', 'Dm7', 'G7', 'Cm7', 'F7', 'Bbmaj7'],
        // Parker bebop blues: two chords per bar through bars 2 to 4.
        sequence: [at('Fmaj7'), at('Em7b5', 0.5), at('A7', 0.5), at('Dm7', 0.5), at('G7', 0.5), at('Cm7', 0.5), at('F7', 0.5), at('Bbmaj7')],
        key: key('F', 'major'),
    },
    { name: 'There Will Never Be Another You in Eb', chords: ['Ebmaj7', 'Dm7b5', 'G7', 'Cm7', 'F7', 'Fm7', 'Bb7', 'Ebmaj7'], key: key('Eb', 'major') },
    {
        name: 'Stella by Starlight in Bb',
        chords: ['Em7b5', 'A7b9', 'Cm7', 'F7', 'Fm7', 'Bb7', 'Ebmaj7', 'Ab7'],
        // Two chords per bar through the opening four bars.
        sequence: [at('Em7b5', 0.5), at('A7b9', 0.5), at('Cm7', 0.5), at('F7', 0.5), at('Fm7', 0.5), at('Bb7', 0.5), at('Ebmaj7', 0.5), at('Ab7', 0.5)],
        key: key('Bb', 'major'),
    },
    { name: 'Have You Met Miss Jones in F', chords: ['Fmaj7', 'Fm7', 'Bb7', 'Ebmaj7', 'Em7b5', 'A7', 'Dm7', 'G7'], key: key('F', 'major') },
    { name: 'Days of Wine and Roses in F', chords: ['Fmaj7', 'Ebmaj7', 'Dm7', 'G7', 'Em7b5', 'A7', 'Dm7', 'G7'], key: key('F', 'major') },
    { name: 'Blue Moon in C', chords: ['Cmaj7', 'Am7', 'Dm7', 'G7', 'Cmaj7', 'Am7', 'Dm7', 'G7'], key: key('C', 'major') },
    // Real-song excerpts (first eight bars, simplified changes; chords only)
    { name: "Billie's Bounce in F", chords: ['F7', 'Bb7', 'F7', 'Cm7', 'F7', 'Bb7', 'F7', 'A7'], key: key('F', 'major') },
    { name: "Now's the Time in F", chords: ['F7', 'Bb7', 'F7', 'F7', 'Bb7', 'Bdim7', 'F7', 'D7'], key: key('F', 'major') },
    { name: 'Au Privave in F', chords: ['F7', 'Bb7', 'F7', 'Cm7', 'F7', 'Bb7', 'F7', 'A7'], key: key('F', 'major') },
    { name: 'Straight No Chaser in Bb', chords: ['Bb7', 'Eb7', 'Bb7', 'Fm7', 'Bb7', 'Eb7', 'Bb7', 'G7'], key: key('Bb', 'major') },
    { name: 'Tenor Madness in Bb', chords: ['Bb7', 'Eb7', 'Bb7', 'Fm7', 'Bb7', 'Eb7', 'Bb7', 'D7'], key: key('Bb', 'major') },
    { name: 'Misty in Eb', chords: ['Ebmaj7', 'Bbm7', 'Eb7', 'Abmaj7', 'Abm7', 'Db7', 'Ebmaj7', 'Cm7'], key: key('Eb', 'major') },
    { name: 'Body and Soul in Db', chords: ['Ebm7', 'Ab7', 'Dbmaj7', 'Gbmaj7', 'Gm7b5', 'C7b9', 'Fm7', 'Bb7'], key: key('Db', 'major') },
    { name: 'In a Sentimental Mood in Db', chords: ['Dm7b5', 'G7', 'Cm7', 'F7', 'Bbm7', 'Eb7', 'Abmaj7', 'Dm7b5'], key: key('Db', 'major') },
    { name: 'The Girl from Ipanema in F', chords: ['Fmaj7', 'G7', 'Gm7', 'Gb7', 'Fmaj7', 'Gb7', 'Fmaj7', 'Fm7'], key: key('F', 'major') },
    { name: 'Corcovado in C', chords: ['Cm6', 'Fm7', 'Bb7', 'Ebmaj7', 'Ebm7', 'Ab7', 'Dbmaj7', 'Dm7b5'], key: key('C', 'major') },
    { name: 'Wave in D', chords: ['Dmaj7', 'Bb7', 'Am7', 'D7', 'Gmaj7', 'Gm6', 'F#m7', 'B7'], key: key('D', 'major') },
    { name: 'Desafinado in F', chords: ['Fmaj7', 'G7', 'Gm7', 'C7', 'Fmaj7', 'Bb7', 'Am7', 'D7'], key: key('F', 'major') },
    { name: 'Impressions in D minor', chords: ['Dm7', 'Dm7', 'Dm7', 'Dm7', 'Ebm7', 'Ebm7', 'Ebm7', 'Ebm7'], key: key('D', 'dorian') },
    { name: 'Footprints in C minor', chords: ['Cm7', 'Cm7', 'Cm7', 'Cm7', 'Fm7', 'Fm7', 'Fm7', 'Fm7'], key: key('C', 'minor') },
    { name: 'Maiden Voyage in C', chords: ['Cmaj7', 'Cmaj7', 'Cmaj7', 'Cmaj7', 'Dbmaj7', 'Dbmaj7', 'Dbmaj7', 'Dbmaj7'], key: key('C', 'major') },
    { name: 'Oleo bridge in Bb', chords: ['D7', 'D7', 'G7', 'G7', 'C7', 'C7', 'F7', 'F7'], key: key('Bb', 'major') },
    { name: 'Anthropology in Bb', chords: ['Bbmaj7', 'G7', 'Cm7', 'F7', 'Bbmaj7', 'D7', 'G7', 'C7'], key: key('Bb', 'major') },
    { name: 'Beautiful Love in D minor', chords: ['Em7b5', 'A7b9', 'Dm7', 'Dm7', 'Gm7', 'C7', 'Fmaj7', 'Bbmaj7'], key: key('D', 'minor') },
    { name: 'Just Friends in F', chords: ['Fmaj7', 'Gm7', 'C7', 'Fmaj7', 'Bbmaj7', 'Bbm7', 'Eb7', 'Fmaj7'], key: key('F', 'major') },
    { name: 'Out of Nowhere in G', chords: ['Gmaj7', 'Bbm7', 'Eb7', 'Gmaj7', 'Bm7', 'E7', 'Am7', 'D7'], key: key('G', 'major') },
    { name: 'Softly as in a Morning Sunrise in C minor', chords: ['Cm7', 'Cm7', 'Fm7', 'Fm7', 'Cm7', 'Cm7', 'Dm7b5', 'G7'], key: key('C', 'minor') },
    { name: 'Yesterdays in D minor', chords: ['Dm7', 'Bb7', 'Gm7', 'A7', 'Dm7', 'Bb7', 'Gm7', 'A7'], key: key('D', 'minor') },
    { name: 'Alone Together in D minor', chords: ['Dm7', 'Dm7', 'Dm7', 'Dm7', 'Gm7', 'Gm7', 'Dm7', 'Dm7'], key: key('D', 'minor') },
    { name: 'Night and Day in Eb', chords: ['Ebmaj7', 'Ebmaj7', 'Ebm7', 'Ab7', 'Ebmaj7', 'Cm7', 'Fm7', 'Bb7'], key: key('Eb', 'major') },
]
