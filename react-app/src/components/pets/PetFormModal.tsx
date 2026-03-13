import { useEffect, useMemo, useState } from "react";
import { Alert, Button, Form, Modal, Spinner } from "react-bootstrap";
import { isBackendConfigured, savePet, type PetUpsertInput } from "../../lib/crmApi";
import type { Owner, Pet, Species } from "../../types/models";

interface PetFormModalProps {
  show: boolean;
  onHide: () => void;
  owners: Owner[];
  initialPet?: Pet | null;
  lockedOwnerId?: string;
  onSaved?: (pet: Pet, mode: "mock" | "api") => void;
}

export default function PetFormModal({
  show,
  onHide,
  owners,
  initialPet = null,
  lockedOwnerId,
  onSaved,
}: PetFormModalProps) {
  const [ownerId, setOwnerId] = useState("");
  const [name, setName] = useState("");
  const [species, setSpecies] = useState<Species>("dog");
  const [breed, setBreed] = useState("");
  const [weightLbs, setWeightLbs] = useState("");
  const [ageYears, setAgeYears] = useState("");
  const [color, setColor] = useState("");
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const activeOwners = useMemo(
    () => owners.filter((owner) => !owner.isArchived),
    [owners],
  );
  const lockedOwner = useMemo(
    () => activeOwners.find((owner) => owner.id === lockedOwnerId) ?? null,
    [activeOwners, lockedOwnerId],
  );

  useEffect(() => {
    if (!show) return;

    setOwnerId(lockedOwnerId ?? initialPet?.ownerId ?? activeOwners[0]?.id ?? "");
    setName(initialPet?.name ?? "");
    setSpecies(initialPet?.species ?? "dog");
    setBreed(initialPet?.breed ?? "");
    setWeightLbs(initialPet?.weightLbs?.toString() ?? "");
    setAgeYears(initialPet?.ageYears?.toString() ?? "");
    setColor(initialPet?.color ?? "");
    setNotes(initialPet?.notes.map((note) => note.text).join("\n") ?? "");
    setSaveError(null);
  }, [activeOwners, initialPet, lockedOwnerId, show]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    setSaveError(null);

    const payload: PetUpsertInput = {
      ownerId,
      name,
      species,
      breed,
      weightLbs: weightLbs ? Number(weightLbs) : undefined,
      ageYears: ageYears ? Number(ageYears) : undefined,
      color,
      notes,
    };

    try {
      const result = await savePet(payload, initialPet ?? undefined);
      onSaved?.(result.data, result.mode);
      onHide();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Unable to save pet.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered fullscreen="sm-down">
      <Form onSubmit={handleSubmit} className="modal-form-shell">
        <Modal.Header closeButton>
          <Modal.Title>{initialPet ? "Edit Pet" : "Add New Pet"}</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          {!isBackendConfigured() && (
            <Alert variant="info" className="mb-3">
              MongoDB backend not configured yet. Saves are currently local UI
              previews only.
            </Alert>
          )}

          {saveError && (
            <Alert variant="danger" className="mb-3">
              {saveError}
            </Alert>
          )}

          <Form.Group className="mb-3">
            <Form.Label>Owner</Form.Label>
            {lockedOwner ? (
              <>
                <Form.Control
                  value={`${lockedOwner.firstName} ${lockedOwner.lastName}`}
                  readOnly
                  plaintext={false}
                  disabled
                />
                <Form.Text muted>This pet will be added to this client.</Form.Text>
              </>
            ) : (
              <Form.Select
                value={ownerId}
                onChange={(e) => setOwnerId(e.target.value)}
                required
              >
                {activeOwners.map((owner) => (
                  <option key={owner.id} value={owner.id}>
                    {owner.firstName} {owner.lastName}
                  </option>
                ))}
              </Form.Select>
            )}
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Pet Name</Form.Label>
            <Form.Control
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Species</Form.Label>
            <Form.Select
              value={species}
              onChange={(e) => setSpecies(e.target.value as Species)}
            >
              <option value="dog">Dog</option>
              <option value="cat">Cat</option>
            </Form.Select>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Breed</Form.Label>
            <Form.Control
              value={breed}
              onChange={(e) => setBreed(e.target.value)}
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
                  onChange={(e) => setWeightLbs(e.target.value)}
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
                  onChange={(e) => setAgeYears(e.target.value)}
                />
              </Form.Group>
            </div>
          </div>

          <Form.Group className="mt-3 mb-3">
            <Form.Label>Color</Form.Label>
            <Form.Control
              value={color}
              onChange={(e) => setColor(e.target.value)}
            />
          </Form.Group>

          <Form.Group>
            <Form.Label>Pet Notes</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Temperament, handling notes, coat concerns..."
            />
          </Form.Group>
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={onHide}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={isSaving}>
            {isSaving && (
              <Spinner animation="border" size="sm" className="me-2" />
            )}
            {initialPet ? "Save Pet Changes" : "Save Pet"}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}
