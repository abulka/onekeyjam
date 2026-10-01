import assert from 'assert';
import { includesArray1, includesArray2, includesArray3 } from "../../src/lib/array-tools.js";

describe('includesArray vers 1 2 3', () => {

    it('test1 - all versions work the same', () => {
        const chords = [
            ['c', 'd', 'e'],
            ['d', 'e', 'f'],
        ]
        const arr = ['d', 'e', 'f']
        assert.equal(true, includesArray1(chords, arr))
        assert.equal(true, includesArray2(chords, arr))
        assert.equal(true, includesArray3(chords, arr))
    });

    it('test2 - repro of bug in includesArray1', () => {
        const chords = [
            ["F3", "A#3", "D#4"]
        ]
        const arr = ["F3", "A#3", "D#4", "D6"]
        assert.equal(true, includesArray1(chords, arr))
        assert.equal(false, includesArray2(chords, arr))
        assert.equal(false, includesArray3(chords, arr))
    });

    it('test3 - repro of bug in includesArray1', () => {
        const chords = [
            ["a", "d"]
        ]
        const arr = ["a", "d", "e"]
        assert.equal(true, includesArray1(chords, arr))
        assert.equal(false, includesArray2(chords, arr))
        assert.equal(false, includesArray3(chords, arr))
    });


});
