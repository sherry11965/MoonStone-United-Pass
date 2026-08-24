//
// Copyright (c) 2026 Chen Jiajie(Ariakage)
//
// Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
// Date: 2026-08-24
// Description: Shared account-shell query (session user + permission capabilities) with payload reuse
//

import { computed } from "vue";
import type { CurrentUser } from "@/shared/types/identity";
import type { PermissionCapabilities } from "@/shared/types/permissions";

export type AccountShellData = {
  user: CurrentUser;
  permissions: PermissionCapabilities;
};

/**
 * Dual-stack pointer (P2): the Vite SPA counterpart of this Nuxt shell is
 * `useAccountShellBrowser.ts` in this directory — same payload-key semantics
 * over browserFetch with a module-level Promise dedup, consumed by
 * `src/layouts/account.vue`. This Nuxt variant stays untouched for the SSR
 * stack (transport: server/queries/server-queries.ts).
 *
 * Stable payload key shared by the account layout and every account page.
 */
export const ACCOUNT_SHELL_DATA_KEY = "account-shell";

/**
 * Session-gated shell read for the account center (Vue port of the legacy
 * `(account)/account/layout.tsx` prelude: `requireSession()` then
 * `serverQueries.getCurrentUser/getCurrentPermissions`).
 *
 * The read runs server-side through `server/queries/server-queries.ts` inside
 * `useAsyncData` (server: true). The server-only modules are dynamically
 * imported behind `import.meta.server` so they never reach the browser
 * bundle. Layout and pages share the same payload key, so the serialized
 * payload is reused and the client never issues a second request.
 *
 * Returns `null` when the request is unauthenticated; the account layout
 * owns the redirect-to-login guard.
 */
export async function useAccountShell() {
  const { data, error } = await useAsyncData<AccountShellData | null>(
    ACCOUNT_SHELL_DATA_KEY,
    async () => {
      if (import.meta.server) {
        const { requireSession, getSessionCookie } = await import(
          "@/server/utils/server-session"
        );
        await requireSession();
        if (!(await getSessionCookie())) return null;
        const { serverQueries } = await import("@/server/queries/server-queries");
        const [user, permissions] = await Promise.all([
          serverQueries.getCurrentUser(),
          serverQueries.getCurrentPermissions(),
        ]);
        return { user, permissions };
      }
      return null;
    },
    { server: true },
  );

  const currentUser = computed(() => data.value?.user ?? null);
  const permissions = computed(() => data.value?.permissions ?? null);

  return { currentUser, permissions, shellData: data, shellError: error };
}
