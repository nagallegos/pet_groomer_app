import { useEffect, useMemo, useState } from "react";
import { Button, Card, Modal } from "react-bootstrap";
import { useSearchParams } from "react-router-dom";
import { useAppData } from "../components/common/AppDataProvider";
import PageLoader from "../components/common/PageLoader";
import { useAuth } from "../components/common/useAuth";
import useInitialLoading from "../hooks/useInitialLoading";
import { formatAppointmentServices } from "../lib/appointmentServices";
import type { Appointment } from "../types/models";

export default function ClientAppointmentsPage() {
  const isLoading = useInitialLoading();
  const { user } = useAuth();
  const { appointments, pets } = useAppData();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  const clientAppointments = useMemo(
    () =>
      appointments
        .filter((appointment) => appointment.ownerId === user?.ownerId && !appointment.isArchived)
        .sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime()),
    [appointments, user?.ownerId],
  );
  const searchParamAppointmentId = searchParams.get("appointmentId");
  const searchParamAppointment = useMemo(
    () =>
      searchParamAppointmentId
        ? clientAppointments.find((appointment) => appointment.id === searchParamAppointmentId) ?? null
        : null,
    [clientAppointments, searchParamAppointmentId],
  );
  const activeAppointment = selectedAppointment ?? searchParamAppointment;

  useEffect(() => {
    if (!searchParamAppointment) {
      return;
    }
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.delete("appointmentId");
      return next;
    });
  }, [searchParamAppointment, setSearchParams]);

  if (isLoading) {
    return <PageLoader label="Loading appointments..." />;
  }

  return (
    <>
      <div className="page-header d-flex flex-column gap-2 mb-4">
        <div>
          <p className="page-kicker mb-2">Client Portal</p>
          <h2 className="mb-1">My Appointments</h2>
          <p className="text-muted mb-0">
            Review upcoming visits, past services, and any notes that were shared with you.
          </p>
        </div>
      </div>

      <div className="d-grid gap-3">
        {clientAppointments.map((appointment) => {
          const pet = pets.find((item) => item.id === appointment.petId);
          const visibleNotes = appointment.notes.filter(
            (note) => !note.isArchived && note.visibility === "client",
          );
          return (
            <Card
              key={appointment.id}
              className="shadow-sm"
              role="button"
              onClick={() => setSelectedAppointment(appointment)}
            >
              <Card.Body className="d-grid gap-3">
                <div className="client-summary-row">
                  <div>
                    <div className="fw-semibold">{pet?.name ?? "Pet"}</div>
                    <div className="text-muted small">
                      {new Date(appointment.start).toLocaleString()} • {appointment.status}
                    </div>
                  </div>
                  <div className="text-muted small">${appointment.cost.toFixed(0)}</div>
                </div>
                <div className="text-muted small">
                  Service: {appointment.serviceType || "Grooming Appointment"}
                </div>
                <div className="d-grid gap-2">
                  {visibleNotes.map((note) => (
                    <div key={note.id} className="client-note-preview">
                      <div className="text-muted small mb-1">
                        {new Date(note.createdAt).toLocaleDateString()}
                      </div>
                      <div>{note.text}</div>
                    </div>
                  ))}
                  {visibleNotes.length === 0 && (
                    <div className="text-muted small">
                      No notes were shared for this visit.
                    </div>
                  )}
                </div>
              </Card.Body>
            </Card>
          );
        })}
        {clientAppointments.length === 0 && (
          <Card className="shadow-sm">
            <Card.Body className="text-muted small">No appointments found.</Card.Body>
          </Card>
        )}
      </div>

      <Modal
        show={!!activeAppointment}
        onHide={() => setSelectedAppointment(null)}
        centered
        fullscreen="sm-down"
      >
        <Modal.Header closeButton>
          <Modal.Title>Appointment Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {activeAppointment && (
            <div className="d-grid gap-3">
              <div>
                <div className="text-muted small">Pet</div>
                <div className="fw-semibold">
                  {pets.find((item) => item.id === activeAppointment.petId)?.name ?? "Pet"}
                </div>
              </div>
              <div>
                <div className="text-muted small">When</div>
                <div>{new Date(activeAppointment.start).toLocaleString()}</div>
              </div>
              <div>
                <div className="text-muted small">Services</div>
                <div>{formatAppointmentServices(activeAppointment)}</div>
              </div>
              <div>
                <div className="text-muted small">Status</div>
                <div>{activeAppointment.status}</div>
              </div>
              <div>
                <div className="text-muted small">Cost</div>
                <div>${activeAppointment.cost.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-muted small mb-2">Notes</div>
                <div className="d-grid gap-2">
                  {activeAppointment.notes
                    .filter((note) => !note.isArchived && note.visibility === "client")
                    .map((note) => (
                      <div key={note.id} className="client-note-preview">
                        <div className="text-muted small mb-1">
                          {new Date(note.createdAt).toLocaleDateString()}
                        </div>
                        <div>{note.text}</div>
                      </div>
                    ))}
                  {activeAppointment.notes.filter((note) => !note.isArchived && note.visibility === "client").length === 0 && (
                    <div className="text-muted small">No notes were shared for this appointment.</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setSelectedAppointment(null)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
