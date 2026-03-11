import { Nav, Offcanvas } from "react-bootstrap";
import { NavLink } from "react-router-dom";
import SettingsMenu from "./SettingsMenu";

interface SidebarProps {
  show: boolean;
  onHide: () => void;
}

export default function Sidebar({ show, onHide }: SidebarProps) {
  return (
    <>
      <aside className="sidebar-desktop d-none d-md-flex flex-column">
        <div className="sidebar-brand">
          <span className="sidebar-brand-mark" aria-hidden="true">🐶</span>
          <div>
            <p className="sidebar-eyebrow mb-1">Dog Grooming CRM</p>
            <h4 className="sidebar-title mb-0">Barks Bubbles & Love</h4>
          </div>
        </div>

        <Nav className="sidebar-nav flex-column gap-2">
          <Nav.Link as={NavLink} to="/home" className="sidebar-link">
            Home
          </Nav.Link>
          <Nav.Link as={NavLink} to="/analysis" className="sidebar-link">
            Analysis
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
          <div className="mb-3">
            <SettingsMenu />
          </div>
          <small>Warm, polished client care for every bath, brush, and bow.</small>
        </div>
      </aside>

      <Offcanvas show={show} onHide={onHide} className="d-md-none sidebar-offcanvas">
        <Offcanvas.Header closeButton>
          <Offcanvas.Title>Barks Bubbles & Love</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
          <div className="d-flex justify-content-end mb-3">
            <SettingsMenu />
          </div>
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
              to="/analysis"
              onClick={onHide}
              className="sidebar-link"
            >
              Analysis
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
