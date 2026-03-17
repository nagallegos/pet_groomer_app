import { useEffect, useMemo, useState } from "react";
import { Alert, Button, Card, Dropdown, Form, ListGroup, Modal, Spinner } from "react-bootstrap";
import { PencilSquare } from "react-bootstrap-icons";
import { useNavigate } from "react-router-dom";
import AppointmentFormModal from "../appointments/AppointmentFormModal";
import {
  addOwnerNote,
  archiveOwner,
  archiveOwnerNote,
  deleteOwner,
  deleteOwnerNoteItem,
  isBackendConfigured,
  saveOwner,
  unarchiveOwnerNote,
  updateOwnerNote,
  type OwnerUpsertInput,
} from "../../lib/crmApi";
import { getNotePostedByLabel } from "../../lib/noteUtils";
import { useAppToast } from "../common/AppToastProvider";
import ClientContactActions from "../common/ClientContactActions";
import ConfirmDeleteModal from "../common/ConfirmDeleteModal";
import PetQuickViewModal from "../pets/PetQuickViewModal";
import type { Appointment, ContactMethod, NoteVisibility, Owner, Pet } from "../../types/models";

interface ClientQuickViewModalProps {
  show: boolean;
  owner: Owner | null;
  pets: Pet[];
  appointments: Appointment[];
  onHide: () => void;
  onOwnerArchived?: (owner: Owner) => void;
  onOwnerDeleted?: (ownerId: string) => void;
  onOwnerUpdated?: (owner: Owner) => void;
  onPetUpdated?: (pet: Pet) => void;
  onPetArchived?: (pet: Pet) => void;
  onPetDeleted?: (petId: string) => void;
}

export default function ClientQuickViewModal({
  show,
  owner,
  pets,
  appointments,
  onHide,
  onOwnerArchived,
  onOwnerDeleted,
  onOwnerUpdated,
  onPetUpdated,
  onPetArchived,
  onPetDeleted,
}: ClientQuickViewModalProps) {
  const navigate = useNavigate();
  const { showToast } = useAppToast();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [preferredContactMethod, setPreferredContactMethod] =
    useState<ContactMethod>("text");
  const [address, setAddress] = useState("");
  const [noteText, setNoteText] = useState("");
  const [noteVisibility, setNoteVisibility] = useState<NoteVisibility>("internal");
  const [noteError, setNoteError] = useState<string | null>(null);
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showUnsavedChangesModal, setShowUnsavedChangesModal] = useState(false);
  const [showNewNoteModal, setShowNewNoteModal] = useState(false);
  const [showAllNotesModal, setShowAllNotesModal] = useState(false);
  const [showEditNoteModal, setShowEditNoteModal] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteText, setEditingNoteText] = useState("");
  const [editingNoteVisibility, setEditingNoteVisibility] =
    useState<NoteVisibility>("internal");

  useEffect(() => {
    if (!show || !owner) {
      return;
    }

    setFirstName(owner.firstName);
    setLastName(owner.lastName);
    setPhone(owner.phone);
    setEmail(owner.email);
    setPreferredContactMethod(owner.preferredContactMethod);
    setAddress(owner.address ?? "");
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
  }, [owner, show]);

  const activeNotes = useMemo(() => owner?.notes.filter((note) => !note.isArchived) ?? [], [owner]);
  const archivedNotes = useMemo(() => owner?.notes.filter((note) => note.isArchived) ?? [], [owner]);
  const previewNotes = useMemo(() => activeNotes.slice(0, 3), [activeNotes]);

  if (!owner) return null;

  const hasUnsavedChanges =
    firstName !== owner.firstName ||
    lastName !== owner.lastName ||
    phone !== owner.phone ||
    email !== owner.email ||
    preferredContactMethod !== owner.preferredContactMethod ||
    address !== (owner.address ?? "");

  const saveClientChanges = async () => {
    setIsSaving(true);
    setSaveError(null);

    const payload: OwnerUpsertInput = {
      firstName,
      lastName,
      phone,
      email,
      preferredContactMethod,
      address,
    };

    try {
      const result = await saveOwner(payload, owner);
      onOwnerUpdated?.(result.data);
      showToast({
        title: "Client Updated",
        body:
          result.mode === "api"
            ? "Client updated in backend."
            : "Client changes saved in mock mode.",
        variant: "success",
      });
      setIsEditing(false);
      return result.data;
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "Unable to save client changes.",
      );
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    await saveClientChanges();
  };

  const navigateToClientPage = () => {
    onHide();
    navigate(`/clients/${owner.id}`);
  };

  const handleClientPageClick = () => {
    if (isEditing && hasUnsavedChanges) {
      setShowUnsavedChangesModal(true);
      return;
    }

    navigateToClientPage();
  };

  const selectedPetAppointments = selectedPet
    ? appointments.filter((appointment) => appointment.petId === selectedPet.id)
    : [];
  const relatedPetNames = pets.map((pet) => pet.name);
  const relatedPetSummary =
    relatedPetNames.length === 0 ? "No pets on file." : relatedPetNames.join(", ");

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
      const result = await addOwnerNote(owner, noteText.trim(), noteVisibility);
      onOwnerUpdated?.(result.data);
      closeNewNoteModal();
      showToast({
        title: "Note Added",
        body: "The client note was saved successfully.",
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
          ? await archiveOwnerNote(owner, noteId)
          : action === "restore"
            ? await unarchiveOwnerNote(owner, noteId)
            : await deleteOwnerNoteItem(owner, noteId);
      onOwnerUpdated?.(result.data);
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

  const openEditNoteModal = (
    noteId: string,
    text: string,
    visibility: NoteVisibility,
  ) => {
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
      const result = await updateOwnerNote(
        owner,
        editingNoteId,
        editingNoteText.trim(),
        editingNoteVisibility,
      );
      onOwnerUpdated?.(result.data);
      closeEditNoteModal();
      showToast({
        title: "Note Updated",
        body: "The client note was saved successfully.",
        variant: "success",
      });
    } catch (error) {
      setNoteError(error instanceof Error ? error.message : "Unable to save note.");
    } finally {
      setIsSavingNote(false);
    }
  };

  return (
    <>
    <Modal show={show && !selectedPet} onHide={onHide} centered fullscreen="sm-down">
      <Form onSubmit={handleSave} className="modal-form-shell">
        <Modal.Header closeButton>
          <div className="w-100 d-flex justify-content-between align-items-start gap-3">
            <div>
              <Modal.Title>
                {isEditing ? "Edit Client" : `${owner.firstName} ${owner.lastName}`}
              </Modal.Title>
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
                    <span className="visually-hidden">Edit client</span>
                  </Dropdown.Item>
                  <Dropdown.Item
                    onClick={() => {
                      setShowScheduleModal(true);
                    }}
                  >
                    Schedule Appointment
                  </Dropdown.Item>
                  <Dropdown.Item
                    onClick={handleClientPageClick}
                  >
                    Client Page
                  </Dropdown.Item>
                  <Dropdown.Divider />
                  <Dropdown.Item onClick={() => setShowArchiveModal(true)}>
                    Archive Client
                  </Dropdown.Item>
                  <Dropdown.Item className="text-danger" onClick={() => setShowDeleteModal(true)}>
                    Delete Client
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
                <Form.Label>First Name</Form.Label>
                <Form.Control
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  required
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Last Name</Form.Label>
                <Form.Control
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                  required
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Phone</Form.Label>
                <Form.Control
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Email</Form.Label>
                <Form.Control
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Preferred Contact</Form.Label>
                <Form.Select
                  value={preferredContactMethod}
                  onChange={(event) =>
                    setPreferredContactMethod(event.target.value as ContactMethod)
                  }
                >
                  <option value="text">Text</option>
                  <option value="email">Email</option>
                </Form.Select>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Address</Form.Label>
                <Form.Control
                  value={address}
                  onChange={(event) => setAddress(event.target.value)}
                />
              </Form.Group>

              <div>
                <div className="d-flex justify-content-between align-items-center gap-2 mb-2">
                  <Form.Label className="mb-0">Client Notes</Form.Label>
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
                  <p className="text-muted mb-0">No active client notes.</p>
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
                            <span className="client-note-type">client</span>
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
                Use the full client page to edit pets and other related records.
              </p>
            </>
          ) : (
            <>
              <div className="mb-4">
                <h6>Client Information</h6>
                <p className="mb-1">
                  <strong>Contact:</strong>
                </p>
                <ClientContactActions phone={owner.phone} email={owner.email} stacked />
                <p className="mb-1">
                  <strong>Address:</strong> {owner.address ?? "—"}
                </p>
                <p className="mb-1">
                  <strong>Preferred Contact:</strong> {owner.preferredContactMethod}
                </p>
              </div>

              <div className="mb-4">
                <h6>Notes</h6>
                {owner.notes.length === 0 ? (
                  <p className="text-muted mb-0">No client notes.</p>
                ) : (
                  <div className="d-grid gap-2">
                    {owner.notes.map((note) => (
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
                            <span className="client-note-type">client</span>
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

              <div className="mb-4">
                <h6>Pets</h6>
                {pets.length === 0 ? (
                  <p className="text-muted mb-0">No pets on file.</p>
                ) : (
                  <ListGroup>
                    {pets.map((pet) => (
                      <ListGroup.Item key={pet.id}>
                        <div className="d-flex justify-content-between align-items-center gap-3">
                          <div>
                            <strong>{pet.name}</strong> — {pet.species}, {pet.breed}
                          </div>
                          <Button
                            size="sm"
                            variant="outline-secondary"
                            onClick={() => setSelectedPet(pet)}
                          >
                            Open Pet
                          </Button>
                        </div>
                      </ListGroup.Item>
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
                    {appointments.map((appt) => (
                      <ListGroup.Item key={appt.id}>
                        {new Date(appt.start).toLocaleString()} — {appt.status}
                      </ListGroup.Item>
                    ))}
                  </ListGroup>
                )}
              </div>
            </>
          )}
        </Modal.Body>

        <Modal.Footer>
          {isEditing ? (
            <>
              <Button
                variant="outline-secondary"
                onClick={handleClientPageClick}
                disabled={isSaving}
              >
                Client Page
              </Button>
              <Button
                variant="outline-secondary"
                onClick={() => {
                  setIsEditing(false);
                  setSaveError(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" disabled={isSaving}>
                {isSaving && <Spinner animation="border" size="sm" className="me-2" />}
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

      <ConfirmDeleteModal
        show={showArchiveModal}
        title="Archive Client"
        body="Archiving removes this client from the visible client lists and related active views. All pets, pet appointments, and notes under this client will also be archived."
        note={`Pets affected: ${relatedPetSummary} Archived client records can still be retrieved later if needed. Deleting permanently removes the record instead.`}
        confirmLabel="Archive"
        confirmVariant="warning"
        onCancel={() => setShowArchiveModal(false)}
        onConfirm={async () => {
          const result = await archiveOwner(owner);
          showToast({
            title: "Client Archived",
            body:
              result.mode === "api"
                ? "Client archived in backend."
                : "Client archived in mock mode.",
            variant: "warning",
          });
          onOwnerArchived?.(result.data);
          setShowArchiveModal(false);
          onHide();
        }}
      />

      <ConfirmDeleteModal
        show={showDeleteModal}
        title="Delete Client"
        body="Deleting permanently removes this client from the system."
        note="If you only want to hide this client from visible data, choose Archive instead. Archived records can still be retrieved later if needed."
        confirmLabel="Delete Permanently"
        onCancel={() => setShowDeleteModal(false)}
        onConfirm={async () => {
          const result = await deleteOwner(owner);
          showToast({
            title: "Client Deleted",
            body:
              result.mode === "api"
                ? "Client deleted from backend."
                : "Client deleted in mock mode.",
            variant: "warning",
          });
          onOwnerDeleted?.(owner.id);
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
          Changes were made to this client. You can cancel, continue without saving, or save before opening the client page.
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
              navigateToClientPage();
            }}
          >
            Continue Without Saving
          </Button>
          <Button
            variant="primary"
            disabled={isSaving}
            onClick={async () => {
              const updatedOwner = await saveClientChanges();
              if (!updatedOwner) {
                return;
              }

              setShowUnsavedChangesModal(false);
              onHide();
              navigate(`/clients/${updatedOwner.id}`);
            }}
          >
            {isSaving && <Spinner animation="border" size="sm" className="me-2" />}
            Save and Continue
          </Button>
        </Modal.Footer>
      </Modal>
      <Modal show={showEditNoteModal} onHide={closeEditNoteModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>Edit Client Note</Modal.Title>
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
              placeholder="Update this client note..."
            />
          </Form.Group>
          <Form.Group>
            <Form.Label>Visibility</Form.Label>
            <Form.Select
              value={editingNoteVisibility}
              onChange={(event) =>
                setEditingNoteVisibility(event.target.value as NoteVisibility)
              }
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
          <Button
            variant="primary"
            onClick={() => void handleSaveEditedNote()}
            disabled={!editingNoteText.trim() || isSavingNote}
          >
            {isSavingNote && <Spinner animation="border" size="sm" className="me-2" />}
            Save Note
          </Button>
        </Modal.Footer>
      </Modal>
      <Modal show={showNewNoteModal} onHide={closeNewNoteModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>New Client Note</Modal.Title>
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
              placeholder="Add a client note..."
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
          <Modal.Title>All Client Notes</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {activeNotes.length === 0 && archivedNotes.length === 0 ? (
            <p className="text-muted mb-0">No client notes.</p>
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
                            <span className="client-note-type">client</span>
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
                            <span className="client-note-type">client</span>
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
    </Modal>

      <AppointmentFormModal
        show={showScheduleModal}
        onHide={() => setShowScheduleModal(false)}
        owners={[owner]}
        pets={pets}
        lockedOwnerId={owner.id}
        initialOwnerId={owner.id}
        onSaved={() => {
          setShowScheduleModal(false);
        }}
      />

      <PetQuickViewModal
        show={show && !!selectedPet}
        pet={selectedPet}
        owner={owner}
        appointments={selectedPetAppointments}
        onHide={() => {
          setSelectedPet(null);
          onHide();
        }}
        onBack={() => setSelectedPet(null)}
        onPetUpdated={(updatedPet) => {
          onPetUpdated?.(updatedPet);
          setSelectedPet(updatedPet);
        }}
        onPetArchived={(archivedPet) => {
          onPetArchived?.(archivedPet);
          setSelectedPet(null);
        }}
        onPetDeleted={(petId) => {
          onPetDeleted?.(petId);
          setSelectedPet(null);
        }}
      />
    </>
  );
}
