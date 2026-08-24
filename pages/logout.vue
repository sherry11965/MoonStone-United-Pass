<!--
 Copyright (c) 2026 Chen Jiajie(Ariakage)

 Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
 Date: 2026-08-24
 Description: Logout page (revokes the session, then redirects to /login)
-->

<script setup lang="ts">
import LogoutRedirect from "@/features/auth/components/logout-redirect.vue";

definePageMeta({ layout: "auth" });
useHead({ title: "退出登录" });
</script>

<template>
  <LogoutRedirect />
</template>
