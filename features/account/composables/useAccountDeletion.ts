//
// Copyright (c) 2026 Chen Jiajie(Ariakage)
//
// Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
// Date: 2026-08-24
// Description: Account deletion cooling-period state machine (request / cancel)
//

import { computed, ref, type Ref } from "vue";
import type { AccountDeletion } from "@/features/account/types";
import { browserCommands } from "@/shared/commands/browser-commands";

/**
 * Vue port of the frozen account-deletion controls (privacy-rights.tsx).
 * The backend is authoritative for the exact cooling-period deadline and
 * rejects a cancellation that races with the worker claim, so the UI only
 * derives visibility (`mayRequest` / `mayCancel`) from the last known status.
 */
export function useAccountDeletion(initialDeletion: AccountDeletion) {
  const deletion: Ref<AccountDeletion> = ref(initialDeletion);
  const isCancelling = ref(false);

  const mayRequest = computed(
    () =>
      deletion.value.status === "none" ||
      deletion.value.status === "cancelled" ||
      deletion.value.status === "failed",
  );
  const mayCancel = computed(() => deletion.value.status === "pending");

  async function applyRequestedDeletion(reauthToken: string, signal: AbortSignal): Promise<void> {
    const next = await browserCommands.requestAccountDeletion(reauthToken, { signal });
    deletion.value = next;
  }

  /** Resolves true when the cancellation settled; false on failure. */
  async function cancelDeletion(): Promise<boolean> {
    isCancelling.value = true;
    try {
      const next = await browserCommands.cancelAccountDeletion();
      deletion.value = next;
      return true;
    } catch {
      return false;
    } finally {
      isCancelling.value = false;
    }
  }

  return { deletion, isCancelling, mayRequest, mayCancel, applyRequestedDeletion, cancelDeletion };
}
