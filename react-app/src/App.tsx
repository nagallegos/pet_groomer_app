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
import ClientHomePage from "./pages/ClientHomePage";
import ClientPetsPage from "./pages/ClientPetsPage";
import ClientAppointmentsPage from "./pages/ClientAppointmentsPage";
import RequestsPage from "./pages/RequestsPage";
import NotificationsPage from "./pages/NotificationsPage";
import PersonalizationPage from "./pages/PersonalizationPage";
import RequestPasswordResetPage from "./pages/RequestPasswordResetPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import AccountSetupPage from "./pages/AccountSetupPage";
import { useAuth } from "./components/common/useAuth";

function HomeRoute() {
  const { user } = useAuth();
  return user?.role === "client" ? <ClientHomePage /> : <HomePage />;
}

function PetsRoute() {
  const { user } = useAuth();
  return user?.role === "client" ? <ClientPetsPage /> : <PetsPage />;
}

const App = () => {
  return (
    <AuthProvider>
      <ThemeProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/forgot-password" element={<RequestPasswordResetPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/account-setup" element={<AccountSetupPage />} />
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
                <Route path="home" element={<HomeRoute />} />
                <Route path="pets" element={<PetsRoute />} />
                <Route path="requests" element={<RequestsPage />} />
                <Route path="notifications" element={<NotificationsPage />} />
                <Route path="personalization" element={<PersonalizationPage />} />
                <Route path="appointments" element={<RequireAuth allowedRoles={["client"]} />}>
                  <Route index element={<ClientAppointmentsPage />} />
                </Route>
                <Route element={<RequireAuth allowedRoles={["admin", "groomer"]} />}>
                  <Route path="analysis" element={<AnalysisPage />} />
                  <Route path="contacts" element={<ContactsPage />} />
                  <Route path="schedule" element={<SchedulePage />} />
                  <Route path="appointments/history" element={<AppointmentHistoryPage />} />
                  <Route path="archives/:archiveType" element={<ArchivePage />} />
                  <Route path="clients/:clientId" element={<ClientDetailsPage />} />
                  <Route path="pets/:petId" element={<PetDetailsPage />} />
                </Route>
                <Route element={<RequireAuth allowedRoles={["admin"]} />}>
                  <Route path="users" element={<UsersPage />} />
                </Route>
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </AuthProvider>
  );
};

export default App;
