// @ts-check
import * as Tonal from '@tonaljs/tonal'

/*
 * Definitions for the generated "classic" project library. Each entry is a
 * chord progression; the generator turns it into a project JSON with voicings
 * and engine-chosen scales. Progressions are chords only, no melodies.
 */

/** @param {string} key */
function majorNotes(key) {
    return Tonal.Scale.get(`${key} major`).notes
}

/** @param {string} key */
function minorNotes(key) {
    return Tonal.Scale.get(`${key} aeolian`).notes
}

export const MAJOR_KEYS = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'F', 'Bb', 'Eb', 'Ab', 'Db']
export const MINOR_KEYS = ['A', 'E', 'B', 'F#', 'C#', 'G#', 'D', 'G', 'C', 'F', 'Bb', 'Eb']

/** @param {string} key */
function majorTwoFiveOne(key) {
    const s = majorNotes(key)
    return [`${s[1]}m7`, `${s[4]}7`, `${s[0]}maj7`]
}

/** @param {string} key */
function minorTwoFiveOne(key) {
    const s = minorNotes(key)
    return [`${s[1]}m7b5`, `${s[4]}7b9`, `${s[0]}m7`]
}

/** @type {Array<{name: string, chords: string[]}>} */
export const DEFINITIONS = [
    // ii-V-I in every major key
    ...MAJOR_KEYS.map(key => ({ name: `ii-V-I in ${key} major`, chords: majorTwoFiveOne(key) })),
    // ii-V-i in every minor key
    ...MINOR_KEYS.map(key => ({ name: `ii-V-i in ${key} minor`, chords: minorTwoFiveOne(key) })),
    // I-vi-ii-V turnarounds
    ...['C', 'F', 'Bb', 'Eb', 'G', 'D'].map(key => {
        const s = majorNotes(key)
        return { name: `I-vi-ii-V turnaround in ${key}`, chords: [`${s[0]}maj7`, `${s[5]}m7`, `${s[1]}m7`, `${s[4]}7`] }
    }),
    // 50s doo-wop I-vi-IV-V
    ...['C', 'G', 'F', 'D'].map(key => {
        const s = majorNotes(key)
        return { name: `50s doo-wop in ${key}`, chords: [`${s[0]}maj7`, `${s[5]}m7`, `${s[3]}maj7`, `${s[4]}7`] }
    }),
    // 12-bar blues quick change (first eight bars)
    ...['C', 'F', 'Bb', 'Eb', 'G'].map(key => {
        const four = majorNotes(key)[3]
        return { name: `12-bar blues in ${key}`, chords: [`${key}7`, `${four}7`, `${key}7`, `${key}7`, `${four}7`, `${four}7`, `${key}7`, `${key}7`] }
    }),
    // Classic tutorials
    { name: 'Andalusian cadence in A minor', chords: ['Am', 'G', 'F', 'E7'] },
    { name: 'Andalusian cadence in D minor', chords: ['Dm', 'C', 'Bb', 'A7'] },
    { name: 'Pachelbel canon in D', chords: ['Dmaj7', 'A7', 'Bm7', 'F#m7', 'Gmaj7', 'Dmaj7', 'Gmaj7', 'A7'] },
    { name: 'Pachelbel canon in C', chords: ['Cmaj7', 'G7', 'Am7', 'Em7', 'Fmaj7', 'Cmaj7', 'Fmaj7', 'G7'] },
    { name: 'Circle of fifths in C', chords: ['Cmaj7', 'Am7', 'Dm7', 'G7', 'Em7', 'Am7', 'Dm7', 'G7'] },
    { name: 'Secondary dominants in C', chords: ['Cmaj7', 'A7', 'Dm7', 'B7', 'Em7', 'E7', 'Am7', 'G7'] },
    { name: 'Minor ii-V-i with tritone sub in C minor', chords: ['Dm7b5', 'Db7', 'Cm7', 'Dm7b5', 'G7b9', 'Cm7'] },
    { name: 'Modal So What in D minor', chords: ['Dm7', 'Dm7', 'Ebm7', 'Ebm7', 'Dm7', 'Dm7'] },
    // Jazz standard changes (chords only)
    { name: 'Autumn Leaves in G minor', chords: ['Cm7', 'F7', 'Bbmaj7', 'Ebmaj7', 'Am7b5', 'D7', 'Gm7', 'Gm7'] },
    { name: 'Fly Me to the Moon in C', chords: ['Am7', 'Dm7', 'G7', 'Cmaj7', 'Fmaj7', 'Bm7b5', 'E7', 'Am7'] },
    { name: 'Blue Bossa in C minor', chords: ['Cm7', 'Fm7', 'Dm7b5', 'G7', 'Cm7', 'Ebm7', 'Ab7', 'Dbmaj7'] },
    { name: 'Take the A Train in C', chords: ['Cmaj7', 'D7', 'Dm7', 'G7', 'Cmaj7', 'D7', 'Dm7', 'G7'] },
    { name: 'All the Things You Are in Ab', chords: ['Fm7', 'Bbm7', 'Eb7', 'Abmaj7', 'Dbmaj7', 'Dm7', 'G7', 'Cmaj7'] },
    { name: 'Summertime in A minor', chords: ['Am7', 'E7', 'Am7', 'Am7', 'Dm7', 'Am7', 'E7', 'Am7'] },
    { name: 'Rhythm Changes in Bb', chords: ['Bbmaj7', 'G7', 'Cm7', 'F7', 'Bbmaj7', 'G7', 'Cm7', 'F7'] },
    { name: 'Blues for Alice in F', chords: ['Fmaj7', 'Em7b5', 'A7', 'Dm7', 'G7', 'Cm7', 'F7', 'Bbmaj7'] },
    { name: 'There Will Never Be Another You in Eb', chords: ['Ebmaj7', 'Dm7b5', 'G7', 'Cm7', 'F7', 'Fm7', 'Bb7', 'Ebmaj7'] },
    { name: 'Stella by Starlight in Bb', chords: ['Em7b5', 'A7b9', 'Cm7', 'F7', 'Fm7', 'Bb7', 'Ebmaj7', 'Ab7'] },
    { name: 'Have You Met Miss Jones in F', chords: ['Fmaj7', 'Fm7', 'Bb7', 'Ebmaj7', 'Em7b5', 'A7', 'Dm7', 'G7'] },
    { name: 'Days of Wine and Roses in F', chords: ['Fmaj7', 'Ebmaj7', 'Dm7', 'G7', 'Em7b5', 'A7', 'Dm7', 'G7'] },
    { name: 'Blue Moon in C', chords: ['Cmaj7', 'Am7', 'Dm7', 'G7', 'Cmaj7', 'Am7', 'Dm7', 'G7'] },
]
