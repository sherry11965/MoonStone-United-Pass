<!--
 Copyright (c) 2026 Chen Jiajie(Ariakage)

 Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
 Date: 2026-08-24
 Description: Application landing route — 307 redirect to the login page
-->

<script setup lang="ts">
// Mirrors the frozen landing route (legacy `src/app/page.tsx`): the portal has
// no public landing content, so the root path redirects straight to login.
// `redirectCode: 307` preserves the legacy server-side redirect semantics.
await navigateTo("/login", { redirectCode: 307 });
</script>

<template>
  <div />
</template>
