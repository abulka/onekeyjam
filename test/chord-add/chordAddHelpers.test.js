import assert from 'assert'
import {
    PICKER_VOICING,
    CUSTOM_VOICING,
    normaliseBassForCompare,
    bassPitchClass,
    areVoicingsTheSame,
    buildVoicingChoices,
    pickVoicingToKeep,
    nameOptionsFor,
    voicingSourceLabel,
    isReplaceDisabled,
} from '@/lib/chordAddHelpers.js'

describe('chordAddHelpers voicing choices', () => {
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

    it('offers both voicings when the custom notes differ from the picker', () => {
        const choices = buildVoicingChoices({
            pickerSymbol: 'G#7no5',
            pickerNotes: pickerLow,
            pickerBass: 'G#2',
            customSymbol: 'G#7no5',
            customNotes: customHigh,
            customBass: 'C2',
        })
        assert.deepEqual(choices.map(choice => choice.id), [PICKER_VOICING, CUSTOM_VOICING])
        assert.deepEqual(choices[0].notes, pickerLow)
        assert.deepEqual(choices[1].notes, customHigh)
    })

    it('hides the custom voicing when it matches the picker voicing', () => {
        const choices = buildVoicingChoices({
            pickerSymbol: 'G#7no5',
            pickerNotes: pickerLow,
            pickerBass: 'G#2',
            customSymbol: 'G#7no5',
            customNotes: pickerLow,
            customBass: 'G#2',
        })
        assert.deepEqual(choices.map(choice => choice.id), [PICKER_VOICING])
    })

    it('hides the custom voicing when it has no notes', () => {
        const choices = buildVoicingChoices({
            pickerSymbol: 'C',
            pickerNotes: ['C3', 'E3', 'G3'],
            pickerBass: 'C2',
            customSymbol: 'C',
            customNotes: [],
            customBass: '',
        })
        assert.deepEqual(choices.map(choice => choice.id), [PICKER_VOICING])
    })

    it('keeps the picked voicing across rebuilds', () => {
        const choices = [{ id: PICKER_VOICING }, { id: CUSTOM_VOICING }]
        assert.equal(pickVoicingToKeep(choices, CUSTOM_VOICING), CUSTOM_VOICING)
        assert.equal(pickVoicingToKeep(choices, PICKER_VOICING), PICKER_VOICING)
        assert.equal(pickVoicingToKeep(choices, 'gone'), CUSTOM_VOICING)
        assert.equal(pickVoicingToKeep([], PICKER_VOICING), '')
    })

    it('prefers the custom voicing by default when it exists', () => {
        const choices = [{ id: PICKER_VOICING }, { id: CUSTOM_VOICING }]
        assert.equal(pickVoicingToKeep(choices, ''), CUSTOM_VOICING)
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

    it('labels the custom voicing source', () => {
        assert.equal(voicingSourceLabel('grid'), 'from grid chord')
        assert.equal(voicingSourceLabel('midi'), 'from MIDI')
        assert.equal(voicingSourceLabel('typed'), 'typed')
        assert.equal(voicingSourceLabel(''), '')
    })

    it('enables Replace for the picker voicing after loading a custom grid chord', () => {
        const choice = {
            id: PICKER_VOICING, symbol: 'G#7no5', notes: pickerLow, bass: 'G#2',
        }
        assert.equal(isReplaceDisabled({
            choice,
            storedNotes: customHigh,
            storedBass: '',
        }), false)
    })

    it('disables Replace when the picked voicing already matches the grid', () => {
        const choice = {
            id: CUSTOM_VOICING, symbol: 'G#7no5', notes: customHigh, bass: '',
        }
        assert.equal(isReplaceDisabled({
            choice,
            storedNotes: customHigh,
            storedBass: '',
        }), true)
    })

    it('enables Replace when only the bass would change', () => {
        const choice = {
            id: CUSTOM_VOICING, symbol: 'G#7no5', notes: customHigh, bass: 'C2',
        }
        assert.equal(isReplaceDisabled({
            choice,
            storedNotes: customHigh,
            storedBass: 'G#',
        }), false)
    })

    it('disables Replace with no picked voicing', () => {
        assert.equal(isReplaceDisabled({
            choice: null,
            storedNotes: pickerLow,
            storedBass: '',
        }), true)
    })
})
