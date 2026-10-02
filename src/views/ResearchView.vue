<script setup>
import ResearchExampleList from '@/components/ResearchExampleList.vue'
import PianoKeyboardBig from '@/components/PianoKeyboardBig.vue'

</script>

<template>
  <div class="ui container">
    <p>This is the Research View</p>

    <PianoKeyboardBig />

    <ResearchExampleList />

    <h1 class="text-3xl font-bold underline">
      Hello Tailwind!
    </h1>

    <button>A</button>
    <button class="ml-1">B</button>
    <button class="ml-3">C</button>



    <h1>Grid stuff</h1>


    <div class="ui container">
      <div class="ui two column grid">
        <div class="column eight wide">
          AA
        </div>
        <div class="column eight wide">
          BB
        </div>
      </div>
    </div>

    <div class="ui container">
      AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA AAAAAAAAAAAAA AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
      AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA BBBBBBBBBBBBBBBBBBBBBBBB BBBBBBBBBBBBBBBBBBBBB
    </div>


    <div class="ui three column divided grid">
      <div class="row">
        <div class="column">
          <p>1</p>
        </div>
        <div class="column">
          <p>2</p>
        </div>
        <div class="column">
          <p>3</p>
        </div>
      </div>
      <div class="row">
        <div class="column">
          <p>4</p>
        </div>
        <div class="column">
          <p>5</p>
        </div>
        <div class="column">
          <p>6</p>
        </div>
      </div>
    </div>

    <h2>More grid stuff</h2>

    <p>What a grid is useful for is layout out rows and columns, 
      without so much nesting?, I think.</p>
      
    <div class="ui container">
      <div class="ui two column divided compact grid">
          <div class="row">
            <div class="column">
              AA
            </div>
            <div class="column">
              BB
            </div>
          </div>
          <div class="row">
            <div class="column">
              CC
            </div>
            <div class="column">
              DD
            </div>
          </div>
          <div class="row">
            <div class="column twelve wide">
              EE
            </div>
            <div class="column four wide">
              FFF
            </div>
          </div>
      </div>
    </div>




  </div>
</template>

<style scoped>

.row {
  border-width: 1px;
  border-color: aquamarine;
  border-style: solid;
}

.column {
  border-width: 1px;
  border-color: red;
  border-style: dotted;
}

.ui.container {
  border-width: 1px;
  border-color: green;
  border-style: dashed;
}

</style>

