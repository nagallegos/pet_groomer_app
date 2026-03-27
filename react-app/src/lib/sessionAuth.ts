const SESSION_TOKEN_KEY = "barks-session-token";

export function getStoredSessionToken() {
  if (typeof window === "undefined") {
    return "";
  }

  try {
    return window.localStorage.getItem(SESSION_TOKEN_KEY) ?? "";
  } catch {
    return "";
  }
}

export function storeSessionToken(token: string | null | undefined) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    if (token) {
      window.localStorage.setItem(SESSION_TOKEN_KEY, token);
    } else {
      window.localStorage.removeItem(SESSION_TOKEN_KEY);
    }
  } catch {
    // Ignore storage failures and keep going.
  }
}

export function buildSessionAuthHeaders() {
  const token = getStoredSessionToken();
  const headers: Record<string, string> = {};
  if (token) {
    headers["X-Session-Token"] = token;
  }
  return headers;
}
