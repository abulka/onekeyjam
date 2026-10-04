# Improvising with OneKeyJam: a practical tutorial

This tutorial is for someone who wants to sit down and improvise a whole
performance, not just press keys. It explains the controls that matter, when to
use them, and walks through several songs chord by chord. Everything here uses
the built-in projects, so you can follow along immediately.

If you only read one thing: **OneKeyJam is a safety net, not a substitute for
listening.** The left hand plays the changes, the right hand is filtered to a
scale that fits, and your job is to make phrases with the notes on offer. The
key, the colour and Solo in key are set-up decisions, not playing decisions.

---

## 1. The mental model

There are only three things happening.

1. **The left hand plays chords.** Each trigger key plays a whole chord with
   one finger, plus its bass note. You never play chord shapes.
2. **The right hand plays a filtered scale.** White solo keys are mapped onto
   the notes of the current scale, so whatever you play fits. You can still
   play the black solo notes for chromatic colour.
3. **The chord you last triggered chooses the scale.** That is why chord order
   matters: the left hand is really steering the harmony, and the right hand
   follows it.

On top of that, three settings shape the whole session:

- the **project key** (for example C major or C minor),
- the **colour** (how jazzy the scale suggestions are),
- **Solo in key** (whether the right hand follows each chord, or stays on the
  key scale).

---

## 2. Before you play: the five-minute setup

Do this once per song, then leave it alone while you play. The **key** lives in
the **Key Detection** accordion on the Edit view (its own section), while
**Solo in key** and **Colour** sit directly above the chord/scale grid on both
the Edit and Perform pages.

### Step 1: set the project key

The key is the song's home. In the **Project Key** row, pick the tonic and the
type (major, minor, or a mode such as dorian). The label beside it explains
where the key came from:

- `(detected)` - guessed from the chords, with nothing stored.
- `✅✅ (set by project, matches detected)` - stored, and it is the top detected
  key. (A saved detection shows as `✅✅ (detected, saved)`.)
- `✅ (set by project, another detected key)` - stored, and it is one of the
  valid detected keys, just not the top choice. This is not a mistake: several
  keys can fit the same chords.
- `⚠️ (set by project, differs from detected)` - stored, and no detected key
  matches it.
- `(set by project, modal key)` - a mode (such as D dorian) that the
  major/minor detection cannot see.
- `(set by project, no chords yet)` and `(no chords yet, default key)` - an
  empty project, with or without a key already chosen.

Hover the label to see the full list of detected keys. If a stored major/minor
key disagrees with every detected key, a red warning also appears with a
one-click "Use the detected key".

Why it matters: the key decides which scales the engine suggests, so the safe
notes agree with the song, and it keeps chromatic chords such as tritone
substitutes sounding intentional rather than random.

### Step 2: set the colour

Above the scale grid, next to **Solo in key**, is the **Colour** dropdown:

- **jazz** (the default) keeps the idiomatic colours: dorian on minor seventh
  chords, locrian #2 on half-diminished chords, and the right dominant scales.
  Use this for almost everything.
- **diatonic** stays strictly in key. Use it for folk, pop, modal vamps and
  teaching, where you do not want any outside notes.
- **adventurous** leans into lydian and lydian-dominant colour. Use it when you
  want the solo to sound modern and a little outside.

Changing the key or the colour re-ranks every chord scale automatically, so you
do not need to do anything else.

### Step 3: decide on Solo in key

**Solo in key** (the checkbox) keeps the right hand on the project key scale
while the chords change. It is perfect for:

- modal tunes such as *So What*,
- a simple minor vamp where you want to float over everything,
- beginners who want one scale for a whole song.

Leave it **off** for standards with lots of changes (Autumn Leaves, All the
Things You Are), where each chord's own scale is the point. The `1` `2` `3`
shortcuts still switch scales temporarily even when Solo in key is on.

### Step 4: check scale filtering and learn the trigger keys

In the Perform view, make sure the scale-filtering switch is on (the left-hand
toggle is for chords, the right-hand toggle is for solo filtering). Then look at
the **chord table**: the Trigger column shows which left-hand key plays which
chord. By default the white trigger keys run `C D E F G A B` from C3, which are
the computer keys `z x c v b n m`. The demo welcome lists them too.

### Step 5: know the solo keys

On the computer keyboard, the solo notes are the upper row `q w e r t y u`,
starting at C4 by default. On a MIDI keyboard, anything to the right of the
chord triggers works.

---

## 3. The controls you will actually use

| Control | Computer keys | What it does |
|---|---|---|
| Chord trigger | `z x c v b n m` | plays the chord mapped to that white key |
| Solo note | `q w e r t y u` | plays a filtered note in the current scale |
| Scale filter 1 | `1` | the primary scale for the current chord |
| Scale filter 2 | `2` | the first colour alternative |
| Scale filter 3 | `3` | the second colour alternative |
| Notes of chord | `4` | filters the solo to the chord's own notes |
| Lock scale | `5` | freezes the scale so chord changes do not move it |
| Toggle Solo in key | `0` | on/off, with a toast naming the key scale |
| Filter off | `d` (left black key) | turns solo filtering off, so the keyboard is a plain piano |
| Filter on | `g` (left black key) | turns solo filtering back on |
| Transpose down/up | `h` / `j` (left black keys) | shifts the chords a semitone |
| Shift | hold `s` (left black key) | modifies the other left black keys, for example `s`+`j` toggles Solo in key |

The **Active Scale** panel shows what the right hand is doing: the scale name,
its notes, and the mapping from your solo keys to sounding notes.

**Scale filters are your tone controls.** Filter 1 is home. Filter 2 is one step
beyond home and is where a lot of the interest lives: lydian dominant over a
dominant, locrian or locrian #2 over a half-diminished. Filter 3 tends to be a
pentatonic or an accessible colour. Filter 4 (notes of chord) is for playing the
actual chord tones, which is great at a cadence or when you want the solo to
stop and spell out the harmony.

**Tiny labels in the scale grid.** Under each scale you may see a small tag:
**out of key** means the scale uses notes outside the project key (hover to see
which notes), and **jazz** or **adventurous** marks a scale that is a colour
choice of the active profile. With the colour set to `diatonic`, or on music
that never leaves the key, most scales are unlabelled.

**When Solo in key is on**, a `Solo in key → C major` badge appears above the
grid, the stored scale names dim, and the **out of key** tags are struck
through, because every chord is now filtered to the key scale. If you press
`1`-`4` to inspect a chord scale, the dimming pauses for that chord and a muted
`Solo in key (temporarily overridden)` note appears, then the key scale returns
on the next chord trigger.

**When you lock the scale** (`5`), the locked scale is bolded in the grid with a
padlock 🔒, so you can see at a glance which scale the right hand is frozen into
even as the chords change.

---

## 4. The universal performance recipe

This works on every song in this tutorial.

1. **Start with the left hand alone.** Trigger the first chord and hear it.
2. **Enter with the chord tones.** On filter 4, play the chord's notes as an
   arpeggio to establish the harmony.
3. **Move to filter 1 and phrase.** Play short phrases of three to five notes,
   then rest for as long as the phrase lasted. Silence is part of the solo.
4. **Aim at guide tones.** The third and seventh of each chord carry its
   identity. Land on them at the end of phrases.
5. **Use filter 2 for colour** for one phrase per chord, then return to filter 1.
   This is the single biggest thing that makes a solo sound professional.
6. **At the end of a section, drop to filter 4** and play the chord up or down
   to make the cadence clear.
7. **When you change chord, change late.** Hold the previous phrase until the
   new chord arrives, then resolve onto one of its guide tones.

If you get lost, press `5` to lock the current scale, `4` for the chord notes to
re-orient, then `1` to carry on.

---

## 5. Song walkthroughs

The trigger keys below assume the default keyboard (chord triggers from C3) and
that every chord in the project is allocated. If a project has more chords than
fit on the trigger keys, the chord table shows which ones are playable; the rest
are still in the project but not on a key.

### 5.1 C Major II-V-I (featured)

Load **File -> Open Featured... -> C Major II-V-I**. Three chords, plus a
tritone substitute on the fourth trigger.

| Trigger | Chord | Filter 1 | Filter 2 | Filter 3 |
|---|---|---|---|---|
| C3 (`z`) | Dm7 | D dorian | D minor pentatonic | D aeolian |
| D3 (`x`) | G7 | G mixolydian | G lydian dominant | G mixolydian b6 |
| E3 (`c`) | Cmaj7 | C major | C lydian | C harmonic major |
| F3 (`v`) | Db7 | Db lydian dominant | Db mixolydian | Db mixolydian b6 |

**Over Dm7 (D dorian, D E F G A B C):** the guide tones are F (the third) and C
(the seventh). Play `D F A C`, end phrases on F or C. For colour, play E and B.

**Over G7 (G mixolydian, G A B C D E F):** the guide tones are B and F, which
want to resolve to C and E when the Cmaj7 arrives. Lean on F, then resolve.
Switch to filter 2 (G lydian dominant, which contains C#) for a brighter phrase.

**Over Cmaj7 (C major):** target E and B. Filter 2 is C lydian, the same notes
with F# instead of F; use it for a modern ending. Filter 3 is C harmonic major
if you want a darker, more exotic colour.

**The fourth trigger is the interesting one.** F3 (`v`) plays a Db7, the tritone
substitute for G7. Its filter 1 is Db lydian dominant, which contains G natural.
Play around G, Ab and F and you will hear the classic tritone-substitution
sound. This is the chord that the key-aware engine changed, so it is a good
place to test your ear.

**A sample solo for the ii-V-I:**

```text
Dm7:  A  F  E  D        (filter 1)
G7:   F  D  B  A        (filter 1) then hold F
Cmaj7: E  B  G  E       (filter 1) then rest
```

Do that twice, then repeat with filter 2 on the G7 and filter 2 on the Cmaj7 to
hear the colour difference.

### 5.2 C Minor II-V-I (featured)

Load **File -> Open Featured... -> C Minor II-V-I**. This is the darker,
jazzier cousin.

| Trigger | Chord | Filter 1 | Filter 2 | Filter 3 |
|---|---|---|---|---|
| C3 (`z`) | Dm7b5 | D locrian #2 | D locrian | D minor blues |
| D3 (`x`) | G7alt | G altered | G phrygian dominant | G half-whole diminished |
| E3 (`c`) | Cm(maj9) | C melodic minor | C harmonic minor | C minor bebop |

**Over Dm7b5 (D locrian #2, D E F G Ab Bb C):** the guide tones are F and C.
Locrian #2 has a natural E, which is what keeps it from sounding sour; use E as
a passing note. Filter 2 (D locrian) uses Eb instead, a more old-fashioned
sound.

**Over G7alt (G altered, G Ab Bb B Db Eb F):** this is a fully altered dominant,
the most tense chord in the progression. Target B and F, and use the altered
tensions Ab, Db and Eb as colour. Filter 2 (G phrygian dominant) is the
harmonic-minor sound with a natural fifth; filter 3 is the half-whole diminished
scale, which sounds almost orchestral. Try one phrase on each and pick your
favourite.

**Over Cm(maj9) (C melodic minor, C D Eb F G A B):** the tension resolves here.
Target Eb and B (the minor third and major seventh), the two notes that give
melodic minor its bittersweet sound. Filter 2 (C harmonic minor) has Ab instead
of A; filter 3 is a bebop scale.

**A sample solo over the minor ii-V-i:**

```text
Dm7b5: C  F  E  D          (filter 1)
G7alt: F  Eb Db B          (filter 1, altered tensions)
Cm:    Eb B  G  Eb         (filter 1, land on the major seventh then rest)
```

### 5.3 12-bar blues in C (classic)

Load **File -> Open Classic... -> 12-bar blues in C**. Eight bars, all dominant
seventh chords.

| Chord | Filter 1 | Filter 2 | Filter 3 |
|---|---|---|---|
| C7 | C mixolydian | C lydian dominant | C mixolydian b6 |
| F7 | F mixolydian | F lydian dominant | F mixolydian b6 |
| G7 | G mixolydian | G lydian dominant | G mixolydian b6 |

Blues is where you can be the most rhythmic and the least scale-conscious. Stay
on filter 1 (mixolydian, which has the essential minor seventh, Bb on C7) and
play blues phrases that repeat and answer each other. The trick is repetition:
play a two-bar idea, repeat it, then change its ending as the chord changes.

**When to use filter 2:** on the last two bars, or any time you want to lift the
tension. C lydian dominant has F#, which is the bright #11; it sounds modern
over the I chord. A classic move is to play the same phrase three times over
C7, F7 and C7 on filter 1, then play it once on filter 2 over G7 and resolve.

**The blues scale:** you can also press `5` to lock C mixolydian for a whole
chorus and just play. The minor third (Eb) over C7 is the blues note; the key
filtering will not stop you, because it is a black solo key.

### 5.4 Blue Bossa in C minor (classic)

Load **File -> Open Classic... -> Blue Bossa in C minor**. This tune moves
between C minor and its relative major, with a beautiful bII chord.

| Chord | Filter 1 | Filter 2 | Filter 3 |
|---|---|---|---|
| Cm7 | C dorian | C aeolian | C minor pentatonic |
| Fm7 | F dorian | F aeolian | F minor pentatonic |
| Dm7b5 | D locrian #2 | D locrian | D minor blues |
| G7 | G phrygian dominant | G lydian dominant | G mixolydian |
| Ebm7 | Eb dorian | Eb aeolian | Eb minor pentatonic |
| Ab7 | Ab mixolydian | Ab lydian dominant | Ab mixolydian b6 |
| Dbmaj7 | Db lydian | Db major | Db harmonic major |

**The opening Cm7 to Fm7** is a minor i to iv. Over both, target the guide tones
(Eb and Bb on Cm7, Ab and Eb on Fm7) and use A natural (the dorian sixth) as the
note that makes it sound like jazz rather than folk.

**The ii-V into C minor** (Dm7b5 to G7) is the same move as the C Minor II-V-I:
locrian #2, then phrygian dominant on the G7. The phrygian dominant contains Ab
and Eb, so it sits perfectly in C minor while the B natural pulls to C.

**The Ebm7 to Ab7 to Dbmaj7** is a ii-V-I in Db major. Over the Ab7 the engine
gives you Ab lydian dominant on filter 2, whose D natural is the #11, the
signature sound of the key change. This is a great place to switch to filter 2
for one phrase and back.

**When to use Solo in key here?** Not for the whole tune, because the changes to
Db major are the point. But you could switch it on for the opening Cm7/Fm7 vamp
to float, then turn it off before the Dm7b5.

### 5.5 Autumn Leaves in G minor (classic)

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

The first four bars are a ii-V-I in Bb major: Cm7 (dorian), F7 (mixolydian),
Bbmaj7 (major), Ebmaj7 (lydian). Play long, lyrical lines and aim at the third of
each chord. The engine gives Ebmaj7 lydian on filter 1, which adds A natural,
the note that makes the IV chord sound open rather than heavy.

The last four bars are a ii-V-i in G minor: Am7b5 (locrian #2), D7 (phrygian
dominant), Gm7 (dorian). Over the D7, filter 2 (D lydian dominant) is the
bright alternative, but the phrygian dominant is the more "minor" sound and
resolves beautifully to Gm7. End the tune on G, D and Bb.

### 5.6 Key awareness demo (featured)

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

Play each chord's filter 1, then filter 2, and listen to the chromatic notes the
engine puts in. Then switch the colour to **diatonic** above the scale grid and
play Am7 again; the B natural is replaced by Bb, and the chord sounds much
plainer. That contrast is the whole feature in one chord.

---

## 6. When to change the key, colour and Solo in key

Treat these as **performance settings**, set before you start:

- **Key:** set it once per song. Change it only when the song's key changes, or
  when you deliberately want to re-harmonise.
- **Colour:** jazz for most things, diatonic for modal or simple material,
  adventurous when you want to push. Do not change it mid-solo; change it
  between takes if at all.
- **Solo in key:** on for modal tunes and vamps; off for standards with rich
  changes. If you are recording, decide before you press Record.

The one exception is transpose: the left-hand `g` and `h` black keys shift the
chords mid-performance, which is a quick way to change key for a verse or to
save a singer.

---

## 7. Troubleshooting and a practice plan

- **"I am playing and nothing changes."** The on-screen keyboard needs focus;
  click it first. MIDI keyboards connect automatically.
- **"The solo sounds wrong over a chord."** Check which trigger you last
  pressed; the scale follows the chord. Press `4` to play the chord notes and
  re-orient, then `1`.
- **"Everything sounds the same."** You are probably staying on filter 1. Spend
  one full chord on filter 2, then return.
- **"I changed the key and the scales look different."** That is expected: the
  engine re-ranks every chord in the new key and colour.
- **"Solo in key does nothing."** On a diatonic major tune the key scale and the
  per-chord scales share the same notes, so it sounds identical. Try it over the
  tritone substitute on the C Major demo, or over So What.

A simple four-week practice plan:

1. **Week 1:** one song, filter 1 only, guide tones only, lots of rests.
2. **Week 2:** the same song, adding filter 2 for one phrase per chord.
3. **Week 3:** add filter 4 cadences and play the chord tones on the way into
   each new section.
4. **Week 4:** record a take in the Perform view, listen back, and keep the
   phrases you liked.
