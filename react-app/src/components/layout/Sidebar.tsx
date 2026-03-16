import { useEffect, useMemo, useState } from "react";
import { Badge, Nav, Offcanvas } from "react-bootstrap";
import { BarChart, Bell, Calendar, Clipboard, Heart, House, List, People, Person } from "react-bootstrap-icons";
import { NavLink } from "react-router-dom";
import { listUserNotifications } from "../../lib/crmApi";
import { useAuth } from "../common/useAuth";
import SettingsMenu from "./SettingsMenu";

interface SidebarProps {
  showMobile: boolean;
  onHideMobile: () => void;
  isDesktopOpen: boolean;
  onDesktopToggle: () => void;
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
    to: "/notifications",
    label: "Notifications",
    icon: <Bell />,
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

export default function Sidebar({
  showMobile,
  onHideMobile,
  isDesktopOpen,
  onDesktopToggle,
}: SidebarProps) {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
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

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const data = await listUserNotifications();
        if (!cancelled) {
          setUnreadCount(data.length);
        }
      } catch {
        if (!cancelled) {
          setUnreadCount(0);
        }
      }
    };

    if (user) {
      void load();
      const interval = window.setInterval(() => {
        void load();
      }, 30000);

      return () => {
        cancelled = true;
        window.clearInterval(interval);
      };
    }

    return () => {
      cancelled = true;
    };
  }, [user]);

  const navItemsWithBadge = useMemo(
    () =>
      visibleNavItems.map((item) => ({
        ...item,
        showBadge: item.to === "/notifications" && unreadCount > 0,
      })),
    [unreadCount, visibleNavItems],
  );

  return (
    <>
      <aside className="sidebar-desktop d-none d-lg-flex flex-column">
        <div className="sidebar-top">
          <div className="sidebar-top-controls">
            <span className="sidebar-brand-mark" aria-hidden="true">🐶</span>
            <button
              type="button"
              className="sidebar-menu-toggle"
              onClick={onDesktopToggle}
              aria-label={isDesktopOpen ? "Collapse sidebar" : "Expand sidebar"}
            >
              <List />
            </button>
          </div>
          <div className="sidebar-brand-text">
            <p className="sidebar-eyebrow mb-1">Pet Grooming Manager</p>
            <h4 className="sidebar-title mb-0">Barks Bubbles & Love</h4>
          </div>
          <div className="sidebar-settings-wrap">
            <SettingsMenu />
          </div>
        </div>

        <Nav className="sidebar-nav flex-column gap-2">
          {navItemsWithBadge.map((item) => (
            <Nav.Link key={item.to} as={NavLink} to={item.to} className="sidebar-link">
              <span aria-hidden="true" className="sidebar-link-icon">
                {item.icon}
              </span>
              <span className="sidebar-link-label">{item.label}</span>
              {item.showBadge && (
                <Badge pill bg="danger" className="sidebar-notification-badge">
                  {unreadCount}
                </Badge>
              )}
            </Nav.Link>
          ))}
        </Nav>

        <div className="sidebar-footer mt-auto">
          <small>Warm, polished client care for every bath, brush, and bow.</small>
        </div>
      </aside>

      <Offcanvas show={showMobile} onHide={onHideMobile} className="d-lg-none sidebar-offcanvas">
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
              onNavigate={onHideMobile}
            />
          </div>
          <Nav className="flex-column gap-2">
            {navItemsWithBadge.map((item) => (
              <Nav.Link
                key={item.to}
                as={NavLink}
                to={item.to}
                onClick={onHideMobile}
                className="sidebar-link"
              >
                <span aria-hidden="true" className="sidebar-link-icon">
                  {item.icon}
                </span>
                <span className="sidebar-link-label">{item.label}</span>
                {item.showBadge && (
                  <Badge pill bg="danger" className="sidebar-notification-badge">
                    {unreadCount}
                  </Badge>
                )}
              </Nav.Link>
            ))}
          </Nav>
        </Offcanvas.Body>
      </Offcanvas>
    </>
  );
}
