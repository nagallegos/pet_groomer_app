import { useState } from "react";
import { Dropdown, Form } from "react-bootstrap";
import { Gear } from "react-bootstrap-icons";
import { Link } from "react-router-dom";
import { useAppToast } from "../common/AppToastProvider";
import { useAuth } from "../common/useAuth";
import { useTheme } from "../common/ThemeProvider";
import UserSettingsModal from "./UserSettingsModal";

interface SettingsMenuProps {
  mobile?: boolean;
  toggleClassName?: string;
  onNavigate?: () => void;
}

export default function SettingsMenu({
  mobile = false,
  toggleClassName = "",
  onNavigate,
}: SettingsMenuProps) {
  const { themeMode, themeName, toggleThemeMode, setThemeMode, isDarkModeAvailable } = useTheme();
  const { user, updateProfile, logout } = useAuth();
  const { showToast } = useAppToast();
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [isSavingTheme, setIsSavingTheme] = useState(false);
  const userLabel = user
    ? `${user.firstName} ${user.lastName}`.trim() || user.name
    : "";
  const classes = [
    mobile ? "topbar-menu-btn topbar-settings-btn" : "sidebar-settings-btn",
    toggleClassName,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <Dropdown align="end">
        <Dropdown.Toggle
          variant={mobile ? "outline-light" : "outline-secondary"}
          className={classes}
        >
          <span aria-hidden="true" className="topbar-btn-icon">
            <Gear />
          </span>
          <span className="visually-hidden">Settings</span>
        </Dropdown.Toggle>

        <Dropdown.Menu className="settings-dropdown-menu">
          <Dropdown.Item onClick={() => setShowSettingsModal(true)}>
            Profile & Notifications
          </Dropdown.Item>
          <Dropdown.Item as={Link} to="/personalization" onClick={onNavigate}>
            Personalization
          </Dropdown.Item>

          <Dropdown.Divider />

          <div className="px-3 py-2">
            <span
              title={!isDarkModeAvailable ? "Dark mode is unavailable for the high-contrast theme." : undefined}
            >
              <Form.Check
                type="switch"
                id={`theme-switch-${mobile ? "mobile" : "desktop"}`}
                label="Switch to dark mode"
                checked={themeMode === "dark"}
                onChange={async () => {
                  if (!isDarkModeAvailable) {
                    return;
                  }
                  const nextMode = themeMode === "dark" ? "light" : "dark";
                  toggleThemeMode();
                  if (!user) {
                    return;
                  }
                  setIsSavingTheme(true);
                  try {
                    await updateProfile({
                      firstName: user.firstName,
                      lastName: user.lastName,
                      email: user.email,
                      phone: user.phone,
                      notifyByEmail: user.notifyByEmail,
                      notifyByText: user.notifyByText,
                      themeName,
                      themeMode: nextMode,
                    });
                  } catch (error) {
                    setThemeMode(themeMode);
                    showToast({
                      title: "Theme update failed",
                      body: error instanceof Error ? error.message : "Unable to update theme.",
                      variant: "danger",
                    });
                  } finally {
                    setIsSavingTheme(false);
                  }
                }}
                disabled={!isDarkModeAvailable || isSavingTheme}
              />
            </span>
          </div>

          {user?.role !== "client" && (
            <>
              <Dropdown.Divider />
              <Dropdown.Header>Archives</Dropdown.Header>
              <Dropdown.Item as={Link} to="/archives/clients" onClick={onNavigate}>
                Client Archives
              </Dropdown.Item>
              <Dropdown.Item as={Link} to="/archives/pets" onClick={onNavigate}>
                Pet Archives
              </Dropdown.Item>
              <Dropdown.Item as={Link} to="/archives/appointments" onClick={onNavigate}>
                Appointment Archives
              </Dropdown.Item>
            </>
          )}
          <Dropdown.Divider />
          <Dropdown.Item
            onClick={() => {
              void logout().then(() => {
                onNavigate?.();
              });
            }}
          >
            Sign Out{userLabel ? ` (${userLabel})` : ""}
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown>
      <UserSettingsModal
        show={showSettingsModal}
        onHide={() => setShowSettingsModal(false)}
      />
    </>
  );
}
