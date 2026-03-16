import { useState } from "react";
import { Button, Container } from "react-bootstrap";
import { AppToastProvider } from "../common/AppToastProvider";
import { Outlet } from "react-router-dom";
import { useAuth } from "../common/useAuth";
import NotificationBell from "./NotificationBell";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import { List } from "react-bootstrap-icons";

export default function AppLayout() {
  const [showSidebar, setShowSidebar] = useState(false);
  const { user } = useAuth();
  const roleLabel =
    user?.role === "admin"
      ? "Administrator"
      : user?.role === "groomer"
        ? "Pet Groomer"
        : "Client User";

  return (
    <AppToastProvider>
      <div className={`app-shell${showSidebar ? " app-shell--sidebar-open" : " app-shell--sidebar-collapsed"}`}>
        <Topbar onMenuClick={() => setShowSidebar(true)} />
        <Sidebar show={showSidebar} onHide={() => setShowSidebar(false)} />

        <main className="page-content">
          <Container fluid className="py-3 py-md-4">
            <div className="desktop-topbar d-none d-lg-flex align-items-center justify-content-between">
              <Button
                variant="outline-secondary"
                className="desktop-menu-toggle"
                onClick={() => setShowSidebar((current) => !current)}
              >
                <span aria-hidden="true" className="topbar-btn-icon">
                  <List />
                </span>
                <span className="visually-hidden">Toggle sidebar</span>
              </Button>
              {user && (
                <div className="desktop-user-banner">
                  <div className="desktop-user-banner-actions">
                    <NotificationBell />
                  </div>
                  <div className="desktop-user-banner-text">
                    <strong>{user.firstName} {user.lastName}</strong>
                    <span>{roleLabel}</span>
                  </div>
                </div>
              )}
            </div>
            <Outlet />
          </Container>
        </main>
      </div>
    </AppToastProvider>
  );
}
