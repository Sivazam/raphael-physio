"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "../_lib/client";
import type { DayHoursRow, SettingsForm as Form } from "../_lib/types";
import { DAY_NAMES } from "@/lib/content";

type FieldErrors = Record<string, string>;

function Field({
  id,
  label,
  error,
  children,
  hint,
  className,
}: {
  id: string;
  label: string;
  error?: string;
  children: React.ReactNode;
  hint?: string;
  className?: string;
}) {
  return (
    <div className={`grid gap-2 ${className ?? ""}`}>
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      {error ? (
        <p className="text-sm text-destructive" id={`${id}-error`}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function SettingsForm({ initial }: { initial: Form }) {
  const router = useRouter();
  const [form, setForm] = useState<Form>(initial);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);

  function set<K extends keyof Form>(key: K, value: Form[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function setDay(dayOfWeek: number, patch: Partial<DayHoursRow>) {
    setForm((f) => ({
      ...f,
      hours: f.hours.map((d) =>
        d.dayOfWeek === dayOfWeek ? { ...d, ...patch } : d
      ),
    }));
  }

  function updateSession(
    dayOfWeek: number,
    index: number,
    patch: Partial<{ start: string; end: string }>
  ) {
    setForm((f) => ({
      ...f,
      hours: f.hours.map((d) =>
        d.dayOfWeek === dayOfWeek
          ? {
              ...d,
              sessions: d.sessions.map((s, i) =>
                i === index ? { ...s, ...patch } : s
              ),
            }
          : d
      ),
    }));
  }

  function addSession(dayOfWeek: number) {
    setForm((f) => ({
      ...f,
      hours: f.hours.map((d) =>
        d.dayOfWeek === dayOfWeek
          ? {
              ...d,
              sessions:
                d.sessions.length >= 3
                  ? d.sessions
                  : [...d.sessions, { start: "09:00", end: "13:00" }],
            }
          : d
      ),
    }));
  }

  function removeSession(dayOfWeek: number, index: number) {
    setForm((f) => ({
      ...f,
      hours: f.hours.map((d) =>
        d.dayOfWeek === dayOfWeek
          ? { ...d, sessions: d.sessions.filter((_, i) => i !== index) }
          : d
      ),
    }));
  }

  async function save() {
    if (saving) return;
    setSaving(true);
    setErrors({});
    try {
      await apiFetch("/api/admin/settings", "PUT", form);
      toast.success("Clinic settings saved.");
      router.refresh();
    } catch (err) {
      const fields =
        (err as Error & { fieldErrors?: FieldErrors }).fieldErrors;
      if (fields) setErrors(fields);
      toast.error(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
      noValidate
      className="grid gap-6"
    >
      {/* Contact */}
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-xl">
            Contact details
          </CardTitle>
          <CardDescription>
            Shown on the website header, footer, contact page and printed
            handouts.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field id="phonePrimary" label="Primary phone" error={errors.phonePrimary}>
            <Input
              id="phonePrimary"
              value={form.phonePrimary}
              onChange={(e) => set("phonePrimary", e.target.value)}
              inputMode="tel"
              aria-invalid={Boolean(errors.phonePrimary)}
            />
          </Field>
          <Field
            id="phoneAlternate"
            label="Alternate phone (optional)"
            error={errors.phoneAlternate}
          >
            <Input
              id="phoneAlternate"
              value={form.phoneAlternate}
              onChange={(e) => set("phoneAlternate", e.target.value)}
              inputMode="tel"
              aria-invalid={Boolean(errors.phoneAlternate)}
            />
          </Field>
          <Field id="email" label="Email (optional)" error={errors.email}>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              aria-invalid={Boolean(errors.email)}
            />
          </Field>
          <Field
            id="mapsUrl"
            label="Google Maps link"
            error={errors.mapsUrl}
            hint="Opens the clinic's Maps listing."
          >
            <Input
              id="mapsUrl"
              value={form.mapsUrl}
              onChange={(e) => set("mapsUrl", e.target.value)}
              inputMode="url"
              aria-invalid={Boolean(errors.mapsUrl)}
            />
          </Field>
          <Field
            id="googleReviewsUrl"
            label="Google reviews link (optional)"
            error={errors.googleReviewsUrl}
          >
            <Input
              id="googleReviewsUrl"
              value={form.googleReviewsUrl}
              onChange={(e) => set("googleReviewsUrl", e.target.value)}
              inputMode="url"
              aria-invalid={Boolean(errors.googleReviewsUrl)}
            />
          </Field>
        </CardContent>
      </Card>

      {/* Address */}
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-xl">Address</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field id="addressLine1" label="Address line 1" error={errors.addressLine1}>
            <Input
              id="addressLine1"
              value={form.addressLine1}
              onChange={(e) => set("addressLine1", e.target.value)}
              aria-invalid={Boolean(errors.addressLine1)}
            />
          </Field>
          <Field id="addressLine2" label="Address line 2 (optional)" error={errors.addressLine2}>
            <Input
              id="addressLine2"
              value={form.addressLine2}
              onChange={(e) => set("addressLine2", e.target.value)}
            />
          </Field>
          <Field id="addressLine3" label="Address line 3 (optional)" error={errors.addressLine3}>
            <Input
              id="addressLine3"
              value={form.addressLine3}
              onChange={(e) => set("addressLine3", e.target.value)}
            />
          </Field>
          <Field id="city" label="City" error={errors.city}>
            <Input
              id="city"
              value={form.city}
              onChange={(e) => set("city", e.target.value)}
              aria-invalid={Boolean(errors.city)}
            />
          </Field>
          <Field id="state" label="State (optional)" error={errors.state}>
            <Input
              id="state"
              value={form.state}
              onChange={(e) => set("state", e.target.value)}
            />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field id="postcode" label="Postcode" error={errors.postcode}>
              <Input
                id="postcode"
                value={form.postcode}
                onChange={(e) => set("postcode", e.target.value)}
              />
            </Field>
            <Field id="country" label="Country" error={errors.country}>
              <Input
                id="country"
                value={form.country}
                onChange={(e) => set("country", e.target.value)}
              />
            </Field>
          </div>
        </CardContent>
      </Card>

      {/* Booking */}
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-xl">
            Booking configuration
          </CardTitle>
          <CardDescription>
            Controls the public booking page behaviour.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field id="bookingMode" label="Booking mode" error={errors.bookingMode}>
            <Select
              value={form.bookingMode}
              onValueChange={(v) => set("bookingMode", v as "internal" | "external")}
            >
              <SelectTrigger id="bookingMode" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="internal">
                  Internal request form (on this website)
                </SelectItem>
                <SelectItem value="external">
                  External booking link
                </SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field
            id="externalBookingUrl"
            label="External booking link"
            error={errors.externalBookingUrl}
            hint={
              form.bookingMode === "external"
                ? "Required when using an external booking system."
                : "Optional — ignored while internal mode is on."
            }
          >
            <Input
              id="externalBookingUrl"
              value={form.externalBookingUrl}
              onChange={(e) => set("externalBookingUrl", e.target.value)}
              inputMode="url"
              placeholder="https://…"
              aria-invalid={Boolean(errors.externalBookingUrl)}
            />
          </Field>
          <div className="grid grid-cols-2 gap-4 sm:col-span-2 lg:col-span-1">
            <Field
              id="minBookingDateOffset"
              label="Earliest bookable day (days from today)"
              error={errors.minBookingDateOffset}
            >
              <Input
                id="minBookingDateOffset"
                type="number"
                min={0}
                max={365}
                value={form.minBookingDateOffset}
                onChange={(e) =>
                  set("minBookingDateOffset", Number(e.target.value) || 0)
                }
                aria-invalid={Boolean(errors.minBookingDateOffset)}
              />
            </Field>
            <Field
              id="maxBookingDateOffset"
              label="Furthest bookable day"
              error={errors.maxBookingDateOffset}
            >
              <Input
                id="maxBookingDateOffset"
                type="number"
                min={1}
                max={365}
                value={form.maxBookingDateOffset}
                onChange={(e) =>
                  set("maxBookingDateOffset", Number(e.target.value) || 1)
                }
                aria-invalid={Boolean(errors.maxBookingDateOffset)}
              />
            </Field>
          </div>
          <Field
            id="slotDurationMinutes"
            label="Slot duration (minutes)"
            error={errors.slotDurationMinutes}
          >
            <Input
              id="slotDurationMinutes"
              type="number"
              min={5}
              max={120}
              step={5}
              value={form.slotDurationMinutes}
              onChange={(e) =>
                set("slotDurationMinutes", Number(e.target.value) || 30)
              }
              aria-invalid={Boolean(errors.slotDurationMinutes)}
            />
          </Field>
          <div className="flex items-center justify-between gap-4 rounded-lg border p-4 sm:col-span-2">
            <div className="grid gap-1">
              <Label htmlFor="sundayBookingEnabled">
                Allow Sunday booking requests
              </Label>
              <p className="text-xs text-muted-foreground">
                Off by default — the clinic is closed on Sundays. Turn on only
                if the clinic decides to accept Sunday requests.
              </p>
            </div>
            <Switch
              id="sundayBookingEnabled"
              checked={form.sundayBookingEnabled}
              onCheckedChange={(v) => set("sundayBookingEnabled", v)}
              aria-label="Allow Sunday booking requests"
            />
          </div>
          <Field
            id="bookingNotes"
            label="Note shown on the booking page (optional)"
            error={errors.bookingNotes}
            className="sm:col-span-2"
          >
            <Textarea
              id="bookingNotes"
              rows={3}
              value={form.bookingNotes}
              onChange={(e) => set("bookingNotes", e.target.value)}
              placeholder="e.g. Please arrive 10 minutes early for your first visit."
            />
          </Field>
        </CardContent>
      </Card>

      {/* Socials */}
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-xl">Social links</CardTitle>
          <CardDescription>
            Empty fields stay hidden on the website — only add profiles the
            clinic has confirmed.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field id="facebookUrl" label="Facebook URL" error={errors.facebookUrl}>
            <Input
              id="facebookUrl"
              value={form.facebookUrl}
              onChange={(e) => set("facebookUrl", e.target.value)}
              inputMode="url"
              placeholder="https://facebook.com/…"
            />
          </Field>
          <Field id="instagramUrl" label="Instagram URL" error={errors.instagramUrl}>
            <Input
              id="instagramUrl"
              value={form.instagramUrl}
              onChange={(e) => set("instagramUrl", e.target.value)}
              inputMode="url"
              placeholder="https://instagram.com/…"
            />
          </Field>
          <Field id="linkedinUrl" label="LinkedIn URL" error={errors.linkedinUrl}>
            <Input
              id="linkedinUrl"
              value={form.linkedinUrl}
              onChange={(e) => set("linkedinUrl", e.target.value)}
              inputMode="url"
              placeholder="https://linkedin.com/…"
            />
          </Field>
          <Field id="youtubeUrl" label="YouTube URL" error={errors.youtubeUrl}>
            <Input
              id="youtubeUrl"
              value={form.youtubeUrl}
              onChange={(e) => set("youtubeUrl", e.target.value)}
              inputMode="url"
              placeholder="https://youtube.com/…"
            />
          </Field>
        </CardContent>
      </Card>

      {/* Operating hours */}
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-xl">Operating hours</CardTitle>
          <CardDescription>
            Open days need at least one session. Times are clinic-local
            (Asia/Kolkata).
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {form.hours.map((day) => (
            <fieldset
              key={day.dayOfWeek}
              className="grid gap-3 rounded-lg border p-4"
              aria-label={`${DAY_NAMES[day.dayOfWeek]} hours`}
            >
              <div className="flex items-center justify-between gap-4">
                <legend className="px-1 font-medium">
                  {DAY_NAMES[day.dayOfWeek]}
                </legend>
                <div className="flex items-center gap-2">
                  <Label
                    htmlFor={`day-open-${day.dayOfWeek}`}
                    className="text-sm text-muted-foreground"
                  >
                    {day.isOpen ? "Open" : "Closed"}
                  </Label>
                  <Switch
                    id={`day-open-${day.dayOfWeek}`}
                    checked={day.isOpen}
                    onCheckedChange={(v) => setDay(day.dayOfWeek, { isOpen: v })}
                    aria-label={`${DAY_NAMES[day.dayOfWeek]} open or closed`}
                  />
                </div>
              </div>

              {day.isOpen ? (
                day.sessions.length === 0 ? (
                  <p className="text-sm text-destructive">
                    Add at least one session for an open day.
                  </p>
                ) : (
                  <div className="grid gap-2">
                    {day.sessions.map((session, index) => (
                      <div
                        key={index}
                        className="flex flex-wrap items-center gap-2"
                      >
                        <Input
                          type="time"
                          value={session.start}
                          onChange={(e) =>
                            updateSession(day.dayOfWeek, index, {
                              start: e.target.value,
                            })
                          }
                          aria-label={`${DAY_NAMES[day.dayOfWeek]} session ${index + 1} start`}
                          className="w-32"
                        />
                        <span aria-hidden="true" className="text-muted-foreground">
                          to
                        </span>
                        <Input
                          type="time"
                          value={session.end}
                          onChange={(e) =>
                            updateSession(day.dayOfWeek, index, {
                              end: e.target.value,
                            })
                          }
                          aria-label={`${DAY_NAMES[day.dayOfWeek]} session ${index + 1} end`}
                          className="w-32"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeSession(day.dayOfWeek, index)}
                          aria-label={`Remove ${DAY_NAMES[day.dayOfWeek]} session ${index + 1}`}
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="size-4" aria-hidden="true" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )
              ) : null}

              {day.isOpen && day.sessions.length < 3 ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addSession(day.dayOfWeek)}
                  className="w-fit"
                >
                  <Plus className="size-4" aria-hidden="true" />
                  Add session
                </Button>
              ) : null}
            </fieldset>
          ))}
          {errors.hours ? (
            <p className="text-sm text-destructive">{errors.hours}</p>
          ) : null}
        </CardContent>
      </Card>

      {/* Save bar */}
      <div className="sticky bottom-4 flex items-center justify-end gap-3 rounded-xl border bg-background/95 p-3 backdrop-blur">
        <p className="mr-auto text-sm text-muted-foreground">
          Changes apply site-wide after saving.
        </p>
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save settings"}
        </Button>
      </div>
    </form>
  );
}
