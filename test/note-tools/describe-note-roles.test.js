import assert from 'assert'
import { describeNoteRoles } from '../../src/lib/note-tools.js'

describe('describeNoteRoles', () => {

    it('describes a note that is in key, scale and chord', () => {
        assert.equal(
            describeNoteRoles({ inProjectKey: true, inCurrentScale: true, inCurrentChord: true }),
            'Project key note — in the current scale — in the current chord'
        )
    })

    it('describes an out-of-key chord tone in the current scale', () => {
        assert.equal(
            describeNoteRoles({ inProjectKey: false, inCurrentScale: true, inCurrentChord: true }),
            'Outside the project key — in the current scale — in the current chord'
        )
    })

    it('describes an out-of-key colour note that is not a chord tone', () => {
        assert.equal(
            describeNoteRoles({ inProjectKey: false, inCurrentScale: true, inCurrentChord: false }),
            'Outside the project key — in the current scale — not in the current chord'
        )
    })

    it('describes a project key note outside the current scale', () => {
        assert.equal(
            describeNoteRoles({ inProjectKey: true, inCurrentScale: false, inCurrentChord: false }),
            'Project key note — not in the current scale — not in the current chord'
        )
    })

    it('always returns a description, even for a bare key note', () => {
        const result = describeNoteRoles({ inProjectKey: true, inCurrentScale: false, inCurrentChord: true })
        assert.ok(result.length > 0)
        assert.ok(result.includes('Project key note'))
    })

})
