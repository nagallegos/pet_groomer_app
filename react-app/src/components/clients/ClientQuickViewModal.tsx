import { useEffect, useMemo, useState } from "react";
import { Alert, Button, Collapse, Dropdown, Form, ListGroup, Modal, Spinner } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
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
import { useAppToast } from "../common/AppToastProvider";
import ClientContactActions from "../common/ClientContactActions";
import ConfirmDeleteModal from "../common/ConfirmDeleteModal";
import PetQuickViewModal from "../pets/PetQuickViewModal";
import type { Appointment, ContactMethod, Owner, Pet } from "../../types/models";

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
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [preferredContactMethod, setPreferredContactMethod] =
    useState<ContactMethod>("text");
  const [address, setAddress] = useState("");
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const [noteError, setNoteError] = useState<string | null>(null);
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [showArchivedNotes, setShowArchivedNotes] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showUnsavedChangesModal, setShowUnsavedChangesModal] = useState(false);

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
    setSelectedNoteId(null);
    setNoteText("");
    setNoteError(null);
    setIsEditing(false);
    setSaveError(null);
  }, [owner, show]);

  const activeNotes = useMemo(() => owner?.notes.filter((note) => !note.isArchived) ?? [], [owner]);
  const archivedNotes = useMemo(() => owner?.notes.filter((note) => note.isArchived) ?? [], [owner]);

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
        ? await updateOwnerNote(owner, selectedNoteId, noteText.trim())
        : await addOwnerNote(owner, noteText.trim());
      onOwnerUpdated?.(result.data);
      resetNoteEditor();
      showToast({
        title: selectedNoteId ? "Note Updated" : "Note Added",
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
                    Edit Client
                  </Dropdown.Item>
                  <Dropdown.Item
                    onClick={() => {
                      onHide();
                      navigate("/schedule");
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
                    placeholder="Add or edit a client note..."
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
                  <p className="text-muted mb-0">No active client notes.</p>
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
                  <ListGroup>
                    {owner.notes.map((note) => (
                      <ListGroup.Item key={note.id}>{note.text}</ListGroup.Item>
                    ))}
                  </ListGroup>
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
        body="Archiving removes this client from the visible client lists and related active views."
        note="Archived client records can still be retrieved later if needed. Deleting permanently removes the record instead."
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
    </Modal>

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
