import { useEffect, useState } from "react";
import { Alert, Button, Dropdown, Form, ListGroup, Modal, Spinner } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import {
  archivePet,
  deletePet,
  isBackendConfigured,
  savePet,
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
  onPetUpdated?: (pet: Pet) => void;
  onPetArchived?: (petId: string) => void;
  onPetDeleted?: (petId: string) => void;
}

export default function PetQuickViewModal({
  show,
  pet,
  owner,
  appointments,
  onHide,
  onBack,
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
  const [notes, setNotes] = useState("");
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
    setNotes(pet.notes.map((note) => note.text).join("\n"));
    setIsEditing(false);
    setSaveError(null);
  }, [pet, show]);

  if (!pet) return null;

  const hasUnsavedChanges =
    name !== pet.name ||
    species !== pet.species ||
    breed !== pet.breed ||
    weightLbs !== (pet.weightLbs?.toString() ?? "") ||
    ageYears !== (pet.ageYears?.toString() ?? "") ||
    color !== (pet.color ?? "") ||
    notes !== pet.notes.map((note) => note.text).join("\n");

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
      notes,
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
                  <Dropdown.Item onClick={handlePetPageClick}>
                    Pet Page
                  </Dropdown.Item>
                  {owner && (
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
                  MongoDB backend not configured yet. Saves are currently local UI previews only.
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

              <Form.Group>
                <Form.Label>Pet Notes</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={4}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                />
              </Form.Group>

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
                {pet.notes.length === 0 ? (
                  <p className="text-muted mb-0">No pet notes.</p>
                ) : (
                  <ListGroup>
                    {pet.notes.map((note) => (
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
              <Button
                variant="outline-secondary"
                onClick={handlePetPageClick}
                disabled={isSaving}
              >
                Pet Page
              </Button>
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
          onPetArchived?.(pet.id);
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
