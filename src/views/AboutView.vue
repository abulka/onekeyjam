<script setup>
import { RouterLink } from 'vue-router'

import mainView from '../../doco/images/onekeyjam-main-view.png'
import performanceView from '../../doco/images/onekeyjam-performance-view.png'
import sequencerView from '../../doco/images/onekeyjam-screenshot-2-sequencer.png'
import featuresView from '../../doco/images/onekeyjam-screenshot-4-features.png'
import externalKeyboard from '../../doco/images/example-external-midi-keyboard.avif'
</script>

<template>
  <main class="help">
    <div class="ui container">

      <!-- Hero -->
      <div class="ui center aligned pad-top hero">
        <h1 class="ui huge header">OneKeyJam</h1>
        <p class="ui large text">
          Play chords with one finger in your left hand, and jam safely in the right hand.
        </p>
      </div>

      <!-- What it is -->
      <h2 class="ui header">What is OneKeyJam?</h2>
      <p>
        OneKeyJam is a browser-based MIDI app. Left-hand notes trigger whole chords
        with a single finger, and right-hand notes are filtered into the current
        scale, so everything you play fits the chord. Change chord and the safe
        notes change with it. It can drive a real MIDI keyboard and DAW (for
        example Ableton), or make the sound in the browser using the bundled
        General MIDI sounds.
      </p>

      <!-- Explore -->
      <h2 class="ui header">Explore the app</h2>
      <p>
        The screen gives away more than it first appears. Opening up the sections
        of the UI and drilling in reveals all sorts of features, such as:
      </p>

      <h3 class="ui header">Edit view accordions</h3>
      <ul class="ui list">
        <li>
          <strong>Edit Chords</strong> - add, edit and audition the chords in your
          project, and choose the scale filters used in the right hand.
        </li>
        <li>
          <strong>Edit Scales</strong> - define the scales and their notes.
        </li>
        <li>
          <strong>Import MIDI File</strong> - load a MIDI file and OneKeyJam finds
          the chords inside it and lays them out across the keyboard.
        </li>
      </ul>
      <p>
        MIDI keyboard setup and the debug panels live on the
        <RouterLink to="/settings">Settings view</RouterLink>.
      </p>

      <h3 class="ui header">Menu bar</h3>
      <p>
        The <strong>File</strong> menu, <strong>DEMO</strong>, <strong>Start
        Tour</strong> and the current project name appear on the Edit, Perform and
        Settings views. The <strong>Actions</strong> menu changes with the view:
        the Edit view has project actions, while the Perform view has playing and
        recording actions. The Help view has no menu bar.
      </p>
      <p>
        Use the <strong>File</strong> menu to open and save projects. It includes
        <em>New</em>, <em>Open</em>, <em>Open Featured</em>, <em>Save</em>,
        <em>Save As</em>, <em>Reload current Project</em>, <em>Import MIDI file</em>,
        <em>Download / Upload Project</em> (to back up or move projects between
        machines), and <em>Download MIDI Chords</em> in a couple of formats.
      </p>

      <h3 class="ui header">Edit view Actions menu</h3>
      <ul class="ui list">
        <li><strong>Reallocate Chords</strong> - shuffle the chord triggers across the keyboard.</li>
        <li><strong>Find Matching Scales</strong> - suggest scales that fit the chords.</li>
        <li><strong>Reset Transpositions</strong> - undo any transposing you did while playing.</li>
        <li><strong>Fill with Key Signature</strong> - seed the scale filters from a key signature.</li>
      </ul>

      <h3 class="ui header">And there is more</h3>
      <ul class="ui list">
        <li><strong>DEMO</strong> - load the C Major II-V-I demo project, focus the keyboard and show a short getting-started guide with a <strong>Jam!</strong> button.</li>
        <li><strong>Start Tour</strong> - a guided tour of the controls on the current view.</li>
        <li>The chord and scale pickers, with search and audition buttons.</li>
        <li>The <strong>Circle of Fifths</strong> helper.</li>
        <li>The <strong>keyboard note meanings</strong> legend, which explains what every key does.</li>
        <li>The <strong>scale filtering toggles</strong> for switching filtering on and off.</li>
      </ul>

      <!-- Perform view -->
      <h2 class="ui header">The Perform view</h2>
      <p>
        The <RouterLink to="/perform">Perform view</RouterLink> is where you play
        and record; playing and recording share one page. It shows the active
        chord and the active scale as you go, together with a live piano keyboard,
        the scale-filtering toggles and the note-meanings legend. The
        <strong>File</strong> menu is the same as on the Edit view, while the
        <strong>Actions</strong> menu offers <strong>Play Chord
        Sequencer</strong>, <strong>Record</strong> and <strong>Export
        MIDI</strong>. Expand the accordions underneath to reach:
      </p>
      <ul class="ui list">
        <li><strong>Record</strong> - capture a take: press Record, play both hands, then press Stop. The left-hand chords (with their bass) and the scale-filtered right-hand solo notes are captured on two separate tracks. The panel also has the play/pause scrubber, the playback key-highlight choice, Export MIDI and Clear.</li>
        <li><strong>Recording Sequencer</strong> - shows the captured take in a piano roll. Use the Chords, Solo and Both buttons to view the tracks; Chords and Solo are editable, and changes are written straight back to the take. Click the piano strip on the left to hear a note.</li>
        <li><strong>Chord Sequencer</strong> - draw a chord-sequence loop; audition it from the piano strip or by clicking a note (a chord trigger plays its chord), fit the loop to the notes, and clear it. Tick <strong>Include in recording</strong> to loop it while you record a solo, and it is merged into the take on Stop.</li>
        <li><strong>Chord / Scale Table</strong> - the chords and their scale filters at a glance; click a row to trigger the chord.</li>
        <li><strong>Active Chord</strong> - the chord that is currently sounding, with its notes and bass.</li>
        <li><strong>Active Scale</strong> - the scale the right hand is currently filtered into.</li>
      </ul>
      <p>
        The status readouts at the top of the page summarise the current chord and
        scale at a glance, so you always know what you are playing over. Recording
        is free (no quantisation or metronome) and is timed at 120 BPM. The latest
        take is kept in the browser, so a page refresh does not lose it; clear it
        with the Clear button when you are done.
      </p>

      <figure>
        <img class="screenshot" :src="performanceView" alt="OneKeyJam performance view showing the active chord and active scale" />
        <figcaption class="screenshot-caption">
          The Perform view, with the active chord, active scale and live keyboard.
        </figcaption>
      </figure>

      <!-- Features -->
      <h2 class="ui header">Features</h2>
      <ul class="ui list">
        <li>
          <strong>Single-finger chords</strong> - each left-hand key plays a full
          chord from your project. No chord shapes to learn.
        </li>
        <li>
          <strong>Scale filtering</strong> - right-hand notes snap to the scale
          that fits the current chord, so improvisation always sounds right.
        </li>
        <li>
          <strong>Black-key modifiers</strong> - switch scale, transpose chords
          and turn filtering on or off while you play.
        </li>
        <li>
          <strong>Real MIDI, or built-in sounds</strong> - send notes to a DAW
          over the macOS IAC Driver (jam notes, chords and bass on separate
          channels), or use the bundled General MIDI sounds in the browser.
        </li>
        <li>
          <strong>Projects you control</strong> - configure chords and scales with
          JSON, save projects in your browser, and export or import them as files.
        </li>
        <li>
          <strong>Ready-made demo projects</strong> - open a featured project and
          start playing straight away.
        </li>
        <li>
          <strong>Import MIDI files</strong> - load a MIDI file and OneKeyJam
          finds the chords inside it, then assigns them across the keyboard.
        </li>
        <li>
          <strong>Play from your computer keyboard</strong> - click the on-screen
          keyboard, then play chords with the lower row (<code>z x c v b n m</code>)
          and solo notes with the upper row (<code>q w e r t y u</code>). The black
          keys are <code>s d g h j</code> on the left and <code>2 3 5 6 7</code> on
          the right. Open <strong>Shortcuts help</strong> next to the keyboard note
          meanings for the full list, including function keys and Ctrl shortcuts.
        </li>
      </ul>

      <!-- Getting started -->
      <h2 class="ui header">Getting started</h2>
      <ol class="steps">
        <li>Open the app and choose <strong>File &rarr; Open Featured...</strong> to load a demo project.</li>
        <li>Play the highlighted left-hand keys to trigger chords.</li>
        <li>Play anywhere to the right to jam - the notes are filtered to fit the chord.</li>
        <li>Use the black keys to switch scale or transpose.</li>
      </ol>
      <p>
        In a hurry? Click <strong>DEMO</strong> in the menu bar to load a demo
        project, focus the keyboard and see a short guide with a
        <strong>Jam!</strong> button. A guided tour is available from the
        <strong>Start Tour</strong> item in the menu. To build a project from an
        existing song, choose <strong>File &rarr; Import MIDI file...</strong> and
        OneKeyJam will detect the chords and lay them out on the keyboard.
      </p>

      <figure>
        <img class="screenshot" :src="mainView" alt="OneKeyJam edit view, where you edit your project" />
        <figcaption class="screenshot-caption">
          The Edit view, where you edit your project: one-finger chords, scale
          filters and the piano keyboard.
        </figcaption>
      </figure>

      <!-- Playing -->
      <h2 class="ui header">Use a MIDI keyboard</h2>
      <img class="midi-keyboard-image" :src="externalKeyboard" alt="An external MIDI keyboard connected to OneKeyJam" />
      <p>
        Plug in a MIDI keyboard and Chrome connects to it automatically through
        the built-in Web MIDI support - no setup needed. Sound is made in the
        browser out of the box, and you can also route notes to a DAW or synth
        such as Ableton via the macOS IAC Driver. MIDI needs a secure context, so
        the page must be served over HTTPS (or <code>localhost</code>).
      </p>
      <p>
        See the
        <a href="https://github.com/abulka/onekeyjam/blob/main/doco/NOTES.md" target="_blank" rel="noopener">MIDI setup notes</a>
        for the full MIDI and DAW configuration.
      </p>

      <h2 class="ui header">Play with your computer keyboard</h2>
      <ol class="steps">
        <li>Click the on-screen piano keyboard once so that it has focus.</li>
        <li>Trigger chords with the lower row, <code>z x c v b n m</code> (the white keys of the chord trigger octave).</li>
        <li>The black keys <code>s d g h j</code> in that octave are the chord modifiers. Hold <code>s</code> as a shift key and use the others to switch scales or transpose.</li>
        <li>Play solo notes with the upper row, <code>q w e r t y u</code>. These are filtered into the current scale.</li>
      </ol>
      <p>
        The keys only work while the on-screen keyboard has focus, so if typing
        does nothing, click the keyboard first. The octaves follow the keyboard
        config, so a different project or keyboard may shift the notes that each
        key plays.
      </p>

      <!-- Sequencer & features screenshots -->
      <h2 class="ui header">More screenshots</h2>

      <figure>
        <img class="screenshot" :src="sequencerView" alt="OneKeyJam built-in sequencer" />
        <figcaption class="screenshot-caption">
          The Chord Sequencer: draw a looping chord sequence on the piano roll,
          then play it back over your playing.
        </figcaption>
      </figure>

      <h3 class="ui header">Features at a glance</h3>
      <div class="features-scroll">
        <img :src="featuresView" alt="A summary of OneKeyJam features" />
      </div>
      <p class="screenshot-caption">A quick visual summary of the main features.</p>

      <!-- Free to use -->
      <h2 class="ui header">Free to use</h2>
      <p>
        OneKeyJam is free and open source, with no subscriptions. All features are
        available to everyone. See the
        <a href="https://github.com/abulka/onekeyjam" target="_blank" rel="noopener">OneKeyJam public GitHub page</a>
        for the source code.
      </p>

      <h2 class="ui header">Issues and bugs</h2>
      <p>
        Report any issues, feature requests or bugs in the
        <a href="https://github.com/abulka/onekeyjam/issues" target="_blank" rel="noopener">OneKeyJam issue tracker</a>.
      </p>

      <h2 class="ui header">Further reading</h2>
      <ul class="ui list">
        <li>
          <a href="https://github.com/abulka/onekeyjam/blob/main/doco/ARCHITECTURE.md" target="_blank" rel="noopener">Architecture</a>
          - how the app is put together.
        </li>
        <li>
          <a href="https://github.com/abulka/onekeyjam/blob/main/doco/DATA-MODEL.md" target="_blank" rel="noopener">Data model</a>
          - the project and keyboard data model.
        </li>
        <li>
          <a href="https://github.com/abulka/onekeyjam/blob/main/doco/NOTES.md" target="_blank" rel="noopener">Notes</a>
          - detailed MIDI setup and usage reference.
        </li>
      </ul>

    </div>
  </main>
</template>

<style scoped>
.help {
  padding-bottom: 4rem;
}

.help .hero {
  padding-bottom: 0.5rem;
  text-align: center;
}

.help .screenshot {
  width: 100%;
  height: auto;
  border: 1px solid #d9c9b0;
  border-radius: 4px;
  background-color: #fff;
}

.help .screenshot-caption {
  color: #6b5a45;
  font-size: 0.95rem;
  margin: 0.5rem 0 1.5rem;
}

.help .steps {
  line-height: 1.8;
}

.help .midi-keyboard-image {
  float: right;
  width: 200px;
  margin: 0 0 1rem 1.5rem;
  border: 1px solid #d9c9b0;
  border-radius: 4px;
}

.help .features-scroll {
  max-height: 70vh;
  overflow: auto;
  border: 1px solid #d9c9b0;
  border-radius: 4px;
  background-color: #fff;
}

.help .features-scroll img {
  display: block;
  width: 100%;
  height: auto;
}

@media (max-width: 600px) {
  .help .midi-keyboard-image {
    float: none;
    width: 100%;
    margin: 1rem 0;
  }
}
</style>
