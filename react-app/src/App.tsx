import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ThemeProvider } from "./components/common/ThemeProvider";
import AppLayout from "./components/layout/AppLayout";
import HomePage from "./pages/HomePage";
import ContactsPage from "./pages/ContactsPage";
import PetsPage from "./pages/PetsPage";
import SchedulePage from "./pages/SchedulePage";
import AnalysisPage from "./pages/AnalysisPage";
import AppointmentHistoryPage from "./pages/AppointmentHistoryPage";
import ArchivePage from "./pages/ArchivePage";
import ClientDetailsPage from "./pages/ClientDetailsPage";
import PetDetailsPage from "./pages/PetDetailsPage";

const App = () => {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AppLayout />}>
            <Route index element={<Navigate to="/home" replace />} />
            <Route path="home" element={<HomePage />} />
            <Route path="analysis" element={<AnalysisPage />} />
            <Route path="contacts" element={<ContactsPage />} />
            <Route path="pets" element={<PetsPage />} />
            <Route path="schedule" element={<SchedulePage />} />
            <Route path="appointments/history" element={<AppointmentHistoryPage />} />
            <Route path="archives/:archiveType" element={<ArchivePage />} />
            <Route path="clients/:clientId" element={<ClientDetailsPage />} />
            <Route path="pets/:petId" element={<PetDetailsPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
};

export default App;
