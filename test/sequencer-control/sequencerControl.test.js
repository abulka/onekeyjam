import assert from 'assert'
import { globals } from '@/lib/globals.js'
import {
    sequencerControl,
    registerSequencer,
    unregisterSequencer,
    sequenceOptions,
    resolveSequenceName,
} from '@/lib/sequencer-control.js'

function withSequences(map) {
    const previous = globals.project
    globals.project = {
        name: 'test',
        chords: [],
        songs: { default: { ids: [], favourites: [], blacklist: [] } },
        chordSequences: map,
    }
    return () => { globals.project = previous }
}

describe('sequenceOptions', () => {
    it('lists named sequences with their labels', () => {
        const restore = withSequences({
            default: { mml: '', tempo: 120, label: 'Excerpt (8 bars)' },
            full: { mml: '', tempo: 96, label: 'Full form (32 bars)' },
        })
        try {
            assert.deepEqual(sequenceOptions(), [
                { name: 'default', label: 'Excerpt (8 bars)' },
                { name: 'full', label: 'Full form (32 bars)' },
            ])
        }
        finally {
            restore()
        }
    })

    it('falls back to the key when there is no label', () => {
        const restore = withSequences({ default: { mml: '', tempo: 120 } })
        try {
            assert.deepEqual(sequenceOptions(), [{ name: 'default', label: 'default' }])
        }
        finally {
            restore()
        }
    })
})

describe('resolveSequenceName', () => {
    it('keeps a remembered name that still exists', () => {
        const restore = withSequences({ default: {}, full: {} })
        try {
            assert.equal(resolveSequenceName('full'), 'full')
        }
        finally {
            restore()
        }
    })

    it('falls back to default, then the first available', () => {
        const restore = withSequences({ excerpt: {}, full: {} })
        try {
            assert.equal(resolveSequenceName('missing'), 'excerpt')
        }
        finally {
            restore()
        }
        const restoreDefault = withSequences({ full: {}, default: {} })
        try {
            assert.equal(resolveSequenceName('missing'), 'default')
        }
        finally {
            restoreDefault()
        }
    })

    it('returns default for a project with no sequences', () => {
        const restore = withSequences(undefined)
        try {
            assert.equal(resolveSequenceName(undefined), 'default')
        }
        finally {
            restore()
        }
    })
})

describe('sequencerControl registration', () => {
    afterEach(() => unregisterSequencer())

    it('routes actions to the registered sequencer', () => {
        const calls = []
        registerSequencer({
            toggle: () => calls.push('toggle'),
            play: () => calls.push('play'),
            stop: () => calls.push('stop'),
            selectSequence: (name) => calls.push(`select:${name}`),
        })
        assert.equal(sequencerControl.available, true)
        sequencerControl.toggle()
        sequencerControl.selectSequence('full')
        assert.deepEqual(calls, ['toggle', 'select:full'])
    })

    it('does nothing and reports unavailable after unregister', () => {
        registerSequencer({ toggle: () => { throw new Error('should not run') }, play: () => {}, stop: () => {}, selectSequence: () => {} })
        unregisterSequencer()
        assert.equal(sequencerControl.available, false)
        sequencerControl.toggle()
    })

    it('selects a sequence directly when no component is mounted', () => {
        const restore = withSequences({ default: { mml: 't120o4c1', tempo: 120 }, full: { mml: 't120o4c1d1', tempo: 96 } })
        const previousName = globals.currentChordSequenceName
        try {
            unregisterSequencer()
            globals.currentChordSequenceName = 'default'
            sequencerControl.selectSequence('full')
            assert.equal(globals.currentChordSequenceName, 'full')
            assert.equal(sequencerControl.hasNotes, true)
        }
        finally {
            globals.currentChordSequenceName = previousName
            restore()
        }
    })
})
