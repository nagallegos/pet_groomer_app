import type { Appointment, PaymentStatus } from "../types/models";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export function getAppointmentQuotePrice(appointment: Appointment) {
  return appointment.quotePrice ?? 0;
}

export function getAppointmentActualPriceCharged(appointment: Appointment) {
  return appointment.actualPriceCharged;
}

export function getAppointmentPaymentStatus(appointment: Appointment): PaymentStatus {
  return appointment.paymentStatus ?? "unpaid";
}

export function getAppointmentRecognizedRevenue(appointment: Appointment) {
  return appointment.actualPriceCharged ?? getAppointmentQuotePrice(appointment);
}

export function formatAppointmentCurrency(value: number) {
  return currencyFormatter.format(value);
}
