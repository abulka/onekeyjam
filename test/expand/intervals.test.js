import assert from 'assert';
import * as Tonal from "@tonaljs/tonal";

describe('Intervals', () => {
    /*
    { interval: 0, name: 'Perfect Unison',  tonalInterval: '1P' },  // just means the same note
    { interval: 1, name: 'Minor 2nd',       tonalInterval: '2m' },  // semi tone up
    { interval: 2, name: 'Major 2nd',       tonalInterval: '2M' },  // tone up
    { interval: 3, name: 'Minor 3rd',       tonalInterval: '3m' },
    { interval: 4, name: 'Major 3rd',       tonalInterval: '3M' },
    { interval: 5, name: 'Perfect 4th',     tonalInterval: '4P' },  // perfect fourth
    { interval: 6, name: 'Tritone',         tonalInterval: '5d' },  // tritone is called diminished 5th interval in tonal
    { interval: 7, name: 'Perfect 5th',     tonalInterval: '5P' },  // perfect fifth
    { interval: 8, name: 'Minor 6th',       tonalInterval: '6m' },
    { interval: 9, name: 'Major 6th',       tonalInterval: '6M' },
    { interval: 10, name: 'Minor 7th',      tonalInterval: '7m' },
    { interval: 11, name: 'Major 7th',      tonalInterval: '7M' },
    { interval: 12, name: 'Perfect Octave', tonalInterval: '8P' }
    */
    it('build tonal interval map', () => {
        const intervalMap = [
            { interval: 0, name: "Perfect Unison", tonalInterval: "" },
            { interval: 1, name: "Minor 2nd", tonalInterval: "" },
            { interval: 2, name: "Major 2nd", tonalInterval: "" },
            { interval: 3, name: "Minor 3rd", tonalInterval: "" },
            { interval: 4, name: "Major 3rd", tonalInterval: "" },
            { interval: 5, name: "Perfect 4th", tonalInterval: "" },
            { interval: 6, name: "Tritone", tonalInterval: "" },
            { interval: 7, name: "Perfect 5th", tonalInterval: "" },
            { interval: 8, name: "Minor 6th", tonalInterval: "" },
            { interval: 9, name: "Major 6th", tonalInterval: "" },
            { interval: 10, name: "Minor 7th", tonalInterval: "" },
            { interval: 11, name: "Major 7th", tonalInterval: "" },
            { interval: 12, name: "Perfect Octave", tonalInterval: "" },
        ]
        for (let intervalObj of intervalMap)
            intervalObj.tonalInterval = Tonal.Interval.fromSemitones(intervalObj.interval)
        // console.log('result', intevalMap);

        // Spot check
        assert.equal(intervalMap[6].tonalInterval, '5d');
        assert.equal(intervalMap[11].tonalInterval, '7M');
    });


});
