import assert from 'assert';
import * as Tonal from "@tonaljs/tonal";
import { findOctaveCrossingPoint } from "../../src/lib/note-tools.js";

describe('findOctaveCrossingPoint', () => {

    it('no crossing C D', () => {
        assert.equal(-1, findOctaveCrossingPoint(['C', 'D']))
    });

    it('crossing D C', () => {
        assert.equal(1, findOctaveCrossingPoint(['D', 'C']))
    });

    it('crossing C D C', () => {
        assert.equal(2, findOctaveCrossingPoint(['C', 'D', 'C']))
    });

});
