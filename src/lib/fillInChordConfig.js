import * as Tonal from '@tonaljs/tonal';
import {chordSymbolToNotesInversion} from './chordSymbolToNotes';
import {findTop3MatchingScales} from './findMatchingScales';
import {createChordSymbol} from './note-tools.js';
import {suggestBass} from './note-tools';
import {bassNoteOctave} from './settings.js';

export function fillInChordConfig(chordConfig, chordRoot, chordType, inversion, bass) {
    // Fill in the chord config with the new chord info, adjust scales etc. (in place)
    // Whilst it does set the chordNotes in order to preserve the voicing, and sets the
    // scale names - it not expand the config into scale notes.
    // The config `bass` is not set, unless it has been supplied, but `bassNote` is set for some reason.
    // If you pass in chordNotes, it will use them, otherwise it will use the chord notes from the root symbol+type+inversion.

    const chordSymbolInclRoot = createChordSymbol(chordRoot, chordType)

    chordConfig.name = `${chordSymbolInclRoot} (user)`
    if (inversion > 0)
        chordConfig.name += ` (inv ${inversion})`

    chordConfig.chord = chordSymbolInclRoot
    // chordConfig.chordNotes = chordNotes.length > 0 ? chordNotes : chordSymbolToNotesInversion(chordSymbolInclRoot, currentChordInversion)
    chordConfig.chordNotes = chordSymbolToNotesInversion(chordSymbolInclRoot, inversion)

    // Fill in symbols too, for fun
    const detectedChordSymbols = Tonal.Chord.detect(chordConfig.chordNotes)  // e.g. ['Am#5', 'FM/A'] 
    chordConfig.symbols = detectedChordSymbols.join(',')

    fillBass(bass, chordConfig);
    [chordConfig.scale1, chordConfig.scale2, chordConfig.scale3] = findTop3MatchingScales([chordSymbolInclRoot])
}

export function fillInChordConfig2(chordConfig, chordSymbolInclRoot, chordSymbols, chordNotes, bass) {
    // Fill in the chord config with the new chord info, adjust scales etc. (in place) - V2

    chordConfig.name = `${chordSymbolInclRoot} (user jam)`
    chordConfig.chord = chordSymbolInclRoot
    chordConfig.chordNotes = chordNotes
    chordConfig.symbols = chordSymbols.join(',')

    fillBass(bass, chordConfig);
    [chordConfig.scale1, chordConfig.scale2, chordConfig.scale3] = findTop3MatchingScales([chordSymbolInclRoot])
}

function fillBass(bass, chordConfig) {
    if (bass) {
        chordConfig.bass = bass;
        chordConfig.bassNote = `${bass}${bassNoteOctave}`;
    }
    else {
        delete chordConfig.bass;

        // bassNote is set for some reason
        let bassObj = suggestBass(chordConfig.chordNotes);
        chordConfig.bassNote = `${bassObj.pc}${bassNoteOctave}`;
    }
}
