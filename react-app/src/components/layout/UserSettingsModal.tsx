import { useEffect, useState } from "react";
import { Alert, Button, Form, Modal } from "react-bootstrap";
import { Link } from "react-router-dom";
import { useAppToast } from "../common/AppToastProvider";
import { useAuth } from "../common/useAuth";

interface UserSettingsModalProps {
  show: boolean;
  onHide: () => void;
}

export default function UserSettingsModal({
  show,
  onHide,
}: UserSettingsModalProps) {
  const { user, updateProfile } = useAuth();
  const roleLabel =
    user?.role === "admin"
      ? "Administrator"
      : user?.role === "groomer"
        ? "Pet Groomer"
        : "Client User";
  const { showToast } = useAppToast();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notifyByEmail, setNotifyByEmail] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!show || !user) {
      return;
    }

    setFirstName(user.firstName);
    setLastName(user.lastName);
    setEmail(user.email);
    setPhone(user.phone ?? "");
    setNotifyByEmail(user.notifyByEmail);
    setSaveError(null);
  }, [show, user]);

  if (!user) {
    return null;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    setSaveError(null);

    try {
      await updateProfile({
        firstName,
        lastName,
        email,
        phone,
        notifyByEmail,
        notifyByText: false,
      });
      showToast({
        title: "Settings Updated",
        body: "Your profile and notification preferences were saved.",
        variant: "success",
      });
      onHide();
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "Unable to save settings.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Form onSubmit={handleSubmit} className="modal-form-shell">
        <Modal.Header closeButton>
          <div className="d-flex flex-column gap-2">
            <span className="mode-indicator">Account Settings</span>
            <div>
              <Modal.Title>Profile & Notifications</Modal.Title>
              <div className="text-muted small">
                {roleLabel}
              </div>
            </div>
          </div>
        </Modal.Header>
        <Modal.Body className="settings-modal-body">
          {saveError && (
            <Alert variant="danger" className="mb-3">
              {saveError}
            </Alert>
          )}

          <div className="settings-form-grid">
            <Form.Group>
              <Form.Label>First Name</Form.Label>
              <Form.Control
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                required
              />
            </Form.Group>
            <Form.Group>
              <Form.Label>Last Name</Form.Label>
              <Form.Control
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                required
              />
            </Form.Group>
          </div>

          <div className="settings-form-stack">
            <Form.Group>
              <Form.Label>Email Address</Form.Label>
              <Form.Control
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </Form.Group>
            <Form.Group>
              <Form.Label>Phone Number</Form.Label>
              <Form.Control
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="Optional for contact purposes"
              />
            </Form.Group>
          </div>

          <div className="settings-preferences-card">
            <div className="fw-semibold mb-2">Notification Preferences</div>
            <div className="settings-form-stack">
              <Form.Check
                type="switch"
                id="notify-by-email"
                label="Receive email notifications"
                checked={notifyByEmail}
                onChange={(event) => setNotifyByEmail(event.target.checked)}
              />
            </div>
            <div className="text-muted small mt-2">
              Email notifications use the address above.
            </div>
          </div>
          <div className="mt-3">
            <Link to="/forgot-password" onClick={onHide}>
              Request a password reset
            </Link>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={onHide} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}
