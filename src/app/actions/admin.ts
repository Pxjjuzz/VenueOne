"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/session";
import { limitByUser } from "@/lib/rate-limit";
import {
  decideOwnerRequest,
  decideVenuePublication,
  saveLegalPage,
  savePlatformSettings,
  setContactMessageStatus,
} from "@/lib/admin/service";
import { reviewCancellation } from "@/lib/booking/cancellation";
import { processRefund, syncRazorpayPayment } from "@/lib/payments/service";
import { legalPageSchema, settingsSchema } from "@/lib/validation";

export type AdminActionState = {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string[]>;
};

function text(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function checked(formData: FormData, key: string): boolean {
  return formData.get(key) === "on" || formData.get(key) === "true";
}

async function adminSession() {
  try {
    const user = await requireAdmin();
    return { error: null as string | null, user };
  } catch {
    return { error: "Administrator access is required for this action.", user: null };
  }
}

export async function venuePublicationDecisionAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const session = await adminSession();
  if (!session.user) return { error: session.error };

  const venueId = text(formData, "venueId");
  const decision = text(formData, "decision");
  const note = text(formData, "note");
  if (!z.string().uuid().safeParse(venueId).success) {
    return { error: "This venue could not be found." };
  }
  if (!["approve", "changes", "unpublish", "suspend"].includes(decision)) {
    return { error: "Choose a valid publication decision." };
  }

  const rate = await limitByUser("admin-venue-decision", session.user.id, 120, 3600);
  if (!rate.ok) return { error: "Too many decisions. Wait a few minutes." };

  const result = await decideVenuePublication({
    venueId,
    adminId: session.user.id,
    adminEmail: session.user.email,
    decision: decision as "approve" | "changes" | "unpublish" | "suspend",
    note: note.slice(0, 1000),
  });
  if (!result.ok) return { error: result.error };

  revalidatePath("/admin");
  revalidatePath("/admin/venues");
  revalidatePath(`/admin/venues/${venueId}`);
  revalidatePath("/owner");
  revalidatePath("/owner/venues");
  revalidatePath(`/owner/venues/${venueId}`);
  return { success: result.message };
}

export async function ownerRequestDecisionAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const session = await adminSession();
  if (!session.user) return { error: session.error };

  const requestId = text(formData, "requestId");
  const decision = text(formData, "decision");
  const note = text(formData, "note");
  if (!z.string().uuid().safeParse(requestId).success) {
    return { error: "This application could not be found." };
  }
  if (decision !== "approve" && decision !== "reject") {
    return { error: "Choose a valid decision." };
  }

  const rate = await limitByUser("admin-owner-decision", session.user.id, 120, 3600);
  if (!rate.ok) return { error: "Too many decisions. Wait a few minutes." };

  const result = await decideOwnerRequest({
    requestId,
    adminId: session.user.id,
    adminEmail: session.user.email,
    decision,
    note: note.slice(0, 1000),
  });
  if (!result.ok) return { error: result.error };

  revalidatePath("/admin");
  revalidatePath("/admin/owners");
  revalidatePath("/owner/status");
  return { success: result.message };
}

export async function cancellationDecisionAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const session = await adminSession();
  if (!session.user) return { error: session.error };

  const cancellationId = text(formData, "cancellationId");
  const decision = text(formData, "decision");
  const note = text(formData, "note");
  if (!z.string().uuid().safeParse(cancellationId).success) {
    return { error: "This cancellation could not be found." };
  }
  if (decision !== "approve" && decision !== "reject") {
    return { error: "Choose a valid decision." };
  }

  const rate = await limitByUser("admin-cancellation-decision", session.user.id, 120, 3600);
  if (!rate.ok) return { error: "Too many decisions. Wait a few minutes." };

  const result = await reviewCancellation({
    cancellationId,
    adminId: session.user.id,
    adminEmail: session.user.email,
    decision,
    note: note.slice(0, 1000),
  });
  if (!result.ok) return { error: result.error };

  revalidatePath("/admin/cancellations");
  revalidatePath("/admin/refunds");
  revalidatePath("/admin/bookings");
  return { success: result.message };
}

export async function processRefundAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const session = await adminSession();
  if (!session.user) return { error: session.error };

  const refundId = text(formData, "refundId");
  if (!z.string().uuid().safeParse(refundId).success) {
    return { error: "This refund could not be found." };
  }

  const rate = await limitByUser("admin-refund", session.user.id, 60, 3600);
  if (!rate.ok) return { error: "Too many refund attempts. Wait a few minutes." };

  const result = await processRefund({
    refundId,
    adminId: session.user.id,
    adminEmail: session.user.email,
  });
  if (!result.ok) return { error: result.error };

  revalidatePath("/admin/refunds");
  revalidatePath("/admin/payments");
  return { success: result.message };
}

export async function syncPaymentAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const session = await adminSession();
  if (!session.user) return { error: session.error };

  const bookingId = text(formData, "bookingId");
  if (!z.string().uuid().safeParse(bookingId).success) {
    return { error: "This booking could not be found." };
  }

  const rate = await limitByUser("admin-payment-sync", session.user.id, 30, 3600);
  if (!rate.ok) return { error: "Too many sync attempts. Wait a little." };

  const result = await syncRazorpayPayment({
    bookingId,
    adminId: session.user.id,
    adminEmail: session.user.email,
  });
  if (!result.ok) return { error: result.error };

  revalidatePath("/admin/payments");
  revalidatePath(`/admin/bookings/${bookingId}`);
  return { success: result.message };
}

export async function settingsAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const session = await adminSession();
  if (!session.user) return { error: session.error };

  const parsed = settingsSchema.safeParse({
    ownerResponseHours: text(formData, "ownerResponseHours"),
    platformFeeRupees: text(formData, "platformFeeRupees") || "0",
    taxPercent: text(formData, "taxPercent") || "0",
    cancellationPolicy: {
      cancellationDeadlineHours: text(formData, "cancellationDeadlineHours") || "0",
      fullRefundHours: text(formData, "fullRefundHours") || "1",
      partialRefundHours: text(formData, "partialRefundHours") || "0",
      partialRefundPercent: text(formData, "partialRefundPercent") || "0",
      notes: text(formData, "notes"),
    },
  });

  if (!parsed.success) {
    return {
      error: "Check the highlighted settings.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const result = await savePlatformSettings({
    adminId: session.user.id,
    adminEmail: session.user.email,
    settings: {
      ownerResponseHours: parsed.data.ownerResponseHours,
      platformFeePaise: Math.round(parsed.data.platformFeeRupees * 100),
      taxPercent: parsed.data.taxPercent,
      cancellationPolicy: parsed.data.cancellationPolicy,
    },
  });
  if (!result.ok) return { error: result.error };

  revalidatePath("/admin/settings");
  revalidatePath("/refund-policy");
  return { success: result.message };
}

export async function legalPageAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const session = await adminSession();
  if (!session.user) return { error: session.error };

  const parsed = legalPageSchema.safeParse({
    slug: text(formData, "slug"),
    title: text(formData, "title"),
    contentMd: text(formData, "contentMd"),
    requiresLegalReview: checked(formData, "requiresLegalReview"),
  });
  if (!parsed.success) {
    return {
      error: "Check the legal page fields.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const result = await saveLegalPage({
    adminId: session.user.id,
    adminEmail: session.user.email,
    slug: parsed.data.slug,
    title: parsed.data.title,
    contentMd: parsed.data.contentMd,
    requiresLegalReview: parsed.data.requiresLegalReview,
  });
  if (!result.ok) return { error: result.error };

  revalidatePath("/admin/legal");
  revalidatePath(`/${parsed.data.slug}`);
  return { success: result.message };
}

export async function contactMessageStatusAction(
  _previous: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const session = await adminSession();
  if (!session.user) return { error: session.error };

  const messageId = text(formData, "messageId");
  const status = text(formData, "status");
  if (!z.string().uuid().safeParse(messageId).success) {
    return { error: "This message could not be found." };
  }
  if (!["new", "read", "replied"].includes(status)) {
    return { error: "Choose a valid message status." };
  }

  const result = await setContactMessageStatus({
    messageId,
    adminId: session.user.id,
    adminEmail: session.user.email,
    status: status as "new" | "read" | "replied",
  });
  if (!result.ok) return { error: result.error };

  revalidatePath("/admin/messages");
  return { success: result.message };
}
