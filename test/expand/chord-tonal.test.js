import assert from 'assert';
import * as Tonal from "@tonaljs/tonal";
import { scaleObjToNotes } from '../../src/lib/scaleToNotes';

describe('Tonaljs Chord Symbol lookup', () => {

    it('CM chord', () => {
        const result = Tonal.Chord.get('CM')
        const expected = ['C', 'E', 'G']
        assert(!result.empty)
        assert.deepEqual(expected, scaleObjToNotes(result));
    });

    it('CM7 chord', () => {
        const result = Tonal.Chord.get('CM7')
        const expected = ['C', 'E', 'G', 'B']
        assert(!result.empty)
        assert.deepEqual(expected, scaleObjToNotes(result));
    });

    it('C9 chord', () => {
        const result = Tonal.Chord.get('C9')
        const expected = ['C', 'E', 'G', 'Bb', 'D']
        assert(!result.empty)
        assert.deepEqual(expected, scaleObjToNotes(result));
    });

    it('C9#11 chord', () => {
        const result = Tonal.Chord.get('C9#11')
        const expected = ['C', 'E', 'G', 'Bb', 'D', 'F#']
        assert(!result.empty)
        assert.deepEqual(expected, scaleObjToNotes(result));
    });

    it('C69#11 chord - have to add a space', () => {  
        // bug in Tonal, have to add a space - known issue https://github.com/tonaljs/tonal/issues/155
        const result = Tonal.Chord.get('C 69#11')
        const expected = ['C', 'E', 'G', 'A', 'D', 'F#']
        assert(!result.empty)
        assert.deepEqual(expected, scaleObjToNotes(result));
    });

    it('Cmaj7#5 - Major with #5', () => {
        const result = Tonal.Chord.get('Cmaj7#5')
        const expected = ['C', 'E', 'G#', 'B']
        assert(!result.empty)
        assert.deepEqual(expected, scaleObjToNotes(result));
    });

    it('Cmaj9#5 - Major with #5', () => {
        const result = Tonal.Chord.get('Cmaj9#5')
        const expected = ['C', 'E', 'G#', 'B', 'D']
        assert(!result.empty)
        assert.deepEqual(expected, scaleObjToNotes(result));
    });

    it.skip('CM/Eb', () => {
        /*
        Important: In Tonal, currently chord with roots are NOT allowed (will be
        implemented in next version):
        https://github.com/tonaljs/tonal/tree/main/packages/chord so whilst it
        can detect and create chord symbols with bass slashes, it can't create
        chord objects from such symbols.

        Uncomment this test once Tonal supports bass slashes.
        */
        const result = Tonal.Chord.get('CM/Eb')
        const expected = ['C', 'E', 'G#', 'B', 'D']
        assert(!result.empty)
        assert.deepEqual(expected, scaleObjToNotes(result));
    });

});
