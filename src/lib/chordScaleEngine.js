// @ts-check

/*
 * General chord-scale matching engine.
 *
 * See doco/MUSIC-THEORY.md for the theory behind the scoring rules.
 */

import * as Tonal from '@tonaljs/tonal';
import { removeBassSlash } from './removeBassSlash.js';

const mod12 = (n) => ((n % 12) + 12) % 12;
const PC_NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

/** @param {string} note */
function chromaOf(note) {
    const chroma = Tonal.Note.chroma(note);
    return Number.isNaN(chroma) ? undefined : chroma;
}

/** @param {string} scaleName */
function scaleChromaSet(scaleName) {
    const scale = Tonal.Scale.get(scaleName);
    if (scale.empty)
        return undefined;
    return new Set(scale.notes.map(chromaOf));
}

const FAMILY_DEFS = [
    { name: 'major', ref: 'major', weight: 15 },
    { name: 'melodic minor', ref: 'melodic minor', weight: 11 },
    { name: 'harmonic minor', ref: 'harmonic minor', weight: 10 },
    { name: 'harmonic major', ref: 'harmonic major', weight: 9 },
    { name: 'double harmonic', ref: 'double harmonic major', weight: 4 },
    { name: 'diminished', ref: 'diminished', weight: 10 },
    { name: 'whole tone', ref: 'whole tone', weight: 7 },
    { name: 'augmented', ref: 'augmented', weight: 7 },
    { name: 'major pentatonic', ref: 'major pentatonic', weight: 11 },
    { name: 'minor pentatonic', ref: 'minor pentatonic', weight: 11 },
    { name: 'major blues', ref: 'major blues', weight: 10 },
    { name: 'minor blues', ref: 'minor blues', weight: 10 },
    { name: 'bebop', ref: 'bebop', weight: 4 },
    { name: 'bebop major', ref: 'bebop major', weight: 4 },
    { name: 'bebop minor', ref: 'bebop minor', weight: 4 },
];
const EXOTIC = { name: 'exotic', weight: -10 };

/**
 * How much chromatic colour the engine prefers when a key is supplied.
 * `diatonic` stays strictly in key (dorian flattens to aeolian and locrian #2
 * to locrian); `jazz` (the default) restores the idiomatic primaries while the
 * key shapes the alternatives; `adventurous` prefers lydian and lydian
 * dominant colour on the primary scales. Function rules (minor V7, tritone
 * sub, backdoor) apply in every profile.
 */
export const PROJECT_COLOURS = ['diatonic', 'jazz', 'adventurous'];
export const DEFAULT_COLOUR = 'jazz';

const COLOUR_PROFILES = {
    diatonic: {
        inKeyBonus: 5,
        subsetBonus: 2,
        outOfKeyPenalty: 3,
        functionalHalfDim: true,
        tonicMajor: true,
        ivLydian: false,
        colourBonuses: {},
    },
    jazz: {
        inKeyBonus: 2,
        subsetBonus: 1,
        outOfKeyPenalty: 1,
        functionalHalfDim: false,
        tonicMajor: true,
        ivLydian: true,
        colourBonuses: { dorian: 2, 'locrian #2': 2 },
    },
    adventurous: {
        inKeyBonus: 0,
        subsetBonus: 0,
        outOfKeyPenalty: 0,
        functionalHalfDim: false,
        tonicMajor: false,
        ivLydian: true,
        colourBonuses: { dorian: 3, 'locrian #2': 3, lydian: 4, 'lydian dominant': 6 },
    },
};

/** @param {string|undefined} colour */
function colourProfile(colour) {
    return COLOUR_PROFILES[colour] ?? COLOUR_PROFILES[DEFAULT_COLOUR];
}

/**
 * Colour bonus for a scale type, gated to the chord qualities it suits.
 * @param {string} type @param {*} shape @param {*} profile
 */
function colourBonus(type, shape, profile) {
    const bonus = profile.colourBonuses[type] ?? 0;
    if (!bonus)
        return 0;
    if (type === 'dorian' && !(shape.minorThird && shape.hasMinor7 && !shape.isHalfDim && !shape.isDominant))
        return 0;
    if (type === 'locrian #2' && !shape.isHalfDim)
        return 0;
    if (type === 'lydian' && !(shape.majorThird && !shape.isDominant))
        return 0;
    if (type === 'lydian dominant' && !shape.isDominant)
        return 0;
    return bonus;
}

const TIER_1_TYPES = [
    'major', 'dorian', 'mixolydian', 'lydian', 'aeolian',
    'melodic minor', 'lydian dominant', 'altered', 'locrian #2', 'phrygian dominant',
    'harmonic minor', 'diminished', 'half-whole diminished', 'whole tone', 'augmented',
    'major pentatonic', 'minor pentatonic', 'major blues', 'minor blues',
];
const TIER_2_TYPES = [
    'phrygian', 'locrian',
    'harmonic major', 'lydian augmented', 'mixolydian b6', 'dorian b2',
    'locrian 6', 'dorian #4', 'ultralocrian', 'major augmented',
    'minor #7M pentatonic', 'minor six pentatonic', 'minor hexatonic', 'minor six diminished',
    'lydian pentatonic', 'mixolydian pentatonic', 'lydian dominant pentatonic',
    'ionian pentatonic', 'locrian pentatonic',
    'bebop', 'bebop major', 'bebop minor', 'minor bebop',
];
const TYPE_PRIORITY = new Map();
for (const name of TIER_1_TYPES)
    TYPE_PRIORITY.set(name, 6);
for (const name of TIER_2_TYPES)
    TYPE_PRIORITY.set(name, 3);

const FAMILY_SETS = FAMILY_DEFS.map((family) => ({
    ...family,
    set: scaleChromaSet(`C ${family.ref}`),
}));

/**
 * Resolve a key description ({ tonic, type, colour } or a scale name such as
 * "C major") into the pitch classes it licenses and its colour profile.
 * @param {{tonic?:string, type?:string, colour?:string}|string} [key]
 */
function keyInfo(key) {
    if (!key)
        return undefined;
    const name = typeof key === 'string' ? key : `${key.tonic} ${key.type}`;
    const scale = Tonal.Scale.get(name);
    if (scale.empty)
        return undefined;
    const tonicChroma = chromaOf(scale.tonic);
    if (tonicChroma === undefined)
        return undefined;
    const colour = typeof key === 'string' ? DEFAULT_COLOUR : (key.colour ?? DEFAULT_COLOUR);
    return {
        tonic: scale.tonic,
        type: scale.type,
        colour,
        profile: colourProfile(colour),
        isMajor: scale.type === 'major',
        isMinor: scale.type === 'aeolian' || scale.type === 'minor',
        tonicChroma,
        pcs: new Set(scale.notes.map(chromaOf).filter((chroma) => chroma !== undefined)),
        name: `${scale.tonic} ${scale.type}`,
    };
}

/** @param {Set<number>} a @param {Set<number>} b */
function setsEqual(a, b) {
    if (a.size !== b.size)
        return false;
    for (const value of a)
        if (!b.has(value))
            return false;
    return true;
}

/** @param {Set<number>} subset @param {Set<number>} superset */
function setIsSubset(subset, superset) {
    for (const value of subset)
        if (!superset.has(value))
            return false;
    return true;
}

/** @param {string} tonic @param {string} type */
function scalePitchClasses(tonic, type) {
    const scale = Tonal.Scale.get(`${tonic} ${type}`);
    if (scale.empty)
        return [];
    return scale.notes.map(chromaOf).filter((chroma) => chroma !== undefined);
}

/**
 * Jazz-function preferences relative to the key. Returns bonus points by scale
 * type plus the pitch classes the function licenses (so the out-of-key penalty
 * does not fight a deliberate choice such as the altered scale over a minor V7).
 * @param {*} chord
 * @param {*} key a resolved keyInfo
 */
function keyFunction(chord, key) {
    const degree = mod12(chord.rootChroma - key.tonicChroma);
    const shape = chordShape(chord);
    const bonuses = new Map();
    const licensed = new Set();
    const prefer = (type, bonus) => bonuses.set(type, (bonuses.get(type) ?? 0) + bonus);

    if (shape.isHalfDim) {
        if (!key.profile.functionalHalfDim) {
            // Jazz colour: locrian #2 (melodic minor) wherever the
            // half-diminished chord sits, with locrian as the alternative.
            prefer('locrian #2', 6);
            prefer('locrian', 2);
            for (const type of ['locrian #2', 'locrian'])
                for (const pc of scalePitchClasses(chord.root, type))
                    licensed.add(pc);
        }
        else if (degree === 2 && key.isMinor) {
            // Minor-key iiø: locrian #2 is the jazz default, with locrian as
            // the diatonic alternative; license both.
            prefer('locrian #2', 8);
            prefer('locrian', 2);
            for (const type of ['locrian #2', 'locrian'])
                for (const pc of scalePitchClasses(chord.root, type))
                    licensed.add(pc);
        }
        else if (degree === 11 && key.isMajor) {
            // Major-key viiø is the diatonic locrian chord.
            prefer('locrian', 8);
        }
        else
            prefer('locrian #2', 2);
    }

    if (shape.isDominant) {
        if (degree === 7 && key.isMinor) {
            // Minor-key V7 is chromatic; prefer the melodic/harmonic minor
            // colours over plain mixolydian. A chord with a #9 or #5 is an
            // altered dominant and takes the altered scale; otherwise phrygian
            // dominant (harmonic minor) is the default. These scales carry the
            // b6, b7 and altered tensions that the key licenses; lydian
            // dominant (#11) stays unlicensed because its bright colour is not
            // idiomatic over the minor-key dominant.
            const alteredChord = chord.intervals.includes(3) || chord.intervals.includes(8);
            const bonuses = alteredChord
                ? [['altered', 16], ['phrygian dominant', 8], ['half-whole diminished', 8], ['mixolydian b6', 5], ['lydian dominant', 4]]
                : [['phrygian dominant', 12], ['altered', 10], ['half-whole diminished', 8], ['mixolydian b6', 6], ['lydian dominant', 4]];
            for (const [type, bonus] of bonuses)
                prefer(type, bonus);
            for (const type of ['altered', 'phrygian dominant'])
                for (const pc of scalePitchClasses(chord.root, type))
                    licensed.add(pc);
        }
        if (degree === 1) {
            // bII7 is the tritone substitute; lydian dominant is the idiomatic
            // scale because it keeps the #11 on the substituted root.
            prefer('lydian dominant', 6);
            for (const pc of scalePitchClasses(chord.root, 'lydian dominant'))
                licensed.add(pc);
        }
        if (degree === 10) {
            // bVII7 is the backdoor dominant.
            prefer('lydian dominant', 4);
            for (const pc of scalePitchClasses(chord.root, 'lydian dominant'))
                licensed.add(pc);
        }
    }

    if (key.profile.tonicMajor && shape.isMajorQuality && !shape.isDominant && degree === 0 && key.isMajor)
        prefer('major', 4);

    if (key.profile.ivLydian && shape.majorThird && !shape.isDominant) {
        // IV, bVI and bIII major chords take lydian colour (their #11 is in
        // the key) in the jazz and adventurous profiles; in a minor key the
        // Neapolitan bIImaj7 is the lydian chord.
        if (key.isMajor && [3, 5, 8].includes(degree))
            prefer('lydian', 3);
        else if (key.isMinor && degree === 1)
            prefer('lydian', 6);
    }

    if (shape.majorThird && !shape.isDominant && !shape.hasMajor7 && key.isMinor && degree === 10) {
        // bVII major (the Andalusian / natural-minor VII) is mixolydian, whose
        // notes are the natural minor set.
        prefer('mixolydian', 3);
    }

    if (shape.minorThird && shape.hasMinor7 && !shape.isHalfDim && key.isMajor && degree === 4) {
        // iii7 in a major key: the diatonic phrygian mode has an avoid note on
        // the b9, so nudge the idiomatic aeolian/dorian choices back in front of
        // the sparse pentatonic, which the in-key test alone would favour.
        prefer('aeolian', 3);
        prefer('dorian', 3);
    }

    return { bonuses, licensed, degree };
}

/** @param {Set<number>} relSet */
function familyOf(relSet) {
    for (const family of FAMILY_SETS) {
        if (!family.set || family.set.size !== relSet.size)
            continue;
        for (let rotation = 0; rotation < 12; rotation++) {
            const matches = [...relSet].every((degree) => family.set.has(mod12(degree + rotation)));
            if (matches)
                return family;
        }
    }
    return EXOTIC;
}

/** @param {string} name */
function rootFromName(name) {
    if (!name || typeof name !== 'string')
        return undefined;
    const match = name.match(/^([A-Ga-g][#b]{0,2})/);
    return match ? match[1] : undefined;
}

/** @param {string} symbol */
export function isValidChordSymbol(symbol) {
    if (!symbol || typeof symbol !== 'string')
        return false;
    const [name] = removeBassSlash(symbol);
    return !Tonal.Chord.get(name).empty;
}

/** @param {*} chordObj */
function buildFromChordObj(chordObj, bass) {
    const root = chordObj.tonic;
    const rootChroma = chromaOf(root);
    if (rootChroma === undefined)
        return undefined;
    const notePcs = [...new Set(chordObj.notes.map(chromaOf).filter((c) => c !== undefined))];
    const intervals = [...new Set(chordObj.intervals.map((i) => mod12(Tonal.Interval.semitones(i))))].sort((a, b) => a - b);
    return {
        symbol: chordObj.symbol,
        root,
        rootChroma,
        notePcs,
        intervals,
        quality: chordObj.quality,
        type: chordObj.type,
        bass,
        resolvedFrom: 'symbol',
    };
}

/** @param {Array<number|string>} notes @param {number} rootChroma @param {string|undefined} symbol */
function buildGeneric(notes, rootChroma, symbol) {
    const notePcs = [...new Set(notes.map((n) => typeof n === 'number' ? n : chromaOf(n)).filter((c) => c !== undefined))];
    const rootName = PC_NAMES[mod12(rootChroma)];
    const intervals = notePcs.map((p) => mod12(p - rootChroma)).sort((a, b) => a - b);
    return {
        symbol,
        root: rootName,
        rootChroma,
        notePcs,
        intervals,
        quality: 'Unknown',
        type: 'unknown',
        bass: undefined,
        resolvedFrom: 'notes',
    };
}

/**
 * Whether a generic chord built on a root has a recognisable shell: a third
 * (major or minor) and a seventh (major or minor). A rootless voicing such as
 * a rootless G7b9 keeps both, so the symbol root can be trusted; a stale or
 * mislabelled root, for example a custom chord name that was transposed
 * without its root, usually produces a shell-less set of intervals.
 * @param {Array<number>} intervals semitone offsets from the root
 */
function hasChordShell(intervals) {
    const hasThird = intervals.includes(3) || intervals.includes(4);
    const hasSeventh = intervals.includes(10) || intervals.includes(11);
    return hasThird && hasSeventh;
}

/**
 * An explicit root declared by the chord identifier (a root hint or a chord
 * name such as a custom voicing). The human-readable project name is not used,
 * so names like "Chord 1 from midi" are not mistaken for a C chord.
 *
 * A `rootHint` is always trusted because it is declared deliberately. A root
 * read from a custom symbol is only trusted when it is among the sounding
 * notes, or when those notes make a recognisable chord shell on it (a
 * rootless voicing). Otherwise the name is stale or misleading and the notes
 * are left to speak for themselves.
 * @param {Array<number>} pcs @param {Set<number>} pcSet @param {*} hints
 */
function explicitRootChroma(pcs, pcSet, hints) {
    if (hints.rootHint) {
        const declared = chromaOf(hints.rootHint);
        if (declared !== undefined)
            return declared;
    }
    const named = rootFromName(hints.symbol);
    if (!named)
        return undefined;
    const chroma = chromaOf(named);
    if (chroma === undefined)
        return undefined;
    if (pcSet.has(chroma) || hasChordShell(buildGeneric(pcs, chroma, undefined).intervals))
        return chroma;
    return undefined;
}

/** @param {*} hints */
function hintChroma(hints) {
    for (const hint of [hints.bass, hints.bassNote]) {
        if (!hint)
            continue;
        const chroma = chromaOf(hint);
        if (chroma !== undefined)
            return chroma;
    }
    return undefined;
}

/** @param {string} symbol @param {string} [bass] */
function resolveFromSymbol(symbol, bass) {
    const [name, symbolBass] = removeBassSlash(symbol);
    const chordObj = Tonal.Chord.get(name);
    if (chordObj.empty)
        return undefined;
    return buildFromChordObj(chordObj, bass ?? symbolBass);
}

/** @param {Array<string>} notes @param {*} hints */
function resolveFromNotes(notes, hints) {
    const pcs = notes.map((n) => chromaOf(n)).filter((c) => c !== undefined);
    if (pcs.length === 0)
        return undefined;
    const pcSet = new Set(pcs);
    const explicitHint = explicitRootChroma(pcs, pcSet, hints);
    const hint = explicitHint ?? hintChroma(hints);
    const pcsWithoutOctave = notes.map((n) => Tonal.Note.get(n).pc).filter(Boolean);
    const detections = Tonal.Chord.detect(pcsWithoutOctave);
    let chosen;
    for (const symbol of detections) {
        const [name] = removeBassSlash(symbol);
        const chordObj = Tonal.Chord.get(name);
        if (!chordObj.empty && hint !== undefined && chromaOf(chordObj.tonic) === hint) {
            chosen = chordObj;
            break;
        }
    }

    // A named chord identifier is authoritative, including for rootless
    // voicings where the root is not among the sounding notes.
    if (explicitHint !== undefined) {
        if (chosen)
            return buildFromChordObj(chosen, hints.bass ?? hints.bassNote);
        return buildGeneric(pcs, explicitHint, detections[0]);
    }

    // A hint that is not among the sounding notes describes a rootless voicing
    // (or an inversion), so the hint is the root to use.
    if (hint !== undefined && !pcSet.has(hint))
        return buildGeneric(pcs, hint, detections[0]);

    if (!chosen && detections.length > 0) {
        const [name] = removeBassSlash(detections[0]);
        const chordObj = Tonal.Chord.get(name);
        if (!chordObj.empty)
            chosen = chordObj;
    }

    if (chosen)
        return buildFromChordObj(chosen, hints.bass ?? hints.bassNote);

    const fallbackRoot = hint !== undefined ? hint : pcs[0];
    return buildGeneric(pcs, fallbackRoot, detections[0]);
}

/**
 * Resolve any chord description into a normalised chord.
 * @param {string|{symbol?:string,notes?:Array<string>,bass?:string,bassNote?:string,name?:string,rootHint?:string}} input
 */
export function resolveChord(input) {
    if (typeof input === 'string')
        return resolveFromSymbol(input);
    if (!input)
        return undefined;
    const notes = input.notes && input.notes.length > 0 ? input.notes : undefined;
    if (input.symbol && isValidChordSymbol(input.symbol)) {
        const resolved = resolveFromSymbol(input.symbol, input.bass ?? input.bassNote);
        if (resolved) {
            if (!notes)
                return resolved;
            const voicedPcs = [...new Set(notes.map((note) => chromaOf(note)).filter((chroma) => chroma !== undefined))];
            const coversVoicing = voicedPcs.every((chroma) => resolved.notePcs.includes(chroma));
            if (coversVoicing)
                return resolved;
            // The symbol and the voicing disagree. The notes that actually
            // sound are authoritative, and the symbol supplies the root.
            const generic = buildGeneric(voicedPcs, resolved.rootChroma, input.symbol);
            generic.mismatch = { symbol: input.symbol, symbolNotes: resolved.notePcs, voicedNotes: voicedPcs };
            // When the symbol root and the voiced notes are too far apart to be
            // the same chord written differently (for example a custom name
            // transposed without its root), resolve from the notes alone and
            // keep the mismatch for reporting.
            if (hasChordShell(generic.intervals))
                return generic;
            return resolveFromNotes(notes, { ...input, symbol: undefined }) ?? generic;
        }
    }
    if (notes)
        return resolveFromNotes(notes, input);
    if (input.symbol)
        return resolveFromNotes([input.symbol], input);
    return undefined;
}

/**
 * Report when a valid chord symbol omits notes that are actually voiced.
 * @param {*} input
 */
export function chordSymbolVoicingMismatch(input) {
    const chord = resolveChord(input);
    return chord && chord.mismatch ? chord.mismatch : undefined;
}

/** @param {number} r @param {*} shape */
function coverageWeight(r, shape) {
    if (r === 0) return 40;
    if (r === 3) return shape.isDominant ? 8 : 30;
    if (r === 4) return 30;
    if (r === 10 || r === 11) return 20;
    if (r === 6 || r === 7 || r === 8) return 10;
    return 8;
}

/** @param {number} r @param {*} shape */
function missingWeight(r, shape) {
    if (r === 0) return 50;
    if (r === 3) return shape.isDominant ? 6 : 40;
    if (r === 4) return 40;
    if (r === 10 || r === 11) return 30;
    if (r === 6) return shape.isMajorQuality && !shape.isHalfDim ? 6 : 12;
    if (r === 7) return 12;
    if (r === 8) return 6;
    return 6;
}

/** @param {*} chord */
function chordShape(chord) {
    const has = (r) => chord.intervals.includes(r);
    const majorThird = has(4);
    const minorThird = has(3) && !majorThird;
    return {
        has,
        third: majorThird ? 4 : (minorThird ? 3 : undefined),
        seventh: has(11) ? 11 : (has(10) ? 10 : undefined),
        majorThird,
        minorThird,
        hasMinor7: has(10),
        hasMajor7: has(11),
        isDominant: majorThird && has(10),
        hasSharpEleven: has(6),
        isHalfDim: minorThird && has(6) && has(10),
        isDim7: minorThird && has(6) && has(9),
        isAug: majorThird && has(8),
        isSus: !majorThird && !minorThird,
        isMajorQuality: majorThird,
        isMinorQuality: minorThird,
    };
}

/** @param {*} shape */
function isSymmetric(shape) {
    return shape.isDim7 || shape.isAug;
}

/** @param {number} srel @param {*} chord @param {*} shape */
function avoidPenalty(srel, chord, shape) {
    if (chord.intervals.includes(srel) || isSymmetric(shape))
        return 0;
    let penalty = 0;
    for (const c of chord.intervals) {
        const d = mod12(srel - c);
        if (d === 1) {
            if (c === 0)
                penalty += shape.isDominant ? 4 : (shape.isHalfDim ? 4 : 12);
            else if (c === shape.third)
                // The natural 11 over a major third is the textbook avoid note,
                // but for a plain major chord it is a passing tone, so only
                // penalise it when the chord actually contains a sharp 11.
                penalty += shape.isMajorQuality ? (shape.isDominant ? 0 : (shape.hasSharpEleven ? 6 : 0)) : 6;
            else if (c === shape.seventh)
                penalty += 0;
            else if (c === 6 || c === 7 || c === 8)
                penalty += 0;
            else
                penalty += 4;
        }
        if (d === 11 && c === 0 && shape.isDominant)
            penalty += 10;
        if (d === 11 && c === shape.third && shape.isMajorQuality && !shape.isDominant)
            penalty += 12;
    }
    return penalty;
}

/** @param {string} type @param {*} shape */
function conventionBonus(type, shape) {
    let bonus = 0;
    if (shape.isDominant && type === 'mixolydian') bonus += 3;
    if (shape.isDominant && type === 'lydian dominant') bonus += 3;
    if (shape.isSus && type === 'mixolydian') bonus += 3;
    if (shape.majorThird && !shape.isDominant && type === 'major') bonus += shape.hasSharpEleven ? 3 : 6;
    if (shape.majorThird && !shape.isDominant && type === 'lydian') bonus += shape.hasSharpEleven ? 6 : 3;
    if (shape.minorThird && shape.hasMinor7 && !shape.isHalfDim && type === 'dorian') bonus += 3;
    if (shape.minorThird && shape.hasMajor7 && type === 'melodic minor') bonus += 3;
    if (shape.isHalfDim && type === 'locrian #2') bonus += 3;
    if (shape.isHalfDim && type === 'locrian') bonus += 3;
    if (shape.isDim7 && type === 'diminished') bonus += 3;
    if (shape.isAug && (type === 'whole tone' || type === 'augmented' || type === 'lydian augmented')) bonus += 5;
    return bonus;
}

/**
 * @param {Set<number>} relSet @param {*} chord @param {*} family @param {string} type
 * @param {*} [key] resolved keyInfo @param {*} [fn] keyFunction(chord, key)
 */
function scoreScale(relSet, chord, family, type, key, fn) {
    const shape = chordShape(chord);
    let score = 0;

    for (const interval of chord.intervals) {
        if (relSet.has(interval))
            score += coverageWeight(interval, shape);
        else
            score -= missingWeight(interval, shape);
    }

    for (const interval of chord.intervals) {
        const isColour = interval === 1 || interval === 6 || interval === 8 || (interval === 3 && shape.isDominant);
        if (isColour && relSet.has(interval))
            score += 4;
    }

    for (const srel of relSet)
        score -= avoidPenalty(srel, chord, shape);

    score += family.weight;
    score += TYPE_PRIORITY.get(type) ?? -8;
    score += conventionBonus(type, shape);

    if (key && fn) {
        const profile = key.profile;
        const absolutePcs = new Set([...relSet].map((srel) => mod12(chord.rootChroma + srel)));
        if (setsEqual(absolutePcs, key.pcs))
            score += profile.inKeyBonus;
        else if (setIsSubset(absolutePcs, key.pcs))
            score += profile.subsetBonus;
        for (const pc of absolutePcs) {
            const srel = mod12(pc - chord.rootChroma);
            if (!key.pcs.has(pc) && !chord.intervals.includes(srel) && !fn.licensed.has(pc))
                score -= profile.outOfKeyPenalty;
        }
        score += fn.bonuses.get(type) ?? 0;
        score += colourBonus(type, shape, profile);
    }

    return score;
}

/** @param {*} chord @param {{tonic?:string, type?:string, colour?:string}|string} [key] */
function allSuggestions(chord, key) {
    const resolvedKey = keyInfo(key);
    const fn = resolvedKey ? keyFunction(chord, resolvedKey) : undefined;
    const suggestions = [];
    for (const scaleType of Tonal.ScaleType.all()) {
        const scale = Tonal.Scale.get(`${chord.root} ${scaleType.name}`);
        if (scale.empty || !scale.notes || scale.notes.length === 0)
            continue;
        const relSet = new Set(scale.notes.map((n) => mod12(chromaOf(n) - chord.rootChroma)));
        if (relSet.size < 2)
            continue;
        const family = familyOf(relSet);
        suggestions.push({
            name: `${scale.tonic} ${scale.type}`,
            type: scale.type,
            family: family.name,
            score: scoreScale(relSet, chord, family, scale.type, resolvedKey, fn),
            notes: scale.notes.map((n) => Tonal.Note.simplify(n)),
            relSet,
        });
    }
    suggestions.sort((a, b) => b.score - a.score);
    return suggestions;
}

/**
 * All candidate scales for a chord, best first, before duplicate removal and
 * diversity adjustment. Intended for debugging and documentation.
 * @param {*} input chord symbol, notes plus hints, or a chord object
 * @param {{tonic?:string, type?:string, colour?:string}|string} [key] optional project key context
 */
export function allRankedSuggestions(input, key) {
    const chord = resolveChord(input);
    if (!chord)
        return [];
    return allSuggestions(chord, key);
}

/**
 * Rank the scales that fit a chord, best first, with duplicate pitch sets removed
 * and a gentle bias against repeating the same scale family.
 * @param {*} input chord symbol, notes plus hints, or a chord object
 * @param {number} count how many suggestions to return
 * @param {{tonic?:string, type?:string, colour?:string}|string} [key] optional project key context
 */
export function rankScales(input, count = 3, key) {
    const chord = resolveChord(input);
    if (!chord)
        return [];
    const suggestions = allSuggestions(chord, key);
    const seen = new Set();
    const working = [];
    for (const suggestion of suggestions) {
        const key = [...suggestion.relSet].sort((a, b) => a - b).join(',');
        if (seen.has(key))
            continue;
        seen.add(key);
        working.push(suggestion);
    }
    working.sort((a, b) => b.score - a.score);
    return working.slice(0, count);
}

/** @param {*} input @param {number} count @param {{tonic?:string, type?:string, colour?:string}|string} [key] */
export function chordScaleNamesFor(input, count = 3, key) {
    return rankScales(input, count, key).map((suggestion) => suggestion.name);
}

/** @param {*} input @param {number} variation 1-based @param {{tonic?:string, type?:string, colour?:string}|string} [key] */
export function chordScaleNameFor(input, variation = 1, key) {
    const names = chordScaleNamesFor(input, Math.max(variation, 1), key);
    return names[variation - 1] ?? '';
}

/** @param {*} input @param {{tonic?:string, type?:string, colour?:string}|string} [key] */
export function compatibleScaleTypesFor(input, key) {
    const chord = resolveChord(input);
    if (!chord)
        return [];
    return allSuggestions(chord, key)
        .filter((suggestion) => chord.intervals.every((interval) => suggestion.relSet.has(interval)))
        .map((suggestion) => suggestion.type);
}

/** @param {*} input */
export function chordDescription(input) {
    const chord = resolveChord(input);
    if (!chord)
        return '';
    const [name] = removeBassSlash(chord.symbol ?? '');
    return name;
}

const JAZZ_COLOUR_TYPES = new Set(['dorian', 'locrian #2', 'lydian']);
const ADVENTUROUS_COLOUR_TYPES = new Set(['lydian', 'lydian dominant', 'dorian', 'locrian #2']);

/**
 * A tiny label for a stored scale in the chord/scale grid: the notes that fall
 * outside the project key, and whether the scale is a colour choice of the
 * active jazz or adventurous profile (diatonic has no colour label).
 * @param {*} input chord symbol, notes plus hints, or a chord object
 * @param {string} scaleName
 * @param {{tonic?:string,type?:string,colour?:string}|string} [key] optional project key context
 * @returns {{outOfKey: Array<string>, colour: string|null}}
 */
export function scaleAnnotation(input, scaleName, key) {
    const resolved = keyInfo(key);
    const result = checkScaleAgainstChord(input, scaleName, key);
    let colour = null;
    if (resolved && resolved.colour !== 'diatonic') {
        const scale = Tonal.Scale.get(scaleName);
        const types = resolved.colour === 'adventurous' ? ADVENTUROUS_COLOUR_TYPES : JAZZ_COLOUR_TYPES;
        if (!scale.empty && types.has(scale.type))
            colour = resolved.colour;
    }
    return { outOfKey: result.outOfKey ?? [], colour };
}

/**
 * Check a stored scale name against a chord description. This is stricter than
 * the ranking: it only reports guide-tone omissions and hard semitone clashes,
 * so deliberate modal colour scales are not flagged.
 *
 * With a key context, out-of-key colour notes are reported separately in
 * `outOfKey`; they do not make `ok` false, because chromatic colour is often
 * deliberate (secondary dominants, borrowed chords, altered tensions).
 * @param {*} input
 * @param {string} scaleName
 * @param {{tonic?:string, type?:string, colour?:string}|string} [key] optional project key context
 * @returns {{ok:boolean, missing:Array<number>, missingEssential:Array<number>, avoid:Array<{degree:number, related:number, penalty:number}>, outOfKey:Array<string>, reasons:Array<string>}}
 */
export function checkScaleAgainstChord(input, scaleName, key) {
    const chord = resolveChord(input);
    if (!chord)
        return { ok: false, missing: [], missingEssential: [], avoid: [], outOfKey: [], reasons: ['could not resolve chord'] };
    const scale = Tonal.Scale.get(scaleName);
    if (scale.empty)
        return { ok: false, missing: [], missingEssential: [], avoid: [], outOfKey: [], reasons: ['unknown scale'] };
    const relSet = new Set(scale.notes.map((n) => mod12(chromaOf(n) - chord.rootChroma)));
    const shape = chordShape(chord);
    const missing = chord.intervals.filter((interval) => !relSet.has(interval));
    const sparse = relSet.size <= 5;
    const essentials = new Set([0]);
    if (shape.third !== undefined)
        essentials.add(shape.third);
    if (shape.seventh !== undefined)
        essentials.add(shape.seventh);
    const missingEssential = sparse ? [] : missing.filter((interval) => essentials.has(interval));
    const avoid = [];
    for (const srel of relSet) {
        const penalty = avoidPenalty(srel, chord, shape);
        if (penalty < 7)
            continue;
        const related = chord.intervals.find((interval) => mod12(srel - interval) === 1)
            ?? chord.intervals.find((interval) => mod12(srel - interval) === 11);
        if (related === undefined || !(related === 0 || related === shape.third || related === shape.seventh))
            continue;
        avoid.push({ degree: srel, related, penalty });
    }
    const reasons = [];
    if (missingEssential.length > 0)
        reasons.push(`missing guide tones at semitones: ${missingEssential.join(', ')}`);
    if (avoid.length > 0)
        reasons.push(`hard semitone clash on semitones: ${avoid.map((a) => a.degree).join(', ')}`);

    const outOfKey = [];
    const resolvedKey = keyInfo(key);
    if (resolvedKey) {
        const fn = keyFunction(chord, resolvedKey);
        for (const note of scale.notes) {
            const pc = chromaOf(note);
            if (pc === undefined || resolvedKey.pcs.has(pc) || chord.notePcs.includes(pc) || fn.licensed.has(pc))
                continue;
            outOfKey.push(Tonal.Note.simplify(note));
        }
    }
    return { ok: missingEssential.length === 0 && avoid.length === 0, missing, missingEssential, avoid, outOfKey, reasons };
}
