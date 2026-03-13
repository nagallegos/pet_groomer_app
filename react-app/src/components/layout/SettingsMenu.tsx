import { useState } from "react";
import { Dropdown, Form } from "react-bootstrap";
import { Link } from "react-router-dom";
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
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const [showSettingsModal, setShowSettingsModal] = useState(false);
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
          {mobile ? (
            <>
              <span aria-hidden="true" className="topbar-btn-icon">
                <svg viewBox="0 0 24 24" focusable="false">
                  <path
                    d="M12 8.5a3.5 3.5 0 1 0 0 7a3.5 3.5 0 0 0 0-7Zm8 3.5l-1.73-.62a6.9 6.9 0 0 0-.47-1.13l.79-1.65l-1.9-1.9l-1.65.79c-.36-.2-.74-.36-1.13-.47L14 4h-4l-.62 1.73c-.39.11-.77.27-1.13.47L6.6 5.41l-1.9 1.9l.79 1.65c-.2.36-.36.74-.47 1.13L3.3 12l.62 1.73c.11.39.27.77.47 1.13l-.79 1.65l1.9 1.9l1.65-.79c.36.2.74.36 1.13.47L10 20h4l.62-1.73c.39-.11.77-.27 1.13-.47l1.65.79l1.9-1.9l-.79-1.65c.2-.36.36-.74.47-1.13L20 12Z"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <span className="visually-hidden">Settings</span>
            </>
          ) : (
            "Settings"
          )}
        </Dropdown.Toggle>

        <Dropdown.Menu className="settings-dropdown-menu">
          <Dropdown.Item onClick={() => setShowSettingsModal(true)}>
            Profile & Notifications
          </Dropdown.Item>

          <Dropdown.Divider />

          <div className="px-3 py-2">
            <Form.Check
              type="switch"
              id={`theme-switch-${mobile ? "mobile" : "desktop"}`}
              label="Switch to dark mode"
              checked={theme === "dark"}
              onChange={toggleTheme}
            />
          </div>

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
