<script setup lang="ts">
// Default layout: content is provided by app.vue inside the Naive UI providers.
</script>

<template>
  <div class="app-shell">
    <slot />
  </div>
</template>

<style scoped>
.app-shell {
  min-height: 100vh;
  padding: 24px;
  box-sizing: border-box;
}
</style>
