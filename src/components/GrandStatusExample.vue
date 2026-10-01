<script setup>
import { computed } from 'vue'
import { ref, onMounted, onUnmounted } from "vue";
import { globals } from '/src/lib/globals.js'


</script>

<template>

    <div class="ui three column compact grid wrapper">
        <div class="ten wide column">

            <!-- sub grid  -->
            <div class="ui four column divided compact grid">
                <div class="row">
                    <div class="column two wide">
                        AAA
                    </div>
                    <div class="column three wide centered">
                        BB
                    </div>
                    <div class="center aligned column five wide">
                        <span class="ui medium red text">medium</span>
                    </div>
                    <div class="column six wide">
                        fourth column
                        fourth column
                        fourth column
                        fourth column
                        fourth column
                    </div>
                </div>
                <div class="row debug">
                    <div class="column two wide">
                        AAA2
                    </div>
                    <div class="column three wide">
                        BB2
                    </div>
                    <div class="center aligned column five wide">
                        BBBBB2
                    </div>
                    <div class="column six wide">
                        fourth column2
                        fourth column2
                        fourth column2

                    </div>
                </div>

            </div>
        </div>

        <div class="three wide stretched column debug2">

            <!-- three row subgrid using fomantic - doesn't spread vertically as you get narrower -->
            <!--     
    <div class="ui center aligned divided compact grid ">
      <div class="middle aligned row">
        <div class="column">
          row 1
        </div>
      </div>
      <div class="middle aligned row">
        <div class="column">
          row 2
        </div>
      </div>
      <div class="middle aligned row">
        <div class="column">
          row 3
        </div>
      </div>
    </div>
    
     -->

            <!-- this works as I want 👍 - but you need the extra div wrapper 'outer' to make it work. Does not need 'stretched' in the column wrapping this  -->

            <div class="outer">
                <div>row 1</div>
                <div>row 2</div>
                <div>row 3</div>
            </div>




            <!-- another attempt, simpler - DOES expand and spread as long as you put stretched on the column wrapping this. 
    HOWEVER takes up too much vertical room in wide displays, for some reason. -->
            <!-- 
  <div class="ui compact center aligned grid fred">
      <div class="row">
          row 1
      </div>
      <div class="row">
          row 2
      </div>
      <div class="row">
          row 3
      </div>
    </div>
     -->


        </div>

        <div class="three wide column">
            <!-- using pure flex stuff and avoiding fomantic seems to work better in spreading vertically -->
            <div class="outer">
                <button class="button">Text 1</button>
                <button class="button">Text 2</button>
                <button class="button">Text 3</button>
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

.wrapperX {
    border: 1px solid green;
}

</style>
