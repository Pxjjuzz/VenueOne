import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LegalDocument } from "@/components/legal-document";
import { getLegalPage } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Terms and Conditions",
  description: "The terms that govern the use of this booking platform.",
};

export const dynamic = "force-dynamic";

export default async function TermsPage() {
  const page = await getLegalPage("terms");
  if (!page) notFound();
  return <LegalDocument page={page} />;
}
