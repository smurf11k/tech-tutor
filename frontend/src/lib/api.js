import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api",
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

export async function createDevToken(credentials) {
  const response = await api.post("/dev/token", credentials);
  return response.data;
}

export default api;
