import { useEffect, useMemo, useState } from "react";
import { Alert, Button, Card, Form, Modal, Spinner } from "react-bootstrap";
import {
  addPetNote,
  deletePetNoteItem,
  isBackendConfigured,
  savePet,
  updatePetNote,
  type PetUpsertInput,
} from "../../lib/crmApi";
import { formatPetAge, toDateInputValue } from "../../lib/petAge";
import type { NoteVisibility, Owner, Pet, Species } from "../../types/models";

interface DraftPetNote {
  id: string;
  sourceNoteId?: string;
  text: string;
  visibility: NoteVisibility;
}

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
  const [birthDate, setBirthDate] = useState("");
  const [isBirthDateEstimated, setIsBirthDateEstimated] = useState(false);
  const [color, setColor] = useState("");
  const [draftNotes, setDraftNotes] = useState<DraftPetNote[]>([]);
  const [noteDraftText, setNoteDraftText] = useState("");
  const [noteDraftVisibility, setNoteDraftVisibility] = useState<NoteVisibility>("internal");
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
  const [showNoteModal, setShowNoteModal] = useState(false);
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
    setBirthDate(toDateInputValue(initialPet?.birthDate));
    setIsBirthDateEstimated(initialPet?.isBirthDateEstimated ?? false);
    setColor(initialPet?.color ?? "");
    setDraftNotes(
      initialPet?.notes
        .filter((note) => !note.isArchived)
        .map((note) => ({
          id: `existing-${note.id}`,
          sourceNoteId: note.id,
          text: note.text,
          visibility: note.visibility,
        })) ?? [],
    );
    setNoteDraftText("");
    setNoteDraftVisibility("internal");
    setEditingDraftId(null);
    setShowNoteModal(false);
    setSaveError(null);
  }, [activeOwners, initialPet, lockedOwnerId, show]);

  const resetDraftEditor = () => {
    setNoteDraftText("");
    setNoteDraftVisibility("internal");
    setEditingDraftId(null);
  };

  const openNoteModal = (note?: DraftPetNote) => {
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
      birthDate: birthDate ? new Date(birthDate).toISOString() : undefined,
      isBirthDateEstimated,
      color,
    };

    try {
      const result = await savePet(payload, initialPet ?? undefined);
      const savedPet = result.data;
      const originalActiveNotes = initialPet?.notes.filter((note) => !note.isArchived) ?? [];
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

      onSaved?.(reconciledPet, result.mode);
      onHide();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Unable to save pet.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
    <Modal show={show} onHide={onHide} centered fullscreen="sm-down">
      <Form onSubmit={handleSubmit} className="modal-form-shell">
        <Modal.Header closeButton>
          <Modal.Title>{initialPet ? "Edit Pet" : "Add New Pet"}</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          {!isBackendConfigured() && (
            <Alert variant="info" className="mb-3">
              Backend not configured yet. Saves are currently local UI
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
                <Form.Label>{isBirthDateEstimated ? "Estimated DOB" : "DOB"}</Form.Label>
                <Form.Control
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                />
              </Form.Group>
            </div>
          </div>

          <Form.Check
            className="mt-3"
            type="switch"
            id="pet-form-estimated-dob"
            label="DOB is estimated"
            checked={isBirthDateEstimated}
            onChange={(event) => setIsBirthDateEstimated(event.target.checked)}
          />

          {(birthDate || initialPet?.ageYears != null) && (
            <div className="text-muted small mt-2">
              Display age: {formatPetAge({ birthDate: birthDate ? new Date(birthDate).toISOString() : initialPet?.birthDate, ageYears: initialPet?.ageYears, isBirthDateEstimated }, "Not provided")}
            </div>
          )}

          <Form.Group className="mt-3 mb-3">
            <Form.Label>Color</Form.Label>
            <Form.Control
              value={color}
              onChange={(e) => setColor(e.target.value)}
            />
          </Form.Group>

          <div className="d-grid gap-3">
            <div className="d-flex justify-content-between align-items-center gap-2">
              <Form.Label className="mb-0">Pet Notes</Form.Label>
              <Button variant="outline-secondary" size="sm" onClick={() => openNoteModal()}>
                Add Note
              </Button>
            </div>
            <div className="d-grid gap-2">
              {draftNotes.length === 0 ? (
                <div className="text-muted small">No pet notes added yet.</div>
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
            {initialPet ? "Save Pet Changes" : "Save Pet"}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
    <Modal show={showNoteModal} onHide={closeNoteModal} centered>
      <Modal.Header closeButton>
        <Modal.Title>{editingDraftId ? "Edit Pet Note" : "New Pet Note"}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form.Group className="mb-3">
          <Form.Label>Note</Form.Label>
          <Form.Control
            as="textarea"
            rows={4}
            value={noteDraftText}
            onChange={(e) => setNoteDraftText(e.target.value)}
            placeholder="Temperament, handling notes, coat concerns..."
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
