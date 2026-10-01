
/**
 * @typedef Chord
 * @type {Array<string>}
 */

/** @typedef {Array<string>} ScaleNotes */


/**
 * @typedef ProjectMeta
 * @type {object}
 * @property {string} type // e.g. "onekeyjam"
 * @property {number} version // e.g. 2
 * @property {string} source // url e.g. "https://onekeyjam.netlify.app"
}

/**
 * @typedef Project
 * @type {object}
 * @property {ProjectMeta} meta version and url
 * @property {string} name description of the project
 * @property {Array<ChordConfig>} chords - the chords (candidates) in the project
 * @property {object} options - the project options
 * @property {Songs} songs a collection of chord configs referenced by id, incl favourites and blacklist
 */

/**
 * @typedef ChordConfig
 * @type {object}
 * @property {number} id unique id
 * @property {string} name description of the config e.g. "Dm7 chord - symbols and scale3 is random stuff"
 * @property {string} chord chord name incl tonic and type e.g. "Dm7"
 * @property {Array<string>} chordNotes chord expanded into actual notes incl octave e.g. ["D3", "F3", "A3", "C4", "D4"]
 * @property {string} [symbols] possible other chords, comma separated string e.g. "Dm7,CM,Gm7#5/F"
 * @property {string} [bass] bass note sans octave e.g. "A",
 * @property {string} [bassNote] bass note incl octave e.g. "A3"
 * @property {string} scale1 default scale e.g. "d dorian"
 * @property {string} [scale2] alternative scale e.g. "c major pentatonic"
 * @property {string} [scale3] alternative scale e.g. "f# minor"
 * @property {Array<string>} [scale1Notes] expanded scale1 into notes sans octave e.g. ["C", "D", "E", "F", "G"],
 * @property {Array<string>} [scale2Notes] expanded scale2 into notes sans octave e.g.  ["C", "D", "E", "F", "G"],
 * @property {Array<string>} [scale3Notes] expanded scale3 into notes sans octave e.g. []
 * @property {Array<string>} scaleNotesOfChord special scale sans octave
 */

/**
 * An object with trigger note keys and chord config values:
 * @typedef {Object.<string, ChordConfig>} ChordTriggerMap
 */

/**
 * An object with trigger note keys and note values:
 * @typedef {Object.<string, string>} ScaleTriggerMap
 */

/**
 * @typedef Song
 * @type {object}
 * @property {Array<number>} ids the chord config ids in this song
 * @property {Array<number>} favourites ids that appear at the top of the chord list
 * @property {Array<number>} blacklist ids that have been excluded in this song but not from other songs
 */

/** @typedef {Object.<string, Song>} Songs */

export { }
