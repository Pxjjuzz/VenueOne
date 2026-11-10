import "server-only";

import { dbQuery } from "@/lib/db";
import type { LegalPageRow } from "@/lib/types";

export async function getLegalPage(slug: string): Promise<LegalPageRow | null> {
  const rows = await dbQuery<LegalPageRow>("select * from legal_pages where slug = $1", [slug]);
  return rows[0] ?? null;
}

export async function listLegalPages(): Promise<LegalPageRow[]> {
  return dbQuery<LegalPageRow>("select * from legal_pages order by slug");
}
