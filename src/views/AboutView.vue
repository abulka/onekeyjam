<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { globals } from '../lib/globals.js'
import HelpArticle from '../components/help/HelpArticle.vue'
import { extractHeadings } from '../lib/markdown.js'
import tutorialMarkdown from '../../doco/IMPROVISING-TUTORIAL.md?raw'
import referenceMarkdown from '../../doco/REFERENCE.md?raw'

import mainView from '../../doco/images/onekeyjam-main-view.png'
import performanceView from '../../doco/images/onekeyjam-performance-view.png'
import sequencerView from '../../doco/images/onekeyjam-screenshot-2-sequencer.png'
import featuresView from '../../doco/images/onekeyjam-screenshot-4-features.png'
import externalKeyboard from '../../doco/images/example-external-midi-keyboard.avif'

// The Help pages menu; the selection is remembered in uiPrefs, so you can flip
// to the Perform or Edit view and come back to the same page.
const HELP_PAGE_LINKS = [
  { id: 'overview', label: 'Overview' },
  { id: 'tutorial', label: 'Improvise' },
  { id: 'reference', label: 'Reference' },
]

// The markdown page currently shown, or '' for the Overview.
const markdownForPage = computed(() => {
  if (globals.helpPage === 'tutorial')
    return tutorialMarkdown
  if (globals.helpPage === 'reference')
    return referenceMarkdown
  return ''
})

// The section list in the right-hand sidebar. Markdown pages come from the
// same source as the rendered article, so the anchors always match; the
// hand-written Overview is read from the rendered headings (which carry ids).
const tocHeadings = ref([])

const bodyEl = ref(null)
const activeId = ref('')

function buildToc() {
  const body = bodyEl.value
  if (!body) {
    tocHeadings.value = []
    return
  }
  if (markdownForPage.value) {
    tocHeadings.value = extractHeadings(markdownForPage.value)
      .filter(heading => heading.level === 2 || heading.level === 3)
    return
  }
  tocHeadings.value = Array.from(body.querySelectorAll('h2[id], h3[id]')).map((element) => ({
    id: element.id,
    text: (element.textContent || '').replace(/\s+/g, ' ').trim(),
    level: element.tagName === 'H3' ? 3 : 2,
  }))
}

let ticking = false

function updateActive() {
  ticking = false
  const body = bodyEl.value
  if (!body)
    return
  const nodes = Array.from(body.querySelectorAll('h2[id], h3[id]'))
  if (nodes.length === 0) {
    activeId.value = ''
    return
  }
  const offset = 96
  let current = nodes[0].id
  for (const node of nodes) {
    if (node.getBoundingClientRect().top <= offset)
      current = node.id
    else
      break
  }
  activeId.value = current
}

function onScroll() {
  if (ticking)
    return
  ticking = true
  requestAnimationFrame(updateActive)
}

function jump(id, event) {
  const body = bodyEl.value
  if (!body)
    return
  const target = body.querySelector(`#${CSS.escape(id)}`)
  if (!target)
    return
  target.scrollIntoView({ behavior: 'smooth', block: 'start' })
  activeId.value = id
  const link = event?.target
  if (link && typeof link.scrollIntoView === 'function')
    link.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' })
}

async function showPage(id) {
  if (globals.helpPage !== id) {
    globals.helpPage = id
    await nextTick()
  }
  buildToc()
  window.scrollTo({ top: 0, behavior: 'auto' })
  updateActive()
}

function scrollTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

// On narrow screens the section list collapses into a dropdown above the
// article; on wide screens it is the sticky right-hand sidebar.
const narrowQuery = typeof window !== 'undefined' && typeof window.matchMedia === 'function'
  ? window.matchMedia('(max-width: 900px)')
  : null
const isNarrow = ref(narrowQuery ? narrowQuery.matches : false)

function onNarrowChange(event) {
  isNarrow.value = event.matches
}

onMounted(async () => {
  await nextTick()
  buildToc()
  updateActive()
  window.addEventListener('scroll', onScroll, { passive: true })
  if (narrowQuery)
    narrowQuery.addEventListener('change', onNarrowChange)
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll)
  if (narrowQuery)
    narrowQuery.removeEventListener('change', onNarrowChange)
})

watch(() => globals.helpPage, async () => {
  activeId.value = ''
  await nextTick()
  buildToc()
  updateActive()
})
</script>

<template>
  <main class="help">
    <div class="ui container">

      <div class="help-layout">
        <div ref="bodyEl" class="help-body">

          <template v-if="globals.helpPage === 'tutorial'">
            <HelpArticle :markdown="tutorialMarkdown" />
          </template>

          <template v-else-if="globals.helpPage === 'reference'">
            <HelpArticle :markdown="referenceMarkdown" />
          </template>

          <template v-else>

      <!-- Hero -->
      <div class="ui center aligned pad-top hero">
        <h1 class="ui huge header">OneKeyJam</h1>
        <p class="ui large text">
          Play chords with one finger in your left hand, and jam safely in the right hand.
        </p>
      </div>

      <div class="ui message tutorial-callout">
        <strong>Want to improvise a whole performance?</strong>
        Start with the <a href="#" @click.prevent="globals.helpPage = 'tutorial'">Improvise</a> page
        - a quick start and song walkthroughs with sample solos. Every control and
        setting is explained on the <a href="#" @click.prevent="globals.helpPage = 'reference'">Reference</a> page.
      </div>

      <!-- What it is -->
      <h2 id="what-is-onekeyjam" class="ui header">What is OneKeyJam?</h2>
      <p>
        OneKeyJam is a browser-based MIDI app. Left-hand notes trigger whole chords
        with a single finger, and right-hand notes are filtered into the current
        scale, so everything you play fits the chord. Change chord and the safe
        notes change with it. It can drive a real MIDI keyboard and DAW (for
        example Ableton), or make the sound in the browser using the bundled
        General MIDI sounds.
      </p>

      <!-- Getting started -->
      <h2 id="getting-started" class="ui header">Getting started</h2>
      <ol class="steps">
        <li>Open the app and choose <strong>File &rarr; Open Featured...</strong> to load a demo project.</li>
        <li>Play the highlighted left-hand keys to trigger chords. On a MIDI keyboard these are the white keys in the chord trigger octave (C3 to B3 by default); on the computer keyboard they are <code>z x c v b n m</code>.</li>
        <li>Play the white keys to the right to jam - the notes are filtered to fit the chord. On the computer keyboard that is <code>q w e r t y u</code>, starting at C4 by default.</li>
        <li>Use the black keys to switch scale or transpose: the left hand for the modifiers, the right hand to choose the scale filter.</li>
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

      <h3 id="midi-keyboard" class="ui header">Play with a MIDI keyboard</h3>
      <img class="midi-keyboard-image" :src="externalKeyboard" alt="An external MIDI keyboard connected to OneKeyJam" />
      <p>
        Plug in a MIDI keyboard and Chrome connects to it automatically through
        the built-in Web MIDI support - no setup needed. Sound is made in the
        browser out of the box, and you can also route notes to a DAW or synth
        such as Ableton via the macOS IAC Driver. MIDI needs a secure context, so
        the page must be served over HTTPS (or <code>localhost</code>).
      </p>
      <p>
        The left-hand black keys are the performance modifiers: <code>C#</code> is
        shift (hold it), <code>D#</code> turns filtering off, <code>F#</code> turns
        it on, and <code>G#</code> / <code>A#</code> transpose. With <code>C#</code>
        held, <code>A#</code> toggles Solo in key and <code>G#</code> resets
        transpositions. The right-hand black keys (<code>C#</code>, <code>D#</code>,
        <code>F#</code>, <code>G#</code>, <code>A#</code>) pick the scale filters.
        The <a href="#" @click.prevent="globals.helpPage = 'reference'">Reference</a>
        page lists every mapping for MIDI and computer keyboards.
      </p>
      <p>
        See the
        <a href="https://github.com/abulka/onekeyjam/blob/main/doco/NOTES.md" target="_blank" rel="noopener">MIDI setup notes</a>
        for the full MIDI and DAW configuration.
      </p>

      <h3 id="computer-keyboard" class="ui header">Play with your computer keyboard</h3>
      <ol class="steps">
        <li>Make sure the app window has focus (click anywhere in it).</li>
        <li>Trigger chords with the lower row, <code>z x c v b n m</code> (the white keys of the chord trigger octave).</li>
        <li>The black keys <code>s d g h j</code> in that octave are the chord modifiers. Hold <code>s</code> as a shift key and use the others to switch scales or transpose.</li>
        <li>Play solo notes with the upper row, <code>q w e r t y u</code>. These are filtered into the current scale.</li>
      </ol>
      <p>
        The keys play whenever the app window is focused; they pause only while
        you are typing in a form field. The octaves follow the keyboard config, so
        a different project or keyboard may shift the notes that each key plays.
      </p>

      <!-- Edit view -->
      <h2 id="the-edit-view" class="ui header">The Edit view</h2>
      <p>
        The screen gives away more than it first appears. Opening up the sections
        of the UI and drilling in reveals all sorts of features, such as:
      </p>

      <h3 id="edit-view-accordions" class="ui header">Edit view accordions</h3>
      <ul class="ui list">
        <li>
          <strong>Edit Chords</strong> - add, edit and audition the chords in your
          project, and choose the scale filters used in the right hand.
        </li>
        <li>
          <strong>Edit Scales</strong> - define the scales and their notes.
        </li>
        <li>
          <strong>Key Detection</strong> - set the project key, see the detected
          key-signature candidates, and re-rank every chord scale in that key.
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

      <h3 id="actions-menu" class="ui header">Actions menu</h3>
      <p>
        The <strong>Actions</strong> menu changes with the view: the Edit view has
        project actions, while the Perform view has playing and recording actions.
        On the Edit view it offers:
      </p>
      <ul class="ui list">
        <li><strong>Reallocate Chords</strong> - shuffle the chord triggers across the keyboard.</li>
        <li><strong>Find Matching Scales</strong> - suggest scales that fit the chords, guided by the project key and colour.</li>
        <li><strong>Reset Transpositions</strong> - undo any transposing you did while playing.</li>
        <li><strong>Fill with Key Signature</strong> - detect the key, save it on the project and re-rank every chord scale in that key.</li>
        <li>The <strong>Key Detection</strong> section sets the project key, while <strong>Solo in key</strong> and the colour selector sit above the chord/scale grid. Changing the key or colour re-ranks the scales automatically.</li>
      </ul>

      <!-- Perform view -->
      <h2 id="the-perform-view" class="ui header">The Perform view</h2>
      <p>
        The <RouterLink to="/perform">Perform view</RouterLink> is where you play
        and record; playing and recording share one page. It shows the active
        chord and the active scale as you go, together with a live piano keyboard,
        the scale-filtering toggles and the scale policy Options panel. The
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
        <li><strong>Active Scale</strong> - the scale the right hand is currently filtered into. If the project is in <strong>Solo in key</strong> mode it shows the project key scale instead of a per-chord scale.</li>
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

      <!-- Menu bar -->
      <h2 id="the-menu-bar" class="ui header">The menu bar</h2>
      <p>
        The <strong>File</strong> menu, <strong>DEMO</strong>, <strong>Start
        Tour</strong> and the current project name appear on the Edit, Perform and
        Settings views. The <strong>Actions</strong> menu changes with the view:
        the Edit view has project actions, while the Perform view has playing and
        recording actions. The Help view has no menu bar.
      </p>

      <h3 id="the-file-menu" class="ui header">The File menu</h3>
      <p>
        Use the <strong>File</strong> menu to open and save projects. It includes
        <em>New</em>, <em>Open</em>, <em>Open Featured</em>, <em>Save</em>,
        <em>Save As</em>, <em>Reload current Project</em>, <em>Import MIDI file</em>,
        <em>Download / Upload Project</em> (to back up or move projects between
        machines), and <em>Download MIDI Chords</em> in a couple of formats.
      </p>

      <h3 id="quick-actions-and-helpers" class="ui header">Quick actions and helpers</h3>
      <ul class="ui list">
        <li><strong>DEMO</strong> - load the C Major II-V-I demo project, focus the keyboard and show a short getting-started guide with a <strong>Jam!</strong> button.</li>
        <li><strong>Random project</strong> - load a random project from the Classic collection, for when you cannot decide what to play.</li>
        <li><strong>Start Tour</strong> - a guided tour of the controls on the current view.</li>
        <li>The chord and scale pickers, with search and audition buttons.</li>
        <li>The <strong>Circle of Fifths</strong> helper.</li>
        <li>The <strong>Shortcuts help</strong> button above the keyboard, with a quick reference for every key.</li>
        <li>The <strong>scale filtering toggles</strong> for switching filtering on and off.</li>
      </ul>

      <!-- Features -->
      <h2 id="features" class="ui header">Features</h2>
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
          <strong>Play from your computer keyboard</strong> - make sure the app
          window is focused, then play chords with the lower row
          (<code>z x c v b n m</code>) and solo notes with the upper row
          (<code>q w e r t y u</code>). The black keys are <code>s d g h j</code>
          on the left and <code>2 3 5 6 7</code> on the right. Open
          <strong>Shortcuts help</strong> above the keyboard, next to Key labels,
          for the full quick reference, including function keys and Alt shortcuts.
        </li>
      </ul>

      <!-- Sequencer & features screenshots -->
      <h2 id="more-screenshots" class="ui header">More screenshots</h2>

      <figure>
        <img class="screenshot" :src="sequencerView" alt="OneKeyJam built-in sequencer" />
        <figcaption class="screenshot-caption">
          The Chord Sequencer: draw a looping chord sequence on the piano roll,
          then play it back over your playing.
        </figcaption>
      </figure>

      <h3 id="features-at-a-glance" class="ui header">Features at a glance</h3>
      <div class="features-scroll">
        <img :src="featuresView" alt="A summary of OneKeyJam features" />
      </div>
      <p class="screenshot-caption">A quick visual summary of the main features.</p>

      <!-- About -->
      <h2 id="about-this-project" class="ui header">About this project</h2>

      <h3 id="free-to-use" class="ui header">Free to use</h3>
      <p>
        OneKeyJam is free and open source, with no subscriptions. All features are
        available to everyone. See the
        <a href="https://github.com/abulka/onekeyjam" target="_blank" rel="noopener">OneKeyJam public GitHub page</a>
        for the source code.
      </p>

      <h3 id="issues-and-bugs" class="ui header">Issues and bugs</h3>
      <p>
        Report any issues, feature requests or bugs in the
        <a href="https://github.com/abulka/onekeyjam/issues" target="_blank" rel="noopener">OneKeyJam issue tracker</a>.
      </p>

      <h3 id="further-reading" class="ui header">Further reading</h3>
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
        <li>
          <a href="https://github.com/abulka/onekeyjam/blob/main/doco/IMPROVISING-TUTORIAL.md" target="_blank"
            rel="noopener">Improvise</a>
          - quick start and song walkthroughs with sample solos.
        </li>
        <li>
          <a href="https://github.com/abulka/onekeyjam/blob/main/doco/REFERENCE.md" target="_blank"
            rel="noopener">Reference</a>
          - every control, setting and scale-policy option in detail.
        </li>
      </ul>

          </template>

        </div>

        <aside class="help-side">
          <nav class="help-pages" aria-label="Help pages">
            <div class="side-title">Help</div>
            <a v-for="page in HELP_PAGE_LINKS" :key="page.id" href="#"
              :class="{ active: globals.helpPage === page.id }"
              @click.prevent="showPage(page.id)">{{ page.label }}</a>
          </nav>

          <template v-if="tocHeadings.length">
            <details v-if="isNarrow" class="help-toc-mobile">
              <summary>On this page</summary>
              <nav class="help-toc">
                <a v-for="heading in tocHeadings" :key="heading.id" href="#"
                  :class="{ active: heading.id === activeId, sub: heading.level === 3 }"
                  @click.prevent="jump(heading.id, $event)">{{ heading.text }}</a>
              </nav>
            </details>
            <nav v-else class="help-toc" aria-label="On this page">
              <div class="side-title">On this page</div>
              <a v-for="heading in tocHeadings" :key="heading.id" href="#"
                :class="{ active: heading.id === activeId, sub: heading.level === 3 }"
                @click.prevent="jump(heading.id, $event)">{{ heading.text }}</a>
            </nav>
          </template>

          <a class="help-top-link" href="#" @click.prevent="scrollTop">↑ Back to top</a>
        </aside>
      </div>

    </div>
  </main>
</template>

<style scoped>
.help {
  padding-bottom: 4rem;
}

/* Help shell: the article on the left, page links and the section list on the
   right, like a traditional documentation site. */
.help .help-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 15rem;
  gap: 2rem;
  align-items: start;
  padding-top: 0.5rem;
}

.help .help-side {
  position: sticky;
  top: 1rem;
  max-height: calc(100vh - 2rem);
  overflow-y: auto;
  padding: 0.75rem;
  border: 1px solid #d9c9b0;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.35);
}

.help .side-title {
  color: #5a3d1a;
  font-weight: bold;
  margin: 0 0 0.35rem;
}

.help .help-pages {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  padding-bottom: 0.6rem;
  margin-bottom: 0.6rem;
  border-bottom: 1px solid #e0d3bd;
}

.help .help-pages a,
.help .help-toc a {
  display: block;
  padding: 0.2rem 0.45rem;
  border-radius: 4px;
  color: #5b4326;
  text-decoration: none;
  line-height: 1.3;
}

.help .help-pages a:hover,
.help .help-toc a:hover {
  background: #e6d7bd;
}

.help .help-pages a.active {
  background: #7a5230;
  color: #fff;
}

.help .help-toc a {
  font-size: 0.85rem;
}

.help .help-toc a.sub {
  padding-left: 1.1rem;
  font-size: 0.8rem;
  opacity: 0.9;
}

.help .help-toc a.active {
  background: #f3ead9;
  color: #5a3d1a;
  font-weight: bold;
}

.help .help-top-link {
  display: inline-block;
  margin-top: 0.6rem;
  font-size: 0.85rem;
  color: #6b5a45;
}

.help .help-toc-mobile summary {
  cursor: pointer;
  color: #5a3d1a;
  font-weight: bold;
  margin-bottom: 0.25rem;
}

/* Overview headings are hand-written; keep anchor jumps clear of the top. */
.help .help-body h2,
.help .help-body h3 {
  scroll-margin-top: 1rem;
}

@media (max-width: 900px) {
  .help .help-layout {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }

  .help .help-side {
    position: static;
    max-height: none;
    order: -1;
  }

  .help .help-pages {
    flex-direction: row;
    flex-wrap: wrap;
    align-items: center;
    padding-bottom: 0.4rem;
    margin-bottom: 0.4rem;
  }

  .help .help-pages .side-title {
    margin: 0 0.3rem 0 0;
  }

  .help .help-top-link {
    display: none;
  }
}

.help .tutorial-callout {
  background-color: #f3ead9;
  border: 1px solid #d9c9b0;
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
