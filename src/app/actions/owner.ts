"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import { limitByUser } from "@/lib/rate-limit";
import { venueFormSchema, blockSchema } from "@/lib/validation";
import {
  addVenuePhoto,
  createVenueBlock,
  createVenueDraft,
  deleteVenueBlock,
  deleteVenuePhoto,
  moveVenuePhoto,
  saveVenue,
  setVenueAcceptingBookings,
  submitVenueForReview,
} from "@/lib/venues/owner-service";
import { decideOwnerBooking } from "@/lib/booking/owner";

export type OwnerActionState = {
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

async function ownerSession() {
  const user = await getSessionUser();
  if (!user) return { error: "Your session has ended. Sign in again." as const, user: null };
  if (user.role !== "owner" || user.ownerStatus !== "approved") {
    return { error: "Approved venue-owner access is required." as const, user: null };
  }
  return { error: null, user };
}

export async function createVenueDraftAction(
  _previous: OwnerActionState,
  _formData: FormData,
): Promise<OwnerActionState> {
  const session = await ownerSession();
  if (!session.user) return { error: session.error };

  const result = await createVenueDraft(session.user.id);
  if (!result.ok) return { error: result.error };
  redirect(`/owner/venues/${result.venueId}`);
}

export async function saveVenueAction(
  _previous: OwnerActionState,
  formData: FormData,
): Promise<OwnerActionState> {
  const session = await ownerSession();
  if (!session.user) return { error: session.error };

  const rate = await limitByUser("venue-save", session.user.id, 60, 3600);
  if (!rate.ok) return { error: "Too many saves. Wait a few minutes and try again." };

  const venueId = text(formData, "venueId");
  if (!z.string().uuid().safeParse(venueId).success) {
    return { error: "This venue could not be found." };
  }

  const hours = Array.from({ length: 7 }, (_, weekday) => ({
    weekday,
    opensAt: text(formData, `hours-${weekday}-opens`) || "09:00",
    closesAt: text(formData, `hours-${weekday}-closes`) || "18:00",
    isClosed: checked(formData, `hours-${weekday}-closed`),
  }));

  const parsed = venueFormSchema.safeParse({
    name: text(formData, "name"),
    category: text(formData, "category"),
    description: text(formData, "description"),
    addressLine: text(formData, "addressLine"),
    city: text(formData, "city"),
    state: text(formData, "state"),
    pincode: text(formData, "pincode"),
    latitude: text(formData, "latitude"),
    longitude: text(formData, "longitude"),
    contactName: text(formData, "contactName"),
    contactPhone: text(formData, "contactPhone"),
    contactEmail: text(formData, "contactEmail"),
    capacity: text(formData, "capacity"),
    lengthM: text(formData, "lengthM"),
    widthM: text(formData, "widthM"),
    indoorOutdoor: text(formData, "indoorOutdoor") || undefined,
    rooms: text(formData, "rooms"),
    stage: checked(formData, "stage"),
    kitchen: checked(formData, "kitchen"),
    parking: checked(formData, "parking"),
    seatingCapacity: text(formData, "seatingCapacity"),
    groundType: text(formData, "groundType") || undefined,
    surfaceType: text(formData, "surfaceType") || undefined,
    sports: formData.getAll("sports").map(String),
    lighting: checked(formData, "lighting"),
    washrooms: checked(formData, "washrooms"),
    changingRooms: checked(formData, "changingRooms"),
    amenities: formData.getAll("amenities").map(String),
    otherAmenities: text(formData, "otherAmenities"),
    pricing: {
      halfDayRupees: text(formData, "halfDayRupees"),
      fullDayRupees: text(formData, "fullDayRupees"),
      hourRupees: text(formData, "hourRupees"),
    },
    hours,
    bookingPolicy: text(formData, "bookingPolicy") || "approval",
    paymentWindowMinutes: text(formData, "paymentWindowMinutes") || "20",
    acceptingBookings: checked(formData, "acceptingBookings"),
  });

  if (!parsed.success) {
    return {
      error: "Check the highlighted fields and try again.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const result = await saveVenue({
    venueId,
    ownerId: session.user.id,
    ownerEmail: session.user.email,
    data: parsed.data,
  });
  if (!result.ok) return { error: result.error };

  revalidatePath(`/owner/venues/${venueId}`);
  revalidatePath("/owner/venues");
  redirect(`/owner/venues/${venueId}?saved=1`);
}

export async function submitVenueAction(
  _previous: OwnerActionState,
  formData: FormData,
): Promise<OwnerActionState> {
  const session = await ownerSession();
  if (!session.user) return { error: session.error };
  const venueId = text(formData, "venueId");
  if (!z.string().uuid().safeParse(venueId).success) {
    return { error: "This venue could not be found." };
  }

  const result = await submitVenueForReview({
    venueId,
    ownerId: session.user.id,
    ownerEmail: session.user.email,
  });
  if (!result.ok) return { error: result.error };

  revalidatePath(`/owner/venues/${venueId}`);
  revalidatePath("/owner/venues");
  return { success: result.message };
}

export async function toggleAcceptingBookingsAction(formData: FormData): Promise<void> {
  const session = await ownerSession();
  if (!session.user) return;
  const venueId = text(formData, "venueId");
  if (!z.string().uuid().safeParse(venueId).success) return;

  await setVenueAcceptingBookings({
    venueId,
    ownerId: session.user.id,
    accepting: checked(formData, "accepting"),
  });
  revalidatePath(`/owner/venues/${venueId}`);
  revalidatePath("/owner/venues");
}

export async function uploadVenuePhotoAction(
  _previous: OwnerActionState,
  formData: FormData,
): Promise<OwnerActionState> {
  const session = await ownerSession();
  if (!session.user) return { error: session.error };
  const venueId = text(formData, "venueId");
  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a photograph to upload." };
  }
  if (!z.string().uuid().safeParse(venueId).success) {
    return { error: "This venue could not be found." };
  }

  const rate = await limitByUser("venue-photo-upload", session.user.id, 20, 3600);
  if (!rate.ok) return { error: "Too many uploads. Wait a little and try again." };

  const result = await addVenuePhoto({
    venueId,
    ownerId: session.user.id,
    file,
    altText: text(formData, "altText"),
  });
  if (!result.ok) return { error: result.error };

  revalidatePath(`/owner/venues/${venueId}`);
  return { success: result.message };
}

export async function removeVenuePhotoAction(
  _previous: OwnerActionState,
  formData: FormData,
): Promise<OwnerActionState> {
  const session = await ownerSession();
  if (!session.user) return { error: session.error };
  const venueId = text(formData, "venueId");
  const photoId = text(formData, "photoId");
  if (!z.string().uuid().safeParse(venueId).success || !z.string().uuid().safeParse(photoId).success) {
    return { error: "This photograph could not be found." };
  }

  const result = await deleteVenuePhoto({ venueId, ownerId: session.user.id, photoId });
  if (!result.ok) return { error: result.error };
  revalidatePath(`/owner/venues/${venueId}`);
  return { success: result.message };
}

export async function moveVenuePhotoAction(
  _previous: OwnerActionState,
  formData: FormData,
): Promise<OwnerActionState> {
  const session = await ownerSession();
  if (!session.user) return { error: session.error };
  const venueId = text(formData, "venueId");
  const photoId = text(formData, "photoId");
  const direction = text(formData, "direction") === "up" ? "up" : "down";
  if (!z.string().uuid().safeParse(venueId).success || !z.string().uuid().safeParse(photoId).success) {
    return { error: "This photograph could not be found." };
  }

  const result = await moveVenuePhoto({ venueId, ownerId: session.user.id, photoId, direction });
  if (!result.ok) return { error: result.error };
  revalidatePath(`/owner/venues/${venueId}`);
  return { success: result.message };
}

export async function createVenueBlockAction(
  _previous: OwnerActionState,
  formData: FormData,
): Promise<OwnerActionState> {
  const session = await ownerSession();
  if (!session.user) return { error: session.error };
  const venueId = text(formData, "venueId");
  const parsed = blockSchema.safeParse({
    venueId,
    startDate: text(formData, "startDate"),
    startTime: text(formData, "startTime"),
    endDate: text(formData, "endDate"),
    endTime: text(formData, "endTime"),
    reason: text(formData, "reason"),
  });
  if (!parsed.success) {
    return {
      error: "Check the block details.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const result = await createVenueBlock({
    venueId: parsed.data.venueId,
    ownerId: session.user.id,
    startDate: parsed.data.startDate,
    startTime: parsed.data.startTime,
    endDate: parsed.data.endDate,
    endTime: parsed.data.endTime,
    reason: parsed.data.reason,
  });
  if (!result.ok) return { error: result.error };

  revalidatePath(`/owner/venues/${venueId}`);
  return { success: result.message };
}

export async function deleteVenueBlockAction(
  _previous: OwnerActionState,
  formData: FormData,
): Promise<OwnerActionState> {
  const session = await ownerSession();
  if (!session.user) return { error: session.error };
  const venueId = text(formData, "venueId");
  const blockId = text(formData, "blockId");
  if (!z.string().uuid().safeParse(venueId).success || !z.string().uuid().safeParse(blockId).success) {
    return { error: "This block could not be found." };
  }

  const result = await deleteVenueBlock({ venueId, ownerId: session.user.id, blockId });
  if (!result.ok) return { error: result.error };
  revalidatePath(`/owner/venues/${venueId}`);
  return { success: result.message };
}

export async function ownerDecisionAction(
  _previous: OwnerActionState,
  formData: FormData,
): Promise<OwnerActionState> {
  const session = await ownerSession();
  if (!session.user) return { error: session.error };

  const bookingId = text(formData, "bookingId");
  const decision = text(formData, "decision");
  const note = text(formData, "note");
  if (!z.string().uuid().safeParse(bookingId).success) {
    return { error: "This booking could not be found." };
  }
  if (decision !== "approve" && decision !== "reject") {
    return { error: "Choose a valid decision." };
  }

  const rate = await limitByUser("owner-booking-decision", session.user.id, 60, 3600);
  if (!rate.ok) return { error: "Too many decisions. Wait a few minutes." };

  const result = await decideOwnerBooking({
    bookingId,
    ownerId: session.user.id,
    decision,
    note,
  });
  if (!result.ok) return { error: result.error };

  revalidatePath("/owner/bookings");
  revalidatePath("/owner");
  revalidatePath(`/owner/bookings/${bookingId}`);
  return { success: result.message };
}
