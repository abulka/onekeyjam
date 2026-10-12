import assert from 'assert'
import {
    optionsWithCurrent,
} from '@/lib/chordPicker.js'
import { calcAllChordSymbols } from '@/lib/calcAllChordSymbols.js'
import { chordQualityFromSymbol, chordRootFromSymbol } from '@/lib/chordInspector.js'
import { noteOptions } from '@/lib/note-tools.js'

describe('combo options with the current value', () => {
    it('maps a stored augmented chord to its quality value', () => {
        assert.equal(chordQualityFromSymbol('E+add#9'), '+add#9')
        assert.equal(chordQualityFromSymbol('Cmaj7'), 'maj7')
        assert.equal(chordQualityFromSymbol('C'), 'M')
    })

    it('normalises a theoretical root instead of listing it', () => {
        // E# is F, so the root maps into the twelve spellings and the combo
        // never needs an E# option.
        assert.equal(chordRootFromSymbol('E#m'), 'F')
        assert.equal(noteOptions.some(option => option.value === 'E#'), false)
    })

    it('adds the current type when the short list hides it', () => {
        const options = calcAllChordSymbols(false, true)
        assert.equal(options.some(option => option.value === '+add#9'), false)
        const withCurrent = optionsWithCurrent(options, '+add#9')
        assert.deepEqual(withCurrent[0], { text: '+add#9', value: '+add#9' })
        assert.equal(withCurrent.length, options.length + 1)
    })

    it('leaves a value that is already listed alone', () => {
        const options = calcAllChordSymbols(false, true)
        const withCurrent = optionsWithCurrent(options, 'm7')
        assert.equal(withCurrent.length, options.length)
        assert.equal(optionsWithCurrent(noteOptions, 'C').length, noteOptions.length)
    })

    it('handles empty options and current values', () => {
        assert.deepEqual(optionsWithCurrent([], '+add#9'), [{ text: '+add#9', value: '+add#9' }])
        assert.deepEqual(optionsWithCurrent(null, ''), [])
    })
})
