import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";

export interface ReminderSettings {
  enabled: boolean;
  leadMinutes: number;
}

type PermissionState = "prompt" | "granted" | "denied" | "prompt-with-rationale" | "unknown";

interface MobileRemindersContextValue {
  settings: ReminderSettings;
  isSupported: boolean;
  permissionState: PermissionState;
  saveSettings: (settings: ReminderSettings) => Promise<void>;
  refreshPermissionState: () => Promise<void>;
  requestPermission: () => Promise<PermissionState>;
}

const DEFAULT_SETTINGS: ReminderSettings = {
  enabled: false,
  leadMinutes: 1440,
};

const STORAGE_KEY = "barks-mobile-reminder-settings";

const MobileRemindersContext = createContext<MobileRemindersContextValue | null>(null);

function loadStoredSettings(): ReminderSettings {
  if (typeof window === "undefined") {
    return DEFAULT_SETTINGS;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return DEFAULT_SETTINGS;
    }

    const parsed = JSON.parse(raw) as Partial<ReminderSettings>;
    return {
      enabled: parsed.enabled ?? DEFAULT_SETTINGS.enabled,
      leadMinutes: parsed.leadMinutes ?? DEFAULT_SETTINGS.leadMinutes,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function isNotificationPlatformSupported() {
  return Capacitor.isNativePlatform();
}

async function readPermissionState(): Promise<PermissionState> {
  if (!isNotificationPlatformSupported()) {
    return "unknown";
  }

  const permissions = await LocalNotifications.checkPermissions();
  return permissions.display;
}

export function MobileRemindersProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<ReminderSettings>(() => loadStoredSettings());
  const [permissionState, setPermissionState] = useState<PermissionState>("unknown");
  const isSupported = isNotificationPlatformSupported();

  useEffect(() => {
    if (!isSupported) {
      setPermissionState("unknown");
      return;
    }

    void readPermissionState().then(setPermissionState).catch(() => setPermissionState("unknown"));
  }, [isSupported]);

  const persistSettings = async (nextSettings: ReminderSettings) => {
    setSettings(nextSettings);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSettings));
    } catch {
      // Ignore localStorage failures and keep in-memory state.
    }
  };

  const refreshPermissionState = async () => {
    const nextState = await readPermissionState();
    setPermissionState(nextState);
  };

  const requestPermission = async () => {
    if (!isSupported) {
      return "unknown" as const;
    }

    const permissions = await LocalNotifications.requestPermissions();
    const nextState = permissions.display;
    setPermissionState(nextState);
    return nextState;
  };

  const value = useMemo(
    () => ({
      settings,
      isSupported,
      permissionState,
      saveSettings: persistSettings,
      refreshPermissionState,
      requestPermission,
    }),
    [settings, isSupported, permissionState],
  );

  return (
    <MobileRemindersContext.Provider value={value}>
      {children}
    </MobileRemindersContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useMobileReminders() {
  const context = useContext(MobileRemindersContext);

  if (!context) {
    throw new Error("useMobileReminders must be used within MobileRemindersProvider.");
  }

  return context;
}
