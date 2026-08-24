<!--
 Copyright (c) 2026 Chen Jiajie(Ariakage)

 Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
 Date: 2026-08-24
 Description: Admin console layout shell (Vue port of legacy DashboardShell mode="admin")
-->

<script setup lang="ts">
// Vue port of the frozen `dashboard-shell.tsx` in admin mode: sidebar with
// the permission-derived navigation groups, profile card (DreamUP role
// first), the alternate-surface link and logout.
//
// Data reads replace the legacy three-concurrent-request layout prelude with
// the request-level authorization memo: the Nitro admin gate already resolved
// `/me/permissions` (and/or `/admin/dreamup/events`) into the h3 event
// context before this layout renders, so `useAdminShell` shares those
// lookups instead of issuing duplicate requests. Navigation keeps the legacy
// full-document semantics (external navigation), so every admin page goes
// through the server query layer and the gate.
import { h } from "vue";
import type { MenuGroupOption, MenuOption } from "naive-ui";
import { useAdminShell } from "@/features/admin/composables/useAdminShell";
import {
  ADMIN_ACCOUNT_NAVIGATION,
  ADMIN_NAVIGATION,
  filterAdminNavigation,
  getAdminProfileDescription,
  isAdminNavigationActive,
  resolveDreamUPRole,
  type AdminNavigationItem,
} from "@/features/admin/navigation";

// Frozen legacy icon paths (dashboard-shell account/admin mode share them).
const NAV_ICON_PATHS: Record<AdminNavigationItem["icon"], string> = {
  home: "M4 10.5 12 4l8 6.5M6 9.8V20h12V9.8",
  shield: "M12 3.5 18.5 6v4.6c0 4.2-2.7 7-6.5 9.4-3.8-2.4-6.5-5.2-6.5-9.4V6z",
  key: "M9.5 12m-4 0a4 4 0 1 0 8 0a4 4 0 1 0-8 0M13.5 12H21M18.5 12v3",
  apps: "M4.5 4.5h6v6h-6zM13.5 4.5h6v6h-6zM4.5 13.5h6v6h-6zM13.5 13.5h6v6h-6z",
  history: "M12 7.5V12l3 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z",
  user: "M12 8m-4 0a4 4 0 1 0 8 0a4 4 0 1 0-8 0M4.5 20c0-3.3 3.4-5.5 7.5-5.5s7.5 2.2 7.5 5.5",
  users: "M9 9.5m-3 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0M3.5 18.5c0-2.7 2.5-4.3 5.5-4.3s5.5 1.6 5.5 4.3M15.5 7a2.8 2.8 0 1 1 2.5 4.2M17.5 14.4c1.8.6 3 1.9 3 3.6",
  globe: "M12 12m-8.5 0a8.5 8.5 0 1 0 17 0a8.5 8.5 0 1 0-17 0M3.5 12h17M12 3.5c2.5 2.3 3.8 5.2 3.8 8.5s-1.3 6.2-3.8 8.5c-2.5-2.3-3.8-5.2-3.8-8.5s1.3-6.2 3.8-8.5z",
};

function renderNavIcon(icon: AdminNavigationItem["icon"]) {
  return () =>
    h(
      "svg",
      {
        width: "16",
        height: "16",
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        "stroke-width": "1.9",
        "stroke-linecap": "round",
        "stroke-linejoin": "round",
        "aria-hidden": "true",
      },
      [h("path", { d: NAV_ICON_PATHS[icon] })],
    );
}

function toMenuOption(item: AdminNavigationItem): MenuOption {
  return { key: item.href, label: item.label, icon: renderNavIcon(item.icon) };
}

const { currentUser, permissions, dreamUPEvents, showDreamUPAdministration, shellData } =
  await useAdminShell();

// Client-only fail-closed guard: a missing payload means the server could not
// resolve the shell (the Nitro gate normally redirects before this point).
if (import.meta.client && shellData.value === null) {
  await navigateTo("/login", { redirectCode: 307 });
}

const isMenuOpen = ref(false);
const route = useRoute();

// Frozen legacy admin-mode groups: account items first, then the
// permission-filtered management items.
const menuOptions = computed<MenuOption[]>(() => {
  const groups: MenuGroupOption[] = [];
  if (currentUser.value) {
    groups.push({
      type: "group",
      key: "group-account",
      label: "账户",
      children: ADMIN_ACCOUNT_NAVIGATION.map(toMenuOption),
    });
  }
  const management = filterAdminNavigation(
    ADMIN_NAVIGATION,
    permissions.value,
    showDreamUPAdministration.value,
  );
  if (management.length > 0) {
    groups.push({
      type: "group",
      key: "group-management",
      label: "管理",
      children: management.map(toMenuOption),
    });
  }
  return groups;
});

// Active key: the most specific matching entry (roots match exactly).
const activeMenuKey = computed(() => {
  const candidates = [...ADMIN_ACCOUNT_NAVIGATION, ...ADMIN_NAVIGATION].filter((item) =>
    isAdminNavigationActive(route.path, item.href),
  );
  return candidates.length > 0 ? candidates[candidates.length - 1].href : null;
});

// Full-document navigation keeps the legacy per-render server contract.
function handleMenuSelect(key: string): void {
  void navigateTo(key, { external: true });
}

const dreamUPRole = computed(() => resolveDreamUPRole(dreamUPEvents.value));

const profileDescription = computed(() => {
  const user = currentUser.value;
  if (!user) return "";
  return getAdminProfileDescription(user, dreamUPRole.value);
});

// Legacy avatar rule: only media served through the avatar API seam is shown.
const sidebarAvatarSrc = computed(() => {
  const avatarUrl = currentUser.value?.avatarUrl;
  return avatarUrl?.startsWith("/api/v1/media/avatars/") ? avatarUrl : undefined;
});

function closeMenu(): void {
  isMenuOpen.value = false;
}

function handleBackdropKeydown(event: KeyboardEvent): void {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    closeMenu();
  }
}
</script>

<template>
  <div class="shell">
    <header class="mobile-header">
      <BrandMark compact />
      <div class="mobile-actions">
        <ThemeToggle />
        <n-button
          quaternary
          :aria-label="isMenuOpen ? '关闭导航' : '打开导航'"
          @click="isMenuOpen = !isMenuOpen"
        >
          <template #icon>
            <svg v-if="isMenuOpen" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
            <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </template>
        </n-button>
      </div>
    </header>

    <button
      v-if="isMenuOpen"
      type="button"
      class="backdrop"
      aria-label="关闭导航"
      @click="closeMenu"
      @keydown="handleBackdropKeydown"
    />

    <aside class="sidebar" :class="{ 'sidebar-open': isMenuOpen }">
      <NuxtLink class="brand-link" to="/admin" external @click="closeMenu">
        <BrandMark />
      </NuxtLink>
      <div class="surface-row">
        <div class="surface-label">管理控制台</div>
        <ThemeToggle />
      </div>
      <nav class="navigation" aria-label="管理后台导航" @click="closeMenu">
        <n-menu
          :value="activeMenuKey ?? undefined"
          :options="menuOptions"
          :indent="30"
          @update:value="handleMenuSelect"
        />
      </nav>

      <div class="sidebar-footer">
        <NuxtLink v-if="currentUser" class="alternate-link" to="/account" external @click="closeMenu">
          查看普通用户示例
        </NuxtLink>
        <div v-if="currentUser" class="profile">
          <n-avatar
            round
            :size="34"
            :src="sidebarAvatarSrc"
          >
            <svg width="55%" height="55%" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="12" cy="8" r="4" />
              <path d="M4.5 20c0-3.3 3.4-5.5 7.5-5.5s7.5 2.2 7.5 5.5" />
            </svg>
          </n-avatar>
          <div>
            <strong>{{ currentUser.displayName }}</strong>
            <span>{{ profileDescription }}</span>
          </div>
        </div>
        <a class="logout-link" href="/logout">退出登录</a>
      </div>
    </aside>

    <main class="main">
      <slot v-if="currentUser" />
    </main>
  </div>
</template>

<style scoped>
/* Vue port of the frozen dashboard-shell.module.css (admin mode). */
.shell {
  min-height: 100vh;
  background: var(--up-canvas);
}

.sidebar {
  position: fixed;
  z-index: 30;
  top: 0;
  bottom: 0;
  left: 0;
  display: flex;
  width: 252px;
  flex-direction: column;
  border-right: 1px solid var(--up-line);
  background: var(--up-glass);
  backdrop-filter: blur(20px);
}

.brand-link {
  display: block;
  margin: 28px 28px 26px;
  color: inherit;
  text-decoration: none;
}

.surface-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 0 18px 12px 28px;
}

.surface-label {
  color: var(--up-muted-soft);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.11em;
}

.mobile-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.navigation {
  flex: 1;
  padding: 0 8px;
  overflow-y: auto;
}

.navigation :deep(.n-menu-item-content) {
  border-radius: 10px;
}

.sidebar-footer {
  margin-top: auto;
  padding: 18px 18px 22px;
}

.alternate-link {
  display: block;
  margin: 0 8px 12px;
  color: var(--up-brand);
  font-size: 12px;
  font-weight: 620;
  text-align: center;
  text-decoration: none;
  transition: opacity 160ms ease;
}

.alternate-link:hover { opacity: 0.78; }

.logout-link {
  display: block;
  margin: 12px 8px 0;
  padding-top: 12px;
  border-top: 1px solid var(--up-line-soft);
  color: var(--up-muted);
  font-size: 12px;
  font-weight: 620;
  text-align: center;
  text-decoration: none;
  transition: color 160ms ease;
}

.logout-link:hover { color: var(--up-danger); }

.profile {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  border: 1px solid var(--up-line);
  border-radius: 12px;
  background: var(--up-surface-muted);
}

.profile > div { min-width: 0; }

.profile strong,
.profile span {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.profile strong { font-size: 13px; color: var(--up-ink); }
.profile span { margin-top: 2px; color: var(--up-muted); font-size: 11px; }

.main {
  min-height: 100vh;
  margin-left: 252px;
  padding: clamp(34px, 5vw, 64px) clamp(24px, 5vw, 64px) clamp(56px, 8vw, 96px);
}

.mobile-header,
.backdrop {
  display: none;
}

@media (max-width: 840px) {
  .mobile-header {
    position: sticky;
    z-index: 20;
    top: 0;
    display: flex;
    height: 66px;
    align-items: center;
    justify-content: space-between;
    padding: 0 20px;
    border-bottom: 1px solid var(--up-line);
    background: var(--up-glass);
    backdrop-filter: blur(18px);
  }

  .sidebar {
    width: min(84vw, 300px);
    transform: translateX(-102%);
    transition: transform 220ms ease;
  }

  .sidebar-open { transform: translateX(0); }

  .backdrop {
    position: fixed;
    z-index: 25;
    display: block;
    inset: 0;
    width: 100%;
    border: 0;
    background: var(--up-overlay);
    cursor: pointer;
  }

  .main {
    margin-left: 0;
    padding: 30px 20px 48px;
  }
}
</style>
