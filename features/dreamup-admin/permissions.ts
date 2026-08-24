//
// Copyright (c) 2026 Chen Jiajie(Ariakage)
//
// Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
// Date: 2026-08-24
// Description: DreamUP administration access derivation
//

import type { DreamUPEventSummary } from "./types";

/**
 * Vue migration of the frozen `dreamup-admin/permissions.ts`.
 *
 * A signed-in user may enter the DreamUP administration surface when the
 * backend grants administration rights on at least one event. The backend
 * remains the authoritative enforcement point for every DreamUP API.
 */
export function hasDreamUPAdministrationAccess(events: readonly DreamUPEventSummary[]): boolean {
  return events.length > 0;
}
