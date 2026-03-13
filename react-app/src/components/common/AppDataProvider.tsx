import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { mockAppointments, mockOwners, mockPets } from "../../data/mockData";
import { getApiBaseUrl } from "../../lib/crmApi";
import type { Appointment, Owner, Pet } from "../../types/models";

interface BootstrapPayload {
  owners: Owner[];
  pets: Pet[];
  appointments: Appointment[];
}

interface AppDataContextValue {
  owners: Owner[];
  pets: Pet[];
  appointments: Appointment[];
  isBootstrapping: boolean;
  dataMode: "mock" | "api";
  refreshData: () => Promise<void>;
  setOwners: React.Dispatch<React.SetStateAction<Owner[]>>;
  setPets: React.Dispatch<React.SetStateAction<Pet[]>>;
  setAppointments: React.Dispatch<React.SetStateAction<Appointment[]>>;
}

const AppDataContext = createContext<AppDataContextValue | null>(null);

async function loadBootstrapData(): Promise<BootstrapPayload> {
  const response = await fetch(`${getApiBaseUrl()}/bootstrap`);
  if (!response.ok) {
    throw new Error(`Bootstrap request failed with status ${response.status}`);
  }

  return (await response.json()) as BootstrapPayload;
}

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [owners, setOwners] = useState<Owner[]>(mockOwners);
  const [pets, setPets] = useState<Pet[]>(mockPets);
  const [appointments, setAppointments] = useState<Appointment[]>(mockAppointments);
  const [isBootstrapping, setIsBootstrapping] = useState(false);
  const [dataMode, setDataMode] = useState<"mock" | "api">("mock");

  const refreshData = async () => {
    setIsBootstrapping(true);

    try {
      const payload = await loadBootstrapData();
      setOwners(payload.owners);
      setPets(payload.pets);
      setAppointments(payload.appointments);
      setDataMode("api");
    } catch {
      setOwners(mockOwners);
      setPets(mockPets);
      setAppointments(mockAppointments);
      setDataMode("mock");
    } finally {
      setIsBootstrapping(false);
    }
  };

  useEffect(() => {
    void refreshData();
  }, []);

  const value = useMemo(
    () => ({
      owners,
      pets,
      appointments,
      isBootstrapping,
      dataMode,
      refreshData,
      setOwners,
      setPets,
      setAppointments,
    }),
    [appointments, dataMode, isBootstrapping, owners, pets],
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAppData() {
  const context = useContext(AppDataContext);

  if (!context) {
    throw new Error("useAppData must be used within AppDataProvider.");
  }

  return context;
}
