import axios from "axios";

const apiBaseUrl =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";
export const backendOrigin = new URL(apiBaseUrl, "http://localhost:8000")
  .origin;

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
