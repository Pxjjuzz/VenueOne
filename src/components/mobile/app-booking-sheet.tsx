"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Info,
  Loader2,
  Minus,
  Plus,
  Users,
  X,
} from "lucide-react";
import { createBookingAction, quoteBookingAction } from "@/app/actions/booking";
import { ButtonLink } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { cn } from "@/lib/cn";
import type { MonthAvailability } from "@/lib/booking/availability";
import type { BookingQuote } from "@/lib/booking/quote";
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
  venueName: string;
  category: VenueCategory;
  capacity: number | null;
  bookingPolicy: "instant" | "approval";
  paymentWindowMinutes: number;
  initialMonth: MonthAvailability;
  initialDate?: string;
  initialSlotType?: string;
  initialStartTime?: string;
  initialHours?: number;
  signedIn: boolean;
  fromPrice: number | null;
};

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];
const HALL_SLOTS = ["half_day_morning", "half_day_afternoon", "full_day"] as const;

function dayMap(data: MonthAvailability) {
  return new Map(data.days.map((day) => [day.date, day]));
}

function leadingBlanks(month: string): number {
  const weekday = weekdayOf(`${month}-01`);
  return (weekday + 6) % 7;
}

function shortDate(date: string): string {
  return formatIstDate(`${date}T12:00:00+05:30`, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function AppBookingBar({
  venueId,
  venueSlug,
  venueName,
  category,
  capacity,
  bookingPolicy,
  paymentWindowMinutes,
  initialMonth,
  initialDate,
  initialSlotType,
  initialStartTime,
  initialHours,
  signedIn,
  fromPrice,
}: Props) {
  const validSlot =
    initialSlotType && HALL_SLOTS.includes(initialSlotType as (typeof HALL_SLOTS)[number]);
  const startsAtStep3 = Boolean(
    initialDate && (validSlot || (initialSlotType === "hourly" && initialStartTime)),
  );

  const [open, setOpen] = useState(Boolean(initialDate));
  const [step, setStep] = useState<1 | 2 | 3>(startsAtStep3 ? 3 : initialDate ? 2 : 1);
  const closeRef = useRef<HTMLButtonElement>(null);

  const [month, setMonth] = useState(initialMonth.month);
  const [data, setData] = useState<MonthAvailability>(initialMonth);
  const [loadingMonth, setLoadingMonth] = useState(false);
  const [monthError, setMonthError] = useState<string | null>(null);

  const [selectedDate, setSelectedDate] = useState<string | null>(initialDate ?? null);
  const [slotType, setSlotType] = useState<string>(
    initialSlotType === "hourly" || validSlot ? (initialSlotType as string) : "",
  );
  const [startTime, setStartTime] = useState<string>(initialStartTime ?? "");
  const [hours, setHours] = useState<number>(initialHours ?? 1);
  const [guestCount, setGuestCount] = useState<string>("");
  const [eventType, setEventType] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [idempotencyKey] = useState(() => `bk_${crypto.randomUUID()}`);

  const [quoteResult, setQuoteResult] = useState<{ key: string; quote: BookingQuote } | null>(null);
  const [quoteFailure, setQuoteFailure] = useState<{ key: string; message: string } | null>(null);
  const [bookingState, bookingAction, bookingPending] = useActionState(createBookingAction, {});

  const today = todayIstDateKey();
  const days = useMemo(() => dayMap(data), [data]);
  const selectedDay = selectedDate ? days.get(selectedDate) : undefined;

  const maxMonth = useMemo(() => {
    const now = new Date();
    const next = new Date(now.getFullYear(), now.getMonth() + 13, 1);
    return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`;
  }, []);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !bookingPending) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, bookingPending]);

  async function loadMonth(nextMonth: string) {
    if (nextMonth < today.slice(0, 7) || nextMonth > maxMonth) return;
    setLoadingMonth(true);
    setMonthError(null);
    try {
      const response = await fetch(`/api/venues/${venueId}/availability?month=${nextMonth}`, {
        headers: { Accept: "application/json" },
      });
      if (!response.ok) throw new Error("Availability could not be loaded.");
      const payload = (await response.json()) as MonthAvailability;
      setData(payload);
      setMonth(nextMonth);
      setSelectedDate(null);
      setSlotType("");
      setStartTime("");
      setHours(1);
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
          parseTimeToMinutes(offer.startTime) !== parseTimeToMinutes(previous.startTime) + 60
        ) {
          break;
        }
      }
      count += 1;
      if (count >= 12) break;
    }
    return count;
  })();

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
          setQuoteFailure({ key: quoteKey, message: "The price could not be checked. Try again." });
        }
      });

    return () => {
      active = false;
    };
  }, [quoteKey, venueId, selectedDate, slotType, startTime, category, activeHours, guestCount]);

  const quote = quoteResult && quoteResult.key === quoteKey ? quoteResult.quote : null;
  const quoteError = quoteFailure && quoteFailure.key === quoteKey ? quoteFailure.message : null;
  const quoteLoading = quoteKey !== null && quote === null && quoteError === null;

  function pickDate(date: string) {
    setSelectedDate(date);
    setSlotType("");
    setStartTime("");
    setHours(1);
    setStep(2);
  }

  function pickHallSlot(nextSlotType: string) {
    setSlotType(nextSlotType);
    setStartTime("");
    setStep(3);
  }

  function pickHour(nextStartTime: string) {
    setSlotType("hourly");
    setStartTime(nextStartTime);
    setHours(1);
    setStep(3);
  }

  function goBack() {
    setStep((current) => (current === 3 ? 2 : 1));
  }

  const selectedOffer = hallOffers.find((offer) => offer.slotType === slotType);
  const selectedEnd =
    category === "ground" && startTime
      ? minutesToTime(parseTimeToMinutes(startTime) + activeHours * 60)
      : null;
  const canSubmit = Boolean(signedIn && quote?.ok && !bookingPending);

  const nextPath = (() => {
    const params = new URLSearchParams();
    if (selectedDate) params.set("date", selectedDate);
    if (slotType) params.set("slotType", slotType);
    if (startTime) params.set("startTime", startTime);
    if (category === "ground") params.set("hours", String(activeHours));
    const query = params.toString();
    return `/app/venues/${venueSlug}${query ? `?${query}` : ""}`;
  })();

  const stepTitle =
    step === 1 ? "Pick a date" : step === 2 ? "Choose a time" : "Review and book";

  return (
    <>
      <div className="fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-[520px] border-t border-border bg-surface/95 px-5 pb-[calc(0.8rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-muted">
              {fromPrice != null ? (category === "hall" ? "Half day from" : "Per hour") : "Pricing"}
            </p>
            <p className="truncate text-[1.15rem] font-semibold leading-tight text-foreground tabular">
              {fromPrice != null ? formatMoney(fromPrice) : "On request"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="h-12 shrink-0 rounded-full bg-primary px-6 text-[0.9rem] font-semibold text-white shadow-[var(--shadow-md)] transition-transform active:scale-[0.98]"
          >
            Check dates
          </button>
        </div>
      </div>

      {open ? (
        <>
          <button
            type="button"
            aria-label="Close booking"
            onClick={() => (bookingPending ? undefined : setOpen(false))}
            className="app-fade-in fixed inset-0 z-50 bg-[rgba(10,14,11,0.45)]"
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="booking-title"
            className="app-sheet-in fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[92dvh] w-full max-w-[520px] flex-col overflow-hidden rounded-t-[28px] bg-background"
          >
            <div className="shrink-0 px-5 pb-2 pt-3">
              <div className="mx-auto h-1.5 w-10 rounded-full bg-border-strong" aria-hidden="true" />
              <div className="mt-3 flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  {step > 1 ? (
                    <button
                      type="button"
                      onClick={goBack}
                      aria-label="Previous step"
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface-secondary text-foreground-soft"
                    >
                      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                    </button>
                  ) : null}
                  <div className="min-w-0">
                    <p className="text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-muted">
                      Step {step} of 3
                    </p>
                    <h2
                      id="booking-title"
                      className="truncate text-[1.05rem] font-semibold tracking-[-0.02em] text-foreground"
                    >
                      {stepTitle}
                    </h2>
                  </div>
                </div>
                <button
                  ref={closeRef}
                  type="button"
                  onClick={() => (bookingPending ? undefined : setOpen(false))}
                  aria-label="Close booking"
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface-secondary text-foreground-soft"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
              <div className="mt-3 flex gap-1" aria-hidden="true">
                {[1, 2, 3].map((value) => (
                  <span
                    key={value}
                    className={
                      value <= step
                        ? "h-1 flex-1 rounded-full bg-primary"
                        : "h-1 flex-1 rounded-full bg-border"
                    }
                  />
                ))}
              </div>
            </div>

            <form action={bookingAction} className="flex min-h-0 flex-1 flex-col">
              <div key={step} className="app-fade-in min-h-0 flex-1 overflow-y-auto px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-3">
                {step === 1 ? (
                  <div>
                    <div className="flex items-center justify-between">
                      <p className="text-[0.9rem] font-semibold text-foreground">
                        {formatIstMonth(month)}
                      </p>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => loadMonth(shiftMonth(month, -1))}
                          disabled={loadingMonth || month <= today.slice(0, 7)}
                          aria-label="Previous month"
                          className="grid h-9 w-9 place-items-center rounded-full bg-surface text-foreground-soft shadow-[var(--shadow-sm)] disabled:opacity-40"
                        >
                          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => loadMonth(shiftMonth(month, 1))}
                          disabled={loadingMonth || month >= maxMonth}
                          aria-label="Next month"
                          className="grid h-9 w-9 place-items-center rounded-full bg-surface text-foreground-soft shadow-[var(--shadow-sm)] disabled:opacity-40"
                        >
                          <ChevronRight className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-7 gap-y-1" role="group" aria-label="Dates">
                      {WEEKDAYS.map((day, index) => (
                        <div
                          key={`${day}-${index}`}
                          className="pb-1 text-center text-[0.6rem] font-semibold uppercase tracking-[0.06em] text-muted"
                          aria-hidden="true"
                        >
                          {day}
                        </div>
                      ))}
                      {Array.from({ length: leadingBlanks(month) }).map((_, index) => (
                        <div key={`blank-${index}`} aria-hidden="true" />
                      ))}
                      {data.days.map((day) => {
                        const hasFree = day.slots.some((slot) => slot.available);
                        const disabled = day.past || day.closed || !hasFree || loadingMonth;
                        const selected = selectedDate === day.date;
                        return (
                          <button
                            key={day.date}
                            type="button"
                            disabled={disabled}
                            onClick={() => pickDate(day.date)}
                            aria-pressed={selected}
                            aria-label={`${shortDate(day.date)}${disabled ? ", unavailable" : ", available"}`}
                            className={cn(
                              "relative mx-auto grid h-10 w-10 place-items-center rounded-full text-[0.84rem] font-medium transition-colors",
                              selected
                                ? "bg-primary text-white"
                                : disabled
                                  ? "text-muted/40"
                                  : "text-foreground hover:bg-surface-secondary",
                            )}
                          >
                            {Number(day.date.slice(-2))}
                            {hasFree && !selected ? (
                              <span
                                className="absolute bottom-1 h-1 w-1 rounded-full bg-primary/60"
                                aria-hidden="true"
                              />
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
                      <p className="mt-3 text-xs text-error" role="alert">
                        {monthError}
                      </p>
                    ) : null}

                    <p className="mt-4 flex items-start gap-2 rounded-[var(--radius-md)] bg-surface px-3.5 py-3 text-[0.74rem] leading-relaxed text-muted">
                      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
                      Dates with a dot have open slots. Availability is checked live when you
                      choose a date.
                    </p>
                  </div>
                ) : null}

                {step === 2 && selectedDate ? (
                  <div>
                    <div className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] bg-surface px-4 py-3 shadow-[var(--shadow-sm)]">
                      <div>
                        <p className="text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-muted">
                          Selected date
                        </p>
                        <p className="mt-0.5 text-[0.95rem] font-semibold text-foreground">
                          {shortDate(selectedDate)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setStep(1)}
                        className="text-[0.78rem] font-semibold text-primary"
                      >
                        Change
                      </button>
                    </div>

                    {selectedDay?.closed ? (
                      <p className="mt-4 rounded-[var(--radius-md)] bg-warning-soft px-4 py-3 text-[0.8rem] text-warning">
                        This venue is closed on the selected date.
                      </p>
                    ) : dateOffers.length === 0 ? (
                      <p className="mt-4 rounded-[var(--radius-md)] bg-surface px-4 py-3 text-[0.8rem] text-muted">
                        No slots are published for this date yet.
                      </p>
                    ) : category === "hall" ? (
                      <div className="mt-4 space-y-2">
                        <p className="text-[0.72rem] font-semibold text-muted">
                          Choose one available period
                        </p>
                        {hallOffers.map((offer) => (
                          <button
                            key={offer.key}
                            type="button"
                            disabled={!offer.available}
                            onClick={() => pickHallSlot(offer.slotType)}
                            className={cn(
                              "flex w-full items-center justify-between gap-3 rounded-[var(--radius-md)] px-4 py-3.5 text-left transition-colors",
                              offer.available
                                ? "bg-surface shadow-[var(--shadow-sm)] active:bg-surface-secondary"
                                : "bg-surface-secondary/60 opacity-60",
                            )}
                          >
                            <span>
                              <span className="block text-[0.9rem] font-semibold text-foreground">
                                {offer.label}
                              </span>
                              <span className="mt-0.5 block text-[0.76rem] text-muted">
                                {offer.available ? offer.priceLabel : offer.reason ?? "Unavailable"}
                              </span>
                            </span>
                            {offer.available ? (
                              <ChevronRight
                                className="h-4 w-4 shrink-0 text-muted"
                                aria-hidden="true"
                              />
                            ) : null}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="mt-4">
                        <p className="text-[0.72rem] font-semibold text-muted">Start time</p>
                        <div
                          className="mt-2 grid grid-cols-4 gap-1.5"
                          role="group"
                          aria-label="Available start times"
                        >
                          {hourlyOffers.map((offer) => {
                            const active = startTime === offer.startTime;
                            return (
                              <button
                                key={offer.key}
                                type="button"
                                disabled={!offer.available}
                                onClick={() => offer.startTime && pickHour(offer.startTime)}
                                aria-pressed={active}
                                className={cn(
                                  "h-11 rounded-[var(--radius-sm)] text-[0.8rem] font-semibold transition-colors",
                                  active
                                    ? "bg-primary text-white"
                                    : offer.available
                                      ? "bg-surface text-foreground shadow-[var(--shadow-sm)]"
                                      : "bg-surface-secondary/60 text-muted/45",
                                )}
                              >
                                {offer.startTime}
                              </button>
                            );
                          })}
                        </div>
                        <p className="mt-3 text-[0.72rem] leading-relaxed text-muted">
                          Pick a start time, then set how many hours you need.
                        </p>
                      </div>
                    )}
                  </div>
                ) : null}

                {step === 3 && selectedDate ? (
                  <div className="space-y-4">
                    <div className="rounded-[var(--radius-md)] bg-surface p-4 shadow-[var(--shadow-sm)]">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-muted">
                            Your slot
                          </p>
                          <p className="mt-1 text-[0.95rem] font-semibold text-foreground">
                            {shortDate(selectedDate)}
                          </p>
                          <p className="mt-0.5 flex items-center gap-1.5 text-[0.82rem] text-muted">
                            <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                            {category === "hall"
                              ? selectedOffer?.label ?? "Selected period"
                              : `${startTime} – ${selectedEnd ?? ""}`}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setStep(2)}
                          className="shrink-0 text-[0.78rem] font-semibold text-primary"
                        >
                          Change
                        </button>
                      </div>

                      {category === "ground" ? (
                        <div className="mt-3 flex items-center justify-between gap-3 border-t border-border pt-3">
                          <div>
                            <p className="text-[0.8rem] font-semibold text-foreground">Duration</p>
                            <p className="text-[0.7rem] text-muted">
                              Up to {Math.max(1, maxConsecutiveHours)} open hours
                            </p>
                          </div>
                          <div className="flex items-center gap-1 rounded-full bg-surface-secondary p-1">
                            <button
                              type="button"
                              onClick={() => setHours(Math.max(1, activeHours - 1))}
                              disabled={activeHours <= 1}
                              aria-label="One hour less"
                              className="grid h-8 w-8 place-items-center rounded-full bg-surface text-foreground disabled:opacity-40"
                            >
                              <Minus className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                            <span className="w-12 text-center text-[0.8rem] font-semibold text-foreground tabular">
                              {activeHours} hr
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setHours(Math.min(maxConsecutiveHours, activeHours + 1, 12))
                              }
                              disabled={
                                activeHours >= Math.max(1, maxConsecutiveHours) || activeHours >= 12
                              }
                              aria-label="One hour more"
                              className="grid h-8 w-8 place-items-center rounded-full bg-surface text-foreground disabled:opacity-40"
                            >
                              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </div>

                    <div>
                      <p className="mb-2 text-[0.72rem] font-semibold text-muted">Event details</p>
                      <div className="space-y-3 rounded-[var(--radius-md)] bg-surface p-4 shadow-[var(--shadow-sm)]">
                        <div>
                          <label
                            htmlFor="app-guest-count"
                            className="text-[0.78rem] font-semibold text-foreground-soft"
                          >
                            Guests <span className="font-normal text-muted">(optional)</span>
                          </label>
                          <div className="relative mt-1.5">
                            <Users
                              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
                              aria-hidden="true"
                            />
                            <input
                              id="app-guest-count"
                              type="number"
                              min={1}
                              max={capacity ?? 100000}
                              value={guestCount}
                              onChange={(event) => setGuestCount(event.target.value)}
                              placeholder={capacity ? `Up to ${capacity}` : "Expected guests"}
                              className="h-11 w-full rounded-[var(--radius-sm)] border border-border bg-surface-raised pl-9 pr-3 text-sm text-foreground placeholder:text-muted/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
                            />
                          </div>
                        </div>
                        <div>
                          <label
                            htmlFor="app-event-type"
                            className="text-[0.78rem] font-semibold text-foreground-soft"
                          >
                            Occasion <span className="font-normal text-muted">(optional)</span>
                          </label>
                          <input
                            id="app-event-type"
                            type="text"
                            maxLength={80}
                            value={eventType}
                            onChange={(event) => setEventType(event.target.value)}
                            placeholder="e.g. Family function"
                            className="mt-1.5 h-11 w-full rounded-[var(--radius-sm)] border border-border bg-surface-raised px-3 text-sm text-foreground placeholder:text-muted/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
                          />
                        </div>
                        <div>
                          <label
                            htmlFor="app-booking-notes"
                            className="text-[0.78rem] font-semibold text-foreground-soft"
                          >
                            Notes <span className="font-normal text-muted">(optional)</span>
                          </label>
                          <textarea
                            id="app-booking-notes"
                            value={notes}
                            onChange={(event) => setNotes(event.target.value)}
                            maxLength={1000}
                            rows={2}
                            placeholder="Anything the venue should know?"
                            className="mt-1.5 w-full resize-none rounded-[var(--radius-sm)] border border-border bg-surface-raised px-3 py-2.5 text-sm leading-relaxed text-foreground placeholder:text-muted/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="rounded-[var(--radius-md)] bg-surface p-4 shadow-[var(--shadow-sm)]">
                      {quoteLoading ? (
                        <p className="flex items-center gap-2 text-[0.8rem] text-muted" role="status">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                          Checking price…
                        </p>
                      ) : quote?.ok ? (
                        <dl className="space-y-1.5 text-[0.82rem]">
                          <div className="flex justify-between gap-3">
                            <dt className="text-muted">
                              Base price
                              {category === "ground"
                                ? ` · ${quote.hours} ${quote.hours === 1 ? "hour" : "hours"}`
                                : ""}
                            </dt>
                            <dd className="text-foreground tabular">
                              {formatMoney(quote.subtotalPaise)}
                            </dd>
                          </div>
                          {quote.feePaise > 0 ? (
                            <div className="flex justify-between gap-3">
                              <dt className="text-muted">Platform fee</dt>
                              <dd className="text-foreground tabular">{formatMoney(quote.feePaise)}</dd>
                            </div>
                          ) : null}
                          {quote.taxPaise > 0 ? (
                            <div className="flex justify-between gap-3">
                              <dt className="text-muted">Tax ({quote.taxPercent}%)</dt>
                              <dd className="text-foreground tabular">{formatMoney(quote.taxPaise)}</dd>
                            </div>
                          ) : null}
                          <div className="flex justify-between gap-3 border-t border-border pt-2 text-[0.9rem] font-semibold">
                            <dt>Total payable</dt>
                            <dd className="text-foreground tabular">{formatMoney(quote.totalPaise)}</dd>
                          </div>
                        </dl>
                      ) : (
                        <p className="flex items-start gap-2 text-[0.8rem] leading-relaxed text-warning">
                          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                          {quoteError ?? "Choose a valid slot to see the total."}
                        </p>
                      )}
                    </div>

                    {bookingState?.error ? <FormAlert tone="error">{bookingState.error}</FormAlert> : null}

                    <p className="flex items-start gap-2 text-[0.7rem] leading-relaxed text-muted">
                      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      {bookingPolicy === "instant"
                        ? `Your slot is held for ${paymentWindowMinutes} minutes while you pay.`
                        : "The venue owner reviews the request first. No payment is taken now."}
                    </p>

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
                    <input type="hidden" name="returnTo" value="app" />
                  </div>
                ) : null}
              </div>

              {step === 3 ? (
                <div className="shrink-0 border-t border-border bg-surface px-5 pb-[calc(0.85rem+env(safe-area-inset-bottom))] pt-3">
                  <div className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-muted">
                        Total
                      </p>
                      <p className="truncate text-[1.1rem] font-semibold leading-tight text-foreground tabular">
                        {quote?.ok ? formatMoney(quote.totalPaise) : quoteLoading ? "Checking…" : "—"}
                      </p>
                    </div>

                    {signedIn ? (
                      <SubmitButton
                        className="h-12 shrink-0 rounded-full px-5 text-[0.88rem]"
                        pendingLabel="Creating…"
                        disabled={!canSubmit}
                      >
                        {bookingPolicy === "instant" ? "Continue to payment" : "Send request"}
                        <Check className="h-4 w-4" aria-hidden="true" />
                      </SubmitButton>
                    ) : (
                      <ButtonLink
                        href={`/auth/sign-in?next=${encodeURIComponent(nextPath)}`}
                        className="h-12 shrink-0 rounded-full px-5 text-[0.88rem]"
                      >
                        Sign in to book
                      </ButtonLink>
                    )}
                  </div>
                  <p className="mt-2 text-[0.65rem] leading-relaxed text-muted">
                    {venueName} · By continuing you accept the venue&apos;s booking and
                    cancellation terms.
                  </p>
                </div>
              ) : null}
            </form>
          </div>
        </>
      ) : null}
    </>
  );
}
