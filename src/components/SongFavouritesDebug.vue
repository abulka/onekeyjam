<script setup>
import { computed } from 'vue'
import { ref, onMounted, onUnmounted } from "vue";
import { globals } from '/src/lib/globals.js'


</script>

<template>
    <div>
        {{ globals.project.songs.default }}

        <div v-if="globals.project.songs.default">
            <!-- protect against empty project -->
            <span v-if="globals.project.songs.default.favourites.length > 0">Favourite Chords: {{
                    globals.project.songs.default.favourites
            }}</span>
            <span v-if="globals.project.songs.default.blacklist.length > 0">Blacklisted Chords: {{
                    globals.project.songs.default.blacklist
            }}</span>
        </div>
    </div>
</template>

<style scoped>
</style>
