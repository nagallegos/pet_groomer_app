import type { Appointment } from "../types/models";

export const APPOINTMENT_SERVICE_OPTIONS = [
  "Full Groom",
  "Bath and Brush",
  "Nail Trim",
  "Puppy Intro Groom",
  "Deshed Treatment",
  "Sanitary Trim",
  "Face, Feet, and Fanny",
  "Cat Groom",
  "Custom",
] as const;

export function getAppointmentSelectedServices(
  appointment?: Pick<Appointment, "selectedServices" | "serviceType"> | null,
) {
  if (appointment?.selectedServices?.length) {
    return appointment.selectedServices;
  }

  if (appointment?.serviceType) {
    return [appointment.serviceType];
  }

  return [];
}

export function derivePrimaryServiceType(selectedServices: string[]) {
  if (selectedServices.includes("Custom")) {
    return "Custom";
  }

  if (selectedServices.length === 1) {
    return selectedServices[0];
  }

  if (selectedServices.length > 1) {
    return "Multiple Services";
  }

  return undefined;
}

export function formatAppointmentServices(appointment: Pick<
  Appointment,
  "selectedServices" | "serviceType" | "customServiceType"
>) {
  const selectedServices = getAppointmentSelectedServices(appointment);

  if (!selectedServices.length) {
    return appointment.serviceType ?? "Service";
  }

  return selectedServices
    .map((service) => {
      if (service === "Custom") {
        return appointment.customServiceType
          ? `Custom: ${appointment.customServiceType}`
          : "Custom";
      }

      return service;
    })
    .join(", ");
}
