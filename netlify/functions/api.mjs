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
const appUserRoles = new Set(["admin", "groomer", "client"]);

let schemaReadyPromise;
const SESSION_COOKIE = "pet_grooming_session";
const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 14;
const RESPONSE_TOKEN_DURATION_MS = 1000 * 60 * 60 * 24 * 7;
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
    role: row.role,
    name: row.display_name,
    firstName: row.first_name,
    lastName: row.last_name,
    phone: row.phone ?? "",
    notifyByEmail: row.notify_by_email ?? true,
    notifyByText: row.notify_by_text ?? false,
    isActive: row.is_active ?? true,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

function mapOwnerRow(row, notes = []) {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    phone: row.phone,
    email: row.email,
    preferredContactMethod: row.preferred_contact_method,
    address: row.address ?? undefined,
    notes,
    isArchived: row.is_archived,
    archivedAt: toIso(row.archived_at),
  };
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
    cost: Number(row.cost ?? 0),
    status: row.status,
    notes,
    confirmationSentAt: toIso(row.confirmation_sent_at),
    confirmedAt: toIso(row.confirmed_at),
    isArchived: row.is_archived,
    archivedAt: toIso(row.archived_at),
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
          phone TEXT NOT NULL,
          email TEXT NOT NULL,
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
          password_hash TEXT NOT NULL,
          role TEXT NOT NULL CHECK (role IN ('admin', 'groomer', 'client')),
          display_name TEXT NOT NULL,
          first_name TEXT NOT NULL DEFAULT '',
          last_name TEXT NOT NULL DEFAULT '',
          phone TEXT,
          notify_by_email BOOLEAN NOT NULL DEFAULT TRUE,
          notify_by_text BOOLEAN NOT NULL DEFAULT FALSE,
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
      await sql`ALTER TABLE owner_notes ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE`;
      await sql`ALTER TABLE owner_notes ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ`;
      await sql`ALTER TABLE pet_notes ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE`;
      await sql`ALTER TABLE pet_notes ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ`;
      await sql`ALTER TABLE appointment_notes ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT FALSE`;
      await sql`ALTER TABLE appointment_notes ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ`;
      await sql`ALTER TABLE app_users ADD COLUMN IF NOT EXISTS first_name TEXT NOT NULL DEFAULT ''`;
      await sql`ALTER TABLE app_users ADD COLUMN IF NOT EXISTS last_name TEXT NOT NULL DEFAULT ''`;
      await sql`ALTER TABLE app_users ADD COLUMN IF NOT EXISTS phone TEXT`;
      await sql`ALTER TABLE app_users ADD COLUMN IF NOT EXISTS notify_by_email BOOLEAN NOT NULL DEFAULT TRUE`;
      await sql`ALTER TABLE app_users ADD COLUMN IF NOT EXISTS notify_by_text BOOLEAN NOT NULL DEFAULT FALSE`;
      await sql`ALTER TABLE app_users DROP CONSTRAINT IF EXISTS app_users_role_check`;
      await sql`ALTER TABLE app_users ADD CONSTRAINT app_users_role_check CHECK (role IN ('admin', 'groomer', 'client'))`;
      await sql`CREATE INDEX IF NOT EXISTS idx_pets_owner_id ON pets(owner_id)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_appointments_owner_id ON appointments(owner_id)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_appointments_pet_id ON appointments(pet_id)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_appointments_start_at ON appointments(start_at)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_owner_notes_owner_id ON owner_notes(owner_id)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_pet_notes_pet_id ON pet_notes(pet_id)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_appointment_notes_appointment_id ON appointment_notes(appointment_id)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_app_sessions_user_id ON app_sessions(user_id)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_app_sessions_expires_at ON app_sessions(expires_at)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_appointment_response_tokens_token ON appointment_response_tokens(token)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_appointment_response_tokens_appointment_id ON appointment_response_tokens(appointment_id)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_appointment_notifications_appointment_id ON appointment_notifications(appointment_id)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_appointment_notifications_type ON appointment_notifications(notification_type)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_appointment_response_requests_appointment_id ON appointment_response_requests(appointment_id)`;
      await seedDefaultUsers();
    })();
  }

  return schemaReadyPromise;
}

async function fetchOwnerNotes(ownerId) {
  if (ownerId) {
    return sql`
      SELECT id::text AS id, owner_id::text AS owner_id, text, is_archived, archived_at, created_at, updated_at
      FROM owner_notes
      WHERE owner_id = ${ownerId}::uuid
      ORDER BY created_at ASC
    `;
  }

  return sql`
    SELECT id::text AS id, owner_id::text AS owner_id, text, is_archived, archived_at, created_at, updated_at
    FROM owner_notes
    ORDER BY created_at ASC
  `;
}

async function fetchPetNotes(petId) {
  if (petId) {
    return sql`
      SELECT id::text AS id, pet_id::text AS pet_id, text, is_archived, archived_at, created_at, updated_at
      FROM pet_notes
      WHERE pet_id = ${petId}::uuid
      ORDER BY created_at ASC
    `;
  }

  return sql`
    SELECT id::text AS id, pet_id::text AS pet_id, text, is_archived, archived_at, created_at, updated_at
    FROM pet_notes
    ORDER BY created_at ASC
  `;
}

async function fetchAppointmentNotes(appointmentId) {
  if (appointmentId) {
    return sql`
      SELECT id::text AS id, appointment_id::text AS appointment_id, text, is_archived, archived_at, created_at, updated_at
      FROM appointment_notes
      WHERE appointment_id = ${appointmentId}::uuid
      ORDER BY created_at ASC
    `;
  }

  return sql`
    SELECT id::text AS id, appointment_id::text AS appointment_id, text, is_archived, archived_at, created_at, updated_at
    FROM appointment_notes
    ORDER BY created_at ASC
  `;
}

async function listOwners() {
  const [ownerRows, noteRows] = await Promise.all([
    sql`
      SELECT id::text AS id, first_name, last_name, phone, email, preferred_contact_method,
             address, is_archived, archived_at
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
           address, is_archived, archived_at
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
             age_years, color, is_archived, archived_at
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
           weight_lbs, age_years, color, is_archived, archived_at
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
             service_type, selected_services, custom_service_type, cost, status,
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
           cost, status, confirmation_sent_at, confirmed_at, is_archived, archived_at
    FROM appointments
    WHERE id = ${id}::uuid
  `;
  if (rows.length === 0) {
    return null;
  }

  const noteRows = await fetchAppointmentNotes(id);
  return mapAppointmentRow(rows[0], noteRows.map(mapNoteRow));
}

async function getUserByEmail(email) {
  const rows = await sql`
    SELECT id::text AS id, email, password_hash, role, display_name, first_name, last_name, phone, notify_by_email, notify_by_text, is_active
    FROM app_users
    WHERE email = ${email.trim().toLowerCase()}
  `;
  return rows[0] ?? null;
}

async function listAppUsers() {
  const rows = await sql`
    SELECT id::text AS id, email, role, display_name, first_name, last_name, phone,
           notify_by_email, notify_by_text, is_active, created_at, updated_at
    FROM app_users
    ORDER BY last_name ASC, first_name ASC, email ASC
  `;
  return rows.map(mapAppUser);
}

async function getAppointmentWithRelations(appointmentId) {
  const appointmentRows = await sql`
    SELECT id::text AS id, owner_id::text AS owner_id, pet_id::text AS pet_id,
           start_at, end_at, service_type, selected_services, custom_service_type,
           cost, status, confirmation_sent_at, confirmed_at, is_archived, archived_at
    FROM appointments
    WHERE id = ${appointmentId}::uuid
    LIMIT 1
  `;

  if (appointmentRows.length === 0) {
    return null;
  }

  const appointment = mapAppointmentRow(appointmentRows[0]);
  const ownerRows = await sql`
    SELECT id::text AS id, first_name, last_name, phone, email, preferred_contact_method, address, is_archived, archived_at
    FROM owners
    WHERE id = ${appointment.ownerId}::uuid
    LIMIT 1
  `;
  const petRows = await sql`
    SELECT id::text AS id, owner_id::text AS owner_id, name, species, breed, weight_lbs, age_years, color, is_archived, archived_at
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

function getClientAvailableActions(appointmentStatus) {
  if (appointmentStatus === "scheduled") {
    return ["confirm", "cancel", "reschedule"];
  }
  if (appointmentStatus === "confirmed") {
    return ["cancel", "reschedule"];
  }
  return [];
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
  const actionButtons = isCancellation
    ? ""
    : getClientAvailableActions(summary.status)
        .map((action) => {
          const label =
            action === "confirm"
              ? "Confirm Appointment"
              : action === "cancel"
                ? "Request Cancellation"
                : "Request Reschedule";
          return `<p><a href="${responsePageUrl}&action=${action}">${label}</a></p>`;
        })
        .join("");
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
    `Starts: ${summary.startsAt}`,
    `Ends: ${summary.endsAt}`,
    `Service: ${summary.serviceSummary}`,
    !isCancellation && responsePageUrl ? `Manage this appointment: ${responsePageUrl}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return {
    subject,
    html: `
      <p>${intro}</p>
      <p><strong>Pet:</strong> ${summary.petName}<br />
      <strong>Client:</strong> ${summary.ownerName}<br />
      <strong>Starts:</strong> ${summary.startsAt}<br />
      <strong>Ends:</strong> ${summary.endsAt}<br />
      <strong>Service:</strong> ${summary.serviceSummary}</p>
      ${actionButtons}
    `,
    text,
    responsePageUrl,
  };
}

function buildClientTextNotification({ summary, token, notificationType, isCancellation = false }) {
  const responsePageUrl = token
    ? buildAppUrl(`/appointment-response?token=${token}`)
    : null;
  if (isCancellation) {
    return `Appointment update: ${summary.petName} on ${summary.startsAt} has been cancelled.`;
  }
  const prefix =
    notificationType === "reminder_24h"
      ? "Reminder:"
      : "Scheduled:";
  const actions = getClientAvailableActions(summary.status)
    .map((action) => action.toUpperCase())
    .join(", or ");
  return `${prefix} ${summary.petName} on ${summary.startsAt}. Reply ${actions}.${responsePageUrl ? ` Manage online: ${responsePageUrl}` : ""}`;
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
    groomers.flatMap((groomer) => {
      const deliveries = [];
      if (groomer.notifyByEmail && groomer.email) {
        deliveries.push(
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
        );
      }
      if (groomer.notifyByText && groomer.phone) {
        deliveries.push(
          deliverTextNotification({
            to: groomer.phone,
            message: text,
          }).then((result) =>
            logAppointmentNotification({
              appointmentId: summary.appointmentId,
              ownerId: null,
              notificationType: `groomer_${action}_request`,
              recipientType: "groomer",
              channel: "text",
              recipientAddress: groomer.phone,
              status: result.status,
              metadata: { source },
            }),
          ),
        );
      }
      return deliveries;
    }),
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
  const preferredChannel =
    owner.preferredContactMethod === "text" && owner.phone
      ? "text"
      : owner.email
        ? "email"
        : owner.phone
          ? "text"
          : null;

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

  if (preferredChannel === "email") {
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
  } else {
    const message = buildClientTextNotification({
      summary,
      token,
      notificationType,
      isCancellation,
    });
    const result = await deliverTextNotification({
      to: owner.phone,
      message,
    });
    await logAppointmentNotification({
      appointmentId: appointment.id,
      ownerId: owner.id,
      notificationType,
      recipientType: "client",
      channel: "text",
      recipientAddress: owner.phone,
      status: result.status,
      metadata: {},
    });
  }

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

async function getCurrentUser(event) {
  const cookies = parseCookies(event);
  const token = cookies[SESSION_COOKIE];
  if (!token) {
    return null;
  }

  const rows = await sql`
    SELECT u.id::text AS id, u.email, u.role, u.display_name, u.first_name, u.last_name, u.phone, u.notify_by_email, u.notify_by_text, u.is_active
    FROM app_sessions s
    JOIN app_users u ON u.id = s.user_id
    WHERE s.session_token = ${token}
      AND s.expires_at > NOW()
      AND u.is_active = TRUE
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
  };
}

function validateManagedUserPayload(payload, { isNew = false } = {}) {
  const firstName = requiredString(payload.firstName, "firstName");
  const lastName = requiredString(payload.lastName, "lastName");
  const email = requiredEmail(payload.email, "email");
  const phone = optionalString(payload.phone) ?? "";
  const role = requiredString(payload.role, "role");
  const notifyByEmail = optionalBoolean(payload.notifyByEmail, "notifyByEmail");
  const notifyByText = optionalBoolean(payload.notifyByText, "notifyByText");
  const isActive = optionalBoolean(payload.isActive, "isActive");

  if (!appUserRoles.has(role)) {
    throw new Error("role is invalid.");
  }

  if (notifyByText && !phone) {
    throw new Error("A phone number is required when text notifications are enabled.");
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
    phone,
    role,
    notifyByEmail,
    notifyByText,
    isActive,
    password,
  };
}

async function updateCurrentUserProfile(userId, payload) {
  const input = validateUserProfilePayload(payload);
  const displayName = `${input.firstName} ${input.lastName}`.trim();

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
        updated_at = NOW()
    WHERE id = ${userId}::uuid
    RETURNING id::text AS id, email, role, display_name, first_name, last_name, phone, notify_by_email, notify_by_text
  `;

  return rows[0] ? mapAppUser(rows[0]) : null;
}

async function createAppUser(payload) {
  const input = validateManagedUserPayload(payload, { isNew: true });
  const displayName = `${input.firstName} ${input.lastName}`.trim();
  const duplicateEmail = await sql`
    SELECT id::text AS id
    FROM app_users
    WHERE email = ${input.email}
    LIMIT 1
  `;

  if (duplicateEmail.length > 0) {
    throw new Error("That email address is already in use.");
  }

  const rows = await sql`
    INSERT INTO app_users (
      email, password_hash, role, display_name, first_name, last_name, phone,
      notify_by_email, notify_by_text, is_active
    )
    VALUES (
      ${input.email},
      ${hashPassword(input.password)},
      ${input.role},
      ${displayName},
      ${input.firstName},
      ${input.lastName},
      ${input.phone},
      ${input.notifyByEmail},
      ${input.notifyByText},
      ${input.isActive}
    )
    RETURNING id::text AS id, email, role, display_name, first_name, last_name, phone,
              notify_by_email, notify_by_text, is_active, created_at, updated_at
  `;

  return mapAppUser(rows[0]);
}

async function updateAppUser(userId, payload, currentUserId) {
  const input = validateManagedUserPayload(payload);
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

  await sql`
    UPDATE app_users
    SET email = ${input.email},
        role = ${input.role},
        display_name = ${displayName},
        first_name = ${input.firstName},
        last_name = ${input.lastName},
        phone = ${input.phone},
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
    SELECT id::text AS id, email, role, display_name, first_name, last_name, phone,
           notify_by_email, notify_by_text, is_active, created_at, updated_at
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
    RETURNING id::text AS id, email, role, display_name, first_name, last_name, phone,
              notify_by_email, notify_by_text, is_active, created_at, updated_at
  `;

  return rows[0] ? mapAppUser(rows[0]) : null;
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
  };
}

async function processAppointmentResponseToken(token, action, source) {
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
    await createAppointmentResponseRequest(
      details.appointment.id,
      details.owner.id,
      action,
      source,
    );
    await notifyGroomersOfClientRequest(summary, action, source);
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

async function addOwnerNote(ownerId, text) {
  await sql`
    INSERT INTO owner_notes (owner_id, text)
    VALUES (${ownerId}::uuid, ${requiredString(text, "text")})
  `;
}

async function addPetNote(petId, text) {
  await sql`
    INSERT INTO pet_notes (pet_id, text)
    VALUES (${petId}::uuid, ${requiredString(text, "text")})
  `;
}

async function addAppointmentNote(appointmentId, text) {
  await sql`
    INSERT INTO appointment_notes (appointment_id, text)
    VALUES (${appointmentId}::uuid, ${requiredString(text, "text")})
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

async function updateOwnerNote(ownerId, noteId, text) {
  const rows = await sql`
    UPDATE owner_notes
    SET text = ${requiredString(text, "text")}, updated_at = NOW()
    WHERE id = ${noteId}::uuid AND owner_id = ${ownerId}::uuid
    RETURNING id::text AS id
  `;
  return rows.length > 0;
}

async function updatePetNote(petId, noteId, text) {
  const rows = await sql`
    UPDATE pet_notes
    SET text = ${requiredString(text, "text")}, updated_at = NOW()
    WHERE id = ${noteId}::uuid AND pet_id = ${petId}::uuid
    RETURNING id::text AS id
  `;
  return rows.length > 0;
}

async function updateAppointmentNote(appointmentId, noteId, text) {
  const rows = await sql`
    UPDATE appointment_notes
    SET text = ${requiredString(text, "text")}, updated_at = NOW()
    WHERE id = ${noteId}::uuid AND appointment_id = ${appointmentId}::uuid
    RETURNING id::text AS id
  `;
  return rows.length > 0;
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
    phone: requiredString(payload.phone, "phone"),
    email: requiredString(payload.email, "email"),
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
    color: optionalString(payload.color),
    notes: typeof payload.notes === "string" ? payload.notes : undefined,
  };
}

function validateAppointmentPayload(payload) {
  const status = payload.status ? requiredString(payload.status, "status") : "scheduled";
  if (!appointmentStatuses.has(status)) {
    throw new Error("status is invalid.");
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
    cost: optionalNumber(payload.cost, "cost") ?? 0,
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

  if (input.notes !== undefined) {
    await replaceOwnerNotes(id, input.notes);
  }
  return getOwner(id);
}

async function createPet(payload) {
  const input = validatePetPayload(payload);
  const rows = await sql`
    INSERT INTO pets (owner_id, name, species, breed, weight_lbs, age_years, color)
    VALUES (
      ${input.ownerId}::uuid,
      ${input.name},
      ${input.species},
      ${input.breed},
      ${input.weightLbs},
      ${input.ageYears},
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
      custom_service_type, cost, status, confirmed_at
    )
    VALUES (
      ${input.ownerId}::uuid,
      ${input.petId}::uuid,
      ${input.start}::timestamptz,
      ${input.end}::timestamptz,
      ${input.serviceType},
      ${input.selectedServices},
      ${input.customServiceType},
      ${input.cost},
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
        cost = ${input.cost},
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

async function archiveOwner(id, shouldArchive) {
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
    const email = requiredString(payload.email, "email").toLowerCase();
    const password = requiredString(payload.password, "password");
    const user = await getUserByEmail(email);

    if (!user || !user.is_active || !verifyPassword(password, user.password_hash)) {
      return unauthorized("Invalid email or password.");
    }

    const session = await createSession(user.id);
    return json(
      200,
      { user: mapAppUser(user) },
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

  let match = path.match(/^\/public\/appointment-response\/([^/]+)$/);
  if (match) {
    const token = match[1];
    if (method === "GET") {
      const details = await getAppointmentResponseDetails(token);
      return details ? json(200, details) : notFound("Response link not found.");
    }
    if (method === "POST") {
      const payload = parseJsonBody(event);
      return json(
        200,
        await processAppointmentResponseToken(
          token,
          requiredString(payload.action, "action").toLowerCase(),
          "email_link",
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

  if (path === "/bootstrap" && method === "GET") {
    const [owners, pets, appointments] = await Promise.all([
      listOwners(),
      listPets(),
      listAppointments(),
    ]);
    return json(200, { owners, pets, appointments });
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
    const owner = await archiveOwner(ownerId, action === "archive");
    return owner ? json(200, owner) : notFound("Owner not found.");
  }

  match = path.match(/^\/owners\/([^/]+)\/notes$/);
  if (match) {
    const ownerId = match[1];
    if (method !== "POST") {
      return methodNotAllowed();
    }
    await addOwnerNote(ownerId, parseJsonBody(event).text);
    return json(200, await getOwner(ownerId));
  }

  match = path.match(/^\/owners\/([^/]+)\/notes\/([^/]+)$/);
  if (match) {
    const [, ownerId, noteId] = match;
    if (method === "PUT") {
      const updated = await updateOwnerNote(ownerId, noteId, parseJsonBody(event).text);
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
    await addPetNote(petId, parseJsonBody(event).text);
    return json(200, await getPet(petId));
  }

  match = path.match(/^\/pets\/([^/]+)\/notes\/([^/]+)$/);
  if (match) {
    const [, petId, noteId] = match;
    if (method === "PUT") {
      const updated = await updatePetNote(petId, noteId, parseJsonBody(event).text);
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
    await addAppointmentNote(appointmentId, parseJsonBody(event).text);
    return json(200, await getAppointment(appointmentId));
  }

  match = path.match(/^\/appointments\/([^/]+)\/notes\/([^/]+)$/);
  if (match) {
    const [, appointmentId, noteId] = match;
    if (method === "PUT") {
      const updated = await updateAppointmentNote(
        appointmentId,
        noteId,
        parseJsonBody(event).text,
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
