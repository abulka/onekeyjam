<script setup>
import ButtonChord from "./ButtonChord.vue"

const emit = defineEmits(['chord-from-event', 'chord-select-event'])

function chordFromEvent($event) {
    emit('chord-from-event', { subevent: $event })
}

function chordSelectEvent($event) {
    emit('chord-select-event', { subevent: $event })
}

</script>

<template>
    <p>Handy Chord Types: <span class="hint">Hover to hear, click to load into Edit Chords.</span></p>
    <div class="row bigbottom">
        <ButtonChord symbol="M" bass="" @chord-event="chordFromEvent($event)" @chord-select="chordSelectEvent($event)" />
        <ButtonChord symbol="m" bass="" @chord-event="chordFromEvent($event)" @chord-select="chordSelectEvent($event)" />
        <ButtonChord symbol="m7" bass="" @chord-event="chordFromEvent($event)" @chord-select="chordSelectEvent($event)" />
        <ButtonChord symbol="maj7" bass="" @chord-event="chordFromEvent($event)" @chord-select="chordSelectEvent($event)" />
        <ButtonChord symbol="11" bass="" @chord-event="chordFromEvent($event)" @chord-select="chordSelectEvent($event)" />
        <ButtonChord symbol="m11" bass="" @chord-event="chordFromEvent($event)" @chord-select="chordSelectEvent($event)" />
        <ButtonChord symbol="13" bass="" @chord-event="chordFromEvent($event)" @chord-select="chordSelectEvent($event)" />
        <ButtonChord symbol="add9" bass="" @chord-event="chordFromEvent($event)" @chord-select="chordSelectEvent($event)" />
        <ButtonChord symbol="sus2" bass="" @chord-event="chordFromEvent($event)" @chord-select="chordSelectEvent($event)" />
        <ButtonChord symbol="sus4" bass="" @chord-event="chordFromEvent($event)" @chord-select="chordSelectEvent($event)" />
        <ButtonChord symbol="m9" bass="" @chord-event="chordFromEvent($event)" @chord-select="chordSelectEvent($event)" />
        <ButtonChord symbol="madd9" bass="" @chord-event="chordFromEvent($event)" @chord-select="chordSelectEvent($event)" />
    </div>

    <p>Common Chords:</p>
    <div class="row bigbottom">
        <ButtonChord symbol="M" root="G" bass="" @chord-event="chordFromEvent($event)" @chord-select="chordSelectEvent($event)" />
        <ButtonChord symbol="M" root="C" bass="" @chord-event="chordFromEvent($event)" @chord-select="chordSelectEvent($event)" />
        <ButtonChord symbol="M" root="D" bass="" @chord-event="chordFromEvent($event)" @chord-select="chordSelectEvent($event)" />
        <ButtonChord symbol="M" root="A" bass="" @chord-event="chordFromEvent($event)" @chord-select="chordSelectEvent($event)" />
        <ButtonChord symbol="m" root="A" bass="" @chord-event="chordFromEvent($event)" @chord-select="chordSelectEvent($event)" />
        <ButtonChord symbol="M" root="E" bass="" @chord-event="chordFromEvent($event)" @chord-select="chordSelectEvent($event)" />
        <ButtonChord symbol="m" root="E" bass="" @chord-event="chordFromEvent($event)" @chord-select="chordSelectEvent($event)" />
        <ButtonChord symbol="M" root="F" bass="" @chord-event="chordFromEvent($event)" @chord-select="chordSelectEvent($event)" />
        <ButtonChord symbol="M" root="B" bass="" @chord-event="chordFromEvent($event)" @chord-select="chordSelectEvent($event)" />
        <ButtonChord symbol="m" root="B" bass="" @chord-event="chordFromEvent($event)" @chord-select="chordSelectEvent($event)" />
    </div>

    <p>Fancy Jazz Chords:</p>
    <div class="row">
        <ButtonChord root="E" symbol="m11" bass="G" @chord-event="chordFromEvent($event)" @chord-select="chordSelectEvent($event)" />
        <ButtonChord root="F" symbol="m11" bass="" @chord-event="chordFromEvent($event)" @chord-select="chordSelectEvent($event)" />
        <ButtonChord root="C" symbol="maj7" bass="C" @chord-event="chordFromEvent($event)" @chord-select="chordSelectEvent($event)" />
        <ButtonChord root="C" symbol="maj7" bass="G" @chord-event="chordFromEvent($event)" @chord-select="chordSelectEvent($event)" />
        <ButtonChord root="D" symbol="11" bass="" @chord-event="chordFromEvent($event)" @chord-select="chordSelectEvent($event)" />
    </div>

</template>

<style scoped>
.row.bigbottom {
  margin-bottom: 1.5em;
}

.hint {
  color: #6b5a45;
  font-size: 0.8rem;
  font-style: italic;
  font-weight: normal;
}
</style>
