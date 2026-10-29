"use client";

import { useId, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

interface StepDetailsProps {
  name: string;
  onNameChange: (value: string) => void;
  phone: string;
  onPhoneChange: (value: string) => void;
  notes: string;
  onNotesChange: (value: string) => void;
  consent: boolean;
  onConsentChange: (value: boolean) => void;
  errors: Record<string, string>;
  onHoneypotChange: (value: string) => void;
}

/**
 * Step 3 — "Your details." Name, phone, optional notes and the request
 * consent checkbox. Inline errors use aria-describedby; the server re-checks
 * everything and can send these same fields back.
 */
export function StepDetails({
  name,
  onNameChange,
  phone,
  onPhoneChange,
  notes,
  onNotesChange,
  consent,
  onConsentChange,
  errors,
  onHoneypotChange,
}: StepDetailsProps) {
  const [honeypot, setHoneypot] = useState("");
  const uid = useId();
  const nameId = `${uid}-name`;
  const phoneId = `${uid}-phone`;
  const notesId = `${uid}-notes`;
  const consentId = `${uid}-consent`;

  return (
    <div>
      <h2 className="text-2xl font-semibold tracking-tight text-foreground">
        Your details
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        Just enough for the team to call you back — no medical history is needed here.
      </p>

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={nameId}>Your name *</Label>
          <Input
            id={nameId}
            name="name"
            autoComplete="name"
            required
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? `${nameId}-error` : undefined}
            className="h-11"
            placeholder="e.g. Ramesh Kumar"
          />
          {errors.name && (
            <p id={`${nameId}-error`} className="text-sm text-destructive">
              {errors.name}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor={phoneId}>Phone number *</Label>
          <Input
            id={phoneId}
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            required
            value={phone}
            onChange={(e) => onPhoneChange(e.target.value)}
            aria-invalid={Boolean(errors.phone)}
            aria-describedby={errors.phone ? `${phoneId}-error` : `${phoneId}-hint`}
            className="h-11"
            placeholder="10-digit mobile, or landline with code"
          />
          {errors.phone ? (
            <p id={`${phoneId}-error`} className="text-sm text-destructive">
              {errors.phone}
            </p>
          ) : (
            <p id={`${phoneId}-hint`} className="text-xs text-muted-foreground">
              We confirm every request by phone — spacing and +91 are fine.
            </p>
          )}
        </div>
      </div>

      <div className="mt-5 space-y-2">
        <Label htmlFor={notesId}>
          Anything worth knowing? <span className="font-normal text-muted-foreground">(optional)</span>
        </Label>
        <Textarea
          id={notesId}
          name="notes"
          rows={4}
          maxLength={1000}
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          aria-invalid={Boolean(errors.notes)}
          aria-describedby={errors.notes ? `${notesId}-error` : `${notesId}-hint`}
          className="min-h-24"
          placeholder="e.g. recent surgery, the area that hurts, or a preferred language — no detailed medical history is needed."
        />
        {errors.notes ? (
          <p id={`${notesId}-error`} className="text-sm text-destructive">
            {errors.notes}
          </p>
        ) : (
          <p id={`${notesId}-hint`} className="text-xs text-muted-foreground">
            A line or two helps the team prepare — keep it brief.
          </p>
        )}
      </div>

      <div className="mt-6">
        <label
          htmlFor={consentId}
          className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border bg-background p-4 transition-all duration-300 hover:border-clay/60 has-[:checked]:border-clay-deep has-[:checked]:bg-clay/10"
        >
          <Checkbox
            id={consentId}
            checked={consent}
            onCheckedChange={(checked) => onConsentChange(checked === true)}
            className="mt-0.5 size-5"
            aria-invalid={Boolean(errors.consent)}
            aria-describedby={errors.consent ? `${consentId}-error` : undefined}
          />
          <span className="text-sm leading-relaxed text-foreground">
            I understand this is a <strong>request</strong> — the clinic will confirm my
            appointment by phone. *
          </span>
        </label>
        {errors.consent && (
          <p id={`${consentId}-error`} className="mt-2 text-sm text-destructive">
            {errors.consent}
          </p>
        )}
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          We use your details only to contact you about this request. See our{" "}
          <a
            href="/privacy"
            className="link-sweep font-semibold text-clay-deep"
          >
            privacy page
          </a>
          .
        </p>
      </div>

      {/* Honeypot — invisible to humans, irresistible to bots. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <Label htmlFor={`${uid}-website`}>Company website</Label>
        <Input
          id={`${uid}-website`}
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={honeypot}
          onChange={(e) => {
            setHoneypot(e.target.value);
            onHoneypotChange(e.target.value);
          }}
        />
      </div>
    </div>
  );
}
