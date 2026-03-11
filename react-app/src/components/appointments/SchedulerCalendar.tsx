import { Badge, Card } from "react-bootstrap";
import type { Appointment, Owner, Pet } from "../../types/models";
import {
  addDays,
  formatShortDate,
  getHourLabel,
  isSameDay,
} from "../../utils/date";

interface SchedulerCalendarProps {
  weekStart: Date;
  appointments: Appointment[];
  owners: Owner[];
  pets: Pet[];
  onSlotClick: (date: Date, hour: number) => void;
  onAppointmentClick: (appointment: Appointment) => void;
}

const HOURS = Array.from({ length: 10 }, (_, index) => index + 8); // 8 AM - 5 PM

export default function SchedulerCalendar({
  weekStart,
  appointments,
  owners,
  pets,
  onSlotClick,
  onAppointmentClick,
}: SchedulerCalendarProps) {
  const weekDays = Array.from({ length: 7 }, (_, index) =>
    addDays(weekStart, index),
  );

  return (
    <Card className="shadow-sm">
      <Card.Body>
        <Card.Title className="mb-3">Weekly Calendar</Card.Title>

        <div className="schedule-grid">
          <div className="schedule-grid-header schedule-grid-time-cell" />

          {weekDays.map((day) => (
            <div key={day.toISOString()} className="schedule-grid-header">
              <div className="fw-semibold">
                {day.toLocaleDateString([], { weekday: "short" })}
              </div>
              <div className="text-muted small">{formatShortDate(day)}</div>
            </div>
          ))}

          {HOURS.map((hour) => (
            <div key={hour} className="schedule-grid-row">
              <div className="schedule-grid-time-cell">
                <span className="small text-muted">{getHourLabel(hour)}</span>
              </div>

              {weekDays.map((day) => {
                const cellAppointments = appointments.filter((appt) => {
                  const apptDate = new Date(appt.start);
                  return (
                    isSameDay(apptDate, day) && apptDate.getHours() === hour
                  );
                });

                return (
                  <div
                    key={`${day.toISOString()}-${hour}`}
                    className="schedule-grid-cell"
                  >
                    {cellAppointments.length > 0 ? (
                      cellAppointments.map((appt) => {
                        const owner = owners.find((o) => o.id === appt.ownerId);
                        const pet = pets.find((p) => p.id === appt.petId);

                        return (
                          <button
                            key={appt.id}
                            type="button"
                            className="appointment-chip btn btn-sm btn-primary"
                            onClick={() => onAppointmentClick(appt)}
                          >
                            <div className="fw-semibold">
                              {pet?.name ?? "Pet"}
                            </div>
                            <div className="small">
                              {owner?.firstName} {owner?.lastName}
                            </div>
                            <Badge bg="light" text="dark" className="mt-1">
                              {appt.status}
                            </Badge>
                          </button>
                        );
                      })
                    ) : (
                      <div
                        onClick={() => onSlotClick(day, hour)}
                        role="button"
                        className="empty-slot"
                        aria-label={`Schedule appointment on ${formatShortDate(day)} at ${getHourLabel(hour)}`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </Card.Body>
    </Card>
  );
}
