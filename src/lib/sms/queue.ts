/**
 * SMS job queue — SERVER-ONLY module.
 *
 * Persists outbound notification jobs in the `SmsJob` table and processes
 * them honestly:
 * - `enqueueSms(...)` writes a job with status "queued".
 * - `processSmsQueue()` renders the message from the linked appointment and
 *   attempts a real send via the provider adapter.
 *   - No provider credentials → the job moves to "skipped_unconfigured"
 *     with an honest error. It is NEVER marked "sent". (This status is
 *     defined by prisma/schema.prisma specifically for this case.)
 *   - Send failure → "failed" with the gateway's error; failed jobs are not
 *     auto-retried, so a patient never receives duplicates.
 *
 * NOTE ON THE ORIGINAL BRIEF: the task description sketched
 * `enqueueSms({phone, message, kind})`, but the orchestrator-owned schema
 * (read-only for this agent) defines SmsJob as appointment-linked
 * (appointmentId required, type from a fixed set, no free-text message
 * column). The queue therefore follows the schema; message text is rendered
 * by `templates.ts` from the appointment itself.
 *
 * USAGE (for booking flows — see src/lib/sms/README.md):
 *   import { enqueueSms } from "@/lib/sms/queue";
 *   await enqueueSms({
 *     appointmentId: request.id,
 *     type: "request_received",
 *     recipientPhone: request.phone,
 *   });
 *
 * This library is intentionally NOT wired into booking (agent D owns the
 * booking routes). The orchestrator should connect D's flow to enqueueSms
 * once both agents have shipped.
 */

import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getSmsConfigurationIssue, sendSms } from "./provider";
import { composeSmsMessage, SMS_JOB_TYPES, type SmsJobType } from "./templates";

/** Statuses exactly as stored in SmsJob.status (see prisma/schema.prisma). */
export const SMS_JOB_STATUSES = [
  "queued",
  "sent",
  "failed",
  "skipped_unconfigured",
] as const;

export type SmsJobStatus = (typeof SMS_JOB_STATUSES)[number];

export interface EnqueueSmsInput {
  /** The AppointmentRequest this notification belongs to (required by schema). */
  appointmentId: string;
  /** What happened — drives the message template. */
  type: SmsJobType;
  /** Patient's phone as captured on the appointment request. */
  recipientPhone: string;
  /** Optional future time to send (reminders). Null/undefined = as soon as processed. */
  scheduledFor?: Date | null;
}

export type EnqueueSmsResult =
  | { ok: true; jobId: string }
  | { ok: false; error: string };

/**
 * Queue an SMS notification job. Validates the type and phone shape, then
 * writes a "queued" row. Never throws — failures return { ok: false }.
 * Does NOT send anything; sending happens in processSmsQueue().
 */
export async function enqueueSms(
  input: EnqueueSmsInput
): Promise<EnqueueSmsResult> {
  const appointmentId = input.appointmentId?.trim();
  if (!appointmentId) {
    return { ok: false, error: "enqueueSms: appointmentId is required." };
  }
  if (!SMS_JOB_TYPES.includes(input.type)) {
    return {
      ok: false,
      error: `enqueueSms: unknown job type "${input.type}".`,
    };
  }
  const digits = input.recipientPhone?.replace(/[^\d]/g, "") ?? "";
  if (digits.length < 7 || digits.length > 15) {
    return {
      ok: false,
      error: `enqueueSms: recipient phone "${(input.recipientPhone ?? "").slice(0, 20)}" does not look like a valid number.`,
    };
  }

  try {
    const job = await db.smsJob.create({
      data: {
        appointmentId,
        type: input.type,
        recipientPhone: input.recipientPhone.trim(),
        status: "queued",
        scheduledFor: input.scheduledFor ?? null,
      },
    });
    return { ok: true, jobId: job.id };
  } catch (err) {
    const reason = err instanceof Error ? err.message : "database write failed";
    return { ok: false, error: `enqueueSms: ${reason.slice(0, 200)}` };
  }
}

export interface SmsQueueRunSummary {
  /** Jobs examined this run. */
  processed: number;
  sent: number;
  failed: number;
  /** Jobs skipped because no provider is configured (honest no-op). */
  skippedUnconfigured: number;
  /** Secret-free error strings, one per non-sent job (also stored on rows). */
  errors: string[];
}

/**
 * Process due queued SMS jobs — the helper an admin endpoint or cron should
 * call later. (No route is wired here on purpose: agent E owns admin APIs.)
 *
 * Behaviour:
 * - Picks up "queued" jobs whose scheduledFor has passed (or is null),
 *   oldest first, up to `limit`.
 * - Renders each message from the linked appointment via templates.ts.
 * - Provider not configured → job becomes "skipped_unconfigured" with an
 *   honest error; attempts is NOT incremented (nothing was attempted).
 * - Successful send → "sent" + sentAt + providerMessageId; attempts++.
 * - Failed send → "failed" + error; attempts++. Never auto-retried, so a
 *   retry can only happen through a deliberate admin action.
 * - Jobs whose linked appointment disappeared are marked "failed" honestly.
 *
 * Never throws.
 */
export async function processSmsQueue(limit = 10): Promise<SmsQueueRunSummary> {
  const summary: SmsQueueRunSummary = {
    processed: 0,
    sent: 0,
    failed: 0,
    skippedUnconfigured: 0,
    errors: [],
  };

  let jobs: Prisma.SmsJobGetPayload<{ include: { appointment: true } }>[] = [];
  try {
    jobs = await db.smsJob.findMany({
      where: {
        status: "queued",
        OR: [{ scheduledFor: null }, { scheduledFor: { lte: new Date() } }],
      },
      orderBy: { createdAt: "asc" },
      take: Math.max(1, Math.min(50, limit)),
      include: { appointment: true },
    });
  } catch (err) {
    const reason = err instanceof Error ? err.message : "database read failed";
    summary.errors.push(`Queue read failed: ${reason.slice(0, 200)}`);
    return summary;
  }

  const configurationIssue = getSmsConfigurationIssue();

  for (const job of jobs) {
    summary.processed += 1;

    if (!job.appointment) {
      // Defensive: the FK cascades deletes, so this should not occur.
      const error = "Linked appointment no longer exists — message not sent.";
      await updateJob(job.id, { status: "failed", error }, summary.errors);
      summary.failed += 1;
      summary.errors.push(error);
      continue;
    }

    const message = composeSmsMessage(job.type as SmsJobType, {
      patientName: job.appointment.patientName,
      appointmentDate: job.appointment.appointmentDate,
      appointmentSlot: job.appointment.appointmentSlot,
    });

    if (configurationIssue) {
      // Honest no-op: nothing was attempted and nothing was sent.
      await updateJob(
        job.id,
        { status: "skipped_unconfigured", error: configurationIssue },
        summary.errors
      );
      summary.skippedUnconfigured += 1;
      summary.errors.push(configurationIssue);
      continue;
    }

    const result = await sendSms({
      to: job.recipientPhone,
      message,
    });

    if (result.ok) {
      await updateJob(job.id, {
        status: "sent",
        error: null,
        attempts: { increment: 1 },
        sentAt: new Date(),
        providerMessageId: result.providerMessageId,
      }, summary.errors);
      summary.sent += 1;
    } else {
      await updateJob(job.id, {
        status: "failed",
        error: result.error,
        attempts: { increment: 1 },
      }, summary.errors);
      summary.failed += 1;
      summary.errors.push(result.error);
    }
  }

  return summary;
}

type JobUpdate = Parameters<typeof db.smsJob.update>[0]["data"];

/** Update one job row; a bookkeeping failure is recorded, never thrown. */
async function updateJob(
  jobId: string,
  data: JobUpdate,
  errors: string[]
): Promise<void> {
  try {
    await db.smsJob.update({ where: { id: jobId }, data });
  } catch (err) {
    const reason =
      err instanceof Error ? err.message : "database update failed";
    errors.push(`Job update failed: ${reason.slice(0, 200)}`);
  }
}
