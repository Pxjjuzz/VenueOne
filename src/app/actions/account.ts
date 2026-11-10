"use server";

import { revalidatePath } from "next/cache";
import { dbQuery } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/session";
import { recordAudit } from "@/lib/audit";
import { markAllNotificationsRead } from "@/lib/notifications";
import { limitByUser } from "@/lib/rate-limit";
import { profileSchema } from "@/lib/validation";

export type AccountActionState = {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string[]>;
};

export async function updateProfileAction(
  _previous: AccountActionState,
  formData: FormData,
): Promise<AccountActionState> {
  const user = await getSessionUser();
  if (!user) return { error: "Your session has ended. Sign in again." };

  const parsed = profileSchema.safeParse({
    fullName: String(formData.get("fullName") ?? "").trim(),
    phone: String(formData.get("phone") ?? "").trim(),
  });
  if (!parsed.success) {
    return {
      error: "Check the profile details.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  await dbQuery(
    `update profiles set full_name = $2, phone = $3, updated_at = now() where id = $1`,
    [user.id, parsed.data.fullName, parsed.data.phone || null],
  );

  await recordAudit({
    actorId: user.id,
    actorEmail: user.email,
    action: "profile.updated",
    entityType: "profile",
    entityId: user.id,
    metadata: { fields: ["full_name", "phone"] },
  });

  revalidatePath("/dashboard/profile");
  return { success: "Profile updated." };
}

export async function markNotificationsReadAction(): Promise<void> {
  const user = await getSessionUser();
  if (!user) return;
  await markAllNotificationsRead(user.id);
  revalidatePath("/dashboard/notifications");
  revalidatePath("/dashboard");
}

export async function requestAccountDeletionAction(
  _previous: AccountActionState,
  _formData: FormData,
): Promise<AccountActionState> {
  const user = await getSessionUser();
  if (!user) return { error: "Your session has ended. Sign in again." };
  if (user.role === "admin") {
    return { error: "Administrator accounts cannot be deleted from this interface." };
  }

  const rate = await limitByUser("account-deletion", user.id, 2, 86_400);
  if (!rate.ok) return { error: "Too many requests. Try again later." };

  await dbQuery(
    `insert into contact_messages (name, email, subject, message)
     values ($1, $2, $3, $4)`,
    [
      user.fullName || "Account holder",
      user.email,
      "Account deletion request",
      "The account holder requested deletion through the profile page. Review bookings, payments and legal retention obligations before acting.",
    ],
  );

  await recordAudit({
    actorId: user.id,
    actorEmail: user.email,
    action: "account.deletion_requested",
    entityType: "profile",
    entityId: user.id,
    metadata: {},
  });

  return {
    success:
      "Deletion request recorded for manual review. Records tied to payments or legal obligations may need to be retained.",
  };
}
