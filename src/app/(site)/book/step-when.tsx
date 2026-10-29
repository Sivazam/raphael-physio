"use client";

import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { CalendarX2, Loader2, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { calendarDateToISO, formatDateHumanNoYear, isoToCalendarDate } from "./_lib/format";
import type { AvailabilityState, SlotInfo } from "./_lib/types";

interface StepWhenProps {
  today: string;
  minDate: string;
  maxDate: string;
  /** Weekdays (0 = Sunday) the clinic is closed — disabled in the calendar. */
  closedWeekdays: number[];
  selectedDate: string;
  onSelectDate: (iso: string) => void;
  availability: AvailabilityState;
  onRetry: () => void;
  onUseAlternativeDate: (iso: string) => void;
  selectedSlot: string | null;
  onSelectSlot: (slot: SlotInfo) => void;
  dateError?: string;
  slotError?: string;
}

function SlotButton({
  slot,
  selected,
  onSelect,
}: {
  slot: SlotInfo;
  selected: boolean;
  onSelect: (slot: SlotInfo) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(slot)}
      disabled={!slot.available}
      aria-pressed={selected}
      className={cn(
        "flex h-11 items-center justify-center rounded-xl border text-sm font-semibold transition-all duration-300",
        selected
          ? "border-clay-deep bg-clay text-primary shadow-[0_6px_18px_-8px_oklch(0.58_0.115_85_/_0.6)]"
          : "border-border bg-background text-foreground hover:border-clay/60 hover:bg-secondary/50",
        !slot.available &&
          "cursor-not-allowed border-border/60 font-medium text-muted-foreground/60 line-through opacity-60 hover:bg-background"
      )}
    >
      {slot.label}
      {!slot.available && <span className="sr-only"> (already requested)</span>}
    </button>
  );
}

/**
 * Step 2 — "When would you like to come in?" Inline accessible calendar
 * (Sundays and out-of-window dates disabled) feeding a session-grouped slot
 * picker served by GET /api/availability. Loading, error and empty states
 * are announced through a persistent role="status" region.
 */
export function StepWhen({
  today,
  minDate,
  maxDate,
  closedWeekdays,
  selectedDate,
  onSelectDate,
  availability,
  onRetry,
  onUseAlternativeDate,
  selectedSlot,
  onSelectSlot,
  dateError,
  slotError,
}: StepWhenProps) {
  const slots =
    availability.kind === "loaded" && availability.data.ok
      ? (availability.data.slots ?? [])
      : [];
  const morning = slots.filter((s) => s.session === "morning");
  const afternoon = slots.filter((s) => s.session === "afternoon");
  const availableCount = slots.filter((s) => s.available).length;

  let statusText = "Pick a date to see available times.";
  if (!selectedDate) {
    statusText = "Pick a date to see available times.";
  } else if (availability.kind === "loading") {
    statusText = `Checking available times for ${formatDateHumanNoYear(selectedDate)}…`;
  } else if (availability.kind === "error") {
    statusText = "We couldn't check times just now.";
  } else if (availability.kind === "loaded") {
    statusText = availability.data.ok
      ? availableCount > 0
        ? `${availableCount} time${availableCount === 1 ? "" : "s"} available on ${formatDateHumanNoYear(selectedDate)}.`
        : `No times available on ${formatDateHumanNoYear(selectedDate)}.`
      : (availability.data.message ?? "That date isn't available.");
  }

  return (
    <div>
      <h2 className="text-2xl font-semibold tracking-tight text-foreground">
        When would you like to come in?
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        Pick a date, then a time that suits you. Times follow clinic hours in
        Rajamahendravaram.
      </p>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[auto_minmax(0,1fr)]">
        {/* Date picker */}
        <div className="mx-auto rounded-2xl border border-border bg-background p-1.5 shadow-sm sm:p-3">
          <Calendar
            mode="single"
            required
            aria-label="Choose an appointment date"
            selected={selectedDate ? isoToCalendarDate(selectedDate) : undefined}
            defaultMonth={isoToCalendarDate(selectedDate || minDate)}
            today={isoToCalendarDate(today)}
            fromDate={isoToCalendarDate(minDate)}
            toDate={isoToCalendarDate(maxDate)}
            onSelect={(date) => {
              if (date) onSelectDate(calendarDateToISO(date));
            }}
            disabled={(date) => {
              // Explicit function matcher — ISO string comparison is
              // unambiguous and independent of matcher-object semantics.
              const iso = calendarDateToISO(date);
              return (
                iso < minDate ||
                iso > maxDate ||
                closedWeekdays.includes(date.getDay())
              );
            }}
            className="p-2 [--cell-size:--spacing(10)] sm:p-3 sm:[--cell-size:--spacing(11)]"
          />
          {closedWeekdays.includes(0) && (
            <p className="px-2 pb-1.5 text-center text-xs text-muted-foreground">
              Sundays are closed at the centre.
            </p>
          )}
        </div>

        {/* Time picker */}
        <div className="min-w-0">
          {dateError && (
            <p className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {dateError}
            </p>
          )}

          {/* Persistent live region for availability results */}
          <p
            role="status"
            aria-live="polite"
            className={cn(
              "flex min-h-6 items-center gap-2 text-sm",
              selectedDate ? "text-foreground/80" : "text-muted-foreground"
            )}
          >
            {availability.kind === "loading" && (
              <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" aria-hidden="true" />
            )}
            <span suppressHydrationWarning>{statusText}</span>
          </p>

          {selectedDate && availability.kind === "loading" && (
            <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4" aria-hidden="true">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-11 animate-pulse rounded-lg bg-secondary/70" />
              ))}
            </div>
          )}

          {selectedDate && availability.kind === "error" && (
            <div className="mt-3 rounded-xl border border-border bg-secondary/40 p-4">
              <p className="text-sm leading-relaxed text-foreground/80">
                We couldn&rsquo;t check times for that day — this is usually temporary.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button type="button" variant="outline" className="h-10" onClick={onRetry}>
                  <RotateCcw className="mr-2 size-4" aria-hidden="true" />
                  Try again
                </Button>
              </div>
            </div>
          )}

          {selectedDate && availability.kind === "loaded" && !availability.data.ok && (
            <div className="mt-3 rounded-xl border border-border bg-secondary/40 p-4">
              <p className="flex items-start gap-2 text-sm leading-relaxed text-foreground/80">
                <CalendarX2 className="mt-0.5 size-4 shrink-0 text-clay-deep" aria-hidden="true" />
                <span suppressHydrationWarning>{availability.data.message}</span>
              </p>
              {availability.data.alternativeDate && (
                <Button
                  type="button"
                  variant="outline"
                  className="mt-3 h-10"
                  onClick={() => onUseAlternativeDate(availability.data.alternativeDate as string)}
                >
                  Show {formatDateHumanNoYear(availability.data.alternativeDate as string)}
                </Button>
              )}
            </div>
          )}

          {selectedDate && availability.kind === "loaded" && availability.data.ok && (
            <div className="mt-2 space-y-5">
              {slots.length === 0 && (
                <p className="text-sm leading-relaxed text-muted-foreground">
                  No clinic hours are set for this day — please choose another date, or call
                  the centre.
                </p>
              )}
              {morning.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Morning
                  </p>
                  <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {morning.map((s) => (
                      <SlotButton
                        key={s.start}
                        slot={s}
                        selected={selectedSlot === s.start}
                        onSelect={onSelectSlot}
                      />
                    ))}
                  </div>
                </div>
              )}
              {afternoon.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Afternoon
                  </p>
                  <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {afternoon.map((s) => (
                      <SlotButton
                        key={s.start}
                        slot={s}
                        selected={selectedSlot === s.start}
                        onSelect={onSelectSlot}
                      />
                    ))}
                  </div>
                </div>
              )}
              {slots.length > 0 && availableCount === 0 && (
                <p className="text-sm leading-relaxed text-muted-foreground">
                  All times on this day have been requested — please try another day, or
                  call the centre and we&rsquo;ll book you directly.
                </p>
              )}
            </div>
          )}

          {slotError && (
            <p className="mt-4 text-sm text-destructive" role="alert">
              {slotError}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
