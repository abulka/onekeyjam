import assert from 'assert';
import { parseChordSequence, parseSingleChordToken, resolveChordSymbol, withMinAlias } from "../../src/lib/parseChordSequence.js";

describe('parseChordSequence example from request', () => {
    it('parses Dsus4 Dmaj7 C#min11', () => {
        const { entries, errors } = parseChordSequence('Dsus4 Dmaj7 C#min11');
        assert.deepEqual(errors, []);
        assert.equal(entries.length, 3);
        assert.equal(entries[0].chord, 'Dsus4');
        assert.equal(entries[1].chord, 'Dmaj7');
        assert.equal(entries[2].chord, 'C#m11');
    });
});

describe('parseChordSequence delimiters', () => {
    it('splits on spaces, commas, newlines and semicolons', () => {
        const { entries, errors } = parseChordSequence('Am, G7\nDm; Em');
        assert.deepEqual(errors, []);
        assert.deepEqual(entries.map(e => e.chord), ['Am', 'G7', 'Dm', 'Em']);
    });

    it('empty input gives no entries and no errors', () => {
        assert.deepEqual(parseChordSequence(''), { entries: [], errors: [] });
        assert.deepEqual(parseChordSequence('   \n , ; '), { entries: [], errors: [] });
    });

    it('reports invalid tokens without dropping valid ones', () => {
        const { entries, errors } = parseChordSequence('Am Hocuspocus G7');
        assert.equal(entries.length, 2);
        assert.equal(errors.length, 1);
        assert.equal(errors[0].input, 'Hocuspocus');
    });
});

describe('parseChordSequence slash chords and aliases', () => {
    it('keeps explicit slash bass', () => {
        const parsed = parseSingleChordToken('E7/D');
        assert.ok(parsed);
        assert.equal(parsed.chord, 'E7');
        assert.equal(parsed.bass, 'D');
        assert.equal(parsed.symbol, 'E7/D');
    });

    it('normalises min11 to m11', () => {
        assert.equal(resolveChordSymbol('C#min11'), 'C#m11');
        assert.equal(withMinAlias('C#min11'), 'C#m11');
        assert.equal(withMinAlias('Bbminor9'), 'Bbm9');
    });

    it('does not rewrite diminished chords', () => {
        assert.equal(withMinAlias('Ddim'), 'Ddim');
        assert.equal(resolveChordSymbol('Ddim'), 'Ddim');
    });

    it('rejects bad bass notes', () => {
        assert.equal(parseSingleChordToken('E7/H'), null);
    });
});
