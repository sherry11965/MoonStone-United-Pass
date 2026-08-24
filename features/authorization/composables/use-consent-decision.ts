//
// Copyright (c) 2026 Chen Jiajie(Ariakage)
//
// Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
// Date: 2026-08-24
// Description: Consent decision state machine and one-shot auto-completion
//

import { ref } from "vue";
import type { ConsentDecision, ConsentResolution } from "@/features/authorization/types";
import {
  acquireCompletionFlight,
  classifyCompletionFailure,
  evictCompletionFlight,
  type CompletionFailure,
} from "@/features/authorization/consent-completion";
import { browserCommands } from "@/shared/commands/browser-commands";
import { USE_MOCK_DATA_SOURCE } from "@/shared/data-source-mode";

export type DecisionState =
  | { phase: "idle" }
  | { phase: "submitting"; decision: ConsentDecision }
  // "done" is the frozen mock demo result card. Real mode never renders it:
  // it navigates immediately and keeps the callback URL out of the DOM.
  | { phase: "done"; decision: ConsentDecision; redirectUrl: string }
  | { phase: "navigating"; decision: ConsentDecision }
  // "error" is the mock retry demo. Real one-shot completions use "failed".
  | { phase: "error"; decision: ConsentDecision; message: string }
  | { phase: "failed"; decision: ConsentDecision; failure: CompletionFailure };

export type AutoCompletionState =
  | { phase: "in_flight" }
  | { phase: "failed"; failure: CompletionFailure };

/**
 * Behavioral port of the frozen `authorization-consent.tsx` decision logic.
 *
 * Security invariants preserved:
 * - real-mode success consumes the backend-validated `redirectUrl` via
 *   `window.location.assign` and the callback URL never enters the DOM;
 * - real-mode failures are one-shot: `classifyCompletionFailure` decides
 *   between relogin (401) and terminal, and no same-request retry is offered;
 * - the silent already-authorized completion goes through the single-flight
 *   store, so remounts/re-entry attach to the settled Promise instead of
 *   re-POSTing a completed transaction.
 */
export function useConsentDecision(resolution: ConsentResolution) {
  const decisionState = ref<DecisionState>({ phase: "idle" });
  const autoCompletion = ref<AutoCompletionState>({ phase: "in_flight" });

  const alreadyRequestedId =
    resolution.status === "already_authorized" ? resolution.requestId : null;

  async function handleDecision(choice: ConsentDecision): Promise<void> {
    if (resolution.status !== "valid") return;
    if (decisionState.value.phase === "submitting" || decisionState.value.phase === "navigating") {
      return;
    }

    decisionState.value = { phase: "submitting", decision: choice };
    try {
      const result = await browserCommands.decideConsent(
        resolution.request.requestId,
        choice,
      );
      if (!USE_MOCK_DATA_SOURCE) {
        // Real mode: the callback URL may carry the authorization code or
        // the OAuth error response. It is consumed by an immediate
        // same-window navigation and never enters the visible DOM.
        decisionState.value = { phase: "navigating", decision: choice };
        window.location.assign(result.redirectUrl);
        return;
      }
      // Mock mode keeps the frozen interactive result card.
      decisionState.value = { phase: "done", decision: choice, redirectUrl: result.redirectUrl };
    } catch (error) {
      if (!USE_MOCK_DATA_SOURCE) {
        // One-shot completion: the browser cannot prove the decision was not
        // applied, so real mode never offers a same-request retry.
        decisionState.value = {
          phase: "failed",
          decision: choice,
          failure: classifyCompletionFailure(error),
        };
        return;
      }
      decisionState.value = {
        phase: "error",
        decision: choice,
        message: "提交授权决定失败，请重试。",
      };
    }
  }

  /**
   * Auto-completion of an already-authorized consent silently submits
   * "allow" through the single-flight store in consent-completion.ts. Call
   * it from `onMounted` only: side effects stay out of render, and a
   * remount attaches to the same in-flight/settled Promise instead of
   * double-submitting. Returns the disposer used by `onBeforeUnmount`.
   */
  function startAutoCompletion(): () => void {
    if (alreadyRequestedId === null) return () => undefined;
    let disposed = false;
    void acquireCompletionFlight(alreadyRequestedId, (requestId) =>
      browserCommands.decideConsent(requestId, "allow"),
    ).then(
      (result) => {
        if (disposed) return;
        // Credential-grade callback URL: consumed by an immediate same-window
        // navigation — never rendered, parsed, or kept in visible state.
        window.location.assign(result.redirectUrl);
      },
      (error: unknown) => {
        if (disposed) return;
        const failure = classifyCompletionFailure(error);
        if (failure.outcome === "relogin") {
          // The session gate rejected before applying any decision: after the
          // user logs in and this page remounts, a fresh single-flight POST
          // may proceed.
          evictCompletionFlight(alreadyRequestedId);
        }
        autoCompletion.value = { phase: "failed", failure };
      },
    );
    return () => {
      disposed = true;
    };
  }

  function retryFromError(): void {
    decisionState.value = { phase: "idle" };
  }

  return {
    decisionState,
    autoCompletion,
    alreadyRequestedId,
    handleDecision,
    startAutoCompletion,
    retryFromError,
  };
}
