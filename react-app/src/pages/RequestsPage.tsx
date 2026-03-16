import { useEffect, useMemo, useState } from "react";
import { Alert, Badge, Button, Card, Col, Form, Modal, Row } from "react-bootstrap";
import { PencilSquare } from "react-bootstrap-icons";
import { useSearchParams } from "react-router-dom";
import { useAppData } from "../components/common/AppDataProvider";
import { useAppToast } from "../components/common/AppToastProvider";
import PageLoader from "../components/common/PageLoader";
import { useAuth } from "../components/common/useAuth";
import useInitialLoading from "../hooks/useInitialLoading";
import { saveClientRequest, type ClientRequestUpsertInput } from "../lib/crmApi";
import { toDateInputValue } from "../lib/petAge";
import type {
  Appointment,
  AppointmentChangeType,
  ClientRequest,
  ClientRequestEvent,
  ClientRequestType,
  PendingPetProfile,
  ProfileRequestAttribute,
  Species,
} from "../types/models";

const NEW_PET_SENTINEL = "__new_pet__";

const requestTypeLabels: Record<ClientRequestType, string> = {
  appointment: "Appointment Request",
  appointment_change: "Cancel/Reschedule Request",
  new_pet: "New Pet Request",
  profile_update: "Profile Update",
  general: "General Request",
};

const appointmentChangeLabels: Record<AppointmentChangeType, string> = {
  cancel: "Cancel",
  reschedule: "Reschedule",
};

const profileAttributeLabels: Record<ProfileRequestAttribute, string> = {
  name: "Name",
  contact_info: "Contact Info",
  pet: "Pet",
};

const speciesLabels: Record<Species, string> = {
  dog: "Dog",
  cat: "Cat",
};

const emptyPendingPet = (): PendingPetProfile => ({
  name: "",
  species: "dog",
  breed: "",
  weightLbs: undefined,
  birthDate: undefined,
  isBirthDateEstimated: false,
});

function formatPendingPetSummary(pet: PendingPetProfile) {
  const parts = [pet.name || "Pending pet", speciesLabels[pet.species], pet.breed].filter(Boolean);
  return parts.join(" | ");
}

function formatRequestStatus(status: ClientRequest["status"]) {
  return status.replace(/_/g, " ");
}

function isRequestClosed(status: ClientRequest["status"]) {
  return status === "resolved" || status === "closed";
}

function getRequestTypeIcon(type: ClientRequestType) {
  switch (type) {
    case "appointment":
      return "A";
    case "appointment_change":
      return "C";
    case "new_pet":
      return "P";
    case "profile_update":
      return "U";
    case "general":
    default:
      return "G";
  }
}

function buildRequestTimeline(request: ClientRequest): ClientRequestEvent[] {
  return [...(request.events ?? [])].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}

export default function RequestsPage() {
  const isLoading = useInitialLoading();
  const { user } = useAuth();
  const { showToast } = useAppToast();
  const { owners, pets, appointments, requests, setRequests } = useAppData();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showModal, setShowModal] = useState(false);
  const [editingRequest, setEditingRequest] = useState<ClientRequest | null>(null);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [requestType, setRequestType] = useState<ClientRequestType>("appointment");
  const [subject, setSubject] = useState("");
  const [clientNote, setClientNote] = useState("");
  const [resolutionNote, setResolutionNote] = useState("");
  const [internalNote, setInternalNote] = useState("");
  const [status, setStatus] = useState<ClientRequest["status"]>("open");
  const [petId, setPetId] = useState("");
  const [selectedPetIds, setSelectedPetIds] = useState<string[]>([]);
  const [appointmentId, setAppointmentId] = useState("");
  const [appointmentChangeType, setAppointmentChangeType] = useState<AppointmentChangeType>("cancel");
  const [selectedOwnerId, setSelectedOwnerId] = useState("");
  const [profileAttribute, setProfileAttribute] = useState<ProfileRequestAttribute>("contact_info");
  const [pendingPet, setPendingPet] = useState<PendingPetProfile>(emptyPendingPet());

  const isClient = user?.role === "client";
  const ownerId = user?.ownerId ?? "";
  const activeOwnerId = isClient ? ownerId : selectedOwnerId;
  const availablePets = pets.filter(
    (pet) => !pet.isArchived && (!activeOwnerId || pet.ownerId === activeOwnerId),
  );
  const availableAppointments = appointments.filter((appointment) => {
    if (appointment.isArchived) {
      return false;
    }
    if (activeOwnerId && appointment.ownerId !== activeOwnerId) {
      return false;
    }
    if (!["scheduled", "confirmed"].includes(appointment.status)) {
      return false;
    }
    return new Date(appointment.end).getTime() >= Date.now();
  });
  const sortedAppointments = useMemo(
    () =>
      [...availableAppointments].sort(
        (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime(),
      ),
    [availableAppointments],
  );
  const selectedAppointment = appointments.find((item) => item.id === appointmentId);
  const selectedAppointmentInList = sortedAppointments.some((item) => item.id === appointmentId);
  const visibleRequests = useMemo(
    () =>
      [...requests].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [requests],
  );
  const isPendingPetSelected =
    requestType === "appointment" && selectedPetIds.includes(NEW_PET_SENTINEL);

  useEffect(() => {
    if (isClient) {
      setSelectedOwnerId(ownerId);
    }
  }, [isClient, ownerId]);

  useEffect(() => {
    const type = searchParams.get("type");
    if (type && ["appointment", "appointment_change", "new_pet", "profile_update", "general"].includes(type)) {
      setRequestType(type as ClientRequestType);
      if (isClient) {
        setSelectedOwnerId(ownerId);
      }
      setShowModal(true);
      setSearchParams((current) => {
        const next = new URLSearchParams(current);
        next.delete("type");
        return next;
      });
    }
  }, [isClient, ownerId, searchParams, setSearchParams]);

  useEffect(() => {
    const requestId = searchParams.get("requestId");
    if (!requestId || showModal) {
      return;
    }

    const targetRequest = requests.find((item) => item.id === requestId);
    if (targetRequest) {
      openEdit(targetRequest);
      setSearchParams((current) => {
        const next = new URLSearchParams(current);
        next.delete("requestId");
        return next;
      });
    }
  }, [requests, searchParams, setSearchParams, showModal]);

  if (isLoading) {
    return <PageLoader label="Loading requests..." />;
  }

  const resetForm = () => {
    setEditingRequest(null);
    setIsReadOnly(false);
    setRequestType("appointment");
    setSubject("");
    setClientNote("");
    setResolutionNote("");
    setInternalNote("");
    setStatus("open");
    setPetId("");
    setSelectedPetIds([]);
    setAppointmentId("");
    setAppointmentChangeType("cancel");
    setSelectedOwnerId(isClient ? ownerId : "");
    setProfileAttribute("contact_info");
    setPendingPet(emptyPendingPet());
    setSaveError(null);
    setInfoMessage(null);
  };

  const openCreate = (type?: ClientRequestType) => {
    resetForm();
    if (type) {
      setRequestType(type);
    }
    setShowModal(true);
  };

  function openEdit(request: ClientRequest) {
    setEditingRequest(request);
    setIsReadOnly(isClient || isRequestClosed(request.status));
    setRequestType(request.requestType);
    setSubject(request.subject);
    setClientNote(request.clientNote);
    setResolutionNote(request.resolutionNote ?? "");
    setInternalNote(request.internalNote ?? "");
    setStatus(request.status);
    setPetId(request.petId ?? "");
    setSelectedPetIds(
      request.requestType === "appointment"
        ? request.details?.appointment?.petIds ??
            (request.petId ? [request.petId] : [])
        : [],
    );
    setAppointmentId(request.details?.appointmentChange?.appointmentId ?? "");
    setAppointmentChangeType(request.details?.appointmentChange?.changeType ?? "cancel");
    setSelectedOwnerId(request.ownerId);
    setProfileAttribute(request.details?.profileUpdate?.attribute ?? "contact_info");
    setPendingPet(
      request.details?.appointment?.pendingPet ??
        request.details?.newPet?.pendingPet ??
        emptyPendingPet(),
    );
    if (
      request.requestType === "appointment" &&
      request.details?.appointment?.petSelection === "new_pet"
    ) {
      setSelectedPetIds([NEW_PET_SENTINEL]);
    }
    setSaveError(null);
    setInfoMessage(null);
    setShowModal(true);
  }

  const updatePendingPet = <K extends keyof PendingPetProfile>(field: K, value: PendingPetProfile[K]) => {
    setPendingPet((current) => ({ ...current, [field]: value }));
  };

  const buildNewPetSubject = () => {
    const petName = pendingPet.name.trim() || "New Pet";
    return `New pet request for ${petName}`;
  };

  const buildAppointmentSubject = () => {
    const selectedIds = selectedPetIds.filter((id) => id !== NEW_PET_SENTINEL);
    const hasNewPet = selectedPetIds.includes(NEW_PET_SENTINEL);
    if (hasNewPet && selectedIds.length === 0) {
      return `Appointment request for ${pendingPet.name.trim() || "new pet"}`;
    }
    const selectedNames = selectedIds
      .map((id) => availablePets.find((item) => item.id === id)?.name)
      .filter(Boolean);
    if (selectedNames.length > 0) {
      return `Appointment request for ${selectedNames.join(", ")}`;
    }
    return "Appointment request";
  };

  const buildAppointmentChangeSubject = (appointment?: Appointment | null) => {
    const actionLabel = appointmentChangeLabels[appointmentChangeType];
    const pet = appointment ? pets.find((item) => item.id === appointment.petId) : null;
    return `${actionLabel} request for ${pet?.name ?? "appointment"}`;
  };

  const validateForm = () => {
    if (!activeOwnerId) {
      return "A client is required.";
    }

    if (requestType === "appointment") {
      if (selectedPetIds.length === 0) {
        return "Please choose at least one pet or select New Pet.";
      }
      if (selectedPetIds.includes(NEW_PET_SENTINEL) && selectedPetIds.length > 1) {
        return "New pet requests cannot be combined with existing pets. Submit those separately.";
      }
      if (selectedPetIds.includes(NEW_PET_SENTINEL)) {
        if (!pendingPet.name.trim() || !pendingPet.breed.trim()) {
          return "New pet appointment requests need the pet name and breed.";
        }
        if (!pendingPet.birthDate) {
          return "Please provide a DOB or estimated DOB for the new pet.";
        }
      }
    }

    if (requestType === "new_pet") {
      if (!pendingPet.name.trim() || !pendingPet.breed.trim()) {
        return "New pet requests need the pet name and breed.";
      }
      if (!pendingPet.birthDate) {
        return "Please provide a DOB or estimated DOB for the new pet.";
      }
    }

    if (requestType === "appointment_change") {
      if (!appointmentId) {
        return "Please choose the appointment you want to change.";
      }
      if (!appointmentChangeType) {
        return "Please choose cancel or reschedule.";
      }
    }

    if ((requestType === "profile_update" || requestType === "general") && !subject.trim()) {
      return "A subject is required.";
    }

    if (!clientNote.trim()) {
      return "A request note is required.";
    }

    return null;
  };

  const ownerIdForPayload = editingRequest
    ? editingRequest.ownerId
    : isClient
      ? ownerId
      : selectedOwnerId;

  const buildPayload = (): ClientRequestUpsertInput => {
    if (requestType === "appointment") {
      const existingPetIds = selectedPetIds.filter((id) => id !== NEW_PET_SENTINEL);
      const hasNewPet = selectedPetIds.includes(NEW_PET_SENTINEL);
      return {
        ownerId: ownerIdForPayload,
        petId: existingPetIds[0],
        requestType,
        subject: buildAppointmentSubject(),
        clientNote,
        resolutionNote: isClient ? undefined : resolutionNote || undefined,
        internalNote: isClient ? undefined : internalNote || undefined,
        status: isClient ? "open" : status,
        details: {
          appointment: {
            petSelection: hasNewPet ? "new_pet" : "existing",
            petIds: hasNewPet ? undefined : existingPetIds,
            pendingPet: hasNewPet ? pendingPet : undefined,
          },
        },
      };
    }

    if (requestType === "appointment_change") {
      const appointment = appointments.find((item) => item.id === appointmentId);
      return {
        ownerId: ownerIdForPayload,
        petId: appointment?.petId,
        requestType,
        subject: buildAppointmentChangeSubject(appointment),
        clientNote,
        resolutionNote: isClient ? undefined : resolutionNote || undefined,
        internalNote: isClient ? undefined : internalNote || undefined,
        status: isClient ? "open" : status,
        details: {
          appointmentChange: {
            appointmentId,
            changeType: appointmentChangeType,
          },
        },
      };
    }

    if (requestType === "new_pet") {
      return {
        ownerId: ownerIdForPayload,
        requestType,
        subject: buildNewPetSubject(),
        clientNote,
        resolutionNote: isClient ? undefined : resolutionNote || undefined,
        internalNote: isClient ? undefined : internalNote || undefined,
        status: isClient ? "open" : status,
        details: {
          newPet: {
            pendingPet,
          },
        },
      };
    }

    if (requestType === "profile_update") {
      return {
        ownerId: ownerIdForPayload,
        petId: petId || undefined,
        requestType,
        subject: subject.trim(),
        clientNote,
        resolutionNote: isClient ? undefined : resolutionNote || undefined,
        internalNote: isClient ? undefined : internalNote || undefined,
        status: isClient ? "open" : status,
        details: {
          profileUpdate: {
            attribute: profileAttribute,
          },
        },
      };
    }

    return {
      ownerId: ownerIdForPayload,
      petId: petId || undefined,
      requestType,
      subject: subject.trim(),
      clientNote,
      resolutionNote: isClient ? undefined : resolutionNote || undefined,
      internalNote: isClient ? undefined : internalNote || undefined,
      status: isClient ? "open" : status,
      details: {
        general: {
          relatedPetOptional: true,
        },
      },
    };
  };

  const handleSave = async () => {
    if (isReadOnly) {
      return;
    }
    const validationError = validateForm();
    if (validationError) {
      setSaveError(validationError);
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      const payload = buildPayload();

      if (
        !editingRequest &&
        requestType === "appointment" &&
        selectedPetIds.includes(NEW_PET_SENTINEL)
      ) {
        const petRequest = await saveClientRequest(
          {
            ownerId: payload.ownerId,
            requestType: "new_pet",
            subject: buildNewPetSubject(),
            clientNote,
            resolutionNote: payload.resolutionNote,
            internalNote: payload.internalNote,
            status: payload.status,
            details: {
              newPet: {
                pendingPet,
              },
            },
          },
          undefined,
        );

        const appointmentRequest = await saveClientRequest(payload, undefined);
        setRequests((current) => [appointmentRequest, petRequest, ...current]);
        setShowModal(false);
        resetForm();
        showToast({
          title: "Requests Submitted",
          body: "The appointment request and new pet request were both logged.",
          variant: "success",
        });
        return;
      }

      const savedRequest = await saveClientRequest(payload, editingRequest ?? undefined);
      setRequests((current) =>
        editingRequest
          ? current.map((item) => (item.id === savedRequest.id ? savedRequest : item))
          : [savedRequest, ...current],
      );
      setShowModal(false);
      resetForm();
      showToast({
        title: editingRequest ? "Request Updated" : "Request Submitted",
        body: editingRequest ? "The request log was updated." : "Your request has been logged.",
        variant: "success",
      });
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Unable to save request.");
    } finally {
      setIsSaving(false);
    }
  };

  const renderRequestSummary = (request: ClientRequest) => {
    if (request.requestType === "appointment" && request.details?.appointment?.pendingPet) {
      return `Pending Pet: ${formatPendingPetSummary(request.details.appointment.pendingPet)}`;
    }
    if (request.requestType === "appointment" && request.details?.appointment?.petIds?.length) {
      const petNames = request.details.appointment.petIds
        .map((id) => pets.find((pet) => pet.id === id)?.name)
        .filter(Boolean);
      if (petNames.length > 0) {
        return `Pets: ${petNames.join(", ")}`;
      }
    }
    if (request.requestType === "appointment_change" && request.details?.appointmentChange) {
      const appointment = appointments.find(
        (item) => item.id === request.details?.appointmentChange?.appointmentId,
      );
      const petName = appointment
        ? pets.find((item) => item.id === appointment.petId)?.name ?? "Pet"
        : "Appointment";
      const appointmentSummary = appointment
        ? `${petName} | ${new Date(appointment.start).toLocaleString()}`
        : petName;
      const changeLabel = appointmentChangeLabels[request.details.appointmentChange.changeType];
      return `${changeLabel}: ${appointmentSummary}`;
    }
    if (request.requestType === "new_pet" && request.details?.newPet?.pendingPet) {
      return formatPendingPetSummary(request.details.newPet.pendingPet);
    }
    if (request.requestType === "profile_update" && request.details?.profileUpdate) {
      return `Profile area: ${profileAttributeLabels[request.details.profileUpdate.attribute]}`;
    }
    return null;
  };

  const getRequestTypeBadgeClass = (type: ClientRequestType) => {
    switch (type) {
      case "appointment":
        return "bg-primary-subtle text-primary-emphasis";
      case "appointment_change":
        return "bg-danger-subtle text-danger-emphasis";
      case "new_pet":
        return "bg-success-subtle text-success-emphasis";
      case "profile_update":
        return "bg-warning-subtle text-warning-emphasis";
      case "general":
      default:
        return "bg-info-subtle text-info-emphasis";
    }
  };

  const renderPendingPetFields = () => (
    <div className="d-grid gap-3">
      <Form.Group>
        <Form.Label>Pet Name</Form.Label>
        <Form.Control
          value={pendingPet.name}
          onChange={(event) => updatePendingPet("name", event.target.value)}
          required
        />
      </Form.Group>
      <div className="row g-3">
        <div className="col-sm-6">
          <Form.Group>
            <Form.Label>Species</Form.Label>
            <Form.Select
              value={pendingPet.species}
              onChange={(event) => updatePendingPet("species", event.target.value as Species)}
            >
              <option value="dog">Dog</option>
              <option value="cat">Cat</option>
            </Form.Select>
          </Form.Group>
        </div>
        <div className="col-sm-6">
          <Form.Group>
            <Form.Label>Breed</Form.Label>
            <Form.Control
              value={pendingPet.breed}
              onChange={(event) => updatePendingPet("breed", event.target.value)}
              required
            />
          </Form.Group>
        </div>
      </div>
      <div className="row g-3">
        <div className="col-sm-6">
          <Form.Group>
            <Form.Label>Weight (lbs)</Form.Label>
            <Form.Control
              type="number"
              min="0"
              step="0.1"
              value={pendingPet.weightLbs?.toString() ?? ""}
              onChange={(event) =>
                updatePendingPet(
                  "weightLbs",
                  event.target.value ? Number(event.target.value) : undefined,
                )
              }
            />
          </Form.Group>
        </div>
        <div className="col-sm-6">
          <Form.Group>
            <Form.Label>{pendingPet.isBirthDateEstimated ? "Estimated DOB" : "DOB"}</Form.Label>
            <Form.Control
              type="date"
              value={toDateInputValue(pendingPet.birthDate)}
              onChange={(event) =>
                updatePendingPet("birthDate", event.target.value ? new Date(event.target.value).toISOString() : undefined)
              }
              required
            />
          </Form.Group>
        </div>
      </div>
      <Form.Check
        type="switch"
        id="pending-pet-estimated-dob"
        label="This is an estimated DOB"
        checked={pendingPet.isBirthDateEstimated ?? false}
        onChange={(event) => updatePendingPet("isBirthDateEstimated", event.target.checked)}
      />
    </div>
  );

  return (
    <>
      <div className="page-header d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3 mb-4">
        <div>
          <p className="page-kicker mb-2">{isClient ? "Client Portal" : "Operations"}</p>
          <h2 className="mb-1">{isClient ? "My Requests" : "Request Log"}</h2>
          <p className="text-muted mb-0">
            {isClient
              ? "Request appointments, cancel or reschedule, pet updates, and profile changes from the groomer."
              : "Review incoming customer requests and track follow-up work."}
          </p>
        </div>
        <Button onClick={() => openCreate()}>{isClient ? "New Request" : "Log Request"}</Button>
      </div>

      {!isClient && (
        <Alert variant="info" className="mb-4">
          This log includes appointment requests, cancel/reschedule requests, new pet requests, profile updates, and general client requests.
        </Alert>
      )}

      <Row className="g-3">
        {visibleRequests.map((request) => {
          const owner = owners.find((item) => item.id === request.ownerId);
          const pet = pets.find((item) => item.id === request.petId);
          const summary = renderRequestSummary(request);

          return (
            <Col xs={12} lg={6} key={request.id}>
              <Card className="shadow-sm h-100">
                <Card.Body className="d-grid gap-3">
                  <div className="client-summary-row align-items-start">
                    <div>
                      <div className="d-flex flex-wrap align-items-center gap-2 mb-1">
                        <span className={`request-type-mark request-type-mark-${request.requestType.replace("_", "-")}`}>
                          {getRequestTypeIcon(request.requestType)}
                        </span>
                        <div className="fw-semibold">{request.subject}</div>
                      </div>
                      <div className="text-muted small">
                        {requestTypeLabels[request.requestType]} | {new Date(request.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <div className="d-flex flex-column align-items-end gap-2">
                      <Badge pill className={`request-type-badge ${getRequestTypeBadgeClass(request.requestType)}`}>
                        {requestTypeLabels[request.requestType]}
                      </Badge>
                      <Badge bg="light" text="dark" className="request-status-badge">
                        {formatRequestStatus(request.status)}
                      </Badge>
                    </div>
                  </div>

                  <div className="text-muted small">
                    Client: {owner ? `${owner.firstName} ${owner.lastName}` : "Unknown client"}
                    {pet ? ` | Pet: ${pet.name}` : ""}
                  </div>

                  {summary && <div className="text-muted small">{summary}</div>}

                  <div>
                    <div className="text-muted small mb-1">Client Note</div>
                    <div>{request.clientNote}</div>
                  </div>

                  {request.resolutionNote && (
                    <div>
                      <div className="text-muted small mb-1">Groomer Update</div>
                      <div>{request.resolutionNote}</div>
                    </div>
                  )}

                  {!isClient && request.internalNote && (
                    <div>
                      <div className="text-muted small mb-1">Internal Note</div>
                      <div>{request.internalNote}</div>
                    </div>
                  )}

                  {buildRequestTimeline(request).length > 0 && (
                    <div className="request-activity-panel">
                      <div className="text-muted small fw-semibold mb-2">Latest Activity</div>
                      <div className="request-activity-list">
                        {buildRequestTimeline(request)
                          .slice(-2)
                          .map((event) => (
                            <div key={event.id} className="request-activity-item">
                              <div className="request-activity-time">
                                {new Date(event.createdAt).toLocaleString()}
                              </div>
                              <div className="request-activity-content">
                                <div className="fw-semibold small">{event.title}</div>
                                {event.detail && (
                                  <div className="text-muted small">{event.detail}</div>
                                )}
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <Button size="sm" variant="outline-secondary" onClick={() => openEdit(request)}>
                      {isClient || isRequestClosed(request.status) ? "View Request" : "Update Request"}
                    </Button>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          );
        })}
      </Row>

      {visibleRequests.length === 0 && (
        <Card className="shadow-sm">
          <Card.Body className="text-muted small">
            {isClient ? "You do not have any requests yet." : "No requests have been logged yet."}
          </Card.Body>
        </Card>
      )}

      <Modal show={showModal} onHide={() => setShowModal(false)} centered fullscreen="sm-down">
        <Form
          onSubmit={(event) => {
            event.preventDefault();
            void handleSave();
          }}
          className="modal-form-shell"
        >
          <Modal.Header closeButton>
            <div className="d-flex flex-column gap-2">
              <span className={`mode-indicator${editingRequest ? " mode-indicator-edit" : ""}`}>
                {editingRequest ? "Update Request" : "New Request"}
              </span>
              <Modal.Title>{isClient ? "Client Request" : "Request Log Entry"}</Modal.Title>
            </div>
          </Modal.Header>
          <Modal.Body className="settings-modal-body">
            {saveError && <Alert variant="danger">{saveError}</Alert>}
            {infoMessage && <Alert variant="info">{infoMessage}</Alert>}

            <div className="settings-form-stack">
              {editingRequest && buildRequestTimeline(editingRequest).length > 0 && (
                <div className="request-timeline-card">
                  <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
                    <div>
                      <div className="text-muted small">Activity Timeline</div>
                      <div className="fw-semibold">{editingRequest.subject}</div>
                    </div>
                    <Badge pill className={`request-type-badge ${getRequestTypeBadgeClass(editingRequest.requestType)}`}>
                      {requestTypeLabels[editingRequest.requestType]}
                    </Badge>
                  </div>
                  <div className="request-timeline-list">
                    {buildRequestTimeline(editingRequest).map((event) => (
                      <div key={event.id} className="request-timeline-item">
                        <div className="request-timeline-dot" />
                        <div className="request-timeline-copy">
                          <div className="d-flex flex-wrap align-items-center gap-2">
                            <div className="fw-semibold small">{event.title}</div>
                            <span className="text-muted small">
                              {new Date(event.createdAt).toLocaleString()}
                            </span>
                            {event.actorRole && (
                              <span className="request-timeline-role">
                                {event.actorRole === "admin"
                                  ? "Admin"
                                  : event.actorRole === "groomer"
                                    ? "Groomer"
                                    : "Client"}
                              </span>
                            )}
                          </div>
                          {event.detail && (
                            <div className="text-muted small mt-1">{event.detail}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Form.Group>
                  <Form.Label>Request Type</Form.Label>
                  <Form.Select
                    value={requestType}
                    onChange={(event) => {
                      setRequestType(event.target.value as ClientRequestType);
                      setPetId("");
                      setSelectedPetIds([]);
                      setAppointmentId("");
                      setAppointmentChangeType("cancel");
                      setPendingPet(emptyPendingPet());
                    }}
                  disabled={isReadOnly || !!editingRequest}
                  >
                    {Object.entries(requestTypeLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>

              <Form.Group>
                <Form.Label>Client</Form.Label>
                <Form.Select
                  value={selectedOwnerId}
                  onChange={(event) => {
                    setSelectedOwnerId(event.target.value);
                    setPetId("");
                    setSelectedPetIds([]);
                  }}
                  disabled={isReadOnly || isClient || !!editingRequest}
                  required
                >
                  <option value="">Select a client</option>
                  {owners
                    .filter((owner) => !owner.isArchived)
                    .map((owner) => (
                      <option key={owner.id} value={owner.id}>
                        {owner.lastName}, {owner.firstName}
                      </option>
                    ))}
                </Form.Select>
              </Form.Group>

              {requestType === "appointment" && (
                <>
                  <Form.Group>
                    <Form.Label>Pets</Form.Label>
                    <Form.Select
                      value={selectedPetIds}
                      onChange={(event) => {
                        const values = Array.from(event.target.selectedOptions).map((option) => option.value);
                        setSelectedPetIds(values);
                      }}
                      multiple
                      required
                      disabled={isReadOnly}
                    >
                      <option value="" disabled>
                        Select one or more pets
                      </option>
                      {availablePets.map((pet) => (
                        <option key={pet.id} value={pet.id}>
                          {pet.name}
                        </option>
                      ))}
                      <option value={NEW_PET_SENTINEL}>New Pet</option>
                    </Form.Select>
                    <Form.Text muted>
                      Select multiple pets if the appointment request is for more than one pet.
                    </Form.Text>
                  </Form.Group>
                  {isPendingPetSelected && renderPendingPetFields()}
                  <Form.Group>
                    <Form.Label>Subject</Form.Label>
                    <Form.Control
                      value={buildAppointmentSubject()}
                      readOnly
                      disabled={isReadOnly}
                    />
                    <Form.Text muted>
                      This is prefilled with the request type and selected pet(s).
                    </Form.Text>
                  </Form.Group>
                </>
              )}

              {requestType === "appointment_change" && (
                <>
                  <Form.Group>
                    <Form.Label>Appointment</Form.Label>
                    <Form.Select
                      value={appointmentId}
                      onChange={(event) => setAppointmentId(event.target.value)}
                      required
                      disabled={isReadOnly}
                    >
                      <option value="">Select an appointment</option>
                      {!selectedAppointmentInList && selectedAppointment && (
                        <option value={selectedAppointment.id}>
                          {pets.find((pet) => pet.id === selectedAppointment.petId)?.name ?? "Pet"} |{" "}
                          {new Date(selectedAppointment.start).toLocaleString()}
                        </option>
                      )}
                      {sortedAppointments.map((appointment) => {
                        const pet = pets.find((item) => item.id === appointment.petId);
                        return (
                          <option key={appointment.id} value={appointment.id}>
                            {pet?.name ?? "Pet"} | {new Date(appointment.start).toLocaleString()}
                          </option>
                        );
                      })}
                    </Form.Select>
                    {sortedAppointments.length === 0 && !selectedAppointment && (
                      <div className="text-muted small mt-2">No upcoming appointments available.</div>
                    )}
                  </Form.Group>
                  <Form.Group>
                    <Form.Label>Change Type</Form.Label>
                    <Form.Select
                      value={appointmentChangeType}
                      onChange={(event) => setAppointmentChangeType(event.target.value as AppointmentChangeType)}
                      disabled={isReadOnly}
                    >
                      {Object.entries(appointmentChangeLabels).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </>
              )}

              {requestType === "new_pet" && renderPendingPetFields()}

              {requestType === "profile_update" && (
                <>
                  <Form.Group>
                    <Form.Label>Profile Attribute</Form.Label>
                    <Form.Select
                      value={profileAttribute}
                      onChange={(event) => setProfileAttribute(event.target.value as ProfileRequestAttribute)}
                      disabled={isReadOnly}
                    >
                      {Object.entries(profileAttributeLabels).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                  <Form.Group>
                    <Form.Label>Subject</Form.Label>
                    <Form.Control
                      value={subject}
                      onChange={(event) => setSubject(event.target.value)}
                      required
                      disabled={isReadOnly}
                    />
                  </Form.Group>
                </>
              )}

              {requestType === "general" && (
                <>
                  <Form.Group>
                    <Form.Label>Related Pet</Form.Label>
                    <Form.Select
                      value={petId}
                      onChange={(event) => setPetId(event.target.value)}
                      disabled={isReadOnly}
                    >
                      <option value="">No pet selected</option>
                      {availablePets.map((pet) => (
                        <option key={pet.id} value={pet.id}>
                          {pet.name}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                  <Form.Group>
                    <Form.Label>Subject</Form.Label>
                    <Form.Control
                      value={subject}
                      onChange={(event) => setSubject(event.target.value)}
                      required
                      disabled={isReadOnly}
                    />
                  </Form.Group>
                </>
              )}

              <Form.Group>
                <Form.Label>
                  {requestType === "profile_update" || requestType === "general"
                    ? "Request Note"
                    : requestType === "appointment_change"
                      ? "Notes"
                      : "Additional Details"}
                </Form.Label>
                <Form.Control
                  as="textarea"
                  rows={5}
                  value={clientNote}
                  onChange={(event) => setClientNote(event.target.value)}
                  required
                  disabled={isReadOnly}
                />
              </Form.Group>

              {isClient ? (
                resolutionNote ? (
                  <Form.Group>
                    <Form.Label>Groomer Update</Form.Label>
                    <Form.Control as="textarea" rows={4} value={resolutionNote} disabled />
                  </Form.Group>
                ) : null
              ) : (
                <Form.Group>
                  <Form.Label>Client Update (Visible to client)</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={4}
                    value={resolutionNote}
                    onChange={(event) => setResolutionNote(event.target.value)}
                    disabled={isReadOnly}
                  />
                </Form.Group>
              )}

              {!isClient && (
                <>
                  <Form.Group>
                    <Form.Label>Status</Form.Label>
                    <Form.Select
                      value={status}
                      onChange={(event) => setStatus(event.target.value as ClientRequest["status"])}
                      disabled={isReadOnly}
                    >
                      <option value="open">Open</option>
                      <option value="in_review">In Review</option>
                      <option value="closed">Closed</option>
                    </Form.Select>
                  </Form.Group>
                  <Form.Group>
                    <Form.Label>Internal Note</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={4}
                      value={internalNote}
                      onChange={(event) => setInternalNote(event.target.value)}
                      disabled={isReadOnly}
                    />
                  </Form.Group>
                </>
              )}
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="outline-secondary" onClick={() => setShowModal(false)} disabled={isSaving}>
              Cancel
            </Button>
            {isClient && editingRequest && (
              <Button
                variant="outline-primary"
                disabled={isSaving || isRequestClosed(editingRequest.status)}
                aria-label="Edit request"
                onClick={() => {
                  if (editingRequest.status === "in_review") {
                    setInfoMessage(
                      "This request is in review. Please contact your groomer and include your email and phone number.",
                    );
                    return;
                  }

                  if (!isRequestClosed(editingRequest.status)) {
                    setInfoMessage(null);
                    setIsReadOnly(false);
                  }
                }}
              >
                <PencilSquare aria-hidden="true" />
              </Button>
            )}
            {!isReadOnly && (
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Saving..." : isClient ? "Submit Request" : "Save"}
              </Button>
            )}
          </Modal.Footer>
        </Form>
      </Modal>
    </>
  );
}

