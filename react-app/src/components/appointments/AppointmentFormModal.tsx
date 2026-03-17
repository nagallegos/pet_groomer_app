import { useEffect, useMemo, useState } from "react";
import { Alert, Button, Card, Form, Modal, Spinner } from "react-bootstrap";
import { useAppToast } from "../common/AppToastProvider";
import {
  APPOINTMENT_SERVICE_OPTIONS,
  derivePrimaryServiceType,
} from "../../lib/appointmentServices";
import {
  addAppointmentNote,
  isBackendConfigured,
  saveAppointment,
} from "../../lib/crmApi";
import type { Appointment, NoteVisibility, Owner, Pet } from "../../types/models";

interface DraftAppointmentNote {
  id: string;
  text: string;
  visibility: NoteVisibility;
}

interface AppointmentFormModalProps {
  show: boolean;
  onHide: () => void;
  owners: Owner[];
  pets: Pet[];
  lockedOwnerId?: string;
  lockedPetId?: string;
  initialOwnerId?: string;
  initialPetId?: string;
  initialDate?: string;
  initialStartTime?: string;
  initialEndTime?: string;
  onSaved?: (appointment: Appointment) => void;
}

export default function AppointmentFormModal({
  show,
  onHide,
  owners,
  pets,
  lockedOwnerId,
  lockedPetId,
  initialOwnerId = "",
  initialPetId = "",
  initialDate = "",
  initialStartTime = "",
  initialEndTime = "",
  onSaved,
}: AppointmentFormModalProps) {
  const { showToast } = useAppToast();
  const [ownerId, setOwnerId] = useState(initialOwnerId);
  const [petId, setPetId] = useState(initialPetId);
  const [date, setDate] = useState(initialDate);
  const [startTime, setStartTime] = useState(initialStartTime);
  const [endTime, setEndTime] = useState(initialEndTime);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [customServiceType, setCustomServiceType] = useState("");
  const [quotePrice, setQuotePrice] = useState("");
  const [draftNotes, setDraftNotes] = useState<DraftAppointmentNote[]>([]);
  const [noteDraftText, setNoteDraftText] = useState("");
  const [noteDraftVisibility, setNoteDraftVisibility] = useState<NoteVisibility>("internal");
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (show) {
      setOwnerId(initialOwnerId);
      setPetId(initialPetId);
      setDate(initialDate);
      setStartTime(initialStartTime);
      setEndTime(initialEndTime);
      setSelectedServices([]);
      setCustomServiceType("");
      setQuotePrice("");
      setDraftNotes([]);
      setNoteDraftText("");
      setNoteDraftVisibility("internal");
      setEditingDraftId(null);
      setShowNoteModal(false);
      setSaveError(null);
    }
  }, [
    show,
    initialOwnerId,
    initialPetId,
    initialDate,
    initialStartTime,
    initialEndTime,
  ]);

  const activeOwners = useMemo(
    () => owners.filter((owner) => !owner.isArchived),
    [owners],
  );
  const lockedOwner = useMemo(
    () =>
      lockedOwnerId
        ? activeOwners.find((owner) => owner.id === lockedOwnerId) ?? null
        : null,
    [activeOwners, lockedOwnerId],
  );
  const lockedPet = useMemo(
    () =>
      lockedPetId
        ? pets.find((pet) => pet.id === lockedPetId && !pet.isArchived) ?? null
        : null,
    [lockedPetId, pets],
  );

  const availablePets = useMemo(() => {
    if (!ownerId) return [];
    return pets.filter((pet) => pet.ownerId === ownerId && !pet.isArchived);
  }, [ownerId, pets]);

  const customSelected = selectedServices.includes("Custom");

  const resetDraftEditor = () => {
    setNoteDraftText("");
    setNoteDraftVisibility("internal");
    setEditingDraftId(null);
  };

  const openNoteModal = (note?: DraftAppointmentNote) => {
    if (note) {
      setEditingDraftId(note.id);
      setNoteDraftText(note.text);
      setNoteDraftVisibility(note.visibility);
    } else {
      resetDraftEditor();
    }
    setShowNoteModal(true);
  };

  const closeNoteModal = () => {
    setShowNoteModal(false);
    resetDraftEditor();
  };

  const saveDraftNote = () => {
    const trimmed = noteDraftText.trim();
    if (!trimmed) {
      return;
    }

    if (editingDraftId) {
      setDraftNotes((current) =>
        current.map((note) =>
          note.id === editingDraftId
            ? { ...note, text: trimmed, visibility: noteDraftVisibility }
            : note,
        ),
      );
    } else {
      setDraftNotes((current) => [
        ...current,
        {
          id: `draft-${Date.now()}`,
          text: trimmed,
          visibility: noteDraftVisibility,
        },
      ]);
    }

    resetDraftEditor();
    setShowNoteModal(false);
  };

  const deleteDraftNote = () => {
    if (!editingDraftId) {
      return;
    }
    setDraftNotes((current) => current.filter((note) => note.id !== editingDraftId));
    resetDraftEditor();
    setShowNoteModal(false);
  };

  const toggleService = (service: string) => {
    setSelectedServices((currentServices) =>
      currentServices.includes(service)
        ? currentServices.filter((currentService) => currentService !== service)
        : [...currentServices, service],
    );
  };

  const handleSubmit = async (event: React.SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setSaveError(null);

    const start = new Date(`${date}T${startTime}:00`);
    const end = new Date(`${date}T${endTime}:00`);

    if (end <= start) {
      setSaveError("End time must be after start time.");
      setIsSaving(false);
      return;
    }

    const payload = {
      ownerId,
      petId,
      start: start.toISOString(),
      end: end.toISOString(),
      serviceType: derivePrimaryServiceType(selectedServices),
      selectedServices,
      customServiceType: customSelected ? customServiceType : undefined,
      quotePrice: Number(quotePrice) || 0,
      paymentStatus: "unpaid" as const,
      status: "scheduled" as const,
    };

    try {
      const result = await saveAppointment(payload);
      let reconciledAppointment = result.data;
      for (const note of draftNotes) {
        const noteResult = await addAppointmentNote(
          reconciledAppointment,
          note.text,
          note.visibility,
        );
        reconciledAppointment = noteResult.data;
      }
      showToast({
        title: "Appointment Saved",
        body:
          result.mode === "api"
            ? "Appointment saved to backend."
            : "Appointment saved in mock mode. Connect the API later to persist changes.",
        variant: "success",
      });
      onSaved?.(reconciledAppointment);
      onHide();
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "Unable to save appointment.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
    <Modal show={show} onHide={onHide} centered fullscreen="sm-down">
      <Form onSubmit={handleSubmit} className="modal-form-shell">
        <Modal.Header closeButton>
          <div className="w-100 d-flex justify-content-between align-items-start gap-3">
            <div>
              <Modal.Title>Schedule Appointment</Modal.Title>
              <span className="mode-indicator mode-indicator-edit">Create Appointment</span>
            </div>
          </div>
        </Modal.Header>

        <Modal.Body>
          {!isBackendConfigured() && (
            <Alert variant="info" className="mb-3">
              Backend not configured yet. Saves are currently local UI previews only.
            </Alert>
          )}

          {saveError && (
            <Alert variant="danger" className="mb-3">
              {saveError}
            </Alert>
          )}

          <Form.Group className="mb-3" controlId="clientSelect">
            <Form.Label id="clientLabel">Client</Form.Label>
            {lockedOwner ? (
              <>
                <Form.Control
                  value={`${lockedOwner.firstName} ${lockedOwner.lastName}`}
                  readOnly
                  aria-labelledby="clientLabel"
                />
                <Form.Text muted>
                  This appointment will be scheduled for this client.
                </Form.Text>
              </>
            ) : (
              <Form.Select
                value={ownerId}
                onChange={(e) => {
                  setOwnerId(e.target.value);
                  setPetId("");
                }}
                required
                aria-labelledby="clientLabel"
              >
                <option value="">Select a client</option>
                {activeOwners.map((owner) => (
                  <option key={owner.id} value={owner.id}>
                    {owner.firstName} {owner.lastName}
                  </option>
                ))}
              </Form.Select>
            )}
          </Form.Group>

          <Form.Group className="mb-3" controlId="petSelect">
            <Form.Label id="petLabel">Pet</Form.Label>
            <Form.Select
              value={petId}
              onChange={(e) => setPetId(e.target.value)}
              required
              disabled={!ownerId || !!lockedPet}
              aria-labelledby="petLabel"
            >
              <option value="">Select a pet</option>
              {availablePets.map((pet) => (
                <option key={pet.id} value={pet.id}>
                  {pet.name} — {pet.breed}
                </option>
              ))}
            </Form.Select>
            {lockedPet && (
              <Form.Text muted>
                This appointment is locked to this pet from the current page.
              </Form.Text>
            )}
          </Form.Group>

          <div className="row g-3">
            <div className="col-sm-6">
              <Form.Group>
                <Form.Label id="dateLabel">Date</Form.Label>
                <Form.Control
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  title="Select appointment date"
                  aria-labelledby="dateLabel"
                />
              </Form.Group>
            </div>
            <div className="col-sm-3 col-6">
              <Form.Group>
                <Form.Label id="startTimeLabel">Start Time</Form.Label>
                <Form.Control
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                  title="Select appointment start time"
                  aria-labelledby="startTimeLabel"
                />
              </Form.Group>
            </div>
            <div className="col-sm-3 col-6">
              <Form.Group>
                <Form.Label id="endTimeLabel">End Time</Form.Label>
                <Form.Control
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  required
                  title="Select appointment end time"
                  aria-labelledby="endTimeLabel"
                />
              </Form.Group>
            </div>
          </div>

          <Form.Group className="mt-3 mb-3">
            <Form.Label id="serviceTypeLabel">Services</Form.Label>
            <div
              className="service-option-grid"
              role="group"
              aria-labelledby="serviceTypeLabel"
            >
              {APPOINTMENT_SERVICE_OPTIONS.map((service) => (
                <Form.Check
                  key={service}
                  type="checkbox"
                  id={`service-${service}`}
                  label={service}
                  checked={selectedServices.includes(service)}
                  onChange={() => toggleService(service)}
                />
              ))}
            </div>
          </Form.Group>

          {customSelected && (
            <Form.Group className="mb-3">
              <Form.Label id="customServiceTypeLabel">Custom Service</Form.Label>
              <Form.Control
                type="text"
                value={customServiceType}
                onChange={(e) => setCustomServiceType(e.target.value)}
                placeholder="Describe the custom service"
                title="Enter custom service type"
                aria-labelledby="customServiceTypeLabel"
              />
            </Form.Group>
          )}

          <Form.Group className="mb-3">
            <Form.Label id="costLabel" className="appointment-cost-highlight">Quote</Form.Label>
            <Form.Control
              type="number"
              min="0"
              step="0.01"
              value={quotePrice}
              onChange={(e) => setQuotePrice(e.target.value)}
              placeholder="85.00"
              title="Enter internal appointment quote"
              aria-labelledby="costLabel"
              className="appointment-cost-input"
            />
            <Form.Text muted>
              This quote is internal only and is not shown in the client portal.
            </Form.Text>
          </Form.Group>

          <div className="d-grid gap-3">
            <div className="d-flex justify-content-between align-items-center gap-2">
              <Form.Label id="notesLabel" className="mb-0">Appointment Notes</Form.Label>
              <Button variant="outline-secondary" size="sm" onClick={() => openNoteModal()}>
                Add Note
              </Button>
            </div>
            <div className="d-grid gap-2">
              {draftNotes.length === 0 ? (
                <div className="text-muted small">No appointment notes added yet.</div>
              ) : (
                draftNotes.map((note) => (
                  <Card
                    key={note.id}
                    className="note-card"
                    onClick={() => openNoteModal(note)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        openNoteModal(note);
                      }
                    }}
                  >
                    <Card.Body className="d-grid gap-2">
                      <div className="note-card-meta">
                        <span className={`note-visibility-pill note-visibility-pill-${note.visibility}`}>
                          {note.visibility === "client" ? "Client-facing" : "Internal"}
                        </span>
                      </div>
                      <div className="note-card-text">{note.text}</div>
                    </Card.Body>
                  </Card>
                ))
              )}
            </div>
          </div>
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={onHide}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isSaving}>
            {isSaving && (
              <Spinner animation="border" size="sm" className="me-2" />
            )}
            Save Appointment
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
    <Modal show={showNoteModal} onHide={closeNoteModal} centered>
      <Modal.Header closeButton>
        <Modal.Title>{editingDraftId ? "Edit Appointment Note" : "New Appointment Note"}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form.Group className="mb-3">
          <Form.Label>Note</Form.Label>
          <Form.Control
            as="textarea"
            rows={4}
            value={noteDraftText}
            onChange={(e) => setNoteDraftText(e.target.value)}
            placeholder="Add grooming notes or instructions..."
          />
        </Form.Group>
        <Form.Group>
          <Form.Label>Visibility</Form.Label>
          <Form.Select
            value={noteDraftVisibility}
            onChange={(e) => setNoteDraftVisibility(e.target.value as NoteVisibility)}
          >
            <option value="internal">Internal only</option>
            <option value="client">Client-facing</option>
          </Form.Select>
        </Form.Group>
      </Modal.Body>
      <Modal.Footer>
        {editingDraftId && (
          <Button variant="outline-danger" onClick={deleteDraftNote}>
            Delete
          </Button>
        )}
        <Button variant="outline-secondary" onClick={closeNoteModal}>
          Cancel
        </Button>
        <Button variant="primary" onClick={saveDraftNote} disabled={!noteDraftText.trim()}>
          Save Note
        </Button>
      </Modal.Footer>
    </Modal>
    </>
  );
}
