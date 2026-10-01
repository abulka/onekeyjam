<script setup>
import { computed } from 'vue'
import { ref, onMounted, onUnmounted } from "vue";
import { globals } from '/src/lib/globals.js'
import ScaleFilteringToggles from './ScaleFilteringToggles.vue'
import DetectedChord from './DetectedChord.vue'
import DetectedChordDebug from './DetectedChordDebug.vue'
import JamNote from './JamNote.vue'
import TriggeredChord from './TriggeredChord.vue'
import TriggeredChordNotes from './TriggeredChordNotes.vue'
import TriggeredChordBass from './TriggeredChordBass.vue'
import TriggeredScale from './TriggeredScale.vue'
import TriggeredScaleNotes from './TriggeredScaleNotes.vue'


</script>

<template>

    <div class="ui container wrapper">
        <div class="ui compact grid">

            <div class="thirteen wide column">

                <!-- sub grid  -->
                <div class="ui four column divided compact grid">
                    <div class="row">
                        <div class="column two wide">
                            Scale:
                        </div>
                        <div class="column five wide centered">
                            <TriggeredScale />
                        </div>
                        <div class="center aligned column seven wide">
                            <TriggeredScaleNotes />
                        </div>
                        <div class="column two wide">
                            <span class="ui small text grey" v-if="globals.isProjectLoaded && globals.currentChordTriggerNote">{{ globals.currentScaleFilter}}</span>
                            <span class="ui small text grey" v-else></span>
                        </div>
                    </div>
                    <div class="row debug">
                        <div class="column two wide">
                            Chord:
                        </div>
                        <div class="column five wide">
                            <TriggeredChord />
                        </div>
                        <div class="center aligned column seven wide">
                            <TriggeredChordNotes />
                            <TriggeredChordBass />
                        </div>
                        <div class="column two wide">
                            <span class="ui small text grey" v-if="globals.currentChordTriggerNote">via {{ globals.currentChordTriggerNote }}</span>
                            <span class="ui small text grey" v-else></span>
                        </div>
                    </div>

                </div>
            </div>

            <div class="three wide stretched column">
                <div class="outer">
                    <!-- wrap each in an extra div so flex layout affects these divs and not the divs inside each component -->
                    <div>
                        <JamNote />
                    </div>
                    <div>
                        <DetectedChord />
                    </div>
                    <div v-if="globals.debugJamChord">
                        <DetectedChordDebug />
                    </div>
                </div>
            </div>

        </div>
    </div>

</template>

<style scoped>
.outer {
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    align-items: center;
}

div.wrapper {
    border: 1px solid green;
    padding: 1em;
    background-color: rgba(240, 195, 134, 0.543);
    box-shadow: chocolate 0px 0px 10px;
}
</style>
