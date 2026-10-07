import assert from 'assert'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

// Vitest runs with the project root as the working directory.
const root = process.cwd()
const libraries = ['classic', 'progressions', 'rock']

function libraryFiles(library) {
    const dir = join(root, 'public', 'projects', library)
    return readdirSync(dir)
        .filter((file) => file.endsWith('.json') && !file.endsWith('-manifest.json'))
        .map((file) => join(dir, file))
}

function loadProject(path) {
    return JSON.parse(readFileSync(path, 'utf8'))
}

describe('generated demo loops', () => {
    it('every song ships a non-empty loop with a positive length', () => {
        let checked = 0
        for (const library of libraries) {
            for (const path of libraryFiles(library)) {
                const project = loadProject(path)
                const entry = project.chordSequences && project.chordSequences.default
                assert.ok(entry && typeof entry.mml === 'string' && entry.mml.length > 0, `${path} has pattern notes`)
                assert.ok(entry.markend > entry.markstart, `${path} has a positive loop`)
                // Half bars are 8 ticks, so every loop end lands on an 8 tick grid.
                assert.equal(entry.markend % 8, 0, `${path} loop end fits the bar grid`)
                checked++
            }
        }
        assert.ok(checked > 100, `checked ${checked} songs`)
    })

    it('repeats share grid rows instead of taking new ones', () => {
        const blueMoon = loadProject(join(root, 'public', 'projects', 'classic', 'Blue Moon in C.json'))
        // The excerpt chords come first, so its pattern reuses the first four rows.
        assert.deepEqual(
            blueMoon.chords.map((chord) => chord.chord).slice(0, 4),
            ['Cmaj7', 'Am7', 'Dm7', 'G7'],
        )
        assert.equal(blueMoon.chordSequences.default.mml, 't96o4c1d1e1f1c1d1e1f1')
        assert.equal(blueMoon.chordSequences.default.tempo, 96)
        // The full AABA form is longer and adds the bridge chords to the grid.
        assert.equal(blueMoon.chordSequences.full.markend, 32 * 16)
        assert.ok(blueMoon.chords.length > 4)
    })

    it('the blues runs the full twelve bar quick change', () => {
        const blues = loadProject(join(root, 'public', 'projects', 'progressions', '12-bar blues in C.json'))
        assert.deepEqual(
            blues.chords.map((chord) => chord.chord),
            ['C7', 'F7', 'G7'],
        )
        assert.equal(blues.chordSequences.default.markend, 12 * 16)
        assert.equal(blues.chordSequences.default.tempo, 96)
    })

    it('Stella splits the opening bars in half', () => {
        const stella = loadProject(join(root, 'public', 'projects', 'classic', 'Stella by Starlight in Bb.json'))
        assert.equal(stella.chordSequences.default.mml, 't84o4c2d2e2f2g2a2b2o5c2')
        assert.equal(stella.chordSequences.default.markend, 4 * 16)
        assert.equal(stella.chordSequences.default.tempo, 84)
    })

    it('modal vamps hold for whole sections', () => {
        const impressions = loadProject(join(root, 'public', 'projects', 'classic', 'Impressions in D minor.json'))
        assert.deepEqual(
            impressions.chords.map((chord) => chord.chord),
            ['Dm7', 'Ebm7'],
        )
        assert.equal(impressions.chordSequences.default.mml, 't150o4c1&c1&c1&c1d1&d1&d1&d1')
        assert.equal(impressions.chordSequences.default.tempo, 150)
    })

    it('standards ship an excerpt, a middle section and a full form', () => {
        const allThings = loadProject(join(root, 'public', 'projects', 'classic', 'All the Things You Are in Ab.json'))
        const sequences = allThings.chordSequences
        assert.equal(sequences.default.markend, 8 * 16)
        assert.equal(sequences.medium.markend, 16 * 16)
        assert.equal(sequences.full.markend, 36 * 16)
        assert.ok(sequences.full.label.startsWith('Full form'))
        // The full form adds the bridge chords to the grid without repeating rows.
        assert.ok(allThings.chords.length > 8)
    })

    it('every sequence has a label and a tempo in range', () => {
        for (const library of libraries) {
            for (const path of libraryFiles(library)) {
                const project = loadProject(path)
                for (const [name, entry] of Object.entries(project.chordSequences)) {
                    assert.ok(typeof entry.label === 'string' && entry.label.length > 0, `${path} ${name} label`)
                    assert.ok(Number.isFinite(entry.tempo) && entry.tempo >= 40 && entry.tempo <= 240, `${path} ${name} tempo ${entry.tempo}`)
                    assert.ok(entry.markend > entry.markstart, `${path} ${name} positive loop`)
                }
            }
        }
    })

    it('every generated tempo sits inside the supported BPM range', () => {
        for (const library of libraries) {
            for (const path of libraryFiles(library)) {
                const project = loadProject(path)
                const tempo = project.chordSequences.default.tempo
                assert.ok(Number.isFinite(tempo) && tempo >= 40 && tempo <= 240, `${path} tempo ${tempo}`)
            }
        }
    })
})
