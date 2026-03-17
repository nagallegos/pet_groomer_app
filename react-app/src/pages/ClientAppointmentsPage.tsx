import { useEffect, useMemo, useState } from "react";
import { Button, Card, Col, Form, Modal, Row } from "react-bootstrap";
import { Link, useSearchParams } from "react-router-dom";
import { SearchIcon } from "../components/common/AppIcons";
import { useAppData } from "../components/common/AppDataProvider";
import PageLoader from "../components/common/PageLoader";
import { useAuth } from "../components/common/useAuth";
import useInitialLoading from "../hooks/useInitialLoading";
import { getClientAppointmentPaidSummary } from "../lib/appointmentPricing";
import { formatAppointmentServices } from "../lib/appointmentServices";
import { getNotePostedByLabel } from "../lib/noteUtils";
import type { Appointment } from "../types/models";

type ClientAppointmentStatusFilter = "all" | Appointment["status"];

function matchesAppointmentSearch(appointment: Appointment, petName: string, searchTerm: string) {
  const normalizedSearchTerm = searchTerm.trim().toLowerCase();
  if (!normalizedSearchTerm) {
    return true;
  }

  const haystack = [
    petName,
    formatAppointmentServices(appointment),
    appointment.serviceType ?? "",
    appointment.status,
    new Date(appointment.start).toLocaleDateString(),
    new Date(appointment.start).toLocaleString(),
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(normalizedSearchTerm);
}

function AppointmentSection({
  title,
  description,
  emptyMessage,
  appointments,
  pets,
  onOpen,
}: {
  title: string;
  description: string;
  emptyMessage: string;
  appointments: Appointment[];
  pets: ReturnType<typeof useAppData>["pets"];
  onOpen: (appointment: Appointment) => void;
}) {
  return (
    <section className="d-grid gap-3">
      <div>
        <h3 className="h5 mb-1">{title}</h3>
        <p className="text-muted mb-0 small">{description}</p>
      </div>

      {appointments.length === 0 ? (
        <Card className="shadow-sm">
          <Card.Body className="text-muted small">{emptyMessage}</Card.Body>
        </Card>
      ) : (
        appointments.map((appointment) => {
          const pet = pets.find((item) => item.id === appointment.petId);
          const visibleNotes = appointment.notes.filter(
            (note) => !note.isArchived && note.visibility === "client",
          );
          const paidSummary = getClientAppointmentPaidSummary(appointment);

          return (
            <Card
              key={appointment.id}
              className="shadow-sm"
              role="button"
              onClick={() => onOpen(appointment)}
            >
              <Card.Body className="d-grid gap-3">
                <div className="client-summary-row">
                  <div>
                    <div className="fw-semibold">{pet?.name ?? "Pet"}</div>
                    <div className="text-muted small">
                      {new Date(appointment.start).toLocaleString()} | {appointment.status}
                    </div>
                  </div>
                </div>
                <div className="text-muted small">
                  Service: {appointment.serviceType || "Grooming Appointment"}
                </div>
                {paidSummary && <div className="text-success small fw-semibold">{paidSummary}</div>}
                <div className="d-grid gap-2">
                  {visibleNotes.map((note) => (
                    <div key={note.id} className="client-note-preview">
                      <div className="text-muted small mb-1">
                        {getNotePostedByLabel(note) && <div>{getNotePostedByLabel(note)}</div>}
                        {new Date(note.createdAt).toLocaleDateString()}
                      </div>
                      <div>{note.text}</div>
                    </div>
                  ))}
                  {visibleNotes.length === 0 && (
                    <div className="text-muted small">No notes were shared for this visit.</div>
                  )}
                </div>
              </Card.Body>
            </Card>
          );
        })
      )}
    </section>
  );
}

export default function ClientAppointmentsPage() {
  const isLoading = useInitialLoading();
  const { user } = useAuth();
  const { appointments, pets } = useAppData();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<ClientAppointmentStatusFilter>("all");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [now] = useState(() => Date.now());

  const clientAppointments = useMemo(
    () =>
      appointments
        .filter((appointment) => appointment.ownerId === user?.ownerId && !appointment.isArchived)
        .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()),
    [appointments, user?.ownerId],
  );
  const serviceOptions = useMemo(() => {
    const services = new Set<string>();

    clientAppointments.forEach((appointment) => {
      formatAppointmentServices(appointment)
        .split(", ")
        .filter(Boolean)
        .forEach((service) => services.add(service));
    });

    return ["all", ...Array.from(services).sort((a, b) => a.localeCompare(b))];
  }, [clientAppointments]);

  const filteredAppointments = useMemo(
    () =>
      clientAppointments.filter((appointment) => {
        const petName = pets.find((item) => item.id === appointment.petId)?.name ?? "";

        if (statusFilter !== "all" && appointment.status !== statusFilter) {
          return false;
        }

        if (
          serviceFilter !== "all" &&
          !formatAppointmentServices(appointment).toLowerCase().includes(serviceFilter.toLowerCase())
        ) {
          return false;
        }

        return matchesAppointmentSearch(appointment, petName, searchTerm);
      }),
    [clientAppointments, pets, searchTerm, serviceFilter, statusFilter],
  );

  const upcomingAppointments = filteredAppointments.filter(
    (appointment) => new Date(appointment.end).getTime() >= now,
  );
  const pastAppointments = filteredAppointments.filter(
    (appointment) => new Date(appointment.end).getTime() < now,
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
  const activeAppointmentPaidSummary = activeAppointment
    ? getClientAppointmentPaidSummary(activeAppointment)
    : null;

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
      <div className="page-header d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3 mb-4">
        <div>
          <p className="page-kicker mb-2">Client Portal</p>
          <h2 className="mb-1">My Appointments</h2>
          <p className="text-muted mb-0">
            Review upcoming visits, past services, and any notes that were shared with you.
          </p>
        </div>
        <Link className="btn btn-primary" to="/requests?type=appointment">
          Request Appointment
        </Link>
      </div>

      <Card className="shadow-sm mb-4">
        <Card.Body>
          <Row className="g-3 align-items-end">
            <Col xs={12} lg={6}>
              <Form.Group className="search-panel-main">
                <Form.Label>Search Appointments</Form.Label>
                <div className="search-input-wrapper">
                  <SearchIcon />
                  <Form.Control
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Search by pet, service, status, or date"
                    aria-label="Search appointments"
                  />
                </div>
              </Form.Group>
            </Col>
            <Col xs={12} md={6} lg={3}>
              <Form.Group className="client-sort-group">
                <Form.Label>Status</Form.Label>
                <Form.Select
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(event.target.value as ClientAppointmentStatusFilter)
                  }
                >
                  <option value="all">All statuses</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="no-show">No Show</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col xs={12} md={6} lg={3}>
              <Form.Group className="client-sort-group">
                <Form.Label>Service</Form.Label>
                <Form.Select
                  value={serviceFilter}
                  onChange={(event) => setServiceFilter(event.target.value)}
                >
                  <option value="all">All services</option>
                  {serviceOptions
                    .filter((option) => option !== "all")
                    .map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      <div className="d-grid gap-4">
        <AppointmentSection
          title="Upcoming Appointments"
          description="Your next scheduled or confirmed visits appear here first."
          emptyMessage="No upcoming appointments match the current filters."
          appointments={upcomingAppointments}
          pets={pets}
          onOpen={setSelectedAppointment}
        />
        <AppointmentSection
          title="Past Appointments"
          description="Completed and previous visits stay here for easy reference."
          emptyMessage="No past appointments match the current filters."
          appointments={pastAppointments}
          pets={pets}
          onOpen={setSelectedAppointment}
        />
      </div>

      {clientAppointments.length === 0 && (
        <Card className="shadow-sm mt-4">
          <Card.Body className="text-muted small">No appointments found.</Card.Body>
        </Card>
      )}

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
              {activeAppointmentPaidSummary && (
                <div className="rounded-3 border border-success-subtle bg-success-subtle text-success-emphasis p-3">
                  <div className="text-muted small">Payment</div>
                  <div className="fw-semibold">{activeAppointmentPaidSummary}</div>
                </div>
              )}
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
                <div className="text-muted small mb-2">Notes</div>
                <div className="d-grid gap-2">
                  {activeAppointment.notes
                    .filter((note) => !note.isArchived && note.visibility === "client")
                    .map((note) => (
                      <div key={note.id} className="client-note-preview">
                        <div className="text-muted small mb-1">
                          {getNotePostedByLabel(note) && <div>{getNotePostedByLabel(note)}</div>}
                          {new Date(note.createdAt).toLocaleDateString()}
                        </div>
                        <div>{note.text}</div>
                      </div>
                    ))}
                  {activeAppointment.notes.filter(
                    (note) => !note.isArchived && note.visibility === "client",
                  ).length === 0 && (
                    <div className="text-muted small">
                      No notes were shared for this appointment.
                    </div>
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
