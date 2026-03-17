import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useAuth } from "./useAuth";

export type ThemeMode = "light" | "dark";
export type ThemeName = "lavender" | "green" | "blue" | "pink" | "white" | "high-contrast";

const themeNameValues: ThemeName[] = [
  "lavender",
  "green",
  "blue",
  "pink",
  "white",
  "high-contrast",
];

const normalizeThemeName = (value: string | null | undefined): ThemeName => {
  return themeNameValues.includes(value as ThemeName) ? (value as ThemeName) : "lavender";
};

interface ThemeContextValue {
  themeMode: ThemeMode;
  themeName: ThemeName;
  setThemeMode: (mode: ThemeMode) => void;
  setThemeName: (name: ThemeName) => void;
  toggleThemeMode: () => void;
  isDarkModeAvailable: boolean;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function getStoredThemeMode() {
  const savedMode =
    window.localStorage.getItem("bb-love-theme-mode") ??
    window.localStorage.getItem("bb-love-theme");
  return savedMode === "dark" ? "dark" : "light";
}

function getStoredThemeName() {
  const savedName = window.localStorage.getItem("bb-love-theme-name");
  return normalizeThemeName(savedName);
}

function ThemeProviderInner({
  children,
  initialThemeMode,
  initialThemeName,
}: {
  children: ReactNode;
  initialThemeMode: ThemeMode;
  initialThemeName: ThemeName;
}) {
  const [themeMode, setThemeModeState] = useState<ThemeMode>(initialThemeMode);
  const [themeName, setThemeNameState] = useState<ThemeName>(initialThemeName);

  useEffect(() => {
    document.documentElement.dataset.theme = themeMode;
    document.documentElement.dataset.colorTheme = themeName;
    document.documentElement.setAttribute("data-bs-theme", themeMode);
    window.localStorage.setItem("bb-love-theme-mode", themeMode);
    window.localStorage.setItem("bb-love-theme-name", themeName);
  }, [themeMode, themeName]);

  const setThemeMode = useCallback((mode: ThemeMode) => {
    if (themeName === "high-contrast" && mode === "dark") {
      setThemeModeState("light");
      return;
    }
    setThemeModeState(mode);
  }, [themeName]);

  const setThemeName = useCallback((name: ThemeName) => {
    setThemeNameState(name);
    if (name === "high-contrast") {
      setThemeModeState("light");
    }
  }, []);

  const toggleThemeMode = useCallback(() => {
    setThemeMode(themeMode === "dark" ? "light" : "dark");
  }, [setThemeMode, themeMode]);

  const value = useMemo(
    () => ({
      themeMode,
      themeName,
      setThemeMode,
      setThemeName,
      toggleThemeMode,
      isDarkModeAvailable: themeName !== "high-contrast",
    }),
    [setThemeMode, setThemeName, themeMode, themeName, toggleThemeMode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const initialThemeName = normalizeThemeName(user?.themeName ?? getStoredThemeName());
  const initialThemeMode =
    initialThemeName === "high-contrast"
      ? "light"
      : (user?.themeMode ?? getStoredThemeMode());

  return (
    <ThemeProviderInner
      key={`${user?.id ?? "guest"}:${user?.themeName ?? "none"}:${user?.themeMode ?? "none"}`}
      initialThemeMode={initialThemeMode}
      initialThemeName={initialThemeName}
    >
      {children}
    </ThemeProviderInner>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }

  return context;
}
