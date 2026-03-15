import { useEffect, useState } from "react";
import { Alert, Button, Form, Modal } from "react-bootstrap";
import type { AppUserRole, ManagedUser, ManagedUserUpsertInput } from "../../lib/crmApi";
import type { Owner } from "../../types/models";

interface UserFormModalProps {
  show: boolean;
  onHide: () => void;
  initialUser?: ManagedUser | null;
  onSave: (input: ManagedUserUpsertInput, existingUser?: ManagedUser) => Promise<void>;
  currentUserId: string;
  owners: Owner[];
}

const roleOptions: { value: AppUserRole; label: string }[] = [
  { value: "admin", label: "Administrator" },
  { value: "groomer", label: "Pet Groomer" },
  { value: "client", label: "Client User" },
];

export default function UserFormModal({
  show,
  onHide,
  initialUser = null,
  onSave,
  currentUserId,
  owners,
}: UserFormModalProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<AppUserRole>("groomer");
  const [password, setPassword] = useState("");
  const [notifyByEmail, setNotifyByEmail] = useState(true);
  const [notifyByText, setNotifyByText] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [ownerId, setOwnerId] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!show) {
      return;
    }

    setFirstName(initialUser?.firstName ?? "");
    setLastName(initialUser?.lastName ?? "");
    setEmail(initialUser?.email ?? "");
    setUsername(initialUser?.username ?? "");
    setPhone(initialUser?.phone ?? "");
    setRole(initialUser?.role ?? "groomer");
    setPassword("");
    setNotifyByEmail(initialUser?.notifyByEmail ?? true);
    setNotifyByText(initialUser?.notifyByText ?? false);
    setIsActive(initialUser?.isActive ?? true);
    setOwnerId(initialUser?.ownerId ?? "");
    setSaveError(null);
  }, [initialUser, show]);

  const isSelf = initialUser?.id === currentUserId;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    setSaveError(null);

    try {
      await onSave(
        {
          firstName,
          lastName,
          email,
          username: username || undefined,
          phone,
          role,
          notifyByEmail,
          notifyByText,
          isActive,
          ownerId: role === "client" ? ownerId || undefined : undefined,
          password: password.trim() ? password : undefined,
        },
        initialUser ?? undefined,
      );
      onHide();
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "Unable to save user.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered fullscreen="sm-down">
      <Form onSubmit={handleSubmit} className="modal-form-shell">
        <Modal.Header closeButton>
          <div className="d-flex flex-column gap-2">
            <span className={`mode-indicator${initialUser ? " mode-indicator-edit" : ""}`}>
              {initialUser ? "Edit User" : "Add User"}
            </span>
            <Modal.Title>{initialUser ? "Update User" : "Create User"}</Modal.Title>
          </div>
        </Modal.Header>
        <Modal.Body className="settings-modal-body">
          {saveError && <Alert variant="danger">{saveError}</Alert>}

          <div className="settings-form-grid">
            <Form.Group>
              <Form.Label>First Name</Form.Label>
              <Form.Control value={firstName} onChange={(event) => setFirstName(event.target.value)} required />
            </Form.Group>
            <Form.Group>
              <Form.Label>Last Name</Form.Label>
              <Form.Control value={lastName} onChange={(event) => setLastName(event.target.value)} required />
            </Form.Group>
          </div>

          <div className="settings-form-stack">
            <Form.Group>
              <Form.Label>Email Address</Form.Label>
              <Form.Control type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
            </Form.Group>
            <Form.Group>
              <Form.Label>Username</Form.Label>
              <Form.Control value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Optional until account setup is completed" />
            </Form.Group>
            <Form.Group>
              <Form.Label>Phone Number</Form.Label>
              <Form.Control type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} />
            </Form.Group>
            <Form.Group>
              <Form.Label>User Type</Form.Label>
              <Form.Select value={role} onChange={(event) => setRole(event.target.value as AppUserRole)} disabled={isSelf}>
                {roleOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
            {role === "client" && (
              <Form.Group>
                <Form.Label>Linked Client</Form.Label>
                <Form.Select
                  value={ownerId}
                  onChange={(event) => setOwnerId(event.target.value)}
                  required
                >
                  <option value="">Select a client record</option>
                  {owners.map((owner) => (
                    <option key={owner.id} value={owner.id}>
                      {owner.lastName}, {owner.firstName}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            )}
            <Form.Group>
              <Form.Label>{initialUser ? "Reset Password" : "Temporary Password"}</Form.Label>
              <Form.Control
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required={!initialUser}
                placeholder={initialUser ? "Leave blank to keep current password" : "Create a starting password"}
              />
            </Form.Group>
          </div>

          <div className="settings-preferences-card">
            <div className="fw-semibold mb-2">Account Options</div>
            <div className="settings-form-stack">
              <Form.Check
                type="switch"
                id="managed-user-email-notify"
                label="Email notifications enabled"
                checked={notifyByEmail}
                onChange={(event) => setNotifyByEmail(event.target.checked)}
              />
              <Form.Check
                type="switch"
                id="managed-user-text-notify"
                label="Text notifications enabled"
                checked={notifyByText}
                onChange={(event) => setNotifyByText(event.target.checked)}
              />
              <Form.Check
                type="switch"
                id="managed-user-active"
                label="Account is active"
                checked={isActive}
                onChange={(event) => setIsActive(event.target.checked)}
                disabled={isSelf}
              />
            </div>
            {isSelf && (
              <div className="text-muted small mt-2">
                Your own role and active status can’t be changed here.
              </div>
            )}
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
