"use client";

import { useActionState, useState } from "react";
import { Save } from "lucide-react";
import { saveVenueAction, type OwnerActionState } from "@/app/actions/owner";
import { Field, Fieldset, FormAlert, Input, Textarea } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  GROUND_AMENITIES,
  GROUND_TYPES,
  HALL_AMENITIES,
  INDOOR_OUTDOOR,
  SPORTS,
  SURFACE_TYPES,
} from "@/lib/venue-catalog";

export type VenueFormDefaults = {
  name: string;
  category: "hall" | "ground";
  description: string;
  addressLine: string;
  city: string;
  state: string;
  pincode: string;
  latitude: string;
  longitude: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  capacity: string;
  lengthM: string;
  widthM: string;
  indoorOutdoor: string;
  rooms: string;
  stage: boolean;
  kitchen: boolean;
  parking: boolean;
  seatingCapacity: string;
  groundType: string;
  surfaceType: string;
  sports: string[];
  lighting: boolean;
  washrooms: boolean;
  changingRooms: boolean;
  amenities: string[];
  otherAmenities: string;
  halfDayRupees: string;
  fullDayRupees: string;
  hourRupees: string;
  hours: { weekday: number; opensAt: string; closesAt: string; isClosed: boolean }[];
  bookingPolicy: "instant" | "approval";
  paymentWindowMinutes: string;
  acceptingBookings: boolean;
};

const initial: OwnerActionState = {};
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function InlineCheck({
  name,
  label,
  defaultChecked,
}: {
  name: string;
  label: string;
  defaultChecked: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded-[var(--radius-xs)] border border-border bg-surface px-2.5 py-2 text-xs text-foreground-soft hover:border-border-strong">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="h-3.5 w-3.5 rounded-[3px] accent-[var(--primary)]"
      />
      {label}
    </label>
  );
}

export function VenueForm({
  venueId,
  defaults,
}: {
  venueId: string;
  defaults: VenueFormDefaults;
}) {
  const [state, action] = useActionState(saveVenueAction, initial);
  const [category, setCategory] = useState<"hall" | "ground">(defaults.category);
  const isHall = category === "hall";
  const amenityOptions = isHall ? HALL_AMENITIES : GROUND_AMENITIES;
  const otherAmenities = defaults.amenities.filter(
    (amenity) => !amenityOptions.includes(amenity as never),
  );

  return (
    <form action={action} className="space-y-8">
      <input type="hidden" name="venueId" value={venueId} />
      {state.error ? <FormAlert tone="error">{state.error}</FormAlert> : null}

      <Fieldset legend="The basics" description="What the space is called and how it is described.">
        <div className="grid gap-4 sm:grid-cols-[1.5fr_0.8fr]">
          <Field label="Venue name" htmlFor="venue-name" required error={state.fieldErrors?.name?.[0]}>
            <Input id="venue-name" name="name" defaultValue={defaults.name} required maxLength={120} />
          </Field>
          <Field label="Category" htmlFor="venue-category" required error={state.fieldErrors?.category?.[0]}>
            <Select
              id="venue-category"
              name="category"
              value={category}
              onValueChange={(next) => setCategory(next as "hall" | "ground")}
              options={[
                { value: "hall", label: "Community hall" },
                { value: "ground", label: "Community ground" },
              ]}
            />
          </Field>
        </div>

        <Field
          label="Description"
          htmlFor="venue-description"
          required
          hint="At least 80 characters. Describe the space, the kind of events it suits, and anything a visitor should know."
          error={state.fieldErrors?.description?.[0]}
        >
          <Textarea
            id="venue-description"
            name="description"
            defaultValue={defaults.description}
            rows={7}
            maxLength={5000}
          />
        </Field>
      </Fieldset>

      <Fieldset legend="Location and contact" description="Used for the public listing and booking coordination.">
        <Field label="Street address" htmlFor="venue-address" required error={state.fieldErrors?.addressLine?.[0]}>
          <Input id="venue-address" name="addressLine" defaultValue={defaults.addressLine} maxLength={200} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="City" htmlFor="venue-city" required error={state.fieldErrors?.city?.[0]}>
            <Input id="venue-city" name="city" defaultValue={defaults.city} maxLength={80} />
          </Field>
          <Field label="State" htmlFor="venue-state" required error={state.fieldErrors?.state?.[0]}>
            <Input id="venue-state" name="state" defaultValue={defaults.state} maxLength={80} />
          </Field>
          <Field label="PIN code" htmlFor="venue-pincode" required error={state.fieldErrors?.pincode?.[0]}>
            <Input
              id="venue-pincode"
              name="pincode"
              defaultValue={defaults.pincode}
              inputMode="numeric"
              maxLength={6}
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Contact name" htmlFor="venue-contact-name" optional>
            <Input id="venue-contact-name" name="contactName" defaultValue={defaults.contactName} maxLength={120} />
          </Field>
          <Field label="Contact phone" htmlFor="venue-contact-phone" required error={state.fieldErrors?.contactPhone?.[0]}>
            <Input id="venue-contact-phone" name="contactPhone" type="tel" defaultValue={defaults.contactPhone} maxLength={24} />
          </Field>
          <Field label="Contact email" htmlFor="venue-contact-email" optional error={state.fieldErrors?.contactEmail?.[0]}>
            <Input id="venue-contact-email" name="contactEmail" type="email" defaultValue={defaults.contactEmail} maxLength={254} />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Latitude" htmlFor="venue-latitude" optional hint="Optional. Used for map links and future phases.">
            <Input id="venue-latitude" name="latitude" defaultValue={defaults.latitude} inputMode="decimal" />
          </Field>
          <Field label="Longitude" htmlFor="venue-longitude" optional>
            <Input id="venue-longitude" name="longitude" defaultValue={defaults.longitude} inputMode="decimal" />
          </Field>
        </div>
      </Fieldset>

      <Fieldset legend="Capacity and dimensions" description="Help customers judge whether the space fits their event.">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label={isHall ? "Maximum capacity" : "Spectator capacity"} htmlFor="venue-capacity" optional>
            <Input id="venue-capacity" name="capacity" defaultValue={defaults.capacity} inputMode="numeric" />
          </Field>
          <Field label="Length (metres)" htmlFor="venue-length" optional>
            <Input id="venue-length" name="lengthM" defaultValue={defaults.lengthM} inputMode="decimal" />
          </Field>
          <Field label="Width (metres)" htmlFor="venue-width" optional>
            <Input id="venue-width" name="widthM" defaultValue={defaults.widthM} inputMode="decimal" />
          </Field>
        </div>

        {isHall ? (
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Indoor or outdoor" htmlFor="venue-indoor" optional>
              <Select
                id="venue-indoor"
                name="indoorOutdoor"
                defaultValue={defaults.indoorOutdoor || "Indoor"}
                options={INDOOR_OUTDOOR.map((option) => ({ value: option, label: option }))}
              />
            </Field>
            <Field label="Rooms" htmlFor="venue-rooms" optional>
              <Input id="venue-rooms" name="rooms" defaultValue={defaults.rooms} inputMode="numeric" />
            </Field>
            <Field label="Seating capacity" htmlFor="venue-seating" optional>
              <Input id="venue-seating" name="seatingCapacity" defaultValue={defaults.seatingCapacity} inputMode="numeric" />
            </Field>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Ground type" htmlFor="venue-ground-type" required>
              <Select
                id="venue-ground-type"
                name="groundType"
                defaultValue={defaults.groundType || GROUND_TYPES[0]}
                options={GROUND_TYPES.map((option) => ({ value: option, label: option }))}
              />
            </Field>
            <Field label="Surface" htmlFor="venue-surface" required>
              <Select
                id="venue-surface"
                name="surfaceType"
                defaultValue={defaults.surfaceType || SURFACE_TYPES[0]}
                options={SURFACE_TYPES.map((option) => ({ value: option, label: option }))}
              />
            </Field>
          </div>
        )}
      </Fieldset>

      <Fieldset legend="Facilities" description="Select everything available at the venue.">
        {isHall ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <InlineCheck name="stage" label="Stage" defaultChecked={defaults.stage} />
            <InlineCheck name="kitchen" label="Kitchen" defaultChecked={defaults.kitchen} />
            <InlineCheck name="parking" label="Parking" defaultChecked={defaults.parking} />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <InlineCheck name="lighting" label="Floodlights" defaultChecked={defaults.lighting} />
            <InlineCheck name="washrooms" label="Washrooms" defaultChecked={defaults.washrooms} />
            <InlineCheck name="changingRooms" label="Changing rooms" defaultChecked={defaults.changingRooms} />
            <InlineCheck name="parking" label="Parking" defaultChecked={defaults.parking} />
          </div>
        )}

        {!isHall ? (
          <div className="space-y-2">
            <p className="text-[0.8125rem] font-semibold text-foreground">Supported sports</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {SPORTS.map((sport) => (
                <label key={sport} className="flex cursor-pointer items-center gap-2 rounded-[var(--radius-xs)] border border-border bg-surface px-2.5 py-2 text-xs text-foreground-soft hover:border-border-strong">
                  <input
                    type="checkbox"
                    name="sports"
                    value={sport}
                    defaultChecked={defaults.sports.includes(sport)}
                    className="h-3.5 w-3.5 rounded-[3px] accent-[var(--primary)]"
                  />
                  {sport}
                </label>
              ))}
            </div>
          </div>
        ) : null}

        <div className="space-y-2">
          <p className="text-[0.8125rem] font-semibold text-foreground">Amenities</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {amenityOptions.map((amenity) => (
              <label key={amenity} className="flex cursor-pointer items-center gap-2 rounded-[var(--radius-xs)] border border-border bg-surface px-2.5 py-2 text-xs text-foreground-soft hover:border-border-strong">
                <input
                  type="checkbox"
                  name="amenities"
                  value={amenity}
                  defaultChecked={defaults.amenities.includes(amenity)}
                  className="h-3.5 w-3.5 rounded-[3px] accent-[var(--primary)]"
                />
                {amenity}
              </label>
            ))}
          </div>
        </div>

        <Field
          label="Other amenities"
          htmlFor="venue-other-amenities"
          optional
          hint="Comma-separated. These are shown alongside the standard options."
        >
          <Input
            id="venue-other-amenities"
            name="otherAmenities"
            defaultValue={otherAmenities.join(", ")}
            maxLength={500}
          />
        </Field>
      </Fieldset>

      <Fieldset
        legend="Proposed pricing"
        description="Prices are stored in paise on the server. New or changed prices are proposals until an administrator approves them."
      >
        <div className={isHall ? "grid gap-4 sm:grid-cols-2" : "grid gap-4 sm:grid-cols-2"}>
          {isHall ? (
            <>
              <Field label="Half-day price (₹)" htmlFor="price-half-day" required>
                <Input id="price-half-day" name="halfDayRupees" defaultValue={defaults.halfDayRupees} inputMode="decimal" />
              </Field>
              <Field label="Full-day price (₹)" htmlFor="price-full-day" required>
                <Input id="price-full-day" name="fullDayRupees" defaultValue={defaults.fullDayRupees} inputMode="decimal" />
              </Field>
            </>
          ) : (
            <Field label="Hourly price (₹)" htmlFor="price-hour" required>
              <Input id="price-hour" name="hourRupees" defaultValue={defaults.hourRupees} inputMode="decimal" />
            </Field>
          )}
        </div>
      </Fieldset>

      <Fieldset
        legend="Operating hours"
        description="Whole hours only. A hall needs at least two hours to produce half-day slots."
      >
        <div className="space-y-2">
          {WEEKDAYS.map((label, weekday) => {
            const day = defaults.hours.find((entry) => entry.weekday === weekday);
            return (
              <div key={weekday} className="grid items-center gap-2 rounded-[var(--radius-xs)] border border-border p-2.5 sm:grid-cols-[110px_1fr_1fr_auto]">
                <span className="text-xs font-medium text-foreground">{label}</span>
                <label className="flex items-center gap-2 text-[0.68rem] text-muted">
                  Opens
                  <Input
                    type="time"
                    name={`hours-${weekday}-opens`}
                    defaultValue={day?.opensAt ?? "09:00"}
                    step={3600}
                    className="h-9"
                    aria-label={`${label} opening time`}
                  />
                </label>
                <label className="flex items-center gap-2 text-[0.68rem] text-muted">
                  Closes
                  <Input
                    type="time"
                    name={`hours-${weekday}-closes`}
                    defaultValue={day?.closesAt ?? "18:00"}
                    step={3600}
                    className="h-9"
                    aria-label={`${label} closing time`}
                  />
                </label>
                <label className="flex items-center gap-2 text-[0.68rem] text-muted">
                  <input
                    type="checkbox"
                    name={`hours-${weekday}-closed`}
                    defaultChecked={day?.isClosed ?? false}
                    className="h-3.5 w-3.5 rounded-[3px] accent-[var(--primary)]"
                  />
                  Closed
                </label>
              </div>
            );
          })}
        </div>
      </Fieldset>

      <Fieldset legend="Booking settings" description="How customers reserve this venue.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Booking policy" htmlFor="venue-policy" required>
            <Select
              id="venue-policy"
              name="bookingPolicy"
              defaultValue={defaults.bookingPolicy}
              options={[
                { value: "approval", label: "Owner reviews each request" },
                { value: "instant", label: "Instant booking with payment" },
              ]}
            />
          </Field>
          <Field
            label="Payment window (minutes)"
            htmlFor="venue-payment-window"
            required
            hint="How long a customer has to pay after approval or an instant booking."
          >
            <Input
              id="venue-payment-window"
              name="paymentWindowMinutes"
              defaultValue={defaults.paymentWindowMinutes}
              inputMode="numeric"
              min={5}
              max={1440}
            />
          </Field>
        </div>
        <label className="flex cursor-pointer items-start gap-3 rounded-[var(--radius-sm)] border border-border bg-surface p-3.5">
          <input
            type="checkbox"
            name="acceptingBookings"
            defaultChecked={defaults.acceptingBookings}
            className="mt-0.5 h-4 w-4 rounded-[3px] accent-[var(--primary)]"
          />
          <span>
            <span className="block text-sm font-medium text-foreground">Accepting new bookings</span>
            <span className="mt-0.5 block text-xs text-muted">
              Uncheck to pause new bookings without unpublishing approved venues. Existing
              bookings are unaffected.
            </span>
          </span>
        </label>
      </Fieldset>

      <div className="sticky bottom-3 z-20 flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-border bg-surface/95 px-4 py-3 shadow-[var(--shadow-md)] backdrop-blur">
        <p className="hidden text-xs text-muted sm:block">
          Saving an approved venue submits the changes for review again.
        </p>
        <SubmitButton pendingLabel="Saving venue…">
          <Save className="h-4 w-4" aria-hidden="true" />
          Save venue
        </SubmitButton>
      </div>
    </form>
  );
}
