<script setup>
import { computed } from 'vue'
import { renderMarkdown } from '@/lib/markdown.js'

// Renders a Markdown help page. The headings get stable ids, so the Help
// sidebar can link to each section. The page shell (page links and the section
// TOC) lives in AboutView.vue.

const props = defineProps({
  markdown: { type: String, required: true },
})

const html = computed(() => renderMarkdown(props.markdown))
</script>

<template>
  <article class="md" v-html="html"></article>
</template>

<style scoped>
.md :deep(h1) {
  margin-top: 0.25rem;
}

.md :deep(h2) {
  margin-top: 1.5rem;
  scroll-margin-top: 1rem;
}

.md :deep(h3) {
  margin-top: 1.2rem;
  scroll-margin-top: 1rem;
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

.md :deep(pre code) {
  background: none;
  padding: 0;
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
