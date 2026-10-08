import * as Soundfont from 'soundfont-player'

let sfBass
let sfChord
let sfJam

// Ready flags so callers can tell whether the background sample fetch has
// finished. A tap before this is silent rather than a crash (notably on iPad
// over a slow connection), and the next tap sounds once loading completes.
let sfBassReady = false
let sfChordReady = false
let sfJamReady = false

// Records a failed sample fetch per instrument, so the status readout can
// tell "still loading" apart from "blocked or failed" (for example an iPad
// content blocker stopping the third-party sample host).
let sfErrors = {}

export function isSoundfontReady(toneType) {
    switch (toneType) {
        case 'chord':
            return sfChordReady
        case 'bass':
            return sfBassReady
        default:
            return sfJamReady
    }
}

export function soundfontStatus() {
    return { jam: sfJamReady, chord: sfChordReady, bass: sfBassReady, errors: { ...sfErrors } }
}

// jam, chord, bass
const set9 = ['electric_piano_1', 'acoustic_grand_piano', 'acoustic_bass']  // EXCELLENT combo
const sounds = set9

export function bootGeneralMidi(audioContext) {
    // Soundfont init
    Soundfont.instrument(audioContext, sounds[0]).then(function (instrument) {
        sfJam = instrument
        sfJamReady = true
    }).catch((error) => { sfJamReady = false; sfErrors.jam = String(error && error.message ? error.message : error) })
    // Soundfont.instrument(audioContext, 'marimba').then(function (instrument) {
    Soundfont.instrument(audioContext, sounds[1]).then(function (instrument) {
        sfChord = instrument
        sfChordReady = true
    }).catch((error) => { sfChordReady = false; sfErrors.chord = String(error && error.message ? error.message : error) })
    Soundfont.instrument(audioContext, sounds[2]).then(function (instrument) {
        sfBass = instrument
        sfBassReady = true
    }).catch((error) => { sfBassReady = false; sfErrors.bass = String(error && error.message ? error.message : error) })
}

export function stopGmNote(audioContext, noteOffInfo) {
    if (!noteOffInfo || !noteOffInfo.envelope)
        return
    try {
        noteOffInfo.envelope.stop(audioContext.currentTime);
    }
    catch (error) {
        // The envelope may already have stopped; nothing to do.
    }
}

export function playGmNote(audioContext, toneType, when, octave, note, pitch, velocity, duration = 123456789) {
    let tone
    switch (toneType) {
        case 'chord':
            tone = sfChord
            break;
        case 'bass':
            tone = sfBass
            break;
        default:
            tone = sfJam
            break;
    }

    /*
    Valid options are:
      gain: float between 0 to 1
      attack: the attack time of the amplitude envelope
      decay: the decay time of the amplitude envelope
      sustain: the sustain gain value of the amplitude envelope
      release: the release time of the amplitude envelope
      adsr: an array of [attack, decay, sustain, release]. Overrides other parameters.
      duration: set the playing duration in seconds of the buffer(s)
      loop: set to true to loop the audio buffer
  
      defaults from ttps://github.com/danigb/sample-player/ are:
      var DEFAULTS = {
        gain: 1,
        
        attack: 0.01,
        decay: 0.1,
        sustain: 0.9,
        release: 0.3,
  
        loop: false,
        cents: 0,
        loopStart: 0,
        loopEnd: 0
      }
    */
    let envelope
    if (!tone)
        return null
    try {
        envelope = tone.play(
            note,
            when,
            {
                gain: velocity,
                duration: duration,
                loop: false,
                sustain: 3.5,
                // adsr: [0, 0.5, 3.8, 3.3],
            })
    }
    catch (error) {
        // The instrument may still be loading; stay silent rather than
        // throwing into the note pipeline and breaking later taps.
        return null
    }

    return envelope
}


export function ping() {
    if (!sfBass)
        return
    try {
        sfBass.play('C2', 0, { duration: 0.1 })
    }
    catch (error) {
        // Samples not loaded yet; nothing to do.
    }
}

export function stopAllNotes() {
    // ?
}



/*

[
  "acoustic_grand_piano",   GOOD but quiet
  "bright_acoustic_piano", ok bright and short not much sustain?
  "electric_grand_piano",  too guitar like
  "honkytonk_piano",  bit harsh
  "electric_piano_1",   GOOD jam
  "electric_piano_2",  too sharp and harsh and glassy
  "harpsichord",
  "clavinet",
  "celesta",
  "glockenspiel",
  "music_box",
  "vibraphone",   nice as jam
  "marimba",
  "xylophone",
  "tubular_bells",
  "dulcimer",
  "drawbar_organ",   thin and reedy
  "percussive_organ",  too church like
  "rock_organ",       a bit thick and intense
  "church_organ",
  "reed_organ",       fun but too reedy
  "accordion",
  "harmonica",
  "tango_accordion",
  "acoustic_guitar_nylon",
  "acoustic_guitar_steel",
  "electric_guitar_jazz",  bit thin
  "electric_guitar_clean",  thin and fake
  "electric_guitar_muted",
  "overdriven_guitar",
  "distortion_guitar",
  "guitar_harmonics",
  "acoustic_bass",
  "electric_bass_finger",  GOOD though higher notes sound guitar like
  "electric_bass_pick",    GOOD not as good as finger though
  "fretless_bass",          nice low but higher sounds choked
  "slap_bass_1",
  "slap_bass_2",
  "synth_bass_1",      ok but quite synthy
  "synth_bass_2",
  "violin",
  "viola",        bit thin
  "cello",
  "contrabass",   GOOD but a bit loud and has too much tremolo
  "tremolo_strings",
  "pizzicato_strings",
  "orchestral_harp",
  "timpani",
  "string_ensemble_1",  strong strings - ok  v.powerful used as bass!
  "string_ensemble_2",  strong strings - GOOD  v.powerful used as bass!  Bit of slow attack though.
  "synth_strings_1",
  "synth_strings_2",
  "choir_aahs",
  "voice_oohs",
  "synth_choir",
  "orchestra_hit",
  "trumpet",
  "trombone",
  "tuba",
  "muted_trumpet",
  "french_horn",
  "brass_section",
  "synth_brass_1",
  "synth_brass_2",
  "soprano_sax",
  "alto_sax",
  "tenor_sax",
  "baritone_sax",
  "oboe",
  "english_horn",
  "bassoon",
  "clarinet",
  "piccolo",
  "flute",
  "recorder",
  "pan_flute",
  "blown_bottle",
  "shakuhachi",
  "whistle",
  "ocarina",
  "lead_1_square",
  "lead_2_sawtooth",
  "lead_3_calliope",
  "lead_4_chiff",
  "lead_5_charang",
  "lead_6_voice",
  "lead_7_fifths",
  "lead_8_bass__lead",
  "pad_1_new_age",
  "pad_2_warm",
  "pad_3_polysynth",
  "pad_4_choir",
  "pad_5_bowed",
  "pad_6_metallic",
  "pad_7_halo",
  "pad_8_sweep",
  "fx_1_rain",
  "fx_2_soundtrack",
  "fx_3_crystal",
  "fx_4_atmosphere",
  "fx_5_brightness",
  "fx_6_goblins",
  "fx_7_echoes",
  "fx_8_scifi",
  "sitar",
  "banjo",
  "shamisen",
  "koto",
  "kalimba",
  "bagpipe",
  "fiddle",
  "shanai",
  "tinkle_bell",
  "agogo",
  "steel_drums",
  "woodblock",
  "taiko_drum",
  "melodic_tom",
  "synth_drum",
  "reverse_cymbal",
  "guitar_fret_noise",
  "breath_noise",
  "seashore",
  "bird_tweet",
  "telephone_ring",
  "helicopter",
  "applause",
  "gunshot"
]

*/

