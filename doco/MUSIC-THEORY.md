# Music Theory Behind Chord-Scale Matching

This document explains how OneKeyJam decides which scales fit a chord, and why.
The implementation lives in `src/lib/chordScaleEngine.js`; this file is the
reference for the theory it encodes.

## The premise

When you trigger a chord, the right hand is filtered to a scale. The scale
should sound like it belongs to the chord: it should contain the chord's
defining notes, avoid notes that fight the chord, and stay close to the
idioms of jazz and popular music. The old implementation did not do this
reliably, for three reasons:

1. **It trusted chord detection too much.** `Tonal.Chord.detect()` guesses
   chord symbols from a voicing, and the first guess is often a different root
   or quality. A rootless Dm7b5 voicing (F, Ab, C, D) is detected as `Fm6`
   first; an Eb6-sounding Cm7 voicing (Eb, G, Bb, C) is detected as `Eb6`
   first. Scales were then computed for the wrong chord.
2. **It used a mathematical superset test as a musical recommendation.**
   `Tonal.Chord.chordScales()` returns every scale whose pitch-class set
   contains the chord's notes, including Persian, Balinese, Hungarian major,
   Messiaen modes and chromatic. These were hand-sorted into positional lists,
   so slots two and three often offered obscure or avoid-note-laden scales.
3. **It had no theory model.** There was no notion of guide tones, avoid
   notes, chord function or scale family, so a scale that merely contained the
   chord tones could outrank the idiomatic choice.

The replacement is a general engine: no chord-to-scale lookup table. It builds
candidate scales from Tonal's scale dictionary rooted on the chord and ranks
them with interval theory. Any chord works, including unusual or imported
ones; the engine degrades to the best partial matches instead of failing.

## Chord resolution

The first job is to know the chord's root, pitch-class set and intervals
relative to the root.

- A valid chord symbol (for example `G7b9`, `Dm7b5`) is trusted via
  `Tonal.Chord.get()`, but only when it contains every note of the voicing.
  Symbols like `Dø7` or custom voicing names (`Dm7b5ChordNicerVoicing`) are
  not Tonal symbols, so the engine falls back to the voicing notes.
- **The sounding voicing is authoritative.** If a symbol and a voicing
  disagree, the notes that actually play win and the symbol only supplies the
  root. For example, a chord labelled `G7alt` but voiced F-Ab-B-D contains an
  Ab and a D that Tonal's altered chord does not; the engine roots a G chord
  on the four sounding notes instead, so the suggested scales fit what is
  heard rather than the label. This case is reported by
  `chordSymbolVoicingMismatch()`.
- When only notes are available, the engine runs `Tonal.Chord.detect()` and
  chooses the detected symbol whose root matches a hint. Hints come from, in
  order: an explicit root hint, the chord identifier (a symbol or a custom
  voicing name), the bass note, or the first note of the voicing. The
  human-readable project name is deliberately not used, so a name such as
  "Chord 1 from midi" is not mistaken for a C chord.
- **Rootless voicings are re-rooted on a hint that is not among the notes.**
  A rootless `G7b9` voicing (F, Ab, B, D) resolves to a G-rooted chord, and a
  rootless Cm(maj9) voicing (Eb, G, B, D) resolves to a C-rooted chord. This is
  also what handles symmetric diminished and augmented chords, where any of the
  notes can act as the root.
- If nothing resolves, the engine builds a generic chord from the note set so
  that something sensible is always returned.

## Candidate scales

Every scale type in Tonal's dictionary (about 92) is generated on the chord
root, for example `D locrian #2` or `G altered`. Names are therefore always
anchored to the chord, which is what the piano roll and scale picker display.
Each candidate is reduced to a set of semitone offsets from the root, called
its relative set.

## Scale families

Each candidate's pitch-class set is matched against rotations of a set of
canonical parent scales. This classifies, for example, `D locrian #2` as a
mode of melodic minor and `G altered` as another mode of the same parent. The
families and their weights are:

| Family | Reference scale | Weight |
|---|---|---|
| major | major / ionian | 15 |
| melodic minor | melodic minor (jazz minor) | 11 |
| harmonic minor | harmonic minor | 10 |
| harmonic major | harmonic major | 9 |
| double harmonic | double harmonic major | 4 |
| diminished | whole-half / octatonic | 10 |
| whole tone | whole tone | 7 |
| augmented | augmented | 7 |
| major pentatonic | major pentatonic | 11 |
| minor pentatonic | minor pentatonic | 11 |
| major blues | major blues | 10 |
| minor blues | minor blues | 10 |
| bebop | bebop dominant | 4 |
| bebop major | bebop major | 4 |
| bebop minor | dorian bebop | 4 |
| exotic | anything else | -10 |

A rotation match means the candidate is a mode of that parent. The octatonic
"whole-half" and "half-whole" scales are modes of one another, so both land in
the diminished family.

## Scale type priority

Family alone is not enough: a mode can belong to a good family yet be an
unusual choice. `C lydian #9` is the sixth mode of harmonic minor and contains
every note of a Cm6 chord, but it also contains both Eb and E natural, and no
one reaches for it over a minor sixth chord. Conversely `C locrian #2` and
`C altered` are standard jazz choices.

To capture this, scale types are placed in tiers of recognised practice:

- **Tier 1 (+6)**: major, dorian, mixolydian, lydian, aeolian, melodic minor,
  lydian dominant, altered, locrian #2, phrygian dominant, harmonic minor,
  diminished, half-whole diminished, whole tone, augmented, major and minor
  pentatonic, major and minor blues.
- **Tier 2 (+3)**: phrygian, locrian, harmonic major, lydian augmented,
  mixolydian b6, dorian b2, locrian 6, dorian #4, ultralocrian, major
  augmented, the named pentatonic variants, minor hexatonic, minor six
  diminished, and the bebop scales.
- **All other names (-8)**: exotic ragas, Messiaen modes, composite blues,
  chromatic, and the rare named modes. They are not banned; they simply rank
  below recognised names, and they still appear when nothing better fits an
  unusual chord.

This is a weighting of scale names, not a chord-to-scale lookup. It is a
preference, not a gate.

## Scoring

Each candidate starts from the family weight and type priority, then receives:

### 1. Chord-tone coverage

Every chord interval present in the scale adds points; every missing interval
subtracts. The weights reflect structural importance:

| Interval | Present | Missing |
|---|---|---|
| root | +40 | -50 |
| third (major or minor) | +30 | -40 |
| seventh (major or minor) | +20 | -30 |
| perfect fifth | +10 | -12 |
| flat fifth | +10 | -12 on half-diminished and diminished, -6 otherwise |
| sharp fifth | +10 | -6 |
| other extensions and alterations | +8 | -6 |

A dominant chord's minor third spelling (#9, e.g. Bb in C7#9) is treated as a
colour tone: present +8, missing -6, so an altered dominant is not punished for
offering a different combination of altered tensions. A major chord's `#11`
(the interval a tritone above the root) is also a colour tone: +10 present,
-6 missing, so `C major` remains a sensible alternative to `C lydian` over
Cmaj7#11.

### 2. Characteristic alteration bonus

If the chord itself contains an alteration (b9, #9, b5, #5), a scale that
contains that same note gains +4. `G7b9` therefore favours scales with Ab, and
`G7alt` favours scales with both the #9 and #5. The bonus is modest so that a
scale cannot buy its way to the top simply by stacking altered notes.

### 3. Avoid notes

An avoid note is a scale tone a semitone away from an important chord tone.
The engine penalises the relationships that genuinely sound wrong:

- A semitone above the root: -12 on major and minor chords (the b9), but only
  -4 on dominant chords, where the b9 is an available tension. Half-diminished
  chords get -4 because the b2 is the classic locrian avoid note but the scale
  is still idiomatic.
- A semitone above the third:
  - major third: -6 on major and maj7 chords that contain a #11, where the
    natural 11 fights the raised 11; 0 otherwise, because on a plain major
    chord the natural 11 is a passing tone and ionian stays the home scale;
    0 on dominant chords, where the natural 11 is common modal colour
    (mixolydian).
  - minor third: -6, because a major third above a minor third is a modal
    clash (Eb and E in C). This demotes scales such as lydian #9.
- A semitone below the major third on major and maj7 chords: -12 (the #9
  against the major third).
- A semitone below the root on dominant chords: -10, the major seventh against
  the dominant's minor seventh (B against C7, for example).
- Semitones around the fifth are not penalised, because the b6 over a minor
  chord (aeolian) and the #11 over a dominant (lydian dominant) are legitimate.
- Symmetric chords (dim7 and augmented) skip avoid-note penalties entirely,
  because the half-whole and whole-half diminished scales both contain notes
  that would otherwise be treated as clashes.

### 4. Conventional mode bonuses

Small bonuses settle near-ties in favour of idiomatic defaults:

- mixolydian and lydian dominant on dominant chords (+3 each)
- mixolydian on sus chords (+3)
- major on non-dominant major-quality chords without a #11 (+6)
- lydian on major-quality chords with a #11 (+6)
- dorian on m7 (+3)
- melodic minor on m(maj7) (+3)
- locrian #2 and locrian on half-diminished (+3 each)
- diminished on dim7 (+3)
- whole tone, augmented and lydian augmented on augmented chords (+5 each)

## Selection

Candidates are sorted by score, duplicate pitch sets are removed, and the top
three are returned. Because scores already separate the families, the result
is usually: the primary chord scale, a close alternative, and an accessible
colour scale. Typical outcomes:

| Chord | Primary | Second | Third |
|---|---|---|---|
| Cm7 | C dorian | C aeolian | C minor pentatonic |
| Cmaj7 | C major | C lydian | C harmonic major |
| Cmaj7#11 | C lydian | C major | C lydian augmented |
| C7 | C mixolydian | C lydian dominant | C mixolydian b6 |
| C7alt | C altered | C whole tone | C phrygian dominant |
| C7b9 | C phrygian dominant | C half-whole diminished | C mixolydian |
| Cm7b5 | C locrian #2 | C locrian | C minor blues |
| CmMaj7 | C melodic minor | C harmonic minor | C augmented |
| Cdim7 | C diminished | C half-whole diminished | C ultralocrian |
| Caug | C lydian augmented | C augmented | C whole tone |
| C13sus4 | C mixolydian | C dorian | C bebop |

The engine never returns empty for a resolvable chord. If no scale contains
every chord tone, the penalties simply produce the best partial matches.

## Checking stored scales

`checkScaleAgainstChord()` in the engine tests a stored scale name against a
chord and reports:

- **missing guide tones**: the root, the chord's actual third, or its seventh
  is absent. Five-note or smaller scales (pentatonics) are exempt, because
  sparse scales are intentionally chosen and are not expected to carry guide
  tones. Six-note blues scales are still checked, because C major blues over
  Dm7b5 or G7alt is a genuine mismatch.
- **hard semitone clashes**: the strong avoid-note relationships from the
  scoring rules above.

The report deliberately ignores soft avoid notes such as the natural 11 over a
major triad, so `C major` over a C chord is not flagged. It also skips
unresolvable chords.

Use it with:

```
npm run validate:scales            # warn-only report across public/projects
npm run regenerate:scales          # dry run the engine's replacements
npm run regenerate:scales -- --write
```

The regeneration script only touches the scale slots that fail the check, and
edits the JSON values in place so formatting is preserved. It skips projects
whose scales are deliberately shared across chords or used as teaching
examples; those are listed in `bin/regenerate-project-scales.mjs`.

## Worked examples

### C minor ii-V-i

The featured `C Minor II-V-I.json` used C major blues as the first scale for
every chord. C major blues is C D Eb E G A. Over Dm7b5 it adds A natural
against the chord's Ab and omits the third F; over G7 it omits B, F and Ab
entirely; over Cm(maj7) it adds E natural against Eb. That is the jarring
sound. The progression is a correct minor ii-V-i:

- Dø7 (Dm7b5), voiced F-Ab-C-D.
- G7alt, voiced F-Ab-B-Eb (a true altered shape: b7, b9, 3, b13).
- Cm(maj9), voiced Eb-G-B-D.

Both upper chords were once voiced so that the label and the sounding notes
disagreed, and the suggested scales followed the label:

- The V was labelled `G7alt` but voiced F-Ab-B-D, a G7b9 with a natural D.
  The altered scale replaces the D with an Eb, so the two rubbed a semitone
  apart. It is now voiced F-Ab-B-Eb so the altered scale fits.
- The i was voiced Eb-G-B-C, which puts the major 7th a minor 2nd under the
  root. It is now voiced Eb-G-B-D, a rootless Cm(maj9), which is smooth.

The engine now treats the sounding voicing as authoritative when it disagrees
with a symbol. The resulting scales are:

- Dm7b5: D locrian #2 (= F melodic minor), D locrian, F melodic minor.
- G7alt: G altered (= Ab melodic minor), G phrygian dominant, G whole tone.
- Cm(maj9): C melodic minor, C harmonic minor, C minor bebop.

### Tritone substitution

`C Major II-V-I.json` used G mixolydian over the Db7 tritone substitute of the
G7 chord, and F minor over the G7 itself. G mixolydian contains no Db and
clashes with the Db7's Cb; F minor has Bb against G7's B natural. The engine
replaces these with D mixolydian / Db lydian dominant and G lydian dominant
respectively.

### Why the same set can have two names

F melodic minor, D locrian #2 and Ab lydian dominant are all rotations of one
pitch-class set, and G altered and Ab melodic minor are rotations of another.
The app may show either the chord-rooted mode name or the parent-scale name,
depending on what was already stored in a project. They sound identical; the
chord-rooted name is usually easier to read against the chord, while the
parent-scale name is the traditional jazz short-hand ("play Ab melodic minor
over G7alt").

## References

- Mark Levine, *The Jazz Theory Book* - chord-scale relationships, avoid
  notes, and the melodic minor modes (altered, locrian #2, lydian dominant,
  lydian augmented, mixolydian b6, dorian b2).
- Mark Levine, *The Jazz Piano Book* - rootless and altered voicings.
- Puget Sound music theory pages on chord-scale relationships, linked in
  `doco/chord-scale-ref.md`.
- Tonal.js scale and chord dictionaries, which supply the note spellings and
  the scale types at runtime.

## Known limitations

- Context is per chord. The engine does not yet know that a chord is a iiø in
  C minor or a tritone substitute, so it cannot prefer locrian #2 over locrian
  for a iiø, or alter the V7 choice in a minor key. The existing key detection
  (`keyFromChords.js`, `keyDetection.js`) could feed this in later.
- Scale suggestions are always rooted on the chord. Traditional parent-scale
  names are not generated automatically; they survive only if a project stored
  them.
- The checker is intentionally forgiving about modal colour and sparse
  pentatonics, so it is a report, not a proof of good taste.
