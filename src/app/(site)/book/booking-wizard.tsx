"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, CalendarX2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StepService } from "./step-service";
import { StepWhen } from "./step-when";
import { StepDetails } from "./step-details";
import { StepReview } from "./step-review";
import { BookingSuccess } from "./booking-success";
import {
  STEPS,
  UNSURE,
  type AvailabilityState,
  type SlotInfo,
  type StepNumber,
  type WizardPhone,
  type WizardService,
} from "./_lib/types";

export interface BookingWizardProps {
  services: WizardService[];
  /** Clinic-local booking window (server-computed in Asia/Kolkata). */
  bookingWindow: { today: string; minDate: string; maxDate: string };
  closedWeekdays: number[];
  phone: WizardPhone;
  /** Preselected service id from /book?service=slug (null when unknown). */
  initialServiceId?: string | null;
  /** Resolved in-window open date from /book?date=YYYY-MM-DD. */
  initialDate?: string | null;
  /** Honest explanation when the requested date had to move (e.g. Sunday → Monday). */
  initialDateNotice?: string | null;
}

interface BookResponse {
  ok: boolean;
  reference?: string;
  error?: string;
  fieldErrors?: Record<string, string>;
  alternativeDate?: string;
}

const STEP_TITLES: Record<StepNumber, string> = {
  1: "Service",
  2: "Date and time",
  3: "Your details",
  4: "Review",
};

/**
 * The appointment-REQUEST wizard. One state owner (this component) keeps
 * every choice alive across back-navigation; step components are pure.
 * Validation is mirrored client-side for quick feedback but the server is
 * authoritative — server field errors are mapped back onto the same UI.
 */
export function BookingWizard({
  services,
  bookingWindow,
  closedWeekdays,
  phone,
  initialServiceId = null,
  initialDate = null,
  initialDateNotice = null,
}: BookingWizardProps) {
  const [step, setStep] = useState<StepNumber>(1);
  const [serviceId, setServiceId] = useState<string>(
    initialServiceId && services.some((s) => s.id === initialServiceId)
      ? initialServiceId
      : ""
  );
  const [dateISO, setDateISO] = useState<string>(initialDate ?? "");
  const [slot, setSlot] = useState<SlotInfo | null>(null);
  const [name, setName] = useState("");
  const [phoneInput, setPhoneInput] = useState("");
  const [notes, setNotes] = useState("");
  const [consent, setConsent] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [reference, setReference] = useState<string | null>(null);
  const [availability, setAvailability] = useState<AvailabilityState>({ kind: "idle" });
  const [reloadKey, setReloadKey] = useState(0);

  const panelRef = useRef<HTMLDivElement>(null);

  const clearError = useCallback((key: string) => {
    setErrors((e) => {
      if (!e[key]) return e;
      const next = { ...e };
      delete next[key];
      return next;
    });
  }, []);

  // ---------------------------------------------------------------- availability
  useEffect(() => {
    if (!dateISO) {
      setAvailability({ kind: "idle" });
      return;
    }
    const controller = new AbortController();
    let cancelled = false;
    setAvailability({ kind: "loading" });

    fetch(`/api/availability?date=${encodeURIComponent(dateISO)}`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({ ok: false, error: "bad-json" }));
        if (!cancelled) setAvailability({ kind: "loaded", data });
      })
      .catch((err) => {
        if (cancelled || (err instanceof DOMException && err.name === "AbortError")) return;
        setAvailability({ kind: "error" });
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [dateISO, reloadKey]);

  // Drop a selected slot that is no longer offered/available.
  useEffect(() => {
    if (availability.kind !== "loaded" || !availability.data.ok) return;
    const slots = availability.data.slots ?? [];
    if (slot && !slots.some((s) => s.start === slot.start && s.available)) {
      setSlot(null);
    }
  }, [availability, slot]);

  // ------------------------------------------------------------------- focus
  useEffect(() => {
    // Move user focus to the new step/panel after transitions.
    panelRef.current?.focus();
  }, [step, reference]);

  // ------------------------------------------------------------------ handlers
  function goTo(next: StepNumber) {
    setErrors({});
    setFormError(null);
    setStep(next);
  }

  function handleServiceChange(value: string) {
    setServiceId(value);
    clearError("serviceId");
  }

  function handleDateSelect(iso: string) {
    setDateISO(iso);
    setSlot(null);
    clearError("date");
    clearError("slot");
  }

  function handleSlotSelect(s: SlotInfo) {
    setSlot(s);
    clearError("slot");
  }

  function validateStep1(): boolean {
    if (!serviceId) {
      setErrors({ serviceId: "Please choose a service — or select “Not sure”." });
      return false;
    }
    return true;
  }

  function validateStep2(): boolean {
    const next: Record<string, string> = {};
    if (!dateISO) next.date = "Please pick a date from the calendar.";
    if (!slot) next.slot = "Please choose one of the available times.";
    if (Object.keys(next).length > 0) {
      setErrors(next);
      return false;
    }
    return true;
  }

  function validateStep3(): boolean {
    const next: Record<string, string> = {};
    if (name.trim().length < 2) next.name = "Please enter your name.";
    const digits = phoneInput.replace(/\D/g, "");
    if (digits.length < 10 || digits.length > 13) {
      next.phone = "Please enter a valid phone number — 10 digits (or with +91 and spacing).";
    }
    if (notes.length > 1000) next.notes = "Please keep notes under 1000 characters.";
    if (!consent) {
      next.consent = "Please tick the box to confirm you understand this is a request.";
    }
    if (Object.keys(next).length > 0) {
      setErrors(next);
      toast.error("Please check the highlighted fields and try again.");
      return false;
    }
    return true;
  }

  function handleContinue() {
    if (step === 1 && validateStep1()) goTo(2);
    else if (step === 2 && validateStep2()) goTo(3);
    else if (step === 3 && validateStep3()) goTo(4);
  }

  async function handleSubmit() {
    if (submitting || !dateISO || !slot) return;
    setSubmitting(true);
    setFormError(null);
    setErrors({});

    try {
      const res = await fetch("/api/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone: phoneInput,
          serviceId: serviceId && serviceId !== UNSURE ? serviceId : null,
          date: dateISO,
          slot: slot.start,
          notes,
          consent: true,
          website: honeypot,
        }),
      });
      const data: BookResponse = await res.json().catch(() => ({} as BookResponse));

      if (res.ok && data.ok && data.reference) {
        setReference(data.reference);
        toast.success("Request received — our team will confirm by phone.");
      } else {
        const fieldErrors = data.fieldErrors ?? {};
        setErrors(fieldErrors);
        const message =
          data.error ??
          "We couldn't send your request. Please try again, or call the centre.";
        setFormError(Object.keys(fieldErrors).length > 0 ? null : message);
        toast.error(message);

        // Steer the patient back to wherever the problem lives.
        if (fieldErrors.slot || fieldErrors.date) {
          setSlot(null);
          if (data.alternativeDate && fieldErrors.date) {
            setDateISO(data.alternativeDate);
          } else {
            setReloadKey((k) => k + 1); // refresh availability for this date
          }
          goTo(2);
        } else if (fieldErrors.name || fieldErrors.phone || fieldErrors.notes || fieldErrors.consent) {
          goTo(3);
        } else if (fieldErrors.serviceId) {
          goTo(1);
        }
      }
    } catch {
      // Honest offline state: never claim the request was submitted.
      const message =
        "We couldn't send your request — please check your connection, or call the centre instead.";
      setFormError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  function handleReset() {
    setStep(1);
    setServiceId("");
    setDateISO("");
    setSlot(null);
    setName("");
    setPhoneInput("");
    setNotes("");
    setConsent(false);
    setHoneypot("");
    setErrors({});
    setFormError(null);
    setReference(null);
    setAvailability({ kind: "idle" });
  }

  // -------------------------------------------------------------------- render
  const selectedService = services.find((s) => s.id === serviceId);
  const serviceLabel = selectedService
    ? selectedService.name
    : serviceId === UNSURE
      ? "Not sure — help me decide"
      : "";
  const showNotice = Boolean(initialDateNotice) && dateISO === (initialDate ?? "");

  if (reference) {
    return (
      <div className="rounded-3xl border border-border/70 bg-card p-5 sm:p-8">
        <p role="status" aria-live="polite" className="sr-only">
          Request received. Reference {reference}. Our team will confirm your appointment
          by phone.
        </p>
        <div ref={panelRef} tabIndex={-1} className="rounded-2xl focus-visible:outline-none">
          <BookingSuccess
            reference={reference}
            serviceName={serviceLabel}
            date={dateISO}
            slotLabel={slot?.label ?? ""}
            phone={phone}
            onReset={handleReset}
          />
        </div>
      </div>
    );
  }

  const currentTitle = STEP_TITLES[step];

  return (
    <div className="rounded-3xl border border-border/70 bg-card p-5 sm:p-8">
      {/* Screen-reader announcements for step transitions */}
      <p role="status" aria-live="polite" className="sr-only">
        {`Step ${step} of 4 — ${currentTitle}`}
      </p>

      {/* Progress indicator */}
      <nav aria-label="Booking progress">
        <ol className="flex items-center gap-1 sm:gap-2">
          {STEPS.map((s, i) => {
            const done = s.n < step;
            const current = s.n === step;
            return (
              <li key={s.n} className="flex items-center gap-1 sm:gap-2">
                <span
                  aria-current={current ? "step" : undefined}
                  className={`flex size-7 items-center justify-center rounded-full border text-xs font-semibold transition-colors duration-300 sm:size-8 ${
                    current
                      ? "border-primary bg-primary text-primary-foreground"
                      : done
                        ? "border-clay/70 bg-clay/15 text-clay-deep"
                        : "border-border bg-background text-muted-foreground"
                  }`}
                >
                  {done ? (
                    <Check className="size-3.5" aria-hidden="true" />
                  ) : (
                    s.n
                  )}
                </span>
                <span
                  className={`hidden text-xs font-medium sm:block ${
                    current ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {s.label}
                </span>
                {i < STEPS.length - 1 && (
                  <span aria-hidden="true" className="h-px w-3 bg-border sm:w-5" />
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      <p className="mt-5 text-xs text-muted-foreground">
        Prefer to call?{" "}
        <a
          href={`tel:${phone.primary}`}
          className="link-sweep font-bold text-clay-deep"
        >
          {phone.primaryDisplay}
        </a>{" "}
        — reception can book you in directly.
      </p>

      {showNotice && initialDateNotice && (
        <div
          role="note"
          className="mt-5 flex items-start gap-2.5 rounded-xl border border-clay/40 bg-secondary/50 p-3.5 text-sm leading-relaxed text-foreground/85"
        >
          <CalendarX2 className="mt-0.5 size-4 shrink-0 text-clay-deep" aria-hidden="true" />
          <p suppressHydrationWarning>{initialDateNotice}</p>
        </div>
      )}

      <div
        ref={panelRef}
        tabIndex={-1}
        role="group"
        aria-label={`Step ${step} of 4: ${currentTitle}`}
        className="mt-6 rounded-2xl focus-visible:outline-none"
      >
        {step === 1 && (
          <StepService
            services={services}
            value={serviceId}
            onChange={handleServiceChange}
            error={errors.serviceId}
          />
        )}

        {step === 2 && (
          <StepWhen
            today={bookingWindow.today}
            minDate={bookingWindow.minDate}
            maxDate={bookingWindow.maxDate}
            closedWeekdays={closedWeekdays}
            selectedDate={dateISO}
            onSelectDate={handleDateSelect}
            availability={availability}
            onRetry={() => setReloadKey((k) => k + 1)}
            onUseAlternativeDate={handleDateSelect}
            selectedSlot={slot?.start ?? null}
            onSelectSlot={handleSlotSelect}
            dateError={errors.date}
            slotError={errors.slot}
          />
        )}

        {step === 3 && (
          <StepDetails
            name={name}
            onNameChange={(v) => {
              setName(v);
              clearError("name");
            }}
            phone={phoneInput}
            onPhoneChange={(v) => {
              setPhoneInput(v);
              clearError("phone");
            }}
            notes={notes}
            onNotesChange={(v) => {
              setNotes(v);
              clearError("notes");
            }}
            consent={consent}
            onConsentChange={(v) => {
              setConsent(v);
              clearError("consent");
            }}
            errors={errors}
            onHoneypotChange={setHoneypot}
          />
        )}

        {step === 4 && dateISO && slot && (
          <StepReview
            serviceName={serviceLabel}
            date={dateISO}
            slot={slot}
            name={name}
            phone={phoneInput}
            notes={notes}
            submitting={submitting}
            formError={formError}
            onEditStep={(target) => goTo(target)}
            onSubmit={handleSubmit}
          />
        )}
      </div>

      {/* Step navigation */}
      <div className="mt-8 flex flex-col-reverse gap-3 border-t border-border/70 pt-6 sm:flex-row sm:items-center sm:justify-between">
        {step > 1 ? (
          <Button
            type="button"
            variant="ghost"
            size="lg"
            className="h-11 rounded-full font-medium"
            onClick={() => goTo((step - 1) as StepNumber)}
            disabled={submitting}
          >
            <ArrowLeft className="mr-2 size-4" aria-hidden="true" />
            Back
          </Button>
        ) : (
          <span className="hidden sm:block" aria-hidden="true" />
        )}

        {step < 4 ? (
          <button
            type="button"
            onClick={handleContinue}
            disabled={submitting}
            className="btn btn-gold h-12 text-[12px]"
          >
            <span className="btn-sweep" aria-hidden="true" />
            Continue
            <ArrowRight className="relative h-4 w-4" aria-hidden="true" />
          </button>
        ) : (
          <p className="text-right text-xs leading-relaxed text-muted-foreground sm:max-w-xs">
            Sending this does not confirm the appointment — our team calls to confirm
            every request.
          </p>
        )}
      </div>
    </div>
  );
}
