import { useEffect, useMemo, useState } from "react";
import { Alert, Button, Card, Dropdown, Form, ListGroup, Row, Spinner } from "react-bootstrap";
import { PencilSquare } from "react-bootstrap-icons";
import { Link, useNavigate, useParams } from "react-router-dom";
import AppointmentFormModal from "../components/appointments/AppointmentFormModal";
import AppointmentDetailsModal from "../components/appointments/AppointmentDetailsModal";
import { useAppData } from "../components/common/AppDataProvider";
import { useAppToast } from "../components/common/AppToastProvider";
import ClientContactActions from "../components/common/ClientContactActions";
import ConfirmDeleteModal from "../components/common/ConfirmDeleteModal";
import PageLoader from "../components/common/PageLoader";
import useInitialLoading from "../hooks/useInitialLoading";
import {
  addPetNote,
  archivePet,
  deletePetNoteItem,
  deletePet,
  isBackendConfigured,
  savePet,
  updatePetNote,
  type PetUpsertInput,
} from "../lib/crmApi";
import { formatPetAge, toDateInputValue } from "../lib/petAge";
import type { Appointment, NoteVisibility, Pet, Species } from "../types/models";

interface DraftPetNote {
  id: string;
  sourceNoteId?: string;
  text: string;
  visibility: NoteVisibility;
}

export default function PetDetailsPage() {
  const navigate = useNavigate();
  const { showToast } = useAppToast();
  const isLoading = useInitialLoading();
  const {
    owners,
    pets,
    appointments: allAppointments,
    setPets,
    setAppointments,
  } = useAppData();
  const { petId } = useParams();

  const initialPet = useMemo(
    () => pets.find((item) => item.id === petId) ?? null,
    [petId, pets],
  );

  const [pet, setPet] = useState<Pet | null>(initialPet);
  const [showDeletePetModal, setShowDeletePetModal] = useState(false);
  const [showArchivePetModal, setShowArchivePetModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [petAppointments, setPetAppointments] = useState<Appointment[]>([]);
  const [selectedAppointment, setSelectedAppointment] =
    useState<Appointment | null>(null);
  const [showAppointmentDetailsModal, setShowAppointmentDetailsModal] =
    useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [name, setName] = useState("");
  const [species, setSpecies] = useState<Species>("dog");
  const [breed, setBreed] = useState("");
  const [weightLbs, setWeightLbs] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [isBirthDateEstimated, setIsBirthDateEstimated] = useState(false);
  const [color, setColor] = useState("");
  const [draftNotes, setDraftNotes] = useState<DraftPetNote[]>([]);
  const [noteDraftText, setNoteDraftText] = useState("");
  const [noteDraftVisibility, setNoteDraftVisibility] = useState<NoteVisibility>("internal");
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
  const [isSavingPet, setIsSavingPet] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    setPet(initialPet);
  }, [initialPet]);

  const owner = useMemo(
    () => owners.find((item) => item.id === pet?.ownerId) ?? null,
    [owners, pet],
  );

  const appointments = useMemo(
    () => allAppointments.filter((appt) => appt.petId === petId && !appt.isArchived),
    [allAppointments, petId],
  );

  useEffect(() => {
    setPetAppointments(appointments);
  }, [appointments]);

  useEffect(() => {
    if (!pet) {
      return;
    }

    setName(pet.name);
    setSpecies(pet.species);
    setBreed(pet.breed);
    setWeightLbs(pet.weightLbs?.toString() ?? "");
    setBirthDate(toDateInputValue(pet.birthDate));
    setIsBirthDateEstimated(pet.isBirthDateEstimated ?? false);
    setColor(pet.color ?? "");
    setDraftNotes(
      pet.notes
        .filter((note) => !note.isArchived)
        .map((note) => ({
          id: `existing-${note.id}`,
          sourceNoteId: note.id,
          text: note.text,
          visibility: note.visibility,
        })),
    );
    setNoteDraftText("");
    setNoteDraftVisibility("internal");
    setEditingDraftId(null);
    setSaveError(null);
  }, [pet]);

  const resetDraftEditor = () => {
    setNoteDraftText("");
    setNoteDraftVisibility("internal");
    setEditingDraftId(null);
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
  };

  if (isLoading) {
    return <PageLoader label="Loading pet profile..." />;
  }

  if (!pet || !owner) {
    return <div>Pet not found.</div>;
  }

  const handleSavePet = async () => {
    setIsSavingPet(true);
    setSaveError(null);

    const payload: PetUpsertInput = {
      ownerId: pet.ownerId,
      name,
      species,
      breed,
      weightLbs: weightLbs ? Number(weightLbs) : undefined,
      birthDate: birthDate ? new Date(birthDate).toISOString() : undefined,
      isBirthDateEstimated,
      color,
    };

    try {
      const result = await savePet(payload, pet);
      const savedPet = result.data;
      const originalActiveNotes = pet.notes.filter((note) => !note.isArchived);
      const retainedIds = new Set(
        draftNotes
          .map((note) => note.sourceNoteId)
          .filter((noteId): noteId is string => Boolean(noteId)),
      );

      for (const existingNote of originalActiveNotes) {
        if (!retainedIds.has(existingNote.id)) {
          await deletePetNoteItem(savedPet, existingNote.id);
        }
      }

      let reconciledPet = savedPet;
      for (const draftNote of draftNotes) {
        if (draftNote.sourceNoteId) {
          const originalNote = originalActiveNotes.find((note) => note.id === draftNote.sourceNoteId);
          if (
            originalNote &&
            (originalNote.text !== draftNote.text || originalNote.visibility !== draftNote.visibility)
          ) {
            const noteResult = await updatePetNote(
              reconciledPet,
              draftNote.sourceNoteId,
              draftNote.text,
              draftNote.visibility,
            );
            reconciledPet = noteResult.data;
          }
        } else {
          const noteResult = await addPetNote(
            reconciledPet,
            draftNote.text,
            draftNote.visibility,
          );
          reconciledPet = noteResult.data;
        }
      }

      setPet(reconciledPet);
      setPets((currentPets) =>
        currentPets.map((currentPet) =>
          currentPet.id === reconciledPet.id ? reconciledPet : currentPet,
        ),
      );
      showToast({
        title: "Pet Updated",
        body:
          result.mode === "api"
            ? "Pet updated in backend."
            : "Pet changes saved in mock mode.",
        variant: "success",
      });
      setIsEditMode(false);
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "Unable to save pet changes.",
      );
    } finally {
      setIsSavingPet(false);
    }
  };

  const handleCancelEdit = () => {
    setName(pet.name);
    setSpecies(pet.species);
    setBreed(pet.breed);
    setWeightLbs(pet.weightLbs?.toString() ?? "");
    setBirthDate(toDateInputValue(pet.birthDate));
    setIsBirthDateEstimated(pet.isBirthDateEstimated ?? false);
    setColor(pet.color ?? "");
    setDraftNotes(
      pet.notes
        .filter((note) => !note.isArchived)
        .map((note) => ({
          id: `existing-${note.id}`,
          sourceNoteId: note.id,
          text: note.text,
          visibility: note.visibility,
        })),
    );
    resetDraftEditor();
    setSaveError(null);
    setIsEditMode(false);
  };

  return (
    <div>
      <div className="page-header d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3 mb-4">
        <div>
          <p className="page-kicker mb-2">Pet Profile</p>
          <h2 className="mb-1">{pet.name}</h2>
          <p className="text-muted mb-0">
            Owner:{" "}
            <Link to={`/clients/${owner.id}`}>
              {owner.firstName} {owner.lastName}
            </Link>
          </p>
        </div>

        <div className="page-actions d-flex gap-2 flex-wrap align-items-center">
          <span className={`mode-indicator${isEditMode ? " mode-indicator-edit" : ""}`}>
            {isEditMode ? "Edit Mode" : "View Mode"}
          </span>

          {isEditMode ? (
            <>
              <Button
                variant="outline-secondary"
                onClick={handleCancelEdit}
                disabled={isSavingPet}
              >
                Cancel Edit
              </Button>
              <Button
                variant="primary"
                onClick={() => void handleSavePet()}
                disabled={isSavingPet}
              >
                {isSavingPet && (
                  <Spinner animation="border" size="sm" className="me-2" />
                )}
                Save Pet
              </Button>
            </>
          ) : (
            <Dropdown align="end">
              <Dropdown.Toggle variant="outline-secondary">
                Actions
              </Dropdown.Toggle>
              <Dropdown.Menu>
                <Dropdown.Item onClick={() => setIsEditMode(true)}>
                  <PencilSquare aria-hidden="true" />
                  <span className="visually-hidden">Edit pet</span>
                </Dropdown.Item>
                <Dropdown.Item onClick={() => setShowScheduleModal(true)}>
                  Schedule Appointment
                </Dropdown.Item>
                <Dropdown.Divider />
                <Dropdown.Item onClick={() => setShowArchivePetModal(true)}>
                  Archive Pet
                </Dropdown.Item>
                <Dropdown.Item
                  className="text-danger"
                  onClick={() => setShowDeletePetModal(true)}
                >
                  Delete Pet
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
          )}
        </div>
      </div>

      <Row className="g-4">
        <div className="col-lg-5">
          <Card className="shadow-sm">
            <Card.Body>
              <Card.Title>Pet Information</Card.Title>

              {isEditMode ? (
                <>
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

                  <Form.Group className="mb-3">
                    <Form.Label>Pet Name</Form.Label>
                    <Form.Control
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                    />
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label>Species</Form.Label>
                    <Form.Select
                      value={species}
                      onChange={(event) => setSpecies(event.target.value as Species)}
                    >
                      <option value="dog">Dog</option>
                      <option value="cat">Cat</option>
                    </Form.Select>
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label>Breed</Form.Label>
                    <Form.Control
                      value={breed}
                      onChange={(event) => setBreed(event.target.value)}
                    />
                  </Form.Group>

                  <div className="row g-3">
                    <div className="col-sm-6">
                      <Form.Group>
                        <Form.Label>Weight (lbs)</Form.Label>
                        <Form.Control
                          type="number"
                          min="0"
                          step="0.1"
                          value={weightLbs}
                          onChange={(event) => setWeightLbs(event.target.value)}
                        />
                      </Form.Group>
                    </div>
                    <div className="col-sm-6">
                      <Form.Group>
                        <Form.Label>{isBirthDateEstimated ? "Estimated DOB" : "DOB"}</Form.Label>
                        <Form.Control
                          type="date"
                          value={birthDate}
                          onChange={(event) => setBirthDate(event.target.value)}
                        />
                      </Form.Group>
                    </div>
                  </div>

                  <Form.Check
                    className="mt-3"
                    type="switch"
                    id="pet-details-estimated-dob"
                    label="DOB is estimated"
                    checked={isBirthDateEstimated}
                    onChange={(event) => setIsBirthDateEstimated(event.target.checked)}
                  />

                  <Form.Group className="mt-3 mb-3">
                    <Form.Label>Color</Form.Label>
                    <Form.Control
                      value={color}
                      onChange={(event) => setColor(event.target.value)}
                    />
                  </Form.Group>

                  <div className="d-grid gap-3">
                    <div className="d-flex justify-content-between align-items-center gap-2">
                      <Form.Label className="mb-0">Pet Notes</Form.Label>
                      <Button variant="outline-secondary" size="sm" onClick={resetDraftEditor}>
                        New Note
                      </Button>
                    </div>
                    <Form.Group>
                      <Form.Control
                        as="textarea"
                        rows={3}
                        value={noteDraftText}
                        onChange={(event) => setNoteDraftText(event.target.value)}
                        placeholder="Temperament, handling notes, coat concerns..."
                      />
                    </Form.Group>
                    <Form.Group>
                      <Form.Label>Visibility</Form.Label>
                      <Form.Select
                        value={noteDraftVisibility}
                        onChange={(event) => setNoteDraftVisibility(event.target.value as NoteVisibility)}
                      >
                        <option value="internal">Internal only</option>
                        <option value="client">Client-facing</option>
                      </Form.Select>
                    </Form.Group>
                    <div className="d-flex justify-content-end gap-2">
                      {editingDraftId && (
                        <Button variant="outline-secondary" size="sm" onClick={resetDraftEditor}>
                          Cancel Edit
                        </Button>
                      )}
                      <Button variant="primary" size="sm" onClick={saveDraftNote} disabled={!noteDraftText.trim()}>
                        Save Note Card
                      </Button>
                    </div>
                    <div className="d-grid gap-2">
                      {draftNotes.length === 0 ? (
                        <div className="text-muted small">No pet notes added yet.</div>
                      ) : (
                        draftNotes.map((note) => (
                          <Card key={note.id} className="client-note-preview">
                            <Card.Body className="d-flex justify-content-between align-items-start gap-3">
                              <div className="client-note-item">
                                <div className="client-note-meta">
                                  <span className={`note-visibility-pill note-visibility-pill-${note.visibility}`}>
                                    {note.visibility === "client" ? "Client-facing" : "Internal"}
                                  </span>
                                </div>
                                <div>{note.text}</div>
                              </div>
                              <div className="note-inline-actions">
                                <button
                                  type="button"
                                  className="pet-row-indicator-button"
                                  aria-label="Edit note"
                                  onClick={() => {
                                    setEditingDraftId(note.id);
                                    setNoteDraftText(note.text);
                                    setNoteDraftVisibility(note.visibility);
                                  }}
                                >
                                  <span className="pet-row-indicator">
                                    <PencilSquare aria-hidden="true" />
                                  </span>
                                </button>
                                <button
                                  type="button"
                                  className="pet-row-indicator-button"
                                  onClick={() => {
                                    setDraftNotes((current) => current.filter((item) => item.id !== note.id));
                                    if (editingDraftId === note.id) {
                                      resetDraftEditor();
                                    }
                                  }}
                                >
                                  <span className="pet-row-indicator pet-row-indicator-danger">Remove</span>
                                </button>
                              </div>
                            </Card.Body>
                          </Card>
                        ))
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <p className="mb-1">
                    <strong>Species:</strong> {pet.species}
                  </p>
                  <p className="mb-1">
                    <strong>Breed:</strong> {pet.breed}
                  </p>
                  <p className="mb-1">
                    <strong>Weight:</strong> {pet.weightLbs ?? "—"} lbs
                  </p>
                  <p className="mb-1">
                    <strong>Age:</strong> {formatPetAge(pet, "—")}
                  </p>
                  <p className="mb-1">
                    <strong>DOB:</strong> {pet.birthDate ? toDateInputValue(pet.birthDate) : "—"}
                  </p>
                  <p className="mb-3">
                    <strong>Color:</strong> {pet.color ?? "—"}
                  </p>

                  <h6>Notes</h6>
                  {pet.notes.filter((note) => !note.isArchived).length === 0 ? (
                    <p className="text-muted mb-0">No pet notes.</p>
                  ) : (
                    <ListGroup className="compact-note-list">
                      {pet.notes
                        .filter((note) => !note.isArchived)
                        .map((note) => (
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
                </>
              )}
            </Card.Body>
          </Card>
        </div>

        <div className="col-lg-7">
          <Card className="shadow-sm mb-4">
            <Card.Body>
              <Card.Title>Owner Information</Card.Title>
              <p className="mb-1">
                <strong>Name:</strong> {owner.firstName} {owner.lastName}
              </p>
              <p className="mb-1">
                <strong>Contact:</strong>
              </p>
              <ClientContactActions phone={owner.phone} email={owner.email} stacked />
            </Card.Body>
          </Card>

          <Card className="shadow-sm">
            <Card.Body>
              <Card.Title>Pet Appointment History</Card.Title>
              {petAppointments.length === 0 ? (
                <p className="text-muted mb-0">No appointment history.</p>
              ) : (
                <ListGroup>
                  {petAppointments.map((appt) => (
                    <ListGroup.Item
                      key={appt.id}
                      action
                      onClick={() => {
                        setSelectedAppointment(appt);
                        setShowAppointmentDetailsModal(true);
                      }}
                    >
                      {new Date(appt.start).toLocaleString()} — {appt.status}
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              )}
            </Card.Body>
          </Card>
        </div>
      </Row>

      <AppointmentFormModal
        show={showScheduleModal}
        onHide={() => setShowScheduleModal(false)}
        owners={owners}
        pets={pets}
        initialOwnerId={owner.id}
        initialPetId={pet.id}
        onSaved={(appointment) => {
          setAppointments((currentAppointments) => [
            ...currentAppointments,
            appointment,
          ]);
          showToast({
            title: "Appointment Scheduled",
            body: "The appointment was created and is ready for backend persistence.",
            variant: "success",
          });
        }}
      />

      <AppointmentDetailsModal
        show={showAppointmentDetailsModal}
        onHide={() => {
          setShowAppointmentDetailsModal(false);
          setSelectedAppointment(null);
        }}
        appointment={selectedAppointment}
        owners={owners}
        pets={pets}
        onUpdated={(updatedAppointment) => {
          if (updatedAppointment.isArchived) {
            setAppointments((currentAppointments) =>
              currentAppointments.map((appointment) =>
                appointment.id === updatedAppointment.id
                  ? updatedAppointment
                  : appointment,
              ),
            );
            setPetAppointments((currentAppointments) =>
              currentAppointments.filter(
                (appointment) => appointment.id !== updatedAppointment.id,
              ),
            );
            setSelectedAppointment(null);
            setShowAppointmentDetailsModal(false);
            return;
          }

          setAppointments((currentAppointments) =>
            currentAppointments.map((appointment) =>
              appointment.id === updatedAppointment.id
                ? updatedAppointment
                : appointment,
            ),
          );
          setPetAppointments((currentAppointments) =>
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
          setPetAppointments((currentAppointments) =>
            currentAppointments.filter(
              (appointment) => appointment.id !== appointmentId,
            ),
          );
          setSelectedAppointment(null);
          setShowAppointmentDetailsModal(false);
        }}
      />

      <ConfirmDeleteModal
        show={showArchivePetModal}
        title="Archive Pet"
        body="Archiving removes this pet from active pet views and also archives its appointments and related notes."
        note="Archived pet records can still be retrieved later if needed. Deleting permanently removes the record instead."
        confirmLabel="Archive"
        confirmVariant="warning"
        onCancel={() => setShowArchivePetModal(false)}
        onConfirm={async () => {
          const result = await archivePet(pet);
          setPets((currentPets) =>
            currentPets.map((currentPet) =>
              currentPet.id === result.data.id ? result.data : currentPet,
            ),
          );
          setAppointments((currentAppointments) =>
            currentAppointments.map((appointment) =>
              appointment.petId === pet.id
                ? { ...appointment, isArchived: true, archivedAt: new Date().toISOString() }
                : appointment,
            ),
          );
          setPetAppointments((currentAppointments) =>
            currentAppointments.map((appointment) =>
              appointment.petId === pet.id
                ? { ...appointment, isArchived: true, archivedAt: new Date().toISOString() }
                : appointment,
            ),
          );
          showToast({
            title: "Pet Archived",
            body:
              result.mode === "api"
                ? "Pet archived in backend."
                : "Pet archived in mock mode.",
            variant: "warning",
          });
          setShowArchivePetModal(false);
          navigate("/pets");
        }}
      />

      <ConfirmDeleteModal
        show={showDeletePetModal}
        title="Delete Pet"
        body="Deleting permanently removes this pet from the system."
        note="If you only want to hide this pet from visible data, choose Archive instead. Archived records can still be retrieved later if needed."
        confirmLabel="Delete Permanently"
        onCancel={() => setShowDeletePetModal(false)}
        onConfirm={async () => {
          const result = await deletePet(pet);
          setPets((currentPets) =>
            currentPets.filter((currentPet) => currentPet.id !== result.data.id),
          );
          showToast({
            title: "Pet Deleted",
            body:
              result.mode === "api"
                ? "Pet deleted from backend."
                : "Pet deleted in mock mode.",
            variant: "warning",
          });
          setShowDeletePetModal(false);
          navigate("/pets");
        }}
      />
    </div>
  );
}
