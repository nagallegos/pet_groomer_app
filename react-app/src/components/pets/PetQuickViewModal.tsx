import { useEffect, useMemo, useState } from "react";
import { Alert, Button, Collapse, Dropdown, Form, ListGroup, Modal, Spinner } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
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
import { useAppToast } from "../common/AppToastProvider";
import ClientContactActions from "../common/ClientContactActions";
import ConfirmDeleteModal from "../common/ConfirmDeleteModal";
import type { Appointment, Owner, Pet, Species } from "../../types/models";

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
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState("");
  const [species, setSpecies] = useState<Species>("dog");
  const [breed, setBreed] = useState("");
  const [weightLbs, setWeightLbs] = useState("");
  const [ageYears, setAgeYears] = useState("");
  const [color, setColor] = useState("");
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const [noteError, setNoteError] = useState<string | null>(null);
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [showArchivedNotes, setShowArchivedNotes] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [showUnsavedChangesModal, setShowUnsavedChangesModal] = useState(false);

  useEffect(() => {
    if (!show || !pet) {
      return;
    }

    setName(pet.name);
    setSpecies(pet.species);
    setBreed(pet.breed);
    setWeightLbs(pet.weightLbs?.toString() ?? "");
    setAgeYears(pet.ageYears?.toString() ?? "");
    setColor(pet.color ?? "");
    setSelectedNoteId(null);
    setNoteText("");
    setNoteError(null);
    setIsEditing(false);
    setSaveError(null);
  }, [pet, show]);

  const activeNotes = useMemo(() => pet?.notes.filter((note) => !note.isArchived) ?? [], [pet]);
  const archivedNotes = useMemo(() => pet?.notes.filter((note) => note.isArchived) ?? [], [pet]);

  if (!pet) return null;

  const hasUnsavedChanges =
    name !== pet.name ||
    species !== pet.species ||
    breed !== pet.breed ||
    weightLbs !== (pet.weightLbs?.toString() ?? "") ||
    ageYears !== (pet.ageYears?.toString() ?? "") ||
    color !== (pet.color ?? "");

  const savePetChanges = async () => {
    setIsSaving(true);
    setSaveError(null);

    const payload: PetUpsertInput = {
      ownerId: pet.ownerId,
      name,
      species,
      breed,
      weightLbs: weightLbs ? Number(weightLbs) : undefined,
      ageYears: ageYears ? Number(ageYears) : undefined,
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
    setSelectedNoteId(null);
    setNoteText("");
    setNoteError(null);
  };

  const handleSaveNote = async () => {
    if (!noteText.trim()) {
      return;
    }

    setIsSavingNote(true);
    setNoteError(null);

    try {
      const result = selectedNoteId
        ? await updatePetNote(pet, selectedNoteId, noteText.trim())
        : await addPetNote(pet, noteText.trim());
      onPetUpdated?.(result.data);
      resetNoteEditor();
      showToast({
        title: selectedNoteId ? "Note Updated" : "Note Added",
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
      if (selectedNoteId === noteId) {
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
                    Edit Pet
                  </Dropdown.Item>
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
                <Form.Label>Breed</Form.Label>
                <Form.Control
                  value={breed}
                  onChange={(event) => setBreed(event.target.value)}
                  required
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
                    <Form.Label>Age (years)</Form.Label>
                    <Form.Control
                      type="number"
                      min="0"
                      step="1"
                      value={ageYears}
                      onChange={(event) => setAgeYears(event.target.value)}
                    />
                  </Form.Group>
                </div>
              </div>

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
                  <Button size="sm" variant="outline-secondary" onClick={resetNoteEditor}>
                    New Note
                  </Button>
                </div>
                {noteError && (
                  <Alert variant="danger" className="mb-3">
                    {noteError}
                  </Alert>
                )}
                <Form.Group className="mb-3">
                  <Form.Control
                    as="textarea"
                    rows={3}
                    value={noteText}
                    onChange={(event) => setNoteText(event.target.value)}
                    placeholder="Add or edit a pet note..."
                  />
                </Form.Group>
                <div className="d-flex justify-content-end gap-2 mb-3">
                  {selectedNoteId && (
                    <Button size="sm" variant="outline-secondary" onClick={resetNoteEditor}>
                      Cancel Note Edit
                    </Button>
                  )}
                  <Button size="sm" variant="primary" onClick={() => void handleSaveNote()} disabled={!noteText.trim() || isSavingNote}>
                    {isSavingNote && <Spinner animation="border" size="sm" className="me-2" />}
                    Save Note
                  </Button>
                </div>
                {activeNotes.length === 0 ? (
                  <p className="text-muted mb-0">No active pet notes.</p>
                ) : (
                  <ListGroup className="compact-note-list">
                    {activeNotes.map((note) => (
                      <ListGroup.Item key={note.id}>
                        <div className="d-flex justify-content-between align-items-start gap-3">
                          <div className="client-note-item">
                            <div className="client-note-meta">
                              <span>{new Date(note.createdAt).toLocaleDateString()}</span>
                              {note.updatedAt && <span>Updated {new Date(note.updatedAt).toLocaleDateString()}</span>}
                            </div>
                            <div>{note.text}</div>
                          </div>
                          <div className="note-inline-actions">
                            <button type="button" className="pet-row-indicator-button" onClick={() => { setSelectedNoteId(note.id); setNoteText(note.text); }}>
                              <span className="pet-row-indicator">Edit</span>
                            </button>
                            <button type="button" className="pet-row-indicator-button" disabled={isSavingNote} onClick={() => { void handleNoteAction(note.id, "archive"); }}>
                              <span className="pet-row-indicator">Archive</span>
                            </button>
                            <button type="button" className="pet-row-indicator-button" disabled={isSavingNote} onClick={() => { void handleNoteAction(note.id, "delete"); }}>
                              <span className="pet-row-indicator pet-row-indicator-danger">Delete</span>
                            </button>
                          </div>
                        </div>
                      </ListGroup.Item>
                    ))}
                  </ListGroup>
                )}
                {archivedNotes.length > 0 && (
                  <div className="mt-3">
                    <Button size="sm" variant="outline-secondary" onClick={() => setShowArchivedNotes((current) => !current)}>
                      {showArchivedNotes ? "Hide Archived Notes" : `Show Archived Notes (${archivedNotes.length})`}
                    </Button>
                    <Collapse in={showArchivedNotes}>
                      <div className="mt-3">
                        <ListGroup className="compact-note-list">
                          {archivedNotes.map((note) => (
                            <ListGroup.Item key={note.id}>
                              <div className="d-flex justify-content-between align-items-start gap-3">
                                <div className="client-note-item">
                                  <div className="client-note-meta">
                                    <span>Archived {note.archivedAt ? new Date(note.archivedAt).toLocaleDateString() : ""}</span>
                                  </div>
                                  <div>{note.text}</div>
                                </div>
                                <div className="note-inline-actions">
                                  <button type="button" className="pet-row-indicator-button" disabled={isSavingNote} onClick={() => { void handleNoteAction(note.id, "restore"); }}>
                                    <span className="pet-row-indicator">Restore</span>
                                  </button>
                                  <button type="button" className="pet-row-indicator-button" disabled={isSavingNote} onClick={() => { void handleNoteAction(note.id, "delete"); }}>
                                    <span className="pet-row-indicator pet-row-indicator-danger">Delete</span>
                                  </button>
                                </div>
                              </div>
                            </ListGroup.Item>
                          ))}
                        </ListGroup>
                      </div>
                    </Collapse>
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
                  <strong>Breed:</strong> {pet.breed}
                </p>
                <p className="mb-1">
                  <strong>Weight:</strong> {pet.weightLbs ?? "—"} lbs
                </p>
                <p className="mb-1">
                  <strong>Age:</strong> {pet.ageYears ?? "—"} years
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
                  <ListGroup>
                    {activeNotes.map((note) => (
                      <ListGroup.Item key={note.id}>{note.text}</ListGroup.Item>
                    ))}
                  </ListGroup>
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
        body="Archiving removes this pet from the visible pet lists and active client views."
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
    </Modal>
  );
}
