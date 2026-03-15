import { Button, Navbar, Container } from "react-bootstrap";
import NotificationBell from "./NotificationBell";
import SettingsMenu from "./SettingsMenu";

interface TopbarProps {
  onMenuClick: () => void;
}

export default function Topbar({ onMenuClick }: TopbarProps) {
  return (
    <Navbar className="topbar-mobile d-lg-none sticky-top">
      <Container fluid>
        <Button variant="outline-light" className="topbar-menu-btn" onClick={onMenuClick}>
          <span aria-hidden="true" className="topbar-btn-icon">
            <svg viewBox="0 0 24 24" focusable="false">
              <path
                d="M4 7h16M4 12h16M4 17h16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </span>
          <span className="visually-hidden">Menu</span>
        </Button>
        <Navbar.Brand className="topbar-brand mb-0">
          <span className="d-block">Barks Bubbles & Love</span>
          <small className="d-block topbar-subtitle">Pet Grooming Manager</small>
        </Navbar.Brand>
        <div className="topbar-actions">
          <NotificationBell />
          <SettingsMenu mobile />
        </div>
      </Container>
    </Navbar>
  );
}
