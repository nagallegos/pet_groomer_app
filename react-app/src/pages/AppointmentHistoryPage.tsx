import { useEffect, useMemo, useState } from "react";
import { Alert, Badge, Button, Card, Form, ListGroup } from "react-bootstrap";
import { useSearchParams } from "react-router-dom";
import AppointmentDetailsModal from "../components/appointments/AppointmentDetailsModal";
import PageLoader from "../components/common/PageLoader";
import { mockAppointments, mockOwners, mockPets } from "../data/mockData";
import useInitialLoading from "../hooks/useInitialLoading";
import { formatAppointmentServices } from "../lib/appointmentServices";
import type { Appointment } from "../types/models";

type HistoryStatusFilter = "all" | Appointment["status"];

const PAGE_SIZE = 12;

function getStatusVariant(status: Appointment["status"]) {
  switch (status) {
    case "confirmed":
      return "success";
    case "completed":
      return "secondary";
    case "cancelled":
      return "danger";
    case "no-show":
      return "warning";
    case "scheduled":
    default:
      return "primary";
  }
}

export default function AppointmentHistoryPage() {
  const isLoading = useInitialLoading();
  const [searchParams, setSearchParams] = useSearchParams();
  const [appointments, setAppointments] = useState<Appointment[]>(mockAppointments);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<HistoryStatusFilter>("all");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [selectedAppointment, setSelectedAppointment] =
    useState<Appointment | null>(null);

  const now = useMemo(() => new Date(), []);

  const serviceOptions = useMemo(() => {
    const services = new Set<string>();
    appointments.forEach((appointment) => {
      formatAppointmentServices(appointment)
        .split(", ")
        .filter(Boolean)
        .forEach((service) => services.add(service));
    });
    return ["all", ...Array.from(services).sort((a, b) => a.localeCompare(b))];
  }, [appointments]);

  const filteredAppointments = useMemo(() => {
    const normalizedSearchTerm = searchTerm.trim().toLowerCase();

    return appointments
      .filter((appointment) => !appointment.isArchived)
      .filter((appointment) => new Date(appointment.end) < now)
      .filter((appointment) =>
        statusFilter === "all" ? true : appointment.status === statusFilter,
      )
      .filter((appointment) => {
        if (serviceFilter === "all") {
          return true;
        }

        return formatAppointmentServices(appointment)
          .toLowerCase()
          .includes(serviceFilter.toLowerCase());
      })
      .filter((appointment) => {
        if (!normalizedSearchTerm) {
          return true;
        }

        const owner = mockOwners.find((item) => item.id === appointment.ownerId);
        const pet = mockPets.find((item) => item.id === appointment.petId);
        const haystack = [
          pet?.name ?? "",
          owner ? `${owner.firstName} ${owner.lastName}` : "",
          owner?.firstName ?? "",
          owner?.lastName ?? "",
          formatAppointmentServices(appointment),
          appointment.status,
          new Date(appointment.start).toLocaleDateString(),
        ]
          .join(" ")
          .toLowerCase();

        return haystack.includes(normalizedSearchTerm);
      })
      .sort((a, b) => new Date(b.start).getTime() - new Date(a.start).getTime());
  }, [appointments, now, searchTerm, serviceFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredAppointments.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedAppointments = filteredAppointments.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  useEffect(() => {
    const appointmentId = searchParams.get("appointmentId");

    if (!appointmentId) {
      return;
    }

    const matchingAppointment =
      appointments.find(
        (appointment) =>
          appointment.id === appointmentId &&
          !appointment.isArchived &&
          new Date(appointment.end) < now,
      ) ?? null;

    if (matchingAppointment) {
      setSelectedAppointment(matchingAppointment);
    }

    setSearchParams((currentParams) => {
      const nextParams = new URLSearchParams(currentParams);
      nextParams.delete("appointmentId");
      return nextParams;
    });
  }, [appointments, now, searchParams, setSearchParams]);

  if (isLoading) {
    return <PageLoader label="Loading appointment history..." />;
  }

  return (
    <>
      <div className="page-header d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3 mb-4">
        <div>
          <p className="page-kicker mb-2">Appointments</p>
          <h2 className="mb-1">Appointment History</h2>
          <p className="text-muted mb-0">
            Review past appointments and correct records when information was entered incorrectly before completion.
          </p>
        </div>
      </div>

      <Alert variant="warning" className="mb-4">
        Historical appointments should only be edited to correct information that was not accurate before the appointment was completed.
      </Alert>

      <Card className="shadow-sm mb-4">
        <Card.Body>
          <div className="d-flex flex-column flex-lg-row gap-3 align-items-stretch align-items-lg-end">
            <Form.Group className="flex-grow-1">
              <Form.Label>Search Appointment History</Form.Label>
              <Form.Control
                type="search"
                value={searchTerm}
                onChange={(event) => {
                  setSearchTerm(event.target.value);
                  setPage(1);
                }}
                placeholder="Search by client, pet, service, status, or date"
              />
            </Form.Group>

            <Form.Group className="client-sort-group">
              <Form.Label>Status</Form.Label>
              <Form.Select
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(event.target.value as HistoryStatusFilter);
                  setPage(1);
                }}
              >
                <option value="all">All Statuses</option>
                <option value="completed">Completed</option>
                <option value="confirmed">Confirmed</option>
                <option value="scheduled">Scheduled</option>
                <option value="cancelled">Cancelled</option>
                <option value="no-show">No Show</option>
              </Form.Select>
            </Form.Group>

            <Form.Group className="client-sort-group">
              <Form.Label>Service</Form.Label>
              <Form.Select
                value={serviceFilter}
                onChange={(event) => {
                  setServiceFilter(event.target.value);
                  setPage(1);
                }}
              >
                {serviceOptions.map((service) => (
                  <option key={service} value={service}>
                    {service === "all" ? "All Services" : service}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
          </div>
        </Card.Body>
      </Card>

      <Card className="shadow-sm">
        <Card.Body>
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-2 mb-3">
            <div>
              <Card.Title className="mb-1">Past Appointments</Card.Title>
              <p className="text-muted small mb-0">
                Showing {filteredAppointments.length} historical appointment
                {filteredAppointments.length === 1 ? "" : "s"}.
              </p>
            </div>
            <div className="text-muted small">
              Page {safePage} of {totalPages}
            </div>
          </div>

          {pagedAppointments.length === 0 ? (
            <p className="text-muted mb-0">
              No past appointments match the current search and filters.
            </p>
          ) : (
            <ListGroup variant="flush" className="appointment-list-group">
              {pagedAppointments.map((appointment) => {
                const owner = mockOwners.find((item) => item.id === appointment.ownerId);
                const pet = mockPets.find((item) => item.id === appointment.petId);

                return (
                  <ListGroup.Item
                    key={appointment.id}
                    action
                    className="appointment-history-item"
                    onClick={() => setSelectedAppointment(appointment)}
                  >
                    <div className="appointment-list-row">
                      <div className="appointment-list-main">
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
                            to{" "}
                            {new Date(appointment.end).toLocaleTimeString([], {
                              hour: "numeric",
                              minute: "2-digit",
                            })}{" "}
                            • {formatAppointmentServices(appointment)}
                          </div>
                        </div>
                      </div>

                      <div className="appointment-list-actions appointment-history-actions">
                        <Badge bg={getStatusVariant(appointment.status)}>
                          {appointment.status}
                        </Badge>
                        <div className="appointment-list-cost">
                          ${appointment.cost.toFixed(2)}
                        </div>
                        <Button
                          size="sm"
                          variant="outline-primary"
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelectedAppointment(appointment);
                          }}
                        >
                          Edit
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

      <AppointmentDetailsModal
        show={!!selectedAppointment}
        onHide={() => setSelectedAppointment(null)}
        appointment={selectedAppointment}
        owners={mockOwners}
        pets={mockPets}
        allowPastEditing
        editingWarning="Only update historical appointments when correcting information that was inaccurate before the appointment was completed."
        onUpdated={(updatedAppointment) => {
          if (updatedAppointment.isArchived) {
            setAppointments((currentAppointments) =>
              currentAppointments.filter(
                (appointment) => appointment.id !== updatedAppointment.id,
              ),
            );
            setSelectedAppointment(null);
            return;
          }

          setAppointments((currentAppointments) =>
            currentAppointments.map((appointment) =>
              appointment.id === updatedAppointment.id
                ? updatedAppointment
                : appointment,
            ),
          );
          setSelectedAppointment(updatedAppointment);
        }}
        onDeleted={(appointmentId) => {
          setAppointments((currentAppointments) =>
            currentAppointments.filter(
              (appointment) => appointment.id !== appointmentId,
            ),
          );
          setSelectedAppointment(null);
        }}
      />
    </>
  );
}
