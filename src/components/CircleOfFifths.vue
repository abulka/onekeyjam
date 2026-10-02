<script setup>
import ButtonChord from "./ButtonChord.vue"

const emit = defineEmits(['chord-from-event'])

function chordFromEvent($event) {
    emit('chord-from-event', {subevent:$event})
}

</script>

<template>

    <p>Moving clockwise around the circle, we get ascending 5ths aka. descending 4ths. Anti-clockwise we get descending 5ths aka. ascending 4ths.</p>

    <!-- tab header -->
    <div class="ui top attached tabular menu" style="background-color: burlywood;">
    <a class="item active" data-tab="major">Major</a>
    <a class="item" data-tab="minor">Minor</a>
    <a class="item " data-tab="major7">Major 7</a>
    <a class="item " data-tab="minor7">Minor 7</a>
    <a class="item" data-tab="reference">Reference</a>
    </div>

    <div class="ui bottom attached tab segment active" data-tab="major" style="background-color: burlywood;">
  
        <ul class='circle-container'>
            <li>
                <ButtonChord root="A" symbol="M" bass="" @chord-event="chordFromEvent($event)" />
            </li>
            <li>
                <ButtonChord root="E" symbol="M" bass="" @chord-event="chordFromEvent($event)" />
            </li>
            <li>
                <ButtonChord root="B" symbol="M" bass="" @chord-event="chordFromEvent($event)" />
            </li>
            <li>
                <ButtonChord root="F#" symbol="M" bass="" @chord-event="chordFromEvent($event)" />
            </li>
            <li>
                <ButtonChord root="Db" symbol="M" bass="" @chord-event="chordFromEvent($event)" />
            </li>
            <li>
                <ButtonChord root="Ab" symbol="M" bass="" @chord-event="chordFromEvent($event)" />
            </li>
            <li>
                <ButtonChord root="Eb" symbol="M" bass="" @chord-event="chordFromEvent($event)" />
            </li>
            <li>
                <ButtonChord root="Bb" symbol="M" bass="" @chord-event="chordFromEvent($event)" />
            </li>
            <li>
                <ButtonChord root="F" symbol="M" bass="" @chord-event="chordFromEvent($event)" />
            </li>
            <li>
                <ButtonChord root="C" symbol="M" bass="" @chord-event="chordFromEvent($event)" />
            </li>
            <li>
                <ButtonChord root="G" symbol="M" bass="" @chord-event="chordFromEvent($event)" />
            </li>
            <li>
                <ButtonChord root="D" symbol="M" bass="" @chord-event="chordFromEvent($event)" />
            </li>
        </ul>

    </div>

    <div class="ui bottom attached tab segment" data-tab="minor" style="background-color: burlywood;">

        <ul class='circle-container'>
            <li>
                <ButtonChord root="F#" symbol="m" bass="" @chord-event="chordFromEvent($event)" />
            </li>
            <li>
                <ButtonChord root="C#" symbol="m" bass="" @chord-event="chordFromEvent($event)" />
            </li>
            <li>
                <ButtonChord root="G#" symbol="m" bass="" @chord-event="chordFromEvent($event)" />
            </li>
            <li>
                <ButtonChord root="Eb" symbol="m" bass="" @chord-event="chordFromEvent($event)" />
            </li>
            <li>
                <ButtonChord root="Bb" symbol="m" bass="" @chord-event="chordFromEvent($event)" />
            </li>
            <li>
                <ButtonChord root="F" symbol="m" bass="" @chord-event="chordFromEvent($event)" />
            </li>
            <li>
                <ButtonChord root="C" symbol="m" bass="" @chord-event="chordFromEvent($event)" />
            </li>
            <li>
                <ButtonChord root="G" symbol="m" bass="" @chord-event="chordFromEvent($event)" />
            </li>
            <li>
                <ButtonChord root="D" symbol="m" bass="" @chord-event="chordFromEvent($event)" />
            </li>
            <li>
                <ButtonChord root="A" symbol="m" bass="" @chord-event="chordFromEvent($event)" />
            </li>
            <li>
                <ButtonChord root="E" symbol="m" bass="" @chord-event="chordFromEvent($event)" />
            </li>
            <li>
                <ButtonChord root="B" symbol="m" bass="" @chord-event="chordFromEvent($event)" />
            </li>
        </ul>

    </div>

    <div class="ui bottom attached tab segment " data-tab="major7" style="background-color: burlywood;">
  
        <!-- Must use maj7 not M7 even though both are valid tonal chord symbols, because the 
        chord picker input widget values only use the first symbol only and do not match all possibilities -->
        <ul class='circle-container'>
            <li>
                <ButtonChord root="A" symbol="maj7" bass="" @chord-event="chordFromEvent($event)" />
            </li>
            <li>
                <ButtonChord root="E" symbol="maj7" bass="" @chord-event="chordFromEvent($event)" />
            </li>
            <li>
                <ButtonChord root="B" symbol="maj7" bass="" @chord-event="chordFromEvent($event)" />
            </li>
            <li>
                <ButtonChord root="F#" symbol="maj7" bass="" @chord-event="chordFromEvent($event)" />
            </li>
            <li>
                <ButtonChord root="Db" symbol="maj7" bass="" @chord-event="chordFromEvent($event)" />
            </li>
            <li>
                <ButtonChord root="Ab" symbol="maj7" bass="" @chord-event="chordFromEvent($event)" />
            </li>
            <li>
                <ButtonChord root="Eb" symbol="maj7" bass="" @chord-event="chordFromEvent($event)" />
            </li>
            <li>
                <ButtonChord root="Bb" symbol="maj7" bass="" @chord-event="chordFromEvent($event)" />
            </li>
            <li>
                <ButtonChord root="F" symbol="maj7" bass="" @chord-event="chordFromEvent($event)" />
            </li>
            <li>
                <ButtonChord root="C" symbol="maj7" bass="" @chord-event="chordFromEvent($event)" />
            </li>
            <li>
                <ButtonChord root="G" symbol="maj7" bass="" @chord-event="chordFromEvent($event)" />
            </li>
            <li>
                <ButtonChord root="D" symbol="maj7" bass="" @chord-event="chordFromEvent($event)" />
            </li>
        </ul>

    </div>

    <div class="ui bottom attached tab segment" data-tab="minor7" style="background-color: burlywood;">

        <ul class='circle-container'>
            <li>
                <ButtonChord root="F#" symbol="m7" bass="" @chord-event="chordFromEvent($event)" />
            </li>
            <li>
                <ButtonChord root="C#" symbol="m7" bass="" @chord-event="chordFromEvent($event)" />
            </li>
            <li>
                <ButtonChord root="G#" symbol="m7" bass="" @chord-event="chordFromEvent($event)" />
            </li>
            <li>
                <ButtonChord root="Eb" symbol="m7" bass="" @chord-event="chordFromEvent($event)" />
            </li>
            <li>
                <ButtonChord root="Bb" symbol="m7" bass="" @chord-event="chordFromEvent($event)" />
            </li>
            <li>
                <ButtonChord root="F" symbol="m7" bass="" @chord-event="chordFromEvent($event)" />
            </li>
            <li>
                <ButtonChord root="C" symbol="m7" bass="" @chord-event="chordFromEvent($event)" />
            </li>
            <li>
                <ButtonChord root="G" symbol="m7" bass="" @chord-event="chordFromEvent($event)" />
            </li>
            <li>
                <ButtonChord root="D" symbol="m7" bass="" @chord-event="chordFromEvent($event)" />
            </li>
            <li>
                <ButtonChord root="A" symbol="m7" bass="" @chord-event="chordFromEvent($event)" />
            </li>
            <li>
                <ButtonChord root="E" symbol="m7" bass="" @chord-event="chordFromEvent($event)" />
            </li>
            <li>
                <ButtonChord root="B" symbol="m7" bass="" @chord-event="chordFromEvent($event)" />
            </li>
        </ul>

    </div>


    <div class="ui bottom attached tab segment" data-tab="reference" style="background-color: burlywood;">
        <img width=500 src="/images/Circle_of_fifths_deluxe_4.svg" alt="Circle of Fifths"/>
        <p>
        See <a href="https://en.wikipedia.org/wiki/Circle_of_fifths" target="_blank">wikipedia article</a> explaining the Circle of Fifths. 
        See <a href="https://www.jazzadvice.com/lessons/music-theory-basics-circle-of-fifths/" target="_blank">tutorial</a> Music Theory Basics: The Circle Of Fifths. 
        See <a href="https://myjazzedge.com/using-the-circle-of-fifths/" target="_blank">article</a> on how explaining the phrase: “4 to the left, then 5, 2, 6, 3”. 
        See <a href="https://www.musical-u.com/learn/how-to-use-circle-fifths/" target="_blank">article</a> on how to use the circle fifths plus some history. 
        Above image from <a href="https://commons.wikimedia.org/w/index.php?curid=4463183" target="_blank">wikimedia</a>.
        </p>

    </div>

</template>

<style lang="scss" scoped>
/// Mixin to place items on a circle
/// @author Kitty Giraudel
/// @author Ana Tudor
/// @param {Integer} $item-count - Number of items on the circle
/// @param {Length} $circle-size - Large circle size
/// @param {Length} $item-size - Single item size
@use "sass:math";

@mixin on-circle($item-count, $circle-size, $item-size) {
  position: relative;
  width: $circle-size;
  height: $circle-size;
  padding: 0;
  border-radius: 50%;
  list-style: none;

  >* {
    display: block;
    position: absolute;
    top: 50%;
    left: 50%;
    width: $item-size;
    height: $item-size;
    margin: -(math.div($item-size, 2));

    $angle: (math.div(360, $item-count));
    $rot: 0;

    @for $i from 1 through $item-count {
      &:nth-of-type(#{$i}) {
        transform:
          rotate($rot * 1deg) translate(math.div($circle-size, 2)) rotate($rot * -1deg);
      }

      $rot: $rot+$angle;
    }
  }
}

.circle-container {
  // set number of items in circle here
  @include on-circle($item-count: 12, $circle-size: 25em, $item-size: 5em);
  margin: 5em auto 0;
  border: solid 5px tomato;

  img {
    display: block;
    max-width: 100%;
    border-radius: 50%;
    filter: grayscale(100%);
    border: solid 5px tomato;
    transition: .15s;

    &:hover,
    &:active {
      filter: grayscale(0);
    }
  }
}


.ui.tabular.menu .active.item {
    background: #e0e1e2;
}

</style>
