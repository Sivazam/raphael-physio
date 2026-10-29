"use client";

import Link from "next/link";
import { CalendarCheck2, FileText, Phone, RotateCcw } from "lucide-react";
import { formatDateHuman } from "./_lib/format";
import type { WizardPhone } from "./_lib/types";

interface BookingSuccessProps {
  reference: string;
  serviceName: string;
  date: string;
  slotLabel: string; // "9:00 AM"
  phone: WizardPhone;
  onReset: () => void;
}

/**
 * Honest success state: a REQUEST was received — never "appointment
 * confirmed". Shows the reference, what happens next, and call-to-change
 * paths. No add-to-calendar (there is nothing confirmed to add yet).
 */
export function BookingSuccess({
  reference,
  serviceName,
  date,
  slotLabel,
  phone,
  onReset,
}: BookingSuccessProps) {
  return (
    <div>
      <div className="flex items-start gap-4">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-clay/15 text-clay-deep">
          <CalendarCheck2 className="size-6" aria-hidden="true" />
        </span>
        <div>
          <h2 className="font-display text-2xl font-semibold tracking-tight text-foreground">
            Request received
          </h2>
          <p className="mt-2 leading-relaxed text-muted-foreground">
            Our team will confirm your appointment by phone.
            {serviceName && date ? (
              <>
                {" "}
                You asked for <strong className="text-foreground">{serviceName}</strong> on{" "}
                <span className="text-foreground">{formatDateHuman(date)}</span>
                {slotLabel ? <> around {slotLabel}</> : null}. Only a request — the team
                confirms the exact time when they call.
              </>
            ) : null}
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-clay/40 bg-secondary/50 p-4 sm:p-5">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
          Your reference
        </p>
        <p className="mt-1 font-mono text-lg font-semibold tracking-wider text-foreground">
          {reference}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          Quote this if you call the centre about your request.
        </p>
      </div>

      <div className="mt-6">
        <h3 className="text-sm font-bold uppercase tracking-[0.14em] text-muted-foreground">
          What happens next
        </h3>
        <ol className="mt-3 space-y-4">
          <li className="flex items-start gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-border bg-background text-clay-deep">
              <Phone className="size-4" aria-hidden="true" />
            </span>
            <p className="text-sm leading-relaxed text-foreground/90">
              <span className="font-medium text-foreground">A confirmation call.</span>{" "}
              The team calls during working hours to confirm the slot. If your chosen time
              is taken, they&rsquo;ll offer the nearest alternative.
            </p>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-border bg-background text-clay-deep">
              <FileText className="size-4" aria-hidden="true" />
            </span>
            <p className="text-sm leading-relaxed text-foreground/90">
              <span className="font-medium text-foreground">Bring any reports.</span> If you
              have doctor&rsquo;s notes, scans or previous prescriptions, bring them along to
              your first visit.
            </p>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-border bg-background text-clay-deep">
              <RotateCcw className="size-4" aria-hidden="true" />
            </span>
            <p className="text-sm leading-relaxed text-foreground/90">
              <span className="font-medium text-foreground">Need to change it?</span> Call
              the centre and quote your reference — requests can be moved or cancelled any
              time before confirmation.
            </p>
          </li>
        </ol>
      </div>

      <div className="mt-8 flex flex-col gap-3.5 sm:flex-row sm:items-center">
        <a
          href={`tel:${phone.primary}`}
          className="btn btn-gold h-12 text-[12px]"
        >
          <span className="btn-sweep" aria-hidden="true" />
          <Phone className="relative h-[18px] w-[18px]" aria-hidden="true" />
          Call the centre
        </a>
        <button
          type="button"
          onClick={onReset}
          className="btn btn-outline h-12 text-[12px]"
        >
          <span className="btn-sweep" aria-hidden="true" />
          <RotateCcw className="relative h-4 w-4" aria-hidden="true" />
          Make another request
        </button>
      </div>
      <p className="mt-4 text-xs text-muted-foreground">
        You can also reach the team on{" "}
        <a
          href={`tel:${phone.primary}`}
          className="link-sweep font-semibold text-clay-deep"
        >
          {phone.primaryDisplay}
        </a>
        {phone.alternate && phone.alternateDisplay && (
          <>
            {" "}or{" "}
            <a
              href={`tel:${phone.alternate}`}
              className="link-sweep font-semibold text-clay-deep"
            >
              {phone.alternateDisplay}
            </a>
          </>
        )}
        . Directions are on the{" "}
        <Link href="/contact" className="link-sweep font-semibold text-clay-deep">
          contact page
        </Link>
        .
      </p>
    </div>
  );
}
