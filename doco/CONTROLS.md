# Controls reference

Every MIDI and computer-keyboard mapping, in one place. If you are new, read the **Improvise** page first: this page is the manual you dip into when you want to know exactly what a key does.

---

The left-hand trigger octave and the right-hand jam octave follow the keyboard
config and any project override; the defaults are C3 for the triggers and C4 for
the jam notes. The on-screen keyboard labels show the computer keys.

## Table of controls

| Control | MIDI keyboard | Computer keyboard | What it does |
|---|---|---|---|
| Chord trigger | white keys from the trigger octave upwards: C D E F G A B, then the next octave for chords 8-14, and so on | `z x c v b n m` for seven chords, then `q w e r …` continue into higher triggers | plays the chord mapped to that white key; once a higher trigger is assigned, that key stops being a solo key |
| Solo note | white keys from the jam octave upwards; the jam octave moves up past the triggers, so with more than seven chords soloing starts higher | the keys after the last chord trigger; for seven chord songs that is `q w e r t y u i o p [ ] \` | plays a filtered note in the current scale |
| Scale filter 1 | `C#` in the jam octave and above | `1` | the primary scale for the current chord |
| Scale filter 2 | `D#` in the jam octave and above | `2` | the first colour alternative |
| Scale filter 3 | `F#` in the jam octave and above | `3` | the second colour alternative |
| Notes of chord | `G#` in the jam octave and above | `4` | filters the solo to the chord's own notes |
| Lock scale | `A#` in the jam octave and above | `5` | freezes the scale so chord changes do not move it |
| Set scale filter | `C#` `D#` `F#` `G#` `A#` in the jam octave and above | `1` `2` `3` `4` `5` | picks the scale the right hand plays in; works only while scale filtering is on |
| Toggle Solo in key | hold `C#` (shift), press `A#` | `0` | on/off, with a toast naming the key scale |
| Scale filter off | `D#` in the trigger octave | `d`, or `Alt+1` in magic mode | turns solo filtering off, so the keyboard is a plain piano |
| Scale filter on | `F#` in the trigger octave | `g`, or `Alt+2` in magic mode | turns solo filtering back on |
| Transpose down/up | `G#` / `A#` in the trigger octave | `-` / `+` (easiest), or `h` / `j` | shifts the chords a semitone |
| Invert chord voicing down/up | - | `Alt+5` / `Alt+6` | rotates each chord's notes down/up |
| Circle of fifths down/up | - | `Alt+7` / `Alt+8` | moves every chord down/up a fifth |
| Shift | hold `C#` in the trigger octave | hold `s` | modifies the other left black keys |
| All notes off | hold `C#` (shift), press `D#` | hold `s`, press `d` | stops every sounding note |
| Add chord | hold `C#` (shift), press `F#` | `/`, or hold `s`, press `g` | adds a new chord row and selects it; edit it in the inspector |
| Add chord (Normalised) | - | `Shift+/` | adds a new chord row using the generated Normalised voicing, even when Edit Chords has a Custom voicing selected |
| Commit the edit | - | `Enter` / `Shift+Enter` | saves the chord highlighted in Edit Chords with the voicing selected there; `Shift+Enter` saves it with the Normalised voicing |
| Reset transpositions | hold `C#` (shift), press `G#` | hold `s`, press `h`, or `Backspace` | undoes any transposing done while playing |
| Audition picked chord | - | hold `` ` `` (top-left key) | plays the chord currently in the Chord Inspector without adding it; releasing it hands sound back to any preview still hovered (see below) |
| Replay current chord | - | hold `'` | replays the current left-hand chord (on a MIDI keyboard, replay its white trigger key); releasing it also hands sound back to any preview still hovered |
| Next/previous chord | - | hold `→` / `←` | steps through the project's chords with wrap-around and plays each one (on a MIDI keyboard, play the white trigger keys directly) |
| Switch to magic mode | - | `,` | turns on one-finger chords and scale filtering |
| Switch to normal piano | - | `.` | plays a plain keyboard, with chords and filtering off |

The computer keys work whenever the app window is focused; they pause only while
you are typing in a form field. Open **Shortcuts help** above the on-screen
keyboard for the full list. In normal piano mode every key plays a plain note and
the computer keyboard uses the standard Ableton/Logic layout: white keys
`A S D F G H J K L ;`, black keys `W E T Y U O P`, and `Z` / `X` shift the
computer keyboard down / up an octave.

**App shortcuts.** The `Alt` shortcuts in the table use `Alt`, not `Ctrl`,
because `Ctrl`+digit switches browser tabs.

**Transport and navigation keys.** `Space` stops recording or
the pattern, or starts the pattern when it has notes. `Tab` switches between the
Edit and Perform pages, and `Shift+Tab` between the current page and Help. `Esc`
closes the shortcuts help or the welcome message.

---

## Browser sound unlock

Browsers start built-in sound suspended after a page load or refresh. They only
allow sound after a decisive gesture: a click, tap, or key press. Hovering
alone can never unlock it.

This means the first hover after a refresh stays silent. The status area shows
a notice until sound runs: click or press any key once, then hover again.
Triggering a chord always counts as a gesture, so it wakes sound. Holding
Backquote also counts, although its first press can still be silent while
waking. Once unlocked, hover audition works until the next reload. Hover paths
never attempt to unlock, so hovering while locked stays silent without filling
the console with warnings.

## Auditioning: hover vs click, and Backquote resume

Audition previews never change your work. They play without touching the draft,
the grid, the take, or Flashback Capture.

- Hover a browse chord, a Transpose and invert button, or a grid speaker button
  to hear it. Moving away stops it. The Edit Chords draft stays clean.
- Click a browse chord, or a Transpose and invert button, to load that chord
  into Edit Chords as an unsaved change. The row in the chord grid only changes
  when you press Save changes. Clicking itself plays no sound; hover already
  previewed it.
- Hold Backquote (```) to hear the draft chord that Save would write. Release
  stops the draft. If the pointer is still over a browse chord, a transpose
  preview, or a grid speaker button, that preview resumes at once, re-derived
  from the current draft, so a transform you applied while hovering sounds as
  the button now proposes rather than the version seen on entry. Moving away
  first means nothing resumes.
- Hold `'` to replay the current left-hand chord, exactly as before. Releasing
  it also hands sound back to any preview still hovered, the same as releasing
  Backquote.

---

## Opening a chord in Edit Chords

Clicking anywhere in a chord grid row triggers that chord quietly and selects
the row, so the sounding chord and the Edit Chords draft follow it. It does not
open the panel or move the page.

To open a row in the inspector, hover its chord cell and click the small pencil
that appears at the top right. The pencil shows while the pointer is over the
cell and while Edit Chords is closed, so it is only offered when it has a job:
with the panel already open, clicking a row switches the inspector by itself. It
opens the panel and brings its header into view when the panel is off screen.
The pencil is not shown on the Perform page, which has no inspector.

**Cancel** in the Edit Chords actions row discards the draft, exactly like
Revert, and then closes the panel. The row stays selected, so opening it again
shows the saved chord.

**Delete** asks in place rather than in a browser dialog: a small card appears
above the button naming the chord and its id, with a red Delete and a Keep.
Only the card's Delete removes the row. It closes on Keep, on Escape, on a click
away, or on its own after a few seconds. After the delete the next row is
selected, or the row before it when the deleted row was the last one.

**/ Bass** is the chord's bass, shared by the Normalised and Custom voicings.
Play a chord whose lowest note is not its root, such as `D4 G4 B4` (`GM/D`), and
the field fills with that bass; a root-position chord leaves it blank, which
means the low note is derived when you save. Changing the **Root** or **Chord**
picker clears it, because that is a different chord. Transposing, or moving by a
fifth, keeps it and moves it with the root in both voicings, so `GM/D` up a
semitone is `G#M/D#`; inverting keeps it as well.

---

## Trigger keys and solo keys

The chord table's **Trigger** column shows which left-hand key plays which chord.
It names the note and, in brackets, the computer key that plays the same trigger,
for example `G3 (B)`. On a MIDI keyboard the white trigger keys run C D E F G A B
from C3 by default; on the computer keyboard the same keys are `z x c v b n m`
for seven chords, and higher triggers continue on `q w e r …`. The demo welcome
lists them too. Solo notes are the white keys to the right of the chord triggers
(from C4 by default), which are the computer keys after the last trigger,
`q w e r t y u` for a seven chord song. White keys below the jam octave that no
chord trigger uses become extra low solo notes, so the first solo key is always
the white note just after the last chord trigger.

Seven chords fit comfortably in one octave, which suits computer keyboard
playing. More chords are allowed: extra triggers continue into higher octaves
(chords 8-14 in the next octave, and so on), the jam octave moves up to make
room, and the solo keys shift up with it, leaving fewer keys for soloing. On
the computer keyboard this means the `q` row keys become chord triggers
once assigned, and soloing moves up to the `i o p` row and beyond. An external
MIDI keyboard config can raise the soloing start note to make more room.
A project remembers its grid height, so it reopens at the size it was left.
Generated songs whose chord list covers every chord open with all of them on
keys.

Every classic, rock and progression song ships one or more demo loops in the
pattern sequencer that follow the song's harmony rhythm. Pressing play recreates
the song, and each pattern note targets the matching grid row. Repeated chords
share a grid row, so Blue Moon loops triggers 1-2-3-4-1-2-3-4 on four rows;
half bars split a bar between two chords, and chords held across bars sound as
one sustained note. The blues entries run the full twelve bar quick change.

Most standards and blues offer more than one version. A "Song sequence" picker,
in the Pattern Sequencer panel and in the second-level menu bar, switches
between the short excerpt, a middle section and the full form. The chosen
version is remembered as your preference: loading a song that lacks it falls
back to the excerpt without losing the choice, and the next song that offers it
opens on it again. The full form only adds the distinct chords it introduces,
so the grid grows just enough to cover them. The menu bar also has a Play/Stop
button, so the pattern can be started from the Edit, Perform or Settings page
without opening the panel.

Loading a song also sets the global tempo to the selected sequence's tempo, so
each tune plays at its own speed. Turning the tempo knob afterwards still works
and is remembered until the next song loads.

Projects with more chords than the grid height only put some chords on keys.
The exact chords and their trigger positions are saved with the project, so they
do not change between loads. Use **Deal new chords** to draw a different hand
from the pool; favourite (keeper) chords stay pinned. You can always read the
trigger key for a chord from the chord table.

---

## Appendix: limitations of computer keyboard playing

This is an edge case that most players never run into, so feel free to skip
it. A computer keyboard is not a piano: some models can only report two or
three keys held down at the same time, and a few key combinations are blocked
completely. This is called **key ghosting**, and it is a limit of your
keyboard, not a bug in OneKeyJam. When the keyboard does not report a key
press, the app never receives it, so it cannot play the note.

On the rare occasion it shows up, it is when you hold a chord trigger
(`z x c v b n m`) and add two or more solo notes (`q w e r t y u`) at the same
time. For example, `M` and `U` sit in the same column of the keyboard's
internal matrix, so holding `M`, `U` and `O` together can drop one note, while
`M`, `I` and `O` (or a MIDI keyboard) plays all three.

If you ever notice a missing note:

- Hold fewer keys at once.
- Choose solo keys that are not in the same vertical column as the trigger you
  are holding.
- Use a MIDI keyboard or the on-screen keyboard, which have no such limit.
