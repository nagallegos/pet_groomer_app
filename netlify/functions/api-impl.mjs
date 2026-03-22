import { neon } from "@netlify/neon";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const databaseUrl =
  process.env.NETLIFY_DATABASE_URL ??
  process.env.DATABASE_URL ??
  undefined;

const sql = databaseUrl ? neon(databaseUrl) : neon();

const contactMethods = new Set(["text", "email"]);
const speciesValues = new Set(["dog", "cat"]);
const appointmentStatuses = new Set([
  "scheduled",
  "confirmed",
  "completed",
  "cancelled",
  "no-show",
]);
const paymentStatuses = new Set(["unpaid", "paid"]);
const appUserRoles = new Set(["admin", "groomer", "client"]);
const noteVisibilities = new Set(["internal", "client"]);
const clientRequestTypes = new Set([
  "appointment",
  "appointment_change",
  "new_pet",
  "profile_update",
  "general",
]);
const clientRequestStatuses = new Set(["open", "in_review", "resolved", "closed"]);
const themeNames = new Set([
  "lavender",
  "green",
  "blue",
  "pink",
  "white",
  "high-contrast",
]);
const themeModes = new Set(["light", "dark"]);

let schemaReadyPromise;
const SESSION_COOKIE = "pet_grooming_session";
const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 14;
const RESPONSE_TOKEN_DURATION_MS = 1000 * 60 * 60 * 24 * 7;
const PASSWORD_TOKEN_DURATION_MS = 1000 * 60 * 60 * 24;
const LOGIN_LOCK_THRESHOLD = 5;
const CRON_SECRET = process.env.NOTIFICATION_CRON_SECRET ?? "";

function json(statusCode, body, extraHeaders = {}) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      ...extraHeaders,
    },
    body: JSON.stringify(body),
  };
}

function badRequest(message) {
  return json(400, { error: message });
}

function notFound(message) {
  return json(404, { error: message });
}

function methodNotAllowed() {
  return json(405, { error: "Method not allowed" });
}

function unauthorized(message = "Unauthorized") {
  return json(401, { error: message });
}

function forbidden(message = "Forbidden") {
  return json(403, { error: message });
}

function parseJsonBody(event) {
  if (!event.body) {
    return {};
  }

  try {
    return JSON.parse(event.body);
  } catch {
    throw new Error("Invalid JSON body.");
  }
}

function requiredString(value, fieldName) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${fieldName} is required.`);
  }

  return value.trim();
}

function optionalString(value) {
  if (value == null) {
    return null;
  }

  if (typeof value !== "string") {
    throw new Error("Optional fields must be strings.");
  }

  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function requiredEmail(value, fieldName) {
  const email = requiredString(value, fieldName).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error(`${fieldName} must be a valid email address.`);
  }
  return email;
}

function optionalBoolean(value, fieldName) {
  if (typeof value !== "boolean") {
    throw new Error(`${fieldName} must be true or false.`);
  }
  return value;
}

function optionalNumber(value, fieldName) {
  if (value == null || value === "") {
    return null;
  }

  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new Error(`${fieldName} must be a valid number.`);
  }

  return value;
}

function optionalObject(value, fieldName) {
  if (value == null) {
    return {};
  }
  if (typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${fieldName} must be an object.`);
  }
  return value;
}

function requiredDate(value, fieldName) {
  const parsed = new Date(requiredString(value, fieldName));
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`${fieldName} must be a valid date.`);
  }

  return parsed.toISOString();
}

function toIso(value) {
  if (!value) {
    return undefined;
  }

  return new Date(value).toISOString();
}

function parseCookies(event) {
  const header = event.headers?.cookie ?? event.headers?.Cookie ?? "";
  return header.split(";").reduce((cookies, chunk) => {
    const [rawKey, ...rest] = chunk.trim().split("=");
    if (!rawKey) {
      return cookies;
    }
    cookies[rawKey] = decodeURIComponent(rest.join("=") || "");
    return cookies;
  }, {});
}

function hashPassword(password, salt = randomBytes(16).toString("hex")) {
  const derivedKey = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derivedKey}`;
}

function verifyPassword(password, storedHash) {
  const [salt, storedDerivedKey] = storedHash.split(":");
  if (!salt || !storedDerivedKey) {
    return false;
  }
  const derivedKey = scryptSync(password, salt, 64);
  const storedKeyBuffer = Buffer.from(storedDerivedKey, "hex");
  if (derivedKey.length !== storedKeyBuffer.length) {
    return false;
  }
  return timingSafeEqual(derivedKey, storedKeyBuffer);
}

function buildSessionCookie(token, expiresAt) {
  const expires = new Date(expiresAt).toUTCString();
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Expires=${expires}`;
}

function clearSessionCookie() {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;
}

function buildAppUrl(pathname) {
  const baseUrl =
    process.env.PUBLIC_APP_URL ??
    process.env.URL ??
    "http://localhost:8888";
  return new URL(pathname, baseUrl).toString();
}

function mapNoteRow(row) {
  return {
    id: row.id,
    text: row.text,
    visibility: row.visibility ?? "internal",
    createdByUserId: row.created_by_user_id ?? undefined,
    createdByName: row.created_by_name ?? undefined,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
    isArchived: row.is_archived ?? false,
    archivedAt: toIso(row.archived_at),
  };
}

function mapAppUser(row) {
  return {
    id: row.id,
    email: row.email,
    username: row.username ?? undefined,
    role: row.role,
    name: row.display_name,
    firstName: row.first_name,
    lastName: row.last_name,
    phone: row.phone ?? "",
    notifyByEmail: row.notify_by_email ?? true,
    notifyByText: row.notify_by_text ?? false,
    themeName: row.theme_name ?? "lavender",
    themeMode: row.theme_mode ?? "light",
    isActive: row.is_active ?? true,
    failedLoginAttempts: row.failed_login_attempts ?? 0,
    lockedAt: toIso(row.locked_at),
    ownerId: row.owner_id ?? undefined,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

function mapUserNotificationRow(row) {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    title: row.title,
    body: row.body,
    href: row.href ?? undefined,
    metadata: row.metadata ?? {},
    isRead: row.is_read ?? false,
    readAt: toIso(row.read_at),
    createdAt: toIso(row.created_at),
  };
}

function mapClientRequestRow(row) {
  return {
    id: row.id,
    ownerId: row.owner_id,
    petId: row.pet_id ?? undefined,
    createdByUserId: row.created_by_user_id ?? undefined,
    requestType: row.request_type,
    status: row.status,
    subject: row.subject,
    clientNote: row.client_note,
    resolutionNote: row.resolution_note ?? undefined,
    internalNote: row.internal_note ?? undefined,
    details: row.details ?? {},
    events: row.events ?? undefined,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
    resolvedAt: toIso(row.resolved_at),
  };
}

function mapClientRequestEventRow(row) {
  return {
    id: row.id,
    requestId: row.request_id,
    actorUserId: row.actor_user_id ?? undefined,
    actorRole: row.actor_role ?? undefined,
    actorName: row.actor_name ?? undefined,
    eventType: row.event_type,
    title: row.title,
    detail: row.detail ?? undefined,
    audience: row.audience,
    createdAt: toIso(row.created_at),
  };
}

function mapOwnerRow(row, notes = []) {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    phone: row.phone ?? "",
    email: row.email ?? "",
    hasPortalAccount: row.has_portal_account ?? false,
    preferredContactMethod: row.preferred_contact_method,
    address: row.address ?? undefined,
    notes,
    isArchived: row.is_archived,
    archivedAt: toIso(row.archived_at),
  };
}

async function getLinkedClientUserForOwner(ownerId, excludeUserId = null) {
  const rows = await sql`
    SELECT id::text AS id, email
    FROM app_users
    WHERE owner_id = ${ownerId}::uuid
      AND role = 'client'
      AND (${excludeUserId}::uuid IS NULL OR id <> ${excludeUserId}::uuid)
    ORDER BY created_at ASC
  `;

  if (rows.length > 1) {
    throw new Error("Only one client user account can be linked to a client record.");
  }

  return rows[0] ?? null;
}

async function getOwnerEmailForClientUser(ownerId) {
  const rows = await sql`
    SELECT id::text AS id, email
    FROM owners
    WHERE id = ${ownerId}::uuid
    LIMIT 1
  `;

  if (rows.length === 0) {
    throw new Error("Linked client record was not found.");
  }

  return rows[0].email;
}

function mapPetRow(row, notes = []) {
  return {
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    species: row.species,
    breed: row.breed,
    weightLbs: row.weight_lbs == null ? undefined : Number(row.weight_lbs),
    ageYears: row.age_years == null ? undefined : Number(row.age_years),
    birthDate: toIso(row.birth_date),
    isBirthDateEstimated: row.is_birth_date_estimated ?? undefined,
    color: row.color ?? undefined,
    notes,
    isArchived: row.is_archived,
    archivedAt: toIso(row.archived_at),
  };
}

function mapAppointmentRow(row, notes = []) {
  return {
    id: row.id,
    ownerId: row.owner_id,
    petId: row.pet_id,
    start: toIso(row.start_at),
    end: toIso(row.end_at),
    serviceType: row.service_type ?? undefined,
    selectedServices: Array.isArray(row.selected_services) ? row.selected_services : [],
    customServiceType: row.custom_service_type ?? undefined,
    quotePrice: Number(row.quote_price ?? row.cost ?? 0),
    actualPriceCharged:
      row.actual_price_charged == null ? undefined : Number(row.actual_price_charged),
    paymentStatus: row.payment_status ?? "unpaid",
    status: row.status,
    notes,
    confirmationSentAt: toIso(row.confirmation_sent_at),
    confirmedAt: toIso(row.confirmed_at),
    isArchived: row.is_archived,
    archivedAt: toIso(row.archived_at),
  };
}

function sanitizeAppointmentForClient(appointment) {
  return {
    ...appointment,
    quotePrice: undefined,
    actualPriceCharged: undefined,
    paymentStatus: undefined,
  };
}

function mapAppointmentNotificationRow(row) {
  return {
    id: row.id,
    appointmentId: row.appointment_id,
    ownerId: row.owner_id,
    notificationType: row.notification_type,
    recipientType: row.recipient_type,
    channel: row.channel,
    recipientAddress: row.recipient_address,
    status: row.status,
    metadata: row.metadata ?? {},
    sentAt: toIso(row.sent_at),
    createdAt: toIso(row.created_at),
  };
}

function groupNotes(rows, key) {
  const grouped = new Map();

  for (const row of rows) {
    const bucket = grouped.get(row[key]) ?? [];
    bucket.push(mapNoteRow(row));
    grouped.set(row[key], bucket);
  }

  return grouped;
}

async function seedUserIfConfigured(email, password, role, firstName, lastName) {
  if (!email || !password) {
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) {
    return;
  }

  const existing = await sql`
    SELECT id::text AS id
    FROM app_users
    WHERE email = ${normalizedEmail}
  `;

  if (existing.length > 0) {
    return;
  }

  const displayName = `${firstName} ${lastName}`.trim();
  await sql`
    INSERT INTO app_users (email, password_hash, role, display_name, first_name, last_name, phone, notify_by_email, notify_by_text)
    VALUES (
      ${normalizedEmail},
      ${hashPassword(password)},
      ${role},
      ${displayName},
      ${firstName},
      ${lastName},
      ${role === "admin" ? optionalString(process.env.APP_ADMIN_PHONE) : optionalString(process.env.APP_GROOMER_PHONE)},
      TRUE,
      FALSE
    )
  `;
}

async function seedDefaultUsers() {
  const adminFirstName = process.env.APP_ADMIN_FIRST_NAME ?? process.env.APP_ADMIN_NAME?.split(" ")[0] ?? "Administrator";
  const adminLastName = process.env.APP_ADMIN_LAST_NAME ?? process.env.APP_ADMIN_NAME?.split(" ").slice(1).join(" ") ?? "";
  const groomerFirstName = process.env.APP_GROOMER_FIRST_NAME ?? process.env.APP_GROOMER_NAME?.split(" ")[0] ?? "Pet";
  const groomerLastName = process.env.APP_GROOMER_LAST_NAME ?? process.env.APP_GROOMER_NAME?.split(" ").slice(1).join(" ") ?? "Groomer";
  await seedUserIfConfigured(
    process.env.APP_ADMIN_EMAIL,
    process.env.APP_ADMIN_PASSWORD,
    "admin",
    adminFirstName,
    adminLastName,
  );
  await seedUserIfConfigured(
    process.env.APP_GROOMER_EMAIL,
    process.env.APP_GROOMER_PASSWORD,
    "groomer",
    groomerFirstName,
    groomerLastName,
  );
}

async function ensureSchema() {
  if (!schemaReadyPromise) {
    schemaReadyPromise = (async () => {
      await sql`CREATE EXTENSION IF NOT EXISTS pgcrypto`;
      await sql`
        CREATE TABLE IF NOT EXISTS owners (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          first_name TEXT NOT NULL,
          last_name TEXT NOT NULL,
          phone TEXT,
          email TEXT,
          preferred_contact_method TEXT NOT NULL CHECK (preferred_contact_method IN ('text', 'email')),
          address TEXT,
          is_archived BOOLEAN NOT NULL DEFAULT FALSE,
          archived_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS pets (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          owner_id UUID NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          species TEXT NOT NULL CHECK (species IN ('dog', 'cat')),
          breed TEXT NOT NULL,
          weight_lbs NUMERIC(8, 2),
          age_years NUMERIC(8, 2),
          birth_date DATE,
          is_birth_date_estimated BOOLEAN NOT NULL DEFAULT FALSE,
          color TEXT,
          is_archived BOOLEAN NOT NULL DEFAULT FALSE,
          archived_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS appointments (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          owner_id UUID NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
          pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
          start_at TIMESTAMPTZ NOT NULL,
          end_at TIMESTAMPTZ NOT NULL,
          service_type TEXT,
          selected_services TEXT[] NOT NULL DEFAULT '{}',
          custom_service_type TEXT,
          cost NUMERIC(10, 2) NOT NULL DEFAULT 0,
          quote_price NUMERIC(10, 2) NOT NULL DEFAULT 0,
          actual_price_charged NUMERIC(10, 2),
          payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid')),
          status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'completed', 'cancelled', 'no-show')),
          confirmation_sent_at TIMESTAMPTZ,
          confirmed_at TIMESTAMPTZ,
          is_archived BOOLEAN NOT NULL DEFAULT FALSE,
          archived_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          CHECK (end_at > start_at)
        )
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS owner_notes (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          owner_id UUID NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
          text TEXT NOT NULL,
          visibility TEXT NOT NULL DEFAULT 'internal' CHECK (visibility IN ('internal', 'client')),
          is_archived BOOLEAN NOT NULL DEFAULT FALSE,
          archived_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS pet_notes (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          pet_id UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
          text TEXT NOT NULL,
          visibility TEXT NOT NULL DEFAULT 'internal' CHECK (visibility IN ('internal', 'client')),
          is_archived BOOLEAN NOT NULL DEFAULT FALSE,
          archived_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS appointment_notes (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
          text TEXT NOT NULL,
          visibility TEXT NOT NULL DEFAULT 'internal' CHECK (visibility IN ('internal', 'client')),
          is_archived BOOLEAN NOT NULL DEFAULT FALSE,
          archived_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS app_users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          email TEXT NOT NULL UNIQUE,
          username TEXT UNIQUE,
          password_hash TEXT NOT NULL,
          role TEXT NOT NULL CHECK (role IN ('admin', 'groomer', 'client')),
          display_name TEXT NOT NULL,
          first_name TEXT NOT NULL DEFAULT '',
          last_name TEXT NOT NULL DEFAULT '',
          phone TEXT,
          owner_id UUID REFERENCES owners(id) ON DELETE SET NULL,
          notify_by_email BOOLEAN NOT NULL DEFAULT TRUE,
          notify_by_text BOOLEAN NOT NULL DEFAULT FALSE,
          theme_name TEXT NOT NULL DEFAULT 'lavender',
          theme_mode TEXT NOT NULL DEFAULT 'light',
          failed_login_attempts INTEGER NOT NULL DEFAULT 0,
          locked_at TIMESTAMPTZ,
          last_login_at TIMESTAMPTZ,
          is_active BOOLEAN NOT NULL DEFAULT TRUE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS app_sessions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
          session_token TEXT NOT NULL UNIQUE,
          expires_at TIMESTAMPTZ NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS user_notifications (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
          type TEXT NOT NULL,
          title TEXT NOT NULL,
          body TEXT NOT NULL,
          href TEXT,
          metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
          is_read BOOLEAN NOT NULL DEFAULT FALSE,
          read_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS user_password_tokens (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
          purpose TEXT NOT NULL CHECK (purpose IN ('setup', 'password_reset')),
          token TEXT NOT NULL UNIQUE,
          temp_password_hash TEXT,
          expires_at TIMESTAMPTZ NOT NULL,
          used_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS appointment_response_tokens (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
          owner_id UUID NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
          token TEXT NOT NULL UNIQUE,
          notification_type TEXT NOT NULL,
          channel TEXT NOT NULL CHECK (channel IN ('email', 'text')),
          expires_at TIMESTAMPTZ NOT NULL,
          used_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS appointment_notifications (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
          owner_id UUID REFERENCES owners(id) ON DELETE CASCADE,
          notification_type TEXT NOT NULL,
          recipient_type TEXT NOT NULL CHECK (recipient_type IN ('client', 'groomer')),
          channel TEXT NOT NULL CHECK (channel IN ('email', 'text')),
          recipient_address TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'queued',
          metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
          sent_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS appointment_response_requests (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
          owner_id UUID REFERENCES owners(id) ON DELETE CASCADE,
          action TEXT NOT NULL CHECK (action IN ('confirm', 'cancel', 'reschedule')),
          source TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS client_requests (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          owner_id UUID NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
          pet_id UUID REFERENCES pets(id) ON DELETE SET NULL,
          created_by_user_id UUID REFERENCES app_users(id) ON DELETE SET NULL,
          request_type TEXT NOT NULL CHECK (request_type IN ('appointment', 'appointment_change', 'new_pet', 'profile_update', 'general')),
          status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_review', 'resolved', 'closed')),
          subject TEXT NOT NULL,
          client_note TEXT NOT NULL,
          resolution_note TEXT,
          internal_note TEXT,
          details JSONB NOT NULL DEFAULT '{}'::jsonb,
          resolved_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;
      await sql`
        CREATE TABLE IF NOT EXISTS client_request_events (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          request_id UUID NOT NULL REFERENCES client_requests(id) ON DELETE CASCADE,
          actor_user_id UUID REFERENCES app_users(id) ON DELETE SET NULL,
          actor_role TEXT CHECK (actor_role IN ('admin', 'groomer', 'client')),
          actor_name TEXT,
          event_type TEXT NOT NULL CHECK (event_type IN ('created', 'updated', 'status_changed', 'client_note_updated', 'internal_note_updated', 'resolved', 'reopened')),
          title TEXT NOT NULL,
          detail TEXT,
          audience TEXT NOT NULL DEFAULT 'all' CHECK (audience IN ('all', 'staff')),
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;
      await sql`ALTER TABLE owner_notes ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE`;
      await sql`ALTER TABLE owner_notes ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ`;
      await sql`ALTER TABLE owner_notes ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'internal'`;
      await sql`ALTER TABLE owner_notes ADD COLUMN IF NOT EXISTS created_by_user_id UUID REFERENCES app_users(id) ON DELETE SET NULL`;
      await sql`ALTER TABLE owner_notes ADD COLUMN IF NOT EXISTS created_by_name TEXT`;
      await sql`ALTER TABLE pet_notes ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE`;
      await sql`ALTER TABLE pet_notes ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ`;
      await sql`ALTER TABLE pet_notes ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'internal'`;
      await sql`ALTER TABLE pet_notes ADD COLUMN IF NOT EXISTS created_by_user_id UUID REFERENCES app_users(id) ON DELETE SET NULL`;
      await sql`ALTER TABLE pet_notes ADD COLUMN IF NOT EXISTS created_by_name TEXT`;
      await sql`ALTER TABLE appointment_notes ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE`;
      await sql`ALTER TABLE appointment_notes ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ`;
      await sql`ALTER TABLE appointment_notes ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'internal'`;
      await sql`ALTER TABLE appointment_notes ADD COLUMN IF NOT EXISTS created_by_user_id UUID REFERENCES app_users(id) ON DELETE SET NULL`;
      await sql`ALTER TABLE appointment_notes ADD COLUMN IF NOT EXISTS created_by_name TEXT`;
      await sql`ALTER TABLE appointments ADD COLUMN IF NOT EXISTS quote_price NUMERIC(10, 2) NOT NULL DEFAULT 0`;
      await sql`ALTER TABLE appointments ADD COLUMN IF NOT EXISTS actual_price_charged NUMERIC(10, 2)`;
      await sql`ALTER TABLE appointments ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'unpaid'`;
      await sql`UPDATE appointments SET quote_price = cost WHERE quote_price = 0 AND cost <> 0`;
      await sql`ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_payment_status_check`;
      await sql`
        ALTER TABLE appointments
        ADD CONSTRAINT appointments_payment_status_check
        CHECK (payment_status IN ('unpaid', 'paid'))
      `;
      await sql`ALTER TABLE pets ADD COLUMN IF NOT EXISTS birth_date DATE`;
      await sql`ALTER TABLE pets ADD COLUMN IF NOT EXISTS is_birth_date_estimated BOOLEAN NOT NULL DEFAULT FALSE`;
      await sql`ALTER TABLE owners ALTER COLUMN phone DROP NOT NULL`;
      await sql`ALTER TABLE owners ALTER COLUMN email DROP NOT NULL`;
      await sql`ALTER TABLE app_users ADD COLUMN IF NOT EXISTS first_name TEXT NOT NULL DEFAULT ''`;
      await sql`ALTER TABLE app_users ADD COLUMN IF NOT EXISTS last_name TEXT NOT NULL DEFAULT ''`;
      await sql`ALTER TABLE app_users ADD COLUMN IF NOT EXISTS username TEXT UNIQUE`;
      await sql`ALTER TABLE app_users ADD COLUMN IF NOT EXISTS phone TEXT`;
      await sql`ALTER TABLE app_users ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES owners(id) ON DELETE SET NULL`;
      await sql`ALTER TABLE app_users ADD COLUMN IF NOT EXISTS notify_by_email BOOLEAN NOT NULL DEFAULT TRUE`;
      await sql`ALTER TABLE app_users ADD COLUMN IF NOT EXISTS notify_by_text BOOLEAN NOT NULL DEFAULT FALSE`;
      await sql`ALTER TABLE app_users ADD COLUMN IF NOT EXISTS theme_name TEXT NOT NULL DEFAULT 'lavender'`;
      await sql`ALTER TABLE app_users ADD COLUMN IF NOT EXISTS theme_mode TEXT NOT NULL DEFAULT 'light'`;
      await sql`ALTER TABLE app_users ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER NOT NULL DEFAULT 0`;
      await sql`ALTER TABLE app_users ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ`;
      await sql`ALTER TABLE app_users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ`;
      await sql`ALTER TABLE client_requests ADD COLUMN IF NOT EXISTS details JSONB NOT NULL DEFAULT '{}'::jsonb`;
      await sql`ALTER TABLE client_requests ADD COLUMN IF NOT EXISTS resolution_note TEXT`;
      await sql`
        DO $$
        BEGIN
          IF EXISTS (
            SELECT 1
            FROM pg_constraint c
            JOIN pg_class t ON t.oid = c.conrelid
            WHERE t.relname = 'client_requests'
              AND c.conname = 'client_requests_request_type_check'
          ) THEN
            ALTER TABLE client_requests DROP CONSTRAINT client_requests_request_type_check;
          END IF;

          ALTER TABLE client_requests
          ADD CONSTRAINT client_requests_request_type_check
          CHECK (request_type IN ('appointment', 'appointment_change', 'new_pet', 'profile_update', 'general'));
        END $$;
      `;
      await sql`
        DO $$
        BEGIN
          IF EXISTS (
            SELECT 1
            FROM pg_constraint c
            JOIN pg_class t ON t.oid = c.conrelid
            WHERE t.relname = 'app_users'
              AND c.conname = 'app_users_role_check'
              AND pg_get_constraintdef(c.oid) NOT LIKE '%client%'
          ) THEN
            ALTER TABLE app_users DROP CONSTRAINT app_users_role_check;
          END IF;

          IF NOT EXISTS (
            SELECT 1
            FROM pg_constraint c
            JOIN pg_class t ON t.oid = c.conrelid
            WHERE t.relname = 'app_users'
              AND c.conname = 'app_users_role_check'
          ) THEN
            ALTER TABLE app_users
            ADD CONSTRAINT app_users_role_check
            CHECK (role IN ('admin', 'groomer', 'client'));
          END IF;
        END
        $$;
      `;
      await sql`CREATE INDEX IF NOT EXISTS idx_pets_owner_id ON pets(owner_id)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_appointments_owner_id ON appointments(owner_id)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_appointments_pet_id ON appointments(pet_id)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_appointments_start_at ON appointments(start_at)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_owner_notes_owner_id ON owner_notes(owner_id)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_pet_notes_pet_id ON pet_notes(pet_id)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_appointment_notes_appointment_id ON appointment_notes(appointment_id)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_app_sessions_user_id ON app_sessions(user_id)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_app_sessions_expires_at ON app_sessions(expires_at)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id ON user_notifications(user_id)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_user_notifications_is_read ON user_notifications(is_read)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_user_password_tokens_user_id ON user_password_tokens(user_id)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_user_password_tokens_token ON user_password_tokens(token)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_appointment_response_tokens_token ON appointment_response_tokens(token)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_appointment_response_tokens_appointment_id ON appointment_response_tokens(appointment_id)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_appointment_notifications_appointment_id ON appointment_notifications(appointment_id)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_appointment_notifications_type ON appointment_notifications(notification_type)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_appointment_response_requests_appointment_id ON appointment_response_requests(appointment_id)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_app_users_owner_id ON app_users(owner_id)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_client_requests_owner_id ON client_requests(owner_id)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_client_requests_pet_id ON client_requests(pet_id)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_client_requests_status ON client_requests(status)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_client_request_events_request_id ON client_request_events(request_id)`;
      await seedDefaultUsers();
    })();
  }

  return schemaReadyPromise;
}

async function fetchOwnerNotes(ownerId) {
  if (ownerId) {
    return sql`
      SELECT id::text AS id, owner_id::text AS owner_id, created_by_user_id::text AS created_by_user_id,
             created_by_name, text, visibility, is_archived, archived_at, created_at, updated_at
      FROM owner_notes
      WHERE owner_id = ${ownerId}::uuid
      ORDER BY created_at ASC
    `;
  }

  return sql`
    SELECT id::text AS id, owner_id::text AS owner_id, created_by_user_id::text AS created_by_user_id,
           created_by_name, text, visibility, is_archived, archived_at, created_at, updated_at
    FROM owner_notes
    ORDER BY created_at ASC
  `;
}

async function fetchPetNotes(petId) {
  if (petId) {
    return sql`
      SELECT id::text AS id, pet_id::text AS pet_id, created_by_user_id::text AS created_by_user_id,
             created_by_name, text, visibility, is_archived, archived_at, created_at, updated_at
      FROM pet_notes
      WHERE pet_id = ${petId}::uuid
      ORDER BY created_at ASC
    `;
  }

  return sql`
    SELECT id::text AS id, pet_id::text AS pet_id, created_by_user_id::text AS created_by_user_id,
           created_by_name, text, visibility, is_archived, archived_at, created_at, updated_at
    FROM pet_notes
    ORDER BY created_at ASC
  `;
}

async function fetchAppointmentNotes(appointmentId) {
  if (appointmentId) {
    return sql`
      SELECT id::text AS id, appointment_id::text AS appointment_id, created_by_user_id::text AS created_by_user_id,
             created_by_name, text, visibility, is_archived, archived_at, created_at, updated_at
      FROM appointment_notes
      WHERE appointment_id = ${appointmentId}::uuid
      ORDER BY created_at ASC
    `;
  }

  return sql`
    SELECT id::text AS id, appointment_id::text AS appointment_id, created_by_user_id::text AS created_by_user_id,
           created_by_name, text, visibility, is_archived, archived_at, created_at, updated_at
    FROM appointment_notes
    ORDER BY created_at ASC
  `;
}

async function listClientRequestEventsByRequestIds(requestIds, { includeStaffOnly = false } = {}) {
  if (!requestIds.length) {
    return new Map();
  }

  const rows = includeStaffOnly
    ? await sql`
        SELECT id::text AS id, request_id::text AS request_id, actor_user_id::text AS actor_user_id,
               actor_role, actor_name, event_type, title, detail, audience, created_at
        FROM client_request_events
        WHERE request_id = ANY(${requestIds})
        ORDER BY created_at ASC
      `
    : await sql`
        SELECT id::text AS id, request_id::text AS request_id, actor_user_id::text AS actor_user_id,
               actor_role, actor_name, event_type, title, detail, audience, created_at
        FROM client_request_events
        WHERE request_id = ANY(${requestIds})
          AND audience = 'all'
        ORDER BY created_at ASC
      `;

  return rows.reduce((map, row) => {
    const event = mapClientRequestEventRow(row);
    const current = map.get(event.requestId) ?? [];
    current.push(event);
    map.set(event.requestId, current);
    return map;
  }, new Map());
}

async function listClientRequests({ ownerId, includeStaffOnly = false } = {}) {
  const rows = ownerId
    ? await sql`
        SELECT id::text AS id, owner_id::text AS owner_id, pet_id::text AS pet_id,
               created_by_user_id::text AS created_by_user_id, request_type, status,
               subject, client_note, resolution_note, internal_note, details, resolved_at, created_at, updated_at
        FROM client_requests
        WHERE owner_id = ${ownerId}::uuid
        ORDER BY created_at DESC
      `
    : await sql`
        SELECT id::text AS id, owner_id::text AS owner_id, pet_id::text AS pet_id,
               created_by_user_id::text AS created_by_user_id, request_type, status,
               subject, client_note, resolution_note, internal_note, details, resolved_at, created_at, updated_at
        FROM client_requests
        ORDER BY created_at DESC
      `;

  const eventMap = await listClientRequestEventsByRequestIds(
    rows.map((row) => row.id),
    { includeStaffOnly },
  );

  return rows.map((row) =>
    mapClientRequestRow({
      ...row,
      events: eventMap.get(row.id) ?? [],
    }),
  );
}

async function getClientRequest(requestId, { includeStaffOnly = false } = {}) {
  const rows = await sql`
    SELECT id::text AS id, owner_id::text AS owner_id, pet_id::text AS pet_id,
           created_by_user_id::text AS created_by_user_id, request_type, status,
           subject, client_note, resolution_note, internal_note, details, resolved_at, created_at, updated_at
    FROM client_requests
    WHERE id = ${requestId}::uuid
    LIMIT 1
  `;

  if (!rows[0]) {
    return null;
  }

  const eventMap = await listClientRequestEventsByRequestIds([rows[0].id], {
    includeStaffOnly,
  });

  return mapClientRequestRow({
    ...rows[0],
    events: eventMap.get(rows[0].id) ?? [],
  });
}

async function listOwners() {
  const [ownerRows, noteRows] = await Promise.all([
    sql`
      SELECT id::text AS id, first_name, last_name, phone, email, preferred_contact_method,
             address, is_archived, archived_at,
             EXISTS(
               SELECT 1
               FROM app_users u
               WHERE u.owner_id = owners.id
                 AND u.role = 'client'
             ) AS has_portal_account
      FROM owners
      ORDER BY last_name ASC, first_name ASC
    `,
    fetchOwnerNotes(),
  ]);

  const noteMap = groupNotes(noteRows, "owner_id");
  return ownerRows.map((row) => mapOwnerRow(row, noteMap.get(row.id) ?? []));
}

async function getOwner(id) {
  const rows = await sql`
    SELECT id::text AS id, first_name, last_name, phone, email, preferred_contact_method,
           address, is_archived, archived_at,
           EXISTS(
             SELECT 1
             FROM app_users u
             WHERE u.owner_id = owners.id
               AND u.role = 'client'
           ) AS has_portal_account
    FROM owners
    WHERE id = ${id}::uuid
  `;
  if (rows.length === 0) {
    return null;
  }

  const noteRows = await fetchOwnerNotes(id);
  return mapOwnerRow(rows[0], noteRows.map(mapNoteRow));
}

async function listPets() {
  const [petRows, noteRows] = await Promise.all([
    sql`
      SELECT id::text AS id, owner_id::text AS owner_id, name, species, breed, weight_lbs,
             age_years, birth_date, is_birth_date_estimated, color, is_archived, archived_at
      FROM pets
      ORDER BY name ASC
    `,
    fetchPetNotes(),
  ]);

  const noteMap = groupNotes(noteRows, "pet_id");
  return petRows.map((row) => mapPetRow(row, noteMap.get(row.id) ?? []));
}

async function getPet(id) {
  const rows = await sql`
    SELECT id::text AS id, owner_id::text AS owner_id, name, species, breed,
           weight_lbs, age_years, birth_date, is_birth_date_estimated, color, is_archived, archived_at
    FROM pets
    WHERE id = ${id}::uuid
  `;
  if (rows.length === 0) {
    return null;
  }

  const noteRows = await fetchPetNotes(id);
  return mapPetRow(rows[0], noteRows.map(mapNoteRow));
}

async function listAppointments() {
  const [appointmentRows, noteRows] = await Promise.all([
    sql`
      SELECT id::text AS id, owner_id::text AS owner_id, pet_id::text AS pet_id, start_at, end_at,
             service_type, selected_services, custom_service_type, cost, quote_price,
             actual_price_charged, payment_status, status,
             confirmation_sent_at, confirmed_at, is_archived, archived_at
      FROM appointments
      ORDER BY start_at ASC
    `,
    fetchAppointmentNotes(),
  ]);

  const noteMap = groupNotes(noteRows, "appointment_id");
  return appointmentRows.map((row) =>
    mapAppointmentRow(row, noteMap.get(row.id) ?? []),
  );
}

async function getAppointment(id) {
  const rows = await sql`
    SELECT id::text AS id, owner_id::text AS owner_id, pet_id::text AS pet_id,
           start_at, end_at, service_type, selected_services, custom_service_type,
           cost, quote_price, actual_price_charged, payment_status, status,
           confirmation_sent_at, confirmed_at, is_archived, archived_at
    FROM appointments
    WHERE id = ${id}::uuid
  `;
  if (rows.length === 0) {
    return null;
  }

  const noteRows = await fetchAppointmentNotes(id);
  return mapAppointmentRow(rows[0], noteRows.map(mapNoteRow));
}

async function getUserByIdentifier(identifier) {
  const normalized = identifier.trim().toLowerCase();
  const rows = await sql`
    SELECT id::text AS id, email, username, password_hash, role, display_name, first_name,
           last_name, phone, owner_id::text AS owner_id, notify_by_email,
           notify_by_text, theme_name, theme_mode, is_active, failed_login_attempts, locked_at
    FROM app_users
    WHERE LOWER(email) = ${normalized}
       OR LOWER(COALESCE(username, '')) = ${normalized}
  `;
  return rows[0] ?? null;
}

async function listAppUsers() {
  const rows = await sql`
    SELECT id::text AS id, email, username, role, display_name, first_name, last_name, phone,
           owner_id::text AS owner_id, notify_by_email, notify_by_text, theme_name, theme_mode, is_active,
           failed_login_attempts, locked_at, created_at, updated_at
    FROM app_users
    ORDER BY last_name ASC, first_name ASC, email ASC
  `;
  return rows.map(mapAppUser);
}

async function getAppointmentWithRelations(appointmentId) {
  const appointmentRows = await sql`
    SELECT id::text AS id, owner_id::text AS owner_id, pet_id::text AS pet_id,
           start_at, end_at, service_type, selected_services, custom_service_type,
           cost, quote_price, actual_price_charged, payment_status, status,
           confirmation_sent_at, confirmed_at, is_archived, archived_at
    FROM appointments
    WHERE id = ${appointmentId}::uuid
    LIMIT 1
  `;

  if (appointmentRows.length === 0) {
    return null;
  }

  const appointment = mapAppointmentRow(appointmentRows[0]);
  const ownerRows = await sql`
    SELECT id::text AS id, first_name, last_name, phone, email, preferred_contact_method, address, is_archived, archived_at,
           EXISTS(
             SELECT 1
             FROM app_users u
             WHERE u.owner_id = owners.id
               AND u.role = 'client'
           ) AS has_portal_account
    FROM owners
    WHERE id = ${appointment.ownerId}::uuid
    LIMIT 1
  `;
  const petRows = await sql`
    SELECT id::text AS id, owner_id::text AS owner_id, name, species, breed, weight_lbs, age_years, birth_date, is_birth_date_estimated, color, is_archived, archived_at
    FROM pets
    WHERE id = ${appointment.petId}::uuid
    LIMIT 1
  `;

  if (ownerRows.length === 0 || petRows.length === 0) {
    return null;
  }

  return {
    appointment,
    owner: mapOwnerRow(ownerRows[0]),
    pet: mapPetRow(petRows[0]),
  };
}

async function createAppointmentResponseToken(appointmentId, ownerId, notificationType, channel) {
  const token = randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + RESPONSE_TOKEN_DURATION_MS).toISOString();
  await sql`
    INSERT INTO appointment_response_tokens (
      appointment_id, owner_id, token, notification_type, channel, expires_at
    )
    VALUES (
      ${appointmentId}::uuid,
      ${ownerId}::uuid,
      ${token},
      ${notificationType},
      ${channel},
      ${expiresAt}::timestamptz
    )
  `;
  return token;
}

async function logAppointmentNotification({
  appointmentId,
  ownerId,
  notificationType,
  recipientType,
  channel,
  recipientAddress,
  status,
  metadata,
}) {
  const rows = await sql`
    INSERT INTO appointment_notifications (
      appointment_id, owner_id, notification_type, recipient_type, channel,
      recipient_address, status, metadata, sent_at
    )
    VALUES (
      ${appointmentId}::uuid,
      ${ownerId ? `${ownerId}` : null}::uuid,
      ${notificationType},
      ${recipientType},
      ${channel},
      ${recipientAddress},
      ${status},
      ${metadata ?? {}},
      ${status === "sent" || status === "simulated" ? new Date().toISOString() : null}
    )
    RETURNING id::text AS id, appointment_id::text AS appointment_id, owner_id::text AS owner_id,
              notification_type, recipient_type, channel, recipient_address, status, metadata, sent_at, created_at
  `;
  return mapAppointmentNotificationRow(rows[0]);
}

async function deliverEmailNotification(payload) {
  const resendApiKey = process.env.RESEND_API_KEY;
  const fromAddress = process.env.EMAIL_FROM_ADDRESS;
  const fromName = process.env.EMAIL_FROM_NAME ?? "Barks Bubbles & Love";
  const replyToAddress =
    process.env.EMAIL_REPLY_TO ??
    process.env.APP_GROOMER_EMAIL ??
    undefined;

  if (resendApiKey && fromAddress) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: `${fromName} <${fromAddress}>`,
        to: Array.isArray(payload.to) ? payload.to : [payload.to],
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
        reply_to: replyToAddress,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Email delivery failed.");
      throw new Error(errorText || "Email delivery failed.");
    }

    return { status: "sent" };
  }

  const webhookUrl = process.env.EMAIL_NOTIFICATION_WEBHOOK_URL;
  if (!webhookUrl) {
    console.log("Simulated email notification", payload);
    return { status: "simulated" };
  }

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Email delivery failed.");
    throw new Error(errorText || "Email delivery failed.");
  }

  return { status: "sent" };
}

async function deliverTextNotification(payload) {
  const webhookUrl = process.env.SMS_NOTIFICATION_WEBHOOK_URL;
  if (!webhookUrl) {
    console.log("Simulated text notification", payload);
    return { status: "simulated" };
  }

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "SMS delivery failed.");
    throw new Error(errorText || "SMS delivery failed.");
  }

  return { status: "sent" };
}

async function createUserNotification(userId, type, title, body, href = null, metadata = {}) {
  const rows = await sql`
    INSERT INTO user_notifications (user_id, type, title, body, href, metadata)
    VALUES (${userId}::uuid, ${type}, ${title}, ${body}, ${href}, ${metadata})
    RETURNING id::text AS id, user_id::text AS user_id, type, title, body, href, metadata, is_read, read_at, created_at
  `;
  return mapUserNotificationRow(rows[0]);
}

async function listUserNotifications(userId) {
  const rows = await sql`
    SELECT id::text AS id, user_id::text AS user_id, type, title, body, href, metadata, is_read, read_at, created_at
    FROM user_notifications
    WHERE user_id = ${userId}::uuid
      AND is_read = FALSE
    ORDER BY created_at DESC
    LIMIT 50
  `;
  return rows.map(mapUserNotificationRow);
}

async function listAllUserNotifications(userId) {
  const rows = await sql`
    SELECT id::text AS id, user_id::text AS user_id, type, title, body, href, metadata, is_read, read_at, created_at
    FROM user_notifications
    WHERE user_id = ${userId}::uuid
    ORDER BY created_at DESC
    LIMIT 200
  `;
  return rows.map(mapUserNotificationRow);
}

async function markUserNotificationRead(userId, notificationId) {
  const rows = await sql`
    UPDATE user_notifications
    SET is_read = TRUE, read_at = COALESCE(read_at, NOW())
    WHERE id = ${notificationId}::uuid
      AND user_id = ${userId}::uuid
    RETURNING id::text AS id, user_id::text AS user_id, type, title, body, href, metadata, is_read, read_at, created_at
  `;
  return rows[0] ? mapUserNotificationRow(rows[0]) : null;
}

async function listActiveUsersByRoles(roles) {
  const rows = await sql`
    SELECT id::text AS id, email, username, role, display_name, first_name, last_name, phone,
           owner_id::text AS owner_id, notify_by_email, notify_by_text, theme_name, theme_mode, is_active,
           failed_login_attempts, locked_at, created_at, updated_at
    FROM app_users
    WHERE role = ANY(${roles})
      AND is_active = TRUE
  `;
  return rows.map(mapAppUser);
}

async function listActiveUsersByOwner(ownerId) {
  const rows = await sql`
    SELECT id::text AS id, email, username, role, display_name, first_name, last_name, phone,
           owner_id::text AS owner_id, notify_by_email, notify_by_text, theme_name, theme_mode, is_active,
           failed_login_attempts, locked_at, created_at, updated_at
    FROM app_users
    WHERE owner_id = ${ownerId}::uuid
      AND is_active = TRUE
  `;
  return rows.map(mapAppUser);
}

async function sendUserContactNotification(user, { subject, html, text }) {
  if (!user.email) {
    return;
  }
  await deliverEmailNotification({ to: user.email, subject, html, text });
}

async function createPasswordToken(userId, purpose, tempPassword) {
  const token = randomBytes(24).toString("hex");
  const rows = await sql`
    INSERT INTO user_password_tokens (user_id, purpose, token, temp_password_hash, expires_at)
    VALUES (
      ${userId}::uuid,
      ${purpose},
      ${token},
      ${tempPassword ? hashPassword(tempPassword) : null},
      ${new Date(Date.now() + PASSWORD_TOKEN_DURATION_MS).toISOString()}
    )
    RETURNING id::text AS id, token
  `;
  return rows[0].token;
}

function buildAppointmentSummary(appointment, owner, pet) {
  return {
    appointmentId: appointment.id,
    ownerName: `${owner.firstName} ${owner.lastName}`.trim(),
    petName: pet.name,
    serviceSummary:
      appointment.customServiceType ||
      appointment.serviceType ||
      (appointment.selectedServices ?? []).join(", ") ||
      "Grooming appointment",
    startsAt: appointment.start,
    endsAt: appointment.end,
    status: appointment.status,
  };
}

function getPublicGroomerContact() {
  const firstName =
    process.env.APP_GROOMER_FIRST_NAME ??
    process.env.APP_GROOMER_NAME?.split(" ")[0] ??
    "Pet";
  const lastName =
    process.env.APP_GROOMER_LAST_NAME ??
    process.env.APP_GROOMER_NAME?.split(" ").slice(1).join(" ") ??
    "Groomer";

  return {
    name: `${firstName} ${lastName}`.trim(),
    email: process.env.APP_GROOMER_EMAIL ?? process.env.EMAIL_REPLY_TO ?? undefined,
    phone: process.env.APP_GROOMER_PHONE ?? undefined,
  };
}

function formatAppointmentDateTime(value) {
  if (!value) {
    return "Not provided";
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return `${value}`;
  }

  const timeZone =
    process.env.EMAIL_TIMEZONE ??
    process.env.APP_TIMEZONE ??
    "America/Chicago";

  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone,
    timeZoneName: "short",
  }).format(parsedDate);
}

function getClientAvailableActions(appointmentStatus) {
  if (appointmentStatus === "scheduled") {
    return ["confirm", "cancel", "reschedule"];
  }
  if (appointmentStatus === "confirmed") {
    return ["cancel", "reschedule"];
  }
  return [];
}

function buildAppointmentChangeRequestSubject(summary, action) {
  return `${action === "cancel" ? "Cancel" : "Reschedule"} request for ${summary.petName}`;
}

function buildClientEmailNotification({
  summary,
  token,
  notificationType,
  isCancellation = false,
}) {
  const responsePageUrl = token
    ? buildAppUrl(`/appointment-response?token=${token}`)
    : null;
  const formattedStart = formatAppointmentDateTime(summary.startsAt);
  const formattedEnd = formatAppointmentDateTime(summary.endsAt);
  const actionButtons = isCancellation
    ? ""
    : !responsePageUrl
      ? ""
      : `<a href="${responsePageUrl}" style="display:inline-block;margin:0 8px 10px 0;padding:12px 18px;border-radius:10px;text-decoration:none;font-weight:700;font-family:Arial,Helvetica,sans-serif;background:#7a5ccf;color:#ffffff;border:1px solid #6a4fc0;">Manage Appointment</a>`;
  const subject = isCancellation
    ? `Appointment Update for ${summary.petName}`
    : notificationType === "reminder_24h"
      ? `Appointment Reminder for ${summary.petName}`
      : `Appointment Scheduled for ${summary.petName}`;
  const intro = isCancellation
    ? "Your appointment has been cancelled."
    : notificationType === "reminder_24h"
      ? "This is a reminder about your upcoming appointment."
      : "Your appointment has been scheduled.";
  const text = [
    intro,
    `${summary.petName} for ${summary.ownerName}`,
    `Starts: ${formattedStart}`,
    `Ends: ${formattedEnd}`,
    `Service: ${summary.serviceSummary}`,
    !isCancellation && responsePageUrl ? `Manage this appointment: ${responsePageUrl}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return {
    subject,
    html: `
      <div style="margin:0;padding:20px;background:#f6f2ff;">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:620px;margin:0 auto;background:#ffffff;border:1px solid #e7defa;border-radius:16px;overflow:hidden;font-family:Arial,Helvetica,sans-serif;color:#2f2850;">
          <tr>
            <td style="padding:16px 22px;background:linear-gradient(135deg,#f1e8ff,#dccdfd);color:#1f172f;">
              <div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;opacity:.85;">Barks Bubbles &amp; Love</div>
              <div style="font-size:20px;font-weight:700;margin-top:4px;color:#111111;">Appointment Update</div>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 22px 8px 22px;">
              <p style="margin:0 0 14px 0;line-height:1.5;">${intro}</p>
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:separate;border-spacing:0 8px;">
                <tr><td style="font-weight:700;width:130px;">Pet</td><td>${summary.petName}</td></tr>
                <tr><td style="font-weight:700;">Client</td><td>${summary.ownerName}</td></tr>
                <tr><td style="font-weight:700;">Starts</td><td>${formattedStart}</td></tr>
                <tr><td style="font-weight:700;">Ends</td><td>${formattedEnd}</td></tr>
                <tr><td style="font-weight:700;">Service</td><td>${summary.serviceSummary}</td></tr>
              </table>
            </td>
          </tr>
          ${
            actionButtons
              ? `<tr><td style="padding:10px 22px 4px 22px;"><div style="font-size:14px;font-weight:700;margin:0 0 10px 0;">Manage this appointment</div>${actionButtons}</td></tr>`
              : ""
          }
          ${
            responsePageUrl && !isCancellation
              ? `<tr><td style="padding:8px 22px 20px 22px;"><a href="${responsePageUrl}" style="font-size:13px;color:#7a5ccf;text-decoration:underline;">Open appointment response page</a></td></tr>`
              : ""
          }
        </table>
      </div>
    `,
    text,
    responsePageUrl,
  };
}

function buildClientTextNotification({ summary, token, notificationType, isCancellation = false }) {
  const responsePageUrl = token
    ? buildAppUrl(`/appointment-response?token=${token}`)
    : null;
  const formattedStart = formatAppointmentDateTime(summary.startsAt);
  if (isCancellation) {
    return `Appointment update: ${summary.petName} on ${formattedStart} has been cancelled.`;
  }
  const prefix =
    notificationType === "reminder_24h"
      ? "Reminder:"
      : "Scheduled:";
  return `${prefix} ${summary.petName} on ${formattedStart}.${responsePageUrl ? ` Manage online: ${responsePageUrl}` : ""}`;
}

function getRequestTypeLabel(requestType) {
  switch (requestType) {
    case "appointment_change":
      return "Cancel/Reschedule Request";
    case "new_pet":
      return "New Pet Request";
    case "profile_update":
      return "Profile Update";
    case "general":
      return "General Request";
    default:
      return "Appointment Request";
  }
}

async function notifyStaffOfRequest(requestRecord) {
  const recipients = await listActiveUsersByRoles(["admin", "groomer"]);
  const title = `${getRequestTypeLabel(requestRecord.requestType)} received`;
  const body = requestRecord.subject;
  const href = `/requests?requestId=${requestRecord.id}`;
  await Promise.all(
    recipients.map(async (recipient) => {
      await createUserNotification(recipient.id, "request_created", title, body, href, {
        requestId: requestRecord.id,
        requestType: requestRecord.requestType,
      });
      await sendUserContactNotification(recipient, {
        subject: title,
        html: `<p>${body}</p><p><a href="${buildAppUrl(href)}">Open request</a></p>`,
        text: `${body}. Open request: ${buildAppUrl(href)}`,
      });
    }),
  );
}

async function notifyClientUsersOfRequestUpdate(requestRecord) {
  const recipients = await listActiveUsersByOwner(requestRecord.ownerId);
  const title = `${getRequestTypeLabel(requestRecord.requestType)} updated`;
  const body = requestRecord.subject;
  const href = `/requests?requestId=${requestRecord.id}`;
  await Promise.all(
    recipients.map(async (recipient) => {
      await createUserNotification(recipient.id, "request_updated", title, body, href, {
        requestId: requestRecord.id,
        requestType: requestRecord.requestType,
      });
      await sendUserContactNotification(recipient, {
        subject: title,
        html: `<p>${body}</p><p><a href="${buildAppUrl(href)}">View request</a></p>`,
        text: `${body}. View request: ${buildAppUrl(href)}`,
      });
    }),
  );
}

async function notifyClientUsersOfScheduledAppointment(appointment) {
  const recipients = await listActiveUsersByOwner(appointment.ownerId);
  const href = `/appointments?appointmentId=${appointment.id}`;
  await Promise.all(
    recipients.map((recipient) =>
      createUserNotification(
        recipient.id,
        "appointment_scheduled",
        "Appointment Scheduled",
        `An appointment was scheduled for ${new Date(appointment.start).toLocaleString()}.`,
        href,
        { appointmentId: appointment.id },
      ),
    ),
  );
}

async function notifyAdminsOfLockout(user) {
  const admins = await listActiveUsersByRoles(["admin"]);
  const title = "User account locked";
  const body = `${user.firstName} ${user.lastName}`.trim() || user.email;
  await Promise.all(
    admins.map(async (admin) => {
      await createUserNotification(admin.id, "account_locked", title, body, "/users", {
        userId: user.id,
      });
      await sendUserContactNotification(admin, {
        subject: title,
        html: `<p>${body} has been locked after repeated sign-in failures.</p><p><a href="${buildAppUrl("/users")}">Open users</a></p>`,
        text: `${body} has been locked after repeated sign-in failures. Open users: ${buildAppUrl("/users")}`,
      });
    }),
  );
}

async function updateAppointmentConfirmationState(appointmentId) {
  await sql`
    UPDATE appointments
    SET status = 'confirmed',
        confirmed_at = COALESCE(confirmed_at, NOW()),
        updated_at = NOW()
    WHERE id = ${appointmentId}::uuid
      AND status = 'scheduled'
  `;
  return getAppointment(appointmentId);
}

async function createAppointmentResponseRequest(appointmentId, ownerId, action, source) {
  await sql`
    INSERT INTO appointment_response_requests (appointment_id, owner_id, action, source)
    VALUES (${appointmentId}::uuid, ${ownerId}::uuid, ${action}, ${source})
  `;
}

async function listActiveGroomerRecipients() {
  const rows = await sql`
    SELECT id::text AS id, email, role, display_name, first_name, last_name, phone,
           notify_by_email, notify_by_text, is_active, created_at, updated_at
    FROM app_users
    WHERE role = 'groomer' AND is_active = TRUE
  `;
  return rows.map(mapAppUser);
}

async function notifyGroomersOfClientRequest(summary, action, source) {
  const groomers = await listActiveGroomerRecipients();
  const subject = `Client requested ${action} for ${summary.petName}`;
  const text = `Client response received via ${source}: ${action.toUpperCase()} for ${summary.petName} (${summary.ownerName}) at ${summary.startsAt}.`;

  await Promise.all(
    groomers
      .filter((groomer) => Boolean(groomer.email))
      .map((groomer) =>
        deliverEmailNotification({
          to: groomer.email,
          subject,
          html: `<p>${text}</p>`,
          text,
        }).then((result) =>
          logAppointmentNotification({
            appointmentId: summary.appointmentId,
            ownerId: null,
            notificationType: `groomer_${action}_request`,
            recipientType: "groomer",
            channel: "email",
            recipientAddress: groomer.email,
            status: result.status,
            metadata: { source },
          }),
        ),
      ),
  );
}

async function sendClientAppointmentNotification(appointmentId, notificationType, options = {}) {
  const details = await getAppointmentWithRelations(appointmentId);
  if (!details) {
    return null;
  }

  const { appointment, owner, pet } = details;
  const summary = buildAppointmentSummary(appointment, owner, pet);
  const isCancellation = options.isCancellation === true;
  const preferredChannel = owner.email ? "email" : null;

  if (!preferredChannel) {
    return null;
  }

  const token = isCancellation
    ? null
    : await createAppointmentResponseToken(
        appointment.id,
        owner.id,
        notificationType,
        preferredChannel,
      );

  const content = buildClientEmailNotification({
    summary,
    token,
    notificationType,
    isCancellation,
  });
  const result = await deliverEmailNotification({
    to: owner.email,
    subject: content.subject,
    html: content.html,
    text: content.text,
  });
  await logAppointmentNotification({
    appointmentId: appointment.id,
    ownerId: owner.id,
    notificationType,
    recipientType: "client",
    channel: "email",
    recipientAddress: owner.email,
    status: result.status,
    metadata: { responsePageUrl: content.responsePageUrl },
  });

  await sql`
    UPDATE appointments
    SET confirmation_sent_at = NOW(),
        updated_at = NOW()
    WHERE id = ${appointment.id}::uuid
  `;

  return summary;
}

async function createSession(userId) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS).toISOString();
  await sql`
    INSERT INTO app_sessions (user_id, session_token, expires_at)
    VALUES (${userId}::uuid, ${token}, ${expiresAt}::timestamptz)
  `;
  return { token, expiresAt };
}

async function deleteSession(token) {
  await sql`DELETE FROM app_sessions WHERE session_token = ${token}`;
}

async function clearUserSessions(userId) {
  await sql`DELETE FROM app_sessions WHERE user_id = ${userId}::uuid`;
}

async function resetFailedLoginState(userId) {
  await sql`
    UPDATE app_users
    SET failed_login_attempts = 0,
        locked_at = NULL,
        last_login_at = NOW(),
        updated_at = NOW()
    WHERE id = ${userId}::uuid
  `;
}

async function incrementFailedLoginAttempt(user) {
  const nextCount = (user.failed_login_attempts ?? 0) + 1;
  const shouldLock = nextCount >= LOGIN_LOCK_THRESHOLD;
  const rows = await sql`
    UPDATE app_users
    SET failed_login_attempts = ${nextCount},
        locked_at = CASE WHEN ${shouldLock} THEN NOW() ELSE locked_at END,
        updated_at = NOW()
    WHERE id = ${user.id}::uuid
    RETURNING id::text AS id, email, username, role, display_name, first_name, last_name, phone,
              owner_id::text AS owner_id, notify_by_email, notify_by_text, theme_name, theme_mode, is_active,
              failed_login_attempts, locked_at, created_at, updated_at
  `;
  return rows[0] ? mapAppUser(rows[0]) : null;
}

async function getCurrentUser(event) {
  const cookies = parseCookies(event);
  const token = cookies[SESSION_COOKIE];
  if (!token) {
    return null;
  }

  const rows = await sql`
    SELECT u.id::text AS id, u.email, u.username, u.role, u.display_name, u.first_name,
           u.last_name, u.phone, u.owner_id::text AS owner_id, u.notify_by_email,
           u.notify_by_text, u.theme_name, u.theme_mode, u.is_active, u.failed_login_attempts, u.locked_at
    FROM app_sessions s
    JOIN app_users u ON u.id = s.user_id
    WHERE s.session_token = ${token}
      AND s.expires_at > NOW()
      AND u.is_active = TRUE
    LIMIT 1
  `;

  return rows[0] ?? null;
}

async function getUserAuthRecordById(userId) {
  const rows = await sql`
    SELECT id::text AS id, email, username, password_hash, role, display_name, first_name,
           last_name, phone, owner_id::text AS owner_id, notify_by_email,
           notify_by_text, theme_name, theme_mode, is_active, failed_login_attempts, locked_at,
           created_at, updated_at
    FROM app_users
    WHERE id = ${userId}::uuid
    LIMIT 1
  `;
  return rows[0] ?? null;
}

function validateUserProfilePayload(payload) {
  const firstName = requiredString(payload.firstName, "firstName");
  const lastName = requiredString(payload.lastName, "lastName");
  const email = requiredEmail(payload.email, "email");
  const phone = optionalString(payload.phone);
  const notifyByEmail = optionalBoolean(payload.notifyByEmail, "notifyByEmail");
  const notifyByText = optionalBoolean(payload.notifyByText, "notifyByText");
  const themeName = optionalString(payload.themeName);
  let themeMode = optionalString(payload.themeMode);

  if (themeName && !themeNames.has(themeName)) {
    throw new Error("Theme selection is invalid.");
  }
  if (themeMode && !themeModes.has(themeMode)) {
    throw new Error("Theme mode is invalid.");
  }
  if (themeName === "high-contrast" && themeMode === "dark") {
    themeMode = "light";
  }

  if (notifyByText && !phone) {
    throw new Error("A phone number is required when text notifications are enabled.");
  }

  return {
    firstName,
    lastName,
    email,
    phone,
    notifyByEmail,
    notifyByText,
    themeName,
    themeMode,
  };
}

function validateManagedUserPayload(payload, { isNew = false } = {}) {
  const firstName = requiredString(payload.firstName, "firstName");
  const lastName = requiredString(payload.lastName, "lastName");
  const email = requiredEmail(payload.email, "email");
  const username = optionalString(payload.username)?.toLowerCase() ?? null;
  const phone = optionalString(payload.phone) ?? "";
  const role = requiredString(payload.role, "role");
  const notifyByEmail = optionalBoolean(payload.notifyByEmail, "notifyByEmail");
  const notifyByText = optionalBoolean(payload.notifyByText, "notifyByText");
  const isActive = optionalBoolean(payload.isActive, "isActive");
  const ownerId = optionalString(payload.ownerId);

  if (!appUserRoles.has(role)) {
    throw new Error("role is invalid.");
  }

  if (notifyByText && !phone) {
    throw new Error("A phone number is required when text notifications are enabled.");
  }

  if (role === "client" && !ownerId) {
    throw new Error("A linked client record is required for client users.");
  }

  let password;
  if (payload.password != null && payload.password !== "") {
    password = requiredString(payload.password, "password");
  } else if (isNew) {
    throw new Error("password is required.");
  }

  return {
    firstName,
    lastName,
    email,
    username,
    phone,
    role,
    notifyByEmail,
    notifyByText,
    isActive,
    ownerId: role === "client" ? ownerId : null,
    password,
  };
}

async function updateCurrentUserProfile(userId, payload) {
  const input = validateUserProfilePayload(payload);
  const displayName = `${input.firstName} ${input.lastName}`.trim();
  const currentUser = await getUserAuthRecordById(userId);

  if (!currentUser) {
    return null;
  }

  const duplicateEmail = await sql`
    SELECT id::text AS id
    FROM app_users
    WHERE email = ${input.email}
      AND id <> ${userId}::uuid
    LIMIT 1
  `;

  if (duplicateEmail.length > 0) {
    throw new Error("That email address is already in use.");
  }

  const rows = await sql`
    UPDATE app_users
    SET first_name = ${input.firstName},
        last_name = ${input.lastName},
        display_name = ${displayName},
        email = ${input.email},
        phone = ${input.phone},
        notify_by_email = ${input.notifyByEmail},
        notify_by_text = ${input.notifyByText},
        theme_name = COALESCE(${input.themeName}, theme_name),
        theme_mode = COALESCE(${input.themeMode}, theme_mode),
        updated_at = NOW()
    WHERE id = ${userId}::uuid
    RETURNING id::text AS id, email, username, role, display_name, first_name, last_name,
              phone, owner_id::text AS owner_id, notify_by_email, notify_by_text,
              theme_name, theme_mode,
              failed_login_attempts, locked_at
  `;

  if (currentUser.role === "client" && currentUser.owner_id) {
    await sql`
      UPDATE owners
      SET email = ${input.email},
          updated_at = NOW()
      WHERE id = ${currentUser.owner_id}::uuid
    `;
  }

  return rows[0] ? mapAppUser(rows[0]) : null;
}

async function changeCurrentUserPassword(userId, payload) {
  const currentPassword = requiredString(payload.currentPassword, "currentPassword");
  const newPassword = requiredString(payload.newPassword, "newPassword");

  if (newPassword.length < 8) {
    throw new Error("New password must be at least 8 characters.");
  }

  if (currentPassword === newPassword) {
    throw new Error("New password must be different from your current password.");
  }

  const user = await getUserAuthRecordById(userId);
  if (!user) {
    throw new Error("User not found.");
  }

  if (!verifyPassword(currentPassword, user.password_hash)) {
    throw new Error("Current password is incorrect.");
  }

  await sql`
    UPDATE app_users
    SET password_hash = ${hashPassword(newPassword)},
        updated_at = NOW()
    WHERE id = ${userId}::uuid
  `;

  return { ok: true };
}

async function createAppUser(payload) {
  const input = validateManagedUserPayload(payload, { isNew: true });
  const synchronizedEmail =
    input.role === "client" && input.ownerId
      ? await getOwnerEmailForClientUser(input.ownerId)
      : input.email;
  const displayName = `${input.firstName} ${input.lastName}`.trim();

  if (input.role === "client" && input.ownerId) {
    await getLinkedClientUserForOwner(input.ownerId);
  }

  const duplicateEmail = await sql`
    SELECT id::text AS id
    FROM app_users
    WHERE email = ${synchronizedEmail}
    LIMIT 1
  `;

  if (duplicateEmail.length > 0) {
    throw new Error("That email address is already in use.");
  }

  if (input.username) {
    const duplicateUsername = await sql`
      SELECT id::text AS id
      FROM app_users
      WHERE username = ${input.username}
      LIMIT 1
    `;
    if (duplicateUsername.length > 0) {
      throw new Error("That username is already in use.");
    }
  }

  const rows = await sql`
    INSERT INTO app_users (
      email, username, password_hash, role, display_name, first_name, last_name, phone,
      owner_id, notify_by_email, notify_by_text, is_active
    )
    VALUES (
      ${synchronizedEmail},
      ${input.username},
      ${hashPassword(input.password)},
      ${input.role},
      ${displayName},
      ${input.firstName},
      ${input.lastName},
      ${input.phone},
      ${input.ownerId}::uuid,
      ${input.notifyByEmail},
      ${input.notifyByText},
      ${input.isActive}
    )
    RETURNING id::text AS id, email, username, role, display_name, first_name, last_name,
              phone, owner_id::text AS owner_id, notify_by_email, notify_by_text,
              theme_name, theme_mode,
              is_active, failed_login_attempts, locked_at, created_at, updated_at
  `;

  return mapAppUser(rows[0]);
}

async function updateAppUser(userId, payload, currentUserId) {
  const input = validateManagedUserPayload(payload);
  const synchronizedEmail =
    input.role === "client" && input.ownerId
      ? await getOwnerEmailForClientUser(input.ownerId)
      : input.email;
  const displayName = `${input.firstName} ${input.lastName}`.trim();
  const existing = await sql`
    SELECT id::text AS id
    FROM app_users
    WHERE id = ${userId}::uuid
    LIMIT 1
  `;

  if (existing.length === 0) {
    return null;
  }

  if (currentUserId === userId && !input.isActive) {
    throw new Error("You cannot deactivate your own account.");
  }

  if (currentUserId === userId && input.role !== "admin") {
    throw new Error("You cannot change your own role.");
  }

  if (input.role === "client" && input.ownerId) {
    await getLinkedClientUserForOwner(input.ownerId, userId);
  }

  const duplicateEmail = await sql`
    SELECT id::text AS id
    FROM app_users
    WHERE email = ${synchronizedEmail}
      AND id <> ${userId}::uuid
    LIMIT 1
  `;

  if (duplicateEmail.length > 0) {
    throw new Error("That email address is already in use.");
  }

  if (input.username) {
    const duplicateUsername = await sql`
      SELECT id::text AS id
      FROM app_users
      WHERE username = ${input.username}
        AND id <> ${userId}::uuid
      LIMIT 1
    `;
    if (duplicateUsername.length > 0) {
      throw new Error("That username is already in use.");
    }
  }

  await sql`
    UPDATE app_users
    SET email = ${synchronizedEmail},
        username = ${input.username},
        role = ${input.role},
        display_name = ${displayName},
        first_name = ${input.firstName},
        last_name = ${input.lastName},
        phone = ${input.phone},
        owner_id = ${input.ownerId}::uuid,
        notify_by_email = ${input.notifyByEmail},
        notify_by_text = ${input.notifyByText},
        is_active = ${input.isActive},
        updated_at = NOW()
    WHERE id = ${userId}::uuid
  `;

  if (input.password) {
    await sql`
      UPDATE app_users
      SET password_hash = ${hashPassword(input.password)}, updated_at = NOW()
      WHERE id = ${userId}::uuid
    `;
  }

  const rows = await sql`
    SELECT id::text AS id, email, username, role, display_name, first_name, last_name, phone,
           owner_id::text AS owner_id, notify_by_email, notify_by_text, theme_name, theme_mode,
           is_active, failed_login_attempts, locked_at, created_at, updated_at
    FROM app_users
    WHERE id = ${userId}::uuid
  `;

  return rows[0] ? mapAppUser(rows[0]) : null;
}

async function deleteAppUser(userId, currentUserId) {
  if (userId === currentUserId) {
    throw new Error("You cannot delete your own account.");
  }

  const rows = await sql`
    DELETE FROM app_users
    WHERE id = ${userId}::uuid
    RETURNING id::text AS id, email, username, role, display_name, first_name, last_name,
              phone, owner_id::text AS owner_id, notify_by_email, notify_by_text,
              theme_name, theme_mode,
              is_active, failed_login_attempts, locked_at, created_at, updated_at
  `;

  return rows[0] ? mapAppUser(rows[0]) : null;
}

async function unlockAppUser(userId) {
  const rows = await sql`
    UPDATE app_users
    SET failed_login_attempts = 0,
        locked_at = NULL,
        updated_at = NOW()
    WHERE id = ${userId}::uuid
    RETURNING id::text AS id, email, username, role, display_name, first_name, last_name,
              phone, owner_id::text AS owner_id, notify_by_email, notify_by_text,
              theme_name, theme_mode,
              is_active, failed_login_attempts, locked_at, created_at, updated_at
  `;
  return rows[0] ? mapAppUser(rows[0]) : null;
}

async function getAppUser(userId) {
  const rows = await sql`
    SELECT id::text AS id, email, username, role, display_name, first_name, last_name,
           phone, owner_id::text AS owner_id, notify_by_email, notify_by_text,
           theme_name, theme_mode,
           is_active, failed_login_attempts, locked_at, created_at, updated_at
    FROM app_users
    WHERE id = ${userId}::uuid
    LIMIT 1
  `;
  return rows[0] ? mapAppUser(rows[0]) : null;
}

async function sendSetupEmailToUser(userId) {
  const user = await getAppUser(userId);
  if (!user || !user.email) {
    throw new Error("User not found.");
  }
  const temporaryPassword = randomBytes(6).toString("base64url");
  const token = await createPasswordToken(userId, "setup", temporaryPassword);
  const href = buildAppUrl(`/account-setup?token=${token}`);
  await sendUserContactNotification(user, {
    subject: "Finish Setting Up Your Account",
    html: `<p>Your account is ready.</p><p>Temporary password: <strong>${temporaryPassword}</strong></p><p><a href="${href}">Finish account setup</a></p>`,
    text: `Your account is ready. Temporary password: ${temporaryPassword}. Finish setup: ${href}`,
  });
  await createUserNotification(userId, "account_setup", "Finish account setup", "Complete your account setup using the link we sent.", href, { tokenPurpose: "setup" });
  return { ok: true };
}

async function sendPasswordResetToUser(userId) {
  const user = await getAppUser(userId);
  if (!user || !user.email) {
    throw new Error("User not found.");
  }
  const token = await createPasswordToken(userId, "password_reset", null);
  const href = buildAppUrl(`/reset-password?token=${token}`);
  await sendUserContactNotification(user, {
    subject: "Reset Your Password",
    html: `<p>We received a password reset request.</p><p><a href="${href}">Reset password</a></p>`,
    text: `Reset your password: ${href}`,
  });
  await createUserNotification(userId, "password_reset", "Password reset requested", "Use the link we sent to reset your password.", href, { tokenPurpose: "password_reset" });
  return { ok: true };
}

async function requestPasswordResetByEmail(email) {
  const user = await getUserByIdentifier(email);
  if (user?.id) {
    await sendPasswordResetToUser(user.id);
  }
  return { ok: true };
}

async function completePasswordToken(token, payload, purpose) {
  const rows = await sql`
    SELECT id::text AS id, user_id::text AS user_id, purpose, token, temp_password_hash, expires_at, used_at
    FROM user_password_tokens
    WHERE token = ${token}
    LIMIT 1
  `;
  const tokenRecord = rows[0];
  if (!tokenRecord || tokenRecord.purpose !== purpose) {
    throw new Error("That link is invalid.");
  }
  if (tokenRecord.used_at) {
    throw new Error("That link has already been used.");
  }
  if (new Date(tokenRecord.expires_at) < new Date()) {
    throw new Error("That link has expired.");
  }

  const password = requiredString(payload.password, "password");
  let username = null;
  if (purpose === "setup") {
    const tempPassword = requiredString(payload.tempPassword, "tempPassword");
    if (!tokenRecord.temp_password_hash || !verifyPassword(tempPassword, tokenRecord.temp_password_hash)) {
      throw new Error("Temporary password is invalid.");
    }
    username = payload.useEmail ? null : optionalString(payload.username)?.toLowerCase();
    if (!payload.useEmail && !username) {
      throw new Error("username is required unless useEmail is selected.");
    }
  }

  const user = await getAppUser(tokenRecord.user_id);
  if (!user) {
    throw new Error("User not found.");
  }

  const nextUsername = purpose === "setup" ? (payload.useEmail ? user.email.toLowerCase() : username) : user.username ?? null;
  if (nextUsername) {
    const duplicateUsername = await sql`
      SELECT id::text AS id
      FROM app_users
      WHERE username = ${nextUsername}
        AND id <> ${tokenRecord.user_id}::uuid
      LIMIT 1
    `;
    if (duplicateUsername.length > 0) {
      throw new Error("That username is already in use.");
    }
  }

  await sql`
    UPDATE app_users
    SET username = ${nextUsername},
        password_hash = ${hashPassword(password)},
        failed_login_attempts = 0,
        locked_at = NULL,
        updated_at = NOW()
    WHERE id = ${tokenRecord.user_id}::uuid
  `;
  await sql`
    UPDATE user_password_tokens
    SET used_at = NOW()
    WHERE id = ${tokenRecord.id}::uuid
  `;
  await clearUserSessions(tokenRecord.user_id);
  return { ok: true };
}

async function getResponseTokenRecord(token) {
  const rows = await sql`
    SELECT id::text AS id, appointment_id::text AS appointment_id, owner_id::text AS owner_id,
           token, notification_type, channel, expires_at, used_at, created_at
    FROM appointment_response_tokens
    WHERE token = ${token}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

async function getAppointmentResponseDetails(token) {
  const tokenRecord = await getResponseTokenRecord(token);
  if (!tokenRecord) {
    return null;
  }

  const details = await getAppointmentWithRelations(tokenRecord.appointment_id);
  if (!details) {
    return null;
  }

  const summary = buildAppointmentSummary(details.appointment, details.owner, details.pet);
  return {
    token: tokenRecord.token,
    notificationType: tokenRecord.notification_type,
    channel: tokenRecord.channel,
    expiresAt: toIso(tokenRecord.expires_at),
    usedAt: toIso(tokenRecord.used_at),
    isExpired: new Date(tokenRecord.expires_at).getTime() < Date.now(),
    availableActions: getClientAvailableActions(details.appointment.status),
    appointment: summary,
    groomerContact: getPublicGroomerContact(),
  };
}

async function processAppointmentResponseToken(token, action, source, payload = {}) {
  if (!["confirm", "cancel", "reschedule"].includes(action)) {
    throw new Error("action is invalid.");
  }

  const tokenRecord = await getResponseTokenRecord(token);
  if (!tokenRecord) {
    throw new Error("This response link is no longer available.");
  }

  if (tokenRecord.used_at) {
    throw new Error("This response link has already been used.");
  }

  if (new Date(tokenRecord.expires_at).getTime() < Date.now()) {
    throw new Error("This response link has expired.");
  }

  const details = await getAppointmentWithRelations(tokenRecord.appointment_id);
  if (!details) {
    throw new Error("Appointment not found.");
  }

  const summary = buildAppointmentSummary(details.appointment, details.owner, details.pet);
  const availableActions = getClientAvailableActions(details.appointment.status);
  if (!availableActions.includes(action)) {
    throw new Error("That response is not available for this appointment.");
  }

  if (action === "confirm") {
    await updateAppointmentConfirmationState(details.appointment.id);
  } else {
    if (source === "public_page") {
      const clientNote = requiredString(payload.clientNote, "clientNote");
      const preferredDate = optionalString(payload.preferredDate);
      const preferredTime = optionalString(payload.preferredTime);
      await createClientRequest(
        {
          ownerId: details.owner.id,
          petId: details.pet.id,
          requestType: "appointment_change",
          status: "open",
          subject: buildAppointmentChangeRequestSubject(summary, action),
          clientNote,
          details: {
            appointmentChange: {
              appointmentId: details.appointment.id,
              changeType: action,
              preferredDate,
              preferredTime,
            },
          },
        },
        null,
      );
    }

    await createAppointmentResponseRequest(
      details.appointment.id,
      details.owner.id,
      action,
      source,
    );
    if (source !== "public_page") {
      await notifyGroomersOfClientRequest(summary, action, source);
    }
  }

  await sql`
    UPDATE appointment_response_tokens
    SET used_at = NOW()
    WHERE id = ${tokenRecord.id}::uuid
  `;

  return {
    action,
    appointment: summary,
    status:
      action === "confirm"
        ? "Appointment confirmed."
        : action === "cancel"
          ? "Cancellation request sent to the groomer."
          : "Reschedule request sent to the groomer.",
  };
}

async function processDueAppointmentReminders() {
  const rows = await sql`
    SELECT a.id::text AS id
    FROM appointments a
    WHERE a.is_archived = FALSE
      AND a.status IN ('scheduled', 'confirmed')
      AND a.start_at >= NOW() + INTERVAL '23 hours'
      AND a.start_at < NOW() + INTERVAL '25 hours'
      AND NOT EXISTS (
        SELECT 1
        FROM appointment_notifications n
        WHERE n.appointment_id = a.id
          AND n.notification_type = 'reminder_24h'
      )
  `;

  const results = [];
  for (const row of rows) {
    const summary = await sendClientAppointmentNotification(row.id, "reminder_24h");
    if (summary) {
      results.push(summary);
    }
  }
  return results;
}

async function processSmsResponseWebhook(payload) {
  const from = optionalString(payload.from ?? payload.From);
  const body = optionalString(payload.body ?? payload.Body);
  const webhookSecret = process.env.SMS_WEBHOOK_SECRET ?? "";

  if (process.env.SMS_WEBHOOK_SECRET && payload.secret !== webhookSecret) {
    throw new Error("Invalid SMS webhook secret.");
  }

  if (!from || !body) {
    throw new Error("from and body are required.");
  }

  const normalizedBody = body.trim().toLowerCase();
  const action =
    normalizedBody.startsWith("confirm")
      ? "confirm"
      : normalizedBody.startsWith("cancel")
        ? "cancel"
        : normalizedBody.startsWith("reschedule")
          ? "reschedule"
          : null;

  if (!action) {
    throw new Error("Response must start with Confirm, Cancel, or Reschedule.");
  }

  const tokenRows = await sql`
    SELECT t.id::text AS id, t.token, t.expires_at, t.used_at, t.appointment_id::text AS appointment_id
    FROM appointment_response_tokens t
    JOIN owners o ON o.id = t.owner_id
    JOIN appointments a ON a.id = t.appointment_id
    WHERE regexp_replace(o.phone, '[^0-9]', '', 'g') = regexp_replace(${from}, '[^0-9]', '', 'g')
      AND t.channel = 'text'
      AND t.used_at IS NULL
      AND t.expires_at > NOW()
      AND a.status IN ('scheduled', 'confirmed')
      AND a.start_at >= NOW() - INTERVAL '12 hours'
    ORDER BY a.start_at ASC
  `;

  if (tokenRows.length !== 1) {
    throw new Error("Unable to match this text reply to a single appointment.");
  }

  return processAppointmentResponseToken(tokenRows[0].token, action, "sms");
}

async function clearOwnerNotes(ownerId) {
  await sql`DELETE FROM owner_notes WHERE owner_id = ${ownerId}::uuid`;
}

async function clearPetNotes(petId) {
  await sql`DELETE FROM pet_notes WHERE pet_id = ${petId}::uuid`;
}

async function clearAppointmentNotes(appointmentId) {
  await sql`DELETE FROM appointment_notes WHERE appointment_id = ${appointmentId}::uuid`;
}

function validateNoteVisibility(value, defaultValue = "internal") {
  const visibility = value == null ? defaultValue : requiredString(value, "visibility");
  if (!noteVisibilities.has(visibility)) {
    throw new Error("visibility is invalid.");
  }
  return visibility;
}

function getNoteAuthorContext(currentUser) {
  const createdByName =
    currentUser?.display_name ??
    ([currentUser?.first_name, currentUser?.last_name].filter(Boolean).join(" ") || null);

  return {
    createdByUserId: currentUser?.id ?? null,
    createdByName,
  };
}

async function addOwnerNote(ownerId, text, visibility = "internal", currentUser = null) {
  const author = getNoteAuthorContext(currentUser);
  await sql`
    INSERT INTO owner_notes (owner_id, created_by_user_id, created_by_name, text, visibility)
    VALUES (
      ${ownerId}::uuid,
      ${author.createdByUserId}::uuid,
      ${author.createdByName},
      ${requiredString(text, "text")},
      ${validateNoteVisibility(visibility)}
    )
  `;
}

async function addPetNote(petId, text, visibility = "internal", currentUser = null) {
  const author = getNoteAuthorContext(currentUser);
  await sql`
    INSERT INTO pet_notes (pet_id, created_by_user_id, created_by_name, text, visibility)
    VALUES (
      ${petId}::uuid,
      ${author.createdByUserId}::uuid,
      ${author.createdByName},
      ${requiredString(text, "text")},
      ${validateNoteVisibility(visibility)}
    )
  `;
}

async function addAppointmentNote(appointmentId, text, visibility = "internal", currentUser = null) {
  const author = getNoteAuthorContext(currentUser);
  await sql`
    INSERT INTO appointment_notes (appointment_id, created_by_user_id, created_by_name, text, visibility)
    VALUES (
      ${appointmentId}::uuid,
      ${author.createdByUserId}::uuid,
      ${author.createdByName},
      ${requiredString(text, "text")},
      ${validateNoteVisibility(visibility)}
    )
  `;
}

async function replaceOwnerNotes(ownerId, text) {
  await clearOwnerNotes(ownerId);
  if (typeof text === "string" && text.trim().length > 0) {
    await addOwnerNote(ownerId, text);
  }
}

async function replacePetNotes(petId, text) {
  await clearPetNotes(petId);
  if (typeof text === "string" && text.trim().length > 0) {
    await addPetNote(petId, text);
  }
}

async function replaceAppointmentNotes(appointmentId, text) {
  await clearAppointmentNotes(appointmentId);
  if (typeof text === "string" && text.trim().length > 0) {
    await addAppointmentNote(appointmentId, text);
  }
}

async function updateOwnerNote(ownerId, noteId, text, visibility) {
  const rows = await sql`
    UPDATE owner_notes
    SET text = ${requiredString(text, "text")},
        visibility = ${validateNoteVisibility(visibility)},
        updated_at = NOW()
    WHERE id = ${noteId}::uuid AND owner_id = ${ownerId}::uuid
    RETURNING id::text AS id
  `;
  return rows.length > 0;
}

async function updatePetNote(petId, noteId, text, visibility) {
  const rows = await sql`
    UPDATE pet_notes
    SET text = ${requiredString(text, "text")},
        visibility = ${validateNoteVisibility(visibility)},
        updated_at = NOW()
    WHERE id = ${noteId}::uuid AND pet_id = ${petId}::uuid
    RETURNING id::text AS id
  `;
  return rows.length > 0;
}

async function updateAppointmentNote(appointmentId, noteId, text, visibility) {
  const rows = await sql`
    UPDATE appointment_notes
    SET text = ${requiredString(text, "text")},
        visibility = ${validateNoteVisibility(visibility)},
        updated_at = NOW()
    WHERE id = ${noteId}::uuid AND appointment_id = ${appointmentId}::uuid
    RETURNING id::text AS id
  `;
  return rows.length > 0;
}

function getRequestActorContext(currentUser) {
  const actorName =
    currentUser?.display_name ??
    ([currentUser?.first_name, currentUser?.last_name].filter(Boolean).join(" ") || undefined);

  return {
    actorUserId: currentUser?.id ?? null,
    actorRole: currentUser?.role ?? null,
    actorName,
  };
}

async function createClientRequestEvent(requestId, payload, currentUser) {
  const actor = getRequestActorContext(currentUser);
  const rows = await sql`
    INSERT INTO client_request_events (
      request_id, actor_user_id, actor_role, actor_name, event_type, title, detail, audience
    )
    VALUES (
      ${requestId}::uuid,
      ${actor.actorUserId}::uuid,
      ${actor.actorRole},
      ${actor.actorName},
      ${payload.eventType},
      ${payload.title},
      ${payload.detail ?? null},
      ${payload.audience ?? "all"}
    )
    RETURNING id::text AS id, request_id::text AS request_id, actor_user_id::text AS actor_user_id,
              actor_role, actor_name, event_type, title, detail, audience, created_at
  `;

  return mapClientRequestEventRow(rows[0]);
}

async function createRequestUpdateEvents(previousRequest, nextRequest, currentUser) {
  const events = [];

  if (!previousRequest) {
    return events;
  }

  if (previousRequest.status !== nextRequest.status) {
    events.push(
      await createClientRequestEvent(
        nextRequest.id,
        {
          eventType:
            nextRequest.status === "resolved" || nextRequest.status === "closed"
              ? "resolved"
              : previousRequest.status === "resolved" || previousRequest.status === "closed"
                ? "reopened"
                : "status_changed",
          title: "Status updated",
          detail: `${previousRequest.status.replace(/_/g, " ")} to ${nextRequest.status.replace(/_/g, " ")}`,
          audience: "all",
        },
        currentUser,
      ),
    );
  }

  if (previousRequest.clientNote !== nextRequest.clientNote) {
    events.push(
      await createClientRequestEvent(
        nextRequest.id,
        {
          eventType: "client_note_updated",
          title: currentUser?.role === "client" ? "Client updated request details" : "Request details updated",
          detail: "Client-facing request details were changed.",
          audience: "all",
        },
        currentUser,
      ),
    );
  }

  if ((previousRequest.internalNote ?? "") !== (nextRequest.internalNote ?? "")) {
    events.push(
      await createClientRequestEvent(
        nextRequest.id,
        {
          eventType: "internal_note_updated",
          title: "Internal note updated",
          detail: "Staff-only request notes were changed.",
          audience: "staff",
        },
        currentUser,
      ),
    );
  }

  if (
    previousRequest.subject !== nextRequest.subject ||
    previousRequest.requestType !== nextRequest.requestType ||
    previousRequest.petId !== nextRequest.petId ||
    JSON.stringify(previousRequest.details ?? {}) !== JSON.stringify(nextRequest.details ?? {})
  ) {
    events.push(
      await createClientRequestEvent(
        nextRequest.id,
        {
          eventType: "updated",
          title: "Request details updated",
          detail: "The request summary or related details were changed.",
          audience: "all",
        },
        currentUser,
      ),
    );
  }

  return events;
}

function validateClientRequestPayload(payload, { isNew = false } = {}) {
  const requestType = requiredString(payload.requestType, "requestType");
  if (!clientRequestTypes.has(requestType)) {
    throw new Error("requestType is invalid.");
  }

  const status = payload.status ? requiredString(payload.status, "status") : "open";
  if (!clientRequestStatuses.has(status)) {
    throw new Error("status is invalid.");
  }

  const ownerId = requiredString(payload.ownerId, "ownerId");
  const petId = optionalString(payload.petId);
  const subject = requiredString(payload.subject, "subject");
  const clientNote = requiredString(payload.clientNote, "clientNote");
  const resolutionNote = optionalString(payload.resolutionNote);
  const internalNote = optionalString(payload.internalNote);
  const details = optionalObject(payload.details, "details");

  if (!isNew && !payload.status) {
    throw new Error("status is required.");
  }

  return {
    ownerId,
    petId,
    requestType,
    status,
    subject,
    clientNote,
    resolutionNote,
    internalNote,
    details,
  };
}

async function createClientRequest(payload, currentUser) {
  const input = validateClientRequestPayload(payload, { isNew: true });
  const rows = await sql`
    INSERT INTO client_requests (
      owner_id, pet_id, created_by_user_id, request_type, status, subject, client_note, resolution_note, internal_note, details
    )
    VALUES (
      ${input.ownerId}::uuid,
      ${input.petId}::uuid,
      ${currentUser?.id ?? null}::uuid,
      ${input.requestType},
      ${input.status},
      ${input.subject},
      ${input.clientNote},
      ${input.resolutionNote},
      ${input.internalNote},
      ${JSON.stringify(input.details)}
    )
    RETURNING id::text AS id, owner_id::text AS owner_id, pet_id::text AS pet_id,
              created_by_user_id::text AS created_by_user_id, request_type, status,
              subject, client_note, resolution_note, internal_note, details, resolved_at, created_at, updated_at
  `;
  const requestRecord = mapClientRequestRow(rows[0]);
  const createdEvent = await createClientRequestEvent(
    requestRecord.id,
    {
      eventType: "created",
      title: "Request created",
      detail: `New ${requestRecord.requestType.replace(/_/g, " ")} request logged.`,
      audience: "all",
    },
    currentUser,
  );
  requestRecord.events = [createdEvent];
  await notifyStaffOfRequest(requestRecord);
  return requestRecord;
}

async function updateClientRequest(requestId, payload, currentUser) {
  const existingRequest = await getClientRequest(requestId, { includeStaffOnly: true });
  const input = validateClientRequestPayload(payload);
  const resolvedAt =
    input.status === "resolved" || input.status === "closed"
      ? new Date().toISOString()
      : null;

  const rows = await sql`
    UPDATE client_requests
    SET owner_id = ${input.ownerId}::uuid,
        pet_id = ${input.petId}::uuid,
        request_type = ${input.requestType},
        status = ${input.status},
        subject = ${input.subject},
        client_note = ${input.clientNote},
        resolution_note = ${input.resolutionNote},
        internal_note = ${input.internalNote},
        details = ${JSON.stringify(input.details)},
        resolved_at = ${resolvedAt}::timestamptz,
        updated_at = NOW()
    WHERE id = ${requestId}::uuid
    RETURNING id::text AS id, owner_id::text AS owner_id, pet_id::text AS pet_id,
              created_by_user_id::text AS created_by_user_id, request_type, status,
              subject, client_note, resolution_note, internal_note, details, resolved_at, created_at, updated_at
  `;
  const requestRecord = rows[0] ? mapClientRequestRow(rows[0]) : null;
  if (requestRecord && existingRequest) {
    requestRecord.events = await createRequestUpdateEvents(existingRequest, requestRecord, currentUser);
  }
  if (requestRecord && currentUser?.role !== "client") {
    await notifyClientUsersOfRequestUpdate(requestRecord);
  }
  return requestRecord
    ? await getClientRequest(requestRecord.id, {
        includeStaffOnly: currentUser?.role !== "client",
      })
    : null;
}

async function deleteOwnerNote(ownerId, noteId) {
  const rows = await sql`
    DELETE FROM owner_notes
    WHERE id = ${noteId}::uuid AND owner_id = ${ownerId}::uuid
    RETURNING id::text AS id
  `;
  return rows.length > 0;
}

async function deletePetNote(petId, noteId) {
  const rows = await sql`
    DELETE FROM pet_notes
    WHERE id = ${noteId}::uuid AND pet_id = ${petId}::uuid
    RETURNING id::text AS id
  `;
  return rows.length > 0;
}

async function deleteAppointmentNote(appointmentId, noteId) {
  const rows = await sql`
    DELETE FROM appointment_notes
    WHERE id = ${noteId}::uuid AND appointment_id = ${appointmentId}::uuid
    RETURNING id::text AS id
  `;
  return rows.length > 0;
}

async function archiveOwnerNote(ownerId, noteId, shouldArchive) {
  const archivedAt = shouldArchive ? new Date().toISOString() : null;
  const rows = await sql`
    UPDATE owner_notes
    SET is_archived = ${shouldArchive}, archived_at = ${archivedAt}, updated_at = NOW()
    WHERE id = ${noteId}::uuid AND owner_id = ${ownerId}::uuid
    RETURNING id::text AS id
  `;
  return rows.length > 0;
}

async function archivePetNote(petId, noteId, shouldArchive) {
  const archivedAt = shouldArchive ? new Date().toISOString() : null;
  const rows = await sql`
    UPDATE pet_notes
    SET is_archived = ${shouldArchive}, archived_at = ${archivedAt}, updated_at = NOW()
    WHERE id = ${noteId}::uuid AND pet_id = ${petId}::uuid
    RETURNING id::text AS id
  `;
  return rows.length > 0;
}

async function archiveAppointmentNote(appointmentId, noteId, shouldArchive) {
  const archivedAt = shouldArchive ? new Date().toISOString() : null;
  const rows = await sql`
    UPDATE appointment_notes
    SET is_archived = ${shouldArchive}, archived_at = ${archivedAt}, updated_at = NOW()
    WHERE id = ${noteId}::uuid AND appointment_id = ${appointmentId}::uuid
    RETURNING id::text AS id
  `;
  return rows.length > 0;
}

function validateOwnerPayload(payload) {
  const preferredContactMethod = requiredString(
    payload.preferredContactMethod,
    "preferredContactMethod",
  );

  if (!contactMethods.has(preferredContactMethod)) {
    throw new Error("preferredContactMethod must be text or email.");
  }

  return {
    firstName: requiredString(payload.firstName, "firstName"),
    lastName: requiredString(payload.lastName, "lastName"),
    phone: optionalString(payload.phone),
    email: optionalString(payload.email),
    preferredContactMethod,
    address: optionalString(payload.address),
    notes: typeof payload.notes === "string" ? payload.notes : undefined,
  };
}

function validatePetPayload(payload) {
  const species = requiredString(payload.species, "species");
  if (!speciesValues.has(species)) {
    throw new Error("species must be dog or cat.");
  }

  return {
    ownerId: requiredString(payload.ownerId, "ownerId"),
    name: requiredString(payload.name, "name"),
    species,
    breed: requiredString(payload.breed, "breed"),
    weightLbs: optionalNumber(payload.weightLbs, "weightLbs"),
    ageYears: optionalNumber(payload.ageYears, "ageYears"),
    birthDate: payload.birthDate ? requiredDate(payload.birthDate, "birthDate") : null,
    isBirthDateEstimated: Boolean(payload.isBirthDateEstimated),
    color: optionalString(payload.color),
    notes: typeof payload.notes === "string" ? payload.notes : undefined,
  };
}

function validateAppointmentPayload(payload) {
  const status = payload.status ? requiredString(payload.status, "status") : "scheduled";
  if (!appointmentStatuses.has(status)) {
    throw new Error("status is invalid.");
  }

  const paymentStatus = payload.paymentStatus
    ? requiredString(payload.paymentStatus, "paymentStatus")
    : "unpaid";
  if (!paymentStatuses.has(paymentStatus)) {
    throw new Error("paymentStatus is invalid.");
  }

  const start = requiredDate(payload.start, "start");
  const end = requiredDate(payload.end, "end");
  if (new Date(end) <= new Date(start)) {
    throw new Error("end must be after start.");
  }

  const selectedServices = Array.isArray(payload.selectedServices)
    ? payload.selectedServices.filter(
        (item) => typeof item === "string" && item.trim().length > 0,
      )
    : [];

  return {
    ownerId: requiredString(payload.ownerId, "ownerId"),
    petId: requiredString(payload.petId, "petId"),
    start,
    end,
    serviceType: optionalString(payload.serviceType),
    selectedServices,
    customServiceType: optionalString(payload.customServiceType),
    quotePrice:
      optionalNumber(
        payload.quotePrice ?? payload.cost,
        payload.quotePrice != null ? "quotePrice" : "cost",
      ) ?? 0,
    actualPriceCharged: optionalNumber(payload.actualPriceCharged, "actualPriceCharged"),
    paymentStatus,
    notes: typeof payload.notes === "string" ? payload.notes : undefined,
    status,
  };
}

async function createOwner(payload) {
  const input = validateOwnerPayload(payload);
  const rows = await sql`
    INSERT INTO owners (first_name, last_name, phone, email, preferred_contact_method, address)
    VALUES (
      ${input.firstName},
      ${input.lastName},
      ${input.phone},
      ${input.email},
      ${input.preferredContactMethod},
      ${input.address}
    )
    RETURNING id::text AS id
  `;
  if (input.notes !== undefined) {
    await replaceOwnerNotes(rows[0].id, input.notes);
  }
  return getOwner(rows[0].id);
}

async function updateOwner(id, payload) {
  const input = validateOwnerPayload(payload);
  const linkedClientUser = await getLinkedClientUserForOwner(id);

  if (linkedClientUser) {
    const duplicateEmail = await sql`
      SELECT id::text AS id
      FROM app_users
      WHERE email = ${input.email}
        AND id <> ${linkedClientUser.id}::uuid
      LIMIT 1
    `;

    if (duplicateEmail.length > 0) {
      throw new Error("That email address is already in use by another user account.");
    }
  }

  const rows = await sql`
    UPDATE owners
    SET first_name = ${input.firstName},
        last_name = ${input.lastName},
        phone = ${input.phone},
        email = ${input.email},
        preferred_contact_method = ${input.preferredContactMethod},
        address = ${input.address},
        updated_at = NOW()
    WHERE id = ${id}::uuid
    RETURNING id::text AS id
  `;
  if (rows.length === 0) {
    return null;
  }

  if (linkedClientUser) {
    await sql`
      UPDATE app_users
      SET email = ${input.email},
          updated_at = NOW()
      WHERE id = ${linkedClientUser.id}::uuid
    `;
  }

  if (input.notes !== undefined) {
    await replaceOwnerNotes(id, input.notes);
  }
  return getOwner(id);
}

async function createPet(payload) {
  const input = validatePetPayload(payload);
  const rows = await sql`
    INSERT INTO pets (
      owner_id, name, species, breed, weight_lbs, age_years, birth_date, is_birth_date_estimated, color
    )
    VALUES (
      ${input.ownerId}::uuid,
      ${input.name},
      ${input.species},
      ${input.breed},
      ${input.weightLbs},
      ${input.ageYears},
      ${input.birthDate}::date,
      ${input.isBirthDateEstimated},
      ${input.color}
    )
    RETURNING id::text AS id
  `;
  if (input.notes !== undefined) {
    await replacePetNotes(rows[0].id, input.notes);
  }
  return getPet(rows[0].id);
}

async function updatePet(id, payload) {
  const input = validatePetPayload(payload);
  const rows = await sql`
    UPDATE pets
    SET owner_id = ${input.ownerId}::uuid,
        name = ${input.name},
        species = ${input.species},
        breed = ${input.breed},
        weight_lbs = ${input.weightLbs},
        age_years = ${input.ageYears},
        birth_date = ${input.birthDate}::date,
        is_birth_date_estimated = ${input.isBirthDateEstimated},
        color = ${input.color},
        updated_at = NOW()
    WHERE id = ${id}::uuid
    RETURNING id::text AS id
  `;
  if (rows.length === 0) {
    return null;
  }

  if (input.notes !== undefined) {
    await replacePetNotes(id, input.notes);
  }
  return getPet(id);
}

async function createAppointment(payload) {
  const input = validateAppointmentPayload(payload);
  const confirmedAt = input.status === "confirmed" ? new Date().toISOString() : null;
  const rows = await sql`
    INSERT INTO appointments (
      owner_id, pet_id, start_at, end_at, service_type, selected_services,
      custom_service_type, cost, quote_price, actual_price_charged, payment_status,
      status, confirmed_at
    )
    VALUES (
      ${input.ownerId}::uuid,
      ${input.petId}::uuid,
      ${input.start}::timestamptz,
      ${input.end}::timestamptz,
      ${input.serviceType},
      ${input.selectedServices},
      ${input.customServiceType},
      ${input.quotePrice},
      ${input.quotePrice},
      ${input.actualPriceCharged},
      ${input.paymentStatus},
      ${input.status},
      ${confirmedAt}
    )
    RETURNING id::text AS id
  `;
  if (input.notes !== undefined) {
    await replaceAppointmentNotes(rows[0].id, input.notes);
  }
  const appointment = await getAppointment(rows[0].id);
  if (appointment && appointment.status === "scheduled") {
    await sendClientAppointmentNotification(appointment.id, "initial_schedule");
    await notifyClientUsersOfScheduledAppointment(appointment);
  }
  return appointment;
}

async function updateAppointment(id, payload) {
  const input = validateAppointmentPayload(payload);
  const current = await sql`
    SELECT id::text AS id, confirmed_at, status
    FROM appointments
    WHERE id = ${id}::uuid
  `;
  if (current.length === 0) {
    return null;
  }

  const confirmedAt =
    input.status === "confirmed"
      ? current[0].confirmed_at ?? new Date().toISOString()
      : null;

  await sql`
    UPDATE appointments
    SET owner_id = ${input.ownerId}::uuid,
        pet_id = ${input.petId}::uuid,
        start_at = ${input.start}::timestamptz,
        end_at = ${input.end}::timestamptz,
        service_type = ${input.serviceType},
        selected_services = ${input.selectedServices},
        custom_service_type = ${input.customServiceType},
        cost = ${input.quotePrice},
        quote_price = ${input.quotePrice},
        actual_price_charged = ${input.actualPriceCharged},
        payment_status = ${input.paymentStatus},
        status = ${input.status},
        confirmed_at = ${confirmedAt},
        updated_at = NOW()
    WHERE id = ${id}::uuid
  `;

  if (input.notes !== undefined) {
    await replaceAppointmentNotes(id, input.notes);
  }
  const appointment = await getAppointment(id);
  if (appointment && current[0].status !== "cancelled" && appointment.status === "cancelled") {
    await sendClientAppointmentNotification(appointment.id, "cancelled", {
      isCancellation: true,
    });
  }
  return appointment;
}

async function archiveOwner(id, shouldArchive, options = {}) {
  const includeRelated = options.includeRelated === true;
  const archivedAt = shouldArchive ? new Date().toISOString() : null;
  const rows = await sql`
    UPDATE owners
    SET is_archived = ${shouldArchive}, archived_at = ${archivedAt}, updated_at = NOW()
    WHERE id = ${id}::uuid
    RETURNING id::text AS id
  `;
  if (rows.length === 0) {
    return null;
  }

  const petArchivedAt = shouldArchive ? archivedAt : null;
  const noteArchivedAt = shouldArchive ? archivedAt : null;

  if (shouldArchive) {
    await sql`
      UPDATE pets
      SET is_archived = TRUE,
          archived_at = ${petArchivedAt},
          updated_at = NOW()
      WHERE owner_id = ${id}::uuid
    `;
    await sql`
      UPDATE appointments
      SET is_archived = TRUE,
          archived_at = ${petArchivedAt},
          updated_at = NOW()
      WHERE owner_id = ${id}::uuid
    `;
    await sql`
      UPDATE owner_notes
      SET is_archived = TRUE,
          archived_at = ${noteArchivedAt},
          updated_at = NOW()
      WHERE owner_id = ${id}::uuid
    `;
    await sql`
      UPDATE pet_notes
      SET is_archived = TRUE,
          archived_at = ${noteArchivedAt},
          updated_at = NOW()
      WHERE pet_id IN (
        SELECT id FROM pets WHERE owner_id = ${id}::uuid
      )
    `;
    await sql`
      UPDATE appointment_notes
      SET is_archived = TRUE,
          archived_at = ${noteArchivedAt},
          updated_at = NOW()
      WHERE appointment_id IN (
        SELECT id FROM appointments WHERE owner_id = ${id}::uuid
      )
    `;
  } else if (includeRelated) {
    await sql`
      UPDATE pets
      SET is_archived = FALSE,
          archived_at = NULL,
          updated_at = NOW()
      WHERE owner_id = ${id}::uuid
    `;
    await sql`
      UPDATE appointments
      SET is_archived = FALSE,
          archived_at = NULL,
          updated_at = NOW()
      WHERE owner_id = ${id}::uuid
    `;
    await sql`
      UPDATE owner_notes
      SET is_archived = FALSE,
          archived_at = NULL,
          updated_at = NOW()
      WHERE owner_id = ${id}::uuid
    `;
    await sql`
      UPDATE pet_notes
      SET is_archived = FALSE,
          archived_at = NULL,
          updated_at = NOW()
      WHERE pet_id IN (
        SELECT id FROM pets WHERE owner_id = ${id}::uuid
      )
    `;
    await sql`
      UPDATE appointment_notes
      SET is_archived = FALSE,
          archived_at = NULL,
          updated_at = NOW()
      WHERE appointment_id IN (
        SELECT id FROM appointments WHERE owner_id = ${id}::uuid
      )
    `;
  }

  return getOwner(id);
}

async function archivePet(id, shouldArchive) {
  const archivedAt = shouldArchive ? new Date().toISOString() : null;
  const rows = await sql`
    UPDATE pets
    SET is_archived = ${shouldArchive}, archived_at = ${archivedAt}, updated_at = NOW()
    WHERE id = ${id}::uuid
    RETURNING id::text AS id
  `;
  if (rows.length === 0) {
    return null;
  }

  await sql`
    UPDATE appointments
    SET is_archived = ${shouldArchive},
        archived_at = ${archivedAt},
        updated_at = NOW()
    WHERE pet_id = ${id}::uuid
  `;
  await sql`
    UPDATE pet_notes
    SET is_archived = ${shouldArchive},
        archived_at = ${archivedAt},
        updated_at = NOW()
    WHERE pet_id = ${id}::uuid
  `;
  await sql`
    UPDATE appointment_notes
    SET is_archived = ${shouldArchive},
        archived_at = ${archivedAt},
        updated_at = NOW()
    WHERE appointment_id IN (
      SELECT id FROM appointments WHERE pet_id = ${id}::uuid
    )
  `;

  return getPet(id);
}

async function archiveAppointment(id, shouldArchive) {
  const archivedAt = shouldArchive ? new Date().toISOString() : null;
  const rows = await sql`
    UPDATE appointments
    SET is_archived = ${shouldArchive}, archived_at = ${archivedAt}, updated_at = NOW()
    WHERE id = ${id}::uuid
    RETURNING id::text AS id
  `;
  if (rows.length === 0) {
    return null;
  }

  await sql`
    UPDATE appointment_notes
    SET is_archived = ${shouldArchive},
        archived_at = ${archivedAt},
        updated_at = NOW()
    WHERE appointment_id = ${id}::uuid
  `;

  return getAppointment(id);
}

function normalizePath(eventPath) {
  return (
    eventPath.replace(/^\/\.netlify\/functions\/api/, "").replace(/^\/api/, "") || "/"
  );
}

async function handleRequest(event) {
  const path = normalizePath(event.path);
  const method = event.httpMethod.toUpperCase();
  let currentUser = null;

  if (method === "OPTIONS") {
    return json(204, {});
  }

  if (path === "/health" && method === "GET") {
    return json(200, { ok: true, service: "pet-grooming-manager-api" });
  }

  if (path === "/auth/me" && method === "GET") {
    const user = await getCurrentUser(event);
    return user
      ? json(200, { user: mapAppUser(user) })
      : unauthorized();
  }

  if (path === "/auth/login" && method === "POST") {
    const payload = parseJsonBody(event);
    const identifier = requiredString(payload.email ?? payload.identifier, "email");
    const password = requiredString(payload.password, "password");
    const user = await getUserByIdentifier(identifier);

    if (!user || !user.is_active) {
      return unauthorized("Invalid email or password.");
    }

    if (user.locked_at) {
      return forbidden("This account is locked. Contact an administrator or use password reset.");
    }

    if (!verifyPassword(password, user.password_hash)) {
      const updatedUser = await incrementFailedLoginAttempt(user);
      if (updatedUser?.lockedAt) {
        await notifyAdminsOfLockout(updatedUser);
        return forbidden("This account is locked after repeated sign-in attempts.");
      }
      return unauthorized("Invalid email or password.");
    }

    const session = await createSession(user.id);
    await resetFailedLoginState(user.id);
    return json(
      200,
      { user: mapAppUser({ ...user, failed_login_attempts: 0, locked_at: null }) },
      { "Set-Cookie": buildSessionCookie(session.token, session.expiresAt) },
    );
  }

  if (path === "/auth/logout" && method === "POST") {
    const cookies = parseCookies(event);
    if (cookies[SESSION_COOKIE]) {
      await deleteSession(cookies[SESSION_COOKIE]);
    }
    return json(200, { ok: true }, { "Set-Cookie": clearSessionCookie() });
  }

  if (path === "/auth/request-password-reset" && method === "POST") {
    const payload = parseJsonBody(event);
    return json(200, await requestPasswordResetByEmail(requiredString(payload.email, "email")));
  }

  if (path === "/auth/reset-password" && method === "POST") {
    const payload = parseJsonBody(event);
    return json(200, await completePasswordToken(requiredString(payload.token, "token"), payload, "password_reset"));
  }

  if (path === "/auth/complete-setup" && method === "POST") {
    const payload = parseJsonBody(event);
    return json(200, await completePasswordToken(requiredString(payload.token, "token"), payload, "setup"));
  }

  let match = path.match(/^\/public\/appointment-response\/([^/]+)$/);
  if (match) {
    const token = match[1];
    if (method === "GET") {
      const details = await getAppointmentResponseDetails(token);
      return details ? json(200, details) : notFound("Response link not found.");
    }
    if (method === "POST") {
      const payload = parseJsonBody(event);
      const source = payload.source === "public_page" ? "public_page" : "email_link";
      return json(
        200,
        await processAppointmentResponseToken(
          token,
          requiredString(payload.action, "action").toLowerCase(),
          source,
          payload,
        ),
      );
    }
    return methodNotAllowed();
  }

  if (path === "/webhooks/sms" && method === "POST") {
    return json(200, await processSmsResponseWebhook(parseJsonBody(event)));
  }

  if (path === "/auth/profile" && method === "PUT") {
    currentUser = await getCurrentUser(event);
    if (!currentUser) {
      return unauthorized();
    }

    const user = await updateCurrentUserProfile(currentUser.id, parseJsonBody(event));
    return user ? json(200, { user }) : notFound("User not found.");
  }

  if (path === "/auth/change-password" && method === "POST") {
    currentUser = await getCurrentUser(event);
    if (!currentUser) {
      return unauthorized();
    }

    return json(200, await changeCurrentUserPassword(currentUser.id, parseJsonBody(event)));
  }

  if (!path.startsWith("/auth/")) {
    currentUser = await getCurrentUser(event);
    if (!currentUser) {
      const secret = event.queryStringParameters?.secret ?? "";
      if (!(path === "/notifications/process-reminders" && CRON_SECRET && secret === CRON_SECRET && method === "POST")) {
        return unauthorized();
      }
    }
  }

  if (path === "/notifications/process-reminders" && method === "POST") {
    if (!currentUser && !(CRON_SECRET && event.queryStringParameters?.secret === CRON_SECRET)) {
      return unauthorized();
    }
    if (currentUser && currentUser.role !== "admin") {
      return forbidden("Administrator access is required.");
    }
    const results = await processDueAppointmentReminders();
    return json(200, { processed: results.length, appointments: results });
  }

  if (path === "/notifications" && method === "GET") {
    return json(200, await listUserNotifications(currentUser.id));
  }

  if (path === "/notifications/all" && method === "GET") {
    return json(200, await listAllUserNotifications(currentUser.id));
  }

  match = path.match(/^\/notifications\/([^/]+)\/read$/);
  if (match) {
    if (method !== "POST") {
      return methodNotAllowed();
    }
    const notification = await markUserNotificationRead(currentUser.id, match[1]);
    return notification ? json(200, notification) : notFound("Notification not found.");
  }

  if (path === "/users" && method === "GET") {
    if (!currentUser || currentUser.role !== "admin") {
      return forbidden("Administrator access is required.");
    }
    return json(200, await listAppUsers());
  }

  if (path === "/users" && method === "POST") {
    if (!currentUser || currentUser.role !== "admin") {
      return forbidden("Administrator access is required.");
    }
    return json(201, await createAppUser(parseJsonBody(event)));
  }

  match = path.match(/^\/users\/([^/]+)$/);
  if (match) {
    if (!currentUser || currentUser.role !== "admin") {
      return forbidden("Administrator access is required.");
    }
    const userId = match[1];
    if (method === "PUT") {
      const user = await updateAppUser(userId, parseJsonBody(event), currentUser.id);
      return user ? json(200, user) : notFound("User not found.");
    }
    if (method === "DELETE") {
      const deletedUser = await deleteAppUser(userId, currentUser.id);
      return deletedUser ? json(200, deletedUser) : notFound("User not found.");
    }
    return methodNotAllowed();
  }

  match = path.match(/^\/users\/([^/]+)\/unlock$/);
  if (match) {
    if (!currentUser || currentUser.role !== "admin") {
      return forbidden("Administrator access is required.");
    }
    if (method !== "POST") {
      return methodNotAllowed();
    }
    const user = await unlockAppUser(match[1]);
    return user ? json(200, user) : notFound("User not found.");
  }

  match = path.match(/^\/users\/([^/]+)\/send-setup$/);
  if (match) {
    if (!currentUser || currentUser.role !== "admin") {
      return forbidden("Administrator access is required.");
    }
    if (method !== "POST") {
      return methodNotAllowed();
    }
    return json(200, await sendSetupEmailToUser(match[1]));
  }

  match = path.match(/^\/users\/([^/]+)\/send-password-reset$/);
  if (match) {
    if (!currentUser || currentUser.role !== "admin") {
      return forbidden("Administrator access is required.");
    }
    if (method !== "POST") {
      return methodNotAllowed();
    }
    return json(200, await sendPasswordResetToUser(match[1]));
  }

  if (path === "/bootstrap" && method === "GET") {
    const isClient = currentUser?.role === "client";
    const ownerScopeId = isClient ? currentUser.owner_id ?? null : null;
    const [owners, pets, appointments, requests] = await Promise.all([
      listOwners(),
      listPets(),
      listAppointments(),
      listClientRequests(ownerScopeId ? { ownerId: ownerScopeId } : { includeStaffOnly: true }),
    ]);

    if (isClient) {
      return json(200, {
        owners: ownerScopeId ? owners.filter((owner) => owner.id === ownerScopeId) : [],
        pets: ownerScopeId ? pets.filter((pet) => pet.ownerId === ownerScopeId) : [],
        appointments: ownerScopeId
          ? appointments
              .filter((appointment) => appointment.ownerId === ownerScopeId)
              .map(sanitizeAppointmentForClient)
          : [],
        requests,
      });
    }

    return json(200, { owners, pets, appointments, requests });
  }

  if (path === "/requests" && method === "GET") {
    if (currentUser.role === "client") {
      if (!currentUser.owner_id) {
        return json(200, []);
      }
      return json(200, await listClientRequests({ ownerId: currentUser.owner_id }));
    }

    return json(200, await listClientRequests({ includeStaffOnly: true }));
  }

  if (path === "/requests" && method === "POST") {
    const payload = parseJsonBody(event);
    if (currentUser.role === "client") {
      if (!currentUser.owner_id) {
        return forbidden("Your account is not linked to a client record.");
      }
      payload.ownerId = currentUser.owner_id;
      payload.internalNote = null;
      payload.status = "open";
    }

    return json(201, await createClientRequest(payload, currentUser));
  }

  match = path.match(/^\/requests\/([^/]+)$/);
  if (match) {
    const requestId = match[1];
    if (method !== "PUT") {
      return methodNotAllowed();
    }

    const existingRequest = await getClientRequest(requestId, {
      includeStaffOnly: currentUser.role !== "client",
    });
    if (!existingRequest) {
      return notFound("Request not found.");
    }

    const payload = parseJsonBody(event);
    if (currentUser.role === "client") {
      if (!currentUser.owner_id) {
        return forbidden("Your account is not linked to a client record.");
      }
      if (existingRequest.ownerId !== currentUser.owner_id) {
        return forbidden("You cannot modify another client's request.");
      }
      payload.ownerId = currentUser.owner_id;
      payload.internalNote = null;
      payload.status = "open";
    }

    const updatedRequest = await updateClientRequest(requestId, payload, currentUser);
    return json(200, updatedRequest);
  }

  if (
    currentUser.role === "client" &&
    (path.startsWith("/owners") || path.startsWith("/pets") || path.startsWith("/appointments"))
  ) {
    return forbidden("Client users cannot access staff management routes.");
  }

  if (path === "/owners" && method === "GET") {
    return json(200, await listOwners());
  }

  if (path === "/owners" && method === "POST") {
    return json(201, await createOwner(parseJsonBody(event)));
  }

  match = path.match(/^\/owners\/([^/]+)$/);
  if (match) {
    const ownerId = match[1];
    if (method === "GET") {
      const owner = await getOwner(ownerId);
      return owner ? json(200, owner) : notFound("Owner not found.");
    }
    if (method === "PUT") {
      const owner = await updateOwner(ownerId, parseJsonBody(event));
      return owner ? json(200, owner) : notFound("Owner not found.");
    }
    if (method === "DELETE") {
      const existing = await getOwner(ownerId);
      if (!existing) {
        return notFound("Owner not found.");
      }
      await sql`DELETE FROM owners WHERE id = ${ownerId}::uuid`;
      return json(200, existing);
    }
    return methodNotAllowed();
  }

  match = path.match(/^\/owners\/([^/]+)\/(archive|unarchive)$/);
  if (match) {
    const [, ownerId, action] = match;
    if (method !== "POST") {
      return methodNotAllowed();
    }
    const payload = parseJsonBody(event);
    const owner = await archiveOwner(ownerId, action === "archive", {
      includeRelated: payload.includeRelated === true,
    });
    return owner ? json(200, owner) : notFound("Owner not found.");
  }

  match = path.match(/^\/owners\/([^/]+)\/notes$/);
  if (match) {
    const ownerId = match[1];
    if (method !== "POST") {
      return methodNotAllowed();
    }
    const payload = parseJsonBody(event);
    await addOwnerNote(ownerId, payload.text, payload.visibility, currentUser);
    return json(200, await getOwner(ownerId));
  }

  match = path.match(/^\/owners\/([^/]+)\/notes\/([^/]+)$/);
  if (match) {
    const [, ownerId, noteId] = match;
    if (method === "PUT") {
      const payload = parseJsonBody(event);
      const updated = await updateOwnerNote(ownerId, noteId, payload.text, payload.visibility);
      return updated ? json(200, await getOwner(ownerId)) : notFound("Note not found.");
    }
    if (method === "DELETE") {
      const deleted = await deleteOwnerNote(ownerId, noteId);
      return deleted ? json(200, await getOwner(ownerId)) : notFound("Note not found.");
    }
    return methodNotAllowed();
  }

  match = path.match(/^\/owners\/([^/]+)\/notes\/([^/]+)\/(archive|unarchive)$/);
  if (match) {
    const [, ownerId, noteId, action] = match;
    if (method !== "POST") {
      return methodNotAllowed();
    }
    const updated = await archiveOwnerNote(ownerId, noteId, action === "archive");
    return updated ? json(200, await getOwner(ownerId)) : notFound("Note not found.");
  }

  if (path === "/pets" && method === "GET") {
    return json(200, await listPets());
  }

  if (path === "/pets" && method === "POST") {
    return json(201, await createPet(parseJsonBody(event)));
  }

  match = path.match(/^\/pets\/([^/]+)$/);
  if (match) {
    const petId = match[1];
    if (method === "GET") {
      const pet = await getPet(petId);
      return pet ? json(200, pet) : notFound("Pet not found.");
    }
    if (method === "PUT") {
      const pet = await updatePet(petId, parseJsonBody(event));
      return pet ? json(200, pet) : notFound("Pet not found.");
    }
    if (method === "DELETE") {
      const existing = await getPet(petId);
      if (!existing) {
        return notFound("Pet not found.");
      }
      await sql`DELETE FROM pets WHERE id = ${petId}::uuid`;
      return json(200, existing);
    }
    return methodNotAllowed();
  }

  match = path.match(/^\/pets\/([^/]+)\/(archive|unarchive)$/);
  if (match) {
    const [, petId, action] = match;
    if (method !== "POST") {
      return methodNotAllowed();
    }
    const pet = await archivePet(petId, action === "archive");
    return pet ? json(200, pet) : notFound("Pet not found.");
  }

  match = path.match(/^\/pets\/([^/]+)\/notes$/);
  if (match) {
    const petId = match[1];
    if (method !== "POST") {
      return methodNotAllowed();
    }
    const payload = parseJsonBody(event);
    await addPetNote(petId, payload.text, payload.visibility, currentUser);
    return json(200, await getPet(petId));
  }

  match = path.match(/^\/pets\/([^/]+)\/notes\/([^/]+)$/);
  if (match) {
    const [, petId, noteId] = match;
    if (method === "PUT") {
      const payload = parseJsonBody(event);
      const updated = await updatePetNote(petId, noteId, payload.text, payload.visibility);
      return updated ? json(200, await getPet(petId)) : notFound("Note not found.");
    }
    if (method === "DELETE") {
      const deleted = await deletePetNote(petId, noteId);
      return deleted ? json(200, await getPet(petId)) : notFound("Note not found.");
    }
    return methodNotAllowed();
  }

  match = path.match(/^\/pets\/([^/]+)\/notes\/([^/]+)\/(archive|unarchive)$/);
  if (match) {
    const [, petId, noteId, action] = match;
    if (method !== "POST") {
      return methodNotAllowed();
    }
    const updated = await archivePetNote(petId, noteId, action === "archive");
    return updated ? json(200, await getPet(petId)) : notFound("Note not found.");
  }

  if (path === "/appointments" && method === "GET") {
    return json(200, await listAppointments());
  }

  if (path === "/appointments" && method === "POST") {
    return json(201, await createAppointment(parseJsonBody(event)));
  }

  match = path.match(/^\/appointments\/([^/]+)$/);
  if (match) {
    const appointmentId = match[1];
    if (method === "GET") {
      const appointment = await getAppointment(appointmentId);
      return appointment ? json(200, appointment) : notFound("Appointment not found.");
    }
    if (method === "PUT") {
      const appointment = await updateAppointment(
        appointmentId,
        parseJsonBody(event),
      );
      return appointment
        ? json(200, appointment)
        : notFound("Appointment not found.");
    }
    if (method === "DELETE") {
      const existing = await getAppointment(appointmentId);
      if (!existing) {
        return notFound("Appointment not found.");
      }
      await sql`DELETE FROM appointments WHERE id = ${appointmentId}::uuid`;
      return json(200, existing);
    }
    return methodNotAllowed();
  }

  match = path.match(/^\/appointments\/([^/]+)\/(archive|unarchive)$/);
  if (match) {
    const [, appointmentId, action] = match;
    if (method !== "POST") {
      return methodNotAllowed();
    }
    const appointment = await archiveAppointment(
      appointmentId,
      action === "archive",
    );
    return appointment
      ? json(200, appointment)
      : notFound("Appointment not found.");
  }

  match = path.match(/^\/appointments\/([^/]+)\/notes$/);
  if (match) {
    const appointmentId = match[1];
    if (method !== "POST") {
      return methodNotAllowed();
    }
    const payload = parseJsonBody(event);
    await addAppointmentNote(appointmentId, payload.text, payload.visibility, currentUser);
    return json(200, await getAppointment(appointmentId));
  }

  match = path.match(/^\/appointments\/([^/]+)\/notes\/([^/]+)$/);
  if (match) {
    const [, appointmentId, noteId] = match;
    if (method === "PUT") {
      const payload = parseJsonBody(event);
      const updated = await updateAppointmentNote(
        appointmentId,
        noteId,
        payload.text,
        payload.visibility,
      );
      return updated
        ? json(200, await getAppointment(appointmentId))
        : notFound("Note not found.");
    }
    if (method === "DELETE") {
      const deleted = await deleteAppointmentNote(appointmentId, noteId);
      return deleted
        ? json(200, await getAppointment(appointmentId))
        : notFound("Note not found.");
    }
    return methodNotAllowed();
  }

  match = path.match(/^\/appointments\/([^/]+)\/notes\/([^/]+)\/(archive|unarchive)$/);
  if (match) {
    const [, appointmentId, noteId, action] = match;
    if (method !== "POST") {
      return methodNotAllowed();
    }
    const updated = await archiveAppointmentNote(
      appointmentId,
      noteId,
      action === "archive",
    );
    return updated
      ? json(200, await getAppointment(appointmentId))
      : notFound("Note not found.");
  }

  return notFound("Route not found.");
}

export async function handler(event) {
  try {
    await ensureSchema();
    return await handleRequest(event);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown server error.";
    return badRequest(message);
  }
}
