//
// Copyright (c) 2026 Chen Jiajie(Ariakage)
//
// Author: Chen Jiajie(Ariakage) <ariakage233@gmail.com>
// Date: 2026-08-24
// Description: Legal document content shape contracts shared by data and renderer
//

/**
 * Structural contracts of the immutable legal-document content tree.
 *
 * The frozen Phase 8 data modules (`features/legal/data/*`) import these
 * types through this module path, so the path itself is a contract: the
 * renderer SFC (`LegalDocument.vue`) consumes the same shapes.
 */

export type LegalTable = {
  headers: string[];
  rows: string[][];
};

export type LegalNote = {
  tone: "info" | "warning";
  text: string;
};

export type LegalSubsection = {
  id?: string;
  title?: string;
  paragraphs?: string[];
  items?: string[];
  tables?: LegalTable[];
  notes?: LegalNote[];
  subsections?: LegalSubsection[];
};

export type LegalSection = LegalSubsection & {
  id: string;
  title: string;
};
