import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
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

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => {
    const savedMode =
      window.localStorage.getItem("bb-love-theme-mode") ??
      window.localStorage.getItem("bb-love-theme");
    return savedMode === "dark" ? "dark" : "light";
  });
  const [themeName, setThemeNameState] = useState<ThemeName>(() => {
    const savedName = window.localStorage.getItem("bb-love-theme-name");
    return normalizeThemeName(savedName);
  });

  useEffect(() => {
    if (!user) {
      return;
    }

    if (user.themeName) {
      setThemeNameState(normalizeThemeName(user.themeName));
    }
    if (user.themeMode) {
      setThemeModeState(user.themeMode);
    }
  }, [user]);

  useEffect(() => {
    if (themeName === "high-contrast" && themeMode === "dark") {
      setThemeModeState("light");
    }
  }, [themeMode, themeName]);

  useEffect(() => {
    document.documentElement.dataset.theme = themeMode;
    document.documentElement.dataset.colorTheme = themeName;
    document.documentElement.setAttribute("data-bs-theme", themeMode);
    window.localStorage.setItem("bb-love-theme-mode", themeMode);
    window.localStorage.setItem("bb-love-theme-name", themeName);
  }, [themeMode, themeName]);

  const setThemeMode = (mode: ThemeMode) => {
    if (themeName === "high-contrast" && mode === "dark") {
      setThemeModeState("light");
      return;
    }
    setThemeModeState(mode);
  };

  const setThemeName = (name: ThemeName) => {
    setThemeNameState(name);
    if (name === "high-contrast") {
      setThemeModeState("light");
    }
  };

  const value = useMemo(
    () => ({
      themeMode,
      themeName,
      setThemeMode,
      setThemeName,
      toggleThemeMode: () =>
        setThemeMode(themeMode === "dark" ? "light" : "dark"),
      isDarkModeAvailable: themeName !== "high-contrast",
    }),
    [themeMode, themeName],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }

  return context;
}
