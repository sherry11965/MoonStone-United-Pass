//
// Copyright (c) 2026 Chen Jiajie(Ariakage)
//
// Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
// Date: 2026-08-24
// Description: Admin-side step-up reauthentication flow (password -> optional MFA -> one-time target-bound grant)
//

import { ref } from "vue";
import type {
  AdminReauthenticationAction,
  ReauthenticationChallenge,
} from "@/features/account/types";
import { browserCommands } from "@/shared/commands/browser-commands";
import { getPasskeyAssertion } from "@/features/account/utils/webauthn";

export type AdminReauthenticationFlowOptions = {
  action: AdminReauthenticationAction;
  target: string;
  operationError: string;
  /**
   * Runs the protected mutation after the single-use grant is issued. The
   * grant is bound to the declared action/target (e.g. `user.disable` + the
   * user id, `policy.publish` + the policy id); the caller attaches it as
   * `X-Reauthentication-Token` on exactly one mutating request. The signal
   * belongs to the ceremony AbortController so closing the owning modal
   * cancels the in-flight operation.
   */
  performGranted: (reauthToken: string, signal: AbortSignal) => Promise<void>;
};

/**
 * Admin-domain step-up ceremony (`docs/api-contracts.md` §高危操作重认证),
 * maintained independently from the account-domain flow so the console can
 * evolve its own copy. The state machine is identical: password -> optional
 * 202 `mfa_required` challenge -> one-time, target-bound grant. The only
 * difference: no admin action enrolls passkeys, so the WebAuthn support
 * pre-check used by `account.passkey.enroll` does not apply here.
 */
export function useAdminReauthenticationFlow(options: AdminReauthenticationFlowOptions) {
  const password = ref("");
  const challenge = ref<ReauthenticationChallenge | null>(null);
  const method = ref<"totp" | "passkey">("totp");
  const totpCode = ref("");
  const isSubmitting = ref(false);
  const error = ref<string>();
  let operationController: AbortController | null = null;

  function replaceAbortController(): AbortController {
    operationController?.abort();
    const controller = new AbortController();
    operationController = controller;
    return controller;
  }

  async function finishWithGrant(reauthToken: string, signal: AbortSignal): Promise<void> {
    challenge.value = null;
    totpCode.value = "";
    await options.performGranted(reauthToken, signal);
  }

  async function runGrantedOperation(reauthToken: string, signal: AbortSignal): Promise<void> {
    try {
      await finishWithGrant(reauthToken, signal);
    } catch {
      error.value = options.operationError;
    } finally {
      operationController = null;
    }
  }

  async function requestGrant(): Promise<void> {
    error.value = undefined;
    isSubmitting.value = true;
    const controller = replaceAbortController();
    try {
      const outcome = await browserCommands.requestReauthentication(
        { action: options.action, target: options.target, password: password.value },
        { signal: controller.signal },
      );
      password.value = "";
      if (outcome.status === "granted") {
        await runGrantedOperation(outcome.reauthToken, controller.signal);
        return;
      }
      const defaultMethod = outcome.availableMethods[0];
      if (defaultMethod !== undefined) method.value = defaultMethod;
      challenge.value = outcome;
    } catch {
      password.value = "";
      error.value = "身份验证失败，请重新输入密码后再试。";
    } finally {
      isSubmitting.value = false;
    }
  }

  async function completeMfa(): Promise<void> {
    const currentChallenge = challenge.value;
    if (currentChallenge === null) return;
    error.value = undefined;
    isSubmitting.value = true;
    const controller = replaceAbortController();
    let grantedToken: string;
    try {
      const grant = method.value === "totp"
        ? await browserCommands.completeReauthenticationMfa({
            reauthToken: currentChallenge.reauthToken,
            method: method.value,
            code: totpCode.value,
          }, { signal: controller.signal })
        : await browserCommands.completeReauthenticationMfa({
            reauthToken: currentChallenge.reauthToken,
            method: method.value,
            passkeyAssertion: await getPasskeyAssertion(
              currentChallenge.passkeyRequestOptions,
              controller.signal,
            ),
          }, { signal: controller.signal });
      grantedToken = grant.reauthToken;
    } catch {
      operationController = null;
      error.value = "二次验证失败，请重试或选择其他验证方式。";
      isSubmitting.value = false;
      return;
    }

    try {
      await runGrantedOperation(grantedToken, controller.signal);
    } finally {
      isSubmitting.value = false;
    }
  }

  function abort(): void {
    operationController?.abort();
    operationController = null;
  }

  return {
    password,
    challenge,
    method,
    totpCode,
    isSubmitting,
    error,
    requestGrant,
    completeMfa,
    abort,
  };
}
