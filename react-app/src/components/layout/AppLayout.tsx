import { useState } from "react";
import { Container } from "react-bootstrap";
import { AppToastProvider } from "../common/AppToastProvider";
import { Outlet } from "react-router-dom";
import { useAuth } from "../common/useAuth";
import NotificationBell from "./NotificationBell";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

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
      <div className="app-shell">
        <Topbar onMenuClick={() => setShowSidebar(true)} />
        <Sidebar show={showSidebar} onHide={() => setShowSidebar(false)} />

        <main className="page-content">
          <Container fluid className="py-3 py-md-4">
            {user && (
              <div className="desktop-user-banner d-none d-lg-flex">
                <div className="desktop-user-banner-actions">
                  <NotificationBell />
                </div>
                <div className="desktop-user-banner-text">
                  <strong>{user.firstName} {user.lastName}</strong>
                  <span>{roleLabel}</span>
                </div>
              </div>
            )}
            <Outlet />
          </Container>
        </main>
      </div>
    </AppToastProvider>
  );
}
