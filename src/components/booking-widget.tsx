"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Info,
  Loader2,
  Lock,
} from "lucide-react";
import type { MonthAvailability } from "@/lib/booking/availability";
import type { BookingQuote } from "@/lib/booking/quote";
import { createBookingAction, quoteBookingAction } from "@/app/actions/booking";
import { ButtonLink } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { FormAlert } from "@/components/ui/field";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/cn";
import { formatMoney } from "@/lib/format";
import {
  formatIstDate,
  formatIstMonth,
  minutesToTime,
  parseTimeToMinutes,
  shiftMonth,
  todayIstDateKey,
  weekdayOf,
} from "@/lib/time";
import type { VenueCategory } from "@/lib/types";

type Props = {
  venueId: string;
  venueSlug: string;
  category: VenueCategory;
  capacity: number | null;
  bookingPolicy: "instant" | "approval";
  paymentWindowMinutes: number;
  initialMonth: MonthAvailability;
  initialDate?: string;
  signedIn: boolean;
  initialSlotType?: string;
  initialStartTime?: string;
  initialHours?: number;
};

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function dayMap(data: MonthAvailability) {
  return new Map(data.days.map((day) => [day.date, day]));
}

function leadingBlanks(month: string): number {
  const first = `${month}-01`;
  const weekday = weekdayOf(first);
  return (weekday + 6) % 7;
}

export function BookingWidget({
  venueId,
  venueSlug,
  category,
  capacity,
  bookingPolicy,
  paymentWindowMinutes,
  initialMonth,
  initialDate,
  signedIn,
  initialSlotType,
  initialStartTime,
  initialHours,
}: Props) {
  const [month, setMonth] = useState(initialMonth.month);
  const [data, setData] = useState<MonthAvailability>(initialMonth);
  const [loadingMonth, setLoadingMonth] = useState(false);
  const [monthError, setMonthError] = useState<string | null>(null);

  const [selectedDate, setSelectedDate] = useState<string | null>(
    initialDate && initialDate.startsWith(initialMonth.month) ? initialDate : null,
  );
  const [slotType, setSlotType] = useState<string>(
    initialSlotType === "half_day_morning" ||
      initialSlotType === "half_day_afternoon" ||
      initialSlotType === "full_day" ||
      initialSlotType === "hourly"
      ? initialSlotType
      : "",
  );
  const [startTime, setStartTime] = useState<string>(initialStartTime ?? "");
  const [hours, setHours] = useState<number>(initialHours ?? 1);
  const [guestCount, setGuestCount] = useState<string>("");
  const [eventType, setEventType] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [idempotencyKey] = useState(() => `bk_${crypto.randomUUID()}`);

  const [quoteResult, setQuoteResult] = useState<{ key: string; quote: BookingQuote } | null>(null);
  const [quoteFailure, setQuoteFailure] = useState<{ key: string; message: string } | null>(null);
  const [bookingState, bookingAction, bookingPending] = useActionState(
    createBookingAction,
    {},
  );

  const today = todayIstDateKey();
  const days = useMemo(() => dayMap(data), [data]);
  const selectedDay = selectedDate ? days.get(selectedDate) : undefined;

  const maxMonth = useMemo(() => {
    const now = new Date();
    const next = new Date(now.getFullYear(), now.getMonth() + 13, 1);
    return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`;
  }, []);

  async function loadMonth(nextMonth: string) {
    if (nextMonth < today.slice(0, 7) || nextMonth > maxMonth) return;
    setLoadingMonth(true);
    setMonthError(null);
    try {
      const response = await fetch(`/api/venues/${venueId}/availability?month=${nextMonth}`, {
        headers: { Accept: "application/json" },
      });
      if (!response.ok) {
        throw new Error("Availability could not be loaded.");
      }
      const payload = (await response.json()) as MonthAvailability;
      setData(payload);
      setMonth(nextMonth);
      setSelectedDate(null);
      setSlotType("");
      setStartTime("");
    } catch {
      setMonthError("Availability could not be loaded. Try again.");
    } finally {
      setLoadingMonth(false);
    }
  }

  const dateOffers = selectedDay?.slots ?? [];
  const hallOffers = dateOffers.filter((offer) => offer.slotType !== "hourly");
  const hourlyOffers = dateOffers.filter((offer) => offer.slotType === "hourly");

  const selectedHourlyIndex = hourlyOffers.findIndex((offer) => offer.startTime === startTime);
  // Cheap enough to compute on every render, and it must not be memoised on an
  // array that is rebuilt by the filter above.
  const maxConsecutiveHours = (() => {
    if (selectedHourlyIndex < 0) return 0;
    let count = 0;
    for (let index = selectedHourlyIndex; index < hourlyOffers.length; index += 1) {
      const offer = hourlyOffers[index];
      if (!offer.available) break;
      if (index > selectedHourlyIndex) {
        const previous = hourlyOffers[index - 1];
        if (
          !previous.startTime ||
          !offer.startTime ||
          parseTimeToMinutes(offer.startTime) !==
            parseTimeToMinutes(previous.startTime) + 60
        ) {
          break;
        }
      }
      count += 1;
      if (count >= 12) break;
    }
    return count;
  })();

  // The selector only offers contiguous free hours. Clamp the chosen duration
  // during render rather than writing the clamped value back into state.
  const activeHours =
    category === "ground"
      ? Math.min(Math.max(1, hours), Math.max(1, maxConsecutiveHours))
      : hours;

  const quoteKey =
    selectedDate && slotType && (category !== "ground" || startTime)
      ? [
          venueId,
          selectedDate,
          slotType,
          category === "ground" ? startTime : "",
          category === "ground" ? activeHours : 0,
          guestCount,
        ].join("|")
      : null;

  useEffect(() => {
    if (!quoteKey || !selectedDate || !slotType) return;

    let active = true;
    quoteBookingAction({
      venueId,
      date: selectedDate,
      slotType,
      startTime: category === "ground" ? startTime : undefined,
      hours: category === "ground" ? activeHours : undefined,
      guestCount: guestCount ? Number(guestCount) : undefined,
    })
      .then((result) => {
        if (!active) return;
        if (result.ok) {
          setQuoteResult({ key: quoteKey, quote: result });
        } else {
          setQuoteFailure({ key: quoteKey, message: result.error });
        }
      })
      .catch(() => {
        if (active) {
          setQuoteFailure({
            key: quoteKey,
            message: "The price could not be checked. Try again.",
          });
        }
      });

    return () => {
      active = false;
    };
  }, [quoteKey, venueId, selectedDate, slotType, startTime, category, activeHours, guestCount]);

  // A quote only applies to the selection it was requested for. Older results are
  // ignored rather than cleared, so no effect needs to reset them.
  const quote = quoteResult && quoteResult.key === quoteKey ? quoteResult.quote : null;
  const quoteError = quoteFailure && quoteFailure.key === quoteKey ? quoteFailure.message : null;
  const quoteLoading = quoteKey !== null && quote === null && quoteError === null;

  function pickDate(date: string) {
    setSelectedDate(date);
    setSlotType("");
    setStartTime("");
    setHours(1);
  }

  function pickHallSlot(nextSlotType: string) {
    setSlotType(nextSlotType);
    setStartTime("");
  }

  function pickHour(nextStartTime: string) {
    setSlotType("hourly");
    setStartTime(nextStartTime);
    setHours(1);
  }

  const canSubmit = Boolean(signedIn && quote?.ok && !bookingPending);
  const selectedOffer = hallOffers.find((offer) => offer.slotType === slotType);
  const selectedEnd =
    category === "ground" && startTime
      ? minutesToTime(parseTimeToMinutes(startTime) + activeHours * 60)
      : null;

  const nextPath = (() => {
    const params = new URLSearchParams();
    if (selectedDate) params.set("date", selectedDate);
    if (slotType) params.set("slotType", slotType);
    if (startTime) params.set("startTime", startTime);
    if (category === "ground") params.set("hours", String(hours));
    const query = params.toString();
    return `/venues/${venueSlug}${query ? `?${query}` : ""}`;
  })();

  return (
    <div className="surface-card overflow-hidden border-border-strong">
      <div className="border-b border-border bg-surface-raised px-4 py-4 sm:px-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-muted">
              {category === "hall" ? "Half-day or full-day" : "Book by the hour"}
            </p>
            <p className="mt-1 font-display text-xl font-semibold tracking-[-0.03em] text-foreground">
              {quote?.ok ? formatMoney(quote.totalPaise) : selectedOffer ? selectedOffer.priceLabel : "Choose a slot"}
            </p>
          </div>
          <span className="rounded-full border border-border bg-surface px-2.5 py-1 text-[0.62rem] font-semibold text-foreground-soft">
            {bookingPolicy === "instant" ? "Instant booking" : "Owner approval"}
          </span>
        </div>
        <p className="mt-2 flex items-center gap-1.5 text-[0.72rem] leading-relaxed text-muted">
          <Info className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {bookingPolicy === "instant"
            ? `Your slot is held for ${paymentWindowMinutes} minutes while you pay.`
            : "The venue owner reviews the request first. No payment is taken now."}
        </p>
      </div>

      <div className="p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[0.78rem] font-semibold text-foreground">
            <CalendarDays className="mr-1.5 inline h-3.5 w-3.5 text-primary" aria-hidden="true" />
            {formatIstMonth(month)}
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="grid h-8 w-8 place-items-center rounded-[var(--radius-sm)] border border-border bg-surface text-muted hover:border-border-strong hover:text-foreground disabled:opacity-40"
              onClick={() => loadMonth(shiftMonth(month, -1))}
              disabled={loadingMonth || month <= today.slice(0, 7)}
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              className="grid h-8 w-8 place-items-center rounded-[var(--radius-sm)] border border-border bg-surface text-muted hover:border-border-strong hover:text-foreground disabled:opacity-40"
              onClick={() => loadMonth(shiftMonth(month, 1))}
              disabled={loadingMonth || month >= maxMonth}
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-7 gap-1" role="group" aria-label="Available dates">
          {WEEKDAYS.map((day) => (
            <div
              key={day}
              className="pb-1 text-center text-[0.58rem] font-semibold uppercase tracking-[0.06em] text-muted"
            >
              {day}
            </div>
          ))}
          {Array.from({ length: leadingBlanks(month) }).map((_, index) => (
            <div key={`blank-${index}`} aria-hidden="true" />
          ))}
          {data.days.map((day) => {
            const isPast = day.past;
            const isClosed = day.closed;
            const hasFree = day.slots.some((slot) => slot.available);
            const disabled = isPast || isClosed || !hasFree || loadingMonth;
            const selected = selectedDate === day.date;
            const dateNumber = Number(day.date.slice(-2));
            return (
              <button
                key={day.date}
                type="button"
                disabled={disabled}
                onClick={() => pickDate(day.date)}
                className={cn(
                  "relative grid h-9 place-items-center rounded-[var(--radius-xs)] text-[0.78rem] font-medium transition-colors",
                  selected
                    ? "bg-primary text-white"
                    : disabled
                      ? "cursor-not-allowed text-muted/45"
                      : "text-foreground hover:bg-surface-secondary",
                )}
                aria-pressed={selected}
                aria-label={`${formatIstDate(`${day.date}T12:00:00+05:30`, {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}${disabled ? ", unavailable" : ", available"}`}
              >
                {dateNumber}
                {hasFree && !selected ? (
                  <span className="absolute bottom-1 h-1 w-1 rounded-full bg-primary/70" aria-hidden="true" />
                ) : null}
              </button>
            );
          })}
        </div>

        {loadingMonth ? (
          <p className="mt-3 flex items-center gap-2 text-xs text-muted" role="status">
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            Loading availability…
          </p>
        ) : null}
        {monthError ? (
          <p className="mt-3 text-xs text-error" role="alert">{monthError}</p>
        ) : null}

        {!selectedDate ? (
          <p className="mt-4 rounded-[var(--radius-sm)] bg-surface-secondary px-3 py-3 text-xs leading-relaxed text-muted">
            Choosing a date shows only slots that the server reports as available.
          </p>
        ) : selectedDay?.closed ? (
          <p className="mt-4 text-xs text-muted">This venue is closed on the selected date.</p>
        ) : (
          <div className="mt-5 space-y-3 border-t border-border pt-4">
            <div>
              <p className="text-[0.78rem] font-semibold text-foreground">
                {formatIstDate(`${selectedDate}T12:00:00+05:30`, {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
              </p>
              <p className="mt-0.5 text-[0.68rem] text-muted">
                {category === "hall" ? "Choose one available hall period." : "Choose a start time, then a duration."}
              </p>
            </div>

            {category === "hall" ? (
              <div className="space-y-2">
                {hallOffers.map((offer) => {
                  const active = slotType === offer.slotType;
                  return (
                    <button
                      key={offer.key}
                      type="button"
                      disabled={!offer.available}
                      onClick={() => pickHallSlot(offer.slotType)}
                      className={cn(
                        "flex w-full items-center justify-between gap-3 rounded-[var(--radius-sm)] border px-3 py-2.5 text-left transition-colors",
                        active
                          ? "border-primary bg-primary-soft"
                          : offer.available
                            ? "border-border-strong bg-surface hover:border-primary/40"
                            : "cursor-not-allowed border-border bg-surface-secondary/60 opacity-65",
                      )}
                      aria-pressed={active}
                    >
                      <span>
                        <span className="block text-[0.78rem] font-medium text-foreground">
                          {offer.label}
                        </span>
                        <span className="mt-0.5 block text-[0.68rem] text-muted">
                          {offer.available ? offer.priceLabel : offer.reason ?? "Unavailable"}
                        </span>
                      </span>
                      {active ? (
                        <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                      ) : (
                        <span className="text-[0.68rem] font-medium text-primary">
                          {offer.available ? "Select" : "—"}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4" role="group" aria-label="Available start times">
                  {hourlyOffers.map((offer) => {
                    const active = startTime === offer.startTime;
                    return (
                      <button
                        key={offer.key}
                        type="button"
                        disabled={!offer.available}
                        onClick={() => offer.startTime && pickHour(offer.startTime)}
                        className={cn(
                          "rounded-[var(--radius-xs)] border px-2 py-2 text-[0.72rem] font-medium transition-colors",
                          active
                            ? "border-primary bg-primary text-white"
                            : offer.available
                              ? "border-border-strong bg-surface text-foreground hover:border-primary/40"
                              : "cursor-not-allowed border-border bg-surface-secondary/60 text-muted/50",
                        )}
                        aria-pressed={active}
                        title={offer.available ? offer.priceLabel : offer.reason}
                      >
                        {offer.startTime}
                      </button>
                    );
                  })}
                </div>

                {startTime && maxConsecutiveHours > 0 ? (
                  <div className="flex flex-wrap items-end justify-between gap-3 rounded-[var(--radius-sm)] bg-surface-secondary px-3 py-3">
                    <div>
                      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-muted">
                        Time
                      </p>
                      <p className="mt-0.5 text-sm font-medium text-foreground tabular">
                        {startTime} – {selectedEnd}
                      </p>
                    </div>
                    <div className="flex items-end gap-2">
                      <label htmlFor="booking-hours" className="pb-2 text-[0.68rem] font-medium text-muted">
                        Hours
                      </label>
                      <Select
                        id="booking-hours"
                        aria-label="Number of hours"
                        value={String(activeHours)}
                        onValueChange={(next) => setHours(Number(next))}
                        compact
                        className="w-20"
                        options={Array.from(
                          { length: Math.min(maxConsecutiveHours, 12) },
                          (_, index) => ({
                            value: String(index + 1),
                            label: `${index + 1}`,
                          }),
                        )}
                      />
                    </div>
                  </div>
                ) : null}
              </>
            )}
          </div>
        )}

        {selectedDate && slotType ? (
          <div className="mt-5 space-y-4 border-t border-border pt-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="guest-count" className="text-[0.72rem] font-semibold text-foreground-soft">
                  Guests <span className="font-normal text-muted">(optional)</span>
                </label>
                <input
                  id="guest-count"
                  type="number"
                  min={1}
                  max={capacity ?? 100000}
                  value={guestCount}
                  onChange={(event) => setGuestCount(event.target.value)}
                  placeholder={capacity ? `Up to ${capacity}` : "Expected guests"}
                  className="mt-1.5 h-10 w-full rounded-[var(--radius-sm)] border border-border-strong bg-surface px-3 text-sm"
                />
              </div>
              <div>
                <label htmlFor="event-type" className="text-[0.72rem] font-semibold text-foreground-soft">
                  Occasion <span className="font-normal text-muted">(optional)</span>
                </label>
                <input
                  id="event-type"
                  type="text"
                  maxLength={80}
                  value={eventType}
                  onChange={(event) => setEventType(event.target.value)}
                  placeholder="e.g. Family function"
                  className="mt-1.5 h-10 w-full rounded-[var(--radius-sm)] border border-border-strong bg-surface px-3 text-sm"
                />
              </div>
            </div>

            <div className="rounded-[var(--radius-sm)] border border-border bg-surface-raised px-3.5 py-3">
              {quoteLoading ? (
                <p className="flex items-center gap-2 text-xs text-muted" role="status">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                  Checking price…
                </p>
              ) : quote?.ok ? (
                <dl className="space-y-1.5 text-[0.78rem]">
                  <div className="flex justify-between gap-3">
                    <dt className="text-muted">
                      Base price{category === "ground" ? ` · ${quote.hours} ${quote.hours === 1 ? "hour" : "hours"}` : ""}
                    </dt>
                    <dd className="tabular text-foreground">{formatMoney(quote.subtotalPaise)}</dd>
                  </div>
                  {quote.feePaise > 0 ? (
                    <div className="flex justify-between gap-3">
                      <dt className="text-muted">Platform fee</dt>
                      <dd className="tabular text-foreground">{formatMoney(quote.feePaise)}</dd>
                    </div>
                  ) : null}
                  {quote.taxPaise > 0 ? (
                    <div className="flex justify-between gap-3">
                      <dt className="text-muted">Tax ({quote.taxPercent}%)</dt>
                      <dd className="tabular text-foreground">{formatMoney(quote.taxPaise)}</dd>
                    </div>
                  ) : null}
                  <div className="flex justify-between gap-3 border-t border-border pt-2 text-sm font-semibold">
                    <dt>Total payable</dt>
                    <dd className="tabular text-foreground">{formatMoney(quote.totalPaise)}</dd>
                  </div>
                </dl>
              ) : (
                <p className="flex items-start gap-2 text-xs leading-relaxed text-warning">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  {quoteError ?? "Choose a valid slot to see the total."}
                </p>
              )}
            </div>

            <form action={bookingAction} className="space-y-3">
              <input type="hidden" name="venueId" value={venueId} />
              <input type="hidden" name="date" value={selectedDate} />
              <input type="hidden" name="slotType" value={slotType} />
              {category === "ground" ? (
                <>
                  <input type="hidden" name="startTime" value={startTime} />
                  <input type="hidden" name="hours" value={activeHours} />
                </>
              ) : null}
              <input type="hidden" name="guestCount" value={guestCount} />
              <input type="hidden" name="eventType" value={eventType} />
              <input type="hidden" name="notes" value={notes} />
              <input type="hidden" name="idempotencyKey" value={idempotencyKey} />

              <div>
                <label htmlFor="booking-notes" className="text-[0.72rem] font-semibold text-foreground-soft">
                  Notes for the venue <span className="font-normal text-muted">(optional)</span>
                </label>
                <textarea
                  id="booking-notes"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  maxLength={1000}
                  rows={2}
                  placeholder="Anything the venue should know?"
                  className="mt-1.5 w-full resize-y rounded-[var(--radius-sm)] border border-border-strong bg-surface px-3 py-2 text-sm leading-relaxed"
                />
              </div>

              {bookingState?.error ? <FormAlert tone="error">{bookingState.error}</FormAlert> : null}

              {signedIn ? (
                <SubmitButton
                  className="w-full"
                  pendingLabel="Creating booking…"
                  disabled={!canSubmit}
                >
                  {bookingPolicy === "instant" ? "Continue to payment" : "Send booking request"}
                  <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                </SubmitButton>
              ) : (
                <ButtonLink
                  href={`/auth/sign-in?next=${encodeURIComponent(nextPath)}`}
                  className="w-full"
                >
                  Sign in to book
                  <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                </ButtonLink>
              )}

              <p className="text-[0.65rem] leading-relaxed text-muted">
                By continuing you agree to the venue&apos;s booking and cancellation
                terms shown on this page. This is not a payment step.
              </p>
            </form>
          </div>
        ) : null}
      </div>
    </div>
  );
}
