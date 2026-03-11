import { useEffect, useState } from "react";
import { Alert, Button, Form, Modal, Spinner } from "react-bootstrap";
import { isBackendConfigured, saveOwner, type OwnerUpsertInput } from "../../lib/crmApi";
import type { ContactMethod, Owner } from "../../types/models";

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
  const [notes, setNotes] = useState("");
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
    setNotes(initialOwner?.notes.map((note) => note.text).join("\n") ?? "");
    setSaveError(null);
  }, [initialOwner, show]);

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
      notes,
    };

    try {
      const result = await saveOwner(payload, initialOwner ?? undefined);
      onSaved?.(result.data, result.mode);
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
      <Form onSubmit={handleSubmit}>
        <Modal.Header closeButton>
          <Modal.Title>
            {initialOwner ? "Edit Client" : "Add New Client"}
          </Modal.Title>
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

          <Form.Group>
            <Form.Label>Client Notes</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any special notes about this client..."
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
            {initialOwner ? "Save Client Changes" : "Save Client"}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}
