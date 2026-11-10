import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LegalDocument } from "@/components/legal-document";
import { getLegalPage } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How this platform collects, uses and protects personal information.",
};

export const dynamic = "force-dynamic";

export default async function PrivacyPage() {
  const page = await getLegalPage("privacy");
  if (!page) notFound();
  return <LegalDocument page={page} />;
}
