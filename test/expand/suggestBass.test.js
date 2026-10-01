import assert from 'assert';
import { suggestBass } from "../../src/lib/note-tools";

describe('suggestBass', () => {
    it('suggest a bass from chord notes C E G', () => {
        const chordNotes = ['C', 'E', 'G'];
        const chordObj = suggestBass(chordNotes);
        assert.equal('C', chordObj.letter);
        assert.equal('C', chordObj.pc);
        assert.equal(undefined, chordObj.oct);
    });

    it('suggest a bass from "C#m" chord notes', () => {
        const chordNotes = [
            "C#2",
            "C#3",
            "E3",
            "G#3",
            "C#4"
          ]
        const chordObj = suggestBass(chordNotes);
        assert.equal('C', chordObj.letter);
        assert.equal('C#', chordObj.pc);
        assert.equal(undefined, chordObj.oct);
    });


});
