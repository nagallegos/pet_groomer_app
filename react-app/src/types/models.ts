export type ContactMethod = "text" | "email";
export type Species = "dog" | "cat";
export type AppointmentStatus =
  | "scheduled"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "no-show";

export interface NoteItem {
  id: string;
  text: string;
  createdAt: string;
  updatedAt?: string;
  isArchived?: boolean;
  archivedAt?: string;
}

export interface Owner {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  preferredContactMethod: ContactMethod;
  address?: string;
  notes: NoteItem[];
  isArchived: boolean;
  archivedAt?: string;
}

export interface Pet {
  id: string;
  ownerId: string;
  name: string;
  species: Species;
  breed: string;
  weightLbs?: number;
  ageYears?: number;
  color?: string;
  notes: NoteItem[];
  isArchived: boolean;
  archivedAt?: string;
}

export interface Appointment {
  id: string;
  ownerId: string;
  petId: string;
  start: string;
  end: string;
  serviceType?: string;
  selectedServices?: string[];
  customServiceType?: string;
  cost: number;
  status: AppointmentStatus;
  notes: NoteItem[];
  confirmationSentAt?: string;
  confirmedAt?: string;
  isArchived: boolean;
  archivedAt?: string;
}
