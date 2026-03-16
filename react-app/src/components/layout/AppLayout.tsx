import { useState } from "react";
import { Container } from "react-bootstrap";
import { AppToastProvider } from "../common/AppToastProvider";
import { Outlet } from "react-router-dom";
import { useAuth } from "../common/useAuth";
import NotificationBell from "./NotificationBell";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function AppLayout() {
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [showDesktopSidebar, setShowDesktopSidebar] = useState(false);
  const { user } = useAuth();
  const roleLabel =
    user?.role === "admin"
      ? "Administrator"
      : user?.role === "groomer"
        ? "Pet Groomer"
        : "Client User";

  return (
    <AppToastProvider>
      <div className={`app-shell${showDesktopSidebar ? " app-shell--sidebar-open" : " app-shell--sidebar-collapsed"}`}>
        <Topbar onMenuClick={() => setShowMobileSidebar(true)} />
        <Sidebar
          showMobile={showMobileSidebar}
          onHideMobile={() => setShowMobileSidebar(false)}
          isDesktopOpen={showDesktopSidebar}
          onDesktopToggle={() => setShowDesktopSidebar((current) => !current)}
        />

        <main className="page-content">
          <Container fluid className="py-3 py-md-4">
            <div className="desktop-topbar d-none d-lg-flex align-items-center justify-content-end">
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
