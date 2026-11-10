import "server-only";

import { dbQuery, withTransaction } from "@/lib/db";
import { recordAudit } from "@/lib/audit";
import { notifyUser } from "@/lib/notifications";
import { getPlatformSettings, type PlatformSettings } from "@/lib/settings";
import type { VenuePricingRow, VenueStatus } from "@/lib/types";

export type AdminMutationResult =
  | { ok: true; message: string; status?: string }
  | { ok: false; error: string };

async function assertAdmin(adminId: string): Promise<string | null> {
  const rows = await dbQuery<{ role: string; is_suspended: boolean }>(
    "select role, is_suspended from profiles where id = $1",
    [adminId],
  );
  const admin = rows[0];
  if (!admin || admin.role !== "admin" || admin.is_suspended) {
    return "Administrator access is required for this action.";
  }
  return null;
}

export async function decideVenuePublication(input: {
  venueId: string;
  adminId: string;
  adminEmail: string;
  decision: "approve" | "changes" | "unpublish" | "suspend";
  note: string;
}): Promise<AdminMutationResult> {
  const denied = await assertAdmin(input.adminId);
  if (denied) return { ok: false, error: denied };

  const rows = await dbQuery<{
    id: string;
    name: string;
    status: VenueStatus;
    category: "hall" | "ground";
    owner_id: string | null;
  }>("select id, name, status, category, owner_id from venues where id = $1", [input.venueId]);
  const venue = rows[0];
  if (!venue) return { ok: false, error: "This venue could not be found." };

  if (input.decision !== "approve" && input.note.trim().length < 5) {
    return { ok: false, error: "Add a short reason for the decision." };
  }

  const approvedFrom: VenueStatus[] = ["submitted", "under_review", "unpublished", "suspended"];
  if (input.decision === "approve" && !approvedFrom.includes(venue.status)) {
    return {
      ok: false,
      error:
        venue.status === "approved"
          ? "This venue is already published."
          : "This venue is not in the publication queue. The owner must submit it again.",
    };
  }
  if (input.decision === "unpublish" && venue.status !== "approved") {
    return { ok: false, error: "Only a published venue can be unpublished." };
  }
  if (input.decision === "changes" && !["submitted", "under_review", "approved"].includes(venue.status)) {
    return { ok: false, error: "This venue is not awaiting a publication decision." };
  }
  if (input.decision === "suspend" && venue.status === "suspended") {
    return { ok: false, error: "This venue is already suspended." };
  }

  let nextStatus: VenueStatus;
  let note: string;
  switch (input.decision) {
    case "approve":
      nextStatus = "approved";
      note = input.note || "Approved for publication.";
      break;
    case "changes":
      nextStatus = venue.status === "approved" ? "unpublished" : "rejected";
      note = input.note;
      break;
    case "unpublish":
      nextStatus = "unpublished";
      note = input.note;
      break;
    default:
      nextStatus = "suspended";
      note = input.note;
  }

  if (input.decision === "approve") {
    const pricing = await dbQuery<VenuePricingRow>(
      "select * from venue_pricing where venue_id = $1",
      [venue.id],
    );
    const required = venue.category === "hall" ? ["half_day", "full_day"] : ["hour"];
    for (const slot of required) {
      const row = pricing.find((item) => item.slot === slot);
      if (!row?.proposed_amount_paise && !row?.amount_paise) {
        return {
          ok: false,
          error: `Approved pricing for ${slot.replace("_", " ")} is missing. Ask the owner to add it.`,
        };
      }
    }
  }

  await withTransaction(async (sql) => {
    if (input.decision === "approve") {
      await sql(
        `update venue_pricing
         set amount_paise = coalesce(proposed_amount_paise, amount_paise),
             approved_by = $2, approved_at = now()
         where venue_id = $1 and proposed_amount_paise is not null`,
        [venue.id, input.adminId],
      );
    }

    await sql(
      `update venues set
         status = $2,
         rejection_reason = $3,
         reviewed_by = $4,
         reviewed_at = now(),
         published_at = case when $2 = 'approved' then coalesce(published_at, now()) else published_at end,
         updated_at = now()
       where id = $1`,
      [
        venue.id,
        nextStatus,
        input.decision === "approve" ? null : input.note,
        input.adminId,
      ],
    );

    await sql(
      `insert into venue_reviews (venue_id, actor_id, from_status, to_status, note)
       values ($1, $2, $3, $4, $5)`,
      [venue.id, input.adminId, venue.status, nextStatus, note],
    );
  });

  if (venue.owner_id) {
    const messages: Record<typeof input.decision, { title: string; body: string }> = {
      approve: {
        title: `${venue.name} is now published`,
        body: "The venue passed publication review and appears in the public directory.",
      },
      changes: {
        title: `Changes requested for ${venue.name}`,
        body: `A reviewer needs changes before publication: ${input.note}`,
      },
      unpublish: {
        title: `${venue.name} was unpublished`,
        body: `The venue is no longer public. Reason: ${input.note}`,
      },
      suspend: {
        title: `${venue.name} was suspended`,
        body: `The venue has been suspended. Reason: ${input.note}`,
      },
    };
    await notifyUser(venue.owner_id, {
      type: `venue.${input.decision}`,
      title: messages[input.decision].title,
      body: messages[input.decision].body,
      link: `/owner/venues/${venue.id}`,
      email: true,
    });
  }

  await recordAudit({
    actorId: input.adminId,
    actorEmail: input.adminEmail,
    action: `venue.publication.${input.decision}`,
    entityType: "venue",
    entityId: venue.id,
    metadata: { fromStatus: venue.status, toStatus: nextStatus, note: input.note },
  });

  const success: Record<typeof input.decision, string> = {
    approve: "Venue approved and published.",
    changes: "Changes requested. The venue is no longer public until it is resubmitted and approved.",
    unpublish: "Venue unpublished. It is no longer visible in the public directory.",
    suspend: "Venue suspended.",
  };
  return { ok: true, message: success[input.decision], status: nextStatus };
}

export async function decideOwnerRequest(input: {
  requestId: string;
  adminId: string;
  adminEmail: string;
  decision: "approve" | "reject";
  note: string;
}): Promise<AdminMutationResult> {
  const denied = await assertAdmin(input.adminId);
  if (denied) return { ok: false, error: denied };
  if (input.decision === "reject" && input.note.trim().length < 5) {
    return { ok: false, error: "Add a short reason for rejecting the application." };
  }

  const rows = await dbQuery<{
    id: string;
    user_id: string;
    status: string;
    business_name: string;
    owner_status: string;
  }>(
    `select r.id, r.user_id, r.status, r.business_name, p.owner_status
     from owner_requests r join profiles p on p.id = r.user_id
     where r.id = $1`,
    [input.requestId],
  );
  const request = rows[0];
  if (!request) return { ok: false, error: "This application could not be found." };
  if (request.status !== "pending") {
    return { ok: false, error: "This application has already been reviewed." };
  }

  await withTransaction(async (sql) => {
    await sql(
      `update owner_requests
       set status = $2, rejection_reason = $3, reviewed_by = $4, reviewed_at = now(), updated_at = now()
       where id = $1`,
      [
        request.id,
        input.decision === "approve" ? "approved" : "rejected",
        input.decision === "approve" ? null : input.note,
        input.adminId,
      ],
    );

    if (input.decision === "approve") {
      await sql(
        `update profiles set role = 'owner', owner_status = 'approved', updated_at = now() where id = $1`,
        [request.user_id],
      );
    } else if (request.owner_status !== "approved") {
      await sql(
        `update profiles set owner_status = 'rejected', updated_at = now() where id = $1`,
        [request.user_id],
      );
    }
  });

  await notifyUser(request.user_id, {
    type: input.decision === "approve" ? "owner.approved" : "owner.rejected",
    title:
      input.decision === "approve"
        ? "Venue-owner access approved"
        : "Venue-owner application not approved",
    body:
      input.decision === "approve"
        ? "Owner access is unlocked. Create a venue draft and submit it for publication review when it is ready."
        : input.note
          ? `Your application was not approved: ${input.note}`
          : "Your application was not approved. You can submit a corrected application.",
    link: input.decision === "approve" ? "/owner" : "/owner/status",
    email: true,
  });

  await recordAudit({
    actorId: input.adminId,
    actorEmail: input.adminEmail,
    action: `owner_request.${input.decision}`,
    entityType: "owner_request",
    entityId: request.id,
    metadata: { userId: request.user_id, businessName: request.business_name, note: input.note },
  });

  return {
    ok: true,
    message:
      input.decision === "approve"
        ? "Owner access approved. The applicant can now create venue drafts."
        : "Application rejected. The applicant can submit a corrected application.",
    status: input.decision === "approve" ? "approved" : "rejected",
  };
}

export async function savePlatformSettings(input: {
  adminId: string;
  adminEmail: string;
  settings: PlatformSettings;
}): Promise<AdminMutationResult> {
  const denied = await assertAdmin(input.adminId);
  if (denied) return { ok: false, error: denied };

  const { settings } = input;
  await withTransaction(async (sql) => {
    const entries: [string, unknown][] = [
      ["owner_response_hours", settings.ownerResponseHours],
      ["platform_fee_paise", settings.platformFeePaise],
      ["tax_percent", settings.taxPercent],
      ["cancellation_policy", settings.cancellationPolicy],
    ];
    for (const [key, value] of entries) {
      await sql(
        `insert into platform_settings (key, value, updated_by, updated_at)
         values ($1, $2::jsonb, $3, now())
         on conflict (key) do update
         set value = excluded.value, updated_by = excluded.updated_by, updated_at = now()`,
        [key, JSON.stringify(value), input.adminId],
      );
    }
  });

  await recordAudit({
    actorId: input.adminId,
    actorEmail: input.adminEmail,
    action: "settings.updated",
    entityType: "platform_settings",
    metadata: {
      ownerResponseHours: settings.ownerResponseHours,
      platformFeePaise: settings.platformFeePaise,
      taxPercent: settings.taxPercent,
      cancellationPolicy: settings.cancellationPolicy,
    },
  });

  return {
    ok: true,
    message: "Settings saved. New bookings will use these values; existing bookings keep their snapshots.",
  };
}

export async function saveLegalPage(input: {
  adminId: string;
  adminEmail: string;
  slug: string;
  title: string;
  contentMd: string;
  requiresLegalReview: boolean;
}): Promise<AdminMutationResult> {
  const denied = await assertAdmin(input.adminId);
  if (denied) return { ok: false, error: denied };

  const existing = await dbQuery<{ slug: string }>("select slug from legal_pages where slug = $1", [
    input.slug,
  ]);
  if (!existing[0]) return { ok: false, error: "This legal page could not be found." };

  await dbQuery(
    `update legal_pages
     set title = $2, content_md = $3, requires_legal_review = $4,
         updated_by = $5, updated_at = now()
     where slug = $1`,
    [input.slug, input.title, input.contentMd, input.requiresLegalReview, input.adminId],
  );

  await recordAudit({
    actorId: input.adminId,
    actorEmail: input.adminEmail,
    action: "legal_page.updated",
    entityType: "legal_page",
    entityId: input.slug,
    metadata: { title: input.title, requiresLegalReview: input.requiresLegalReview },
  });

  return { ok: true, message: "Legal page saved." };
}

export type ContactMessageRow = {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: "new" | "read" | "replied";
  created_at: Date;
};

export async function listContactMessages(
  status = "all",
): Promise<ContactMessageRow[]> {
  const params: string[] = [];
  let clause = "1 = 1";
  if (status !== "all") {
    params.push(status);
    clause = `status = $1`;
  }
  return dbQuery<ContactMessageRow>(
    `select * from contact_messages where ${clause} order by created_at desc limit 200`,
    params,
  );
}

export async function setContactMessageStatus(input: {
  messageId: string;
  adminId: string;
  adminEmail: string;
  status: "new" | "read" | "replied";
}): Promise<AdminMutationResult> {
  const denied = await assertAdmin(input.adminId);
  if (denied) return { ok: false, error: denied };

  const updated = await dbQuery<{ id: string }>(
    "update contact_messages set status = $2 where id = $1 returning id",
    [input.messageId, input.status],
  );
  if (!updated[0]) return { ok: false, error: "This message could not be found." };

  await recordAudit({
    actorId: input.adminId,
    actorEmail: input.adminEmail,
    action: "contact_message.status",
    entityType: "contact_message",
    entityId: input.messageId,
    metadata: { status: input.status },
  });

  return {
    ok: true,
    message:
      input.status === "replied"
        ? "Marked as replied."
        : input.status === "read"
          ? "Marked as read."
          : "Marked as new.",
  };
}

export async function getAdminOverview() {
  const [venues, owners, bookings, cancellations, refunds, messages, revenue, audit] =
    await Promise.all([
      dbQuery<{ status: string; count: number }>(
        "select status, count(*)::int as count from venues group by status",
      ),
      dbQuery<{ count: number }>(
        "select count(*)::int as count from owner_requests where status = 'pending'",
      ),
      dbQuery<{ status: string; count: number }>(
        "select status, count(*)::int as count from bookings group by status",
      ),
      dbQuery<{ count: number }>(
        "select count(*)::int as count from cancellations where status = 'requested'",
      ),
      dbQuery<{ count: number }>(
        "select count(*)::int as count from refunds where status in ('pending', 'failed')",
      ),
      dbQuery<{ count: number }>(
        "select count(*)::int as count from contact_messages where status = 'new'",
      ),
      dbQuery<{ total: number }>(
        `select coalesce(sum(amount_paise), 0)::int as total
         from payments where status = 'captured'`,
      ),
      dbQuery<{
        id: number;
        action: string;
        entity_type: string;
        entity_id: string | null;
        actor_email: string | null;
        created_at: Date;
      }>(
        `select id, action, entity_type, entity_id, actor_email, created_at
         from audit_logs order by created_at desc limit 8`,
      ),
    ]);

  const venueMap = new Map(venues.map((row) => [row.status, row.count]));
  const bookingMap = new Map(bookings.map((row) => [row.status, row.count]));

  return {
    venuesInReview: (venueMap.get("submitted") ?? 0) + (venueMap.get("under_review") ?? 0),
    venuesPublished: venueMap.get("approved") ?? 0,
    ownerRequests: owners[0]?.count ?? 0,
    pendingBookings: bookingMap.get("pending_owner_approval") ?? 0,
    confirmedBookings: bookingMap.get("confirmed") ?? 0,
    cancellations: cancellations[0]?.count ?? 0,
    refunds: refunds[0]?.count ?? 0,
    messages: messages[0]?.count ?? 0,
    capturedRevenuePaise: revenue[0]?.total ?? 0,
    recentAudit: audit,
  };
}

export async function listAuditLogs(limit = 100) {
  return dbQuery<{
    id: number;
    actor_id: string | null;
    actor_email: string | null;
    action: string;
    entity_type: string;
    entity_id: string | null;
    metadata: Record<string, unknown>;
    ip: string | null;
    created_at: Date;
  }>(
    `select id, actor_id, actor_email, action, entity_type, entity_id, metadata, ip, created_at
     from audit_logs order by created_at desc limit $1`,
    [limit],
  );
}

export async function currentPlatformSettings(): Promise<PlatformSettings> {
  return getPlatformSettings();
}
