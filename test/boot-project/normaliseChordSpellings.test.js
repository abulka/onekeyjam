import assert from 'assert'
import { emergencyRepairProject } from '@/lib/emergencyRepairProject.js'

function makeProjectWithSpellings() {
    return {
        name: 'spellings',
        chords: [{
            id: 1,
            name: 'E#m (user)',
            chord: 'E#m',
            chordNotes: ['E#3', 'G#3', 'B#3'],
            symbols: 'E#m, E#m/G#',
            bass: 'E#',
            bassNote: 'E#2',
        }],
        options: {},
        songs: { default: { ids: [1], favourites: [], blacklist: [] } },
    }
}

describe('emergencyRepairProject chord spellings', () => {
    it('folds a theoretical root into the twelve names', () => {
        const project = makeProjectWithSpellings()
        emergencyRepairProject(project)
        const chord = project.chords[0]
        assert.equal(chord.chord, 'Fm')
        assert.equal(chord.bass, 'F')
        assert.equal(chord.bassNote, 'F2')
        assert.deepEqual(chord.chordNotes, ['F3', 'G#3', 'C4'])
        assert.equal(chord.symbols, 'Fm,Fm/G#')
    })

    it('leaves a normal chord completely unchanged', () => {
        const project = {
            name: 'normal',
            chords: [{
                id: 1,
                chord: 'Cmaj7',
                chordNotes: ['C3', 'E3', 'G3', 'B3'],
                symbols: 'Cmaj7,Em#5/C',
                bass: 'C',
                bassNote: 'C2',
            }],
            options: {},
            songs: { default: { ids: [1], favourites: [], blacklist: [] } },
        }
        emergencyRepairProject(project)
        const chord = project.chords[0]
        assert.equal(chord.chord, 'Cmaj7')
        assert.equal(chord.bass, 'C')
        assert.equal(chord.bassNote, 'C2')
        assert.equal(chord.symbols, 'Cmaj7,Em#5/C')
    })
})
