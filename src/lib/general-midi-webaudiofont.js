let player = undefined

/*
To pick other sounds 
1. run the ~/D/m/webaudiofont/ project in a server and <-- or simply run the online demo https://surikov.github.io/webaudiofont/examples/midikey.html 
2. open http://127.0.0.1:8081/examples/midikey.html
3. select a sound from the combo box and press a MIDI key on the keyboard
4. the names of the js file to import and name of the tone are printed in the console. They are off by 1 in numbering.
*/
const sfJam = { name: '_tone_0040_Chaos_sf2_file', value: _tone_0040_Chaos_sf2_file, description: 'e piano 45' }
// const sfJam = { name: '_tone_0020_SBLive_sf2', value: _tone_0020_SBLive_sf2, description: 'softer - but this somehow affects the bass note - WTF !!!!? Perhaps they are soundfont banks?' }
const sfChord = { name: '_tone_0243_JCLive_sf2_file', value: _tone_0243_JCLive_sf2_file, description: 'Acoustic Guitar (nylon): Guitar - 255' }
const sfBass = { name: '_tone_0321_GeneralUserGS_sf2_file', value: _tone_0321_GeneralUserGS_sf2_file, description: 'bass 374' }

export function bootGeneralMidi(audioContext) {
    // Web audio font init
    player = new WebAudioFontPlayer();

    var channelMaster = player.createChannel(audioContext);
    var reverberator = player.createReverberator(audioContext);
    channelMaster.output.connect(reverberator.input);
    reverberator.output.connect(audioContext.destination);
    let value = 1.0
    channelMaster.output.gain.setTargetAtTime(value, 0, 0.0001) // value="1.0" min="0.0" max="1.5" step="0.1"
    value = 0.0
    reverberator.wet.gain.setTargetAtTime(value, 0, 0.0001) // value="0.5" min="0.0" max="1.5" step="0.1"

    // expose to html
    document.channelMaster = channelMaster
    document.reverberator = reverberator
    document.fred = function () {
    }

    // player.loader.decodeAfterLoading(audioContext, '_tone_0250_SoundBlasterOld_sf2');
    // player.loader.decodeAfterLoading(audioContext, '_tone_0000_JCLive_sf2_file');
    // player.loader.decodeAfterLoading(audioContext, '_tone_0180_SoundBlasterOld_sf2');
    // player.loader.decodeAfterLoading(audioContext, '_tone_0040_Chaos_sf2_file'); // e piano 45
    // player.loader.decodeAfterLoading(audioContext, '_tone_0500_SBLive_sf2'); // Synth Strings 1: Ensemble - 559
    // player.loader.decodeAfterLoading(audioContext, '_tone_0321_GeneralUserGS_sf2_file'); // bass 374
    // player.loader.decodeAfterLoading(audioContext, '_tone_0243_JCLive_sf2_file'); // Acoustic Guitar (nylon): Guitar - 255 
    // player.loader.decodeAfterLoading(audioContext, '_tone_0020_SBLive_sf2'); // Electric Grand Piano: Piano - 27 

    player.loader.decodeAfterLoading(audioContext, sfBass.name)
    player.loader.decodeAfterLoading(audioContext, sfChord.name)
    player.loader.decodeAfterLoading(audioContext, sfJam.name)

}

export function stopGmNote(audioContext, noteOffInfo) {
    noteOffInfo.envelope.cancel();
}

export function playGmNote(audioContext, toneType, when, octave, note, pitch, velocity, duration = 123456789) {
    let tone
    switch (toneType) {
        case 'chord':
            tone = sfChord.value
            break;
        case 'bass':
            tone = sfBass.value
            break;
        default:
            tone = sfJam.value
            break;
    }
    const midiOctaveOffset = 1 * 12
    const midiNote = midiOctaveOffset + (12 * octave) + pitch
    // console.log('    webaudio playing', toneType, 'pitch', pitch, 'octave', octave, '= midinote', midiNote)
    let envelope = player.queueWaveTable(
        audioContext,
        document.channelMaster.input,
        tone,
        when,
        midiNote,
        duration,
        velocity
    )

    return envelope
}

export function ping(audioContext) {
    player.queueWaveTable(audioContext, audioContext.destination, sfBass.value,
        0, //when
        12 * 5 + 7, // pitch 0 to 127
        0.15 // duration in seconds
    );
}

export function stopAllNotes(audioContext) {
    player.cancelQueue(audioContext);
}