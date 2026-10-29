"use client";

import { useState, type FormEvent } from "react";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const TOPIC_OPTIONS = [
  { value: "appointment", label: "An appointment" },
  { value: "enquiry", label: "A general enquiry" },
  { value: "feedback", label: "Feedback" },
  { value: "other", label: "Something else" },
] as const;

interface FormValues {
  name: string;
  phone: string;
  email: string;
  topic: string;
  message: string;
}

const EMPTY: FormValues = { name: "", phone: "", email: "", topic: "", message: "" };

/**
 * Contact form for /contact. Posts JSON to /api/contact (never a server
 * action). All validation is authoritative on the server; the client mirrors
 * the same rules for quick feedback and shows sonner toasts plus an
 * aria-live status for async results.
 */
export function ContactForm() {
  const [values, setValues] = useState<FormValues>(EMPTY);
  const [honeypot, setHoneypot] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<string>("");

  function setField<K extends keyof FormValues>(key: K, value: string) {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => {
      if (!e[key]) return e;
      const next = { ...e };
      delete next[key];
      return next;
    });
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;

    setErrors({});
    setFormError(null);

    // Quick client-side mirror of the server rules — the server remains the
    // source of truth.
    const local: Record<string, string> = {};
    if (values.name.trim().length < 2) local.name = "Please enter your name.";
    if (values.phone.replace(/[^\d]/g, "").length < 7)
      local.phone = "Please enter a phone number we can reach you on.";
    if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(values.email.trim()))
      local.email = "That email address doesn't look right — or leave it empty.";
    if (!values.topic) local.topic = "Please choose what your message is about.";
    if (values.message.trim().length < 10)
      local.message = "Please write a little more so we can help.";
    if (Object.keys(local).length > 0) {
      setErrors(local);
      setStatus("Please check the highlighted fields.");
      toast.error("Please check the highlighted fields and try again.");
      return;
    }

    setSubmitting(true);
    setStatus("Sending your message…");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...values, website: honeypot }),
      });
      const data: { ok?: boolean; error?: string; fieldErrors?: Record<string, string> } =
        await res.json().catch(() => ({}));

      if (res.ok && data.ok) {
        setValues(EMPTY);
        setHoneypot("");
        setStatus("Message sent. The clinic team will see it during working hours.");
        toast.success("Message sent — thank you. We'll reply during working hours.");
      } else {
        const fieldErrors = data.fieldErrors ?? {};
        setErrors(fieldErrors);
        const message =
          data.error ?? "We couldn't send your message. Please try again, or call us.";
        setFormError(Object.keys(fieldErrors).length > 0 ? null : message);
        setStatus(message);
        toast.error(message);
      }
    } catch {
      const message =
        "We couldn't send your message — please check your connection, or call the centre instead.";
      setFormError(message);
      setStatus(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  const fieldHint = (key: string) =>
    errors[key] ? `${key}-error` : undefined;

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      {/* Screen-reader + assistive announcement of async results */}
      <p role="status" aria-live="polite" className="sr-only">
        {status}
      </p>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="contact-name">Your name *</Label>
          <Input
            id="contact-name"
            name="name"
            autoComplete="name"
            required
            value={values.name}
            onChange={(e) => setField("name", e.target.value)}
            aria-invalid={Boolean(errors.name)}
            aria-describedby={fieldHint("name")}
            className="h-11"
            placeholder="e.g. Ramesh Kumar"
          />
          {errors.name && (
            <p id="contact-name-error" className="text-sm text-destructive">
              {errors.name}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="contact-phone">Phone number *</Label>
          <Input
            id="contact-phone"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            required
            value={values.phone}
            onChange={(e) => setField("phone", e.target.value)}
            aria-invalid={Boolean(errors.phone)}
            aria-describedby={fieldHint("phone")}
            className="h-11"
            placeholder="So we can call you back"
          />
          {errors.phone ? (
            <p id="contact-phone-error" className="text-sm text-destructive">
              {errors.phone}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              We reply by phone during working hours.
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="contact-email">Email (optional)</Label>
          <Input
            id="contact-email"
            name="email"
            type="email"
            autoComplete="email"
            value={values.email}
            onChange={(e) => setField("email", e.target.value)}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={fieldHint("email")}
            className="h-11"
            placeholder="you@example.com"
          />
          {errors.email && (
            <p id="contact-email-error" className="text-sm text-destructive">
              {errors.email}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="contact-topic">What is this about? *</Label>
          <Select
            name="topic"
            required
            value={values.topic}
            onValueChange={(v) => setField("topic", v)}
          >
            <SelectTrigger
              id="contact-topic"
              className="h-11 w-full"
              aria-invalid={Boolean(errors.topic)}
              aria-describedby={fieldHint("topic")}
            >
              <SelectValue placeholder="Choose a topic" />
            </SelectTrigger>
            <SelectContent>
              {TOPIC_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.topic && (
            <p id="contact-topic-error" className="text-sm text-destructive">
              {errors.topic}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="contact-message">Your message *</Label>
        <Textarea
          id="contact-message"
          name="message"
          required
          rows={5}
          value={values.message}
          onChange={(e) => setField("message", e.target.value)}
          aria-invalid={Boolean(errors.message)}
          aria-describedby={fieldHint("message")}
          className="min-h-32"
          placeholder="A few lines about what you need — no medical details are required."
        />
        {errors.message && (
          <p id="contact-message-error" className="text-sm text-destructive">
            {errors.message}
          </p>
        )}
      </div>

      {/* Honeypot — invisible to humans, irresistible to bots. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <Label htmlFor="contact-website">Company website</Label>
        <Input
          id="contact-website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
        />
      </div>

      {formError && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {formError}
        </p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          type="submit"
          disabled={submitting}
          className="btn btn-gold h-12 text-[12px] disabled:pointer-events-none disabled:opacity-60"
        >
          <span className="btn-sweep" aria-hidden="true" />
          {submitting ? (
            <>
              <Loader2 className="relative h-4 w-4 animate-spin" aria-hidden="true" />
              Sending…
            </>
          ) : (
            <>
              <Send className="relative h-4 w-4" aria-hidden="true" />
              Send message
            </>
          )}
        </button>
        <p className="text-xs leading-relaxed text-muted-foreground">
          By sending, you agree we may contact you about your message. See our{" "}
          <a
            href="/privacy"
            className="link-sweep font-semibold text-clay-deep"
          >
            privacy page
          </a>
          .
        </p>
      </div>
    </form>
  );
}
