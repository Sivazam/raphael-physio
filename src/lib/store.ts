/**
 * Dual-path persistence — local SQLite (Prisma) first, Firestore REST second.
 *
 * WHY: the clinic's SQLite database is a git-ignored local file; deployments
 * on Vercel (and any host without the database wired up) have no database at
 * all. Until now every DB-bound feature degraded to empty lists or failed
 * closed there — including ADMIN SIGN-IN, which is what this layer fixes.
 * The clinic's Firebase project (test mode, open rules) is reachable over
 * plain HTTPS, so it becomes the hosted datastore for exactly those
 * deployments:
 *
 *   - local dev / any host with the database  →  Prisma, byte-for-byte the
 *     queries the pages and routes used before (zero behaviour change);
 *   - serverless without a database           →  Firestore collections that
 *     scripts/firestore-seed.ts mirrors from the local database
 *     (services, exercises, categories, team, stories, hours, config, admins)
 *     plus live collections for appointment requests and contact messages.
 *
 * Rules of the layer:
 *   - READS never throw — they degrade to empty/baked exactly like the old
 *     per-page `.catch(() => [])` guards (an outage must never 500 a page);
 *   - WRITES throw on failure — a submission or an admin edit must never
 *     pretend to succeed (routes translate that to honest 500s);
 *   - the availability/conflict reads are UNCACHED (double-booking safety);
 *   - everything Firestore lives behind a short per-process TTL cache that
 *     writes invalidate, so admin tables stay fresh without hammering Google.
 */

import { db } from "@/lib/db";
import { parseJsonArray } from "@/lib/content";
import {
  fsCreate,
  fsDelete,
  fsGet,
  fsList,
  fsQuery,
  fsSet,
  fsUpdate,
  type FsDoc,
} from "@/lib/firestore-rest";
import type {
  AppointmentRow,
  DayHoursRow,
  ExerciseRow,
  MessageRow,
  OptionItem,
  ServiceRow,
  StoryRow,
  TherapistRow,
} from "@/app/admin/_lib/types";
import type { Session } from "@/lib/content";

/* ------------------------------------------------------------ mode probe */

let dbProbe: Promise<boolean> | null = null;

/**
 * True when the local SQLite database answers a trivial query. Probed once
 * per process and cached: a healthy dev machine never touches Firestore,
 * a serverless deployment never touches Prisma after the first probe.
 */
export function dbReachable(): Promise<boolean> {
  dbProbe ??= db.clinicSetting
    .count()
    .then(() => true)
    .catch(() => false);
  return dbProbe;
}

/** Today's date as "YYYY-MM-DD" in the clinic timezone (Asia/Kolkata). */
function todayYmdClinic(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/* --------------------------------------------------------- decode helpers */

function asString(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}
function asNullableString(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}
function asNumber(v: unknown, fallback: number): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}
function asNullableNumber(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}
function asBool(v: unknown, fallback = false): boolean {
  return typeof v === "boolean" ? v : fallback;
}
function asDate(v: unknown): Date {
  if (v instanceof Date) return v;
  if (typeof v === "string") {
    const d = new Date(v);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return new Date(0);
}

/* ------------------------------------------------------------ TTL caching */

const CONTENT_TTL_MS = 15_000;
const CONFIG_TTL_MS = 60_000;
const FAILURE_TTL_MS = 5_000;

const listCache = new Map<
  string,
  { at: number; ttl: number; docs: FsDoc[] }
>();

async function listCached(
  collection: string,
  ttl = CONTENT_TTL_MS
): Promise<FsDoc[]> {
  const hit = listCache.get(collection);
  if (hit && Date.now() - hit.at < hit.ttl) return hit.docs;
  try {
    const docs = await fsList(collection);
    listCache.set(collection, { at: Date.now(), ttl, docs });
    return docs;
  } catch {
    // Outage: serve emptiness for a SHORT window so every request does not
    // wait on a timeout — reads degrade, writes still throw.
    listCache.set(collection, { at: Date.now(), ttl: FAILURE_TTL_MS, docs: [] });
    return [];
  }
}

function invalidate(...collections: string[]) {
  for (const c of collections) listCache.delete(c);
}

/* ============================================================== appointments */

export interface AppointmentRecord {
  id: string;
  patientName: string;
  phone: string;
  email: string | null;
  serviceId: string | null;
  serviceName: string | null;
  appointmentDate: string;
  appointmentSlot: string;
  notes: string | null;
  consentGiven: boolean;
  status: string;
  adminNote: string | null;
  createdAt: Date;
  updatedAt: Date;
}

function docToAppointment(doc: FsDoc): AppointmentRecord {
  const d = doc.data;
  return {
    id: doc.id,
    patientName: asString(d.patientName),
    phone: asString(d.phone),
    email: asNullableString(d.email),
    serviceId: asNullableString(d.serviceId),
    serviceName: asNullableString(d.serviceName),
    appointmentDate: asString(d.appointmentDate),
    appointmentSlot: asString(d.appointmentSlot),
    notes: asNullableString(d.notes),
    consentGiven: asBool(d.consentGiven),
    status: asString(d.status, "requested"),
    adminNote: asNullableString(d.adminNote),
    createdAt: asDate(d.createdAt),
    updatedAt: asDate(d.updatedAt),
  };
}

function prismaAppointmentToRow(r: AppointmentRecord): AppointmentRow {
  return {
    id: r.id,
    patientName: r.patientName,
    phone: r.phone,
    email: r.email,
    serviceName: r.serviceName,
    appointmentDate: r.appointmentDate,
    appointmentSlot: r.appointmentSlot,
    notes: r.notes,
    consentGiven: r.consentGiven,
    status: r.status,
    adminNote: r.adminNote,
    createdAt: r.createdAt.toISOString(),
  };
}

function sortAppointmentsDesc(a: AppointmentRecord, b: AppointmentRecord) {
  return b.createdAt.getTime() - a.createdAt.getTime();
}

/** Admin table read: newest 200, optional status filter. Never throws. */
export async function listAppointmentRows(
  filter?: { status?: string }
): Promise<AppointmentRow[]> {
  if (await dbReachable()) {
    try {
      const rows = await db.appointmentRequest.findMany({
        where: filter?.status ? { status: filter.status } : {},
        orderBy: { createdAt: "desc" },
        take: 200,
      });
      return rows.map(prismaAppointmentToRow);
    } catch {
      return [];
    }
  }
  try {
    const docs = await listCached("appointments");
    return docs
      .map(docToAppointment)
      .filter((r) => !filter?.status || r.status === filter.status)
      .sort(sortAppointmentsDesc)
      .slice(0, 200)
      .map(prismaAppointmentToRow);
  } catch {
    return [];
  }
}

export interface NewAppointmentInput {
  patientName: string;
  phone: string;
  email: string | null;
  serviceId: string | null;
  serviceName: string | null;
  appointmentDate: string;
  appointmentSlot: string;
  notes: string | null;
  consentGiven: boolean;
  status: string;
  adminNote: string | null;
}

/**
 * Creates an appointment REQUEST. Returns { created: false } when the slot
 * was just taken by someone else; THROWS when the store itself failed (the
 * booking route turns that into an honest 500). The local path keeps the
 * original transactional conflict re-check; the Firestore path re-lists the
 * day's appointments immediately before creating (millisecond race window,
 * documented — Firestore has no unique constraint to close it fully).
 */
export async function createAppointmentRequest(
  input: NewAppointmentInput
): Promise<{ created: boolean }> {
  if (await dbReachable()) {
    return db.$transaction(async (tx) => {
      const conflict = await tx.appointmentRequest.findFirst({
        where: {
          appointmentDate: input.appointmentDate,
          appointmentSlot: input.appointmentSlot,
          status: { not: "cancelled" },
        },
        select: { id: true },
      });
      if (conflict) return { created: false };
      await tx.appointmentRequest.create({ data: input });
      return { created: true };
    });
  }
  const dayDocs = await fsQuery("appointments", [
    { field: "appointmentDate", op: "EQUAL", value: input.appointmentDate },
  ]);
  const conflict = dayDocs.some(
    (d) =>
      asString(d.data.appointmentSlot) === input.appointmentSlot &&
      asString(d.data.status) !== "cancelled"
  );
  if (conflict) return { created: false };
  const now = new Date();
  await fsCreate("appointments", { ...input, createdAt: now, updatedAt: now });
  invalidate("appointments");
  return { created: true };
}

/** One appointment by id (for PATCH/DELETE routes). Throws on store failure. */
export async function getAppointmentRecord(
  id: string
): Promise<AppointmentRecord | null> {
  if (await dbReachable()) {
    const row = await db.appointmentRequest.findUnique({ where: { id } });
    return row;
  }
  const doc = await fsGet("appointments", id);
  return doc ? docToAppointment(doc) : null;
}

/** Partial update; null when the record does not exist. Throws on failure. */
export async function updateAppointmentFields(
  id: string,
  fields: { status?: string; adminNote?: string | null }
): Promise<AppointmentRecord | null> {
  if (await dbReachable()) {
    return db.appointmentRequest.update({ where: { id }, data: fields });
  }
  const existing = await fsGet("appointments", id);
  if (!existing) return null;
  const doc = await fsUpdate("appointments", id, {
    ...fields,
    updatedAt: new Date(),
  });
  invalidate("appointments");
  return docToAppointment(doc);
}

/** True when deleted, false when the record did not exist. Throws on failure. */
export async function deleteAppointmentRecord(id: string): Promise<boolean> {
  if (await dbReachable()) {
    await db.appointmentRequest.delete({ where: { id } });
    return true;
  }
  const deleted = await fsDelete("appointments", id);
  invalidate("appointments");
  return deleted;
}

/**
 * Taken (non-cancelled) slot starts for a date — UNCACHED, used by the
 * availability engine right before a booking decision. Throws on failure so
 * the route can answer honestly instead of showing phantom free slots.
 */
export async function takenSlotsForDate(
  dateISO: string,
  freeingStatus: string
): Promise<Set<string>> {
  if (await dbReachable()) {
    const rows = await db.appointmentRequest.findMany({
      where: { appointmentDate: dateISO, status: { not: freeingStatus } },
      select: { appointmentSlot: true },
    });
    return new Set(rows.map((r) => r.appointmentSlot));
  }
  const docs = await fsQuery("appointments", [
    { field: "appointmentDate", op: "EQUAL", value: dateISO },
  ]);
  return new Set(
    docs
      .filter((d) => asString(d.data.status) !== freeingStatus)
      .map((d) => asString(d.data.appointmentSlot))
  );
}

/* ================================================================= messages */

export interface MessageRecord {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  message: string;
  status: string;
  createdAt: Date;
}

function docToMessage(doc: FsDoc): MessageRecord {
  const d = doc.data;
  return {
    id: doc.id,
    name: asString(d.name),
    phone: asNullableString(d.phone),
    email: asNullableString(d.email),
    message: asString(d.message),
    status: asString(d.status, "new"),
    createdAt: asDate(d.createdAt),
  };
}

function prismaMessageToRow(m: MessageRecord): MessageRow {
  return {
    id: m.id,
    name: m.name,
    phone: m.phone,
    email: m.email,
    message: m.message,
    status: m.status,
    createdAt: m.createdAt.toISOString(),
  };
}

/** Admin table read: newest 200, optional status filter. Never throws. */
export async function listMessageRows(
  filter?: { status?: string }
): Promise<MessageRow[]> {
  if (await dbReachable()) {
    try {
      const rows = await db.contactMessage.findMany({
        where: filter?.status ? { status: filter.status } : {},
        orderBy: { createdAt: "desc" },
        take: 200,
      });
      return rows.map(prismaMessageToRow);
    } catch {
      return [];
    }
  }
  try {
    const docs = await listCached("messages");
    return docs
      .map(docToMessage)
      .filter((m) => !filter?.status || m.status === filter.status)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 200)
      .map(prismaMessageToRow);
  } catch {
    return [];
  }
}

/** Contact-form submission. Throws on failure (route → honest 500). */
export async function createContactMessage(input: {
  name: string;
  phone: string;
  email: string | null;
  message: string;
}): Promise<MessageRecord> {
  if (await dbReachable()) {
    return db.contactMessage.create({ data: input });
  }
  const now = new Date();
  const doc = await fsCreate("messages", {
    ...input,
    status: "new",
    createdAt: now,
  });
  invalidate("messages");
  return docToMessage(doc);
}

/** Partial update (status); null when missing. Throws on failure. */
export async function updateMessageFields(
  id: string,
  fields: { status?: string }
): Promise<MessageRecord | null> {
  if (await dbReachable()) {
    return db.contactMessage.update({ where: { id }, data: fields });
  }
  const existing = await fsGet("messages", id);
  if (!existing) return null;
  const doc = await fsUpdate("messages", id, fields);
  invalidate("messages");
  return docToMessage(doc);
}

/* ================================================================= services */

export interface ServiceRecord {
  id: string;
  categoryId: string | null;
  categoryName: string | null;
  name: string;
  slug: string;
  tagline: string | null;
  summary: string;
  description: string;
  conditions: string;
  approach: string | null;
  faqs: string;
  imageUrl: string | null;
  featured: boolean;
  status: string;
  seoTitle: string | null;
  seoDescription: string | null;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

function docToService(doc: FsDoc): ServiceRecord {
  const d = doc.data;
  return {
    id: doc.id,
    categoryId: asNullableString(d.categoryId),
    categoryName: asNullableString(d.categoryName),
    name: asString(d.name),
    slug: asString(d.slug),
    tagline: asNullableString(d.tagline),
    summary: asString(d.summary),
    description: asString(d.description),
    conditions: JSON.stringify(Array.isArray(d.conditions) ? d.conditions : []),
    approach: asNullableString(d.approach),
    faqs: JSON.stringify(Array.isArray(d.faqs) ? d.faqs : []),
    imageUrl: asNullableString(d.imageUrl),
    featured: asBool(d.featured),
    status: asString(d.status, "draft"),
    seoTitle: asNullableString(d.seoTitle),
    seoDescription: asNullableString(d.seoDescription),
    sortOrder: asNumber(d.sortOrder, 0),
    createdAt: asDate(d.createdAt),
    updatedAt: asDate(d.updatedAt),
  };
}

/** Admin table read: sortOrder then name. Never throws. */
export async function listServiceRows(): Promise<ServiceRow[]> {
  if (await dbReachable()) {
    try {
      const rows = await db.service.findMany({
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        include: { category: { select: { name: true } } },
      });
      return rows.map((r) => ({
        id: r.id,
        slug: r.slug,
        name: r.name,
        tagline: r.tagline,
        summary: r.summary,
        description: r.description,
        imageUrl: r.imageUrl,
        featured: r.featured,
        status: r.status,
        sortOrder: r.sortOrder,
        categoryName: r.category?.name ?? null,
      }));
    } catch {
      return [];
    }
  }
  try {
    const docs = await listCached("services");
    return docs
      .map(docToService)
      .sort(
        (a, b) =>
          a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)
      )
      .map((r) => ({
        id: r.id,
        slug: r.slug,
        name: r.name,
        tagline: r.tagline,
        summary: r.summary,
        description: r.description,
        imageUrl: r.imageUrl,
        featured: r.featured,
        status: r.status,
        sortOrder: r.sortOrder,
        categoryName: r.categoryName,
      }));
  } catch {
    return [];
  }
}

/** Full record by id for the PATCH route. Throws on store failure. */
export async function getServiceRecord(
  id: string
): Promise<ServiceRecord | null> {
  if (await dbReachable()) {
    const row = await db.service.findUnique({
      where: { id },
      include: { category: { select: { name: true } } },
    });
    return row ? { ...row, categoryName: row.category?.name ?? null } : null;
  }
  const doc = await fsGet("services", id);
  return doc ? docToService(doc) : null;
}

/**
 * Published-service reference for the booking flow. Degrades to null on the
 * database path (the old behaviour); THROWS on the Firestore path so an
 * outage cannot silently disable service selection.
 */
export async function getPublishedServiceRef(
  id: string
): Promise<{ id: string; name: string } | null> {
  if (await dbReachable()) {
    try {
      return await db.service.findFirst({
        where: { id, status: "published" },
        select: { id: true, name: true },
      });
    } catch {
      return null;
    }
  }
  const doc = await fsGet("services", id);
  if (!doc || asString(doc.data.status) !== "published") return null;
  return { id: doc.id, name: asString(doc.data.name) };
}

/** Partial update; null when missing. Throws on failure. */
export async function updateServiceFields(
  id: string,
  fields: Partial<{
    name: string;
    tagline: string | null;
    summary: string;
    description: string;
    imageUrl: string | null;
    sortOrder: number;
    featured: boolean;
    status: string;
  }>
): Promise<ServiceRecord | null> {
  if (await dbReachable()) {
    const row = await db.service.update({
      where: { id },
      data: fields,
      include: { category: { select: { name: true } } },
    });
    return { ...row, categoryName: row.category?.name ?? null };
  }
  const existing = await fsGet("services", id);
  if (!existing) return null;
  const doc = await fsUpdate("services", id, {
    ...fields,
    updatedAt: new Date(),
  });
  invalidate("services");
  return docToService(doc);
}

/* ================================================================ exercises */

export interface ExerciseRecord {
  id: string;
  categoryId: string | null;
  categoryName: string | null;
  title: string;
  slug: string;
  purpose: string | null;
  summary: string;
  instructions: string;
  frequency: string | null;
  equipment: string | null;
  imageUrl: string | null;
  videoUrl: string | null;
  youtubeUrl: string | null;
  precautions: string | null;
  attribution: string | null;
  featured: boolean;
  status: string;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

function docToExercise(doc: FsDoc): ExerciseRecord {
  const d = doc.data;
  return {
    id: doc.id,
    categoryId: asNullableString(d.categoryId),
    categoryName: asNullableString(d.categoryName),
    title: asString(d.title),
    slug: asString(d.slug),
    purpose: asNullableString(d.purpose),
    summary: asString(d.summary),
    instructions: asString(d.instructions),
    frequency: asNullableString(d.frequency),
    equipment: asNullableString(d.equipment),
    imageUrl: asNullableString(d.imageUrl),
    videoUrl: asNullableString(d.videoUrl),
    youtubeUrl: asNullableString(d.youtubeUrl),
    precautions: asNullableString(d.precautions),
    attribution: asNullableString(d.attribution),
    featured: asBool(d.featured),
    status: asString(d.status, "draft"),
    sortOrder: asNumber(d.sortOrder, 0),
    createdAt: asDate(d.createdAt),
    updatedAt: asDate(d.updatedAt),
  };
}

/** Admin table read: sortOrder then title. Never throws. */
export async function listExerciseRows(): Promise<ExerciseRow[]> {
  if (await dbReachable()) {
    try {
      const rows = await db.exercise.findMany({
        orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
        include: { category: { select: { name: true } } },
      });
      return rows.map((r) => ({
        id: r.id,
        slug: r.slug,
        title: r.title,
        summary: r.summary,
        purpose: r.purpose,
        instructions: r.instructions,
        imageUrl: r.imageUrl,
        videoUrl: r.videoUrl,
        youtubeUrl: r.youtubeUrl,
        categoryId: r.categoryId,
        featured: r.featured,
        status: r.status,
        sortOrder: r.sortOrder,
        categoryName: r.category?.name ?? null,
      }));
    } catch {
      return [];
    }
  }
  try {
    const docs = await listCached("exercises");
    return docs
      .map(docToExercise)
      .sort(
        (a, b) =>
          a.sortOrder - b.sortOrder || a.title.localeCompare(b.title)
      )
      .map((r) => ({
        id: r.id,
        slug: r.slug,
        title: r.title,
        summary: r.summary,
        purpose: r.purpose,
        instructions: r.instructions,
        imageUrl: r.imageUrl,
        videoUrl: r.videoUrl,
        youtubeUrl: r.youtubeUrl,
        categoryId: r.categoryId,
        featured: r.featured,
        status: r.status,
        sortOrder: r.sortOrder,
        categoryName: r.categoryName,
      }));
  } catch {
    return [];
  }
}

/** Category options for the admin dialog + PATCH validation. Never throws. */
export async function listExerciseCategoryOptions(): Promise<OptionItem[]> {
  if (await dbReachable()) {
    try {
      const rows = await db.exerciseCategory.findMany({
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: { id: true, name: true },
      });
      return rows.map((c) => ({ id: c.id, label: c.name }));
    } catch {
      return [];
    }
  }
  try {
    const docs = await listCached("exerciseCategories");
    return docs
      .map((d) => ({ id: d.id, label: asString(d.data.name) }))
      .sort((a, b) => a.label.localeCompare(b.label));
  } catch {
    return [];
  }
}

/** FK check for exercise PATCHes. Degrades to false. Never throws. */
export async function exerciseCategoryExists(id: string): Promise<boolean> {
  if (await dbReachable()) {
    try {
      return (await db.exerciseCategory.findUnique({ where: { id } })) !== null;
    } catch {
      return false;
    }
  }
  try {
    return (await fsGet("exerciseCategories", id)) !== null;
  } catch {
    return false;
  }
}

/** Full record by id. Throws on store failure. */
export async function getExerciseRecord(
  id: string
): Promise<ExerciseRecord | null> {
  if (await dbReachable()) {
    const row = await db.exercise.findUnique({
      where: { id },
      include: { category: { select: { name: true } } },
    });
    return row ? { ...row, categoryName: row.category?.name ?? null } : null;
  }
  const doc = await fsGet("exercises", id);
  return doc ? docToExercise(doc) : null;
}

/** Partial update (categoryId re-resolves the flattened name). Throws. */
export async function updateExerciseFields(
  id: string,
  fields: Partial<{
    title: string;
    summary: string;
    purpose: string | null;
    instructions: string;
    imageUrl: string | null;
    videoUrl: string | null;
    youtubeUrl: string | null;
    categoryId: string | null;
    sortOrder: number;
    featured: boolean;
    status: string;
  }>
): Promise<ExerciseRecord | null> {
  if (await dbReachable()) {
    const row = await db.exercise.update({
      where: { id },
      data: fields,
      include: { category: { select: { name: true } } },
    });
    return { ...row, categoryName: row.category?.name ?? null };
  }
  const existing = await fsGet("exercises", id);
  if (!existing) return null;
  const payload: Record<string, unknown> = { ...fields, updatedAt: new Date() };
  if ("categoryId" in fields) {
    const cat = fields.categoryId
      ? await fsGet("exerciseCategories", fields.categoryId)
      : null;
    payload.categoryName = cat ? asString(cat.data.name) : null;
  }
  const doc = await fsUpdate("exercises", id, payload);
  invalidate("exercises");
  return docToExercise(doc);
}

/* ===================================================================== team */

export interface TherapistRecord {
  id: string;
  name: string;
  slug: string;
  title: string | null;
  qualifications: string | null;
  experienceYears: number | null;
  bio: string | null;
  languages: string[];
  expertise: string[];
  photoUrl: string | null;
  status: string;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

function docToTherapist(doc: FsDoc): TherapistRecord {
  const d = doc.data;
  const arr = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  return {
    id: doc.id,
    name: asString(d.name),
    slug: asString(d.slug),
    title: asNullableString(d.title),
    qualifications: asNullableString(d.qualifications),
    experienceYears: asNullableNumber(d.experienceYears),
    bio: asNullableString(d.bio),
    languages: arr(d.languages),
    expertise: arr(d.expertise),
    photoUrl: asNullableString(d.photoUrl),
    status: asString(d.status, "draft"),
    sortOrder: asNumber(d.sortOrder, 0),
    createdAt: asDate(d.createdAt),
    updatedAt: asDate(d.updatedAt),
  };
}

function parseStringArray(json: string): string[] {
  return parseJsonArray<string>(json);
}

/** Admin table read: sortOrder then name. Never throws. */
export async function listTherapistRows(): Promise<TherapistRow[]> {
  if (await dbReachable()) {
    try {
      const rows = await db.therapist.findMany({
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      });
      return rows.map((r) => ({
        id: r.id,
        slug: r.slug,
        name: r.name,
        title: r.title,
        qualifications: r.qualifications,
        experienceYears: r.experienceYears,
        bio: r.bio,
        photoUrl: r.photoUrl,
        languages: parseStringArray(r.languages),
        expertise: parseStringArray(r.expertise),
        status: r.status,
        sortOrder: r.sortOrder,
      }));
    } catch {
      return [];
    }
  }
  try {
    const docs = await listCached("team");
    return docs
      .map(docToTherapist)
      .sort(
        (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)
      )
      .map((r) => ({
        id: r.id,
        slug: r.slug,
        name: r.name,
        title: r.title,
        qualifications: r.qualifications,
        experienceYears: r.experienceYears,
        bio: r.bio,
        photoUrl: r.photoUrl,
        languages: r.languages,
        expertise: r.expertise,
        status: r.status,
        sortOrder: r.sortOrder,
      }));
  } catch {
    return [];
  }
}

/** Full record by id. Throws on store failure. */
export async function getTherapistRecord(
  id: string
): Promise<TherapistRecord | null> {
  if (await dbReachable()) {
    const row = await db.therapist.findUnique({ where: { id } });
    return row
      ? {
          ...row,
          languages: parseStringArray(row.languages),
          expertise: parseStringArray(row.expertise),
        }
      : null;
  }
  const doc = await fsGet("team", id);
  return doc ? docToTherapist(doc) : null;
}

/** Partial update. Throws on failure. */
export async function updateTherapistFields(
  id: string,
  fields: Partial<{
    name: string;
    title: string | null;
    qualifications: string | null;
    experienceYears: number | null;
    bio: string | null;
    photoUrl: string | null;
    languages: string[];
    expertise: string[];
    sortOrder: number;
    status: string;
  }>
): Promise<TherapistRecord | null> {
  if (await dbReachable()) {
    const { languages, expertise, ...rest } = fields;
    const row = await db.therapist.update({
      where: { id },
      data: {
        ...rest,
        ...(languages !== undefined ? { languages: JSON.stringify(languages) } : {}),
        ...(expertise !== undefined ? { expertise: JSON.stringify(expertise) } : {}),
      },
    });
    return {
      ...row,
      languages: parseStringArray(row.languages),
      expertise: parseStringArray(row.expertise),
    };
  }
  const existing = await fsGet("team", id);
  if (!existing) return null;
  const doc = await fsUpdate("team", id, { ...fields, updatedAt: new Date() });
  invalidate("team");
  return docToTherapist(doc);
}

/* ================================================================== stories */

export interface StoryRecord {
  id: string;
  title: string;
  slug: string;
  conditionContext: string | null;
  journey: string | null;
  beforeImageUrl: string | null;
  afterImageUrl: string | null;
  milestones: string;
  therapistId: string | null;
  therapistName: string | null;
  consentStatus: string;
  consentReference: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

function docToStory(doc: FsDoc): StoryRecord {
  const d = doc.data;
  return {
    id: doc.id,
    title: asString(d.title),
    slug: asString(d.slug),
    conditionContext: asNullableString(d.conditionContext),
    journey: asNullableString(d.journey),
    beforeImageUrl: asNullableString(d.beforeImageUrl),
    afterImageUrl: asNullableString(d.afterImageUrl),
    milestones: JSON.stringify(Array.isArray(d.milestones) ? d.milestones : []),
    therapistId: asNullableString(d.therapistId),
    therapistName: asNullableString(d.therapistName),
    consentStatus: asString(d.consentStatus, "pending"),
    consentReference: asNullableString(d.consentReference),
    status: asString(d.status, "draft"),
    createdAt: asDate(d.createdAt),
    updatedAt: asDate(d.updatedAt),
  };
}

/** Admin table read: newest first. Never throws. */
export async function listStoryRows(): Promise<StoryRow[]> {
  if (await dbReachable()) {
    try {
      const rows = await db.patientStory.findMany({
        orderBy: { createdAt: "desc" },
        include: { therapist: { select: { id: true, name: true } } },
      });
      return rows.map((r) => ({
        id: r.id,
        slug: r.slug,
        title: r.title,
        conditionContext: r.conditionContext,
        journey: r.journey,
        beforeImageUrl: r.beforeImageUrl,
        afterImageUrl: r.afterImageUrl,
        therapistId: r.therapistId,
        therapistName: r.therapist?.name ?? null,
        consentStatus: r.consentStatus,
        consentReference: r.consentReference,
        status: r.status,
      }));
    } catch {
      return [];
    }
  }
  try {
    const docs = await listCached("stories");
    return docs
      .map(docToStory)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((r) => ({
        id: r.id,
        slug: r.slug,
        title: r.title,
        conditionContext: r.conditionContext,
        journey: r.journey,
        beforeImageUrl: r.beforeImageUrl,
        afterImageUrl: r.afterImageUrl,
        therapistId: r.therapistId,
        therapistName: r.therapistName,
        consentStatus: r.consentStatus,
        consentReference: r.consentReference,
        status: r.status,
      }));
  } catch {
    return [];
  }
}

/** Therapist options for the stories dialog + PATCH validation. Never throws. */
export async function listTherapistOptions(): Promise<OptionItem[]> {
  if (await dbReachable()) {
    try {
      const rows = await db.therapist.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      });
      return rows.map((t) => ({ id: t.id, label: t.name }));
    } catch {
      return [];
    }
  }
  try {
    const docs = await listCached("team");
    return docs
      .map((d) => ({ id: d.id, label: asString(d.data.name) }))
      .sort((a, b) => a.label.localeCompare(b.label));
  } catch {
    return [];
  }
}

/** FK check for story PATCHes. Degrades to false. Never throws. */
export async function therapistExists(id: string): Promise<boolean> {
  if (await dbReachable()) {
    try {
      return (await db.therapist.findUnique({ where: { id } })) !== null;
    } catch {
      return false;
    }
  }
  try {
    return (await fsGet("team", id)) !== null;
  } catch {
    return false;
  }
}

/** Full record by id (the consent rule needs the pre-update state). Throws. */
export async function getStoryRecord(id: string): Promise<StoryRecord | null> {
  if (await dbReachable()) {
    const row = await db.patientStory.findUnique({
      where: { id },
      include: { therapist: { select: { name: true } } },
    });
    return row ? { ...row, therapistName: row.therapist?.name ?? null } : null;
  }
  const doc = await fsGet("stories", id);
  return doc ? docToStory(doc) : null;
}

/** Partial update (therapistId re-resolves the flattened name). Throws. */
export async function updateStoryFields(
  id: string,
  fields: Partial<{
    title: string;
    conditionContext: string | null;
    journey: string | null;
    beforeImageUrl: string | null;
    afterImageUrl: string | null;
    therapistId: string | null;
    consentStatus: string;
    consentReference: string | null;
    status: string;
  }>
): Promise<StoryRecord | null> {
  if (await dbReachable()) {
    const row = await db.patientStory.update({ where: { id }, data: fields });
    return { ...row, therapistName: null };
  }
  const existing = await fsGet("stories", id);
  if (!existing) return null;
  const payload: Record<string, unknown> = { ...fields, updatedAt: new Date() };
  if ("therapistId" in fields) {
    const th = fields.therapistId ? await fsGet("team", fields.therapistId) : null;
    payload.therapistName = th ? asString(th.data.name) : null;
  }
  const doc = await fsUpdate("stories", id, payload);
  invalidate("stories");
  return docToStory(doc);
}

/* ================================================================= settings */

export interface ClinicSettingsRecord {
  id: string;
  phonePrimary: string;
  phoneAlternate: string | null;
  email: string | null;
  addressLine1: string;
  addressLine2: string | null;
  addressLine3: string | null;
  city: string;
  state: string | null;
  postcode: string | null;
  country: string | null;
  mapsUrl: string | null;
  googleReviewsUrl: string | null;
  bookingMode: string;
  externalBookingUrl: string | null;
  sundayBookingEnabled: boolean;
  minBookingDateOffset: number;
  maxBookingDateOffset: number;
  slotDurationMinutes: number;
  bookingNotes: string | null;
  smsProvider: string;
  smsReminderHours: number;
  facebookUrl: string | null;
  instagramUrl: string | null;
  linkedinUrl: string | null;
  youtubeUrl: string | null;
  updatedAt: Date;
}

function docToSettings(doc: FsDoc): ClinicSettingsRecord {
  const d = doc.data;
  return {
    id: "singleton",
    phonePrimary: asString(d.phonePrimary),
    phoneAlternate: asNullableString(d.phoneAlternate),
    email: asNullableString(d.email),
    addressLine1: asString(d.addressLine1),
    addressLine2: asNullableString(d.addressLine2),
    addressLine3: asNullableString(d.addressLine3),
    city: asString(d.city),
    state: asNullableString(d.state),
    postcode: asNullableString(d.postcode),
    country: asNullableString(d.country),
    mapsUrl: asNullableString(d.mapsUrl),
    googleReviewsUrl: asNullableString(d.googleReviewsUrl),
    bookingMode: asString(d.bookingMode, "internal"),
    externalBookingUrl: asNullableString(d.externalBookingUrl),
    sundayBookingEnabled: asBool(d.sundayBookingEnabled),
    minBookingDateOffset: asNumber(d.minBookingDateOffset, 1),
    maxBookingDateOffset: asNumber(d.maxBookingDateOffset, 30),
    slotDurationMinutes: asNumber(d.slotDurationMinutes, 30),
    bookingNotes: asNullableString(d.bookingNotes),
    smsProvider: asString(d.smsProvider, "msg91"),
    smsReminderHours: asNumber(d.smsReminderHours, 24),
    facebookUrl: asNullableString(d.facebookUrl),
    instagramUrl: asNullableString(d.instagramUrl),
    linkedinUrl: asNullableString(d.linkedinUrl),
    youtubeUrl: asNullableString(d.youtubeUrl),
    updatedAt: asDate(d.updatedAt),
  };
}

/** Settings singleton (null when nothing stored yet). Never throws. */
export async function getClinicSettingsRecord(): Promise<ClinicSettingsRecord | null> {
  if (await dbReachable()) {
    try {
      return await db.clinicSetting.findUnique({ where: { id: "singleton" } });
    } catch {
      return null;
    }
  }
  try {
    const doc = await listCachedOne("config", "clinic", CONFIG_TTL_MS);
    return doc ? docToSettings(doc) : null;
  } catch {
    return null;
  }
}

/** One cached document fetch (config/clinic pattern). Never throws. */
async function listCachedOne(
  collection: string,
  id: string,
  ttl: number
): Promise<FsDoc | null> {
  const key = `${collection}/${id}`;
  const hit = listCache.get(key);
  if (hit && Date.now() - hit.at < hit.ttl && hit.docs.length > 0) {
    return hit.docs[0];
  }
  if (hit && Date.now() - hit.at < FAILURE_TTL_MS && hit.docs.length === 0) {
    return null; // recent outage window — serve emptiness briefly
  }
  try {
    const doc = await fsGet(collection, id);
    if (doc) {
      listCache.set(key, { at: Date.now(), ttl, docs: [doc] });
      return doc;
    }
    return null;
  } catch {
    listCache.set(key, { at: Date.now(), ttl: FAILURE_TTL_MS, docs: [] });
    return null;
  }
}

/** Operating hours, parsed sessions, ordered by weekday. Never throws. */
export async function getOperatingHoursRows(): Promise<DayHoursRow[]> {
  if (await dbReachable()) {
    try {
      const rows = await db.operatingHour.findMany({
        orderBy: { dayOfWeek: "asc" },
      });
      return rows.map((r) => ({
        dayOfWeek: r.dayOfWeek,
        isOpen: r.isOpen,
        sessions: parseJsonArray<Session>(r.sessions),
      }));
    } catch {
      return [];
    }
  }
  try {
    const docs = await listCached("hours", CONFIG_TTL_MS);
    return docs
      .map((d) => {
        const raw = d.data.sessions;
        const sessions = Array.isArray(raw)
          ? (raw as unknown[])
              .filter(
                (s): s is { start: string; end: string } =>
                  typeof s === "object" &&
                  s !== null &&
                  typeof (s as { start?: unknown }).start === "string" &&
                  typeof (s as { end?: unknown }).end === "string"
              )
              .map((s) => ({ start: s.start, end: s.end }))
          : [];
        return {
          dayOfWeek: asNumber(d.data.dayOfWeek, 0),
          isOpen: asBool(d.data.isOpen),
          sessions,
        };
      })
      .sort((a, b) => a.dayOfWeek - b.dayOfWeek);
  } catch {
    return [];
  }
}

export interface SaveSettingsInput {
  phonePrimary: string;
  phoneAlternate: string | null;
  email: string | null;
  addressLine1: string;
  addressLine2: string | null;
  addressLine3: string | null;
  city: string;
  state: string | null;
  postcode: string | null;
  country: string | null;
  mapsUrl: string | null;
  googleReviewsUrl: string | null;
  bookingMode: string;
  externalBookingUrl: string | null;
  sundayBookingEnabled: boolean;
  minBookingDateOffset: number;
  maxBookingDateOffset: number;
  slotDurationMinutes: number;
  bookingNotes: string | null;
  facebookUrl: string | null;
  instagramUrl: string | null;
  linkedinUrl: string | null;
  youtubeUrl: string | null;
}

/**
 * Settings + hours save (the PUT route's validated payload). Throws on
 * failure; returns records shaped like the Prisma transaction's results.
 */
export async function saveClinicSettings(
  s: SaveSettingsInput,
  hours: DayHoursRow[]
): Promise<{ settings: ClinicSettingsRecord; hours: DayHoursRow[] }> {
  if (await dbReachable()) {
    const result = await db.$transaction([
      db.clinicSetting.upsert({
        where: { id: "singleton" },
        update: { ...s },
        create: { id: "singleton", ...s },
      }),
      ...hours.map((day) =>
        db.operatingHour.upsert({
          where: { dayOfWeek: day.dayOfWeek },
          update: {
            isOpen: day.isOpen,
            sessions: JSON.stringify(day.sessions),
          },
          create: {
            dayOfWeek: day.dayOfWeek,
            isOpen: day.isOpen,
            sessions: JSON.stringify(day.sessions),
          },
        })
      ),
    ]);
    const settingRow = result[0];
    const hourRows = result.slice(1) as unknown as Array<{
      dayOfWeek: number;
      isOpen: boolean;
      sessions: string;
    }>;
    return {
      settings: settingRow,
      hours: hourRows.map((r) => ({
        dayOfWeek: r.dayOfWeek,
        isOpen: r.isOpen,
        sessions: parseJsonArray<Session>(r.sessions),
      })),
    };
  }
  const now = new Date();
  await fsSet("config", "clinic", { ...s, updatedAt: now });
  await Promise.all(
    hours.map((day) =>
      fsSet("hours", String(day.dayOfWeek), {
        dayOfWeek: day.dayOfWeek,
        isOpen: day.isOpen,
        sessions: day.sessions,
      })
    )
  );
  invalidate("hours");
  listCache.delete("config/clinic");
  return { settings: docToSettings({ id: "clinic", data: { ...s, updatedAt: now } }), hours };
}

/* =================================================================== admins */

export interface AdminIdentity {
  id: string;
  email: string;
  name: string | null;
  role: string;
}

/**
 * Firestore `admins` docs (id = email) — the tier that lets the clinic add
 * staff sign-ins without a redeploy. Never throws: a Firestore outage just
 * means this tier is skipped.
 */
export async function findFirestoreAdmin(
  email: string
): Promise<AdminIdentity | null> {
  try {
    const doc = await fsGet("admins", email);
    if (!doc) return null;
    return {
      id: doc.id,
      email: asString(doc.data.email, email),
      name: asNullableString(doc.data.name),
      role: asString(doc.data.role, "admin"),
    };
  } catch {
    return null;
  }
}

/* ============================================================ dashboard mix */

export interface DashboardSnapshot {
  requestedAppointments: number;
  newMessages: number;
  draftServices: number;
  draftExercises: number;
  draftTherapists: number;
  draftStories: number;
  todaysAppointments: AppointmentRow[];
}

/** Overview counts for the dashboard home. Never throws. */
export async function getDashboardSnapshot(): Promise<DashboardSnapshot> {
  const today = todayYmdClinic();
  if (await dbReachable()) {
    const [
      requestedAppointments,
      newMessages,
      draftServices,
      draftExercises,
      draftTherapists,
      draftStories,
      todayRequests,
    ] = await Promise.all([
      db.appointmentRequest.count({ where: { status: "requested" } }).catch(() => 0),
      db.contactMessage.count({ where: { status: "new" } }).catch(() => 0),
      db.service.count({ where: { status: "draft" } }).catch(() => 0),
      db.exercise.count({ where: { status: "draft" } }).catch(() => 0),
      db.therapist.count({ where: { status: "draft" } }).catch(() => 0),
      db.patientStory.count({ where: { status: "draft" } }).catch(() => 0),
      db.appointmentRequest
        .findMany({
          where: { appointmentDate: today, status: { not: "cancelled" } },
          orderBy: { appointmentSlot: "asc" },
          take: 10,
        })
        .catch(() => [] as AppointmentRecord[]),
    ]);
    return {
      requestedAppointments,
      newMessages,
      draftServices,
      draftExercises,
      draftTherapists,
      draftStories,
      todaysAppointments: todayRequests.map(prismaAppointmentToRow),
    };
  }
  const safeCount = async (collection: string, value: string): Promise<number> => {
    try {
      const docs = await fsQuery(collection, [
        { field: "status", op: "EQUAL", value },
      ]);
      return docs.length;
    } catch {
      return 0;
    }
  };
  const todays = await (async (): Promise<AppointmentRow[]> => {
    try {
      const docs = await fsQuery("appointments", [
        { field: "appointmentDate", op: "EQUAL", value: today },
      ]);
      return docs
        .map(docToAppointment)
        .filter((r) => r.status !== "cancelled")
        .sort((a, b) => a.appointmentSlot.localeCompare(b.appointmentSlot))
        .slice(0, 10)
        .map(prismaAppointmentToRow);
    } catch {
      return [];
    }
  })();
  const [
    requestedAppointments,
    newMessages,
    draftServices,
    draftExercises,
    draftTherapists,
    draftStories,
  ] = await Promise.all([
    safeCount("appointments", "requested"),
    safeCount("messages", "new"),
    safeCount("services", "draft"),
    safeCount("exercises", "draft"),
    safeCount("team", "draft"),
    safeCount("stories", "draft"),
  ]);
  return {
    requestedAppointments,
    newMessages,
    draftServices,
    draftExercises,
    draftTherapists,
    draftStories,
    todaysAppointments: todays,
  };
}
