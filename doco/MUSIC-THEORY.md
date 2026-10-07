# Music Theory Behind Chord-Scale Matching

This document explains how OneKeyJam decides which scales fit a chord, and why.
The implementation lives in `src/lib/chordScaleEngine.js`; this file is the
reference for the theory it encodes.

## The premise

When you trigger a chord, the right hand is filtered to a scale. The scale
should sound like it belongs to the chord: it should contain the chord's
defining notes, keep the conventional avoid relationships under control, and
stay close to the idioms of jazz and popular music. The engine exists because
the obvious shortcuts are not musical recommendations:

1. **Chord detection is a guess.** `Tonal.Chord.detect()` infers chord
   symbols from a voicing, and the first guess is often a different root or
   quality. A Dm7b5 voicing in an F-rooted shape (F, Ab, C, D) is detected as
   `Fm6` first; an Eb6-sounding Cm7 voicing (Eb, G, Bb, C) is detected as
   `Eb6` first. Trusting the first guess computes scales for the wrong chord.
2. **A mathematical superset test is not a musical recommendation.**
   `Tonal.Chord.chordScales()` returns every scale whose pitch-class set
   contains the chord's notes, including Persian, Balinese, Hungarian major,
   Messiaen modes and chromatic. Presenting that list in dictionary order puts
   obscure or avoid-note-laden scales in the top slots.
3. **Names alone are not a theory model.** Guide tones, avoid notes, chord
   function and scale family all matter, so a scale that merely contains the
   chord tones can outrank the idiomatic choice.

The engine therefore builds candidate scales from Tonal's scale dictionary
rooted on the chord and ranks them with interval theory: no per-chord lookup
table, but a weighted, theory-informed ranking with hand-tuned preferences.
Any chord works, including unusual or imported ones; the engine degrades to
the best partial matches instead of failing.

The engine also accepts an optional **project key**. The key does not replace
the chord scale; it is a bias. Key context fixes the cases where the same
chord has different idiomatic scales depending on its function (a iiø versus a
viiø, a major-key V7 versus a minor-key V7, a tritone substitute) and keeps
the runner-up suggestions close to the key. Without a key the engine ranks
each chord purely on its own shape.

## Chord resolution

The first job is to know the chord's root, pitch-class set and intervals
relative to the root.

- A valid chord symbol (for example `G7b9`, `Dm7b5`) is trusted via
  `Tonal.Chord.get()`, but only when it contains every note of the voicing.
  `Dø` parses (it is an alias of `m7b5`), but `Dø7` does not; symbols like
  `Dø7` and custom voicing names (`Dm7b5ChordNicerVoicing`) therefore fall
  back to the voicing notes.
- **The sounding voicing is authoritative** (a deliberate design decision).
  If a symbol and a voicing disagree, the notes that actually play win and the
  symbol only supplies the root. Tonal spells `7alt` as 1 3 #5 b7 #9, so
  `G7alt` is G B D# F A#; a chord labelled `G7alt` but voiced F-Ab-B-D sounds
  an Ab and a natural D that the symbol does not name. The engine roots a G
  chord on the four sounding notes instead, so the suggested scales fit what
  is heard rather than the label. The mismatch is reported by
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

## The project key

A project can declare its key in `options.key`:
`{ tonic, type, source }`. The model lives in `src/lib/projectKey.js`. The
`type` is a Tonal scale type, so it can be
`major`, `minor`, or a mode such as `dorian`; a modal tune is described
accurately rather than forced into major or minor. For example the classic
"So What" project is in `D dorian`, so its B natural is in the key.

When no key is declared the app detects one from the project's chords with the
same major/minor algorithm as the Key Detection section
(`keyFromChords.js`), and treats it as the default (`source: "detected"`).
The user can override it in the Key Detection section; the explicit value is
saved with the project. Detection is a hint, not a fact: relative major/minor
and blues progressions are ambiguous, and some tunes modulate, so a single
project key should stay a bias. Projects that change key mid-tune still get
correct chord-level scales for their out-of-key chords, because chord tones
are always licensed (see below).

Setting the key in the UI re-ranks every chord scale automatically (see
`src/lib/projectScaleSettings.js`), so the stored `scale1/2/3` always match
the declared key. The same happens when the colour preference changes.

### Colour preference

The key is a bias, and `options.colour` decides how hard it pushes. Function
rules (minor-key V7, tritone substitutes, backdoor dominants, the iiø default)
apply in every profile: they are about function, not taste.

- **diatonic** removes the colour bonuses and gives the in-key bonus its full
  weight, so dorian flattens to aeolian on m7 chords and locrian #2 flattens
  to locrian on most half-diminished chords. The functional iiø in a minor key
  is the exception: it keeps locrian #2 as its primary, because that colour is
  idiomatic for the chord's role (see Function preferences).
- **jazz** (the default) restores the idiomatic colour while the key still
  shapes the alternative scales: dorian on m7, locrian #2 on half-diminished,
  lydian on IV/bVI/bIII in a major key and on the Neapolitan bIImaj7 in a
  minor key, and mixolydian on the natural-minor bVII triad.
- **adventurous** prefers lydian on maj7 chords and lydian dominant on
  dominants, on top of the jazz choices.

## Candidate scales

Every scale type in Tonal's scale dictionary (92 in the pinned version) is
generated on the chord root, for example `D locrian #2` or `G altered`. Names
are therefore always anchored to the chord, which is what the piano roll and
scale picker display. Each candidate is reduced to a set of semitone offsets
from the root, called its relative set.

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
| bebop | bebop | 4 |
| bebop major | bebop major | 4 |
| bebop minor | bebop minor | 4 |
| exotic | anything else | -10 |

A rotation match means the candidate is a mode of that parent. The octatonic
"whole-half" and "half-whole" scales are modes of one another, so both land in
the diminished family. Tonal's `bebop` scale is the dominant bebop scale, and
its `bebop minor` scale is the one often called dorian bebop.

## Scale type priority

Family alone is not enough: a mode can belong to a good family yet be an
unusual choice. `C lydian #9` is the sixth mode of harmonic minor and contains
every note of a Cm6 chord, but it also contains both Eb and E natural, and it
is rarely chosen over a minor sixth chord. Conversely `C locrian #2` and
`C altered` are standard jazz choices.

To capture this, scale types are placed in tiers of recognised practice:

- **Tier 1 (+6)**: major, dorian, mixolydian, lydian, aeolian, melodic minor,
  lydian dominant, altered, locrian #2, phrygian dominant, harmonic minor,
  diminished, half-whole diminished, whole tone, augmented, major and minor
  pentatonic, major and minor blues.
- **Tier 2 (+3)**: phrygian, locrian, harmonic major, lydian augmented,
  mixolydian b6, dorian b2, locrian 6, dorian #4, ultralocrian, major
  augmented, the named pentatonic variants, minor hexatonic, minor six
  diminished, and the bebop types (`bebop`, `bebop major`, `bebop minor`,
  `minor bebop`).
- **All other names (-8)**: exotic ragas, Messiaen modes, composite blues,
  chromatic, and the rare named modes. They are not banned; they simply rank
  below recognised names, and they still appear when nothing better fits an
  unusual chord.

The family weights, tier bonuses and function bonuses are engineering
heuristics, not theory facts; they are tuned so the recognised choices win by
comfortable margins. This is a preference, not a gate.

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

A dominant chord's minor third spelling (#9, e.g. D# or Eb in C7#9) is treated
as a colour tone: present +8, missing -6, so an altered dominant is not
punished for offering a different combination of altered tensions. A major
chord's `#11` (the interval a tritone above the root) is also a colour tone:
+10 present, -6 missing, so `C major` remains a sensible alternative to
`C lydian` over Cmaj7#11.

### 2. Characteristic alteration bonus

If the chord itself contains an alteration (b9, #9, b5, #5), a scale that
contains that same note gains +4. `G7b9` therefore favours scales with Ab, and
`G7alt` favours scales with both the #9 and #5. The bonus is modest so that a
scale cannot buy its way to the top simply by stacking altered notes.

### 3. Avoid notes

An avoid note is a scale tone a semitone away from an important chord tone.
The engine penalises the strongest, most conventional of those relationships,
not everything the textbooks list:

- A semitone above the root: -12 on major and minor chords (the b9), but only
  -4 on dominant chords, where the b9 is an available tension. Half-diminished
  chords get -4 because the b2 is the classic locrian avoid note but the scale
  is still idiomatic.
- A semitone above the third:
  - major third: -6 on major and maj7 chords that contain a #11, where the
    natural 11 fights the raised 11; 0 otherwise, because on a plain major
    chord the natural 11 is a passing tone and ionian stays the home scale.
    It is also 0 on dominant chords as a deliberate design choice: the natural
    11 over a dominant (F over C7) is a textbook avoid note, but penalising it
    would demote mixolydian, so the engine keeps it as available colour, which
    players use as a passing or colour tone in practice.
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
- major on non-dominant major-quality chords: +6 without a #11, +3 with one
- lydian on major-quality chords: +6 with a #11, +3 without one
- dorian on m7 (+3)
- melodic minor on m(maj7) (+3)
- locrian #2 and locrian on half-diminished (+3 each)
- diminished on dim7 (+3)
- whole tone, augmented and lydian augmented on augmented chords (+5 each)

### 5. Key context

With a key supplied, each candidate receives two adjustments whose size comes
from the colour profile:

| Adjustment | diatonic | jazz | adventurous |
|---|---|---|---|
| candidate is a mode of the key | +5 | +2 | 0 |
| candidate is an in-key subset (pentatonic) | +2 | +1 | 0 |
| note outside the key, not a chord tone and not licensed | -3 | -1 | 0 |

The in-key bonus settles ties in favour of the diatonic scale. The out-of-key
penalty keeps the alternatives coherent with the key, while secondary
dominants, tritone substitutes and borrowed chords keep their accidentals: a
note the chord actually sounds is always licensed. In the jazz and
adventurous profiles the adjustments are small enough that the idiomatic
primaries (dorian, locrian #2, lydian dominant) win outright. On top of this,
the jazz profile adds +2 to dorian on m7 and locrian #2 on half-diminished,
and the adventurous profile adds +3 to those plus +4 to lydian on major
chords and +6 to lydian dominant on dominants.

### 6. Function preferences

The same chord needs different scales depending on its function in the key.
The engine looks at the chord root's scale degree and its quality and adds a
bonus to the appropriate scale type:

- **Half-diminished chords**: in the jazz and adventurous profiles, locrian #2
  (from melodic minor) +6 with locrian +2, which is the colour choice. In the
  diatonic profile the distinction is functional: **iiø in a minor key** still
  gets locrian #2 +8 with locrian +2, because its raised 9th is a standard
  melodic-minor colour for that role, while **viiø in a major key** gets
  locrian +8. Locrian #2's chromatic note is licensed so the out-of-key
  penalty does not fight the functional choice.
- **V7 in a minor key**: phrygian dominant +12 (harmonic minor), altered +10,
  half-whole diminished +8, mixolydian b6 +6, lydian dominant +4. When the
  chord itself has a #9 or #5, altered is promoted to +16 and phrygian
  dominant drops to +8. These types license their chromatic notes; lydian
  dominant is deliberately left unlicensed by default, because its bright #11
  is not idiomatic over a minor-key dominant, though it still ranks as a
  colour alternative.
- **bII7** (tritone substitute) and **bVII7** (backdoor dominant): lydian
  dominant +6 and +4.
- **bIImaj7** in a minor key (the Neapolitan chord): lydian +6.
- **Major chords on IV, bVI and bIII in a major key**: lydian +3, because
  their #11 is in the key (Ab lydian's D natural over a C major bVI, for
  example). On IV the lydian mode is already the in-key scale, so the audible
  difference shows mainly on bVI and bIII.
- **bVII major** in a minor key (the natural-minor VII): mixolydian +3, whose
  notes are the natural minor set.
- **iii7 in a major key**: aeolian and dorian +3 each, so the sparse in-key
  pentatonic does not outrank the full minor scale by avoiding the mode's
  avoid note.

The bonus is deliberately modest; chord-tone coverage still dominates, and
function preferences only decide between scales that already fit the chord.

## Selection

Candidates are sorted by score, duplicate pitch sets are removed, and the top
three are returned. Because scores already separate the families, the result
is usually: the primary chord scale, a close alternative, and an accessible
colour scale. Example outcomes from the current engine (close scores can
reorder when a rule changes):

| Chord | Primary | Second | Third |
|---|---|---|---|
| Cm7 | C dorian | C aeolian | C minor pentatonic |
| Cmaj7 | C major | C lydian | C harmonic major |
| Cmaj7#11 | C lydian | C major | C lydian pentatonic |
| C7 | C mixolydian | C lydian dominant | C mixolydian b6 |
| C7alt | C altered | C whole tone | C phrygian dominant |
| C7b9 | C phrygian dominant | C half-whole diminished | C mixolydian |
| Cm7b5 | C locrian #2 | C locrian | C minor blues |
| CmMaj7 | C melodic minor | C harmonic minor | C augmented |
| Cdim7 | C diminished | C half-whole diminished | C ultralocrian |
| Caug | C lydian augmented | C augmented | C whole tone |
| C13sus4 | C mixolydian | C dorian | C bebop |

With a key and the default jazz colour, function and idiomatic colour both
show (the half-diminished rows are the jazz-profile result; see the note
below):

| Chord and key | Primary | Second | Third |
|---|---|---|---|
| Bm7b5 in C major | B locrian #2 | B locrian | B minor blues |
| Dm7b5 in C minor | D locrian #2 | D locrian | D minor blues |
| G7 in C minor | G phrygian dominant | G lydian dominant | G mixolydian |
| G7alt in C minor | G altered | G phrygian dominant | G half-whole diminished |
| Db7 in C major | Db lydian dominant | Db mixolydian | Db mixolydian b6 |
| Fmaj7 in C major | F lydian | F major | F harmonic major |
| Am7 in C major | A dorian | A aeolian | A minor pentatonic |
| Cm7 in C minor | C dorian | C aeolian | C minor pentatonic |

The diatonic colour flattens the m7 and most half-diminished rows (`Am7`
becomes A aeolian, `Bm7b5` in C major becomes B locrian), while a minor-key
iiø keeps locrian #2; the adventurous colour turns `Cmaj7` into C lydian and
`G7` in C major into G lydian dominant.

The engine never returns empty for a resolvable chord. If no scale contains
every chord tone, the penalties simply produce the best partial matches.

## Solo in key mode

A project's `options.soloMode` is `"chord"` (the default) or `"key"`. In chord
mode the right hand follows `scale1`/`scale2`/`scale3` as the chord changes.
In key mode the right hand stays on the project key scale for the whole tune,
which is how many improvisers think: play in the key, follow the changes with
chord tones. Chord triggers still sound their chords and still change the
underlying chord config; they just do not swap the scale. The `1`-`3` scale
shortcuts remain a deliberate temporary switch and the `4` shortcut still
gives the notes of the current chord, until the next chord trigger returns to
the key. The toggle sits directly above the piano keyboard, with the other
performance switches, on the Edit and
Perform views, and the project key lives in its
own Key Detection section on the Edit view. These are set-up decisions rather
than things to change mid-performance. While the key scale is sounding, a
`Solo in key → C major` badge appears under the toggle, the stored scale names
dim, and their out-of-key tags are struck through, because every chord is
filtered to the key. The slot markers (cell highlight, bold name, `chosen` tag
and the bold filter buttons) are suppressed too, since no stored slot is the
sounding scale, and the Scale changes and Options controls are dimmed
and disabled for as long as the mode is checked. Press `0` (or hold the
left-hand `C#` shift and press `A#`/`Bb` on a MIDI keyboard) to toggle the
mode, with a toast naming the key scale.

The grid also labels each stored scale: a tiny **out of key** tag when the
scale uses notes outside the project key, and a **jazz** or **adventurous** tag
when the scale is a colour choice of the active colour profile. With the
diatonic colour, and on music that stays in key, most scales are unlabelled.

Solo in key needs no scale regeneration: it filters to the key scale directly.
The thing regeneration changes is the stored per-chord `scale1/2/3`, not this
mode. Also note that in a diatonic major tune the key scale is the same as the
per-chord scales, so Solo in key sounds identical; it differs over chromatic
chords (an altered dominant or a tritone substitute), where it stays safe in
the key.

## History-aware and shuffled scale selection

The stored `scale1`/`scale2`/`scale3` are ranked for a chord in isolation. Two
optional policies in `src/lib/autoScale.js` choose the sounding scale on each
chord trigger using the recent history (`globals.chordHistory`, the last eight
chord and scale pairs). The control above the chord/scale grid offers
**manual** (the default slot behaviour), **follow history** and **shuffle**;
the choice is remembered per browser session through `uiPrefs`.

The shuffle policy has options (pool, dwell, change chance, reroll),
and the roadmap for further context, phrase and modulation features, lives in
`doco/SCALE-POLICIES.md`. This section keeps the theory.

### Follow history

Follow scores the chord's three stored scales and sounds the best
continuation. The score combines:

- **Common tones with the previous sounding scale.** Each shared note counts
  one point, plus an extra point when it is also a guide tone (third or
  seventh) of the new chord, and half a point when it was a guide tone of the
  previous chord. Continuity therefore keeps the line smooth and aims at the
  notes that identify the harmony.
- **Progression function.** The chord before the new one, and optionally the
  one before that, tells the engine which function is in force. A dominant a
  fourth above the previous chord is a ii-V: mixolydian is preferred after a
  minor seventh chord, the altered family after a half-diminished chord. A
  dominant resolving down a fifth (V-I or a secondary dominant), down a
  semitone (tritone substitute) or up a whole tone (backdoor) into a major
  chord prefers the major home scale, and into a minor chord it prefers dorian
  then aeolian. When a project stores `contextChords: 2`, a full ii-V-I
  adds a chain bonus; shipped presets use one chord because the measured runs
  showed the chain rule never changed a pick on the classic library. This
  resolves the major ii-V versus the minor ii-V, and
  the colour of a resolution, that a single chord cannot distinguish.
- **Phrase resolution**, on for the melody style. The last sounding
  solo note is preferred: a stored scale that contains it scores, larger when
  it is a guide tone of the new chord; one that omits a guide or chord tone is
  penalised. It is deliberately conservative, because in a diatonic tune every
  stored candidate contains the notes you are playing, so it changes nothing.
  It only decides when the note distinguishes the candidates; the reason line
  then says `keeps your last note <name>`.
- **Palette**, fixed by the style. The primary palette sounds the highest
  scoring continuation. The steady term (`preferPrimary`) adds a small bonus
  to the stored first scale so a modal vamp returns to the home mode instead
  of smoothing into a neighbour. The close-scale rule sounds the highest
  scoring stored scale whose pitch set
  differs from the previous one, so each chord change adds the nearest new
  note (for example `G lydian dominant` adds C# after `D dorian`); the tension
  style applies it only on dominant chords. The legacy closed and bold values
  remain for stored projects. The first chord always uses the primary rule,
  and every choice is a stored scale that already fits the chord.
- **A small novelty point** for a candidate that does not repeat the previous
  pitch set, so an available colour alternative is not ignored forever.

Ties fall back to the earlier slot, so the first chord of a tune uses
`scale1`. The UI shows a short reason, for example
`G mixolydian: ii-V into G: diatonic dominant` or
`C major continues G mixolydian (same notes)`.
A key change, a transposition or a manual `1`-`4` press clears the live
choice; the next chord trigger follows the history again.

### Shuffle

Shuffle builds its candidates from the chord's own stored `scale1`/`scale2`/
`scale3` first, so the grid can highlight exactly and hand-edited scales are
respected, then fills the pool up to the `Pool` size with the same key-aware
engine ranking. It draws one at random, but it is anchored to the harmony: it
only changes when the **chord changes**, and a repeated trigger of the same
chord holds the scale. Inside that, the draw is weighted by:

- the rank position, with the steepness set by the `Variety` control: `Gentle`
  keeps the idiomatic primary scale nearly always, while `Lively` makes the
  stored alternatives and engine colours genuinely likely;
- the common tones with the reference scale, so the changes still connect;
- novelty relative to the last few scales, applied only to the alternatives, so
  recently heard colour sets are unlikely to return.

When there is no previous scale, the top-ranked candidate is used as the
reference, so the first draw of a session starts on the primary rather than
skipping the band. Novelty never penalises the best fit, because in a diatonic
progression the ii chord's scale and the V chord's primary are the same pitch
set (D dorian and G mixolydian), and continuing the same notes is the norm.

To keep a change musical, the draw is limited to candidates within
`maxNewNotes` substituted notes of the reference scale (the `Spread` control),
so a change is a close colour shift rather than a jump. If solo notes are
sounding when the chord changes, shuffle takes the **closest fit** instead of a
random draw, so the mapping barely moves under the player's fingers. A candidate
from the engine's list is a scale it already rates for the chord, so variety
cannot produce a scale that clashes with the harmony; the stored filters are the
player's own chosen scales, which the grid shows.

With a `Pool` of three the candidates are exactly the three stored scales, so
the grid always contains the sounding scale. Larger pools add engine colours on
top, and a draw can then be a scale the grid does not contain. The header above
the grid names such a live scale in an `auto:` chip, and the current chord row
marks the closest stored alternative with a dashed amber border and a
**closest** tag, whose tooltip gives the number of shared notes. When the drawn
scale coincides with a stored slot, that slot becomes the current filter, so its
cell keeps the solid highlight and bold name, the filter buttons follow it, and
no closest marker is shown. Matches are compared by pitch class, so enharmonic
spellings and parent-scale names (for example `G altered` against
`Ab melodic minor`) count as the same scale.

### Interaction with lock, Solo in key and manual picks

This is a description of behaviour, not a fourth mode. The locked scale (`5`)
always wins and pauses both policies. Solo in key (`0`) keeps the key scale, as
before. A manual `1`-`4` press, a click on a scale cell in the table, or a
right-hand black key applies immediately and pauses the policy. Re-triggering
the same chord keeps the player's choice, and the picked slot is carried to the
next different chord once (using that chord's own scale for the slot), after
which the policy resumes. The policies never switch the scale during a chord,
only on a chord trigger.

### Live transposition

The left-hand black keys and `Alt+3`/`Alt+4` shift every chord down or up a
semitone mid-performance. Transposition moves the whole musical context, not
just the notes:

- The key context moves with the chords. `globals.transpositionSemitones`
  records the offset and `getProjectKey()` applies it on top of the written
  project key, so key-aware ranking, the `Key:` chip and Solo in key all hear
  the transposed key (C major becomes Db major after one semitone up). The
  written project is not modified, and Reset Transpositions restores it.
- Custom chord names that Tonal cannot parse (for example `E7/D` slash names,
  or legacy custom names such as `G7inversion2`) move their root as well, so the
  grid label keeps describing what sounds: `G7/D` becomes `Ab7/Eb`, and
  `G7inversion2*` becomes `Ab7inversion2*`.
- The follow and shuffle history is cleared, so the first chord after a
  transposition starts a fresh phrase rather than continuing pre-transposition
  scales.

As a safety net, the engine itself distrusts a root read from a custom symbol
name when the sounding notes neither contain it nor make a recognisable chord
shell on it (a third and a seventh). A stale name such as `G7inversion2*`
sounding Ab7 is therefore resolved on its notes, and shuffle offers Ab scales
rather than inventing a G chord and offering G harmonic minor.

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
- **out-of-key colour notes** (only when a key is passed): scale notes outside
  the declared key that are not chord tones or licensed function notes. These
  are reported in `outOfKey` but do not make the scale fail, because chromatic
  colour is often deliberate.

The report deliberately ignores soft avoid notes such as the natural 11 over a
major triad, so `C major` over a C chord is not flagged. It also skips
unresolvable chords.

Use it with:

```
npm run validate:scales            # warn-only report across public/projects
npm run regenerate:scales          # dry run the engine's replacements
npm run regenerate:scales -- --write
```

`validate:scales` passes each project's declared key and colour into the
checker, so it also prints deliberate out-of-key colour notes as information.
The regeneration script re-ranks all three scale slots for projects that
declare a key, and otherwise only touches the slots that fail the check. It
edits the JSON values in place so formatting is preserved, and skips projects
whose scales are deliberately shared across chords or used as teaching
examples; those are listed in `bin/regenerate-project-scales.mjs`.

The generated classic, progressions and rock libraries carry an explicit key
and colour per entry (`bin/classic-project-definitions.mjs`,
`bin/progressions-project-definitions.mjs`, `bin/rock-project-definitions.mjs`)
and are regenerated key-aware by `npm run generate:libraries`. The featured projects that have a
clear key carry one too; the rest fall back to detection at load.

## Hearing the difference

For a full performance walkthrough, with the scales and notes to play over each
chord, see `doco/IMPROVISING-TUTORIAL.md` (also readable in the app's Help
view).

The key work is subtle in a diatonic major tune and clear in the places where
function and colour matter. Good static projects to smoke test:

| Project | Chord | What to listen for |
|---|---|---|
| C Major II-V-I (featured) | Db7 (4th trigger) | lydian dominant, adds G natural |
| Minor ii-V-i with tritone sub in C minor | Db7 | lydian dominant instead of mixolydian |
| Blue Bossa in C minor | G7 | phrygian dominant instead of mixolydian |
| Blue Bossa in C minor | Dbmaj7 | lydian, adds G natural |
| Autumn Leaves in G minor | D7 / Ebmaj7 | phrygian dominant / lydian |
| Andalusian cadence in A minor | E7 | phrygian dominant |
| Summertime in A minor | E7 | phrygian dominant |
| Stella by Starlight in Bb | Ab7 | lydian dominant, adds D natural |
| Key awareness demo (featured) | all | walks through all of the above |

The featured **Key awareness demo** project is built for this: it visits the
home chord, a colour vi chord, the diatonic ii and V, a tritone substitute, a
backdoor dominant and a borrowed bVI, and its chord names say what to listen
for. The demo welcome also lists each trigger key with its chord and current
scale.

## Worked examples

### C minor ii-V-i

The featured `C Minor II-V-I.json` demonstrates a correct minor ii-V-i:

- Dø7 (Dm7b5), voiced F-Ab-C-D.
- G7alt, voiced F-Ab-B-Eb (a true altered shape: b7, b9, 3, b13).
- Cm(maj9), voiced Eb-G-B-D (a rootless voicing: b3, 5, maj7, 9).

Two traps explain the choices. C major blues (C D Eb E G A) over every chord
is jarring: over Dm7b5 it adds A natural against the chord's Ab and omits the
third F; over G7 it omits B, F and Ab entirely; over Cm(maj7) it adds E
natural against Eb. And a `G7alt` label over F-Ab-B-D sounds a G7b9 with a
natural D, which the altered scale's Eb rubs a semitone against; a Cm(maj9)
voiced Eb-G-B-C puts the major 7th a minor 2nd under the root.

The engine treats the sounding voicing as authoritative when it disagrees
with a symbol, and the project declares C minor, so the key-aware engine
picks the minor-function scales:

- Dm7b5 (iiø): D locrian #2 (= F melodic minor), D locrian, D minor blues.
- G7alt (V7): G altered (= Ab melodic minor), G phrygian dominant, G half-whole diminished.
- Cm(maj9) (i): C melodic minor, C harmonic minor, C minor bebop.

### Tritone substitution

Db7 is the tritone substitute for G7 in `C Major II-V-I.json`. G mixolydian
over it would lack the Db root and the Ab fifth (it does contain the third F
and, as B natural, the b7 Cb), and F minor over the G7 has Bb against G7's B
natural. Because the project declares C major and Db7 is its bII7, the engine
chooses G mixolydian over the G7 and Db lydian dominant over the substitute
(the G natural is the note that makes a tritone substitute work), with Db
mixolydian and Db mixolydian b6 as the alternatives.

### Why the same set can have two names

F melodic minor, D locrian #2 and Bb lydian dominant are all rotations of one
pitch-class set, and G altered and Ab melodic minor are rotations of another.
(Ab lydian dominant belongs to a third set, Eb melodic minor.) The app may
show either the chord-rooted mode name or the parent-scale name, depending on
what was already stored in a project. They sound identical; the chord-rooted
name is usually easier to read against the chord, while the parent-scale name
is the traditional jazz short-hand ("play Ab melodic minor over G7alt").

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

- The project has one key. Tunes that modulate (many standards do) get the
  key's bias for every chord, though out-of-key chords still receive scales
  that fit them, because chord tones and function preferences are licensed.
  Per-section keys would be the next step.
- Key detection is major/minor only and is genuinely ambiguous for some
  progressions (relative major/minor, blues, modal vamps). That is why the
  detected key is a default the user can override, and why the static
  libraries declare their keys explicitly. Modal keys (such as D dorian) can
  only be set by hand.
- The function preferences are a small, hand-weighted set of the common jazz
  functions, not a full functional-harmony analysis. They are deliberately
  modest so that chord-tone coverage always dominates.
- The colour profiles are a global taste setting, not per chord. A project
  that wants strict diatonicism in one place and lydian colour in another
  cannot express both at once.
- Scale suggestions are always rooted on the chord. Traditional parent-scale
  names are not generated automatically; they survive only if a project stored
  them.
- The checker is intentionally forgiving about modal colour and sparse
  pentatonics, so it is a report, not a proof of good taste.
