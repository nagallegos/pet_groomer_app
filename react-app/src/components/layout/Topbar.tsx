import { Button, Navbar, Container } from "react-bootstrap";

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
          Barks, Bubbles, and Love
        </Navbar.Brand>
      </Container>
    </Navbar>
  );
}
