import assert from 'assert';
import { removeBassSlash } from "../../src/lib/removeBassSlash.js";

describe('removeBassSlash', () => {

    /*
    Warning: Have to deepEqual because regular assert.equal doesn't work 
        viz. assert.equal('C', ['C']); passes! 🤯
    */

    it('pick bass out of chord symbols', () => {
        const [chordSymbol, bass] = removeBassSlash('CM/G');
        assert.deepEqual('CM', chordSymbol);
        assert.deepEqual('G', bass);
    });

    it('tricky  m/ma7', () => {
        const [chordSymbol, bass] = removeBassSlash('Cm/ma7');
        assert.deepEqual('Cm/ma7', chordSymbol);
        assert.deepEqual('', bass);
    });

    it('tricky 6/9', () => {
        const [chordSymbol, bass] = removeBassSlash('C6/9');
        assert.deepEqual('C6/9', chordSymbol);
        assert.deepEqual('', bass);
    });

    it('advanced case of D6/9/F#', () => {
        const [chordSymbol, bass] = removeBassSlash('D6/9/F#');
        assert.deepEqual('D6/9', chordSymbol);
        assert.deepEqual('F#', bass);
    });

    it('advanced case D7no5/C', () => {
        const [chordSymbol, bass] = removeBassSlash('D7no5/C');
        assert.deepEqual('D7no5', chordSymbol);
        assert.ok(!(bass instanceof Array))
        assert.deepEqual('C', bass);
    });


});
