import { useEffect, useMemo, useState } from "react";
import { Alert, Button, Card, Dropdown, Form, ListGroup, Modal, Spinner } from "react-bootstrap";
import { PencilSquare } from "react-bootstrap-icons";
import { useNavigate } from "react-router-dom";
import AppointmentFormModal from "../appointments/AppointmentFormModal";
import { useAppData } from "../common/AppDataProvider";
import {
  addPetNote,
  archivePet,
  archivePetNote,
  deletePet,
  deletePetNoteItem,
  isBackendConfigured,
  savePet,
  unarchivePetNote,
  updatePetNote,
  type PetUpsertInput,
} from "../../lib/crmApi";
import { formatAppointmentServices } from "../../lib/appointmentServices";
import { getNotePostedByLabel } from "../../lib/noteUtils";
import {
  getDetailedBreedLabel,
  getPetBreedList,
  MAX_PET_BREEDS,
  normalizeBreedList,
  serializeBreedList,
} from "../../lib/petBreeds";
import { formatPetAge, toDateInputValue } from "../../lib/petAge";
import { useAppToast } from "../common/AppToastProvider";
import ClientContactActions from "../common/ClientContactActions";
import ConfirmDeleteModal from "../common/ConfirmDeleteModal";
import type { Appointment, NoteVisibility, Owner, Pet, Species } from "../../types/models";

interface PetQuickViewModalProps {
  show: boolean;
  pet: Pet | null;
  owner: Owner | null;
  appointments: Appointment[];
  onHide: () => void;
  onBack?: () => void;
  allowPageNavigation?: boolean;
  returnToParentOnSave?: boolean;
  onPetUpdated?: (pet: Pet) => void;
  onPetArchived?: (pet: Pet) => void;
  onPetDeleted?: (petId: string) => void;
}

export default function PetQuickViewModal({
  show,
  pet,
  owner,
  appointments,
  onHide,
  onBack,
  allowPageNavigation = true,
  returnToParentOnSave = false,
  onPetUpdated,
  onPetArchived,
  onPetDeleted,
}: PetQuickViewModalProps) {
  const navigate = useNavigate();
  const { showToast } = useAppToast();
  const { setAppointments } = useAppData();
  const [isEditing, setIsEditing] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [name, setName] = useState("");
  const [species, setSpecies] = useState<Species>("dog");
  const [breeds, setBreeds] = useState<string[]>([""]);
  const [weightLbs, setWeightLbs] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [isBirthDateEstimated, setIsBirthDateEstimated] = useState(false);
  const [color, setColor] = useState("");
  const [noteText, setNoteText] = useState("");
  const [noteVisibility, setNoteVisibility] = useState<NoteVisibility>("internal");
  const [noteError, setNoteError] = useState<string | null>(null);
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [showUnsavedChangesModal, setShowUnsavedChangesModal] = useState(false);
  const [showNewNoteModal, setShowNewNoteModal] = useState(false);
  const [showAllNotesModal, setShowAllNotesModal] = useState(false);
  const [showEditNoteModal, setShowEditNoteModal] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteText, setEditingNoteText] = useState("");
  const [editingNoteVisibility, setEditingNoteVisibility] = useState<NoteVisibility>("internal");

  useEffect(() => {
    if (!show || !pet) {
      return;
    }

    setName(pet.name);
    setSpecies(pet.species);
    setBreeds(getPetBreedList(pet).length > 0 ? getPetBreedList(pet) : [""]);
    setWeightLbs(pet.weightLbs?.toString() ?? "");
    setBirthDate(toDateInputValue(pet.birthDate));
    setIsBirthDateEstimated(pet.isBirthDateEstimated ?? false);
    setColor(pet.color ?? "");
    setNoteText("");
    setNoteVisibility("internal");
    setNoteError(null);
    setShowEditNoteModal(false);
    setShowNewNoteModal(false);
    setShowAllNotesModal(false);
    setEditingNoteId(null);
    setEditingNoteText("");
    setEditingNoteVisibility("internal");
    setIsEditing(false);
    setSaveError(null);
  }, [pet, show]);

  const activeNotes = useMemo(() => pet?.notes.filter((note) => !note.isArchived) ?? [], [pet]);
  const archivedNotes = useMemo(() => pet?.notes.filter((note) => note.isArchived) ?? [], [pet]);
  const previewNotes = useMemo(() => activeNotes.slice(0, 3), [activeNotes]);

  if (!pet) return null;

  const hasUnsavedChanges =
    name !== pet.name ||
    species !== pet.species ||
    serializeBreedList(breeds) !== serializeBreedList(getPetBreedList(pet)) ||
    weightLbs !== (pet.weightLbs?.toString() ?? "") ||
    birthDate !== toDateInputValue(pet.birthDate) ||
    isBirthDateEstimated !== (pet.isBirthDateEstimated ?? false) ||
    color !== (pet.color ?? "");

  const savePetChanges = async () => {
    setIsSaving(true);
    setSaveError(null);

    const normalizedBreeds = normalizeBreedList(breeds);
    if (normalizedBreeds.length === 0) {
      setSaveError("Please add at least one breed.");
      setIsSaving(false);
      return null;
    }

    const payload: PetUpsertInput = {
      ownerId: pet.ownerId,
      name,
      species,
      breed: serializeBreedList(normalizedBreeds),
      weightLbs: weightLbs ? Number(weightLbs) : undefined,
      birthDate: birthDate ? new Date(birthDate).toISOString() : undefined,
      isBirthDateEstimated,
      color,
    };

    try {
      const result = await savePet(payload, pet);
      onPetUpdated?.(result.data);
      showToast({
        title: "Pet Updated",
        body:
          result.mode === "api"
            ? "Pet updated in backend."
            : "Pet changes saved in mock mode.",
        variant: "success",
      });
      setIsEditing(false);
      if (returnToParentOnSave) {
        onBack?.();
      }
      return result.data;
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Unable to save pet changes.");
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    await savePetChanges();
  };

  const navigateToPetPage = () => {
    onHide();
    navigate(`/pets/${pet.id}`);
  };

  const handlePetPageClick = () => {
    if (isEditing && hasUnsavedChanges) {
      setShowUnsavedChangesModal(true);
      return;
    }

    navigateToPetPage();
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
      const result = await addPetNote(pet, noteText.trim(), noteVisibility);
      onPetUpdated?.(result.data);
      closeNewNoteModal();
      showToast({
        title: "Note Added",
        body: "The pet note was saved successfully.",
        variant: "success",
      });
    } catch (error) {
      setNoteError(error instanceof Error ? error.message : "Unable to save note.");
    } finally {
      setIsSavingNote(false);
    }
  };

  const handleNoteAction = async (noteId: string, action: "archive" | "restore" | "delete") => {
    setIsSavingNote(true);
    setNoteError(null);

    try {
      const result =
        action === "archive"
          ? await archivePetNote(pet, noteId)
          : action === "restore"
            ? await unarchivePetNote(pet, noteId)
            : await deletePetNoteItem(pet, noteId);
      onPetUpdated?.(result.data);
      if (editingNoteId === noteId) {
        resetNoteEditor();
      }
      showToast({
        title: action === "archive" ? "Note Archived" : action === "restore" ? "Note Restored" : "Note Deleted",
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
      const result = await updatePetNote(pet, editingNoteId, editingNoteText.trim(), editingNoteVisibility);
      onPetUpdated?.(result.data);
      closeEditNoteModal();
      showToast({
        title: "Note Updated",
        body: "The pet note was saved successfully.",
        variant: "success",
      });
    } catch (error) {
      setNoteError(error instanceof Error ? error.message : "Unable to save note.");
    } finally {
      setIsSavingNote(false);
    }
  };

  const updateBreed = (index: number, value: string) => {
    setBreeds((current) => current.map((breed, breedIndex) => (breedIndex === index ? value : breed)));
  };

  const addBreed = () => {
    setBreeds((current) => [...current, ""]);
  };

  const removeBreed = (index: number) => {
    setBreeds((current) => {
      const next = current.filter((_, breedIndex) => breedIndex !== index);
      return next.length > 0 ? next : [""];
    });
  };

  return (
    <Modal show={show} onHide={onHide} centered fullscreen="sm-down">
      <Form onSubmit={handleSave} className="modal-form-shell">
        <Modal.Header closeButton>
          <div className="w-100 d-flex justify-content-between align-items-start gap-3">
            <div>
              <Modal.Title>{isEditing ? "Edit Pet" : pet.name}</Modal.Title>
              <span className={`mode-indicator${isEditing ? " mode-indicator-edit" : ""}`}>
                {isEditing ? "Edit Mode" : "View Mode"}
              </span>
            </div>

            {!isEditing && (
              <Dropdown align="end">
                <Dropdown.Toggle variant="outline-secondary" size="sm">
                  Actions
                </Dropdown.Toggle>
                <Dropdown.Menu>
                  <Dropdown.Item onClick={() => setIsEditing(true)}>
                    <PencilSquare aria-hidden="true" />
                    <span className="visually-hidden">Edit pet</span>
                  </Dropdown.Item>
                  {owner && (
                    <Dropdown.Item onClick={() => setShowScheduleModal(true)}>
                      Schedule Appointment
                    </Dropdown.Item>
                  )}
                  {allowPageNavigation && (
                    <Dropdown.Item onClick={handlePetPageClick}>
                      Pet Page
                    </Dropdown.Item>
                  )}
                  {allowPageNavigation && owner && (
                    <Dropdown.Item
                      onClick={() => {
                        onHide();
                        navigate(`/clients/${owner.id}`);
                      }}
                    >
                      Client Page
                    </Dropdown.Item>
                  )}
                  <Dropdown.Divider />
                  <Dropdown.Item onClick={() => setShowArchiveModal(true)}>
                    Archive Pet
                  </Dropdown.Item>
                  <Dropdown.Item className="text-danger" onClick={() => setShowDeleteModal(true)}>
                    Delete Pet
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
            )}
          </div>
        </Modal.Header>

        <Modal.Body>
          {isEditing ? (
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
                  required
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
                <div className="d-flex justify-content-between align-items-center gap-2 mb-2">
                  <Form.Label className="mb-0">Breeds</Form.Label>
                  <Button
                    type="button"
                    variant="outline-secondary"
                    size="sm"
                    onClick={addBreed}
                  >
                    Add Breed
                  </Button>
                </div>
                <div className="d-grid gap-2">
                  {breeds.map((breed, index) => (
                    <div key={`breed-${index}`} className="d-flex gap-2 align-items-start">
                      <Form.Control
                        value={breed}
                        onChange={(event) => updateBreed(index, event.target.value)}
                        placeholder={`Breed ${index + 1}`}
                        required={index === 0}
                      />
                      {breeds.length > 1 && (
                        <Button
                          type="button"
                          variant="outline-danger"
                          onClick={() => removeBreed(index)}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
                <Form.Text muted>
                  Add as many breeds as needed. Compact views show up to {MAX_PET_BREEDS} breeds, then switch to mix.
                </Form.Text>
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
                id="pet-quick-estimated-dob"
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

              <div>
                <div className="d-flex justify-content-between align-items-center gap-2 mb-2">
                  <Form.Label className="mb-0">Pet Notes</Form.Label>
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
                  <p className="text-muted mb-0">No active pet notes.</p>
                ) : (
                  <div className="d-grid gap-2">
                    {previewNotes.map((note) => (
                      <Card
                        key={note.id}
                        className="note-card"
                        onClick={() => openEditNoteModal(note.id, note.text, note.visibility)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            openEditNoteModal(note.id, note.text, note.visibility);
                          }
                        }}
                      >
                        <Card.Body className="d-grid gap-2">
                          <div className="note-card-meta">
                            <span className={`note-visibility-pill note-visibility-pill-${note.visibility}`}>
                              {note.visibility === "client" ? "Client-facing" : "Internal"}
                            </span>
                            {getNotePostedByLabel(note) && <span>{getNotePostedByLabel(note)}</span>}
                            <span>{new Date(note.createdAt).toLocaleDateString()}</span>
                            {note.updatedAt && (
                              <span>Updated {new Date(note.updatedAt).toLocaleDateString()}</span>
                            )}
                          </div>
                          <div className="note-card-text">{note.text}</div>
                        </Card.Body>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
              <p className="text-muted small mt-3 mb-0">
                Use the pet page for the full pet profile experience.
              </p>
            </>
          ) : (
            <>
              <div className="mb-4">
                <h6>Pet Information</h6>
                <p className="mb-1">
                  <strong>Species:</strong> {pet.species}
                </p>
                <p className="mb-1">
                  <strong>Breed:</strong> {getDetailedBreedLabel(pet)}
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
                <p className="mb-0">
                  <strong>Color:</strong> {pet.color ?? "—"}
                </p>
              </div>

              <div className="mb-4">
                <h6>Owner</h6>
                {owner ? (
                  <>
                    <p className="mb-1">
                      <strong>Name:</strong> {owner.firstName} {owner.lastName}
                    </p>
                    <p className="mb-1">
                      <strong>Contact:</strong>
                    </p>
                    <ClientContactActions phone={owner.phone} email={owner.email} stacked />
                  </>
                ) : (
                  <p className="text-muted mb-0">Owner information unavailable.</p>
                )}
              </div>

              <div className="mb-4">
                <h6>Notes</h6>
                {activeNotes.length === 0 ? (
                  <p className="text-muted mb-0">No pet notes.</p>
                ) : (
                  <div className="d-grid gap-2">
                    {activeNotes.map((note) => (
                      <Card
                        key={note.id}
                        className="note-card"
                        onClick={() => openEditNoteModal(note.id, note.text, note.visibility)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            openEditNoteModal(note.id, note.text, note.visibility);
                          }
                        }}
                      >
                        <Card.Body className="d-grid gap-2">
                          <div className="note-card-meta">
                            <span className={`note-visibility-pill note-visibility-pill-${note.visibility}`}>
                              {note.visibility === "client" ? "Client-facing" : "Internal"}
                            </span>
                            {getNotePostedByLabel(note) && <span>{getNotePostedByLabel(note)}</span>}
                            <span>{new Date(note.createdAt).toLocaleDateString()}</span>
                          </div>
                          <div className="note-card-text">{note.text}</div>
                        </Card.Body>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h6>Appointment History</h6>
                {appointments.length === 0 ? (
                  <p className="text-muted mb-0">No appointments yet.</p>
                ) : (
                  <ListGroup>
                    {appointments.map((appointment) => (
                      <ListGroup.Item key={appointment.id}>
                        {new Date(appointment.start).toLocaleString()} —{" "}
                        {formatAppointmentServices(appointment)} — {appointment.status}
                      </ListGroup.Item>
                    ))}
                  </ListGroup>
                )}
              </div>
            </>
          )}
        </Modal.Body>

        <Modal.Footer>
          {onBack && !isEditing && (
            <Button variant="outline-secondary" onClick={onBack}>
              Back
            </Button>
          )}

          {isEditing ? (
            <>
              {allowPageNavigation && (
                <Button
                  variant="outline-secondary"
                  onClick={handlePetPageClick}
                  disabled={isSaving}
                >
                  Pet Page
                </Button>
              )}
              <Button
                variant="outline-secondary"
                onClick={() => {
                  setIsEditing(false);
                  setSaveError(null);
                }}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={isSaving}>
                {isSaving && <Spinner animation="border" size="sm" className="me-2" />}
                Save
              </Button>
            </>
          ) : (
            !onBack && (
              <Button variant="secondary" onClick={onHide}>
                Close
              </Button>
            )
          )}
        </Modal.Footer>
      </Form>

      <ConfirmDeleteModal
        show={showArchiveModal}
        title="Archive Pet"
        body="Archiving removes this pet from active pet views and also archives its appointments and related notes."
        note="Archived pet records can still be retrieved later if needed. Deleting permanently removes the record instead."
        confirmLabel="Archive"
        confirmVariant="warning"
        onCancel={() => setShowArchiveModal(false)}
        onConfirm={async () => {
          const result = await archivePet(pet);
          showToast({
            title: "Pet Archived",
            body:
              result.mode === "api"
                ? "Pet archived in backend."
                : "Pet archived in mock mode.",
            variant: "warning",
          });
          onPetArchived?.(result.data);
          setShowArchiveModal(false);
          onHide();
        }}
      />

      <ConfirmDeleteModal
        show={showDeleteModal}
        title="Delete Pet"
        body="Deleting permanently removes this pet from the system."
        note="If you only want to hide this pet from visible data, choose Archive instead. Archived records can still be retrieved later if needed."
        confirmLabel="Delete Permanently"
        onCancel={() => setShowDeleteModal(false)}
        onConfirm={async () => {
          const result = await deletePet(pet);
          showToast({
            title: "Pet Deleted",
            body:
              result.mode === "api"
                ? "Pet deleted in backend."
                : "Pet deleted in mock mode.",
            variant: "warning",
          });
          onPetDeleted?.(pet.id);
          setShowDeleteModal(false);
          onHide();
        }}
      />

      <Modal show={showEditNoteModal} onHide={closeEditNoteModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>Edit Pet Note</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {noteError && (
            <Alert variant="danger" className="mb-3">
              {noteError}
            </Alert>
          )}
          <Form.Group className="mb-3">
            <Form.Label>Note</Form.Label>
            <Form.Control
              as="textarea"
              rows={4}
              value={editingNoteText}
              onChange={(event) => setEditingNoteText(event.target.value)}
              placeholder="Update this pet note..."
            />
          </Form.Group>
          <Form.Group>
            <Form.Label>Visibility</Form.Label>
            <Form.Select
              value={editingNoteVisibility}
              onChange={(event) => setEditingNoteVisibility(event.target.value as NoteVisibility)}
            >
              <option value="internal">Internal only</option>
              <option value="client">Client-facing</option>
            </Form.Select>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={closeEditNoteModal}>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => void handleSaveEditedNote()} disabled={!editingNoteText.trim() || isSavingNote}>
            {isSavingNote && <Spinner animation="border" size="sm" className="me-2" />}
            Save Note
          </Button>
        </Modal.Footer>
      </Modal>
      <Modal show={showNewNoteModal} onHide={closeNewNoteModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>New Pet Note</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {noteError && (
            <Alert variant="danger" className="mb-3">
              {noteError}
            </Alert>
          )}
          <Form.Group className="mb-3">
            <Form.Label>Visibility</Form.Label>
            <Form.Select
              value={noteVisibility}
              onChange={(event) => setNoteVisibility(event.target.value as NoteVisibility)}
            >
              <option value="internal">Internal only</option>
              <option value="client">Client-facing</option>
            </Form.Select>
          </Form.Group>
          <Form.Group>
            <Form.Label>Note</Form.Label>
            <Form.Control
              as="textarea"
              rows={4}
              value={noteText}
              onChange={(event) => setNoteText(event.target.value)}
              placeholder="Add a pet note..."
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={closeNewNoteModal}>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => void handleSaveNote()} disabled={!noteText.trim() || isSavingNote}>
            {isSavingNote && <Spinner animation="border" size="sm" className="me-2" />}
            Save Note
          </Button>
        </Modal.Footer>
      </Modal>
      <Modal show={showAllNotesModal} onHide={() => setShowAllNotesModal(false)} centered scrollable>
        <Modal.Header closeButton>
          <Modal.Title>All Pet Notes</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {activeNotes.length === 0 && archivedNotes.length === 0 ? (
            <p className="text-muted mb-0">No pet notes.</p>
          ) : (
            <>
              {activeNotes.length > 0 && (
                <>
                  <div className="fw-semibold mb-2">Active Notes</div>
                  <div className="d-grid gap-2 mb-3">
                    {activeNotes.map((note) => (
                      <Card
                        key={note.id}
                        className="note-card"
                        onClick={() => openEditNoteModal(note.id, note.text, note.visibility)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            openEditNoteModal(note.id, note.text, note.visibility);
                          }
                        }}
                      >
                        <Card.Body className="d-grid gap-2">
                          <div className="note-card-meta">
                            <span className={`note-visibility-pill note-visibility-pill-${note.visibility}`}>
                              {note.visibility === "client" ? "Client-facing" : "Internal"}
                            </span>
                            {getNotePostedByLabel(note) && <span>{getNotePostedByLabel(note)}</span>}
                            <span>{new Date(note.createdAt).toLocaleDateString()}</span>
                          </div>
                          <div className="note-card-text">{note.text}</div>
                          <div className="note-inline-actions">
                            <button
                              type="button"
                              className="pet-row-indicator-button"
                              aria-label="Edit note"
                              onClick={(event) => {
                                event.stopPropagation();
                                openEditNoteModal(note.id, note.text, note.visibility);
                              }}
                            >
                              <span className="pet-row-indicator">
                                <PencilSquare aria-hidden="true" />
                              </span>
                            </button>
                            <button
                              type="button"
                              className="pet-row-indicator-button"
                              disabled={isSavingNote}
                              onClick={(event) => {
                                event.stopPropagation();
                                void handleNoteAction(note.id, "archive");
                              }}
                            >
                              <span className="pet-row-indicator">Archive</span>
                            </button>
                            <button
                              type="button"
                              className="pet-row-indicator-button"
                              disabled={isSavingNote}
                              onClick={(event) => {
                                event.stopPropagation();
                                void handleNoteAction(note.id, "delete");
                              }}
                            >
                              <span className="pet-row-indicator pet-row-indicator-danger">Delete</span>
                            </button>
                          </div>
                        </Card.Body>
                      </Card>
                    ))}
                  </div>
                </>
              )}
              {archivedNotes.length > 0 && (
                <>
                  <div className="fw-semibold mb-2">Archived Notes</div>
                  <div className="d-grid gap-2">
                    {archivedNotes.map((note) => (
                      <Card
                        key={note.id}
                        className="note-card"
                        onClick={() => openEditNoteModal(note.id, note.text, note.visibility)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            openEditNoteModal(note.id, note.text, note.visibility);
                          }
                        }}
                      >
                        <Card.Body className="d-grid gap-2">
                          <div className="note-card-meta">
                            <span className={`note-visibility-pill note-visibility-pill-${note.visibility}`}>
                              {note.visibility === "client" ? "Client-facing" : "Internal"}
                            </span>
                            {getNotePostedByLabel(note) && <span>{getNotePostedByLabel(note)}</span>}
                            <span>Archived {note.archivedAt ? new Date(note.archivedAt).toLocaleDateString() : ""}</span>
                          </div>
                          <div className="note-card-text">{note.text}</div>
                          <div className="note-inline-actions">
                            <button
                              type="button"
                              className="pet-row-indicator-button"
                              disabled={isSavingNote}
                              onClick={(event) => {
                                event.stopPropagation();
                                void handleNoteAction(note.id, "restore");
                              }}
                            >
                              <span className="pet-row-indicator">Restore</span>
                            </button>
                            <button
                              type="button"
                              className="pet-row-indicator-button"
                              disabled={isSavingNote}
                              onClick={(event) => {
                                event.stopPropagation();
                                void handleNoteAction(note.id, "delete");
                              }}
                            >
                              <span className="pet-row-indicator pet-row-indicator-danger">Delete</span>
                            </button>
                          </div>
                        </Card.Body>
                      </Card>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowAllNotesModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal
        show={showUnsavedChangesModal}
        onHide={() => setShowUnsavedChangesModal(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Unsaved Changes</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Changes were made to this pet. You can cancel, continue without saving, or save before opening the pet page.
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="outline-secondary"
            onClick={() => setShowUnsavedChangesModal(false)}
          >
            Cancel
          </Button>
          <Button
            variant="outline-secondary"
            onClick={() => {
              setShowUnsavedChangesModal(false);
              navigateToPetPage();
            }}
          >
            Continue Without Saving
          </Button>
          <Button
            variant="primary"
            disabled={isSaving}
            onClick={async () => {
              const updatedPet = await savePetChanges();
              if (!updatedPet) {
                return;
              }

              setShowUnsavedChangesModal(false);
              onHide();
              navigate(`/pets/${updatedPet.id}`);
            }}
          >
            {isSaving && <Spinner animation="border" size="sm" className="me-2" />}
            Save and Continue
          </Button>
        </Modal.Footer>
      </Modal>

      {owner && (
        <AppointmentFormModal
          show={showScheduleModal}
          onHide={() => setShowScheduleModal(false)}
          owners={[owner]}
          pets={[pet]}
          lockedOwnerId={owner.id}
          lockedPetId={pet.id}
          initialOwnerId={owner.id}
          initialPetId={pet.id}
          onSaved={(appointment) => {
            setAppointments((currentAppointments) => [...currentAppointments, appointment]);
            setShowScheduleModal(false);
            showToast({
              title: "Appointment Scheduled",
              body: "The appointment was created for this pet and client.",
              variant: "success",
            });
          }}
        />
      )}
    </Modal>
  );
}
