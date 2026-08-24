//
// Copyright (c) 2026 Chen Jiajie(Ariakage)
//
// Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
// Date: 2026-08-24
// Description: Active session list state with per-session revocation (current device preserved)
//

import { computed, ref, unref, type MaybeRef } from "vue";
import type { UserSession } from "@/features/account/types";
import { USE_MOCK_DATA_SOURCE } from "@/shared/data-source-mode";
import { isApiError } from "@/shared/api-error";
import { browserCommands } from "@/shared/commands/browser-commands";

export type SessionRevocationOutcome = "revoked" | "not_found" | "failed" | "protected";

/**
 * Vue port of the frozen session-list behaviour (session-list.tsx).
 * Revocation removes the targeted session only; the current device is never
 * a revocation target (the UI hides the action and this guard is the second
 * line of defence). Mock mode keeps a local list; real mode delegates the
 * list refresh to the page-level server query via `refreshSessions`.
 */
export function useSessionList(
  initialSessions: MaybeRef<UserSession[]>,
  refreshSessions?: () => Promise<void> | void,
) {
  const mockSessions = ref<UserSession[]>(unref(initialSessions));
  const revokingId = ref<string | null>(null);

  const displayedSessions = computed<UserSession[]>(() =>
    USE_MOCK_DATA_SOURCE ? mockSessions.value : unref(initialSessions),
  );

  async function revokeSession(sessionId: string): Promise<SessionRevocationOutcome> {
    const target = displayedSessions.value.find((session) => session.sessionId === sessionId);
    if (target?.isCurrent === true) return "protected";
    revokingId.value = sessionId;
    try {
      await browserCommands.revokeOwnSession(sessionId);
      if (USE_MOCK_DATA_SOURCE) {
        mockSessions.value = mockSessions.value.filter((session) => session.sessionId !== sessionId);
      } else {
        await refreshSessions?.();
      }
      return "revoked";
    } catch (error) {
      if (isApiError(error) && error.kind === "not_found") {
        await refreshSessions?.();
        return "not_found";
      }
      return "failed";
    } finally {
      revokingId.value = null;
    }
  }

  return { displayedSessions, revokingId, revokeSession };
}
