import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppDataProvider } from "./components/common/AppDataProvider";
import { AuthProvider } from "./components/common/AuthProvider";
import RequireAuth from "./components/common/RequireAuth";
import { ThemeProvider } from "./components/common/ThemeProvider";
import AppLayout from "./components/layout/AppLayout";
import LoginPage from "./pages/LoginPage";
import HomePage from "./pages/HomePage";
import ContactsPage from "./pages/ContactsPage";
import PetsPage from "./pages/PetsPage";
import SchedulePage from "./pages/SchedulePage";
import AnalysisPage from "./pages/AnalysisPage";
import AppointmentHistoryPage from "./pages/AppointmentHistoryPage";
import ArchivePage from "./pages/ArchivePage";
import ClientDetailsPage from "./pages/ClientDetailsPage";
import PetDetailsPage from "./pages/PetDetailsPage";
import UsersPage from "./pages/UsersPage";
import AppointmentResponsePage from "./pages/AppointmentResponsePage";

const App = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/appointment-response" element={<AppointmentResponsePage />} />
            <Route
              element={
                <RequireAuth />
              }
            >
              <Route
                element={
                  <AppDataProvider>
                    <AppLayout />
                  </AppDataProvider>
                }
              >
                <Route path="/" element={<Navigate to="/home" replace />} />
                <Route path="home" element={<HomePage />} />
                <Route path="analysis" element={<AnalysisPage />} />
                <Route path="contacts" element={<ContactsPage />} />
                <Route path="pets" element={<PetsPage />} />
                <Route path="schedule" element={<SchedulePage />} />
                <Route path="appointments/history" element={<AppointmentHistoryPage />} />
                <Route path="archives/:archiveType" element={<ArchivePage />} />
                <Route path="clients/:clientId" element={<ClientDetailsPage />} />
                <Route path="pets/:petId" element={<PetDetailsPage />} />
                <Route element={<RequireAuth allowedRoles={["admin"]} />}>
                  <Route path="users" element={<UsersPage />} />
                </Route>
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
