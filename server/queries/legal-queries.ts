//
// Copyright (c) 2026 Chen Jiajie(Ariakage)
//
// Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
// Date: 2026-08-24
// Description: Public legal-publication status query with manifest verification
//

import {
  legalManifest,
  type LegalDocumentKind,
  type PublicLegalPublication,
} from "@/features/legal/data/legal-manifest";
import { serverFetch } from "@/server/utils/api-fetch";

/**
 * Server-side legal-publication read (legacy `src/lib/api/server/legal-queries.ts`).
 *
 * The controlled-publication contract (api-contracts.md, `/privacy` & `/terms`
 * row): the backend exposes the approved publication records without any
 * approval-reference/approver fields, and the frontend only displays an
 * effective date when BOTH the version and the content SHA-256 match the
 * immutable Phase 8 release manifest. Any mismatch, transport failure or
 * malformed shape degrades to `null` ("not yet effective"), never an error.
 */
export async function getLegalPublication(
  kind: LegalDocumentKind,
): Promise<PublicLegalPublication | null> {
  try {
    const value = await serverFetch<unknown>("/legal-documents");
    if (!isRecord(value) || !Array.isArray(value.items)) return null;
    const publication = value.items.find((item) => isRecord(item) && item.documentKind === kind);
    if (!isRecord(publication)) return null;
    const manifest = legalManifest[kind];
    if (
      publication.version !== manifest.version ||
      publication.contentSha256 !== manifest.contentSha256 ||
      (publication.status !== "scheduled" && publication.status !== "effective") ||
      typeof publication.effectiveAt !== "string" ||
      typeof publication.publishedAt !== "string"
    ) {
      return null;
    }
    return {
      documentKind: kind,
      version: manifest.version,
      contentSha256: manifest.contentSha256,
      effectiveAt: publication.effectiveAt,
      publishedAt: publication.publishedAt,
      status: publication.status,
    };
  } catch {
    return null;
  }
}

export function legalEffectiveDate(publication: PublicLegalPublication | null): string {
  if (publication === null) return "暂未生效（等待法务批准与受控发布）";
  const formatted = new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Shanghai",
  }).format(new Date(publication.effectiveAt));
  return publication.status === "effective" ? formatted : `计划于 ${formatted} 生效`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
