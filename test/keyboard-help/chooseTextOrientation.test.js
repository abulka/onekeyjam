import assert from 'assert'
import { chooseTextOrientation } from '@/lib/keyboard-help.js'

describe('chooseTextOrientation', () => {

    it('short text on a wide key stays horizontal', () => {
        assert.equal(chooseTextOrientation('Cmaj7', 100, '10px sans-serif'), 'horizontal')
    })

    it('a long word on a narrow key goes vertical', () => {
        assert.equal(chooseTextOrientation('Trans-pose', 20, '9px sans-serif'), 'vertical')
    })

    it('multi word text stays horizontal if each word fits', () => {
        assert.equal(chooseTextOrientation('Scale filter OFF', 60, '9px sans-serif'), 'horizontal')
    })

    it('empty text stays horizontal', () => {
        assert.equal(chooseTextOrientation('', 20), 'horizontal')
    })

    it('a zero width key goes vertical', () => {
        assert.equal(chooseTextOrientation('C', 0), 'vertical')
    })
})
