import { useEffect, useMemo, useState, type ReactNode } from "react";
import { getApiBaseUrl, type AppUserRole } from "../../lib/crmApi";
import { AuthContext } from "./authContext";

export interface AppUser {
  id: string;
  email: string;
  username?: string;
  role: AppUserRole;
  name: string;
  firstName: string;
  lastName: string;
  phone: string;
  notifyByEmail: boolean;
  notifyByText: boolean;
  themeName?: string;
  themeMode?: "light" | "dark";
  lockedAt?: string;
  ownerId?: string;
}

export interface UserProfileInput {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  notifyByEmail: boolean;
  notifyByText: boolean;
  themeName?: string;
  themeMode?: "light" | "dark";
}

export interface AuthContextValue {
  user: AppUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (input: UserProfileInput) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  sendPasswordResetEmail: () => Promise<void>;
}

const API_BASE_URL = getApiBaseUrl();

async function authRequest(path: string, method: string, body?: unknown) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    credentials: "include",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const responseText = await response.text().catch(() => "");
    let message = `Request failed with status ${response.status}.`;

    if (responseText) {
      try {
        const payload = JSON.parse(responseText) as { error?: string };
        message = payload.error ?? message;
      } catch {
        message = responseText;
      }
    }

    throw new Error(message);
  }

  return response.json();
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    authRequest("/auth/me", "GET")
      .then((payload) => {
        if (!cancelled) {
          setUser(payload.user);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setUser(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      login: async (email, password) => {
        const payload = await authRequest("/auth/login", "POST", { email, password });
        setUser(payload.user);
      },
      logout: async () => {
        await authRequest("/auth/logout", "POST");
        setUser(null);
      },
      updateProfile: async (input) => {
        const payload = await authRequest("/auth/profile", "PUT", input);
        setUser(payload.user);
      },
      changePassword: async (currentPassword, newPassword) => {
        await authRequest("/auth/change-password", "POST", {
          currentPassword,
          newPassword,
        });
      },
      sendPasswordResetEmail: async () => {
        if (!user?.email) {
          throw new Error("No email address is available for this account.");
        }
        await authRequest("/auth/request-password-reset", "POST", {
          email: user.email,
        });
      },
    }),
    [isLoading, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
