//
// Copyright (c) 2026 Chen Jiajie(Ariakage)
//
// Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
// Date: 2026-08-24
// Description: No-JavaScript credential login fallback (native form POST)
//

import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from "@/shared/constants";
import { SERVER_API_BASE_URL } from "@/server/utils/server-api-base";
import { USE_MOCK_DATA_SOURCE } from "@/shared/data-source-mode";
import { authenticateMockAccount } from "@/shared/mock/mock-auth";

/**
 * Degraded login path for browsers without client scripts (旧前端
 * `credential-panel.tsx:217` 的 `<form method="post">` 与
 * `e2e/login.spec.ts:12-30` 行为对齐).
 *
 * Security contract:
 * - The native form POSTs to `/login`, so credentials travel in the request
 *   body and NEVER appear in the URL. Every failure branch redirects back to
 *   `/login` with an opaque `loginError` code only.
 * - Real mode forwards the submission to the P1 Session API
 *   (`POST /auth/sessions`): 204 completes the login and the backend's
 *   `Set-Cookie` headers are forwarded verbatim; 202 (MFA required) cannot be
 *   completed without scripts and returns to the login page with an explicit
 *   notice instead of silently failing.
 * - The CSRF token rendered into the form as a hidden field is forwarded as
 *   the `X-CSRF-Token` header, mirroring `browser-http-client.ts`.
 */

type LoginBody = Partial<Record<"identifier" | "password" | "remember" | "resumeRequestId" | "csrfToken", string>>;

function loginReturnUrl(resumeRequestId: string, loginError: string): string {
  const parameters = new URLSearchParams({ loginError });
  if (resumeRequestId) {
    parameters.set("requestId", resumeRequestId);
  }
  return `/login?${parameters.toString()}`;
}

function postLoginDestination(resumeRequestId: string, fallback: string): string {
  if (resumeRequestId) {
    return `/authorize?requestId=${encodeURIComponent(resumeRequestId)}`;
  }
  return fallback;
}

export default defineEventHandler(async (event) => {
  const body = (await readBody<LoginBody>(event).catch(() => ({}) as LoginBody)) ?? {};
  const identifier = typeof body.identifier === "string" ? body.identifier : "";
  const password = typeof body.password === "string" ? body.password : "";
  const remember = body.remember === "true" || body.remember === "on";
  const resumeRequestId = typeof body.resumeRequestId === "string" ? body.resumeRequestId : "";
  // Double-submit CSRF: prefer the hidden form field, fall back to the
  // non-HttpOnly cookie the browser attached to this same submission.
  const csrfFromBody = typeof body.csrfToken === "string" ? body.csrfToken : "";
  const csrfFromCookie = parseCookies(event)[CSRF_COOKIE_NAME];
  const csrfToken = csrfFromBody !== "" ? csrfFromBody : (typeof csrfFromCookie === "string" ? csrfFromCookie : "");

  if (identifier.trim().length === 0 || password.length === 0) {
    return sendRedirect(event, loginReturnUrl(resumeRequestId, "invalid_credentials"), 303);
  }

  if (USE_MOCK_DATA_SOURCE) {
    // Frozen mock contract (credential-panel.tsx): only the public demo
    // accounts authenticate, and no real session is ever created.
    const destination = authenticateMockAccount(identifier, password);
    if (!destination) {
      return sendRedirect(event, loginReturnUrl(resumeRequestId, "invalid_credentials"), 303);
    }
    return sendRedirect(event, postLoginDestination(resumeRequestId, destination), 303);
  }

  let response: Response;
  try {
    response = await fetch(`${SERVER_API_BASE_URL}/auth/sessions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(csrfToken !== "" && { [CSRF_HEADER_NAME]: csrfToken }),
      },
      body: JSON.stringify({
        identifier,
        password,
        remember,
        resumeRequestId,
      }),
      cache: "no-store",
    });
  } catch {
    return sendRedirect(event, loginReturnUrl(resumeRequestId, "network"), 303);
  }

  if (response.status === 204) {
    // Forward the session cookies exactly as the backend set them.
    for (const cookie of response.headers.getSetCookie()) {
      appendResponseHeader(event, "set-cookie", cookie);
    }
    return sendRedirect(event, postLoginDestination(resumeRequestId, "/account"), 303);
  }

  if (response.status === 202) {
    // MFA required: the challenge cannot be answered without scripts.
    return sendRedirect(event, loginReturnUrl(resumeRequestId, "mfa_required"), 303);
  }

  if (response.status === 429) {
    return sendRedirect(event, loginReturnUrl(resumeRequestId, "rate_limited"), 303);
  }

  if (response.status === 401 || response.status === 400 || response.status === 422) {
    return sendRedirect(event, loginReturnUrl(resumeRequestId, "invalid_credentials"), 303);
  }

  return sendRedirect(event, loginReturnUrl(resumeRequestId, "server_error"), 303);
});
