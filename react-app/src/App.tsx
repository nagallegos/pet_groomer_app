import { Suspense, lazy } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppDataProvider } from "./components/common/AppDataProvider";
import { AuthProvider } from "./components/common/AuthProvider";
import PageLoader from "./components/common/PageLoader";
import RequireAuth from "./components/common/RequireAuth";
import { ThemeProvider } from "./components/common/ThemeProvider";
import AppLayout from "./components/layout/AppLayout";
import { useAuth } from "./components/common/useAuth";

const LoginPage = lazy(() => import("./pages/LoginPage"));
const HomePage = lazy(() => import("./pages/HomePage"));
const ContactsPage = lazy(() => import("./pages/ContactsPage"));
const PetsPage = lazy(() => import("./pages/PetsPage"));
const SchedulePage = lazy(() => import("./pages/SchedulePage"));
const AnalysisPage = lazy(() => import("./pages/AnalysisPage"));
const AppointmentHistoryPage = lazy(() => import("./pages/AppointmentHistoryPage"));
const ArchivePage = lazy(() => import("./pages/ArchivePage"));
const ClientDetailsPage = lazy(() => import("./pages/ClientDetailsPage"));
const PetDetailsPage = lazy(() => import("./pages/PetDetailsPage"));
const UsersPage = lazy(() => import("./pages/UsersPage"));
const AppointmentResponsePage = lazy(() => import("./pages/AppointmentResponsePage"));
const ClientHomePage = lazy(() => import("./pages/ClientHomePage"));
const ClientPetsPage = lazy(() => import("./pages/ClientPetsPage"));
const ClientAppointmentsPage = lazy(() => import("./pages/ClientAppointmentsPage"));
const RequestsPage = lazy(() => import("./pages/RequestsPage"));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage"));
const PersonalizationPage = lazy(() => import("./pages/PersonalizationPage"));
const RequestPasswordResetPage = lazy(() => import("./pages/RequestPasswordResetPage"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage"));
const AccountSetupPage = lazy(() => import("./pages/AccountSetupPage"));

function RouteFallback() {
  return <PageLoader label="Loading page..." />;
}

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
          <Suspense fallback={<RouteFallback />}>
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
          </Suspense>
        </BrowserRouter>
      </ThemeProvider>
    </AuthProvider>
  );
};

export default App;
