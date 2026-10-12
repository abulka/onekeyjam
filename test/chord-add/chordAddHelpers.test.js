import assert from 'assert'
import {
    normaliseBassForCompare,
    bassPitchClass,
    areVoicingsTheSame,
    nameOptionsFor,
    voicingSourceLabel,
} from '@/lib/chordAddHelpers.js'

describe('chordAddHelpers', () => {
    const pickerLow = ['G#3', 'C4', 'F#4']
    const customHigh = ['F#4', 'C5']

    it('strips the octave when reducing a bass to a pitch class', () => {
        assert.equal(bassPitchClass('C2'), 'C')
        assert.equal(bassPitchClass('G#'), 'G#')
        assert.equal(bassPitchClass(''), '')
        assert.equal(bassPitchClass(undefined), '')
    })

    it('normalises empty bass values', () => {
        assert.equal(normaliseBassForCompare(undefined), '')
        assert.equal(normaliseBassForCompare(null), '')
        assert.equal(normaliseBassForCompare(''), '')
        assert.equal(normaliseBassForCompare('G#'), 'G#')
    })

    it('treats different octaves as different voicings', () => {
        assert.equal(areVoicingsTheSame(pickerLow, customHigh, '', ''), false)
        assert.equal(areVoicingsTheSame(customHigh, customHigh, '', ''), true)
    })

    it('ignores the octave when comparing basses', () => {
        assert.equal(areVoicingsTheSame(customHigh, customHigh, 'C2', 'C'), true)
    })

    it('treats a bass-only change as a different voicing', () => {
        assert.equal(areVoicingsTheSame(customHigh, customHigh, 'G#', 'C'), false)
        assert.equal(areVoicingsTheSame(customHigh, customHigh, 'G#', 'G#'), true)
    })

    it('lists detected names with the current name first', () => {
        assert.deepEqual(
            nameOptionsFor({ symbols: ['G#7no5', 'G#7'], fallbackSymbol: 'G#7no5' }),
            ['G#7no5', 'G#7'],
        )
        assert.deepEqual(
            nameOptionsFor({ symbols: [], fallbackSymbol: 'G#7no5' }),
            ['G#7no5'],
        )
        assert.deepEqual(
            nameOptionsFor({ symbols: ['G#7', 'G#7'], fallbackSymbol: 'G#7' }),
            ['G#7'],
        )
    })

    it('labels the voicing source', () => {
        assert.equal(voicingSourceLabel('grid'), 'from grid chord')
        assert.equal(voicingSourceLabel('midi'), 'from MIDI')
        assert.equal(voicingSourceLabel('typed'), 'typed')
        assert.equal(voicingSourceLabel(''), '')
    })
})
