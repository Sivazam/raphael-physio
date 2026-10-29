"use client";

import { Button } from "@/components/ui/button";
import { Check, Loader2, PencilLine, Send } from "lucide-react";
import { formatTime12h } from "@/lib/content";
import { formatDateHuman } from "./_lib/format";
import type { SlotInfo } from "./_lib/types";

interface StepReviewProps {
  serviceName: string; // service name, or the "not sure" label
  date: string;
  slot: SlotInfo;
  name: string;
  phone: string;
  notes: string;
  submitting: boolean;
  formError?: string | null;
  onEditStep: (step: 1 | 2 | 3) => void;
  onSubmit: () => void;
}

function ReviewRow({
  label,
  children,
  onEdit,
  editLabel,
}: {
  label: string;
  children: React.ReactNode;
  onEdit?: () => void;
  editLabel?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/70 py-3.5 last:border-b-0">
      <div className="min-w-0">
        <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {label}
        </dt>
        <dd className="mt-1 text-sm leading-relaxed text-foreground">{children}</dd>
      </div>
      {onEdit && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-9 shrink-0 px-2 text-muted-foreground hover:text-foreground"
          onClick={onEdit}
          aria-label={editLabel ?? `Edit ${label.toLowerCase()}`}
        >
          <PencilLine className="mr-1 size-3.5" aria-hidden="true" />
          Edit
        </Button>
      )}
    </div>
  );
}

/** Step 4 — review + submit. Restates honestly that this is a REQUEST. */
export function StepReview({
  serviceName,
  date,
  slot,
  name,
  phone,
  notes,
  submitting,
  formError,
  onEditStep,
  onSubmit,
}: StepReviewProps) {
  return (
    <div>
      <h2 className="text-2xl font-semibold tracking-tight text-foreground">
        Review your request
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        One last look before it reaches the clinic team.
      </p>

      <dl className="mt-6 rounded-2xl border border-border bg-background">
        <div className="px-4 sm:px-5">
          <ReviewRow label="Service" onEdit={() => onEditStep(1)} editLabel="Edit service">
            {serviceName}
          </ReviewRow>
          <ReviewRow
            label="Date & time"
            onEdit={() => onEditStep(2)}
            editLabel="Edit date and time"
          >
            <span suppressHydrationWarning>{formatDateHuman(date)}</span>
            {" · "}
            {formatTime12h(slot.start)} – {formatTime12h(slot.end)}
          </ReviewRow>
          <ReviewRow label="Your details" onEdit={() => onEditStep(3)} editLabel="Edit your details">
            {name} · {phone}
          </ReviewRow>
          <ReviewRow label="Notes">
            {notes.trim() ? notes : <span className="text-muted-foreground">—</span>}
          </ReviewRow>
          <ReviewRow label="Consent">
            <span className="inline-flex items-center gap-2">
              <Check className="size-4 text-clay-deep" aria-hidden="true" />
              Understands this is a request, confirmed by phone
            </span>
          </ReviewRow>
        </div>
      </dl>

      <div className="mt-5 rounded-xl border border-clay/40 bg-secondary/50 p-4">
        <p className="text-sm leading-relaxed text-foreground/80">
          Sending this does <strong>not</strong> confirm the appointment — our team will
          call you to confirm the slot. If the time is already taken, they&rsquo;ll offer the
          nearest alternative.
        </p>
      </div>

      {formError && (
        <p
          role="alert"
          className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        >
          {formError}
        </p>
      )}

      <div className="mt-6">
        <button
          type="button"
          onClick={onSubmit}
          disabled={submitting}
          className="btn btn-gold h-12 w-full text-[12px] disabled:pointer-events-none disabled:opacity-60 sm:w-auto"
        >
          <span className="btn-sweep" aria-hidden="true" />
          {submitting ? (
            <>
              <Loader2 className="relative h-4 w-4 animate-spin" aria-hidden="true" />
              Sending request…
            </>
          ) : (
            <>
              <Send className="relative h-4 w-4" aria-hidden="true" />
              Send appointment request
            </>
          )}
        </button>
      </div>
    </div>
  );
}
