//
// Copyright (c) 2026 Chen Jiajie(Ariakage)
//
// Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
// Date: 2026-08-24
// Description: Admin shell read (user + permissions + DreamUP events) sharing the gate memo
//

import { computed } from "vue";
import { hasDreamUPAdministrationAccess } from "@/features/dreamup-admin/permissions";
import { parseDreamUPEvents } from "@/features/dreamup-admin/api/response-validators";
import type { DreamUPEventSummary } from "@/features/dreamup-admin/types";
import type { CurrentUser } from "@/shared/types/identity";
import {
  isPermissionCapabilities,
  NO_PERMISSIONS,
  type PermissionCapabilities,
} from "@/shared/types/permissions";

export type AdminShellData = {
  user: CurrentUser;
  permissions: PermissionCapabilities;
  dreamUPEvents: DreamUPEventSummary[];
};

/**
 * Dual-stack pointer (P2): the Vite SPA counterpart of this Nuxt shell is
 * `useAdminShellBrowser.ts` in this directory — same payload-key semantics
 * over browserFetch with a module-level Promise dedup, consumed by
 * `src/layouts/dashboard.vue`. This Nuxt variant stays untouched for the SSR
 * stack (transport: server/queries/server-queries.ts).
 *
 * Stable payload key shared by the dashboard layout and admin pages.
 */
export const ADMIN_SHELL_DATA_KEY = "admin-shell";

/**
 * Vue port of the legacy `(admin)/admin/layout.tsx` prelude — with the
 * request-level memo replacing the legacy three-concurrent-request pattern.
 *
 * The Nitro admin gate already resolved `/me/permissions` (or
 * `/admin/dreamup/events` on DreamUP paths) into the h3 event context before
 * this layout renders; `getAdminAuthorizationSnapshot` returns that same
 * promise, so within one request the authorization lookup happens at most
 * once per path and permissions stay instantly revocable (no cross-request
 * cache). Only the session user still needs its own read.
 *
 * Returns `null` when unauthenticated; the dashboard layout owns the
 * client-side guard. Invalid authorization bodies degrade to empty
 * capabilities (fail closed: no privileged menu entries).
 */
export async function useAdminShell() {
  const { data, error } = await useAsyncData<AdminShellData | null>(
    ADMIN_SHELL_DATA_KEY,
    async () => {
      if (import.meta.server) {
        const { getSessionCookie } = await import("@/server/utils/server-session");
        if (!(await getSessionCookie())) return null;

        const event = useEvent();
        // Fail closed outside a request context: no memo sharing, no shell.
        if (!event) return null;
        const { getAdminAuthorizationSnapshot } = await import("@/server/utils/admin-authorization");
        const { serverQueries } = await import("@/server/queries/server-queries");

        const [user, permissionsSnapshot, dreamUPSnapshot] = await Promise.all([
          serverQueries.getCurrentUser(),
          getAdminAuthorizationSnapshot(event, "/me/permissions"),
          getAdminAuthorizationSnapshot(event, "/admin/dreamup/events"),
        ]);

        const permissions =
          permissionsSnapshot.kind === "response" &&
          permissionsSnapshot.status >= 200 &&
          permissionsSnapshot.status < 300 &&
          isPermissionCapabilities(permissionsSnapshot.body)
            ? permissionsSnapshot.body
            : NO_PERMISSIONS;

        let dreamUPEvents: DreamUPEventSummary[] = [];
        if (
          dreamUPSnapshot.kind === "response" &&
          dreamUPSnapshot.status >= 200 &&
          dreamUPSnapshot.status < 300
        ) {
          try {
            dreamUPEvents = parseDreamUPEvents(dreamUPSnapshot.body);
          } catch {
            dreamUPEvents = [];
          }
        }

        return { user, permissions, dreamUPEvents };
      }
      return null;
    },
    { server: true },
  );

  const currentUser = computed(() => data.value?.user ?? null);
  const permissions = computed(() => data.value?.permissions ?? NO_PERMISSIONS);
  const dreamUPEvents = computed<DreamUPEventSummary[]>(() => data.value?.dreamUPEvents ?? []);
  const showDreamUPAdministration = computed(() => hasDreamUPAdministrationAccess(dreamUPEvents.value));

  return {
    currentUser,
    permissions,
    dreamUPEvents,
    showDreamUPAdministration,
    shellData: data,
    shellError: error,
  };
}
