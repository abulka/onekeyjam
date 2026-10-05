# OneKeyJam reference

Every control and every setting, in detail. If you are new, read the **Improvise**
page first: this page is the manual you dip into when you want to know exactly
what something does.

---

## The mental model

There are only three things happening.

1. **The left hand plays chords.** Each trigger key plays a whole chord with one
   finger, plus its bass note. You never play chord shapes.
2. **The right hand plays a filtered scale.** White solo keys are mapped onto the
   notes of the current scale, so whatever you play fits. You can still play the
   black solo notes for chromatic colour.
3. **The chord you last triggered chooses the scale.** That is why chord order
   matters: the left hand is really steering the harmony, and the right hand
   follows it.

On top of that, three settings shape the whole session:

- the **project key** (for example C major or C minor),
- the **colour** (how jazzy the scale suggestions are),
- **Solo in key** (whether the right hand follows each chord, or stays on the
  key scale).

Set these before you start; they are performance settings, not playing decisions.

---

## Key, colour and Solo in key

### The project key

The key is the song's home. The project key lives in the **Key Detection**
accordion on the Edit view, in the **Project Key** row, where you pick the tonic
and the type (major, minor, or a mode such as dorian). The label beside it
explains where the key came from:

| Label | Meaning |
|---|---|
| `(detected)` | Guessed from the chords, with nothing stored. |
| `✅✅ (set by project, matches detected)` | Stored, and it is the top detected key. A saved detection shows as `✅✅ (detected, saved)`. |
| `✅ (set by project, another detected key)` | Stored, and it is one of the valid detected keys, just not the top choice. Several keys can fit the same chords, so this is not a mistake. |
| `⚠️ (set by project, differs from detected)` | Stored, and no detected key matches it. |
| `(set by project, modal key)` | A mode (such as D dorian) that the major/minor detection cannot see. |
| `(set by project, no chords yet)` | An empty project with a key already chosen. |
| `(no chords yet, default key)` | An empty project with no key chosen. |

Hover the label to see the full list of detected keys. If a stored major/minor
key disagrees with every detected key, a red warning also appears with a
one-click "Use the detected key".

Why it matters: the key decides which scales the engine suggests, so the safe
notes agree with the song, and it keeps chromatic chords such as tritone
substitutes sounding intentional rather than random.

### Colour

Above the chord/scale grid, next to **Solo in key**, is the **Colour** dropdown.
It sets how much chromatic colour the scale suggestions keep:

- **jazz** (the default) keeps the idiomatic colours: dorian on minor seventh
  chords, locrian #2 on half-diminished chords, and the right dominant scales.
  Use this for almost everything.
- **diatonic** stays strictly in key. Use it for folk, pop, modal vamps and
  teaching, where you do not want any outside notes.
- **adventurous** leans into lydian and lydian-dominant colour. Use it when you
  want the solo to sound modern and a little outside.

Changing the key or the colour re-ranks every chord scale automatically, so you
do not need to do anything else.

### Solo in key

**Solo in key** keeps the right hand on the project key scale while the chords
change. It is perfect for:

- modal tunes such as *So What*,
- a simple minor vamp where you want to float over everything,
- beginners who want one scale for a whole song.

Leave it off for standards with lots of changes (Autumn Leaves, All the Things
You Are), where each chord's own scale is the point. The `1` `2` `3` shortcuts
still switch scales temporarily even when Solo in key is on. Press `0` (or hold
`Shift` and press the top left black key on a MIDI keyboard) to toggle it.

---

## Right-hand scales and filter slots

Each chord carries up to three stored scales plus the notes of the chord, and the
`1`-`4` keys choose which one filters your solo. The **Active Scale** panel always
shows what is sounding.

| Filter | MIDI keyboard | Computer key | What it is |
|---|---|---|---|
| Scale filter 1 | `C#` in the jam octave and above | `1` | the primary scale for the current chord |
| Scale filter 2 | `D#` in the jam octave and above | `2` | the first colour alternative |
| Scale filter 3 | `F#` in the jam octave and above | `3` | the second colour alternative |
| Notes of chord | `G#` in the jam octave and above | `4` | the chord's own notes |
| Lock scale | `A#` in the jam octave and above | `5` | freezes the scale so chord changes do not move it |

**Scale filters are your tone controls.** Filter 1 is home. Filter 2 is one step
beyond home and is where a lot of the interest lives: lydian dominant over a
dominant, locrian or locrian #2 over a half-diminished. Filter 3 tends to be a
pentatonic or an accessible colour. Filter 4 (notes of chord) is for playing the
actual chord tones, which is great at a cadence or when you want the solo to stop
and spell out the harmony.

**When you lock the scale** (`5`, or `A#` on a MIDI keyboard), the locked scale
is bolded in the grid with a padlock, so you can see at a glance which scale the
right hand is frozen into even as the chords change.

---

## The scale policy engine: manual, follow and shuffle

Everything above is manual: you press `1`, `2`, `3` and the right hand follows.
The **Scales** dropdown next to Solo in key can instead let the changes choose
for you. There are three modes:

- **manual** (the default): you stay in charge of the scale1/2/3 slots.
- **follow history**: for each chord the app picks the stored scale that
  continues the scale you just played and fits the function of the progression.
- **shuffle**: when the chord changes, the app draws from the top-ranked
  alternatives. The idiomatically correct primary scale is the usual choice and
  a close colour shift is occasional, so it varies the harmony gently. A
  repeated trigger of the same chord holds the scale, so it does not move the
  notes under your fingers.

Why this helps:

- **The changes steer the colour.** Follow hears a ii-V, a tritone substitute, a
  backdoor dominant or a full ii-V-I and picks the idiomatic scale, so the solo
  sounds intentional instead of accidentally outside.
- **Variety on demand.** Shuffle is a safe way to hear colours you would not have
  reached for; every choice still fits the chord, and it changes only on a chord
  change, so you cannot play a wrong note and the mapping stays put while you
  hold a phrase.
- **Phrases resolve (follow).** The phrase bias follows your last solo note, so a
  line does not get cut off by the next chord. It only changes the pick when
  that note distinguishes the stored scales; in a diatonic tune it correctly
  stays quiet. Shuffle ignores the last note; held notes are repaired instead
  (see `Settings` > `Held note repair`).
- **Nothing is a trap.** You can always override with the filters (`1`-`4`, or
  the right-hand black keys) or a grid click, and the app goes back to the policy
  on the next chord you play.

### Options reference

The **Preset** selector sits in the main row beside the **Scales** dropdown, so
the active flavour is always visible. The **Options** button next to it reveals
the fine-tuning controls. They only appear when a project is loaded.

| Control | Mode | Benefit | Default |
|---|---|---|---|
| `Preset` | both | One-click options for the active mode. Choose a starting point, then fine-tune. Always visible in the main row; shows a highlighted `Custom` when the values are hand-tuned. | Subtle / Simple |
| `Pool` (3-8) | shuffle | How many alternatives the draw uses. 3 = the stored scales only; 8 = more colour. | 3 |
| `Dwell` (1-4) | shuffle | How many chord changes to hold one draw before changing. Longer is steadier. | 2 |
| `Change` (0-100%) | shuffle | The chance of a new draw at each boundary. Lower keeps a colour longer. | 100% |
| `Spread` | shuffle | How far a change may move the notes: `same notes`, `1 note`, `2 notes` or `Wild`. | 1 note |
| `Hold` | shuffle | Do not jump the scale while solo notes are sounding; take the closest fit instead. | on |
| `Reroll` | shuffle | Draw a new scale for the current chord right now. | - |
| `Context` (1-2) | follow | Whether to look one chord back or two, so a full ii-V-I is recognised. | 1 chord |
| `Palette` | follow | Which stored scale follow prefers: `Primary` (best continuation), `Close colour` (best alternative that adds a note at each change) or `Bold` (biggest colour shift among the stored scales). Different from the project-wide `Colour:` selector. | Primary |
| `Phrase` + `Strength` | follow | Bias the next stored scale by your last solo note so the line resolves. Shuffle ignores the last note. | off |

The recent chord-to-scale **History** strip, and the optional pale fill on the
current scale-filter cell, are global display preferences, so they live in
`Settings` > `Preferences` rather than here.

The single most important thing to know: **shuffle only changes the scale when
the chord changes.** Repeated stabs of the same chord (the same white trigger key
on a MIDI keyboard, or `Z Z Z Z Z` on the computer keyboard) hold the scale, so
the notes never move under your fingers. That is what makes it playable.

### Presets

The presets are the easiest way in. For **shuffle** they are **Subtle** (the
default: only the stored scales, held longer, with rare close shifts), **Varied**
(a close
colour from a pool of five on each chord change) and **Wild** (no limits, for
experimenting). For **follow** they are **Simple** (one chord), **Progression**
(two chords), **Lyrical** (two chords plus phrase), **Resolve** (strong
phrase bias) and **Colourful** (`Palette: Close colour`). The selector shows a
highlighted `Custom` once you change any value by hand, so you always know when
you have moved away from a preset.

### Live read-outs

Above the grid you get:

- an `auto: <scale>` chip when a policy chose a scale that is not one of the
  stored slots,
- a short reason line, for example `ii-V-I into C: major`, `shuffle: 1 note
  change` or `shuffle: closest fit`,
- when a shuffled scale is not a stored slot, a dashed `closest` marker on the
  nearest stored scale in that row.

None of this changes the notes you can play; it just tells you what the app chose
and why.

### Manual takeover

With `follow history` or `shuffle` active, the grid still shows the stored
alternatives, and the active one is bolded. Press `1`-`4` (or click a scale cell)
to take over for the current chord. Your pick stays while that chord sounds, and
the next chord trigger returns to the chosen mode, so an override is never a
permanent lock.

### Reading the chord and scale grid

**Tiny labels in the scale grid.** Under each scale you may see a small tag:
**out of key** means the scale uses notes outside the project key (hover to see
which notes), and **jazz** or **adventurous** marks a scale that is a colour
choice of the active profile. With the colour set to `diatonic`, or on music that
never leaves the key, most scales are unlabelled.

**When Solo in key is on**, a `Solo in key -> C major` badge appears above the
grid, the stored scale names dim, and the **out of key** tags are struck through,
because every chord is now filtered to the key scale. The per-slot markers (the
cell highlight, the bold scale name and the `chosen` tag) pause too, since no
stored scale is the one sounding, and the Colour, Scales, Preset and Options
controls are dimmed and disabled until the mode is switched off. If you press
`1`-`4` (or the right-hand black keys `C#`-`G#` on a MIDI keyboard) to inspect a
chord scale, the markers and dimming pause for that chord and a muted `Solo in
key (temporarily overridden)` note appears, then the key scale returns on the
next chord trigger. The Colour, Scales, Preset and Options controls stay
disabled through that temporary override.

---

## Controls reference

The left-hand trigger octave and the right-hand jam octave follow the keyboard
config and any project override; the defaults are C3 for the triggers and C4 for
the jam notes. The on-screen keyboard labels show the computer keys.

| Control | MIDI keyboard | Computer keyboard | What it does |
|---|---|---|---|
| Chord trigger | white keys in the trigger octave: C D E F G A B | `z x c v b n m` | plays the chord mapped to that white key |
| Solo note | white keys from the jam octave upwards | `q w e r t y u` | plays a filtered note in the current scale |
| Scale filter 1 | `C#` in the jam octave and above | `1` | the primary scale for the current chord |
| Scale filter 2 | `D#` in the jam octave and above | `2` | the first colour alternative |
| Scale filter 3 | `F#` in the jam octave and above | `3` | the second colour alternative |
| Notes of chord | `G#` in the jam octave and above | `4` | filters the solo to the chord's own notes |
| Lock scale | `A#` in the jam octave and above | `5` | freezes the scale so chord changes do not move it |
| Toggle Solo in key | hold `C#` (shift), press `A#` | `0` | on/off, with a toast naming the key scale |
| Filter off | `D#` in the trigger octave | `d` | turns solo filtering off, so the keyboard is a plain piano |
| Filter on | `F#` in the trigger octave | `g` | turns solo filtering back on |
| Transpose down/up | `G#` / `A#` in the trigger octave | `h` / `j` | shifts the chords a semitone |
| Shift | hold `C#` in the trigger octave | hold `s` | modifies the other left black keys |
| All notes off | hold `C#` (shift), press `D#` | hold `s`, press `d` | stops every sounding note |
| Add chord | hold `C#` (shift), press `F#` | hold `s`, press `g` | opens the add-chord panel for the current chord |
| Reset transpositions | hold `C#` (shift), press `G#` | hold `s`, press `h` | undoes any transposing done while playing |

The computer keys work whenever the app window is focused; they pause only while
you are typing in a form field. Open **Shortcuts help** above the on-screen
keyboard for the full list, including octave shifts. In normal piano mode
(filtering and chord triggers off) every key plays a plain note.

**App shortcuts.** `Alt+1` magic mode, `Alt+2` normal piano, `Alt+3`/`Alt+4`
transpose down/up a semitone, `Alt+5`/`Alt+6` invert the chord voicing down/up,
and `Alt+7`/`Alt+8` move down/up the circle of fifths. Transpose and fifths
change every chord and the sounding key; invert rotates each chord's voicing.
Reset Transpositions undoes all three. These use `Alt`, not `Ctrl`, because
`Ctrl`+digit switches browser tabs.

### Trigger keys and solo keys

The chord table's **Trigger** column shows which left-hand key plays which chord.
On a MIDI keyboard the white trigger keys run C D E F G A B from C3 by default;
on the computer keyboard the same keys are `z x c v b n m`. The demo welcome
lists them too. Solo notes are the white keys to the right of the chord triggers
(from C4 by default), which are `q w e r t y u` on the computer keyboard.

Projects with more chords than the chord-count slider allows only put some chords
on keys, and which non-favourite chords are allocated can change between loads,
so always read the trigger key from the chord table rather than assuming.

---

## Try each feature (smoke tests)

Use the demo projects so you always hear a known progression.

**Follow and the progression context.** Load **C Major II-V-I**, set `Scales` to
`follow history`, open `Options` and set `Context` to `2 chords`. Play the trigger
keys for Dm7, G7 and Cmaj7. The reason above the grid on the Cmaj7 should read
`ii-V-I into C: major`. Set `Context` back to `1 chord` and repeat: the Cmaj7
reason changes to a plain resolution. Now play the Db7 trigger (the tritone
substitute) then Cmaj7, and listen for the lydian-dominant resolution.

**Shuffle is stable on repeated chords.** Set `Scales` to `shuffle`. Play the
same trigger key several times (one white MIDI key, or `Z Z Z Z Z` on the
computer keyboard): the scale must stay the same and the reason should say
`holding`. Then play two different chords in turn: each chord change may draw
once, and the reason names a close shift such as `shuffle: 1 note change`. This
is the behaviour that makes shuffle usable for a solo.

**Shuffle spread and hold.** Set `Spread` to `same notes`: changes keep the same
note set (only the label moves). Set it to `Wild`: changes may jump. Play a long
solo note, then change chord while it rings: the reason reads `closest fit` and
the notes move as little as possible. Press `Reroll` to force a new draw on the
current chord. Set `Change` to `0%` to keep the same colour across changes.

**Presets.** With `shuffle` selected, compare `Subtle`, `Varied` and `Wild` from
the `Preset` dropdown and listen to how much each one changes. With `follow
history` selected, compare `Simple`, `Progression` and `Lyrical`, and listen for
the ii-V-I and the phrase resolution. After you move any value by hand the
dropdown shows `Custom`, and picking a preset again restores a known combination.

**Follow palette.** Follow normally sounds the best continuation, which in a
diatonic tune is always `scale1`, so it can look static. Set `Palette` to
`Close colour` (or pick the `Colourful` preset) and play the progression again:
the reason line occasionally reads `palette: close colour (G lydian dominant
adds C#)` and the grid bolds a colour scale with a green `chosen` tag. `Bold`
takes the biggest colour shift the stored scales allow. All choices fit the
chord; `Primary` keeps the original sound. This is separate from the
project-wide `Colour:` selector, which decides how the stored scales are ranked.

**Phrase bias (follow).** Set `follow history`, tick `Phrase`, and play a long
solo note that only one stored scale contains, for example a held `C#` over
`G7`, then trigger that chord. The chosen scale contains your note and the
reason line reads `keeps your last note C#`; turn `Phrase` off and the pick
follows continuity instead. In a diatonic tune every stored scale already
contains the notes you are playing, so `Phrase` correctly changes nothing. Set
`Strength` to `high` for a stronger pull. Shuffle ignores the last note.

**Scale-cell fill.** In `Settings` > `Preferences`, `Fill the current scale
filter cell` paints a pale background behind the sounding scale filter's cell in
manual, follow and shuffle modes alike. It is off by default; with it off the
cell is marked by its border only.

**History strip.** In `Settings` > `Preferences`, tick `Show the recent
chord-to-scale history above the grid`. Play a few chords and watch
the `Recent:` strip list the last four chord-to-scale choices, each with a
`manual`, `follow` or `shuffle` badge. This is the best way to learn what the
policy is doing.

**Manual override.** Set `Scales` to `shuffle` or `follow history`, then press
`1`-`4` (the right-hand black keys `C#`-`G#` on a MIDI keyboard, or click a scale
cell in a chord row) to pick a scale, then play that chord's trigger key. Your
pick is respected: the scale stays on the chosen slot while that chord sounds.
It is then carried to the next different chord once, using that chord's own
scale for the slot, after which the policy resumes, so the override is never a
permanent lock.

The full developer reference, including the theory and the exact scoring, is in
`doco/SCALE-POLICIES.md`.

---

## Troubleshooting

- **"I am playing and nothing changes."** The on-screen keyboard needs focus;
  click it first. MIDI keyboards connect automatically.
- **"The solo sounds wrong over a chord."** Check which trigger you last pressed;
  the scale follows the chord. Press `4` to play the chord notes and re-orient,
  then `1`.
- **"Everything sounds the same."** You are probably staying on filter 1. Spend
  one full chord on filter 2, then return.
- **"I changed the key and the scales look different."** That is expected: the
  engine re-ranks every chord in the new key and colour.
- **"Solo in key does nothing."** On a diatonic major tune the key scale and the
  per-chord scales share the same notes, so it sounds identical. Try it over the
  tritone substitute on the C Major demo, or over So What.

---

## More documentation

- `doco/SCALE-POLICIES.md` - the scale policy engine, phase by phase, with the
  exact scoring and regression tests.
- `doco/MUSIC-THEORY.md` - how chord-scale matching works and why a scale is
  chosen.
- `doco/NOTES.md` - MIDI setup, deployment and the older usage notes.
- `doco/ARCHITECTURE.md` - how the app is put together.
- The **Shortcuts help** button above the on-screen keyboard lists every key.
