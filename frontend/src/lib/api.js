import axios from "axios";

const apiBaseUrl =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

export const backendOrigin = new URL(apiBaseUrl, "http://localhost:8000")
  .origin;

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

export function resolveBackendAssetUrl(url) {
  if (!url) {
    return "";
  }

  if (
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("blob:") ||
    url.startsWith("data:")
  ) {
    return url;
  }

  return new URL(
    url.startsWith("/") ? url : `/${url}`,
    backendOrigin,
  ).toString();
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
