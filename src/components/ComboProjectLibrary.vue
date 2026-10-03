<script setup>
import { computed } from 'vue'
import { ref } from "vue";
import { globals } from '../../src/lib/globals.js'
import { loadUserProject, loadFeaturedProject, loadClassicProject } from '../../src/lib/boot-project'

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
        return globals.projectLibrary.projectNames
    },
})

const currentProjectDisplay = computed({
    get: () => {
        const name = globals.projectLibrary.projectName
        if (!name) {
            return 'Untitled'
        } else {
            return name
        }
    },
})

const dialogBoxTitle = computed({
    get: () => {
        if (props.userOrFeatured == 'user')
            return 'My'
        if (props.userOrFeatured == 'classic')
            return 'Classic'
        return 'Featured'
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
    else
        loadFeaturedProject(name)
}

</script>

<template>

    <span v-if="props.userOrFeatured == 'user'">
        <a href="#" @click="fileOpen()" class="ml-2">Project:</a> <code class="ml-2">{{ currentProjectDisplay }}</code>
    </span>

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
