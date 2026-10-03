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
 * An explicit root declared by the chord identifier (a root hint or a chord
 * name such as a custom voicing). The human-readable project name is not used,
 * so names like "Chord 1 from midi" are not mistaken for a C chord.
 * @param {*} hints
 */
function explicitRootChroma(hints) {
    for (const hint of [hints.rootHint, rootFromName(hints.symbol)]) {
        if (!hint)
            continue;
        const chroma = chromaOf(hint);
        if (chroma !== undefined)
            return chroma;
    }
    return undefined;
}

/** @param {*} hints */
function hintChroma(hints) {
    for (const hint of [hints.rootHint, hints.bass, hints.bassNote, rootFromName(hints.symbol)]) {
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
    const explicitHint = explicitRootChroma(hints);
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
            return generic;
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

/** @param {Set<number>} relSet @param {*} chord @param {*} family @param {string} type */
function scoreScale(relSet, chord, family, type) {
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

    return score;
}

/** @param {*} chord */
function allSuggestions(chord) {
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
            score: scoreScale(relSet, chord, family, scale.type),
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
 */
export function allRankedSuggestions(input) {
    const chord = resolveChord(input);
    if (!chord)
        return [];
    return allSuggestions(chord);
}

/**
 * Rank the scales that fit a chord, best first, with duplicate pitch sets removed
 * and a gentle bias against repeating the same scale family.
 * @param {*} input chord symbol, notes plus hints, or a chord object
 * @param {number} count how many suggestions to return
 */
export function rankScales(input, count = 3) {
    const chord = resolveChord(input);
    if (!chord)
        return [];
    const suggestions = allSuggestions(chord);
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

/** @param {*} input @param {number} count */
export function chordScaleNamesFor(input, count = 3) {
    return rankScales(input, count).map((suggestion) => suggestion.name);
}

/** @param {*} input @param {number} variation 1-based */
export function chordScaleNameFor(input, variation = 1) {
    const names = chordScaleNamesFor(input, Math.max(variation, 1));
    return names[variation - 1] ?? '';
}

/** @param {*} input */
export function compatibleScaleTypesFor(input) {
    const chord = resolveChord(input);
    if (!chord)
        return [];
    return allSuggestions(chord)
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

/**
 * Check a stored scale name against a chord description. This is stricter than
 * the ranking: it only reports guide-tone omissions and hard semitone clashes,
 * so deliberate modal colour scales are not flagged.
 * @param {*} input
 * @param {string} scaleName
 * @returns {{ok:boolean, missing:Array<number>, missingEssential:Array<number>, avoid:Array<{degree:number, related:number, penalty:number}>, reasons:Array<string>}}
 */
export function checkScaleAgainstChord(input, scaleName) {
    const chord = resolveChord(input);
    if (!chord)
        return { ok: false, missing: [], missingEssential: [], avoid: [], reasons: ['could not resolve chord'] };
    const scale = Tonal.Scale.get(scaleName);
    if (scale.empty)
        return { ok: false, missing: [], missingEssential: [], avoid: [], reasons: ['unknown scale'] };
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
    return { ok: missingEssential.length === 0 && avoid.length === 0, missing, missingEssential, avoid, reasons };
}
