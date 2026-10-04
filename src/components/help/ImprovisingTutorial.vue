<script setup>
import { computed } from 'vue'
import { renderMarkdown } from '@/lib/markdown.js'
import tutorialMarkdown from '../../../doco/IMPROVISING-TUTORIAL.md?raw'

// Renders doco/IMPROVISING-TUTORIAL.md in the Help view. The markdown file is
// the single source of truth for the tutorial text.

const html = computed(() => renderMarkdown(tutorialMarkdown))
</script>

<template>
    <article class="md" v-html="html"></article>
</template>

<style scoped>
.md :deep(h2) {
    margin-top: 1.5rem;
}

.md :deep(h3) {
    margin-top: 1.2rem;
}

.md :deep(.md-table) {
    border-collapse: collapse;
    width: 100%;
    margin: 1rem 0;
}

.md :deep(.md-table th),
.md :deep(.md-table td) {
    border: 1px solid #d9c9b0;
    padding: 0.35rem 0.5rem;
    text-align: left;
    vertical-align: top;
}

.md :deep(.md-table th) {
    background: #f3ead9;
}

.md :deep(pre) {
    background: #f3ead9;
    padding: 0.6rem;
    border-radius: 4px;
    overflow: auto;
}

.md :deep(code) {
    background: #f3ead9;
    padding: 0 0.2rem;
    border-radius: 3px;
}

.md :deep(blockquote) {
    border-left: 4px solid #d9c9b0;
    margin: 1rem 0;
    padding: 0.2rem 0.8rem;
    color: #5b4326;
}

.md :deep(hr) {
    border: none;
    border-top: 1px solid #d9c9b0;
    margin: 1.5rem 0;
}
</style>
