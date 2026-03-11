import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "./components/layout/AppLayout";
import HomePage from "./pages/HomePage";
import ContactsPage from "./pages/ContactsPage";
import PetsPage from "./pages/PetsPage";
import SchedulePage from "./pages/SchedulePage";
import ClientDetailsPage from "./pages/ClientDetailsPage";
import PetDetailsPage from "./pages/PetDetailsPage";

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<Navigate to="/home" replace />} />
          <Route path="home" element={<HomePage />} />
          <Route path="contacts" element={<ContactsPage />} />
          <Route path="pets" element={<PetsPage />} />
          <Route path="schedule" element={<SchedulePage />} />
          <Route path="clients/:clientId" element={<ClientDetailsPage />} />
          <Route path="pets/:petId" element={<PetDetailsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;
