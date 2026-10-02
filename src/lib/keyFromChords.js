import * as Tonal from '@tonaljs/tonal';
import { stringify } from './prettyjson.js'

// TODO add bass to all algorithms as an extra note - not necessarily as tonic though

const debug = 0
const allNotes = [...Array(12).keys()] // intervals for all possible notes where 0 is C
const wrapIndex = (index) => index < 12 ? index : index - 12  // just a helper function to handle looping all notes array

const chordNotes = []  // intervals of the notes of all the chords we are processing e.g. 0 is C
let chordNoteWeights = {}  // how many times a chord note appears in any of the chords that were fed in
// TODO: addChordNote is not called yet - kept for the unfinished key-detection
// algorithm that would build up chordNotes from notes.
// eslint-disable-next-line no-unused-vars
const addChordNote = note => chordNotes.push(Tonal.Note.get(note).chroma)  // add the chroma of the note (interval from C) to the chordNotes array

const intervalToNote = interval => Tonal.Note.transpose("C", Tonal.Interval.fromSemitones(interval))  // convert an interval to a note e.g. 0 -> 'C'
const intervalsAsNotes = (intervals) => intervals.map(interval => intervalToNote(interval))
const adjustIntervalsToBeRelativeToC = (intervals, tonicInterval) => intervals.map(interval => wrapIndex(interval + tonicInterval))
const dumpIntervals = (intervals) => intervals.map(interval => `${interval} ${intervalToNote(interval)}`)
const dumpAsNotes = (intervals) => intervalsAsNotes(intervals).join(' ')
const dumpChordNotes = () => dumpIntervals(chordNotes)
function dumpChordNoteWeights() {
    const result = []
    for (let interval in chordNoteWeights) {
        result.push({ key: `${interval} ${intervalToNote(interval)}`, weight: chordNoteWeights[interval] })
    }
    return result.sort((a, b) => b.weight - a.weight)
}
function dumpChordSymbolsForTensionJar(chordSymbols) {
    let result = ""
    chordSymbols.forEach(function (symbol) {
        result += Tonal.Chord.get(symbol).notes.join(' ') + '\n'
    });
    return result
}
function dumpNotesForTensionJar(chords) {
    let result = ""
    chords.forEach(function (chord) {
        result += chord.join(' ') + '\n'
    });
    return result
}

const intervalsToSemitones = arr => arr.map(interval => Tonal.Interval.get(interval).semitones)
const scales = Tonal.ScaleType.all().map(function (scaleTypeObj) {
    if (scaleTypeObj.name == 'major' || scaleTypeObj.name == 'aeolian')
        return {
            name: scaleTypeObj.name == 'aeolian' ? 'minor' : scaleTypeObj.name,
            intervals: intervalsToSemitones(scaleTypeObj.intervals)
        }
}).filter(o => o != undefined)

function _addIntervals(intervals) {
    for (let interval of intervals) {
        chordNoteWeights[interval] = chordNoteWeights[interval] ? chordNoteWeights[interval] + 1 : 1;
        if (!chordNotes.includes(interval))
            chordNotes.push(interval);
    }
}

function addChordNotes(chordString) {
    const chordObj = Tonal.Chord.get(chordString)
    if (chordObj.empty) {
        console.warn('Tonal could not find chord', chordString)
        return
    }
    const tonicInterval = Tonal.Note.get(chordObj.tonic).chroma
    let intervals = intervalsToSemitones(chordObj.intervals)
    intervals = adjustIntervalsToBeRelativeToC(intervals, tonicInterval);
    _addIntervals(intervals);
}
function addPlainNotes(chord) {  // chord is array of string notes
    let intervals = chord.map(n => Tonal.Note.get(n).chroma)  // already relative to C, by definition of chroma
    _addIntervals(intervals);
}

function compareScalesAndNotes(options = {}) {
    let stats = []
    for (let scaleTonicInterval of allNotes) {
        // We ony need the two scales, major and natural minor (aeolian) with their intervals 
        for (let scale of scales) {
            let score = 0;
            const chordNotesHit = []  // for tracking penalties for missing notes
            const tonicNote = intervalToNote(scaleTonicInterval)
            const fullScaleName = tonicNote + ' ' + scale.name
            if (debug >= 3) console.log(fullScaleName, scale.intervals, '\n', intervalsAsNotes(scale.intervals).join(' '))
            for (let scaleInterval of scale.intervals) {
                const si = wrapIndex(scaleTonicInterval + scaleInterval)
                const hit = chordNotes.includes(si)  // is scale note interval in chordnotes intervals?
                score += hit ? (options.useHitWeight ? chordNoteWeights[si] : 1) : 0
                if (hit)
                    chordNotesHit.push(si)
                if (debug >= 3) console.log('is', si, intervalToNote(si), 'in chordNotes', hit, hit ? `hitWeight ${chordNoteWeights[si]}` : '')
            }
            const chordNotesMissed = chordNotes.filter(i => !chordNotesHit.includes(i))  // notes in chordnotes that are not in the scale (p.s. not interested in notes of scale that were not in chordnotes)
            if (options.usePenalty)
                score -= chordNotesMissed.length
            if (debug >= 2) console.log('  scale', fullScaleName, 'scored', score, '\n    ', 'chordNotesHit', chordNotesHit, dumpAsNotes(chordNotesHit), '\n    ', 'chord notes missed', chordNotesMissed, dumpAsNotes(chordNotesMissed))
            stats.push({ scaleName: fullScaleName, score: score })
        }
    }

    stats.sort(function (a, b) {
        return b.score - a.score
    })
    if (debug >= 1) {
        console.log('---------------------')
        for (let stat of stats)  // 5. debug
            console.log(stat.scaleName, stat.score)
    }

    let result = []
    if (stats.length > 0 && stats[0].score > 0) {
        const topScore = stats[0].score
        result = stats.map(stat => stat.score == topScore ? stat.scaleName : undefined)
            .filter(o => o != undefined)
    }
    if (debug >= 1) console.log(result)
    return result
}

function process(options) {
    chordNotes.sort(); // keep it sorted, in place
    if (debug >= 2)
        console.log('chord notes', chordNotes, '\n', dumpChordNotes(), '\n', dumpAsNotes(chordNotes), '\n', stringify(dumpChordNoteWeights()));
    // options = { useHitWeight: true, usePenalty: true }  // force
    return compareScalesAndNotes(options);
}

function init() {
    chordNotes.length = 0; // clear array
    chordNoteWeights = {};
}

// ╔═╗╔═╗╦
// ╠═╣╠═╝║
// ╩ ╩╩  ╩

export function keyFromChords(chordSymbols, options) {
    init();
    if (debug >= 1) console.log(dumpChordSymbolsForTensionJar(chordSymbols))
    chordSymbols.forEach(function (symbol) {
        addChordNotes(symbol);
    });
    return process(options);
}

export function keyFromNotes(chordsAsNotes, options) {
    // chordsAsNotes is array of arrays of notes e.g. [['C', 'E', 'G'], ['C', 'E', 'G']]
    init();
    if (debug >= 1) console.log(dumpNotesForTensionJar(chordsAsNotes))
    chordsAsNotes.forEach(function (chord) {
        addPlainNotes(chord);
    });
    return process(options);
}



// test
// addChordNote('C')
// addChordNote('B')
// console.log(allNotes.map(interval => JSON.stringify([interval, intervalToNote(interval)])))
// getNotesFromChord('CM')
// getNotesFromChord('Dm')
// console.log('chordNotes', JSON.stringify(chordNotes))
// console.log(dumpChordNotes())
// console.log(JSON.stringify(scales))
// console.log(0, convertIndex(0))
// console.log(12, convertIndex(12))
// console.log(13, convertIndex(13))
// console.log('result', compareScalesAndNotes())
// console.log(keyFromChords(['CM', 'Dm']))
// console.log(keyFromChords(['Eb', 'Fm', 'Gm'], { useHitWeight: false, usePenalty: true }))  // ['C minor', 'Eb major']
// console.log('Bb13sus', Tonal.Chord.get('Bb13sus').notes.join(' ')) // Bb Eb F Ab C G
// console.log('Bb13sus', Tonal.Chord.get('Bb13sus').intervals.join(' ')) // 1P 4P 5P 7m 9M 13M
// function play() {
//     const intC = Tonal.Note.get('C').chroma  // 0
//     const intE = Tonal.Note.get('E').chroma  // 4
//     const intG = Tonal.Note.get('G').chroma  // 7
//     function adjuster(symbol) {
//         let chordObj = Tonal.Chord.get(symbol);
//         let tonicInterval = Tonal.Note.get(chordObj.tonic).chroma;
//         let intervals = intervalsToSemitones(chordObj.intervals);
//         let adjusted = adjustIntervalsToBeRelativeToC(intervals, tonicInterval)
//         console.log(chordObj.name, 'intervals', intervals, 'tonicInterval', tonicInterval, 'adjusted', adjusted)
//         console.log(dumpAsNotes(adjusted));
//     }
//     adjuster('CM');
//     adjuster('Dm');
// }
// play()
// 
// function play2() {
//     let result = keyFromNotes([['C', 'E', 'G'], ['D', 'F', 'A'], ['C', 'E', 'G#']]);
//     console.log(dumpChordNotes());
//     console.log(dumpAsNotes(chordNotes));
//     console.log(stringify(dumpChordNoteWeights()));
//     console.log('result', result);
// }
// play2()
