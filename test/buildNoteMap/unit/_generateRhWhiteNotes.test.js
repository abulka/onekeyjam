import assert from 'assert';
import { _generateWhiteJamTriggerNotes, maxRealNoteName } from '@/lib/midi/jam-mapping-to-allowed.js'

describe('_generateWhiteJamTriggerNotes - empty mappings', () => {


    it('generate from C2', () => {
        const result = _generateWhiteJamTriggerNotes(['C2'])
        const keys = Object.keys(result)
        assert(keys.includes('C2'))
        assert(keys.includes('D2'))
        assert(keys.includes('E2'))
        // etc
    });

    it('notes lower than C2 should not be there', () => {
        const result = _generateWhiteJamTriggerNotes(['C2'])
        const keys = Object.keys(result)
        assert(!keys.includes('B1'))
        assert(!keys.includes('A1'))
    });

    it('nothing higher or equal to maxRealNoteName', () => {
        const result = _generateWhiteJamTriggerNotes(['C2'])
        const keys = Object.keys(result)
        assert(!keys.includes(maxRealNoteName))
    });

    it('all values are empty', () => {
        const result = _generateWhiteJamTriggerNotes(['C2'])
        const values = Object.values(result)
        const nonEmptyValues = values.filter(v => v != '')
        assert.equal(nonEmptyValues.length, 0)
    });

    it('generate from C4', () => {
        const result = _generateWhiteJamTriggerNotes(['C4'])
        const keys = Object.keys(result)
        assert(keys.includes('C4'))
        assert(keys.includes('D4'))
        assert(keys.includes('E4'))
        // etc
    });

    it('notes lower than C4 should not be there', () => {
        const result = _generateWhiteJamTriggerNotes(['C4'])
        const keys = Object.keys(result)
        assert(!keys.includes('B3'))
        assert(!keys.includes('A3'))
    });




});

