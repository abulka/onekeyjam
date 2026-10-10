<script setup>
import { computed } from 'vue'
import { ref } from "vue";
import { globals } from '../../src/lib/globals.js'
import { loadUserProject, loadTestSongsProject, loadClassicProject, loadProgressionProject, loadRockProject, loadMultiKeyProject } from '../../src/lib/boot-project'

const modalDialogBoxDiv = ref();
const showDescriptions = ref(false);
const props = defineProps(['userOrFeatured'])

// listbox entries
const options = computed({
    get: () => {
        if (props.userOrFeatured == 'user')
            return globals.projectLibrary.userProjectNames
        if (props.userOrFeatured == 'classic')
            return globals.projectLibrary.classicProjectNames
        if (props.userOrFeatured == 'progressions')
            return globals.projectLibrary.progressionProjectNames
        if (props.userOrFeatured == 'rock')
            return globals.projectLibrary.rockProjectNames
        if (props.userOrFeatured == 'multi-key')
            return globals.projectLibrary.multiKeyProjectNames
        return globals.projectLibrary.testSongNames ?? globals.projectLibrary.projectNames
    },
})

const dialogBoxTitle = computed({
    get: () => {
        if (props.userOrFeatured == 'user')
            return 'My'
        if (props.userOrFeatured == 'classic')
            return 'Classic'
        if (props.userOrFeatured == 'progressions')
            return 'Progressions'
        if (props.userOrFeatured == 'rock')
            return 'Rock'
        if (props.userOrFeatured == 'multi-key')
            return 'Multi-key'
        return 'Test-songs'
    }
})

function fileOpen() {
    $(modalDialogBoxDiv.value).modal('show');
}

defineExpose({
    fileOpen,
});

function clickOnList(event, name) {
    $('.ui.modal')
        .modal('hide');
    if (props.userOrFeatured == 'user')
        loadUserProject(name)
    else if (props.userOrFeatured == 'classic')
        loadClassicProject(name)
    else if (props.userOrFeatured == 'progressions')
        loadProgressionProject(name)
    else if (props.userOrFeatured == 'rock')
        loadRockProject(name)
    else if (props.userOrFeatured == 'multi-key')
        loadMultiKeyProject(name)
    else
        loadTestSongsProject(name)
}

</script>

<template>

    <div class="ui small modal" ref="modalDialogBoxDiv">
        <div class="header">Open a {{ dialogBoxTitle }} Project</div>

        <div class="scrolling content">

            <p v-if="options.length > 0">Please click on a project to load it.</p>
            <p v-else>No projects.</p>

            <div class="ui selection celled list ">
                <div class="item" v-for="option of options" :key="option" @click="clickOnList($event, option)">
                    <i class="file alternate icon"></i>
                    <div class="content">
                        {{ option }}
                    </div>
                    <div v-if="showDescriptions" class="description">blah blah</div>
                </div>
            </div>

        </div>

        <div class="center aligned actions">
            <div class="ui negative button">Cancel</div>

            <div class="ui checkbox ml-10">
                <input type="checkbox" id="show-decriptions" v-model="showDescriptions">
                <label for="show-decriptions">Show descriptions</label>
            </div>
        </div>

    </div>

</template>

<style scoped>
.switch-project-padding {
    padding-right: 0.5em;
}
</style>
