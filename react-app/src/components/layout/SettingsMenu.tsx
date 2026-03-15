import { useState } from "react";
import { Dropdown, Form } from "react-bootstrap";
import { Gear } from "react-bootstrap-icons";
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
                <Gear />
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
