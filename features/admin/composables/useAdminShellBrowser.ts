//
// Copyright (c) 2026 Chen Jiajie(Ariakage)
//
// Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
// Date: 2026-08-24
// Description: Browser-side admin shell read (user + permissions + DreamUP events) with in-memory dedup
//

import { computed, shallowRef } from "vue";
import { hasDreamUPAdministrationAccess } from "@/features/dreamup-admin/permissions";
import { parseDreamUPEvents } from "@/features/dreamup-admin/api/response-validators";
import type { DreamUPEventSummary } from "@/features/dreamup-admin/types";
import type { CurrentUser } from "@/shared/types/identity";
import {
  NO_PERMISSIONS,
  type PermissionCapabilities,
} from "@/shared/types/permissions";
import { isApiError } from "@/shared/api-error";
import { browserFetch } from "@/shared/http/browser-http-client";
import { browserQueries } from "@/shared/queries/browser-queries";

export type AdminShellData = {
  user: CurrentUser;
  permissions: PermissionCapabilities;
  dreamUPEvents: DreamUPEventSummary[];
};

/**
 * Stable dedup key, kept identical to the Nuxt `useAsyncData` payload key in
 * features/admin/composables/useAdminShell.ts so the two stacks describe the
 * same logical resource during the dual-stack period.
 */
export const ADMIN_SHELL_DATA_KEY = "admin-shell";

/**
 * Browser port of `useAdminShell` for the Vite SPA stack.
 *
 * Session check semantics are copied verbatim from
 * server/utils/login-session.ts: the shell confirms the session through
 * `getCurrentUser()` (GET /me) and treats ONLY an explicit 401
 * (`kind === "unauthorized"`) as an anonymous session — every other backend
 * failure propagates instead of being disguised as "logged out".
 *
 * Authorization degradation mirrors the Nuxt variant fail-closed: an
 * unreadable `/me/permissions` response degrades to `NO_PERMISSIONS` (no
 * privileged menu entries), an unreadable `/admin/dreamup/events` response
 * degrades to an empty list (no DreamUP administration surface).
 *
 * Deduplication: a module-level Promise cache reproduces the legacy
 * `useAsyncData` payload-key contract (`ADMIN_SHELL_DATA_KEY`) — the
 * dashboard layout and every admin page observe the SAME in-flight request.
 * The cache lives for the session: it is cleared on logout, on an explicit
 * 401 and on `session.reauthentication_required` (api-error kind), and
 * failures are never cached so the next navigation retries.
 *
 * PERMISSION DISCIPLINE (deliberate design, mirrors
 * server/utils/admin-authorization.ts): session and permission data live in
 * memory ONLY. No localStorage/sessionStorage persistence, ever — cached
 * privileges must not survive a document lifetime and permissions stay
 * instantly revocable.
 */

// In-memory-only shell cache. Deliberately NOT persisted to any Web Storage:
// permission/session material must never outlive the document (see the
// permission discipline note above).
let cachedShellPromise: Promise<AdminShellData | null> | null = null;

async function fetchDreamUPEvents(): Promise<DreamUPEventSummary[]> {
  try {
    return parseDreamUPEvents(await browserFetch<unknown>("/admin/dreamup/events"));
  } catch {
    // Fail closed: no DreamUP administration surface on any lookup failure.
    return [];
  }
}

async function fetchPermissionCapabilities(): Promise<PermissionCapabilities> {
  try {
    return await browserQueries.getCurrentPermissions();
  } catch {
    // Fail closed: an unreadable authorization lookup degrades to empty
    // capabilities (no privileged menu entries), exactly like the Nuxt
    // variant's NO_PERMISSIONS degradation.
    return NO_PERMISSIONS;
  }
}

/**
 * Loads (or reuses) the admin shell data. Returns `null` for an explicitly
 * unauthenticated session; throws every other session-check failure.
 */
export function loadAdminShellData(): Promise<AdminShellData | null> {
  if (cachedShellPromise !== null) return cachedShellPromise;

  const pending = (async (): Promise<AdminShellData | null> => {
    let user: CurrentUser;
    try {
      user = await browserQueries.getCurrentUser();
    } catch (error) {
      cachedShellPromise = null;
      // login-session.ts contract: only an explicit 401 is anonymous.
      if (isApiError(error) && error.kind === "unauthorized") return null;
      throw error;
    }

    try {
      const [permissions, dreamUPEvents] = await Promise.all([
        fetchPermissionCapabilities(),
        fetchDreamUPEvents(),
      ]);
      return { user, permissions, dreamUPEvents };
    } catch (error) {
      // The permission/DreamUP lookups above never throw (they degrade
      // fail-closed), but keep the eviction guard so a future seam change
      // cannot pin a failed shell into the session cache.
      cachedShellPromise = null;
      throw error;
    }
  })();

  cachedShellPromise = pending;
  return pending;
}

/**
 * Evicts the cached shell (logout flows, forced re-authentication). The next
 * `useAdminShellBrowser()` call re-issues the shell reads.
 */
export function invalidateAdminShellCache(): void {
  cachedShellPromise = null;
}

/**
 * Async composable for `<script setup>` layouts/pages. Resolves the shared
 * shell read and surfaces it through the same refs shape as the Nuxt variant;
 * the dashboard layout owns the fail-closed redirect-to-login guard.
 */
export async function useAdminShellBrowser() {
  // shallowRef on purpose: the shell payload and any surfaced error are whole
  // replacements (never field-mutated), so they must not be wrapped in a deep
  // reactive proxy — an error surfaced here stays the exact thrown object.
  const shellData = shallowRef<AdminShellData | null>(null);
  const shellError = shallowRef<unknown>(null);

  try {
    shellData.value = await loadAdminShellData();
  } catch (error) {
    shellError.value = error;
  }

  const currentUser = computed(() => shellData.value?.user ?? null);
  const permissions = computed(() => shellData.value?.permissions ?? NO_PERMISSIONS);
  const dreamUPEvents = computed<DreamUPEventSummary[]>(
    () => shellData.value?.dreamUPEvents ?? [],
  );
  const showDreamUPAdministration = computed(() =>
    hasDreamUPAdministrationAccess(dreamUPEvents.value),
  );

  return {
    currentUser,
    permissions,
    dreamUPEvents,
    showDreamUPAdministration,
    shellData,
    shellError,
  };
}
