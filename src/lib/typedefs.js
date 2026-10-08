// @ts-check

/**
 * The shared data model for projects, keyboard configs and the static library
 * manifests. This is the single source of truth for the shapes that are saved
 * to IndexedDB, exported/imported as JSON and shipped in `public/`.
 *
 * There are two closely related project shapes:
 * - `Project` is the in-memory shape used by the app.
 * - `PersistedProject` is what `getProjectForPersistence()` writes: it strips
 *   the derived scale-note arrays (and empty `symbols`) so saved files stay
 *   small. `emergencyRepairProject()` re-expands them on load.
 */

/**
 * A chord as a list of note names with octaves, e.g. `["C3", "E3", "G3"]`.
 * @typedef {Array<string>} Chord
 */

/** @typedef {Array<string>} ScaleNotes */

/**
 * @typedef {object} ProjectMeta
 * @property {string} type e.g. "onekeyjam"
 * @property {number} version e.g. 2
 * @property {string} source url e.g. "https://onekeyjam.netlify.app"
 */

/**
 * A chord config: one chord with its notes, optional bass and up to three
 * candidate scales. `scale1Notes`/`scale2Notes`/`scale3Notes`/`scaleNotesOfChord`
 * are derived and are stripped when persisted (see `PersistedChordConfig`).
 * @typedef {object} ChordConfig
 * @property {number} id unique id within the project
 * @property {string} name description e.g. "Dm7 chord - symbols and scale3 is random stuff"
 * @property {string} chord chord name incl tonic and type e.g. "Dm7"
 * @property {Array<string>} chordNotes chord expanded into notes incl octave e.g. ["D3", "F3", "A3", "C4", "D4"]
 * @property {string} [symbols] alternative detected chord symbols, comma separated e.g. "Dm7,CM,Gm7#5/F"
 * @property {string} [bass] bass note sans octave e.g. "A"
 * @property {string} [bassNote] bass note incl octave e.g. "A3"
 * @property {string} scale1 default scale e.g. "d dorian"
 * @property {string} [scale2] alternative scale e.g. "c major pentatonic"
 * @property {string} [scale3] alternative scale e.g. "f# minor"
 * @property {Array<string>} [scale1Notes] derived: scale1 expanded to notes sans octave
 * @property {Array<string>} [scale2Notes] derived
 * @property {Array<string>} [scale3Notes] derived
 * @property {Array<string>} [scaleNotesOfChord] derived: the chord notes as a scale
 */

/**
 * A chord config as persisted: the derived scale-note arrays are removed.
 * @typedef {Omit<ChordConfig, "scale1Notes"|"scale2Notes"|"scale3Notes"|"scaleNotesOfChord">} PersistedChordConfig
 */

/**
 * Maps a left-hand trigger note to a chord config.
 * @typedef {Object.<string, ChordConfig>} ChordTriggerMap
 */

/**
 * Maps a played right-hand note to an allowed scale note.
 * @typedef {Object.<string, string>} ScaleTriggerMap
 */

/**
 * A song is a named selection of chord config ids plus favourites/blacklist.
 * `ids` is the grid arrangement: the ordered list of chord ids currently on the
 * trigger keys. It is the single source of truth for the grid, persisted and
 * restored exactly (no random rebuild on load). `favourites` are the keepers
 * pinned first when a hand is dealt from a large pool. `blacklist` is excluded
 * from draws.
 * @typedef {object} Song
 * @property {Array<number>} ids the ordered grid arrangement (chords on trigger keys)
 * @property {Array<number>} favourites keeper ids, pinned first on a deal
 * @property {Array<number>} blacklist ids excluded from a deal
 */

/** @typedef {Object.<string, Song>} Songs */

/**
 * A sequencer pattern stored with a project. Each note sits on a white
 * trigger row (one bar per chord in generated songs) and sounds that trigger.
 * A project may hold several named sequences (for example an excerpt and the
 * full form); `label` is the display name shown in the sequence picker.
 * @typedef {object} ChordSequence
 * @property {string} mml Music Macro Language string
 * @property {number} tempo the song's tempo, applied to the global BPM on load
 * @property {number} [markstart] loop start in panel ticks
 * @property {number} [markend] loop end in panel ticks
 * @property {boolean} [enabled] loop the pattern while recording a solo
 * @property {boolean} [loopManual] true once the loop markers were dragged by hand
 * @property {string} [label] display label for the sequence picker
 */

/**
 * The declared musical key of a project. `type` is a Tonal scale type, usually
 * 'major' or 'minor' but any mode ('dorian', ...) is allowed so modal tunes are
 * described accurately. `source` records whether the user chose it or it was
 * detected from the chords.
 * @typedef {object} ProjectKey
 * @property {string} tonic the key note, e.g. "C"
 * @property {string} type the Tonal scale type, e.g. "major", "minor", "dorian"
 * @property {'user'|'detected'} [source]
 */

/**
 * Per-project overrides. `keyboard` overrides the current keyboard config.
 * `key` is the declared musical key. `soloMode` chooses whether the right hand
 * follows the per-chord scales ('chord', the default) or stays on the key scale
 * ('key'). `colour` chooses how much chromatic colour the key-aware engine
 * prefers: 'diatonic', 'jazz' (the default) or 'adventurous'. `scaleStyle` is
 * the named right-hand scale style (see src/lib/scaleStyles.js), or 'custom'
 * when the engine settings have been hand-tuned. Generated songs carry a
 * colour-matched default style. `gridRows` is the remembered number of trigger
 * keys (the grid height), so a project reopens at the size it was left.
 * @typedef {object} ProjectOptions
 * @property {Partial<KeyboardConfig>} [keyboard]
 * @property {ProjectKey} [key]
 * @property {'chord'|'key'} [soloMode]
 * @property {'diatonic'|'jazz'|'adventurous'} [colour]
 * @property {string} [scaleStyle]
 * @property {number} [gridRows]
 */

/**
 * The in-memory project shape.
 * @typedef {object} Project
 * @property {ProjectMeta} [meta]
 * @property {string} name description of the project
 * @property {Array<ChordConfig>} chords the chord configs in the project
 * @property {ProjectOptions} options
 * @property {Songs} songs chord configs grouped by song, incl favourites and blacklist
 * @property {Object.<string, ChordSequence>} [chordSequences]
 */

/**
 * The persisted (slimmed) project shape written to IndexedDB or exported JSON.
 * @typedef {Omit<Project, "chords"> & { chords: Array<PersistedChordConfig> }} PersistedProject
 */

/**
 * A keyboard config (static JSON in `public/keyboards/`).
 * @typedef {object} KeyboardConfig
 * @property {string} name
 * @property {string} [description]
 * @property {number} rhJamSoundOctave where jam notes sound
 * @property {number} lhTriggerOctave where chords are triggered
 */

/**
 * An entry in the generated library manifests
 * (`featured-manifest.json`, `classic-manifest.json`,
 * `progressions-manifest.json`, `rock-manifest.json`, `keyboards-manifest.json`).
 * @typedef {object} ManifestEntry
 * @property {string} text display name
 * @property {string} value URL to the JSON file
 * @property {string} file file name on disk
 */

export { }
