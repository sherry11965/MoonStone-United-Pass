//
// Copyright (c) 2026 Chen Jiajie(Ariakage)
//
// Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
// Date: 2026-08-24
// Description: Browser-side public registration seam
//

import { browserFetch } from "@/shared/http/browser-http-client";

export type CreateRegistrationInput = {
  username: string;
  displayName: string;
  email: string;
  password: string;
  acceptedTerms: boolean;
  requestId?: string;
};

export type CreateRegistrationResult = {
  status: "verification_required";
  registrationToken: string;
  expiresAt: string;
};

export type VerifyRegistrationEmailInput = {
  userId: string;
  code: string;
  requestId?: string;
};

export type VerifyRegistrationEmailResult = {
  status: "verified";
  requestId?: string;
};

export async function createRegistration(
  input: CreateRegistrationInput,
): Promise<CreateRegistrationResult> {
  const response = await browserFetch<unknown>("/registrations", {
    method: "POST",
    body: {
      ...input,
      requestId: input.requestId ?? "",
    },
  });
  if (!isRecord(response)
    || response.status !== "verification_required"
    || typeof response.registrationToken !== "string"
    || response.registrationToken.length === 0
    || typeof response.expiresAt !== "string"
    || Number.isNaN(Date.parse(response.expiresAt))) {
    throw new TypeError("Registration API returned an invalid response");
  }
  return {
    status: "verification_required",
    registrationToken: response.registrationToken,
    expiresAt: response.expiresAt,
  };
}

export async function verifyRegistrationEmail(
  input: VerifyRegistrationEmailInput,
): Promise<VerifyRegistrationEmailResult> {
  const response = await browserFetch<unknown>("/registrations/email/verify", {
    method: "POST",
    body: {
      ...input,
      requestId: input.requestId ?? "",
    },
  });
  if (!isRecord(response)
    || response.status !== "verified"
    || (response.requestId !== undefined && typeof response.requestId !== "string")) {
    throw new TypeError("Email verification API returned an invalid response");
  }
  return {
    status: "verified",
    ...(typeof response.requestId === "string" && response.requestId !== ""
      ? { requestId: response.requestId }
      : {}),
  };
}

export async function resendRegistrationEmail(registrationToken: string): Promise<void> {
  const response = await browserFetch<unknown>("/registrations/email/resend", {
    method: "POST",
    body: { registrationToken },
  });
  if (!isRecord(response) || response.status !== "verification_sent") {
    throw new TypeError("Registration resend API returned an invalid response");
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
