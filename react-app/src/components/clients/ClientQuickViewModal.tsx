import { useEffect, useState } from "react";
import { Alert, Button, Dropdown, Form, ListGroup, Modal, Spinner } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import {
  archiveOwner,
  deleteOwner,
  isBackendConfigured,
  saveOwner,
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
  onOwnerArchived?: (ownerId: string) => void;
  onOwnerDeleted?: (ownerId: string) => void;
  onOwnerUpdated?: (owner: Owner) => void;
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
  const [notes, setNotes] = useState("");
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
    setNotes(owner.notes.map((note) => note.text).join("\n"));
    setIsEditing(false);
    setSaveError(null);
  }, [owner, show]);

  if (!owner) return null;

  const hasUnsavedChanges =
    firstName !== owner.firstName ||
    lastName !== owner.lastName ||
    phone !== owner.phone ||
    email !== owner.email ||
    preferredContactMethod !== owner.preferredContactMethod ||
    address !== (owner.address ?? "") ||
    notes !== owner.notes.map((note) => note.text).join("\n");

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
      notes,
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
                  MongoDB backend not configured yet. Saves are currently local UI previews only.
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

              <Form.Group>
                <Form.Label>Client Notes</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={4}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                />
              </Form.Group>

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
          onOwnerArchived?.(owner.id);
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
          setSelectedPet(updatedPet);
        }}
      />
    </>
  );
}
