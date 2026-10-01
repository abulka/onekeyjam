<script setup>
import { computed } from 'vue'
import { ref, onMounted, onUnmounted } from "vue";
import { globals } from '/src/lib/globals.js'


</script>

<template>
    <!-- AAAAAA
    <div class="wrapper">
        <p>hello</p>
        THIS IS A TEMPLATE FOR A COMPONENT
    </div> -->

    <!-- Rules
    If boundaries are being broken
        1. wrap in <div class="ui container wrapper">
        2. ensure grids are properly defined
        3. draw borders around outer container, not the grids themselves
    
    -->



    <div class="ui container wrapper">
        <div class="ui two column grid">
            <div class="column eight wide">
                AA
            </div>
            <div class="column eight wide">
                BB
            </div>
        </div>
    </div>


    <hr>

    <!-- BAD - this breaks out of the surrounding container for some reason, being a grid - 
    yet the other grids on this page do not? -->

    <!-- this was needed -->
    <div class="ui container wrapper">  

        <div class="ui compact grid">
            <!-- CCC -->

            <div class="column eight wide">
                C1
            </div>
            <div class="column eight wide">
                C2
            </div>
        </div>
    </div>

    <hr>

    <!-- even this breaks out, but then, if we haven't properly defined the grid DDDDDDD , so all bets are off. -->
    <div class="ui container wrapper">
        <div class="ui grid">
            <!-- DDDDDDDDDDDD not properly defined-->

            <!-- properly defined -->
            <div class="column eight wide">
                D1
            </div>
            <div class="column eight wide">
                D2
            </div>

        </div>
    </div>


    <!-- but this is OK -->
    <div class="ui container wrapper">
        <div class="ui two column grid">
            <div class="column eight wide">
                AA
            </div>
            <div class="column eight wide">
                BB
            </div>
        </div>
    </div>


    <hr>

</template>

<style scoped>
.wrapperX div {
    border: 1px solid green;
}

div.wrapper {
    border: 1px dotted red;
}
</style>
