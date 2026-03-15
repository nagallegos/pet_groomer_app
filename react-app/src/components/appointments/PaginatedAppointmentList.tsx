import { useMemo, useState } from "react";
import { Button, Card, ListGroup } from "react-bootstrap";
import { PencilSquare } from "react-bootstrap-icons";
import { Link } from "react-router-dom";
import { formatAppointmentServices } from "../../lib/appointmentServices";
import type { Appointment, Owner, Pet } from "../../types/models";

interface PaginatedAppointmentListProps {
  appointments: Appointment[];
  owners: Owner[];
  pets: Pet[];
  onAppointmentClick: (appointment: Appointment) => void;
  pageSize?: number;
}

function getStatusDotClass(status: Appointment["status"]) {
  switch (status) {
    case "confirmed":
      return "appointment-status-dot-confirmed";
    case "completed":
      return "appointment-status-dot-completed";
    case "cancelled":
      return "appointment-status-dot-cancelled";
    case "no-show":
      return "appointment-status-dot-no-show";
    case "scheduled":
    default:
      return "appointment-status-dot-scheduled";
  }
}

function isSameDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

export default function PaginatedAppointmentList({
  appointments,
  owners,
  pets,
  onAppointmentClick,
  pageSize = 8,
}: PaginatedAppointmentListProps) {
  const [page, setPage] = useState(1);
  const now = new Date();
  const startOfToday = useMemo(() => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }, []);

  const sortedAppointments = useMemo(
    () =>
      [...appointments]
        .filter((appointment) => !appointment.isArchived)
        .filter((appointment) => new Date(appointment.start) >= startOfToday)
        .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()),
    [appointments, startOfToday],
  );

  const totalPages = Math.max(1, Math.ceil(sortedAppointments.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageStartIndex = (safePage - 1) * pageSize;
  const pageAppointments = sortedAppointments.slice(
    pageStartIndex,
    safePage * pageSize,
  );
  const visibleRangeStart = sortedAppointments.length === 0 ? 0 : pageStartIndex + 1;
  const visibleRangeEnd = pageStartIndex + pageAppointments.length;

  return (
    <Card className="shadow-sm">
      <Card.Body>
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-2 mb-3">
          <div>
            <Card.Title className="mb-1">Appointment List</Card.Title>
            <p className="text-muted small mb-0">
              Showing today&apos;s appointments and all upcoming bookings.
            </p>
          </div>
          <Link to="/appointments/history" className="btn btn-outline-primary btn-sm">
            Appointment History
          </Link>
        </div>

        {pageAppointments.length === 0 ? (
          <p className="text-muted mb-0">No appointments remaining for today or upcoming days.</p>
        ) : (
          <ListGroup variant="flush" className="appointment-list-group">
            {pageAppointments.map((appointment) => {
              const owner = owners.find((item) => item.id === appointment.ownerId);
              const pet = pets.find((item) => item.id === appointment.petId);
              const appointmentDate = new Date(appointment.start);
              const isPastToday =
                appointmentDate < now && isSameDay(appointmentDate, now);

              return (
                <ListGroup.Item
                  key={appointment.id}
                  action
                  className={`appointment-list-item${isPastToday ? " appointment-list-item-past" : ""}`}
                  onClick={() => onAppointmentClick(appointment)}
                >
                  <div className="appointment-list-row">
                    <div className="appointment-list-main">
                      <span
                        className={`appointment-status-dot ${getStatusDotClass(
                          appointment.status,
                        )}`}
                        aria-hidden="true"
                      />
                      <div className="appointment-list-copy">
                        <div className="appointment-list-title">
                          {pet?.name ?? "Pet"} • {owner?.firstName ?? ""}{" "}
                          {owner?.lastName ?? ""}
                        </div>
                        <div className="appointment-list-meta">
                          {appointmentDate.toLocaleDateString()} •{" "}
                          {appointmentDate.toLocaleTimeString([], {
                            hour: "numeric",
                            minute: "2-digit",
                          })}{" "}
                          • {formatAppointmentServices(appointment)} •{" "}
                          {appointment.status}
                        </div>
                      </div>
                    </div>

                    <div className="appointment-list-actions">
                      <div className="appointment-list-cost">
                        ${appointment.cost.toFixed(2)}
                      </div>
                      <Button
                        size="sm"
                        variant="outline-primary"
                        aria-label="Edit appointment"
                        onClick={(event) => {
                          event.stopPropagation();
                          onAppointmentClick(appointment);
                        }}
                      >
                        <PencilSquare aria-hidden="true" />
                      </Button>
                    </div>
                  </div>
                </ListGroup.Item>
              );
            })}
          </ListGroup>
        )}

        <div className="d-flex justify-content-between align-items-center gap-2 mt-3">
          <div className="text-muted small">
            {visibleRangeStart}-{visibleRangeEnd} of {sortedAppointments.length}
          </div>
          <div className="appointment-list-pagination">
            <Button
              variant="outline-secondary"
              className="appointment-list-page-btn"
              disabled={safePage === 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              aria-label="Previous appointments"
            >
              <span aria-hidden="true">‹</span>
            </Button>
            <Button
              variant="outline-secondary"
              className="appointment-list-page-btn"
              disabled={safePage === totalPages}
              onClick={() =>
                setPage((current) => Math.min(totalPages, current + 1))
              }
              aria-label="Next appointments"
            >
              <span aria-hidden="true">›</span>
            </Button>
          </div>
        </div>
      </Card.Body>
    </Card>
  );
}
