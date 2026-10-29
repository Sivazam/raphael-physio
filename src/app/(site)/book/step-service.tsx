"use client";

import { CircleHelp } from "lucide-react";
import { UNSURE, type WizardService } from "./_lib/types";

interface StepServiceProps {
  services: WizardService[];
  value: string; // service id or UNSURE
  onChange: (value: string) => void;
  error?: string;
}

/**
 * Step 1 — "What do you need help with?" Published services as radio cards,
 * plus an honest "Not sure — help me decide" option. Native radios keep
 * keyboard + screen-reader semantics for free; the whole card is the label.
 */
export function StepService({ services, value, onChange, error }: StepServiceProps) {
  return (
    <div>
      <h2 className="text-2xl font-semibold tracking-tight text-foreground">
        What do you need help with?
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        Choose the service closest to your need — or pick &ldquo;Not sure&rdquo; and the
        team will guide you when they call.
      </p>

      <fieldset className="mt-6">
        <legend className="sr-only">Choose a service</legend>
        {services.length === 0 && (
          <p className="mb-3 rounded-xl border border-border bg-secondary/40 p-3 text-sm leading-relaxed text-muted-foreground">
            Our service list is being updated right now — choose &ldquo;Not sure&rdquo;
            below, or call the centre and the team will guide you.
          </p>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          {services.map((s) => (
            <label
              key={s.id}
              className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border bg-background p-4 text-left transition-all duration-300 hover:border-clay/60 has-[:checked]:border-clay-deep has-[:checked]:bg-clay/10 has-[:focus-visible]:border-ring has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/40"
            >
              <input
                type="radio"
                name="booking-service"
                value={s.id}
                checked={value === s.id}
                onChange={() => onChange(s.id)}
                className="peer sr-only"
                aria-describedby={error ? "step-service-error" : undefined}
              />
              <span
                aria-hidden="true"
                className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border border-border bg-background peer-checked:border-clay-deep peer-checked:border-[6px]"
              />
              <span className="min-w-0">
                {s.categoryName && (
                  <span className="block text-[11px] font-bold uppercase tracking-[0.18em] text-clay-deep">
                    {s.categoryName}
                  </span>
                )}
                <span className="mt-0.5 block font-medium leading-snug text-foreground">
                  {s.name}
                </span>
                {s.tagline && (
                  <span className="mt-1 block text-sm leading-relaxed text-muted-foreground">
                    {s.tagline}
                  </span>
                )}
              </span>
            </label>
          ))}

          <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-dashed border-border bg-background p-4 text-left transition-all duration-300 hover:border-clay/60 has-[:checked]:border-clay-deep has-[:checked]:border-solid has-[:checked]:bg-clay/10 has-[:focus-visible]:border-ring has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/40 sm:col-span-2">
            <input
              type="radio"
              name="booking-service"
              value={UNSURE}
              checked={value === UNSURE}
              onChange={() => onChange(UNSURE)}
              className="peer sr-only"
              aria-describedby={error ? "step-service-error" : undefined}
            />
            <span
              aria-hidden="true"
              className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border border-border bg-background peer-checked:border-clay-deep peer-checked:border-[6px]"
            />
            <span className="min-w-0">
              <span className="flex items-center gap-2 font-medium leading-snug text-foreground">
                <CircleHelp className="size-4 text-clay-deep" aria-hidden="true" />
                Not sure — help me decide
              </span>
              <span className="mt-1 block text-sm leading-relaxed text-muted-foreground">
                Tell us when suits you; the team will talk it through on the confirmation
                call.
              </span>
            </span>
          </label>
        </div>
      </fieldset>

      {error && (
        <p id="step-service-error" className="mt-3 text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
