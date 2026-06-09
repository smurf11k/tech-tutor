import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  STORAGE_USER_KEY,
  backendOrigin,
  clearSession,
  loginUser,
  persistSession,
  readStoredSession,
  withAuth,
} from "@/lib/api";
import { preloadCaptcha } from "@/lib/captcha";

const GOOGLE_AUTH_MESSAGE_TYPE = "techtutor-google-auth";

function getTrustedGoogleAuthOrigins() {
  const origins = new Set([backendOrigin]);

  try {
    const parsed = new URL(backendOrigin);

    if (parsed.hostname === "localhost") {
      origins.add(
        `${parsed.protocol}//127.0.0.1${parsed.port ? `:${parsed.port}` : ""}`,
      );
    }

    if (parsed.hostname === "127.0.0.1") {
      origins.add(
        `${parsed.protocol}//localhost${parsed.port ? `:${parsed.port}` : ""}`,
      );
    }
  } catch {
    // Keep the exact configured origin only when parsing fails.
  }

  return origins;
}

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const stored = readStoredSession();
  const [token, setToken] = useState(stored.token);
  const [user, setUser] = useState(stored.user);
  const [loading, setLoading] = useState(Boolean(stored.token));

  const client = useMemo(() => withAuth(token), [token]);

  const applySession = useCallback((session) => {
    persistSession(session);
    setToken(session.token);
    setUser(session.user);
  }, []);

  const clearAuth = useCallback(() => {
    clearSession();
    setToken("");
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return null;
    }

    try {
      const response = await client.get("/auth/me");
      setUser(response.data);
      localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(response.data));
      return response.data;
    } catch {
      clearAuth();
      return null;
    } finally {
      setLoading(false);
    }
  }, [client, token, clearAuth]);

  useEffect(() => {
    preloadCaptcha().catch(() => {
      // Auth forms surface load errors when a token is requested.
    });
  }, []);

  useEffect(() => {
    if (token) {
      refreshUser();
    } else {
      setLoading(false);
    }
  }, [token, refreshUser]);

  useEffect(() => {
    const trustedOrigins = getTrustedGoogleAuthOrigins();

    function handleGoogleAuthMessage(event) {
      if (!trustedOrigins.has(event.origin)) {
        return;
      }

      if (event.data?.type !== GOOGLE_AUTH_MESSAGE_TYPE) {
        return;
      }

      const payload = event.data?.payload;

      if (!payload?.token || !payload?.user) {
        return;
      }

      applySession({ token: payload.token, user: payload.user });
    }

    window.addEventListener("message", handleGoogleAuthMessage);
    return () => window.removeEventListener("message", handleGoogleAuthMessage);
  }, [applySession]);

  const login = useCallback(
    async (credentials) => {
      const data = await loginUser({
        ...credentials,
        token_name: credentials.token_name ?? "web",
      });
      applySession({ token: data.token, user: data.user });
      return data;
    },
    [applySession],
  );

  const logout = useCallback(async () => {
    try {
      if (token) {
        await client.post("/auth/logout");
      }
    } catch {
      // The token can already be invalidated by an account deletion flow.
    } finally {
      clearAuth();
    }
  }, [client, token, clearAuth]);

  const value = useMemo(
    () => ({
      token,
      user,
      loading,
      isAuthenticated: Boolean(token && user),
      isAdmin: user?.role === "admin",
      isInstructor: user?.role === "instructor" || user?.role === "admin",
      isStudent: user?.role === "student",
      client,
      login,
      logout,
      applySession,
      refreshUser,
    }),
    [token, user, loading, client, login, logout, applySession, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
