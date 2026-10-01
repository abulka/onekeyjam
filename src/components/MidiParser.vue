<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import { globals } from "../../src/lib/globals.js"
import { parseMidiAndAllocateChords } from "../../src/lib/boot-project"
import { parseMidiUrl, parseMidiFile } from '../../src/lib/parse-midi.js'
import ReallocatePanel from './ReallocatePanel.vue';

async function parseMidi() {
  // only called from the button 'parse midi'
  let midi = await parseMidiUrl()
  parseMidiAndAllocateChords(midi, 'some fileName')
}


function wireFileUpload() {  // TODO see src/components/MidiParser.vue - make this more vue
    const fileUploader = document.getElementById('file-uploader');
    fileUploader.addEventListener('change', (event) => {
        let reader = new FileReader();  // https://javascript.info/file

        // reader.readAsText(event.target.files[0])  // use the 1st file from the list
        reader.readAsArrayBuffer(event.target.files[0])  // read the data in binary format ArrayBuffer

        reader.onload = function (e) {  // reader.result or e.target.result
            let midi = parseMidiFile(reader.result)  // you can JSON.stringify(midi, undefined, 2) to see the structure
            // console.log(JSON.stringify(midi, undefined, 2))

            let fileName = event.target.files[0].name
            parseMidiAndAllocateChords(midi, fileName)
        };

        reader.onerror = function () {
            console.log(reader.error);
        };

    });
}

onMounted(() => {
  wireFileUpload() // no need to remove listener cos el is destroyed when component is destroyed
})

</script>

<template>

    <!-- quick parse button -->
    <button v-if="globals.superUser" @click="parseMidi" class="ui button">Parse Midi</button>

    <!-- proper file upload button -->
    <!-- TODO logic for reponding on change is in wireFileUpload() needs to be 
    intercepted here and then call out to do the work -->
    <input type="file" id="file-uploader">

    <div class="row mt-4">
      <div class="ui checkbox">
        <input type="checkbox" v-model="globals.importMidiUnrecognisedChords">
        <label>Import unrecognised chords</label>
      </div>
    </div>

    <h5>Number of Chords to display</h5>
    <div class="row">
      <ReallocatePanel />
      <br>
      <p><i><b>Last Allocation:</b> {{ globals.statistics.summaryMsg }}</i></p>
    </div>

</template>

<style scoped>
</style>
