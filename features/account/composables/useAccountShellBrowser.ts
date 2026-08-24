//
// Copyright (c) 2026 Chen Jiajie(Ariakage)
//
// Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
// Date: 2026-08-24
// Description: Browser-side account-shell query (session user + permissions) with in-memory dedup
//

import { computed, shallowRef } from "vue";
import type { CurrentUser } from "@/shared/types/identity";
import type { PermissionCapabilities } from "@/shared/types/permissions";
import { isApiError } from "@/shared/api-error";
import { browserQueries } from "@/shared/queries/browser-queries";

export type AccountShellData = {
  user: CurrentUser;
  permissions: PermissionCapabilities;
};

/**
 * Stable dedup key, kept identical to the Nuxt `useAsyncData` payload key in
 * features/account/composables/useAccountShell.ts so the two stacks describe
 * the same logical resource during the dual-stack period.
 */
export const ACCOUNT_SHELL_DATA_KEY = "account-shell";

/**
 * Browser port of `useAccountShell` for the Vite SPA stack.
 *
 * Session check semantics are copied verbatim from
 * server/utils/login-session.ts: the shell confirms the session through
 * `getCurrentUser()` (GET /me) and treats ONLY an explicit 401
 * (`kind === "unauthorized"`) as an anonymous session — every other backend
 * failure propagates instead of being disguised as "logged out".
 *
 * Deduplication: a module-level Promise cache reproduces the legacy
 * `useAsyncData` payload-key contract (`ACCOUNT_SHELL_DATA_KEY`) — the
 * account layout and every account page observe the SAME in-flight request
 * instead of issuing duplicate /me + /me/permissions calls. The cache lives
 * for the session: it is cleared on logout, on an explicit 401 and on
 * `session.reauthentication_required` (api-error kind), and failures are
 * never cached so the next navigation retries.
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
let cachedShellPromise: Promise<AccountShellData | null> | null = null;

/**
 * Loads (or reuses) the account shell data. Returns `null` for an explicitly
 * unauthenticated session; throws every other backend failure.
 */
export function loadAccountShellData(): Promise<AccountShellData | null> {
  if (cachedShellPromise !== null) return cachedShellPromise;

  const pending = (async (): Promise<AccountShellData | null> => {
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
      const permissions = await browserQueries.getCurrentPermissions();
      return { user, permissions };
    } catch (error) {
      // 401 / session.reauthentication_required / any transport failure all
      // evict the cache so the next navigation re-resolves from scratch.
      cachedShellPromise = null;
      throw error;
    }
  })();

  cachedShellPromise = pending;
  return pending;
}

/**
 * Evicts the cached shell (logout flows, forced re-authentication). The next
 * `useAccountShellBrowser()` call re-issues the /me + /me/permissions reads.
 */
export function invalidateAccountShellCache(): void {
  cachedShellPromise = null;
}

/**
 * Async composable for `<script setup>` layouts/pages. Resolves the shared
 * shell read and surfaces it through the same refs shape as the Nuxt variant
 * (`currentUser` / `permissions` / `shellData` / `shellError`); the account
 * layout owns the fail-closed redirect-to-login guard.
 */
export async function useAccountShellBrowser() {
  // shallowRef on purpose: the shell payload and any surfaced error are whole
  // replacements (never field-mutated), so they must not be wrapped in a deep
  // reactive proxy — an error surfaced here stays the exact thrown object.
  const shellData = shallowRef<AccountShellData | null>(null);
  const shellError = shallowRef<unknown>(null);

  try {
    shellData.value = await loadAccountShellData();
  } catch (error) {
    shellError.value = error;
  }

  const currentUser = computed(() => shellData.value?.user ?? null);
  const permissions = computed(() => shellData.value?.permissions ?? null);

  return { currentUser, permissions, shellData, shellError };
}
