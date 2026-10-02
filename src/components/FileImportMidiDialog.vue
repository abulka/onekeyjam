<script setup>
import { globals } from "../../src/lib/globals.js"
import { ref } from 'vue'
import { parseMidiAndAllocateChords } from "../../src/lib/boot-project"
import { parseMidiUrl, parseMidiFile } from '../../src/lib/parse-midi.js'

async function quickParseMidi() {
    // only called from the button 'parse midi'
    let midi = await parseMidiUrl()
    parseMidiAndAllocateChords(midi, 'some fileName')
    closer()
}

async function okParse(event) {
    let reader = new FileReader();  // https://javascript.info/file

    // reader.readAsText(event.target.files[0])  // use the 1st file from the list
    reader.readAsArrayBuffer(event.target.files[0])  // read the data in binary format ArrayBuffer

    reader.onload = function () {  // reader.result
        let midi = parseMidiFile(reader.result)  // you can JSON.stringify(midi, undefined, 2) to see the structure
        // console.log(JSON.stringify(midi, undefined, 2))

        let fileName = event.target.files[0].name
        parseMidiAndAllocateChords(midi, fileName)
    };

    reader.onerror = function () {
        console.log(reader.error);
    };

    closer()
}

const modalEl = ref()
const fileInputEl = ref()

function open() {
    fileInputEl.value.value = ''
    modalEl.value.showModal()
}
function closer() {
    modalEl.value.close()
}

// hide modal code, not necessary since ESC auto closes the dialog
// function keyUpListener(e) {
//     if (e.key === "Escape") {
//         closer()
//     }
// }
// onMounted(() => {
//     document.addEventListener('keyup', keyUpListener);
// });

// onUnmounted(() => {
//     document.removeEventListener('keyup', keyUpListener);
// });

defineExpose({
    open,
});

</script>

<template>

    <dialog ref="modalEl" class="bg-gray-200">
        <h1> Import Midi File </h1>

        <div v-if="globals.superUser" class="mb-6">
            <button @click="quickParseMidi" class="ui button">Quick Parse Midi</button>
        </div>

        <div>

            <input ref="fileInputEl" type="file" @change="okParse($event)" value="">

            <div class="ui checkbox mt-2">
                <input type="checkbox" id="cb1" class="hidden">
                <label for="cb1">Import unrecognised chords</label>
            </div>

        </div>

        <div class="mt-8">

            <!-- don't actually need ok button, since the 'change' event of the
            file uploader will trigger the parse however you still need a way to
            close the dialog box. -->
            <button class="ui button" @click="closer()">
                Close
            </button>

            <!-- <button class="ui button ml-2" @click="okParse()">
                Ok
            </button> -->
        </div>

    </dialog>

    <!-- Initial dialog component prototype https://sfc.vuejs.org/#eNqtVUtv4zYQ/isTXeQsbKl76MUrp10EKVq06S0oCugiiyOLG4oUSMoPGP7vHT4k2dlH0WJziIfz+Dgz/DRzTj72fbYfMFknhak17y0YtEP/UEre9UpbOIPGBi7QaNVBSq7pZHpUXR/1We4ODonMAKWslTQWOrODjQNYpL+iEAr+Ulqwu7vj8XiX3k9eJ8YroUZX0hd5SIbSoIPFrheVRToB/RWM76EWlTGbMtlW9etOq0GyMvH20pa2aN8/nM/+9sulyOlEOKSnWC77wcJ+1SmGguLJJwa6v/G3aPWkK3yZlJjzjpmWST7bt4O1SsLPteD165VTpnqUVE3y8AsXCLFp0ZZlRR4CfY0Ek1NZoQIP7JpwVTgdjT0JJ2ZzzXB2zi3yXWvX8P7HH/btB6eZPVa1EkqvYafxRKaLR8pHqGSZhLRWXdVnn4ySRASPWUaDKZN1uMXp6H3duUxaa3uzznPT1O7RP5lM6V1OUqYHaXmHGZputdXqYFATcJksrzByUu5RrzRKhhr1tzDfuH6G62CpqguVMlLwX8i8BCWfqTcWmRNfZBcOb0g+sjOEPnPGX6TGWu0kN8geW6WZiYxtKmFwprNilWirmc2lbAZZW04kCZQIDY1+2b4S1DfTqsOz07gIKmgKqYWiWscgd4USmBGHFikfrenyFo0g3uJ7R4f9BqPhVE9L1X8LzNMmf1dKpuqhQ2mzirGnPQl/cGNRUn7pK56GPl2OeS/wPtKGN7DAjMyw2WzonZ9MXfXEI6po+uAA8hxazjBcTSkynG1XuYfHvicqv8vDxzI1im546ad8MDaMcG/qJS8q0OezhNTd449OoDNpH0dVlJ3Yoa1+dwHkaLWIYiWsl1LbckMh7uf+g78yqIAbUiIcODXu8F27QYSI7XA98P8mVi+ILJuHUH64+uvPdds111ffXIc2fRhfwNPYqT3+J0iXIkOiGz4de/eekR7uk6DhMPl8dfb7KRk3RRzHgaZxgLu9EKfyR41wUgOYIQqHSlqwCpjyr/TT7cS9ihyn+bhffLPLZJ7uU/fnrfE3mhh8O9L/H9qf6jOweTXF/WVPPVJ0Q3uF0DiL8mrohapoTnq4eVvOu+omvG6xft2q4wShcdyi3llUWxTQKD3bfgtzdLiahFD7UVjk3n1s49TbkPl4dr/uAcPjfmnBgamJEcz7Tmvq8g/GJeRL  -->

</template>

<style scoped>
dialog {
    max-width: 90vw;
    border: 2px solid rgb(198, 101, 17);
    box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.5);
}
</style>

