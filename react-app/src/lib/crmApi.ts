import type {
  Appointment,
  AppointmentStatus,
  ContactMethod,
  NoteItem,
  Owner,
  Pet,
  Species,
} from "../types/models";

export type AppUserRole = "admin" | "groomer" | "client";

export interface ManagedUser {
  id: string;
  email: string;
  role: AppUserRole;
  name: string;
  firstName: string;
  lastName: string;
  phone: string;
  notifyByEmail: boolean;
  notifyByText: boolean;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ManagedUserUpsertInput {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: AppUserRole;
  notifyByEmail: boolean;
  notifyByText: boolean;
  isActive: boolean;
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

type NoteSaveResult<T> = SaveResult<T>;

type SaveResult<T> = {
  data: T;
  mode: "mock" | "api";
};

export function getApiBaseUrl() {
  return import.meta.env.VITE_API_BASE_URL?.trim() || "/.netlify/functions/api";
}

const API_BASE_URL = getApiBaseUrl();

export function isBackendConfigured() {
  return Boolean(API_BASE_URL);
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
    throw new Error(`Request failed with status ${response.status}`);
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
    color: input.color,
    notes: input.notes
      ? [
          {
            id: existingPet?.notes[0]?.id ?? `pet-note-local-${Date.now()}`,
            text: input.notes,
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

export async function unarchiveOwner(owner: Owner): Promise<SaveResult<Owner>> {
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

  const data = await request<Owner>(`/owners/${owner.id}/unarchive`, "POST", {});
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

function updateExistingNote(
  notes: NoteItem[],
  noteId: string,
  text: string,
): NoteItem[] {
  return notes.map((note) =>
    note.id === noteId
      ? {
          ...note,
          text,
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

function appendNewNote(notes: NoteItem[], prefix: string, text: string): NoteItem[] {
  return [
    {
      id: `${prefix}-${Date.now()}`,
      text,
      createdAt: new Date().toISOString(),
      isArchived: false,
    },
    ...notes,
  ];
}

export async function addOwnerNote(
  owner: Owner,
  text: string,
): Promise<NoteSaveResult<Owner>> {
  if (!isBackendConfigured()) {
    return {
      data: {
        ...owner,
        notes: appendNewNote(owner.notes, "owner-note-local", text),
      },
      mode: "mock",
    };
  }

  const data = await request<Owner>(`/owners/${owner.id}/notes`, "POST", { text });
  return { data, mode: "api" };
}

export async function updateOwnerNote(
  owner: Owner,
  noteId: string,
  text: string,
): Promise<NoteSaveResult<Owner>> {
  if (!isBackendConfigured()) {
    return {
      data: {
        ...owner,
        notes: updateExistingNote(owner.notes, noteId, text),
      },
      mode: "mock",
    };
  }

  const data = await request<Owner>(`/owners/${owner.id}/notes/${noteId}`, "PUT", {
    text,
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
): Promise<NoteSaveResult<Pet>> {
  if (!isBackendConfigured()) {
    return {
      data: {
        ...pet,
        notes: appendNewNote(pet.notes, "pet-note-local", text),
      },
      mode: "mock",
    };
  }

  const data = await request<Pet>(`/pets/${pet.id}/notes`, "POST", { text });
  return { data, mode: "api" };
}

export async function updatePetNote(
  pet: Pet,
  noteId: string,
  text: string,
): Promise<NoteSaveResult<Pet>> {
  if (!isBackendConfigured()) {
    return {
      data: {
        ...pet,
        notes: updateExistingNote(pet.notes, noteId, text),
      },
      mode: "mock",
    };
  }

  const data = await request<Pet>(`/pets/${pet.id}/notes/${noteId}`, "PUT", {
    text,
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
): Promise<NoteSaveResult<Appointment>> {
  if (!isBackendConfigured()) {
    return {
      data: {
        ...appointment,
        notes: appendNewNote(appointment.notes, "appointment-note-local", text),
      },
      mode: "mock",
    };
  }

  const data = await request<Appointment>(
    `/appointments/${appointment.id}/notes`,
    "POST",
    { text },
  );
  return { data, mode: "api" };
}

export async function updateAppointmentNote(
  appointment: Appointment,
  noteId: string,
  text: string,
): Promise<NoteSaveResult<Appointment>> {
  if (!isBackendConfigured()) {
    return {
      data: {
        ...appointment,
        notes: updateExistingNote(appointment.notes, noteId, text),
      },
      mode: "mock",
    };
  }

  const data = await request<Appointment>(
    `/appointments/${appointment.id}/notes/${noteId}`,
    "PUT",
    { text },
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
