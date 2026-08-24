//
// Copyright (c) 2026 Chen Jiajie(Ariakage)
//
// Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
// Date: 2026-08-24
// Description: Account-side reauthentication flow state machine (password -> optional MFA -> one-time grant)
//

import { ref } from "vue";
import type {
  ReauthenticationAction,
  ReauthenticationChallenge,
} from "@/features/account/types";
import { USE_MOCK_DATA_SOURCE } from "@/shared/data-source-mode";
import { browserCommands } from "@/shared/commands/browser-commands";
import { getPasskeyAssertion, isWebAuthnSupported } from "@/features/account/utils/webauthn";

export type ReauthenticationFlowOptions = {
  action: ReauthenticationAction;
  target: string;
  operationError: string;
  /**
   * Runs the protected mutation after the single-use grant is issued. The
   * grant is bound to the declared action/target; the caller attaches it as
   * `X-Reauthentication-Token` on exactly one mutating request. The signal
   * belongs to the ceremony AbortController so closing the owning modal
   * cancels the in-flight operation.
   */
  performGranted: (reauthToken: string, signal: AbortSignal) => Promise<void>;
};

/**
 * Vue port of the frozen account-domain reauthentication flow
 * (`docs/api-contracts.md` §高危操作重认证). Extracted from
 * AccountReauthenticationForm so the ceremony branches (direct grant,
 * mfa_required challenge, failure) stay unit-testable.
 */
export function useReauthenticationFlow(options: ReauthenticationFlowOptions) {
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
    if (options.action === "account.passkey.enroll" && !USE_MOCK_DATA_SOURCE && !isWebAuthnSupported()) {
      error.value = "当前浏览器不支持通行密钥，请更换受支持的浏览器或设备。";
      return;
    }
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
