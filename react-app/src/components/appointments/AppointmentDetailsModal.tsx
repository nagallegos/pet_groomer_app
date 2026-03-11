import { useEffect, useMemo, useState } from "react";
import { Alert, Badge, Button, Form, Modal, Spinner } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import {
  APPOINTMENT_SERVICE_OPTIONS,
  derivePrimaryServiceType,
  formatAppointmentServices,
  getAppointmentSelectedServices,
} from "../../lib/appointmentServices";
import {
  archiveAppointment,
  deleteAppointment,
  saveAppointment,
  updateAppointmentStatus,
} from "../../lib/crmApi";
import { useAppToast } from "../common/AppToastProvider";
import ConfirmDeleteModal from "../common/ConfirmDeleteModal";
import type {
  Appointment,
  AppointmentStatus,
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
  const [notes, setNotes] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showPastEditConfirmModal, setShowPastEditConfirmModal] = useState(false);
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
      setNotes(appointment.notes.map((note) => note.text).join("\n"));
      setSaveError(null);
      setIsEditing(false);
    }
  }, [appointment, show]);

  const customSelected = selectedServices.includes("Custom");

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

  if (!appointment || !owner || !pet) return null;

  const canEditPastAppointment = isPastAppointment && allowPastEditing;
  const showEditableFields = isEditing;

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

    const updatedAppointment = {
      ownerId: appointment.ownerId,
      petId: appointment.petId,
      start: nextStart.toISOString(),
      end: nextEnd.toISOString(),
      serviceType: derivePrimaryServiceType(selectedServices),
      selectedServices,
      customServiceType: customSelected ? customServiceType : undefined,
      cost: Number(cost) || 0,
      status,
      notes,
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
      <Modal show={show} onHide={onHide} centered size="lg">
        <Form onSubmit={handleSave}>
          <Modal.Header closeButton>
            <Modal.Title>Appointment Details</Modal.Title>
          </Modal.Header>

          <Modal.Body>
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
                <Form.Label>Cost</Form.Label>
                <Form.Control
                  type="number"
                  min="0"
                  step="0.01"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  placeholder="85.00"
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Notes</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={5}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add notes about this appointment..."
                />
              </Form.Group>
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
              <div><strong>Projected Cost:</strong> ${Number(cost || appointment.cost).toFixed(2)}</div>
              <div><strong>Notes:</strong> {notes || "No notes recorded."}</div>
            </div>
          )}

          <div className="border rounded p-3 bg-light">
            <div className="fw-semibold mb-2">Client Contact Info</div>
            <div>
              <strong>Phone:</strong> {owner.phone}
            </div>
            <div>
              <strong>Email:</strong> {owner.email}
            </div>
          </div>
          </Modal.Body>

          <Modal.Footer className="justify-content-between">
            <div className="d-flex gap-2 flex-wrap">
              {isPastAppointment && !canEditPastAppointment ? (
                <Button
                  variant="outline-primary"
                  onClick={() => {
                    onHide();
                    navigate(`/appointments/history?appointmentId=${appointment.id}`);
                  }}
                >
                  View on Appointment History
                </Button>
              ) : !showEditableFields ? (
                <Button
                  variant="outline-primary"
                  onClick={() => {
                    if (isPastAppointment) {
                      setShowPastEditConfirmModal(true);
                      return;
                    }

                    setIsEditing(true);
                  }}
                >
                  Edit Appointment
                </Button>
              ) : (
                <>
                  <Button
                    variant="outline-success"
                    onClick={() => handleStatusUpdate("confirmed")}
                    disabled={isSaving}
                  >
                    Mark Confirmed
                  </Button>
                  <Button
                    variant="outline-secondary"
                    onClick={() => handleStatusUpdate("completed")}
                    disabled={isSaving}
                  >
                    Mark Completed
                  </Button>
                  <Button
                    variant="warning"
                    className="action-button-wide"
                    onClick={() => setShowArchiveModal(true)}
                    disabled={isSaving}
                  >
                    Archive Appointment
                  </Button>
                  <Button
                    variant="outline-danger"
                    onClick={() => setShowCancelModal(true)}
                    disabled={isSaving}
                  >
                    Cancel Appointment
                  </Button>
                  <Button
                    variant="outline-danger"
                    className="icon-action-button"
                    onClick={() => setShowDeleteModal(true)}
                    disabled={isSaving}
                    aria-label="Delete appointment"
                    title="Delete appointment"
                  >
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 16 16"
                      fill="currentColor"
                      width="16"
                      height="16"
                    >
                      <path d="M6.5 1h3l.5 1H13a.5.5 0 0 1 0 1h-.6l-.7 9.1A2 2 0 0 1 9.7 14H6.3a2 2 0 0 1-2-1.9L3.6 3H3a.5.5 0 0 1 0-1h3zm-1.2 2 .7 9.1a1 1 0 0 0 1 .9h3.4a1 1 0 0 0 1-.9L10.7 3zM6 5a.5.5 0 0 1 .5.5v5a.5.5 0 0 1-1 0v-5A.5.5 0 0 1 6 5m4.5.5v5a.5.5 0 0 1-1 0v-5a.5.5 0 0 1 1 0M8 5a.5.5 0 0 1 .5.5v5a.5.5 0 0 1-1 0v-5A.5.5 0 0 1 8 5" />
                    </svg>
                  </Button>
                </>
              )}
            </div>

            <div className="d-flex gap-2">
              <Button variant="secondary" onClick={onHide}>
                Close
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={isSaving || !showEditableFields}
              >
                {isSaving && (
                  <Spinner animation="border" size="sm" className="me-2" />
                )}
                {showEditableFields ? "Save Changes" : "View Mode"}
              </Button>
            </div>
          </Modal.Footer>
        </Form>
      </Modal>
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
    </>
  );
}
