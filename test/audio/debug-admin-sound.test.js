import assert from 'assert'
import { mount } from '@vue/test-utils'
import DebugAdmin from '@/components/DebugAdmin.vue'

describe('DebugAdmin sound section', () => {
    it('renders with no sound system running', () => {
        const wrapper = mount(DebugAdmin, {
            // Attached so the component's document-wide switch lookup works.
            attachTo: document.body,
            global: {
                config: {
                    // Silence warnings for the g200kg custom elements.
                    isCustomElement: (tag) => tag.startsWith('webaudio-'),
                },
            },
        })
        assert.match(wrapper.text(), /Audio state/)
        assert.match(wrapper.text(), /not started/)
        assert.match(wrapper.text(), /Play test sound/)
        wrapper.unmount()
    })
})
