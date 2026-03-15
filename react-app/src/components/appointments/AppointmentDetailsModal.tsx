import { useEffect, useMemo, useState } from "react";
import { Alert, Badge, Button, Dropdown, Form, ListGroup, Modal, Spinner } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import {
  APPOINTMENT_SERVICE_OPTIONS,
  derivePrimaryServiceType,
  formatAppointmentServices,
  getAppointmentSelectedServices,
} from "../../lib/appointmentServices";
import {
  addAppointmentNote,
  archiveAppointment,
  archiveAppointmentNote,
  deleteAppointment,
  deleteAppointmentNoteItem,
  isBackendConfigured,
  saveAppointment,
  unarchiveAppointmentNote,
  updateAppointmentNote,
  updateAppointmentStatus,
  type AppointmentUpsertInput,
} from "../../lib/crmApi";
import { useAppToast } from "../common/AppToastProvider";
import ClientContactActions from "../common/ClientContactActions";
import ConfirmDeleteModal from "../common/ConfirmDeleteModal";
import type {
  Appointment,
  AppointmentStatus,
  NoteVisibility,
  Owner,
  Pet,
} from "../../types/models";

interface AppointmentDetailsModalProps {
  show: boolean;
  onHide: () => void;
  appointment: Appointment | null;
  owners: Owner[];
  pets: Pet[];
  onUpdated?: (appointment: Appointment) => void;
  onDeleted?: (appointmentId: string) => void;
  editingWarning?: string;
  allowPastEditing?: boolean;
}

export default function AppointmentDetailsModal({
  show,
  onHide,
  appointment,
  owners,
  pets,
  onUpdated,
  onDeleted,
  editingWarning,
  allowPastEditing = false,
}: AppointmentDetailsModalProps) {
  const navigate = useNavigate();
  const { showToast } = useAppToast();
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [customServiceType, setCustomServiceType] = useState("");
  const [cost, setCost] = useState("");
  const [status, setStatus] = useState<AppointmentStatus>("scheduled");
  const [noteText, setNoteText] = useState("");
  const [noteVisibility, setNoteVisibility] = useState<NoteVisibility>("internal");
  const [noteError, setNoteError] = useState<string | null>(null);
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showNewNoteModal, setShowNewNoteModal] = useState(false);
  const [showAllNotesModal, setShowAllNotesModal] = useState(false);
  const [showEditNoteModal, setShowEditNoteModal] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteText, setEditingNoteText] = useState("");
  const [editingNoteVisibility, setEditingNoteVisibility] = useState<NoteVisibility>("internal");
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showPastEditConfirmModal, setShowPastEditConfirmModal] = useState(false);
  const [pendingLateStatusAction, setPendingLateStatusAction] =
    useState<AppointmentStatus | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (appointment && show) {
      const appointmentStart = new Date(appointment.start);
      const appointmentEnd = new Date(appointment.end);
      setDate(appointmentStart.toISOString().slice(0, 10));
      setStartTime(appointmentStart.toTimeString().slice(0, 5));
      setEndTime(appointmentEnd.toTimeString().slice(0, 5));
      setSelectedServices(getAppointmentSelectedServices(appointment));
      setCustomServiceType(appointment.customServiceType ?? "");
      setCost(appointment.cost.toFixed(2));
      setStatus(appointment.status);
      setNoteText("");
      setNoteVisibility("internal");
      setNoteError(null);
      setShowNewNoteModal(false);
      setShowAllNotesModal(false);
      setShowEditNoteModal(false);
      setEditingNoteId(null);
      setEditingNoteText("");
      setEditingNoteVisibility("internal");
      setSaveError(null);
      setIsEditing(false);
    }
  }, [appointment, show]);

  const customSelected = selectedServices.includes("Custom");
  const activeNotes = useMemo(
    () => (appointment?.notes ?? []).filter((note) => !note.isArchived),
    [appointment],
  );
  const archivedNotes = useMemo(
    () => (appointment?.notes ?? []).filter((note) => note.isArchived),
    [appointment],
  );
  const previewNotes = useMemo(() => activeNotes.slice(0, 3), [activeNotes]);

  const toggleService = (service: string) => {
    setSelectedServices((currentServices) =>
      currentServices.includes(service)
        ? currentServices.filter((currentService) => currentService !== service)
        : [...currentServices, service],
    );
  };

  const owner = useMemo(() => {
    if (!appointment) return null;
    return owners.find((item) => item.id === appointment.ownerId) ?? null;
  }, [appointment, owners]);

  const pet = useMemo(() => {
    if (!appointment) return null;
    return pets.find((item) => item.id === appointment.petId) ?? null;
  }, [appointment, pets]);

  const isPastAppointment = useMemo(() => {
    if (!appointment) return false;
    return new Date(appointment.end) < new Date();
  }, [appointment]);

  const isMoreThan24HoursPast = useMemo(() => {
    if (!appointment) return false;
    return Date.now() - new Date(appointment.end).getTime() >= 24 * 60 * 60 * 1000;
  }, [appointment]);

  const isMoreThan24HoursPastStart = useMemo(() => {
    if (!appointment) return false;
    return Date.now() - new Date(appointment.start).getTime() >= 24 * 60 * 60 * 1000;
  }, [appointment]);

  const isEligibleForNoShow = useMemo(() => {
    if (!appointment) return false;
    return Date.now() - new Date(appointment.start).getTime() >= 10 * 60 * 1000;
  }, [appointment]);

  if (!appointment || !owner || !pet) return null;

  const canEditPastAppointment = isPastAppointment && allowPastEditing;
  const showEditableFields = isEditing;
  const canMarkConfirmed =
    appointment.status === "scheduled" && !isMoreThan24HoursPast;
  const canMarkCompleted =
    appointment.status === "scheduled" || appointment.status === "confirmed";
  const canCancelAppointment =
    appointment.status === "scheduled" || appointment.status === "confirmed";
  const canMarkNoShow =
    isEligibleForNoShow &&
    (appointment.status === "scheduled" || appointment.status === "confirmed");
  const requiresLateStatusWarning =
    isMoreThan24HoursPastStart &&
    (appointment.status === "scheduled" || appointment.status === "confirmed");

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    setSaveError(null);

    const nextStart = new Date(`${date}T${startTime}:00`);
    const nextEnd = new Date(`${date}T${endTime}:00`);

    if (nextEnd <= nextStart) {
      setSaveError("End time must be after start time.");
      setIsSaving(false);
      return;
    }

    const updatedAppointment: AppointmentUpsertInput = {
      ownerId: appointment.ownerId,
      petId: appointment.petId,
      start: nextStart.toISOString(),
      end: nextEnd.toISOString(),
      serviceType: derivePrimaryServiceType(selectedServices),
      selectedServices,
      customServiceType: customSelected ? customServiceType : undefined,
      cost: Number(cost) || 0,
      status,
    };

    try {
      const result = await saveAppointment(updatedAppointment, appointment);
      onUpdated?.(result.data);
      showToast({
        title: "Appointment Updated",
        body:
          result.mode === "api"
            ? "Appointment changes saved to backend."
            : "Appointment updated in mock mode.",
        variant: "success",
      });
      onHide();
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "Unable to update appointment.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const resetNoteEditor = () => {
    setNoteText("");
    setNoteVisibility("internal");
    setNoteError(null);
  };

  const openNewNoteModal = () => {
    resetNoteEditor();
    setShowNewNoteModal(true);
  };

  const closeNewNoteModal = () => {
    setShowNewNoteModal(false);
    resetNoteEditor();
  };

  const handleSaveNote = async () => {
    if (!noteText.trim()) {
      return;
    }

    setIsSavingNote(true);
    setNoteError(null);

    try {
      const result = await addAppointmentNote(appointment, noteText.trim(), noteVisibility);
      onUpdated?.(result.data);
      closeNewNoteModal();
      showToast({
        title: "Note Added",
        body: "The appointment note was saved successfully.",
        variant: "success",
      });
    } catch (error) {
      setNoteError(error instanceof Error ? error.message : "Unable to save note.");
    } finally {
      setIsSavingNote(false);
    }
  };

  const handleNoteAction = async (
    noteId: string,
    action: "archive" | "restore" | "delete",
  ) => {
    setIsSavingNote(true);
    setNoteError(null);

    try {
      const result =
        action === "archive"
          ? await archiveAppointmentNote(appointment, noteId)
          : action === "restore"
            ? await unarchiveAppointmentNote(appointment, noteId)
            : await deleteAppointmentNoteItem(appointment, noteId);
      onUpdated?.(result.data);
      if (editingNoteId === noteId) {
        resetNoteEditor();
      }
      showToast({
        title:
          action === "archive"
            ? "Note Archived"
            : action === "restore"
              ? "Note Restored"
              : "Note Deleted",
        body: action === "delete" ? "The note was deleted." : "The note list was updated.",
        variant: action === "delete" ? "warning" : "success",
      });
    } catch (error) {
      setNoteError(error instanceof Error ? error.message : "Unable to update note.");
    } finally {
      setIsSavingNote(false);
    }
  };

  const openEditNoteModal = (noteId: string, text: string, visibility: NoteVisibility) => {
    setEditingNoteId(noteId);
    setEditingNoteText(text);
    setEditingNoteVisibility(visibility);
    setNoteError(null);
    setShowEditNoteModal(true);
  };

  const closeEditNoteModal = () => {
    setShowEditNoteModal(false);
    setEditingNoteId(null);
    setEditingNoteText("");
    setEditingNoteVisibility("internal");
  };

  const handleSaveEditedNote = async () => {
    if (!editingNoteId || !editingNoteText.trim()) {
      return;
    }

    setIsSavingNote(true);
    setNoteError(null);

    try {
      const result = await updateAppointmentNote(
        appointment,
        editingNoteId,
        editingNoteText.trim(),
        editingNoteVisibility,
      );
      onUpdated?.(result.data);
      closeEditNoteModal();
      showToast({
        title: "Note Updated",
        body: "The appointment note was saved successfully.",
        variant: "success",
      });
    } catch (error) {
      setNoteError(error instanceof Error ? error.message : "Unable to save note.");
    } finally {
      setIsSavingNote(false);
    }
  };

  const handleStatusUpdate = async (nextStatus: AppointmentStatus) => {
    setIsSaving(true);
    setSaveError(null);

    try {
      const result = await updateAppointmentStatus(appointment, nextStatus);
      onUpdated?.(result.data);
      showToast({
        title: "Appointment Updated",
        body: `Appointment marked ${nextStatus}.`,
        variant: nextStatus === "cancelled" ? "warning" : "success",
      });
      onHide();
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "Unable to update status.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const triggerStatusUpdate = (nextStatus: AppointmentStatus) => {
    if (
      requiresLateStatusWarning &&
      (nextStatus === "completed" || nextStatus === "cancelled" || nextStatus === "no-show")
    ) {
      setPendingLateStatusAction(nextStatus);
      return;
    }

    void handleStatusUpdate(nextStatus);
  };

  const lateStatusWarningContent = (() => {
    switch (pendingLateStatusAction) {
      case "completed":
        return {
          title: "Mark Completed Late",
          body: "This appointment is still marked scheduled or confirmed even though it started more than 24 hours ago. Only mark it completed if the grooming appointment actually happened and this update is correcting the record.",
          note: "Use this only to fix the historical appointment outcome, not as a routine late update.",
          confirmLabel: "Mark Completed",
          confirmVariant: "secondary",
        };
      case "cancelled":
        return {
          title: "Cancel Appointment Late",
          body: "This appointment started more than 24 hours ago. Only mark it cancelled if the appointment did not happen and the record was never updated at the time.",
          note: "If the client missed the appointment without cancelling ahead of time, marking it as No Show may be more accurate.",
          confirmLabel: "Mark Cancelled",
          confirmVariant: "danger",
        };
      case "no-show":
        return {
          title: "Mark No Show Late",
          body: "This appointment started more than 24 hours ago. Only mark it as no show if the client failed to arrive and this record is being corrected after the fact.",
          note: "Use this when the appointment did not happen and should be recorded as missed rather than completed or cancelled.",
          confirmLabel: "Mark No Show",
          confirmVariant: "warning",
        };
      default:
        return null;
    }
  })();

  const handleDelete = async () => {
    setIsSaving(true);
    setSaveError(null);

    try {
      const result = await deleteAppointment(appointment);
      onDeleted?.(result.data.id);
      showToast({
        title: "Appointment Deleted",
        body:
          result.mode === "api"
            ? "Appointment deleted from backend."
            : "Appointment deleted in mock mode.",
        variant: "warning",
      });
      onHide();
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "Unable to delete appointment.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleArchive = async () => {
    setIsSaving(true);
    setSaveError(null);

    try {
      const result = await archiveAppointment(appointment);
      onUpdated?.(result.data);
      showToast({
        title: "Appointment Archived",
        body:
          result.mode === "api"
            ? "Appointment archived in backend."
            : "Appointment archived in mock mode.",
        variant: "warning",
      });
      setShowArchiveModal(false);
      onHide();
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "Unable to archive appointment.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusVariant = (value: AppointmentStatus) => {
    switch (value) {
      case "confirmed":
        return "success";
      case "cancelled":
        return "danger";
      case "completed":
        return "secondary";
      case "no-show":
        return "warning";
      case "scheduled":
      default:
        return "primary";
    }
  };

  return (
    <>
      <Modal show={show} onHide={onHide} centered size="lg" fullscreen="sm-down">
        <Form onSubmit={handleSave} className="modal-form-shell">
          <Modal.Header closeButton>
            <div className="w-100 d-flex justify-content-between align-items-start gap-3">
              <div>
                <Modal.Title>
                  {showEditableFields ? "Edit Appointment" : "Appointment Details"}
                </Modal.Title>
                <span className={`mode-indicator${isEditing ? " mode-indicator-edit" : ""}`}>
                  {isEditing ? "Edit Mode" : "View Mode"}
                </span>
              </div>

              {!showEditableFields && (
                <Dropdown align="end">
                  <Dropdown.Toggle variant="outline-secondary" size="sm">
                    Actions
                  </Dropdown.Toggle>
                  <Dropdown.Menu>
                    {isPastAppointment && !canEditPastAppointment ? (
                      <Dropdown.Item
                        onClick={() => {
                          onHide();
                          navigate(`/appointments/history?appointmentId=${appointment.id}`);
                        }}
                      >
                        Appointment History
                      </Dropdown.Item>
                    ) : (
                      <Dropdown.Item
                        onClick={() => {
                          if (isPastAppointment) {
                            setShowPastEditConfirmModal(true);
                            return;
                          }

                          setIsEditing(true);
                        }}
                      >
                        Edit Appointment
                      </Dropdown.Item>
                    )}
                    <Dropdown.Divider />
                    {canMarkConfirmed && (
                      <Dropdown.Item
                        onClick={() => triggerStatusUpdate("confirmed")}
                        disabled={isSaving}
                      >
                        Mark Confirmed
                      </Dropdown.Item>
                    )}
                    {canMarkCompleted && (
                      <Dropdown.Item
                        onClick={() => triggerStatusUpdate("completed")}
                        disabled={isSaving}
                      >
                        Mark Completed
                      </Dropdown.Item>
                    )}
                    {canMarkNoShow && (
                      <Dropdown.Item
                        onClick={() => triggerStatusUpdate("no-show")}
                        disabled={isSaving}
                      >
                        Mark No Show
                      </Dropdown.Item>
                    )}
                    <Dropdown.Item onClick={() => setShowArchiveModal(true)} disabled={isSaving}>
                      Archive Appointment
                    </Dropdown.Item>
                    {canCancelAppointment && (
                      <Dropdown.Item
                        onClick={() => {
                          if (requiresLateStatusWarning) {
                            setPendingLateStatusAction("cancelled");
                            return;
                          }

                          setShowCancelModal(true);
                        }}
                        disabled={isSaving}
                      >
                        Cancel Appointment
                      </Dropdown.Item>
                    )}
                    <Dropdown.Item
                      className="text-danger"
                      onClick={() => setShowDeleteModal(true)}
                      disabled={isSaving}
                    >
                      Delete Appointment
                    </Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown>
              )}
            </div>
          </Modal.Header>

          <Modal.Body>
          {showEditableFields && !isBackendConfigured() && (
            <Alert variant="info" className="mb-3">
              Backend not configured yet. Saves are currently local UI previews only.
            </Alert>
          )}

          {saveError && (
            <Alert variant="danger" className="mb-3">
              {saveError}
            </Alert>
          )}

          {editingWarning && isEditing && (
            <Alert variant="warning" className="mb-3">
              {editingWarning}
            </Alert>
          )}

          <div className="d-flex justify-content-between align-items-start mb-3">
            <div>
              <h5 className="mb-1">{pet.name}</h5>
              <div className="text-muted">
                {owner.firstName} {owner.lastName}
              </div>
            </div>

            <Badge bg={getStatusVariant(status)}>{status}</Badge>
          </div>

          <div className="mb-4">
            <div>
              <strong>Breed:</strong> {pet.breed}
            </div>
            <div>
              <strong>Cost:</strong> ${appointment.cost.toFixed(2)}
            </div>
            <div>
              <strong>Services:</strong> {formatAppointmentServices(appointment)}
            </div>
            <div>
              <strong>Preferred Contact:</strong> {owner.preferredContactMethod}
            </div>
          </div>

          {showEditableFields ? (
            <>
              <Form.Group className="mb-3">
                <Form.Label>Date</Form.Label>
                <Form.Control
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </Form.Group>

              <div className="row g-3 mb-3">
                <div className="col-sm-6">
                  <Form.Group>
                    <Form.Label>Start Time</Form.Label>
                    <Form.Control
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      required
                    />
                  </Form.Group>
                </div>
                <div className="col-sm-6">
                  <Form.Group>
                    <Form.Label>End Time</Form.Label>
                    <Form.Control
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      required
                    />
                  </Form.Group>
                </div>
              </div>

              <Form.Group className="mb-3">
                <Form.Label>Services</Form.Label>
                <div className="service-option-grid">
                  {APPOINTMENT_SERVICE_OPTIONS.map((service) => (
                    <Form.Check
                      key={service}
                      type="checkbox"
                      id={`details-service-${service}`}
                      label={service}
                      checked={selectedServices.includes(service)}
                      onChange={() => toggleService(service)}
                    />
                  ))}
                </div>
              </Form.Group>

              {customSelected && (
                <Form.Group className="mb-3">
                  <Form.Label>Custom Service</Form.Label>
                  <Form.Control
                    type="text"
                    value={customServiceType}
                    onChange={(e) => setCustomServiceType(e.target.value)}
                    placeholder="Describe the custom service"
                  />
                </Form.Group>
              )}

              <Form.Group className="mb-3">
                <Form.Label>Status</Form.Label>
                <Form.Select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as AppointmentStatus)}
                >
                  <option value="scheduled">Scheduled</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="no-show">No Show</option>
                </Form.Select>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label className="appointment-cost-highlight">Cost</Form.Label>
                <Form.Control
                  type="number"
                  min="0"
                  step="0.01"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  placeholder="85.00"
                  className="appointment-cost-input"
                />
              </Form.Group>

              <div>
                <div className="d-flex justify-content-between align-items-center gap-2 mb-2">
                  <Form.Label className="mb-0">Appointment Notes</Form.Label>
                  <div className="d-flex gap-2">
                    {(activeNotes.length + archivedNotes.length) > 3 && (
                      <Button size="sm" variant="outline-secondary" onClick={() => setShowAllNotesModal(true)}>
                        View All Notes
                      </Button>
                    )}
                    <Button size="sm" variant="outline-secondary" onClick={openNewNoteModal}>
                      New Note
                    </Button>
                  </div>
                </div>
                {noteError && (
                  <Alert variant="danger" className="mb-3">
                    {noteError}
                  </Alert>
                )}
                {activeNotes.length === 0 ? (
                  <p className="text-muted mb-0">No active appointment notes.</p>
                ) : (
                  <ListGroup className="compact-note-list">
                    {previewNotes.map((note) => (
                      <ListGroup.Item key={note.id}>
                        <div className="d-flex justify-content-between align-items-start gap-3">
                          <div className="client-note-item">
                            <div className="client-note-meta">
                              <span className={`note-visibility-pill note-visibility-pill-${note.visibility}`}>
                                {note.visibility === "client" ? "Client-facing" : "Internal"}
                              </span>
                              <span>{new Date(note.createdAt).toLocaleDateString()}</span>
                              {note.updatedAt && (
                                <span>Updated {new Date(note.updatedAt).toLocaleDateString()}</span>
                              )}
                            </div>
                            <div>{note.text}</div>
                          </div>
                          <div className="note-inline-actions">
                            <button
                              type="button"
                              className="pet-row-indicator-button"
                              onClick={() => openEditNoteModal(note.id, note.text, note.visibility)}
                            >
                              <span className="pet-row-indicator">Edit</span>
                            </button>
                            <button
                              type="button"
                              className="pet-row-indicator-button"
                              disabled={isSavingNote}
                              onClick={() => {
                                void handleNoteAction(note.id, "archive");
                              }}
                            >
                              <span className="pet-row-indicator">Archive</span>
                            </button>
                            <button
                              type="button"
                              className="pet-row-indicator-button"
                              disabled={isSavingNote}
                              onClick={() => {
                                void handleNoteAction(note.id, "delete");
                              }}
                            >
                              <span className="pet-row-indicator pet-row-indicator-danger">Delete</span>
                            </button>
                          </div>
                        </div>
                      </ListGroup.Item>
                    ))}
                  </ListGroup>
                )}
              </div>
            </>
          ) : (
            <div className="appointment-detail-summary mb-3">
              <div><strong>Date:</strong> {new Date(appointment.start).toLocaleDateString()}</div>
              <div>
                <strong>Time:</strong>{" "}
                {new Date(appointment.start).toLocaleTimeString([], {
                  hour: "numeric",
                  minute: "2-digit",
                })}{" "}
                to{" "}
                {new Date(appointment.end).toLocaleTimeString([], {
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </div>
              <div><strong>Status:</strong> {status}</div>
              <div><strong>Projected Cost:</strong> <span className="appointment-cost-highlight">${Number(cost || appointment.cost).toFixed(2)}</span></div>
            </div>
          )}

          {!showEditableFields && (
            <div className="mb-4">
              <div className="fw-semibold mb-2">Appointment Notes</div>
              {activeNotes.length === 0 ? (
                <div className="text-muted small">No appointment notes recorded.</div>
              ) : (
                <ListGroup className="compact-note-list">
                  {activeNotes.map((note) => (
                    <ListGroup.Item key={note.id}>
                      <div className="client-note-item">
                        <div className="client-note-meta">
                          <span className={`note-visibility-pill note-visibility-pill-${note.visibility}`}>
                            {note.visibility === "client" ? "Client-facing" : "Internal"}
                          </span>
                          <span>{new Date(note.createdAt).toLocaleDateString()}</span>
                        </div>
                        <div>{note.text}</div>
                      </div>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              )}
            </div>
          )}

          <div className="border rounded p-3 bg-light">
            <div className="fw-semibold mb-2">Client Contact Info</div>
            <ClientContactActions phone={owner.phone} email={owner.email} stacked />
          </div>
          </Modal.Body>

          <Modal.Footer>
            {showEditableFields ? (
              <>
                <Button
                  variant="outline-secondary"
                  onClick={() => {
                    setSaveError(null);
                    setIsEditing(false);
                  }}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isSaving}
                >
                  {isSaving && (
                    <Spinner animation="border" size="sm" className="me-2" />
                  )}
                  Save
                </Button>
              </>
            ) : (
              <Button variant="secondary" onClick={onHide}>
                Close
              </Button>
            )}
          </Modal.Footer>
        </Form>
      </Modal>
      <ConfirmDeleteModal
        show={!!pendingLateStatusAction && !!lateStatusWarningContent}
        title={lateStatusWarningContent?.title ?? "Update Appointment Status"}
        body={lateStatusWarningContent?.body ?? ""}
        note={lateStatusWarningContent?.note}
        confirmLabel={lateStatusWarningContent?.confirmLabel}
        confirmVariant={lateStatusWarningContent?.confirmVariant}
        onCancel={() => setPendingLateStatusAction(null)}
        onConfirm={() => {
          if (!pendingLateStatusAction) {
            return;
          }

          const nextStatus = pendingLateStatusAction;
          setPendingLateStatusAction(null);
          void handleStatusUpdate(nextStatus);
        }}
      />
      <ConfirmDeleteModal
        show={showPastEditConfirmModal}
        title="Edit Past Appointment"
        body="You are editing a past event. This should only be done if information was incorrect before the appointment was completed."
        note="Proceed only if you need to correct the historical record."
        confirmLabel="Proceed to Edit"
        confirmVariant="warning"
        onCancel={() => setShowPastEditConfirmModal(false)}
        onConfirm={() => {
          setShowPastEditConfirmModal(false);
          setIsEditing(true);
        }}
      />
      <ConfirmDeleteModal
        show={showArchiveModal}
        title="Archive Appointment"
        body="Archiving removes this appointment from the visible schedule and appointment lists."
        note="Archived records can still be retrieved later if needed. Deleting permanently removes the record instead."
        confirmLabel="Archive"
        confirmVariant="warning"
        onCancel={() => setShowArchiveModal(false)}
        onConfirm={() => {
          void handleArchive();
        }}
      />
      <ConfirmDeleteModal
        show={showCancelModal}
        title="Cancel Appointment"
        body="Cancelling will change the appointment status to cancelled and keep it in the record history."
        note="Use Archive if you want to remove it from the visible schedule while keeping it retrievable."
        confirmLabel="Cancel Appointment"
        confirmVariant="danger"
        onCancel={() => setShowCancelModal(false)}
        onConfirm={() => {
          setShowCancelModal(false);
          void handleStatusUpdate("cancelled");
        }}
      />
      <ConfirmDeleteModal
        show={showDeleteModal}
        title="Delete Appointment"
        body="Deleting permanently removes this appointment from the system."
        note="If you only want to hide it from the visible schedule, choose Archive instead. Archived appointments can still be retrieved later if needed."
        confirmLabel="Delete Permanently"
        confirmVariant="danger"
        onCancel={() => setShowDeleteModal(false)}
        onConfirm={() => {
          setShowDeleteModal(false);
          void handleDelete();
        }}
      />
      <Modal show={showNewNoteModal} onHide={closeNewNoteModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>New Appointment Note</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {noteError && <Alert variant="danger" className="mb-3">{noteError}</Alert>}
          <Form.Group className="mb-3">
            <Form.Label>Visibility</Form.Label>
            <Form.Select value={noteVisibility} onChange={(event) => setNoteVisibility(event.target.value as NoteVisibility)}>
              <option value="internal">Internal only</option>
              <option value="client">Client-facing</option>
            </Form.Select>
          </Form.Group>
          <Form.Group>
            <Form.Label>Note</Form.Label>
            <Form.Control as="textarea" rows={4} value={noteText} onChange={(event) => setNoteText(event.target.value)} placeholder="Add an appointment note..." />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={closeNewNoteModal}>Cancel</Button>
          <Button variant="primary" onClick={() => void handleSaveNote()} disabled={!noteText.trim() || isSavingNote}>
            {isSavingNote && <Spinner animation="border" size="sm" className="me-2" />}
            Save Note
          </Button>
        </Modal.Footer>
      </Modal>
      <Modal show={showEditNoteModal} onHide={closeEditNoteModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>Edit Appointment Note</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {noteError && <Alert variant="danger" className="mb-3">{noteError}</Alert>}
          <Form.Group className="mb-3">
            <Form.Label>Visibility</Form.Label>
            <Form.Select value={editingNoteVisibility} onChange={(event) => setEditingNoteVisibility(event.target.value as NoteVisibility)}>
              <option value="internal">Internal only</option>
              <option value="client">Client-facing</option>
            </Form.Select>
          </Form.Group>
          <Form.Group>
            <Form.Label>Note</Form.Label>
            <Form.Control as="textarea" rows={4} value={editingNoteText} onChange={(event) => setEditingNoteText(event.target.value)} placeholder="Update this appointment note..." />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={closeEditNoteModal}>Cancel</Button>
          <Button variant="primary" onClick={() => void handleSaveEditedNote()} disabled={!editingNoteText.trim() || isSavingNote}>
            {isSavingNote && <Spinner animation="border" size="sm" className="me-2" />}
            Save Note
          </Button>
        </Modal.Footer>
      </Modal>
      <Modal show={showAllNotesModal} onHide={() => setShowAllNotesModal(false)} centered scrollable>
        <Modal.Header closeButton>
          <Modal.Title>All Appointment Notes</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {activeNotes.length === 0 && archivedNotes.length === 0 ? (
            <p className="text-muted mb-0">No appointment notes.</p>
          ) : (
            <>
              {activeNotes.length > 0 && (
                <>
                  <div className="fw-semibold mb-2">Active Notes</div>
                  <ListGroup className="compact-note-list mb-3">
                    {activeNotes.map((note) => (
                      <ListGroup.Item key={note.id}>
                        <div className="d-flex justify-content-between align-items-start gap-3">
                          <div className="client-note-item">
                            <div className="client-note-meta">
                              <span className={`note-visibility-pill note-visibility-pill-${note.visibility}`}>{note.visibility === "client" ? "Client-facing" : "Internal"}</span>
                              <span>{new Date(note.createdAt).toLocaleDateString()}</span>
                            </div>
                            <div>{note.text}</div>
                          </div>
                          <div className="note-inline-actions">
                            <button type="button" className="pet-row-indicator-button" onClick={() => openEditNoteModal(note.id, note.text, note.visibility)}><span className="pet-row-indicator">Edit</span></button>
                            <button type="button" className="pet-row-indicator-button" disabled={isSavingNote} onClick={() => { void handleNoteAction(note.id, "archive"); }}><span className="pet-row-indicator">Archive</span></button>
                            <button type="button" className="pet-row-indicator-button" disabled={isSavingNote} onClick={() => { void handleNoteAction(note.id, "delete"); }}><span className="pet-row-indicator pet-row-indicator-danger">Delete</span></button>
                          </div>
                        </div>
                      </ListGroup.Item>
                    ))}
                  </ListGroup>
                </>
              )}
              {archivedNotes.length > 0 && (
                <>
                  <div className="fw-semibold mb-2">Archived Notes</div>
                  <ListGroup className="compact-note-list">
                    {archivedNotes.map((note) => (
                      <ListGroup.Item key={note.id}>
                        <div className="d-flex justify-content-between align-items-start gap-3">
                          <div className="client-note-item">
                            <div className="client-note-meta">
                              <span className={`note-visibility-pill note-visibility-pill-${note.visibility}`}>{note.visibility === "client" ? "Client-facing" : "Internal"}</span>
                              <span>Archived {note.archivedAt ? new Date(note.archivedAt).toLocaleDateString() : ""}</span>
                            </div>
                            <div>{note.text}</div>
                          </div>
                          <div className="note-inline-actions">
                            <button type="button" className="pet-row-indicator-button" disabled={isSavingNote} onClick={() => { void handleNoteAction(note.id, "restore"); }}><span className="pet-row-indicator">Restore</span></button>
                            <button type="button" className="pet-row-indicator-button" disabled={isSavingNote} onClick={() => { void handleNoteAction(note.id, "delete"); }}><span className="pet-row-indicator pet-row-indicator-danger">Delete</span></button>
                          </div>
                        </div>
                      </ListGroup.Item>
                    ))}
                  </ListGroup>
                </>
              )}
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowAllNotesModal(false)}>Close</Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
