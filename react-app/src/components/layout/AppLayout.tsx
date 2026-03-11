import { useState } from "react";
import { Container } from "react-bootstrap";
import { AppToastProvider } from "../common/AppToastProvider";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function AppLayout() {
  const [showSidebar, setShowSidebar] = useState(false);

  return (
    <AppToastProvider>
      <div className="app-shell">
        <Topbar onMenuClick={() => setShowSidebar(true)} />
        <Sidebar show={showSidebar} onHide={() => setShowSidebar(false)} />

        <main className="page-content">
          <Container fluid className="py-3 py-md-4">
            <Outlet />
          </Container>
        </main>
      </div>
    </AppToastProvider>
  );
}
