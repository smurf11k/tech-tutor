import axios from "axios";

const apiBaseUrl = "/api";

const runtimeConfig =
  typeof window !== "undefined" ? window.__TECHTUTOR_ENV__ || {} : {};

const configuredBackendOrigin =
  runtimeConfig.PUBLIC_BACKEND_ORIGIN?.trim() ||
  import.meta.env.VITE_BACKEND_ORIGIN?.trim();

export const backendOrigin =
  configuredBackendOrigin ||
  (typeof window !== "undefined"
    ? window.location.origin
    : runtimeConfig.PUBLIC_BACKEND_ORIGIN || "http://localhost:8000");

export const STORAGE_TOKEN_KEY = "techtutor_token";
export const STORAGE_USER_KEY = "techtutor_user";

const api = axios.create({
  baseURL: apiBaseUrl,
  headers: {
    Accept: "application/json",
  },
});

export function withAuth(token) {
  if (!token) {
    return api;
  }

  return axios.create({
    baseURL: api.defaults.baseURL,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
}

export function postFormData(client, url, formData) {
  return client.post(url, formData);
}

function resolveSameOriginAssetUrl(url) {
  if (typeof window === "undefined") {
    return new URL(url.startsWith("/") ? url : `/${url}`, backendOrigin).toString();
  }

  if (url.startsWith("/api/storage") || url.startsWith("/storage")) {
    return new URL(url, window.location.origin).toString();
  }

  return new URL(url.startsWith("/") ? url : `/${url}`, backendOrigin).toString();
}

export function resolveBackendAssetUrl(url) {
  if (!url) {
    return "";
  }

  if (url.startsWith("http://") || url.startsWith("https://")) {
    try {
      const parsed = new URL(url);

      if (
        parsed.pathname.startsWith("/api/storage") ||
        parsed.pathname.startsWith("/storage")
      ) {
        return resolveSameOriginAssetUrl(
          `${parsed.pathname}${parsed.search}${parsed.hash}`,
        );
      }

      const backendOriginUrl = new URL(backendOrigin);

      if (parsed.origin === backendOriginUrl.origin) {
        return `${parsed.pathname}${parsed.search}${parsed.hash}`;
      }
    } catch {
      return url;
    }

    return url;
  }

  if (url.startsWith("blob:") || url.startsWith("data:")) {
    return url;
  }

  return resolveSameOriginAssetUrl(
    url.startsWith("/") ? url : `/${url}`,
  );
}

export function readStoredSession() {
  const token = localStorage.getItem(STORAGE_TOKEN_KEY);
  const userRaw = localStorage.getItem(STORAGE_USER_KEY);

  if (!token || !userRaw) {
    return { token: "", user: null };
  }

  try {
    return { token, user: JSON.parse(userRaw) };
  } catch {
    return { token: "", user: null };
  }
}

export function persistSession({ token, user }) {
  localStorage.setItem(STORAGE_TOKEN_KEY, token);
  localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(STORAGE_TOKEN_KEY);
  localStorage.removeItem(STORAGE_USER_KEY);
}

export async function loginUser(credentials) {
  const response = await api.post("/auth/login", credentials);
  return response.data;
}

export function buildGoogleLoginUrl(returnTo) {
  const url = new URL("/auth/google/redirect", backendOrigin);

  if (returnTo) {
    url.searchParams.set("return_to", returnTo);
  }

  return url.toString();
}

export default api;
