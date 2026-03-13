import { Nav, Offcanvas } from "react-bootstrap";
import { NavLink } from "react-router-dom";
import { useAuth } from "../common/useAuth";
import SettingsMenu from "./SettingsMenu";

interface SidebarProps {
  show: boolean;
  onHide: () => void;
}

const navItems = [
  {
    to: "/home",
    label: "Home",
    icon: (
      <svg viewBox="0 0 24 24" focusable="false">
        <path d="M4 10.5L12 4l8 6.5V20H4v-9.5Z" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" />
        <path d="M9.5 20v-5h5v5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    to: "/contacts",
    label: "Clients",
    icon: (
      <svg viewBox="0 0 24 24" focusable="false">
        <path d="M6.5 19a4.5 4.5 0 0 1 9 0M11 11.5a3.5 3.5 0 1 0 0-7a3.5 3.5 0 0 0 0 7ZM17.5 8.5a2.5 2.5 0 1 1 0 5M18.5 19a3.4 3.4 0 0 0-2.2-3.18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    to: "/pets",
    label: "Pets",
    icon: (
      <svg viewBox="0 0 24 24" focusable="false">
        <path d="M8.2 10.7a2 2 0 1 0 0-4a2 2 0 0 0 0 4Zm7.6 0a2 2 0 1 0 0-4a2 2 0 0 0 0 4ZM5.7 15a1.8 1.8 0 1 0 0-3.6A1.8 1.8 0 0 0 5.7 15Zm12.6 0a1.8 1.8 0 1 0 0-3.6a1.8 1.8 0 0 0 0 3.6ZM12 19c2.8 0 5-1.37 5-3.06c0-1.44-1.04-2.2-2.26-2.2c-.96 0-1.36.5-2.74.5s-1.78-.5-2.74-.5C8.04 13.74 7 14.5 7 15.94C7 17.63 9.2 19 12 19Z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    to: "/schedule",
    label: "Appointments",
    icon: (
      <svg viewBox="0 0 24 24" focusable="false">
        <path d="M7 4.5v3M17 4.5v3M4.5 9.5h15M6 7h12a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 18 19H6a1.5 1.5 0 0 1-1.5-1.5v-9A1.5 1.5 0 0 1 6 7Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    to: "/analysis",
    label: "Analysis",
    icon: (
      <svg viewBox="0 0 24 24" focusable="false">
        <path d="M5 19V10M12 19V5M19 19v-8" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    to: "/users",
    label: "Users",
    icon: (
      <svg viewBox="0 0 24 24" focusable="false">
        <path d="M9 11a3 3 0 1 0 0-6a3 3 0 0 0 0 6Zm8 1.5a2.5 2.5 0 1 0 0-5M4.5 19a4.5 4.5 0 0 1 9 0M16 18.5c0-1.75-1.12-3.22-2.68-3.78" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
] as const;

export default function Sidebar({ show, onHide }: SidebarProps) {
  const { user } = useAuth();
  const visibleNavItems = navItems.filter(
    (item) => item.to !== "/users" || user?.role === "admin",
  );
  const roleLabel =
    user?.role === "admin"
      ? "Administrator"
      : user?.role === "groomer"
        ? "Pet Groomer"
        : "Client User";

  return (
    <>
      <aside className="sidebar-desktop d-none d-lg-flex flex-column">
        <div className="sidebar-top">
          <div className="sidebar-brand">
            <span className="sidebar-brand-mark" aria-hidden="true">🐶</span>
            <div>
              <p className="sidebar-eyebrow mb-1">Pet Grooming Manager</p>
              <h4 className="sidebar-title mb-0">Barks Bubbles & Love</h4>
            </div>
          </div>
          <div className="sidebar-settings-wrap">
            <SettingsMenu />
          </div>
        </div>

        <Nav className="sidebar-nav flex-column gap-2">
          {visibleNavItems.map((item) => (
            <Nav.Link key={item.to} as={NavLink} to={item.to} className="sidebar-link">
              <span aria-hidden="true" className="sidebar-link-icon">
                {item.icon}
              </span>
              <span>{item.label}</span>
            </Nav.Link>
          ))}
        </Nav>

        <div className="sidebar-footer mt-auto">
          <small>Warm, polished client care for every bath, brush, and bow.</small>
        </div>
      </aside>

      <Offcanvas show={show} onHide={onHide} className="d-lg-none sidebar-offcanvas">
        <Offcanvas.Header closeButton>
          <div className="sidebar-offcanvas-header-main">
            {user && (
              <div className="sidebar-user-chip sidebar-user-chip-mobile">
                <strong>{user.firstName} {user.lastName}</strong>
                <span>{roleLabel}</span>
              </div>
            )}
            <Offcanvas.Title>Barks Bubbles & Love</Offcanvas.Title>
          </div>
        </Offcanvas.Header>
        <Offcanvas.Body>
          <div className="d-flex justify-content-end mb-3">
            <SettingsMenu
              toggleClassName="sidebar-offcanvas-settings-btn"
              onNavigate={onHide}
            />
          </div>
          <Nav className="flex-column gap-2">
            {visibleNavItems.map((item) => (
              <Nav.Link
                key={item.to}
                as={NavLink}
                to={item.to}
                onClick={onHide}
                className="sidebar-link"
              >
                <span aria-hidden="true" className="sidebar-link-icon">
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </Nav.Link>
            ))}
          </Nav>
        </Offcanvas.Body>
      </Offcanvas>
    </>
  );
}
