import { useEffect, useMemo, useState } from "react";
import { Alert, Badge, Button, Card, Collapse, Form, ListGroup } from "react-bootstrap";
import { PencilSquare } from "react-bootstrap-icons";
import { useSearchParams } from "react-router-dom";
import AppointmentDetailsModal from "../components/appointments/AppointmentDetailsModal";
import { useAppData } from "../components/common/AppDataProvider";
import { ChevronDownIcon, SearchIcon } from "../components/common/AppIcons";
import PageLoader from "../components/common/PageLoader";
import useInitialLoading from "../hooks/useInitialLoading";
import { formatAppointmentServices } from "../lib/appointmentServices";
import type { Appointment } from "../types/models";

type HistoryStatusFilter = "all" | Appointment["status"];
type HistorySortField = "date" | "client" | "pet" | "cost";
type HistorySortDirection = "asc" | "desc";
type HistoryGroupMode = "month" | "status" | "client";

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
  const { appointments, owners, pets, setAppointments } = useAppData();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<HistoryStatusFilter>("all");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [sortField, setSortField] = useState<HistorySortField>("date");
  const [sortDirection, setSortDirection] = useState<HistorySortDirection>("desc");
  const [groupMode, setGroupMode] = useState<HistoryGroupMode>("month");
  const [page, setPage] = useState(1);
  const [selectedAppointment, setSelectedAppointment] =
    useState<Appointment | null>(null);
  const [showControls, setShowControls] = useState(false);

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

        const owner = owners.find((item) => item.id === appointment.ownerId);
        const pet = pets.find((item) => item.id === appointment.petId);
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
      .sort((a, b) => {
        const aOwner = owners.find((item) => item.id === a.ownerId);
        const bOwner = owners.find((item) => item.id === b.ownerId);
        const aPet = pets.find((item) => item.id === a.petId);
        const bPet = pets.find((item) => item.id === b.petId);
        const direction = sortDirection === "asc" ? 1 : -1;

        if (sortField === "date") {
          return (
            (new Date(a.start).getTime() - new Date(b.start).getTime()) * direction
          );
        }

        if (sortField === "cost") {
          return (a.cost - b.cost) * direction;
        }

        const aValue =
          sortField === "client"
            ? `${aOwner?.lastName ?? ""} ${aOwner?.firstName ?? ""}`.trim()
            : aPet?.name ?? "";
        const bValue =
          sortField === "client"
            ? `${bOwner?.lastName ?? ""} ${bOwner?.firstName ?? ""}`.trim()
            : bPet?.name ?? "";

        return (
          aValue.localeCompare(bValue, undefined, { sensitivity: "base" }) *
          direction
        );
      });
  }, [appointments, now, owners, pets, searchTerm, serviceFilter, sortDirection, sortField, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredAppointments.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedAppointments = filteredAppointments.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  const groupedAppointments = useMemo(() => {
    const groups = new Map<string, Appointment[]>();

    pagedAppointments.forEach((appointment) => {
      const owner = owners.find((item) => item.id === appointment.ownerId);
      const label =
        groupMode === "status"
          ? appointment.status
          : groupMode === "client"
            ? `${owner?.lastName ?? ""}${owner?.lastName ? ", " : ""}${owner?.firstName ?? ""}`.trim() ||
              "Unknown Client"
            : new Date(appointment.start).toLocaleString(undefined, {
                month: "long",
                year: "numeric",
              });

      const currentGroup = groups.get(label) ?? [];
      currentGroup.push(appointment);
      groups.set(label, currentGroup);
    });

    return Array.from(groups.entries()).map(([label, items]) => ({
      label,
      items,
    }));
  }, [groupMode, owners, pagedAppointments]);

  const searchParamAppointmentId = searchParams.get("appointmentId");
  const searchedAppointment = useMemo(
    () =>
      searchParamAppointmentId
        ? appointments.find(
            (appointment) =>
              appointment.id === searchParamAppointmentId &&
              !appointment.isArchived &&
              new Date(appointment.end) < now,
          ) ?? null
        : null,
    [appointments, now, searchParamAppointmentId],
  );
  const activeSelectedAppointment = selectedAppointment ?? searchedAppointment;

  useEffect(() => {
    if (!searchParamAppointmentId) {
      return;
    }

    setSearchParams((currentParams) => {
      const nextParams = new URLSearchParams(currentParams);
      nextParams.delete("appointmentId");
      return nextParams;
    });
  }, [searchParamAppointmentId, setSearchParams]);

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
        <Card.Body className="search-panel-card">
          <div className="search-panel-header">
            <Form
              className="search-panel-main"
              onSubmit={(event) => event.preventDefault()}
            >
              <Form.Group>
                <Form.Label>Search Appointment History</Form.Label>
                <div className="search-panel-input-row">
                  <Form.Control
                    type="search"
                    value={searchTerm}
                    onChange={(event) => {
                      setSearchTerm(event.target.value);
                      setPage(1);
                    }}
                    placeholder="Search by client, pet, service, status, or date"
                  />
                  <Button type="submit" variant="primary" aria-label="Search appointment history">
                    <SearchIcon className="search-panel-icon" />
                  </Button>
                </div>
              </Form.Group>
            </Form>
          </div>

          <Collapse in={showControls}>
            <div id="history-search-controls" className="search-panel-controls">
              <div className="search-panel-control-grid">
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

                <Form.Group className="client-sort-group">
                  <Form.Label>Sort Field</Form.Label>
                  <Form.Select
                    value={sortField}
                    onChange={(event) => setSortField(event.target.value as HistorySortField)}
                  >
                    <option value="date">Date</option>
                    <option value="client">Client</option>
                    <option value="pet">Pet</option>
                    <option value="cost">Cost</option>
                  </Form.Select>
                </Form.Group>

                <Form.Group className="client-sort-group">
                  <Form.Label>Sort Order</Form.Label>
                  <Form.Select
                    value={sortDirection}
                    onChange={(event) =>
                      setSortDirection(event.target.value as HistorySortDirection)
                    }
                  >
                    <option value="desc">Descending</option>
                    <option value="asc">Ascending</option>
                  </Form.Select>
                </Form.Group>

                <Form.Group className="client-sort-group">
                  <Form.Label>Group By</Form.Label>
                  <Form.Select
                    value={groupMode}
                    onChange={(event) => setGroupMode(event.target.value as HistoryGroupMode)}
                  >
                    <option value="month">Month</option>
                    <option value="status">Status</option>
                    <option value="client">Client</option>
                  </Form.Select>
                </Form.Group>
              </div>
            </div>
          </Collapse>

          <div className="search-panel-corner">
            <Button
              variant={showControls ? "primary" : "outline-secondary"}
              className="search-panel-toggle"
              onClick={() => setShowControls((current) => !current)}
              aria-expanded={showControls}
              aria-controls="history-search-controls"
              aria-label={showControls ? "Hide filters and sort" : "Show filters and sort"}
            >
              <ChevronDownIcon
                className={`search-panel-caret${showControls ? " search-panel-caret-open" : ""}`}
              />
            </Button>
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
                {filteredAppointments.length === 1 ? "" : "s"}, sorted by {sortField} and grouped by {groupMode}.
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
            <div className="directory-group-stack">
              {groupedAppointments.map((group) => (
                <section key={group.label} className="directory-group-section">
                  <div className="directory-group-heading">{group.label}</div>
                  <ListGroup variant="flush" className="appointment-list-group">
                    {group.items.map((appointment) => {
                const owner = owners.find((item) => item.id === appointment.ownerId);
                const pet = pets.find((item) => item.id === appointment.petId);

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
                          aria-label="Edit appointment"
                          onClick={(event) => {
                            event.stopPropagation();
                            setSelectedAppointment(appointment);
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
                </section>
              ))}
            </div>
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
        show={!!activeSelectedAppointment}
        onHide={() => setSelectedAppointment(null)}
        appointment={activeSelectedAppointment}
        owners={owners}
        pets={pets}
        allowPastEditing
        editingWarning="Only update historical appointments when correcting information that was inaccurate before the appointment was completed."
        onUpdated={(updatedAppointment) => {
          if (updatedAppointment.isArchived) {
            setAppointments((currentAppointments) =>
              currentAppointments.map(
                (appointment) =>
                  appointment.id === updatedAppointment.id
                    ? updatedAppointment
                    : appointment,
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
