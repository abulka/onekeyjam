import assert from 'assert'
import { isSafeFilename, sanitizeFilename, unsafeCharsIn } from '../../src/lib/filename.js'

describe('sanitizeFilename', () => {

    it('turns a sharp into a readable word', () => {
        assert.equal(sanitizeFilename('ii-V-i in G# minor'), 'ii-V-i in Gsharp minor')
        assert.equal(sanitizeFilename('ii-V-i in C# minor'), 'ii-V-i in Csharp minor')
    })

    it('removes question marks', () => {
        assert.equal(sanitizeFilename('is this in C?'), 'is this in C')
    })

    it('replaces filesystem-reserved characters', () => {
        assert.equal(sanitizeFilename('a/b\\c:d*e"f<g>h|i'), 'a-b-c-d-e-f-g-h-i')
    })

    it('strips control characters and collapses whitespace', () => {
        assert.equal(sanitizeFilename('hello\u0000\n\tworld'), 'hello world')
    })

    it('trims and removes leading/trailing dots and spaces', () => {
        assert.equal(sanitizeFilename('  .hidden.  '), 'hidden')
    })

    it('falls back to a placeholder when nothing is left', () => {
        assert.equal(sanitizeFilename('???'), 'untitled')
        assert.equal(sanitizeFilename('   '), 'untitled')
        assert.equal(sanitizeFilename(undefined), 'untitled')
    })

    it('leaves an already-safe name alone', () => {
        assert.equal(sanitizeFilename('ii-V-i in Gsharp minor'), 'ii-V-i in Gsharp minor')
    })

})

describe('isSafeFilename / unsafeCharsIn', () => {

    it('accepts ordinary library filenames', () => {
        assert.equal(isSafeFilename('ii-V-i in Gsharp minor.json'), true)
        assert.equal(isSafeFilename('12-bar blues in Bb.json'), true)
    })

    it('rejects names with # or ?', () => {
        assert.equal(isSafeFilename('ii-V-i in G# minor.json'), false)
        assert.equal(isSafeFilename('does this work?.json'), false)
    })

    it('reports the distinct offending characters', () => {
        assert.deepEqual(unsafeCharsIn('a#b#c?d'), ['#', '?'])
        assert.deepEqual(unsafeCharsIn('safe name'), [])
    })

})
