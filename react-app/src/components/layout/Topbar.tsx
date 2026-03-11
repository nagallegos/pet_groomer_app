import { Button, Navbar, Container } from "react-bootstrap";
import SettingsMenu from "./SettingsMenu";

interface TopbarProps {
  onMenuClick: () => void;
}

export default function Topbar({ onMenuClick }: TopbarProps) {
  return (
    <Navbar className="topbar-mobile d-md-none sticky-top">
      <Container fluid>
        <Button variant="outline-light" className="topbar-menu-btn" onClick={onMenuClick}>
          Menu
        </Button>
        <Navbar.Brand className="topbar-brand mb-0">
          <span className="d-block">Barks Bubbles & Love</span>
          <small className="d-block topbar-subtitle">Dog Grooming CRM</small>
        </Navbar.Brand>
        <SettingsMenu mobile />
      </Container>
    </Navbar>
  );
}
