import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LegalDocument } from "@/components/legal-document";
import { getLegalPage } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Cancellation and Refund Policy",
  description: "How cancellation requests and refunds are handled.",
};

export const dynamic = "force-dynamic";

export default async function RefundPolicyPage() {
  const page = await getLegalPage("refund-policy");
  if (!page) notFound();
  return <LegalDocument page={page} />;
}
