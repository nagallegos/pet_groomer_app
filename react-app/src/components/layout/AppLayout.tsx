import { useMemo, useState } from "react";
import { Button, Container } from "react-bootstrap";
import { AppToastProvider } from "../common/AppToastProvider";
import { Outlet } from "react-router-dom";
import { useAuth } from "../common/useAuth";
import { CURRENT_RELEASE, getReleaseNotesSeenKey } from "../../lib/releaseNotes";
import NotificationBell from "./NotificationBell";
import ReleaseNotesContent from "./ReleaseNotesContent";
import ReleaseNotesModal from "./ReleaseNotesModal";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function AppLayout() {
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [showDesktopSidebar, setShowDesktopSidebar] = useState(false);
  const [dismissedReleaseNotesKey, setDismissedReleaseNotesKey] = useState<string | null>(null);
  const [showReleaseNotesPanel, setShowReleaseNotesPanel] = useState(false);
  const { user } = useAuth();
  const roleLabel =
    user?.role === "admin"
      ? "Administrator"
      : user?.role === "groomer"
        ? "Pet Groomer"
        : "Client User";
  const releaseNotesSeenKey = useMemo(
    () => (user ? getReleaseNotesSeenKey(user.id, CURRENT_RELEASE.version) : null),
    [user],
  );
  const showReleaseNotes = useMemo(() => {
    if (!user || !releaseNotesSeenKey || dismissedReleaseNotesKey === releaseNotesSeenKey) {
      return false;
    }

    try {
      return window.localStorage.getItem(releaseNotesSeenKey) !== "seen";
    } catch {
      return true;
    }
  }, [dismissedReleaseNotesKey, releaseNotesSeenKey, user]);

  const handleCloseReleaseNotes = () => {
    if (releaseNotesSeenKey) {
      try {
        window.localStorage.setItem(releaseNotesSeenKey, "seen");
      } catch {
        // Ignore storage failures and still let the user continue.
      }
    }
    setDismissedReleaseNotesKey(releaseNotesSeenKey);
  };

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
      <ReleaseNotesModal
        show={showReleaseNotes}
        release={CURRENT_RELEASE}
        onClose={handleCloseReleaseNotes}
      />
      {user && (
        <div className="release-notes-dock">
          {showReleaseNotesPanel && (
            <div className="release-notes-panel">
              <ReleaseNotesContent release={CURRENT_RELEASE} />
              <div className="release-notes-panel-actions">
                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={() => setShowReleaseNotesPanel(false)}
                >
                  Collapse
                </Button>
              </div>
            </div>
          )}
          <Button
            className="release-notes-toggle"
            onClick={() => setShowReleaseNotesPanel((current) => !current)}
          >
            v{CURRENT_RELEASE.version}
          </Button>
        </div>
      )}
    </AppToastProvider>
  );
}
