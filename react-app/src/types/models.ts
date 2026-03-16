export type ContactMethod = "text" | "email";
export type Species = "dog" | "cat";
export type NoteVisibility = "internal" | "client";
export type AppointmentStatus =
  | "scheduled"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "no-show";
export type ClientRequestType =
  | "appointment"
  | "appointment_change"
  | "new_pet"
  | "profile_update"
  | "general";
export type ClientRequestStatus = "open" | "in_review" | "resolved" | "closed";
export type ClientRequestEventType =
  | "created"
  | "updated"
  | "status_changed"
  | "client_note_updated"
  | "internal_note_updated"
  | "resolved"
  | "reopened";
export type ProfileRequestAttribute = "name" | "contact_info" | "pet";
export type UserNotificationType =
  | "request_created"
  | "request_updated"
  | "appointment_scheduled"
  | "account_locked"
  | "account_setup"
  | "password_reset";

export interface NoteItem {
  id: string;
  text: string;
  visibility: NoteVisibility;
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
  birthDate?: string;
  isBirthDateEstimated?: boolean;
  color?: string;
  notes: NoteItem[];
  isArchived: boolean;
  archivedAt?: string;
}

export interface PendingPetProfile {
  name: string;
  species: Species;
  breed: string;
  weightLbs?: number;
  birthDate?: string;
  isBirthDateEstimated?: boolean;
}

export interface AppointmentRequestDetails {
  petSelection: "existing" | "new_pet";
  petIds?: string[];
  pendingPet?: PendingPetProfile;
}

export type AppointmentChangeType = "cancel" | "reschedule";

export interface AppointmentChangeRequestDetails {
  appointmentId: string;
  changeType: AppointmentChangeType;
}

export interface NewPetRequestDetails {
  pendingPet: PendingPetProfile;
}

export interface ProfileUpdateRequestDetails {
  attribute: ProfileRequestAttribute;
}

export interface GeneralRequestDetails {
  relatedPetOptional?: boolean;
}

export interface ClientRequestDetails {
  appointment?: AppointmentRequestDetails;
  appointmentChange?: AppointmentChangeRequestDetails;
  newPet?: NewPetRequestDetails;
  profileUpdate?: ProfileUpdateRequestDetails;
  general?: GeneralRequestDetails;
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

export interface ClientRequest {
  id: string;
  ownerId: string;
  petId?: string;
  createdByUserId?: string;
  requestType: ClientRequestType;
  status: ClientRequestStatus;
  subject: string;
  clientNote: string;
  resolutionNote?: string;
  internalNote?: string;
  details?: ClientRequestDetails;
  events?: ClientRequestEvent[];
  createdAt: string;
  updatedAt?: string;
  resolvedAt?: string;
}

export interface ClientRequestEvent {
  id: string;
  requestId: string;
  actorUserId?: string;
  actorRole?: "admin" | "groomer" | "client";
  actorName?: string;
  eventType: ClientRequestEventType;
  title: string;
  detail?: string;
  audience: "all" | "staff";
  createdAt: string;
}

export interface UserNotification {
  id: string;
  userId: string;
  type: UserNotificationType;
  title: string;
  body: string;
  href?: string;
  metadata?: Record<string, unknown>;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}
