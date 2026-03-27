import { useEffect, useState } from "react";
import { Alert, Button, Form, Modal } from "react-bootstrap";
import { useAppToast } from "../common/AppToastProvider";
import { useMobileReminders } from "../common/MobileRemindersProvider";
import { useAuth } from "../common/useAuth";

interface UserSettingsModalProps {
  show: boolean;
  onHide: () => void;
}

export default function UserSettingsModal({
  show,
  onHide,
}: UserSettingsModalProps) {
  const { user, updateProfile, changePassword, sendPasswordResetEmail } = useAuth();
  const {
    settings: reminderSettings,
    isSupported: supportsMobileReminders,
    permissionState,
    requestPermission,
    saveSettings,
  } = useMobileReminders();
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
  const [mobileRemindersEnabled, setMobileRemindersEnabled] = useState(false);
  const [reminderLeadMinutes, setReminderLeadMinutes] = useState("1440");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [isSendingResetEmail, setIsSendingResetEmail] = useState(false);

  useEffect(() => {
    if (!show || !user) {
      return;
    }

    setFirstName(user.firstName);
    setLastName(user.lastName);
    setEmail(user.email);
    setPhone(user.phone ?? "");
    setNotifyByEmail(user.notifyByEmail);
    setMobileRemindersEnabled(reminderSettings.enabled);
    setReminderLeadMinutes(String(reminderSettings.leadMinutes));
    setSaveError(null);
    setPasswordError(null);
  }, [show, user, reminderSettings.enabled, reminderSettings.leadMinutes]);

  if (!user) {
    return null;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    setSaveError(null);

    try {
      if (mobileRemindersEnabled && supportsMobileReminders && permissionState !== "granted") {
        const nextPermissionState = await requestPermission();
        if (nextPermissionState !== "granted") {
          setSaveError("Notification permission is required to enable mobile appointment reminders.");
          setIsSaving(false);
          return;
        }
      }

      await updateProfile({
        firstName,
        lastName,
        email,
        phone,
        notifyByEmail,
        notifyByText: false,
      });
      await saveSettings({
        enabled: mobileRemindersEnabled,
        leadMinutes: Number(reminderLeadMinutes),
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

  const closePasswordModal = () => {
    setShowPasswordModal(false);
    setCurrentPassword("");
    setNewPassword("");
    setPasswordError(null);
    setIsSavingPassword(false);
    setIsSendingResetEmail(false);
  };

  const handlePasswordSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSavingPassword(true);
    setPasswordError(null);

    try {
      await changePassword(currentPassword, newPassword);
      showToast({
        title: "Password Updated",
        body: "Your password was updated successfully.",
        variant: "success",
      });
      closePasswordModal();
    } catch (error) {
      setPasswordError(
        error instanceof Error ? error.message : "Unable to update password.",
      );
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handleForgotPassword = async () => {
    setIsSendingResetEmail(true);
    setPasswordError(null);

    try {
      await sendPasswordResetEmail();
      showToast({
        title: "Reset Email Sent",
        body: `A password reset email was sent to ${user.email}.`,
        variant: "success",
      });
    } catch (error) {
      setPasswordError(
        error instanceof Error ? error.message : "Unable to send password reset email.",
      );
    } finally {
      setIsSendingResetEmail(false);
    }
  };

  return (
    <>
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
                Turn this off if you want to keep the account active but stop notification emails.
              </div>
            </div>

            {supportsMobileReminders && (
              <div className="settings-preferences-card mt-3">
                <div className="fw-semibold mb-2">Mobile Appointment Reminders</div>
                <div className="settings-form-stack">
                  <Form.Check
                    type="switch"
                    id="notify-by-mobile-reminder"
                    label="Send local reminders on this device"
                    checked={mobileRemindersEnabled}
                    onChange={(event) => setMobileRemindersEnabled(event.target.checked)}
                  />
                  <Form.Group>
                    <Form.Label>Reminder Timing</Form.Label>
                    <Form.Select
                      value={reminderLeadMinutes}
                      onChange={(event) => setReminderLeadMinutes(event.target.value)}
                      disabled={!mobileRemindersEnabled}
                    >
                      <option value="1">1 minute before (testing)</option>
                      <option value="15">15 minutes before</option>
                      <option value="60">1 hour before</option>
                      <option value="180">3 hours before</option>
                      <option value="1440">1 day before</option>
                    </Form.Select>
                  </Form.Group>
                </div>
                <div className="text-muted small mt-2">
                  These reminders stay on this phone and only fire for upcoming scheduled or confirmed appointments.
                </div>
                {mobileRemindersEnabled && permissionState !== "granted" && (
                  <Alert variant="warning" className="mt-3 mb-0">
                    Notification permission still needs to be approved on this device.
                  </Alert>
                )}
              </div>
            )}

            <div className="mt-3">
              <Button variant="outline-secondary" onClick={() => setShowPasswordModal(true)}>
                Reset Password
              </Button>
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

      <Modal show={showPasswordModal} onHide={closePasswordModal} centered>
        <Form onSubmit={handlePasswordSubmit}>
          <Modal.Header closeButton>
            <Modal.Title>Reset Password</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {passwordError && (
              <Alert variant="danger" className="mb-3">
                {passwordError}
              </Alert>
            )}
            <Form.Group className="mb-3">
              <Form.Label>Current Password</Form.Label>
              <Form.Control
                type="password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                required
              />
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label>New Password</Form.Label>
              <Form.Control
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                required
              />
            </Form.Group>
            <div className="text-muted small">
              Use at least 8 characters.
            </div>
            <div className="mt-3">
              <Button
                variant="link"
                className="p-0"
                type="button"
                onClick={() => void handleForgotPassword()}
                disabled={isSendingResetEmail}
              >
                {isSendingResetEmail ? "Sending reset email..." : "Forgot password?"}
              </Button>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="outline-secondary" onClick={closePasswordModal} disabled={isSavingPassword}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSavingPassword || !currentPassword || !newPassword}>
              {isSavingPassword ? "Saving..." : "Update Password"}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </>
  );
}
