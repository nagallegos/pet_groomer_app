import { Nav, Offcanvas } from "react-bootstrap";
import { NavLink } from "react-router-dom";

interface SidebarProps {
  show: boolean;
  onHide: () => void;
}

export default function Sidebar({ show, onHide }: SidebarProps) {
  return (
    <>
      <aside className="sidebar-desktop d-none d-md-flex flex-column">
        <div className="sidebar-brand">
          <span className="sidebar-brand-mark">BBL</span>
          <div>
            <p className="sidebar-eyebrow mb-1">Pet Grooming Studio</p>
            <h4 className="sidebar-title mb-0">Barks, Bubbles, and Love</h4>
          </div>
        </div>

        <Nav className="sidebar-nav flex-column gap-2">
          <Nav.Link as={NavLink} to="/home" className="sidebar-link">
            Home
          </Nav.Link>
          <Nav.Link as={NavLink} to="/contacts" className="sidebar-link">
            Contacts
          </Nav.Link>
          <Nav.Link as={NavLink} to="/pets" className="sidebar-link">
            Pets
          </Nav.Link>
          <Nav.Link as={NavLink} to="/schedule" className="sidebar-link">
            Schedule
          </Nav.Link>
        </Nav>

        <div className="sidebar-footer mt-auto">
          <small>Warm, polished client care for every bath, brush, and bow.</small>
        </div>
      </aside>

      <Offcanvas show={show} onHide={onHide} className="d-md-none sidebar-offcanvas">
        <Offcanvas.Header closeButton>
          <Offcanvas.Title>Barks, Bubbles, and Love</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
          <Nav className="flex-column gap-2">
            <Nav.Link
              as={NavLink}
              to="/home"
              onClick={onHide}
              className="sidebar-link"
            >
              Home
            </Nav.Link>
            <Nav.Link
              as={NavLink}
              to="/contacts"
              onClick={onHide}
              className="sidebar-link"
            >
              Contacts
            </Nav.Link>
            <Nav.Link
              as={NavLink}
              to="/pets"
              onClick={onHide}
              className="sidebar-link"
            >
              Pets
            </Nav.Link>
            <Nav.Link
              as={NavLink}
              to="/schedule"
              onClick={onHide}
              className="sidebar-link"
            >
              Schedule
            </Nav.Link>
          </Nav>
        </Offcanvas.Body>
      </Offcanvas>
    </>
  );
}
