// @ts-check
import * as Tonal from '@tonaljs/tonal'

/*
 * Definitions for the generated "progressions" project library. Each entry is
 * a generic practice progression; the generator turns it into a project JSON
 * with voicings and engine-chosen scales. Progressions are chords only, no
 * melodies.
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

/** @param {string} tonic @param {string} type */
function key(tonic, type) {
    return { tonic, type, source: 'user' }
}

/** @type {Array<{name: string, chords: string[], key?: {tonic:string, type:string, source:string}, colour?: string}>} */
export const DEFINITIONS = [
    // ii-V-I in every major key
    ...MAJOR_KEYS.map(k => ({ name: `ii-V-I in ${k} major`, chords: majorTwoFiveOne(k), key: key(k, 'major') })),
    // ii-V-i in every minor key
    ...MINOR_KEYS.map(k => ({ name: `ii-V-i in ${k} minor`, chords: minorTwoFiveOne(k), key: key(k, 'minor') })),
    // I-vi-ii-V turnarounds
    ...['C', 'F', 'Bb', 'Eb', 'G', 'D'].map(k => {
        const s = majorNotes(k)
        return { name: `I-vi-ii-V turnaround in ${k}`, chords: [`${s[0]}maj7`, `${s[5]}m7`, `${s[1]}m7`, `${s[4]}7`], key: key(k, 'major') }
    }),
    // 50s doo-wop I-vi-IV-V
    ...['C', 'G', 'F', 'D'].map(k => {
        const s = majorNotes(k)
        return { name: `50s doo-wop in ${k}`, chords: [`${s[0]}maj7`, `${s[5]}m7`, `${s[3]}maj7`, `${s[4]}7`], key: key(k, 'major') }
    }),
    // 12-bar blues quick change (first eight bars)
    ...['C', 'F', 'Bb', 'Eb', 'G'].map(k => {
        const four = majorNotes(k)[3]
        return { name: `12-bar blues in ${k}`, chords: [`${k}7`, `${four}7`, `${k}7`, `${k}7`, `${four}7`, `${four}7`, `${k}7`, `${k}7`], key: key(k, 'major') }
    }),
    // Classic tutorials
    { name: 'Andalusian cadence in A minor', chords: ['Am', 'G', 'F', 'E7'], key: key('A', 'minor') },
    { name: 'Andalusian cadence in D minor', chords: ['Dm', 'C', 'Bb', 'A7'], key: key('D', 'minor') },
    { name: 'Pachelbel canon in D', chords: ['Dmaj7', 'A7', 'Bm7', 'F#m7', 'Gmaj7', 'Dmaj7', 'Gmaj7', 'A7'], key: key('D', 'major') },
    { name: 'Pachelbel canon in C', chords: ['Cmaj7', 'G7', 'Am7', 'Em7', 'Fmaj7', 'Cmaj7', 'Fmaj7', 'G7'], key: key('C', 'major') },
    { name: 'Circle of fifths in C', chords: ['Cmaj7', 'Am7', 'Dm7', 'G7', 'Em7', 'Am7', 'Dm7', 'G7'], key: key('C', 'major') },
    { name: 'Secondary dominants in C', chords: ['Cmaj7', 'A7', 'Dm7', 'B7', 'Em7', 'E7', 'Am7', 'G7'], key: key('C', 'major') },
    { name: 'Minor ii-V-i with tritone sub in C minor', chords: ['Dm7b5', 'Db7', 'Cm7', 'Dm7b5', 'G7b9', 'Cm7'], key: key('C', 'minor') },
    // So What is a D dorian modal tune, so the key is dorian, not minor.
    { name: 'Modal So What in D minor', chords: ['Dm7', 'Dm7', 'Ebm7', 'Ebm7', 'Dm7', 'Dm7'], key: key('D', 'dorian') },
]
