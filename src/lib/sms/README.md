# SMS notification library (`src/lib/sms`)

Server-only SMS queue for appointment notifications at Raphael Physiotherapy
& Rehabilitation Centre. Three modules:

| File | Role |
|---|---|
| `provider.ts` | Transport adapter (`generic_http`) + credential checks. Env-only config. |
| `templates.ts` | The message catalogue — every outbound wording lives here. |
| `queue.ts` | `enqueueSms()` + `processSmsQueue()` — job lifecycle in the `SmsJob` table. |

**This library is intentionally not wired into any route yet.** Agent D owns
the booking flow; the orchestrator should call `enqueueSms` from D's booking
API once both have shipped (see “Wiring it up” below). Agent E owns admin
APIs — a future `POST /api/admin/sms/process` (or a cron) should call
`processSmsQueue()`.

## Honesty contract

- **No credentials → no pretend sends.** When SMS is not configured, jobs
  transition to `skipped_unconfigured` with an explicit error such as
  *“SMS provider not configured — SMS_PROVIDER is not set. No message was
  sent.”* The status `sent` is written only after a real gateway accepted the
  message. (`skipped_unconfigured` is the status the Prisma schema reserves
  for exactly this case — see the `SmsJob` model comment.)
- Failures are stored on the job row (`error`) and never hidden. Failed jobs
  are **not auto-retried** — a patient must never receive duplicate messages;
  re-queueing is a deliberate admin action.
- Messages carry **no clinical detail**: patient first name, appointment
  date/time, clinic phone. No service, condition or note text ever enters an
  SMS (master plan §9 privacy requirement).

## Environment variables

| Variable | Required | Meaning |
|---|---|---|
| `SMS_PROVIDER` | yes | Adapter key. Only `generic_http` is implemented. Any other value (e.g. `msg91`) is treated as **not configured** — an honest skip, never a fake send. |
| `SMS_API_URL` | yes | Gateway endpoint URL (http/https). Request shape: `POST` JSON `{ "to": string, "message": string, "sender"?: string }` with header `Authorization: Bearer <SMS_API_KEY>`. |
| `SMS_API_KEY` | yes | Bearer credential for the gateway. Server-side only; never logged, never sent to the browser. |
| `SMS_SENDER_ID` | no | 6-character DLT-registered sender ID, passed as `sender` in the payload. |

Notes:

- `ClinicSetting.smsProvider` (default `"msg91"`) is an admin-side preference
  only — the runtime adapter is chosen by `SMS_PROVIDER`. When a dedicated
  MSG91 adapter is written it can honour both.
- `ClinicSetting.smsReminderHours` (default 24) is the reminder lead time the
  booking flow should use when enqueuing `reminder` jobs.
- A 2xx response counts as sent; common id fields (`id`, `message_id`,
  `request_id`, nested `data.id`) are captured into `SmsJob.providerMessageId`
  when present.

## Job lifecycle

```
enqueueSms()                     processSmsQueue()
      │                                 │
      ▼                                 ▼
  [queued] ── due? ──► render message ──► provider configured?
                          │                     │
                          │              no ────┴──► [skipped_unconfigured]
                          │              yes
                          ▼                     ▼
                     sendSms() ── ok ──► [sent]  (attempts +1, sentAt set)
                          │
                          └── fail ──► [failed]  (attempts +1, error stored)
```

- `enqueueSms({ appointmentId, type, recipientPhone, scheduledFor? })` —
  validates the type against `SMS_JOB_TYPES` (`request_received`,
  `appointment_confirmed`, `reminder`, `rescheduled`, `cancelled`) and the
  phone shape (7–15 digits), then writes a `queued` row. Returns
  `{ ok: true, jobId }` or `{ ok: false, error }`; never throws.
- `processSmsQueue(limit = 10)` — picks due `queued` jobs (oldest first,
  capped at 50), renders each message from the linked `AppointmentRequest`,
  and transitions statuses as above. Returns a summary
  `{ processed, sent, failed, skippedUnconfigured, errors }`. Never throws.

## Message templates & India DLT requirements

All wording lives in `templates.ts` (e.g. *“we've received your appointment
request … We'll call you to confirm”* — request language, never a false
confirmation). Before production sending in India the clinic must:

1. Choose a provider (MSG91, Textlocal, Kaleyra, etc.) and register on the
   TRAI **DLT** portal as an entity; register the **sender ID** (6 chars).
2. Register the **final template content** for each message type — the texts
   in `templates.ts` are starting points and must be approved verbatim.
3. Obtain the gateway API credentials and set the env vars above.
4. Confirm per-message costs and any rate limits with the provider.

Until all of that is done, leave `SMS_PROVIDER` unset — the queue then
records honest `skipped_unconfigured` jobs so staff can see what *would*
have been sent.

## Wiring it up (orchestrator note)

```ts
// In agent D's booking API, after the AppointmentRequest row is created:
import { enqueueSms } from "@/lib/sms/queue";

await enqueueSms({
  appointmentId: request.id,
  type: "request_received",
  recipientPhone: request.phone,
});

// Later, when staff confirm / reschedule / cancel (agent E's admin API):
await enqueueSms({ appointmentId, type: "appointment_confirmed", recipientPhone });

// Reminder (e.g. 24h ahead — use ClinicSetting.smsReminderHours):
await enqueueSms({
  appointmentId,
  type: "reminder",
  recipientPhone,
  scheduledFor: reminderTime,
});

// Processing — call from an admin endpoint or cron (agent E's territory):
import { processSmsQueue } from "@/lib/sms/queue";
const summary = await processSmsQueue();
```

## Adding a real provider adapter

`provider.ts` exports the seam: implement `sendSms()` for a provider-specific
protocol (e.g. MSG91's flow API with its own auth + template ids), extend the
`SMS_PROVIDER` switch in `getSmsConfigurationIssue()`, and keep the same
`SmsSendResult` contract. Nothing else in the app needs to change.
