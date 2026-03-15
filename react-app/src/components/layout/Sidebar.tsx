import { Nav, Offcanvas } from "react-bootstrap";
import { BarChart, Calendar, Clipboard, Heart, House, People, Person } from "react-bootstrap-icons";
import { NavLink } from "react-router-dom";
import { useAuth } from "../common/useAuth";
import SettingsMenu from "./SettingsMenu";

interface SidebarProps {
  show: boolean;
  onHide: () => void;
}

const staffNavItems = [
  {
    to: "/home",
    label: "Home",
    icon: <House />,
  },
  {
    to: "/contacts",
    label: "Clients",
    icon: <People />,
  },
  {
    to: "/pets",
    label: "Pets",
    icon: <Heart />,
  },
  {
    to: "/schedule",
    label: "Appointments",
    icon: <Calendar />,
  },
  {
    to: "/requests",
    label: "Requests",
    icon: <Clipboard />,
  },
  {
    to: "/analysis",
    label: "Analysis",
    icon: <BarChart />,
  },
  {
    to: "/users",
    label: "Users",
    icon: <Person />,
  },
] as const;

const clientNavItems = [
  staffNavItems[0],
  staffNavItems[2],
  {
    to: "/appointments",
    label: "Appointments",
    icon: staffNavItems[3].icon,
  },
  staffNavItems[4],
] as const;

export default function Sidebar({ show, onHide }: SidebarProps) {
  const { user } = useAuth();
  const baseNavItems = user?.role === "client" ? clientNavItems : staffNavItems;
  const visibleNavItems = baseNavItems.filter(
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
      <Offcanvas show={show} onHide={onHide} className="sidebar-offcanvas">
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
