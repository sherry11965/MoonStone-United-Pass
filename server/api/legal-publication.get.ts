//
// Copyright (c) 2026 Chen Jiajie(Ariakage)
//
// Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
// Date: 2026-08-24
// Description: Internal SSR endpoint exposing the verified legal-publication state
//

import {
  legalManifest,
  type LegalDocumentKind,
  type PublicLegalPublication,
} from "@/features/legal/data/legal-manifest";
import { getLegalPublication, legalEffectiveDate } from "@/server/queries/legal-queries";

export type LegalPublicationResponse = {
  publication: PublicLegalPublication | null;
  effectiveDate: string;
};

/**
 * Bridges the app pages (tsconfig app project) and the server query layer
 * (tsconfig server project): pages fetch this same-origin endpoint through
 * `useAsyncData`, so the Phase 8 manifest verification always runs on the
 * server and the client bundle never carries the backend base URL.
 */
export default defineEventHandler(async (event): Promise<LegalPublicationResponse> => {
  const kind = getQuery(event).kind;
  if (!isLegalDocumentKind(kind)) {
    throw createError({ statusCode: 400, statusMessage: "Invalid legal document kind" });
  }
  const publication = await getLegalPublication(kind);
  return { publication, effectiveDate: legalEffectiveDate(publication) };
});

function isLegalDocumentKind(value: unknown): value is LegalDocumentKind {
  return typeof value === "string" && value in legalManifest;
}
