//
// Copyright (c) 2026 Chen Jiajie(Ariakage)
//
// Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
// Date: 2026-08-24
// Description: MFA challenge state machine (active/submitting/expired/too_many_attempts)
//

import { computed, ref } from "vue";
import type { MfaMethod } from "@/features/auth/types";
import { isApiError } from "@/shared/api-error";

/**
 * Behavioral port of the frozen `mfa-challenge-panel.tsx` state machine.
 *
 * Invariants preserved from the legacy panel:
 * - TOTP format violations (`/^\d{6}$/`) never consume an attempt; only
 *   backend verdicts and recovery-code failures do.
 * - `MAX_ATTEMPTS = 5` recovery failures lock the challenge into
 *   `too_many_attempts`.
 * - a backend 429 (`rate_limited` ApiError) transitions straight to
 *   `too_many_attempts` regardless of the local attempt count.
 * - the `expired` phase is only reachable through the mock demo control;
 *   real mode never silently expires a challenge client-side.
 * - passkey-only challenges auto-trigger the WebAuthn prompt on mount.
 */

export type MfaPhase = "active" | "submitting" | "expired" | "too_many_attempts";

export const MFA_MAX_ATTEMPTS = 5;

export const MOCK_MFA_REDIRECT_URL = "/account";

const METHOD_LABELS: Record<MfaMethod, string> = {
  totp: "验证器应用",
  passkey: "通行密钥",
  recovery_code: "恢复代码",
};

const METHOD_ORDER: MfaMethod[] = ["totp", "passkey", "recovery_code"];

function pickDefaultMethod(methods: MfaMethod[]): MfaMethod {
  for (const method of METHOD_ORDER) {
    if (methods.includes(method)) {
      return method;
    }
  }
  return methods[0];
}

export type UseMfaChallengeOptions = {
  mfaToken: string;
  availableMethods: MfaMethod[];
  passkeyRequestOptions?: unknown;
  onSuccess: (redirectUrl: string) => void;
  onCancel: () => void;
  /**
   * Real-mode seam (P3.9): submits the code against the P1 Session API.
   * When provided, verification performs a real network round-trip and the
   * mock artifacts stay hidden; when absent, the frozen mock behavior is
   * kept. The passkey method supplies a WebAuthn assertion as third arg.
   */
  onVerify?: (method: MfaMethod, code: string, passkeyAssertion?: unknown) => Promise<void>;
};

export function useMfaChallenge(options: UseMfaChallengeOptions) {
  const isRealMode = options.onVerify !== undefined;
  const isPasskeyOnly =
    options.availableMethods.length === 1 && options.availableMethods[0] === "passkey";

  const phase = ref<MfaPhase>("active");
  const selectedMethod = ref<MfaMethod>(pickDefaultMethod(options.availableMethods));
  const codeValue = ref("");
  const recoveryValue = ref("");
  const fieldError = ref<string | undefined>(undefined);
  const attempts = ref(0);

  const isSubmitting = computed(() => phase.value === "submitting");

  function methodLabel(method: MfaMethod): string {
    return METHOD_LABELS[method];
  }

  function selectMethod(method: MfaMethod): void {
    selectedMethod.value = method;
    fieldError.value = undefined;
  }

  function completeChallengeSuccess(): void {
    // Mock: short settle delay before the parent navigates, frozen behavior.
    phase.value = "submitting";
    window.setTimeout(() => {
      options.onSuccess(MOCK_MFA_REDIRECT_URL);
    }, 600);
  }

  function verifyErrorMessage(error: unknown): string {
    if (isApiError(error)) {
      if (error.kind === "rate_limited") {
        phase.value = "too_many_attempts";
      }
      return error.message;
    }
    return "验证失败，请重试。";
  }

  async function handleRealTotpSubmit(code: string): Promise<void> {
    if (!options.onVerify) return;
    phase.value = "submitting";
    try {
      await options.onVerify("totp", code);
      options.onSuccess(MOCK_MFA_REDIRECT_URL);
    } catch (error) {
      phase.value = "active";
      fieldError.value = verifyErrorMessage(error);
    }
  }

  async function handleRealRecoverySubmit(code: string): Promise<void> {
    if (!options.onVerify) return;
    phase.value = "submitting";
    try {
      await options.onVerify("recovery_code", code);
      options.onSuccess(MOCK_MFA_REDIRECT_URL);
    } catch (error) {
      phase.value = "active";
      const nextAttempts = attempts.value + 1;
      attempts.value = nextAttempts;
      if (nextAttempts >= MFA_MAX_ATTEMPTS) {
        phase.value = "too_many_attempts";
        return;
      }
      fieldError.value = verifyErrorMessage(error);
    }
  }

  function submitTotp(): void {
    const code = codeValue.value.trim();

    if (!/^\d{6}$/.test(code)) {
      fieldError.value = "请输入 6 位数字验证码。";
      return;
    }

    if (options.onVerify) {
      void handleRealTotpSubmit(code);
      return;
    }

    // Mock: any 6-digit code from an authenticator app is accepted.
    completeChallengeSuccess();
  }

  function submitRecovery(): void {
    const code = recoveryValue.value.trim();

    if (code.length < 8) {
      const nextAttempts = attempts.value + 1;
      attempts.value = nextAttempts;
      if (nextAttempts >= MFA_MAX_ATTEMPTS) {
        phase.value = "too_many_attempts";
        return;
      }
      fieldError.value = `恢复代码无效。剩余尝试次数 ${MFA_MAX_ATTEMPTS - nextAttempts} 次。`;
      return;
    }

    if (options.onVerify) {
      void handleRealRecoverySubmit(code);
      return;
    }

    completeChallengeSuccess();
  }

  async function handleRealPasskey(): Promise<void> {
    if (!options.onVerify || !options.passkeyRequestOptions) {
      fieldError.value = "通行密钥验证不可用，请选择其他验证方式。";
      return;
    }
    phase.value = "submitting";
    try {
      const credential = (await navigator.credentials.get({
        publicKey: options.passkeyRequestOptions as PublicKeyCredentialRequestOptions,
      })) as PublicKeyCredential | null;
      if (!credential) throw new Error("未选择通行密钥。");
      await options.onVerify("passkey", "", credential);
      options.onSuccess(MOCK_MFA_REDIRECT_URL);
    } catch (error) {
      phase.value = "active";
      fieldError.value = error instanceof Error ? error.message : "通行密钥验证失败，请重试。";
    }
  }

  async function triggerPasskey(): Promise<void> {
    if (options.onVerify) {
      await handleRealPasskey();
      return;
    }
    // Mock: a real passkey flow would call the WebAuthn API here. This
    // simulates a successful assertion without touching any credential.
    completeChallengeSuccess();
  }

  /** Mock-only demo control: real mode never reaches the expired phase. */
  function demoSetPhase(next: "expired" | "too_many_attempts"): void {
    phase.value = next;
  }

  return {
    isRealMode,
    isPasskeyOnly,
    phase,
    selectedMethod,
    codeValue,
    recoveryValue,
    fieldError,
    attempts,
    isSubmitting,
    methodLabel,
    selectMethod,
    submitTotp,
    submitRecovery,
    triggerPasskey,
    demoSetPhase,
  };
}
