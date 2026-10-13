// @ts-check
import assert from 'assert'
import { parseNotesWithBass } from '@/lib/note-tools.js'

describe('parseNotesWithBass', () => {
    it('parses notes only', () => {
        const result = parseNotesWithBass('C E G')
        assert.deepEqual(result.notes, ['C3', 'E3', 'G3'])
        assert.equal(result.bass, '')
        assert.equal(result.invalidBass, '')
    })

    it('parses a slash bass with a space', () => {
        const result = parseNotesWithBass('C3 E3 G3 /E')
        assert.deepEqual(result.notes, ['C3', 'E3', 'G3'])
        assert.equal(result.bass, 'E')
        assert.equal(result.invalidBass, '')
    })

    it('parses a slash bass without a space', () => {
        const result = parseNotesWithBass('C3 E3 G3/E')
        assert.deepEqual(result.notes, ['C3', 'E3', 'G3'])
        assert.equal(result.bass, 'E')
    })

    it('accepts an octave on the bass and ignores it for the pitch class', () => {
        const result = parseNotesWithBass('E3 G3 C4 /E2')
        assert.deepEqual(result.notes, ['E3', 'G3', 'C4'])
        assert.equal(result.bass, 'E')
    })

    it('reports an unreadable bass token', () => {
        const result = parseNotesWithBass('C E G /xyz')
        assert.deepEqual(result.notes, ['C3', 'E3', 'G3'])
        assert.equal(result.bass, '')
        assert.equal(result.invalidBass, 'xyz')
    })

    it('treats a lone slash as no bass', () => {
        const result = parseNotesWithBass('C E G /')
        assert.deepEqual(result.notes, ['C3', 'E3', 'G3'])
        assert.equal(result.bass, '')
        assert.equal(result.invalidBass, '')
    })
})
