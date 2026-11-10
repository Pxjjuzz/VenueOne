"use server";

import { revalidatePath } from "next/cache";
import { dbQuery } from "@/lib/db";
import { limitByIp, limitByUser } from "@/lib/rate-limit";
import { contactSchema, ownerRequestSchema } from "@/lib/validation";
import { getSessionUser } from "@/lib/auth/session";
import { notifyAdmins } from "@/lib/notifications";
import { recordAudit } from "@/lib/audit";
import { getOwnerRequestForUser } from "@/lib/venues/queries";
import type { OwnerRequestRow, ProfileRow } from "@/lib/types";

export type SupportActionState = {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string[]>;
};

function text(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

export async function contactAction(
  _previous: SupportActionState,
  formData: FormData,
): Promise<SupportActionState> {
  const rate = await limitByIp("contact", 6, 3600);
  if (!rate.ok) {
    return { error: "Too many messages from this connection. Try again later." };
  }

  const parsed = contactSchema.safeParse({
    name: text(formData, "name"),
    email: text(formData, "email"),
    subject: text(formData, "subject"),
    message: text(formData, "message"),
  });
  if (!parsed.success) {
    return {
      error: "Check the form details and try again.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  await dbQuery(
    `insert into contact_messages (name, email, subject, message)
     values ($1, $2, $3, $4)`,
    [parsed.data.name, parsed.data.email, parsed.data.subject, parsed.data.message],
  );

  await notifyAdmins({
    type: "contact.message",
    title: `Contact message: ${parsed.data.subject}`,
    body: `${parsed.data.name} (${parsed.data.email}) sent a message through the contact form.`,
    link: "/admin/messages",
    email: true,
  });

  await recordAudit({
    actorEmail: parsed.data.email,
    action: "contact.message.created",
    entityType: "contact_message",
    metadata: { subject: parsed.data.subject },
  });

  return {
    success:
      "Message received. The platform team will review it and reply to the email address you provided.",
  };
}

export async function submitOwnerRequestAction(
  _previous: SupportActionState,
  formData: FormData,
): Promise<SupportActionState> {
  const user = await getSessionUser();
  if (!user) {
    return { error: "Sign in first so the request can be linked to your account." };
  }
  if (user.isSuspended) {
    return { error: "This account cannot submit an owner request." };
  }
  if (user.ownerStatus === "approved") {
    return { error: "This account already has approved venue-owner access." };
  }
  if (user.ownerStatus === "suspended") {
    return { error: "Owner access for this account is suspended. Contact support." };
  }

  const rate = await limitByUser("owner-request", user.id, 4, 86_400);
  if (!rate.ok) {
    return { error: "Too many owner requests. Contact support if you need help." };
  }

  const existing = await getOwnerRequestForUser(user.id);
  if (existing?.status === "pending") {
    return { error: "An owner access request is already awaiting review." };
  }

  const parsed = ownerRequestSchema.safeParse({
    businessName: text(formData, "businessName"),
    contactPhone: text(formData, "contactPhone"),
    address: text(formData, "address"),
    city: text(formData, "city"),
    state: text(formData, "state"),
    pincode: text(formData, "pincode"),
    ownershipNotes: text(formData, "ownershipNotes"),
  });
  if (!parsed.success) {
    return {
      error: "Check the application details and try again.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const inserted = await dbQuery<OwnerRequestRow>(
    `insert into owner_requests (
       user_id, business_name, contact_phone, address, city, state, pincode, ownership_notes
     ) values ($1, $2, $3, $4, $5, $6, $7, $8)
     returning *`,
    [
      user.id,
      parsed.data.businessName,
      parsed.data.contactPhone,
      parsed.data.address,
      parsed.data.city,
      parsed.data.state,
      parsed.data.pincode,
      parsed.data.ownershipNotes || null,
    ],
  );

  await dbQuery<ProfileRow>(
    `update profiles set owner_status = 'pending', updated_at = now() where id = $1 returning *`,
    [user.id],
  );

  await notifyAdmins({
    type: "owner.request",
    title: "New venue-owner access request",
    body: `${parsed.data.businessName} (${user.email}) requested owner access in ${parsed.data.city}.`,
    link: "/admin/owners",
    email: true,
  });

  await recordAudit({
    actorId: user.id,
    actorEmail: user.email,
    action: "owner.request.submitted",
    entityType: "owner_request",
    entityId: inserted[0]?.id,
    metadata: { businessName: parsed.data.businessName, city: parsed.data.city },
  });

  revalidatePath("/list-your-venue");
  revalidatePath("/owner/status");

  return {
    success:
      "Application submitted. Owner access is reviewed separately from venue publication. You will see the decision in this workspace.",
  };
}
