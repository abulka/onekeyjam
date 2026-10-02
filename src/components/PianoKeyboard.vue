# Adapted from vue2 https://github.com/MicuEmerson/vue-piano/blob/main/src/components/PianoKeyboard.vue

<script setup>
import { ref, onUnmounted } from "vue";
import { watch } from 'vue'
import { noteObjectToMidiValue } from '../../src/lib/note-tools.js'

const props = defineProps({
    allKeys: {
        type: Array, default: () => [
            '`', `1`, '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '=',
            'q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '[', ']', '\\',
            'a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';',
            'z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.'
        ]
    },
    selectedNotes: {
        type: Array,
        // default: () => [] // e.g. ['C4', 'D4', 'E4']
        default: () => ['D2', 'E2', 'A2']
    },
    whiteNoteColor: { type: String, default: '#1eb7eb' },
    blackNoteColor: { type: String, default: '#f9bb2d' },
    showKeys: { type: Boolean, default: false },
    showNotes: { type: Boolean, default: false },
    showMappings: { type: Boolean, default: true },
    whiteNoteMappings: { type: Object, default: () => ({}) }, // trigger note -> label e.g. { 'C4': 'C maj7', 'D4': 'D maj7', 'E4': 'F#' }
    whiteNoteScaleMappingStartNote: { type: Object, default: function () { return { letter: 'C', octave: 4 } } }, // simple noteobject
    startOctave: { type: Number, default: 2 },
    endOctave: { type: Number, default: 4 },
    sustain: { type: Boolean, default: false },
    indianNotes: { type: Boolean, default: false },
    noteConfig: {
        type: Object,
        default: function () {
            return {
                scale: "C",
                middleOctave: 4,
                lang: "hi"
            }
        },
    }
})


/* Helper map for pressed key, (e.g notesIndexesByKey['a'] = 4, we found the note which coresponds to 'a' key at index 4 in notes array) */
const notesIndexesByKey = ref({})

/* Array with generated notes of the form 
    { 
        note: <C4>,
        letter: <C>,
        octave: <4>,
        key: <a>,
        pressed: <false>,
        selected: <false>,
        label: <C4>,
        help: <transpose up>,
        helpShift: <all notes off>,
        mapping: <C maj7> or scale note <F> depending on split point
        blackNote: { ...same fields as above e.g. note: <C#4>, etc. }
    }
    where note is the note name, key is a keyboard key you have to press in order to play that note,
    pressed is telling us if note is pressed or not and blackNote is mandatory only for notes that have 'sharp/flat'
*/
const notes = ref([])

/* It's used to generate notes, used in 'generateNotes' method */
const allNotes = ref(['C', 'D', 'E', 'F', 'G', 'A', 'B'])

/* As name says */
const whiteNoteWidthSize = ref(0)

/* It's used to play note when mouse is pressed and note is hovered */
const isMousePressed = ref(false)

// watch properties so we can rebuild the keyboard if any of them change
watch(() => props.startOctave, () => regenerate(), { deep: false });
watch(() => props.endOctave, () => regenerate(), { deep: false });
watch(() => props.allKeys, () => regenerate(), { deep: true });
watch(() => props.indianNotes, () => regenerate(), { deep: true });
watch(() => props.noteConfig.scale, () => regenerate(), { deep: false });
watch(() => props.noteConfig.middleOctave, () => regenerate(), { deep: false });
watch(() => props.noteConfig.lang, () => regenerate(), { deep: false });
watch(() => props.selectedNotes, () => regenerate(), { deep: true });
watch(() => props.whiteNoteMappings, () => regenerate(), { deep: true });


window.addEventListener("keydown", e => {
    const key = e.key;
    const index = notesIndexesByKey.value[key];

    if (index != undefined) {
        const noteObject = notes.value[index].key === key ? notes.value[index] : notes.value[index].blackNote;
        playNote(noteObject);
    }
});

window.addEventListener("keyup", e => {
    const key = e.key;
    const index = notesIndexesByKey.value[key];

    if (index != undefined) {
        const noteObject = notes.value[index].key === key ? notes.value[index] : notes.value[index].blackNote;
        removePressedKey(noteObject);
    }
});

window.onmouseup = () => {
    isMousePressed.value = false;
}

onUnmounted(() => {
    window.removeEventListener('keydown', () => { });
    window.removeEventListener('keyup', () => { });
    window.removeEventListener('onmouseup', () => { });
})

// COMPUTED

function classShiftHighlight(noteObject) {
    return noteObject.blackNote.help == 'SHIFT' ? 'key-text-shift-big' : ''
}

// METHODS

function playNote(noteObject) {
    if (!noteObject.pressed) {
        // this.synth.triggerAttackRelease(noteObject.note, this.sustain ? "2n" : "8n");
        noteObject.pressed = true;
    }
}

function playNoteMouse(noteObject) {
    isMousePressed.value = true;
    playNote(noteObject);
}

function playNoteHover(noteObject) {
    if (isMousePressed.value)
        playNote(noteObject);
}

function removePressedKey(noteObject) {
    noteObject.pressed = false;
}

function removePressedKeyMouse(noteObject) {
    isMousePressed.value = false
    removePressedKey(noteObject);
}

function whiteNoteBackground(noteObject) {
    const white = 'linear-gradient(to bottom, #eee 0%, #fff 100%)'
    const pink = 'linear-gradient(to bottom, #faa 80%, #fff 100%)'
    const green = 'linear-gradient(to bottom, #afc 80%, #fff 100%)'
    if (noteObject.pressed)
        return props.whiteNoteColor
    if (noteObject.selected)
        return pink

    if (props.whiteNoteScaleMappingStartNote.letter == undefined)
        return pink
    const isChordTrigger = noteObjectToMidiValue(noteObject) < noteObjectToMidiValue(props.whiteNoteScaleMappingStartNote)
    if (isChordTrigger)
        return green;
    else
        return white
}

function blackNoteBackground(noteObject) {
    const black = 'linear-gradient(45deg, #555, #222)'
    return noteObject.blackNote.pressed ? props.blackNoteColor : black;
}

function generateNotes() {
    let keyIndex = 0;
    let noteIndex = 0;
    notes.value.length = 0;

    for (let octave = props.startOctave; octave <= props.endOctave; octave++) {

        while (noteIndex < allNotes.value.length) {
            const currentNote = allNotes.value[noteIndex];

            // note object for white note
            let newNote = {
                note: currentNote + octave,
                letter: currentNote,
                octave: octave,
                key: props.allKeys[keyIndex++],
                pressed: false,
                selected: props.selectedNotes.includes(currentNote + octave),
                label: getLabel(currentNote, octave),
                help: '',
                mapping: getMapping(currentNote, octave)
            }

            if (currentNote !== "B" && currentNote !== "E") {
                // note object for black note
                let blackNote = {
                    note: currentNote + '#' + octave,
                    letter: currentNote,
                    octave: octave,
                    key: props.allKeys[keyIndex++],
                    pressed: false,
                    selected: props.selectedNotes.includes(currentNote + '#' + octave),
                    label: getLabel(currentNote + '#', octave),
                    help: getHelp(currentNote + '#', octave),
                    helpShift: getHelp(currentNote + '#', octave, true)
                }

                newNote["blackNote"] = blackNote;
            }

            notes.value.push(newNote);

            if (octave === props.endOctave && currentNote === "B")
                break;

            noteIndex++;
        }

        noteIndex = 0;
    }

    whiteNoteWidthSize.value = 100 / notes.value.length;
}

function generateNotesIndexesByKey() {
    notesIndexesByKey.value = {}
    for (let index = 0; index < notes.value.length; index++) {
        notesIndexesByKey.value[notes.value[index].key] = index;

        if (notes.value[index].blackNote != undefined)
            notesIndexesByKey.value[notes.value[index].blackNote.key] = index;
    }
}

function regenerate() {
    generateNotes();
    generateNotesIndexesByKey();
    // console.log('regenerate!!!', notes.value)
}

function getLabel(note, octave) {
    // return this.indianNotes ? this.swaralipi.toIndianNote(note + octave) : note;
    return `${note}${octave}`;
}

function getMapping(currentNote, octave) {
    return props.whiteNoteMappings[currentNote + octave] || ''
}

function getHelp(note, octave, shift = false) {
    let result = '';
    if (octave == 3) {  // TODO - make it dynamic and cover the amount of octaves used by lh trigger chords
        if (shift)
            switch (note) {
                case 'C#':
                    result = ''
                    break;
                case 'D#':
                    result = 'All notes off'
                    break;
                case 'F#':
                    result = 'Add chord'
                    break;
                case 'G#':
                    result = 'Reset transp.'
                    break;
                case 'A#':
                    result = 'Reset transp.'
                    break;

                default:
                    break;
            }
        else
            switch (note) {
                case 'C#':
                    result = 'SHIFT'
                    break;
                case 'D#':
                    result = 'Scale filter OFF'
                    break;
                case 'F#':
                    result = 'Scale filter ON'
                    break;
                case 'G#':
                    result = 'Trans-pose chords UP'
                    break;
                case 'A#':
                    result = 'Trans-pose chords DOWN'
                    break;

                default:
                    break;
            }
    }
    else {
        if (shift)
            result = ''
        else
            switch (note) {
                case 'C#':
                    result = 'Use Scale 1'
                    break;
                case 'D#':
                    result = 'Use Scale 2'
                    break;
                case 'F#':
                    result = 'Use Scale 3'
                    break;
                case 'G#':
                    result = 'Use Scale 4 (notes of chord)'
                    break;
                case 'A#':
                    result = 'Lock current scale'
                    break;

                default:
                    break;
            }
    }
    return result
}

regenerate()
console.log('piano keyboard script here')
</script>

<template>
    <p>Inside piano endOctave is {{ endOctave }}</p>
    <p>White note mappings {{ whiteNoteMappings }}</p>
    <p>whiteNoteScaleMappingStartNote {{ whiteNoteScaleMappingStartNote }}</p>
    <div class="piano-keyboard">

        <div v-for="noteObject in notes" :key="noteObject.note" class="white-note"
            :class="[noteObject.pressed ? 'white-note-pressed' : '']"
            :style="{ width: whiteNoteWidthSize + '%', background: whiteNoteBackground(noteObject) }"
            @mousedown="playNoteMouse(noteObject)" @mouseup="removePressedKeyMouse(noteObject)"
            @mouseover="playNoteHover(noteObject)" @mouseleave="removePressedKey(noteObject)">

            <div v-if="noteObject.blackNote" class="black-note"
                :class="[noteObject.blackNote.pressed ? 'black-note-pressed' : '']"
                :style="{ background: blackNoteBackground(noteObject) }"
                @mousedown.stop="playNoteMouse(noteObject.blackNote)"
                @mouseup.stop="removePressedKeyMouse(noteObject.blackNote)"
                @mouseover.stop="playNoteHover(noteObject.blackNote)"
                @mouseleave.stop="removePressedKey(noteObject.blackNote)">

                <!-- black key -->

                <div class="key-group unselectable">
                    <div v-if="showKeys" class="key-input">
                        {{ noteObject.blackNote.key }}
                    </div>

                    <div v-if="showNotes" :class="[indianNotes ? '' : 'key-text-vertical']">
                        {{ noteObject.blackNote.label }}
                    </div>
                    <div v-else>
                        <div v-if="noteObject.blackNote.helpShift" :class="['key-text', 'space-under-shift-text']">
                            <span class="key-text-shift">SHIFT</span>
                            {{ noteObject.blackNote.helpShift }}
                        </div>
                        <div :class="['key-text', classShiftHighlight(noteObject)]">
                            {{ noteObject.blackNote.help }}
                        </div>
                    </div>
                </div>
            </div>

            <!-- white key -->

            <div class="key-group unselectable">
                <!-- these are the shortcut keys -->
                <div v-if="showKeys" class="key-input">
                    {{ noteObject.key }}
                </div>

                <!-- these are the note names e.g. C0 -->
                <div v-if="showNotes">
                    {{ noteObject.label }}
                </div>

                <!-- these are either the one note chords or the scale notes -->
                <div v-if="showMappings" class="key-text-magic">
                    {{ noteObject.mapping }}
                </div>
            </div>

        </div>
    </div>
</template>

<style>
.piano-keyboard {
    position: relative;
    height: 100%;
    width: 100%;
}

.white-note {
    display: flex;
    justify-content: center;
    float: left;
    position: relative;
    cursor: pointer;
    background-color: aqua;
    color: black;
    height: 98%;
    border-radius: 0 0 5px 5px;
    box-shadow:
        0px 0px 0px rgba(255, 255, 255, 0.8) inset,
        -2px -5px 3px #ccc inset,
        0 0 3px rgba(0, 0, 0, 0.5);
}

.white-note-pressed {
    box-shadow:
        2px 0 3px rgba(0, 0, 0, 0.2) inset,
        -5px -1px 20px rgba(0, 0, 0, 0.2) inset,
        0 0 3px rgba(0, 0, 0, 0.5);
}

.black-note {
    display: flex;
    align-items: flex-end;
    justify-content: center;
    position: absolute;
    cursor: pointer;
    height: 65%;
    width: 65%;
    left: 68%;
    z-index: 1;
    color: white;
    border-radius: 0 0 3px 3px;
    box-shadow:
        -1px -1px 2px rgba(255, 255, 255, 0.2) inset,
        0 -5px 2px rgba(0, 0, 0, 0.5) inset,
        0 2px 4px rgba(0, 0, 0, 0.5);
}

.black-note-pressed {
    box-shadow:
        -1px -1px 2px rgba(255, 255, 255, 0.2) inset,
        0 -1px 2px rgba(0, 0, 0, 0.2) inset,
        0 1px 2px rgba(0, 0, 0, 0.2);
}

.key-group {
    /* for the container div holding white and black piano key text */
    align-self: flex-end;
    display: flex;
    flex-direction: column;
    align-items: center;
    font-size: 1.2rem;

    /* Affects black key text, white key text seems already centered?  */
    text-align: center;

    /* Text position from bottom of key */
    margin-bottom: 0.5rem;
}

.key-text {
    /* applies to both white and black key text */
    font-size: 0.9rem;
    line-height: 1.0rem;

    /* affects white note text only? */
    margin-bottom: 0.5rem;
}

.key-text-shift {
    margin-top: 1.0rem;
    font-size: 0.5rem;
    background-color: #7c6b45;
    padding: 2px;
}

.key-text-shift-big {
    background-color: #7c6b45;
    padding: 1px;
}

.space-under-shift-text {
    /* on black keys, spearates the two areas */
    margin-bottom: 1.2rem;
}

.key-text-magic {
    /* for white note chord names, and white note filtered scale note mappings */
    font-size: 1.1rem;
    font-family: 'Courier New', Courier, monospace;
}

.key-text-vertical {
    transform: rotate(-90deg);
    margin: 0.8rem 0;
}

.key-input {
    text-align: center;
    width: 2em;
    color: red;
    font-size: 1vw;
}

.unselectable {
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    -khtml-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    user-select: none;
}
</style>
