//
// Copyright (c) 2026 Chen Jiajie(Ariakage)
//
// Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
// Date: 2026-08-24
// Description: Hard navigation helper for post-authentication transitions
//

/**
 * Full-document navigation used after a security state change (login
 * completed, MFA completed, consent decision applied, logout).
 *
 * A hard navigation is deliberate: every one of these transitions
 * invalidates SSR-rendered identity state (login-context destinations,
 * consent resolutions, current user), so the next page must re-run its
 * server-side resolution instead of reusing a stale payload. The helper is
 * split out so component tests can stub the side effect.
 */
export function hardNavigate(url: string): void {
  window.location.assign(url);
}

/**
 * Computes the post-login continuation target. Mirrors the frozen
 * `credential-panel.tsx` contract: an opaque authorization transaction ID
 * resumes at /authorize; otherwise the account center is the destination.
 * Never accepts a raw returnTo URL.
 */
export function loginDestination(resumeRequestId?: string): string {
  if (resumeRequestId) {
    return `/authorize?requestId=${encodeURIComponent(resumeRequestId)}`;
  }
  return "/account";
}
