import { Dropdown, Form } from "react-bootstrap";
import { Link } from "react-router-dom";
import { useTheme } from "../common/ThemeProvider";

interface SettingsMenuProps {
  mobile?: boolean;
}

export default function SettingsMenu({ mobile = false }: SettingsMenuProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <Dropdown align="end">
      <Dropdown.Toggle
        variant={mobile ? "outline-light" : "outline-secondary"}
        className={mobile ? "topbar-menu-btn" : ""}
      >
        Settings
      </Dropdown.Toggle>

      <Dropdown.Menu className="settings-dropdown-menu">
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

        <Dropdown drop="end">
          <Dropdown.Toggle
            as="button"
            className="dropdown-item settings-submenu-toggle"
          >
            Archives
          </Dropdown.Toggle>

          <Dropdown.Menu className="settings-dropdown-menu">
            <Dropdown.Item as={Link} to="/archives/clients">
              Clients
            </Dropdown.Item>
            <Dropdown.Item as={Link} to="/archives/pets">
              Pets
            </Dropdown.Item>
            <Dropdown.Item as={Link} to="/archives/appointments">
              Appointments
            </Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown>
      </Dropdown.Menu>
    </Dropdown>
  );
}
