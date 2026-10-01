import assert from 'assert';
import * as Tonal from "@tonaljs/tonal";

describe('Tonal scale parsing', () => {

    it('c major', () => {
        const scaleObj = Tonal.Scale.get('c major')
        assert.equal(scaleObj.type, 'major')
        assert.equal(scaleObj.tonic, 'C')
        assert.deepEqual(scaleObj.notes, 'C D E F G A B'.split(' '))

        // console.log('scaleObj', scaleObj)
    });

    it('C lydian', () => {
        const scaleObj = Tonal.Scale.get('C lydian')
        assert.equal(scaleObj.type, 'lydian')
        assert.equal(scaleObj.tonic, 'C')
        assert.deepEqual(scaleObj.notes, 'C D E F# G A B'.split(' '))

        // console.log('scaleObj', scaleObj)
    });

    it('Tonal Scale scaleChords', () => {
        const result = Tonal.Scale.scaleChords('major')
        // console.log('result', result)
    });

    it('Tonal Scale modeNames', () => {
        const scaleObj = Tonal.Scale.get("C pentatonic")
        const result = Tonal.Scale.modeNames(scaleObj.tonic + ' ' + scaleObj.type)
        // console.log('result', result)
        assert.ok(result.length > 0)
    });

    it('Tonal Scale detect', () => {
        // There's no Scale.detect because, as you said, I think scale detection
        // is just a matter of find the chroma of the notes and get the scale
        // that matches. https://github.com/tonaljs/tonal/issues/36
        // const scaleObj = Tonal.Scale.detect(['C','Eb','G','A#','C##','E#','F','Ab','C'])// DOESN'T EXIST
        // is exactly A minor and all its modes. HUH? A# is in A minor?  And Ab ?  Doesn't make sense. 
        // ideas:
        // let chroma = [0,2,4,5,7,9,11].map(Note.fromMidi) // => [ 'C-1', 'D-1', 'E-1', 'F-1', 'G-1', 'A-1', 'B-1' ]
        // Scale.toScale(chroma) // => [ 'C', 'D', 'E', 'F', 'G', 'A', 'B' ]
        // const result = Tonal.Dictionary.scale.names('101011010101')// DOESN'T EXIST
        // chroma ideas:
        // chroma - https://github.com/tonaljs/tonal/issues/284
        // console.log(Tonal.Pcset.chroma(['D', 'E', 'F#', 'G', 'A', 'B', 'C#']));

        function notesToScales(notes) {  // Experimental
            const chroma = Tonal.Pcset.chroma(notes)
            // const result = Tonal.Dictionary.scale.names(chroma)// DOESN'T EXIST

            const scales = Tonal.ScaleType.all()
                .filter(scaleType => scaleType.chroma === chroma)
            // .map(scaleType => scaleType.name);
            return scales
        }

        let result = notesToScales(['C', 'Eb', 'G', 'A#', 'C##', 'E#', 'F', 'Ab', 'C'])  // minor?
        result = notesToScales(['C', 'D', 'E', 'F', 'G', 'A', 'B'])  // major
        result = notesToScales(['C', 'D', 'Eb', 'F', 'G', 'Ab', 'Bb'])  // minor
        result = notesToScales(['C', 'D', 'E'])  // not enough notes for a result

        // Basically this is not supported. You can get some sort of result with the above chroma
        // technique but it's not very useful.  Looks like you have to supply all the notes of the scale?
        // And all its modes? (wouldn't that be the same thing as modes are just the same notes, rotated?).
        // How to tell the tonic?
    });

})

