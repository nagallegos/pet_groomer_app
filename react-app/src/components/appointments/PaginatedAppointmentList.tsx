import { useMemo, useState } from "react";
import { Button, Card, ListGroup } from "react-bootstrap";
import { formatAppointmentServices } from "../../lib/appointmentServices";
import type { Appointment, Owner, Pet } from "../../types/models";

interface PaginatedAppointmentListProps {
  appointments: Appointment[];
  owners: Owner[];
  pets: Pet[];
  onAppointmentClick: (appointment: Appointment) => void;
  onArchiveAppointment: (appointment: Appointment) => void;
  onDeleteAppointment: (appointment: Appointment) => void;
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

export default function PaginatedAppointmentList({
  appointments,
  owners,
  pets,
  onAppointmentClick,
  onArchiveAppointment,
  onDeleteAppointment,
  pageSize = 8,
}: PaginatedAppointmentListProps) {
  const [page, setPage] = useState(1);

  const sortedAppointments = useMemo(
    () =>
      [...appointments].sort(
        (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime(),
      ),
    [appointments],
  );

  const totalPages = Math.max(1, Math.ceil(sortedAppointments.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageAppointments = sortedAppointments.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize,
  );

  return (
    <Card className="shadow-sm">
      <Card.Body>
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-2 mb-3">
          <div>
            <Card.Title className="mb-1">Appointment List</Card.Title>
            <p className="text-muted small mb-0">
              Tap any appointment row to open full details and editing tools.
            </p>
          </div>
          <div className="text-muted small">
            Page {safePage} of {totalPages}
          </div>
        </div>

        {pageAppointments.length === 0 ? (
          <p className="text-muted mb-0">No appointments available.</p>
        ) : (
          <ListGroup variant="flush" className="appointment-list-group">
            {pageAppointments.map((appointment) => {
              const owner = owners.find((item) => item.id === appointment.ownerId);
              const pet = pets.find((item) => item.id === appointment.petId);

              return (
                <ListGroup.Item
                  key={appointment.id}
                  action
                  className="appointment-list-item"
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
                          {new Date(appointment.start).toLocaleDateString()} •{" "}
                          {new Date(appointment.start).toLocaleTimeString([], {
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
                        variant="warning"
                        className="action-button-wide"
                        onClick={(event) => {
                          event.stopPropagation();
                          onArchiveAppointment(appointment);
                        }}
                      >
                        Archive
                      </Button>
                      <Button
                        size="sm"
                        variant="outline-danger"
                        className="icon-action-button"
                        onClick={(event) => {
                          event.stopPropagation();
                          onDeleteAppointment(appointment);
                        }}
                        aria-label="Delete appointment"
                        title="Delete appointment"
                      >
                        <svg aria-hidden="true" viewBox="0 0 16 16" fill="currentColor" width="16" height="16">
                          <path d="M6.5 1h3l.5 1H13a.5.5 0 0 1 0 1h-.6l-.7 9.1A2 2 0 0 1 9.7 14H6.3a2 2 0 0 1-2-1.9L3.6 3H3a.5.5 0 0 1 0-1h3zm-1.2 2 .7 9.1a1 1 0 0 0 1 .9h3.4a1 1 0 0 0 1-.9L10.7 3zM6 5a.5.5 0 0 1 .5.5v5a.5.5 0 0 1-1 0v-5A.5.5 0 0 1 6 5m4.5.5v5a.5.5 0 0 1-1 0v-5a.5.5 0 0 1 1 0M8 5a.5.5 0 0 1 .5.5v5a.5.5 0 0 1-1 0v-5A.5.5 0 0 1 8 5" />
                        </svg>
                      </Button>
                    </div>
                  </div>
                </ListGroup.Item>
              );
            })}
          </ListGroup>
        )}

        <div className="d-flex justify-content-between align-items-center gap-2 mt-3">
          <Button
            variant="outline-secondary"
            disabled={safePage === 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
          >
            Previous
          </Button>
          <Button
            variant="outline-secondary"
            disabled={safePage === totalPages}
            onClick={() =>
              setPage((current) => Math.min(totalPages, current + 1))
            }
          >
            Next
          </Button>
        </div>
      </Card.Body>
    </Card>
  );
}
