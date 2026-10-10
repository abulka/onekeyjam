# Improvising with OneKeyJam: quick start and song walkthroughs

This page gets you playing straight away, then walks through six songs with
sample solos. Every control, setting and scale-policy detail lives on the
**Reference** page; you do not need any of it to start.

---

## Quick start

1. Click **DEMO** in the menu bar, or load a project from the **File** menu, or
   click **Random project**. Classic, rock and progression songs each include a
   demo loop in the pattern sequencer, so you can press play there to hear the
   song before you solo over it. The Play/Stop button in the menu bar starts
   the loop from any page without opening the panel, and the **Song sequence**
   picker there switches between a song's short excerpt, middle section and
   full form.
2. On a MIDI keyboard, play the white keys in the left-hand trigger octave
   (C D E F G A B, C3 to B3 by default). Each one triggers a whole chord. On the
   computer keyboard those keys are `z x c v b n m`; click the on-screen keyboard
   once first so it has focus. Songs with more than seven chords continue into
   the next octave.
3. Play the white keys to the right for the solo (from C4 upwards by default, or
   `q w e r t y u` on the computer keyboard). They are filtered into a scale that
   fits the current chord, so you cannot play a wrong note. An external MIDI
   keyboard connects automatically.
4. Shape the sound with the right-hand black keys `C#`, `D#`, `F#`, `G#` and
   `A#`, or the computer keys `1`-`4` and `5`: `1` is the home scale, `2` and
   `3` are colour alternatives, `4` is the notes of the chord, and `5` locks the
   scale so chord changes do not move it. `0` (or hold `C#` and press `A#`)
   toggles Solo in key.

A computer keyboard can only report a few keys held at once, so a solo note can
drop out when you hold a chord and add two notes. If that happens, try
different keys or use a MIDI keyboard. See the Reference page,
**Computer keyboards: pressing several keys at once**.

That is the whole setup. The project key and the Scale changes style have
sensible defaults, so you can play immediately. When you want to know what a
control does, read the Reference page or open **Shortcuts help** above the
keyboard.

### The keys you need first

MIDI keys are named by note; the trigger and jam octaves follow the keyboard
config and any project override, and the on-screen keyboard labels show the
matching computer keys.

| Control | MIDI keyboard | Computer keyboard |
|---|---|---|
| Trigger a chord | white keys from the trigger octave upwards, C D E F G A B then the next octave for chords 8-14 (C3-B3 by default) | `z x c v b n m`, then `, . /` and `q w e r …` for higher triggers (an assigned higher key triggers its chord instead of soloing) |
| Solo note | white keys from the jam octave upwards (C4 by default, higher when a song uses more than seven triggers) | `q w e r t y u` for seven chord songs |
| Scale filter 1 | `C#` in the jam octave and above | `1` |
| Scale filter 2 | `D#` in the jam octave and above | `2` |
| Scale filter 3 | `F#` in the jam octave and above | `3` |
| Notes of chord | `G#` in the jam octave and above | `4` |
| Lock scale | `A#` in the jam octave and above | `5` |
| Solo in key | hold `C#` (shift) and press `A#` | `0` |

---

## Song walkthroughs

The tables name each chord's first three scale filters. Trigger notes are shown
as MIDI notes, for example C3; the on-screen keyboard labels show the matching
computer keys, for example `z`. Which chord lands on which key depends on the
project and the current allocation, so read the **Trigger** column of the chord
table in the app, or the welcome message. Unless a song says otherwise, start
each chord on filter 1.

If a project has more chords than the grid height, some chords are not on a key.
On the Edit view, raise the **Number of Chords to display** slider (or drag the
grid's bottom edge) to fit more on. The grid grows by pulling the next chords
from the pool, so the same rows come back if you shrink it again. The Blue Bossa
walkthrough below needs this.

### C Major II-V-I (featured)

Load **File -> Open Featured... -> C Major II-V-I**. Three chords plus a tritone
substitute on the fourth.

| Chord | Filter 1 | Filter 2 | Filter 3 |
|---|---|---|---|
| Dm7 | D dorian | D aeolian | D minor pentatonic |
| G7 | G mixolydian | G lydian dominant | G mixolydian b6 |
| Cmaj7 | C major | C lydian | C harmonic major |
| Db7 | Db lydian dominant | Db mixolydian | Db mixolydian b6 |

**What to aim for.** Over Dm7 the guide tones are F (the third) and C (the
seventh); end phrases on one of them. Over G7 the guide tones are B and F, and
they want to resolve to C and E at the Cmaj7. The Db7 is the tritone substitute
for G7; its lydian-dominant scale contains G natural, which is what makes the
substitution sound intentional.

**A sample solo (manual mode):**

```text
Dm7:   A  F  E  D        (filter 1)
G7:    F  D  B  A        (filter 1) then hold F
Cmaj7: E  B  G  E        (filter 1)
Db7:   G  Ab F  Eb       (filter 1, the tritone substitute)
Cmaj7: E  B  C  E        (resolve, then rest)
```

Do the first three lines twice, then add the Db7 line and resolve again. Repeat
the whole thing with filter 2 on the G7 and the Cmaj7 to hear the brighter
colour.

**A sample solo (follow history mode):**

Set **Scales** to `follow history`, open **Options** and set **Context** to
`2 chords`, then play. The app chooses the scale slot for each chord; the notes
below are guide tones that sit well in whatever it picks.

```text
Dm7:   F  A  C  D        (guide tones)
G7:    B  F  D  B        (the third and seventh)
Cmaj7: E  G  B  E        (land on the third, then rest)
Db7:   F  Ab B  G        (the app hears the substitution)
Cmaj7: E  B  C  E        (resolve, then rest)
```

### C Minor II-V-I (featured)

Load **File -> Open Featured... -> C Minor II-V-I**. The darker, jazzier cousin.

| Chord | Filter 1 | Filter 2 | Filter 3 |
|---|---|---|---|
| Dm7b5 | D locrian #2 | D locrian | D minor blues |
| G7alt | G altered | G phrygian dominant | G half-whole diminished |
| Cm(maj9) | C melodic minor | C harmonic minor | C minor bebop |

**What to aim for.** Locrian #2 has a natural E, which keeps the half-diminished
chord from sounding sour; use E as a passing note. Over the altered dominant,
target B and F, and use the altered tensions Ab, Db and Eb as colour. At the
minor chord, target Eb and B, the two notes that give melodic minor its
bittersweet sound.

**A sample solo (manual mode):**

```text
Dm7b5: C  E  F  D        (filter 1; E natural is the locrian #2 colour)
G7alt: F  Eb Db B        (filter 1; altered tensions)
Cm:    Eb B  G  Eb       (filter 1; land on the major seventh)
Cm:    D  B  G  Eb       (second time, with the melodic minor A natural)
```

**A sample solo (follow history mode):**

Set **Scales** to `follow history` and **Context** to `2 chords`. Follow makes
the ii-V-i sound deliberate: it hears the three-chord function and picks the
idiomatic scale for each.

```text
Dm7b5: F  Ab C  D        (guide tones)
G7alt: F  B  Eb Ab       (guide tones with altered colour)
Cm:    B  Eb G  A        (the leading tone resolves)
```

### 12-bar blues in C (progressions)

Load **File -> Open Progressions... -> 12-bar blues in C**. The project lays out
eight bars that alternate the I chord (C7) and the IV chord (F7), starting and
ending on C7. One bar is a repeat, so the default seven trigger keys cover
everything you need.

| Chord | Filter 1 | Filter 2 | Filter 3 |
|---|---|---|---|
| C7 | C mixolydian | C lydian dominant | C mixolydian b6 |
| F7 | F mixolydian | F lydian dominant | F mixolydian b6 |

**What to aim for.** Blues is where you can be the most rhythmic and the least
scale-conscious. Stay on filter 1 (mixolydian, which has the essential minor
seventh, Bb on C7) and play short phrases that repeat and answer each other.
The trick is repetition: play a two-bar idea, repeat it, then change its ending
as the chord changes. The minor third (Eb over C7) is the blues note; it is a
black key, so filtering never stops you.

**A sample solo (manual mode):**

```text
C7:  E  G  Bb A  G        (filter 1: third, fifth, flat seventh)
F7:  A  C  Eb D  C        (filter 1)
C7:  E  Bb A  G           (settle)
F7:  A  Eb C  A           (turnaround)
C7:  G  Eb E  C           (the blues note, then home)
```

**A sample solo (follow history mode):**

Set **Scales** to `follow history`. On a simple I-IV blues the app mostly holds
mixolydian, so the difference is subtle here; watch the reason line as you move
between C7 and F7. The policy earns its keep on the ii-V-I songs.

```text
C7:  G  A  Bb A  G        (filter 1)
F7:  A  C  D  Eb          (the app handles the move to IV)
C7:  E  G  Eb E           (the blues note a black key away, then home)
F7:  A  C  A  F           (settle)
```

### Blue Bossa in C minor (classic)

Load **File -> Open Classic... -> Blue Bossa in C minor**. The tune moves
between C minor and its relative major, with a beautiful bII chord.

This project has eight chords, and a saved project reopens with all of its grid
chords on keys, so the Dbmaj7 is on a trigger too. Eight chords reach into the
next octave (trigger 8 is C4 by default). If you instead open a project with a
large imported pool, the grid shows the dealt hand; raise **Number of Chords to
display** (or drag the grid's bottom edge) to pull more chords from the pool.

| Chord | Filter 1 | Filter 2 | Filter 3 |
|---|---|---|---|
| Cm7 | C dorian | C aeolian | C minor pentatonic |
| Fm7 | F dorian | F aeolian | F minor pentatonic |
| Dm7b5 | D locrian #2 | D locrian | D minor blues |
| G7 | G phrygian dominant | G lydian dominant | G mixolydian |
| Ebm7 | Eb dorian | Eb aeolian | Eb minor pentatonic |
| Ab7 | Ab mixolydian | Ab lydian dominant | Ab mixolydian b6 |
| Dbmaj7 | Db lydian | Db major | Db harmonic major |

**What to aim for.** The opening Cm7 to Fm7 is a minor i to iv; use A natural
(the dorian sixth) to make it sound like jazz rather than folk. The Dm7b5 to G7
is the same ii-V into C minor as the previous song. The Ebm7 to Ab7 to Dbmaj7 is
a ii-V-I in Db major; over the Ab7, filter 2 (lydian dominant) has D natural as
its #11, the signature sound of the key change.

**A sample solo (manual mode):**

```text
Cm7:   Eb Bb G  A         (filter 1; A natural is the dorian sixth)
Fm7:   Ab Eb C  D         (filter 1)
Dm7b5: F  Ab C  D         (filter 1; locrian #2)
G7:    F  Eb B  Ab        (filter 1; phrygian dominant)
Cm7:   G  Eb A  Bb        (home)
Ebm7:  Gb Db Bb C         (filter 1; the move to Db major)
Ab7:   Eb C  Db F         (filter 1; the #11 is D natural)
Dbmaj7: F Ab Db F         (filter 1; land and rest)
```

**A sample solo (follow history mode):**

Set **Scales** to `follow history` and **Context** to `2 chords`. Follow tracks
the two key centres for you, so the Cm7/Fm7 vamp and the Db-major section each
get the right scales without you touching the filters.

```text
Cm7:   G  Bb Eb F         (guide tones)
Fm7:   Ab C  Eb D         (the move to iv)
Dm7b5: F  Ab C  Eb        (ii-V into C minor)
G7:    B  F  Ab Eb        (phrygian dominant)
Cm7:   Eb G  Bb C         (resolve)
Ebm7:  Db F  Ab Bb        (the Db-major section)
Ab7:   C  Eb F  Db        (guide tones and the #11)
Dbmaj7: F Ab Db F         (home in Db)
```

### Autumn Leaves in G minor (classic)

Load **File -> Open Classic... -> Autumn Leaves in G minor**. A cycle of ii-V-I
progressions in Bb major and G minor.

| Chord | Filter 1 | Filter 2 | Filter 3 |
|---|---|---|---|
| Cm7 | C dorian | C aeolian | C minor pentatonic |
| F7 | F mixolydian | F lydian dominant | F mixolydian b6 |
| Bbmaj7 | Bb major | Bb lydian | Bb harmonic major |
| Ebmaj7 | Eb lydian | Eb major | Eb harmonic major |
| Am7b5 | A locrian #2 | A locrian | A minor blues |
| D7 | D phrygian dominant | D lydian dominant | D mixolydian |
| Gm7 | G dorian | G aeolian | G minor pentatonic |

**What to aim for.** The first half is a ii-V-I in Bb major: Cm7, F7, Bbmaj7,
Ebmaj7. Play long, lyrical lines and aim at the third of each chord. The engine
gives Ebmaj7 lydian on filter 1, which adds A natural, the note that makes the
IV chord sound open rather than heavy. The second half is a ii-V-i in G minor:
Am7b5, D7, Gm7. Over the D7 the phrygian dominant is the more "minor" sound and
resolves beautifully to Gm7. End the tune on G, D and Bb.

**A sample solo (manual mode):**

```text
Cm7:   Eb C  G  Bb        (filter 1; the ii of Bb major)
F7:    A  F  Eb C         (filter 1)
Bbmaj7: D F  A  Bb        (filter 1; land on the third)
Ebmaj7: D G  Bb A         (filter 1; A natural is the lydian #11)
Am7b5: G  Eb C  B         (filter 1; locrian #2)
D7:    C  F# A  D         (filter 1; phrygian dominant's F#)
Gm7:   Bb G  D  F         (filter 1; home, then rest)
```

**A sample solo (follow history mode):**

Set **Scales** to `follow history` and **Context** to `2 chords`. Follow makes
the two key centres clear: it resolves the Bb-major ii-V-I and then the G-minor
ii-V-i without any filter switching.

```text
Cm7:   G  Bb C  D         (guide tones)
F7:    A  F  D  C         (the V of Bb)
Bbmaj7: D Bb F  D         (resolve)
Ebmaj7: Bb G  D  A        (the IV, lydian)
Am7b5: G  C  Eb A         (ii of G minor)
D7:    F# C  A  D         (the V of G minor)
Gm7:   F  D  Bb G         (home)
```

### Key awareness demo (featured)

Load **File -> Open Featured... -> Key awareness demo**. This project exists to
demonstrate the key and colour system. Its chord names tell you what to listen
for.

| Trigger | Chord | Filter 1 | What to listen for |
|---|---|---|---|
| C3 | Cmaj7 | C major | Home. All white notes. |
| D3 | Am7 | A dorian | B natural, the jazz colour the key would remove. |
| E3 | Dm7 | D dorian | The diatonic ii. |
| F3 | G7 | G mixolydian | F natural, the dominant seventh. |
| G3 | Db7 | Db lydian dominant | G natural, the tritone substitute. |
| A3 | Bb7 | Bb lydian dominant | E natural, the backdoor dominant. |
| B3 | Abmaj7 | Ab lydian | D natural, the borrowed bVI. |

**What to aim for.** Play each chord's filter 1, then filter 2, and listen to
the chromatic notes the engine puts in. Then switch the colour to **diatonic**
above the scale grid and play Am7 again; the B natural is replaced by Bb, and
the chord sounds much plainer. That contrast is the whole feature in one chord.

**A sample solo (manual mode):**

```text
Cmaj7: E  G  B  D         (filter 1; home, all white notes)
Am7:   B  C  E  G         (filter 1; B natural is the dorian colour)
Dm7:   D  F  A  C         (filter 1; the diatonic ii)
G7:    F  D  B  G         (filter 1; F natural is the dominant seventh)
Db7:   G  Ab F  Eb        (filter 1; G natural is the tritone substitute)
Bb7:   E  F  D  Bb        (filter 1; E natural is the backdoor dominant)
Abmaj7: D C  Ab Eb        (filter 1; D natural is the borrowed bVI)
```

**A sample solo (follow history mode):**

Set **Scales** to `follow history`, then in **Settings** > **Preferences** tick
**Show the recent chord-to-scale history above the grid**. Play
the same progression and watch the `Recent:` strip: it lists the chord-to-scale
choices with a `follow` badge, so you can see the engine name the substitutions
as they go.

```text
Cmaj7: E  B  G  E         (come home)
Am7:   G  E  C  A         (guide tones)
Dm7:   A  C  D  F         (the ii)
G7:    F  B  D  G         (the V)
Db7:   F  Ab B  G         (the substitution)
Bb7:   D  F  Ab Bb        (the backdoor)
Abmaj7: C  Eb G  Ab       (the borrowed bVI)
```

---

## Advanced improvising

Everything below makes your solos sound better. The Reference page has the full
detail behind each idea.

### The universal performance recipe

This works on every song in this tutorial.

1. **Start with the left hand alone.** Trigger the first chord and hear it.
2. **Enter with the chord tones.** On filter 4, play the chord's notes as an
   arpeggio to establish the harmony.
3. **Move to filter 1 and phrase.** Play short phrases of three to five notes,
   then rest for as long as the phrase lasted. Silence is part of the solo.
4. **Aim at guide tones.** The third and seventh of each chord carry its
   identity. Land on them at the end of phrases.
5. **Use filter 2 for colour** for one phrase per chord, then return to
   filter 1. This is the single biggest thing that makes a solo sound
   professional.
6. **At the end of a section, drop to filter 4** and play the chord up or down
   to make the cadence clear.
7. **When you change chord, change late.** Hold the previous phrase until the
   new chord arrives, then resolve onto one of its guide tones.

If you get lost, press `5` (`A#` on a MIDI keyboard) to lock the current scale,
`4` (`G#`) for the chord notes to re-orient, then `1` (`C#`) to carry on.

### Filters are your tone controls

Filter 1 is home. Filter 2 is where a lot of the interest lives: lydian dominant
over a dominant, locrian or locrian #2 over a half-diminished. Filter 3 tends to
be a pentatonic or an accessible colour. Filter 4 (notes of chord) is for
spelling out the harmony at a cadence. Locking (`5`, or `A#` on a MIDI keyboard)
freezes the scale so chord changes do not move it, which is great for a modal
vamp or when you want to develop one idea.

### Let the changes choose the scale

Above the chord/scale grid, the **Scale changes** selector is the easy way in:

- **I choose (safe)** and **I choose** keep you in charge of the filters; the
  safe version keeps the choices in the plain key.
- **Follow the chords** picks the stored alternative that continues the scale you
  just played and fits where the progression is going.
- **Follow the chords (safe)** does the same in the plain key, holding the mode
  through modal vamps.
- **Follow the melody** keeps your last solo note in scale, so phrases resolve
  instead of being cut off.
- **Add jazz tension** keeps the natural scale and adds a tension note only on
  dominant chords.
- **Vary it** shifts the stored filters on most chord changes, staying close to
  each chord.
- **Adventurous** allows bolder scales and bigger shifts.

The **Options** panel beside it shows the engine underneath (colour, mode and
preset) and the shuffle feel; the follow styles fix their own preset, so
changing a shuffle value makes the selector read `Custom`.

Follow is the thoughtful mode: it recognises a ii-V-I, a tritone substitute or a
backdoor dominant and picks the idiomatic scale, so the harmony steers the
colour for you. Shuffle is the explorer: it changes only when the chord changes,
holds the scale when you repeat a chord, and every pick still fits. Both are
never traps, because `1`-`4` always take over for the chord you are on.

The full options, presets and smoke tests are on the **Reference** page.

### When to change the key, colour and Solo in key

Treat these as performance settings, set before you start:

- **Key:** set it once per song. Change it only when the song's key changes, or
  when you deliberately want to re-harmonise. When a song genuinely modulates,
  use the **Key Groups** list in Key Detection instead: give each section its own
  key and the solo follows the changes. The multi-key library (File -> Open
  Multi-key...) has examples, from a two-key etude to modulating standards such
  as All the Things You Are.
- **Colour:** jazz for most things, diatonic for modal or simple material,
  adventurous when you want to push. It lives in the scale Options. Do not
  change it mid-solo; change it between takes if at all.
- **Solo in key:** on for modal tunes and vamps; off for standards with rich
  changes. The switch is above the piano keyboard with the other performance
  toggles. If you are recording, decide before you press Record.
- **Scale changes style:** `I choose` while you are learning a tune or following
  a plan; `Follow the chords` when you want the changes to steer the colour;
  `Vary it` for practice and for finding new sounds. If you are recording, pick
  one before you press Record, so the take is coherent.

The one exception is transpose: the left-hand black keys shift the chords
mid-performance, which is a quick way to change key for a verse or to save a
singer.

### A four-week practice plan

1. **Week 1:** one song, filter 1 only, guide tones only, lots of rests.
2. **Week 2:** the same song, adding filter 2 for one phrase per chord.
3. **Week 3:** add filter 4 cadences and play the chord tones on the way into
   each new section.
4. **Week 4:** record a take in the Perform view, listen back, and keep the
   phrases you liked.
