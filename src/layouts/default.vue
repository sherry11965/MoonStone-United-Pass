<script setup lang="ts">
// Default layout: content is provided by src/App.vue inside the Naive UI
// providers. P1 mechanical copy of layouts/default.vue (unchanged).
</script>

<template>
  <div class="app-shell">
    <router-view />
  </div>
</template>

<style scoped>
.app-shell {
  min-height: 100vh;
  padding: 24px;
  box-sizing: border-box;
}
</style>
