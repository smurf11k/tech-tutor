export function parsePaymentReturnFromUrl(search) {
  const params = new URLSearchParams(search);
  const sessionId =
    params.get("session_id") ||
    params.get("sessionId") ||
    params.get("session");
  const courseId = params.get("course_id") || params.get("courseId");

  return { sessionId, courseId };
}

export async function fetchPaymentStatus({ sessionId, courseId }) {
  const qs = new URLSearchParams();
  if (sessionId) qs.set("session_id", sessionId);
  if (courseId) qs.set("course_id", courseId);

  const apiBase =
    import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";
  const token = localStorage.getItem("techtutor_token");

  const resp = await fetch(`${apiBase}/payments/status?${qs.toString()}`, {
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!resp.ok) {
    throw new Error("Failed to fetch payment status");
  }

  return resp.json();
}
