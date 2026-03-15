import { useEffect, useState } from "react";
import { Alert, Button, Card, Form, Modal, Spinner } from "react-bootstrap";
import {
  addOwnerNote,
  deleteOwnerNoteItem,
  isBackendConfigured,
  saveOwner,
  updateOwnerNote,
  type OwnerUpsertInput,
} from "../../lib/crmApi";
import type { ContactMethod, Owner } from "../../types/models";

interface DraftNote {
  id: string;
  sourceNoteId?: string;
  text: string;
}

interface ClientFormModalProps {
  show: boolean;
  onHide: () => void;
  initialOwner?: Owner | null;
  onSaved?: (owner: Owner, mode: "mock" | "api") => void;
}

export default function ClientFormModal({
  show,
  onHide,
  initialOwner = null,
  onSaved,
}: ClientFormModalProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [preferredContactMethod, setPreferredContactMethod] =
    useState<ContactMethod>("text");
  const [address, setAddress] = useState("");
  const [draftNotes, setDraftNotes] = useState<DraftNote[]>([]);
  const [noteDraftText, setNoteDraftText] = useState("");
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!show) return;

    setFirstName(initialOwner?.firstName ?? "");
    setLastName(initialOwner?.lastName ?? "");
    setPhone(initialOwner?.phone ?? "");
    setEmail(initialOwner?.email ?? "");
    setPreferredContactMethod(initialOwner?.preferredContactMethod ?? "text");
    setAddress(initialOwner?.address ?? "");
    setDraftNotes(
      initialOwner?.notes
        .filter((note) => !note.isArchived)
        .map((note) => ({
          id: `existing-${note.id}`,
          sourceNoteId: note.id,
          text: note.text,
        })) ?? [],
    );
    setNoteDraftText("");
    setEditingDraftId(null);
    setSaveError(null);
  }, [initialOwner, show]);

  const resetDraftEditor = () => {
    setNoteDraftText("");
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
            ? {
                ...note,
                text: trimmed,
              }
            : note,
        ),
      );
    } else {
      setDraftNotes((current) => [
        ...current,
        {
          id: `draft-${Date.now()}`,
          text: trimmed,
        },
      ]);
    }

    resetDraftEditor();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
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
      const result = await saveOwner(payload, initialOwner ?? undefined);
      const savedOwner = result.data;
      const originalActiveNotes = initialOwner?.notes.filter((note) => !note.isArchived) ?? [];
      const retainedIds = new Set(
        draftNotes
          .map((note) => note.sourceNoteId)
          .filter((noteId): noteId is string => Boolean(noteId)),
      );

      for (const existingNote of originalActiveNotes) {
        if (!retainedIds.has(existingNote.id)) {
          await deleteOwnerNoteItem(savedOwner, existingNote.id);
        }
      }

      let reconciledOwner = savedOwner;
      for (const draftNote of draftNotes) {
        if (draftNote.sourceNoteId) {
          const originalNote = originalActiveNotes.find((note) => note.id === draftNote.sourceNoteId);
          if (originalNote && originalNote.text !== draftNote.text) {
            const noteResult = await updateOwnerNote(
              reconciledOwner,
              draftNote.sourceNoteId,
              draftNote.text,
              "internal",
            );
            reconciledOwner = noteResult.data;
          }
        } else {
          const noteResult = await addOwnerNote(reconciledOwner, draftNote.text, "internal");
          reconciledOwner = noteResult.data;
        }
      }

      onSaved?.(reconciledOwner, result.mode);
      onHide();
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "Unable to save client.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered fullscreen="sm-down">
      <Form onSubmit={handleSubmit} className="modal-form-shell">
        <Modal.Header closeButton>
          <Modal.Title>
            {initialOwner ? "Edit Client" : "Add New Client"}
          </Modal.Title>
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
            <Form.Label>First Name</Form.Label>
            <Form.Control
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Last Name</Form.Label>
            <Form.Control
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Phone</Form.Label>
            <Form.Control
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="806-555-1234"
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Email</Form.Label>
            <Form.Control
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Preferred Contact</Form.Label>
            <Form.Select
              value={preferredContactMethod}
              onChange={(e) =>
                setPreferredContactMethod(e.target.value as ContactMethod)
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
              onChange={(e) => setAddress(e.target.value)}
            />
          </Form.Group>

          <div className="d-grid gap-3">
            <div className="d-flex justify-content-between align-items-center gap-2">
              <Form.Label className="mb-0">Client Notes</Form.Label>
              <Button variant="outline-secondary" size="sm" onClick={resetDraftEditor}>
                New Note
              </Button>
            </div>
            <Form.Group>
              <Form.Control
                as="textarea"
                rows={3}
                value={noteDraftText}
                onChange={(e) => setNoteDraftText(e.target.value)}
                placeholder="Add an internal client note..."
              />
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
                <div className="text-muted small">No client notes added yet.</div>
              ) : (
                draftNotes.map((note) => (
                  <Card key={note.id} className="client-note-preview">
                    <Card.Body className="d-flex justify-content-between align-items-start gap-3">
                      <div className="client-note-item">
                        <div className="client-note-meta">
                          <span className="note-visibility-pill note-visibility-pill-internal">Internal</span>
                        </div>
                        <div>{note.text}</div>
                      </div>
                      <div className="note-inline-actions">
                        <button
                          type="button"
                          className="pet-row-indicator-button"
                          onClick={() => {
                            setEditingDraftId(note.id);
                            setNoteDraftText(note.text);
                          }}
                        >
                          <span className="pet-row-indicator">Edit</span>
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
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={onHide}>
            Cancel
          </Button>

          <Button type="submit" variant="primary" disabled={isSaving}>
            {isSaving && (
              <Spinner animation="border" size="sm" className="me-2" />
            )}
            {initialOwner ? "Save Client Changes" : "Save Client"}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}
