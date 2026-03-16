import type {
  Appointment,
  AppointmentStatus,
  ClientRequest,
  ClientRequestDetails,
  ClientRequestStatus,
  ClientRequestType,
  ContactMethod,
  NoteVisibility,
  NoteItem,
  Owner,
  Pet,
  Species,
  UserNotification,
} from "../types/models";

export type AppUserRole = "admin" | "groomer" | "client";

export interface ManagedUser {
  id: string;
  email: string;
  username?: string;
  role: AppUserRole;
  name: string;
  firstName: string;
  lastName: string;
  phone: string;
  notifyByEmail: boolean;
  notifyByText: boolean;
  isActive: boolean;
  failedLoginAttempts?: number;
  lockedAt?: string;
  ownerId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ManagedUserUpsertInput {
  firstName: string;
  lastName: string;
  email: string;
  username?: string;
  phone: string;
  role: AppUserRole;
  notifyByEmail: boolean;
  notifyByText: boolean;
  isActive: boolean;
  ownerId?: string;
  password?: string;
}
import { derivePrimaryServiceType } from "./appointmentServices";

export interface OwnerUpsertInput {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  preferredContactMethod: ContactMethod;
  address?: string;
  notes?: string;
}

export interface PetUpsertInput {
  ownerId: string;
  name: string;
  species: Species;
  breed: string;
  weightLbs?: number;
  ageYears?: number;
  birthDate?: string;
  isBirthDateEstimated?: boolean;
  color?: string;
  notes?: string;
}

export interface AppointmentUpsertInput {
  ownerId: string;
  petId: string;
  start: string;
  end: string;
  serviceType?: string;
  selectedServices?: string[];
  customServiceType?: string;
  cost: number;
  notes?: string;
  status?: AppointmentStatus;
}

export interface ClientRequestUpsertInput {
  ownerId: string;
  petId?: string;
  requestType: ClientRequestType;
  subject: string;
  clientNote: string;
  resolutionNote?: string;
  internalNote?: string;
  status?: ClientRequestStatus;
  details?: ClientRequestDetails;
}

type NoteSaveResult<T> = SaveResult<T>;

type SaveResult<T> = {
  data: T;
  mode: "mock" | "api";
};

export function getApiBaseUrl() {
  return import.meta.env.VITE_API_BASE_URL?.trim() || "/.netlify/functions/api";
}

const API_BASE_URL = getApiBaseUrl();
let backendAvailableOverride: boolean | null = null;

export function isBackendConfigured() {
  if (backendAvailableOverride !== null) {
    return backendAvailableOverride;
  }

  return Boolean(API_BASE_URL);
}

export function setBackendAvailable(isAvailable: boolean) {
  backendAvailableOverride = isAvailable;
}

async function request<T>(path: string, method: string, body?: unknown): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: body === undefined ? undefined : {
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!response.ok) {
    const contentType = response.headers.get("Content-Type") || "";
    let message = `Request failed with status ${response.status}`;

    try {
      if (contentType.includes("application/json")) {
        const data = await response.json();
        if (data?.error) {
          message = data.error;
        } else if (data?.message) {
          message = data.message;
        } else if (typeof data === "string") {
          message = data;
        } else {
          message = JSON.stringify(data);
        }
      } else {
        const text = await response.text();
        if (text) {
          message = text;
        }
      }
    } catch {
      // Fall back to the status-based message.
    }

    throw new Error(message);
  }

  return (await response.json()) as T;
}

export async function listManagedUsers(): Promise<ManagedUser[]> {
  return request<ManagedUser[]>("/users", "GET");
}

export async function saveManagedUser(
  input: ManagedUserUpsertInput,
  existingUser?: ManagedUser,
): Promise<ManagedUser> {
  return existingUser
    ? request<ManagedUser>(`/users/${existingUser.id}`, "PUT", input)
    : request<ManagedUser>("/users", "POST", input);
}

export async function deleteManagedUser(userId: string): Promise<ManagedUser> {
  return request<ManagedUser>(`/users/${userId}`, "DELETE", {});
}

export async function unlockManagedUser(userId: string): Promise<ManagedUser> {
  return request<ManagedUser>(`/users/${userId}/unlock`, "POST", {});
}

export async function sendUserSetup(userId: string): Promise<{ ok: true }> {
  return request<{ ok: true }>(`/users/${userId}/send-setup`, "POST", {});
}

export async function sendUserPasswordReset(userId: string): Promise<{ ok: true }> {
  return request<{ ok: true }>(`/users/${userId}/send-password-reset`, "POST", {});
}

export async function listUserNotifications(): Promise<UserNotification[]> {
  return request<UserNotification[]>("/notifications", "GET");
}

export async function listAllUserNotifications(): Promise<UserNotification[]> {
  return request<UserNotification[]>("/notifications/all", "GET");
}

export async function markUserNotificationRead(notificationId: string): Promise<UserNotification> {
  return request<UserNotification>(`/notifications/${notificationId}/read`, "POST", {});
}

export async function requestPasswordReset(email: string): Promise<{ ok: true }> {
  return request<{ ok: true }>("/auth/request-password-reset", "POST", { email });
}

export async function resetPassword(token: string, password: string): Promise<{ ok: true }> {
  return request<{ ok: true }>("/auth/reset-password", "POST", { token, password });
}

export async function completeAccountSetup(input: {
  token: string;
  tempPassword: string;
  password: string;
  username?: string;
  useEmail?: boolean;
}): Promise<{ ok: true }> {
  return request<{ ok: true }>("/auth/complete-setup", "POST", input);
}

function normalizeOwner(input: OwnerUpsertInput, existingOwner?: Owner): Owner {
  return {
    id: existingOwner?.id ?? `owner-local-${Date.now()}`,
    firstName: input.firstName,
    lastName: input.lastName,
    phone: input.phone,
    email: input.email,
    preferredContactMethod: input.preferredContactMethod,
    address: input.address,
    notes: input.notes
      ? [
          {
            id: existingOwner?.notes[0]?.id ?? `owner-note-local-${Date.now()}`,
            text: input.notes,
            visibility: "internal",
            createdAt:
              existingOwner?.notes[0]?.createdAt ?? new Date().toISOString(),
          },
        ]
      : existingOwner?.notes ?? [],
    isArchived: existingOwner?.isArchived ?? false,
    archivedAt: existingOwner?.archivedAt,
  };
}

function normalizePet(input: PetUpsertInput, existingPet?: Pet): Pet {
  return {
    id: existingPet?.id ?? `pet-local-${Date.now()}`,
    ownerId: input.ownerId,
    name: input.name,
    species: input.species,
    breed: input.breed,
    weightLbs: input.weightLbs,
    ageYears: input.ageYears,
    birthDate: input.birthDate,
    isBirthDateEstimated: input.isBirthDateEstimated,
    color: input.color,
    notes: input.notes
      ? [
          {
            id: existingPet?.notes[0]?.id ?? `pet-note-local-${Date.now()}`,
            text: input.notes,
            visibility: "internal",
            createdAt:
              existingPet?.notes[0]?.createdAt ?? new Date().toISOString(),
          },
        ]
      : existingPet?.notes ?? [],
    isArchived: existingPet?.isArchived ?? false,
    archivedAt: existingPet?.archivedAt,
  };
}

function normalizeAppointment(
  input: AppointmentUpsertInput,
  existingAppointment?: Appointment,
): Appointment {
  return {
    id: existingAppointment?.id ?? `appt-local-${Date.now()}`,
    ownerId: input.ownerId,
    petId: input.petId,
    start: input.start,
    end: input.end,
    serviceType:
      input.serviceType ?? derivePrimaryServiceType(input.selectedServices ?? []),
    selectedServices: input.selectedServices ?? [],
    customServiceType: input.customServiceType,
    cost: input.cost,
    status: input.status ?? existingAppointment?.status ?? "scheduled",
    notes: input.notes
      ? [
          {
            id:
              existingAppointment?.notes[0]?.id ?? `appt-note-local-${Date.now()}`,
            text: input.notes,
            visibility: "internal",
            createdAt:
              existingAppointment?.notes[0]?.createdAt ?? new Date().toISOString(),
          },
        ]
      : existingAppointment?.notes ?? [],
    confirmationSentAt: existingAppointment?.confirmationSentAt,
    confirmedAt: existingAppointment?.confirmedAt,
    isArchived: existingAppointment?.isArchived ?? false,
    archivedAt: existingAppointment?.archivedAt,
  };
}

function normalizeClientRequest(
  input: ClientRequestUpsertInput,
  existingRequest?: ClientRequest,
): ClientRequest {
  const now = new Date().toISOString();
  const status = input.status ?? existingRequest?.status ?? "open";
  const resolvedAt =
    status === "resolved" || status === "closed" ? now : existingRequest?.resolvedAt;

  return {
    id: existingRequest?.id ?? `request-local-${Date.now()}`,
    ownerId: input.ownerId,
    petId: input.petId,
    createdByUserId: existingRequest?.createdByUserId,
    requestType: input.requestType,
    status,
    subject: input.subject,
    clientNote: input.clientNote,
    resolutionNote: input.resolutionNote,
    internalNote: input.internalNote,
    details: input.details,
    events: existingRequest?.events ?? [],
    createdAt: existingRequest?.createdAt ?? now,
    updatedAt: now,
    resolvedAt,
  };
}

export async function saveOwner(
  input: OwnerUpsertInput,
  existingOwner?: Owner,
): Promise<SaveResult<Owner>> {
  if (!isBackendConfigured()) {
    return {
      data: normalizeOwner(input, existingOwner),
      mode: "mock",
    };
  }

  const data = existingOwner
    ? await request<Owner>(`/owners/${existingOwner.id}`, "PUT", input)
    : await request<Owner>("/owners", "POST", input);

  return { data, mode: "api" };
}

export async function savePet(
  input: PetUpsertInput,
  existingPet?: Pet,
): Promise<SaveResult<Pet>> {
  if (!isBackendConfigured()) {
    return {
      data: normalizePet(input, existingPet),
      mode: "mock",
    };
  }

  const data = existingPet
    ? await request<Pet>(`/pets/${existingPet.id}`, "PUT", input)
    : await request<Pet>("/pets", "POST", input);

  return { data, mode: "api" };
}

export async function saveAppointment(
  input: AppointmentUpsertInput,
  existingAppointment?: Appointment,
): Promise<SaveResult<Appointment>> {
  if (!isBackendConfigured()) {
    return {
      data: normalizeAppointment(input, existingAppointment),
      mode: "mock",
    };
  }

  const data = existingAppointment
    ? await request<Appointment>(
        `/appointments/${existingAppointment.id}`,
        "PUT",
        input,
      )
    : await request<Appointment>("/appointments", "POST", input);

  return { data, mode: "api" };
}

export async function updateAppointmentStatus(
  appointment: Appointment,
  status: AppointmentStatus,
): Promise<SaveResult<Appointment>> {
  return saveAppointment(
    {
      ownerId: appointment.ownerId,
      petId: appointment.petId,
      start: appointment.start,
      end: appointment.end,
      serviceType: appointment.serviceType,
      selectedServices: appointment.selectedServices,
      customServiceType: appointment.customServiceType,
      cost: appointment.cost,
      notes: appointment.notes.map((note) => note.text).join("\n"),
      status,
    },
    {
      ...appointment,
      status,
      confirmedAt:
        status === "confirmed" ? new Date().toISOString() : appointment.confirmedAt,
    },
  );
}

export async function archiveOwner(owner: Owner): Promise<SaveResult<Owner>> {
  if (!isBackendConfigured()) {
    return {
      data: {
        ...owner,
        isArchived: true,
        archivedAt: new Date().toISOString(),
      },
      mode: "mock",
    };
  }

  const data = await request<Owner>(`/owners/${owner.id}/archive`, "POST", {});
  return { data, mode: "api" };
}

export async function unarchiveOwner(
  owner: Owner,
  options?: { includeRelated?: boolean },
): Promise<SaveResult<Owner>> {
  if (!isBackendConfigured()) {
    return {
      data: {
        ...owner,
        isArchived: false,
        archivedAt: undefined,
      },
      mode: "mock",
    };
  }

  const data = await request<Owner>(`/owners/${owner.id}/unarchive`, "POST", {
    includeRelated: options?.includeRelated === true,
  });
  return { data, mode: "api" };
}

export async function archivePet(pet: Pet): Promise<SaveResult<Pet>> {
  if (!isBackendConfigured()) {
    return {
      data: {
        ...pet,
        isArchived: true,
        archivedAt: new Date().toISOString(),
      },
      mode: "mock",
    };
  }

  const data = await request<Pet>(`/pets/${pet.id}/archive`, "POST", {});
  return { data, mode: "api" };
}

export async function unarchivePet(pet: Pet): Promise<SaveResult<Pet>> {
  if (!isBackendConfigured()) {
    return {
      data: {
        ...pet,
        isArchived: false,
        archivedAt: undefined,
      },
      mode: "mock",
    };
  }

  const data = await request<Pet>(`/pets/${pet.id}/unarchive`, "POST", {});
  return { data, mode: "api" };
}

export async function deleteOwner(owner: Owner): Promise<SaveResult<Owner>> {
  if (!isBackendConfigured()) {
    return {
      data: owner,
      mode: "mock",
    };
  }

  const data = await request<Owner>(`/owners/${owner.id}`, "DELETE", {});
  return { data, mode: "api" };
}

export async function deletePet(pet: Pet): Promise<SaveResult<Pet>> {
  if (!isBackendConfigured()) {
    return {
      data: pet,
      mode: "mock",
    };
  }

  const data = await request<Pet>(`/pets/${pet.id}`, "DELETE", {});
  return { data, mode: "api" };
}

export async function archiveAppointment(
  appointment: Appointment,
): Promise<SaveResult<Appointment>> {
  if (!isBackendConfigured()) {
    return {
      data: {
        ...appointment,
        isArchived: true,
        archivedAt: new Date().toISOString(),
      },
      mode: "mock",
    };
  }

  const data = await request<Appointment>(
    `/appointments/${appointment.id}/archive`,
    "POST",
    {},
  );
  return { data, mode: "api" };
}

export async function unarchiveAppointment(
  appointment: Appointment,
): Promise<SaveResult<Appointment>> {
  if (!isBackendConfigured()) {
    return {
      data: {
        ...appointment,
        isArchived: false,
        archivedAt: undefined,
      },
      mode: "mock",
    };
  }

  const data = await request<Appointment>(
    `/appointments/${appointment.id}/unarchive`,
    "POST",
    {},
  );
  return { data, mode: "api" };
}

export async function deleteAppointment(
  appointment: Appointment,
): Promise<SaveResult<Appointment>> {
  if (!isBackendConfigured()) {
    return {
      data: appointment,
      mode: "mock",
    };
  }

  const data = await request<Appointment>(
    `/appointments/${appointment.id}`,
    "DELETE",
    {},
  );
  return { data, mode: "api" };
}

export async function listClientRequests(): Promise<ClientRequest[]> {
  return request<ClientRequest[]>("/requests", "GET");
}

export async function saveClientRequest(
  input: ClientRequestUpsertInput,
  existingRequest?: ClientRequest,
): Promise<ClientRequest> {
  if (!isBackendConfigured()) {
    return normalizeClientRequest(input, existingRequest);
  }

  return existingRequest
    ? request<ClientRequest>(`/requests/${existingRequest.id}`, "PUT", input)
    : request<ClientRequest>("/requests", "POST", input);
}

function updateExistingNote(
  notes: NoteItem[],
  noteId: string,
  text: string,
  visibility?: NoteVisibility,
): NoteItem[] {
  return notes.map((note) =>
    note.id === noteId
      ? {
          ...note,
          text,
          visibility: visibility ?? note.visibility,
          updatedAt: new Date().toISOString(),
        }
      : note,
  );
}

function archiveExistingNote(
  notes: NoteItem[],
  noteId: string,
  isArchived: boolean,
): NoteItem[] {
  return notes.map((note) =>
    note.id === noteId
      ? {
          ...note,
          isArchived,
          archivedAt: isArchived ? new Date().toISOString() : undefined,
          updatedAt: new Date().toISOString(),
        }
      : note,
  );
}

function deleteExistingNote(notes: NoteItem[], noteId: string): NoteItem[] {
  return notes.filter((note) => note.id !== noteId);
}

function appendNewNote(
  notes: NoteItem[],
  prefix: string,
  text: string,
  visibility: NoteVisibility,
): NoteItem[] {
  return [
    {
      id: `${prefix}-${Date.now()}`,
      text,
      visibility,
      createdAt: new Date().toISOString(),
      isArchived: false,
    },
    ...notes,
  ];
}

export async function addOwnerNote(
  owner: Owner,
  text: string,
  visibility: NoteVisibility = "internal",
): Promise<NoteSaveResult<Owner>> {
  if (!isBackendConfigured()) {
    return {
      data: {
        ...owner,
        notes: appendNewNote(owner.notes, "owner-note-local", text, visibility),
      },
      mode: "mock",
    };
  }

  const data = await request<Owner>(`/owners/${owner.id}/notes`, "POST", {
    text,
    visibility,
  });
  return { data, mode: "api" };
}

export async function updateOwnerNote(
  owner: Owner,
  noteId: string,
  text: string,
  visibility?: NoteVisibility,
): Promise<NoteSaveResult<Owner>> {
  if (!isBackendConfigured()) {
    return {
      data: {
        ...owner,
        notes: updateExistingNote(owner.notes, noteId, text, visibility),
      },
      mode: "mock",
    };
  }

  const data = await request<Owner>(`/owners/${owner.id}/notes/${noteId}`, "PUT", {
    text,
    visibility,
  });
  return { data, mode: "api" };
}

export async function archiveOwnerNote(
  owner: Owner,
  noteId: string,
): Promise<NoteSaveResult<Owner>> {
  if (!isBackendConfigured()) {
    return {
      data: {
        ...owner,
        notes: archiveExistingNote(owner.notes, noteId, true),
      },
      mode: "mock",
    };
  }

  const data = await request<Owner>(`/owners/${owner.id}/notes/${noteId}/archive`, "POST", {});
  return { data, mode: "api" };
}

export async function unarchiveOwnerNote(
  owner: Owner,
  noteId: string,
): Promise<NoteSaveResult<Owner>> {
  if (!isBackendConfigured()) {
    return {
      data: {
        ...owner,
        notes: archiveExistingNote(owner.notes, noteId, false),
      },
      mode: "mock",
    };
  }

  const data = await request<Owner>(`/owners/${owner.id}/notes/${noteId}/unarchive`, "POST", {});
  return { data, mode: "api" };
}

export async function deleteOwnerNoteItem(
  owner: Owner,
  noteId: string,
): Promise<NoteSaveResult<Owner>> {
  if (!isBackendConfigured()) {
    return {
      data: {
        ...owner,
        notes: deleteExistingNote(owner.notes, noteId),
      },
      mode: "mock",
    };
  }

  const data = await request<Owner>(`/owners/${owner.id}/notes/${noteId}`, "DELETE", {});
  return { data, mode: "api" };
}

export async function addPetNote(
  pet: Pet,
  text: string,
  visibility: NoteVisibility = "internal",
): Promise<NoteSaveResult<Pet>> {
  if (!isBackendConfigured()) {
    return {
      data: {
        ...pet,
        notes: appendNewNote(pet.notes, "pet-note-local", text, visibility),
      },
      mode: "mock",
    };
  }

  const data = await request<Pet>(`/pets/${pet.id}/notes`, "POST", {
    text,
    visibility,
  });
  return { data, mode: "api" };
}

export async function updatePetNote(
  pet: Pet,
  noteId: string,
  text: string,
  visibility?: NoteVisibility,
): Promise<NoteSaveResult<Pet>> {
  if (!isBackendConfigured()) {
    return {
      data: {
        ...pet,
        notes: updateExistingNote(pet.notes, noteId, text, visibility),
      },
      mode: "mock",
    };
  }

  const data = await request<Pet>(`/pets/${pet.id}/notes/${noteId}`, "PUT", {
    text,
    visibility,
  });
  return { data, mode: "api" };
}

export async function archivePetNote(
  pet: Pet,
  noteId: string,
): Promise<NoteSaveResult<Pet>> {
  if (!isBackendConfigured()) {
    return {
      data: {
        ...pet,
        notes: archiveExistingNote(pet.notes, noteId, true),
      },
      mode: "mock",
    };
  }

  const data = await request<Pet>(`/pets/${pet.id}/notes/${noteId}/archive`, "POST", {});
  return { data, mode: "api" };
}

export async function unarchivePetNote(
  pet: Pet,
  noteId: string,
): Promise<NoteSaveResult<Pet>> {
  if (!isBackendConfigured()) {
    return {
      data: {
        ...pet,
        notes: archiveExistingNote(pet.notes, noteId, false),
      },
      mode: "mock",
    };
  }

  const data = await request<Pet>(`/pets/${pet.id}/notes/${noteId}/unarchive`, "POST", {});
  return { data, mode: "api" };
}

export async function deletePetNoteItem(
  pet: Pet,
  noteId: string,
): Promise<NoteSaveResult<Pet>> {
  if (!isBackendConfigured()) {
    return {
      data: {
        ...pet,
        notes: deleteExistingNote(pet.notes, noteId),
      },
      mode: "mock",
    };
  }

  const data = await request<Pet>(`/pets/${pet.id}/notes/${noteId}`, "DELETE", {});
  return { data, mode: "api" };
}

export async function addAppointmentNote(
  appointment: Appointment,
  text: string,
  visibility: NoteVisibility = "internal",
): Promise<NoteSaveResult<Appointment>> {
  if (!isBackendConfigured()) {
    return {
      data: {
        ...appointment,
        notes: appendNewNote(
          appointment.notes,
          "appointment-note-local",
          text,
          visibility,
        ),
      },
      mode: "mock",
    };
  }

  const data = await request<Appointment>(
    `/appointments/${appointment.id}/notes`,
    "POST",
    { text, visibility },
  );
  return { data, mode: "api" };
}

export async function updateAppointmentNote(
  appointment: Appointment,
  noteId: string,
  text: string,
  visibility?: NoteVisibility,
): Promise<NoteSaveResult<Appointment>> {
  if (!isBackendConfigured()) {
    return {
      data: {
        ...appointment,
        notes: updateExistingNote(appointment.notes, noteId, text, visibility),
      },
      mode: "mock",
    };
  }

  const data = await request<Appointment>(
    `/appointments/${appointment.id}/notes/${noteId}`,
    "PUT",
    { text, visibility },
  );
  return { data, mode: "api" };
}

export async function archiveAppointmentNote(
  appointment: Appointment,
  noteId: string,
): Promise<NoteSaveResult<Appointment>> {
  if (!isBackendConfigured()) {
    return {
      data: {
        ...appointment,
        notes: archiveExistingNote(appointment.notes, noteId, true),
      },
      mode: "mock",
    };
  }

  const data = await request<Appointment>(
    `/appointments/${appointment.id}/notes/${noteId}/archive`,
    "POST",
    {},
  );
  return { data, mode: "api" };
}

export async function unarchiveAppointmentNote(
  appointment: Appointment,
  noteId: string,
): Promise<NoteSaveResult<Appointment>> {
  if (!isBackendConfigured()) {
    return {
      data: {
        ...appointment,
        notes: archiveExistingNote(appointment.notes, noteId, false),
      },
      mode: "mock",
    };
  }

  const data = await request<Appointment>(
    `/appointments/${appointment.id}/notes/${noteId}/unarchive`,
    "POST",
    {},
  );
  return { data, mode: "api" };
}

export async function deleteAppointmentNoteItem(
  appointment: Appointment,
  noteId: string,
): Promise<NoteSaveResult<Appointment>> {
  if (!isBackendConfigured()) {
    return {
      data: {
        ...appointment,
        notes: deleteExistingNote(appointment.notes, noteId),
      },
      mode: "mock",
    };
  }

  const data = await request<Appointment>(
    `/appointments/${appointment.id}/notes/${noteId}`,
    "DELETE",
    {},
  );
  return { data, mode: "api" };
}
