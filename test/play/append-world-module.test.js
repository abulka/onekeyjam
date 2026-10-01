import assert from 'assert';

function appendWorld(s) {
    return s + ' World';
}

describe('mocha appendWorld (module)', () => {

    it('should append world to the end of each string', () => {
        const str = 'Hello';
        const expected = 'Hello World';

        assert.equal(appendWorld(str), expected);
    });
});

