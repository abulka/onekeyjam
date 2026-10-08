<script setup>
import { computed } from 'vue'
import { globals } from '@/lib/globals.js'
import DetectedChord from './DetectedChord.vue'
import DetectedChordDebug from './DetectedChordDebug.vue'
import JamNote from './JamNote.vue'
import TriggeredChord from './TriggeredChord.vue'
import TriggeredChordNotes from './TriggeredChordNotes.vue'
import TriggeredChordBass from './TriggeredChordBass.vue'
import TriggeredScale from './TriggeredScale.vue'
import TriggeredScaleNotes from './TriggeredScaleNotes.vue'

const scaleModeLabel = computed(() => {
  const policy = globals.scaleFiltering.policy
  if (policy === 'follow')
    return `follow (${globals.currentScaleFilter})`
  if (policy === 'shuffle')
    return 'shuffle'
  return globals.currentScaleFilter
})

// True while a note or chord is visibly sounding, so the phone layout can
// hide the live readout when it is only blank placeholders.
const isLiveSounding = computed(() => {
  if (globals.currentRawLiveNote && globals.currentRawLiveNote.trim() !== '')
    return true
  const jammed = globals.currentChordBeingJammed
  return !!(jammed && jammed.chord && !jammed.stale)
})

</script>

<template>

    <div class="ui container wrapper">
        <div class="status-card">

            <div class="status-main">
                <div class="status-row">
                    <span class="status-label">Scale:</span>
                    <span class="status-name" :title="globals.currentScaleName">
                        <TriggeredScale />
                    </span>
                    <span class="status-notes">
                        <TriggeredScaleNotes />
                    </span>
                    <span class="status-meta">
                        <span class="ui small text grey"
                            v-if="globals.isProjectLoaded && globals.currentChordTriggerNote">{{ scaleModeLabel
                            }}</span>
                        <span class="ui small text grey" v-else></span>
                    </span>
                </div>
                <div class="status-row">
                    <span class="status-label">Chord:</span>
                    <span class="status-name" :title="globals.currentChordName()">
                        <TriggeredChord />
                    </span>
                    <span class="status-notes">
                        <TriggeredChordNotes />
                        <TriggeredChordBass />
                    </span>
                    <span class="status-meta">
                        <span class="ui small text grey" v-if="globals.currentChordTriggerNote">via <strong
                                class="via-note">{{
                                    globals.currentChordTriggerNote }}</strong></span>
                        <span class="ui small text grey" v-else></span>
                    </span>
                </div>

            </div>

            <div class="status-live" :class="{ 'hide-when-idle': !isLiveSounding }">
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

</template>

<style scoped>
.status-card {
    display: flex;
    gap: 1rem;
}

.status-main {
    flex: 1 1 auto;
    min-width: 0;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 0.5rem;
}

.status-row {
    display: flex;
    align-items: baseline;
    gap: 1rem;
}

.status-label {
    flex: 0 0 auto;
}

.status-name {
    flex: 0 1 auto;
    min-width: 0;
    max-width: 32%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.status-notes {
    flex: 1 1 auto;
    min-width: 0;
    text-align: center;
}

.status-meta {
    flex: 0 0 auto;
    margin-left: auto;
}

/* The chord trigger note, given prominence over the quiet surrounding label. */
.via-note {
    font-size: 1.25em;
    font-weight: bold;
    color: #2185d0;
}

.status-live {
    /* Fixed size: the readout text comes and goes while soloing, and without
    this the notes column would grow, shrink and jump with every note. */
    flex: 0 0 10em;
    max-width: 10em;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    align-items: center;
    text-align: center;
    overflow: hidden;
}

.status-live :deep(p) {
    margin: 0;
}

div.wrapper {
    border: 1px solid green;
    padding: 1em;
    background-color: rgba(240, 195, 134, 0.543);
    box-shadow: chocolate 0px 0px 10px;
}

/* Phone layout: the scale and chord text uses the full container width, and
the live note/mapping sits in a reserved rail on the right. The rail is always
reserved (hidden, not collapsed) so playing a note never pushes the page down. */
@media (max-width: 768px) {
    div.wrapper {
        margin: 0;
        width: 100%;
        box-sizing: border-box;
        padding: 0.5em 0.6em;
    }

    .status-card {
        flex-direction: row;
        gap: 0.5rem;
    }

    .status-main {
        flex: 1 1 auto;
        min-width: 0;
        gap: 0.15rem;
    }

    .status-row {
        flex-wrap: wrap;
        gap: 0.15rem 0.5rem;
        font-size: 0.9rem;
    }

    /* Let names use the available width instead of being capped, so long
    scale names are not squeezed into a narrow column. */
    .status-name {
        flex: 1 1 auto;
        min-width: 0;
        max-width: none;
        white-space: normal;
        overflow: visible;
        text-overflow: clip;
    }

    .status-meta {
        order: 2;
    }

    .status-notes {
        flex: 1 1 100%;
        order: 3;
        text-align: left;
    }

    .status-live {
        /* Reserved narrow rail: always holds its space so a note appearing
        never moves anything, and nothing below is pushed down. */
        flex: 0 0 5.5em;
        max-width: 5.5em;
        min-height: 0;
        flex-direction: column;
        justify-content: flex-start;
        align-items: flex-end;
        text-align: right;
        gap: 0.15rem;
        overflow: hidden;
    }

    .status-live :deep(.jam-note-live) {
        font-size: 0.85rem;
    }

    .status-live :deep(.detectedChord),
    .status-live :deep(.detectedBass) {
        font-size: 1rem;
    }

    /* Hidden but still reserving its space, so showing a note never moves
    the rest of the page. */
    .hide-when-idle {
        visibility: hidden;
    }
}
</style>
