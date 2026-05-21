import api, { STORAGE_TOKEN_KEY, withAuth } from "@/lib/api";

export function parsePaymentReturnFromUrl(search) {
  const params = new URLSearchParams(search);
  const sessionId =
    params.get("session_id") ||
    params.get("sessionId") ||
    params.get("session");
  const courseId = params.get("course_id") || params.get("courseId");

  return { sessionId, courseId };
}

export async function confirmStripeCheckout(sessionId) {
  const token = localStorage.getItem(STORAGE_TOKEN_KEY);

  if (!token) {
    throw new Error("Log in to finalize your payment.");
  }

  const client = withAuth(token);
  const response = await client.post("/payments/stripe/confirm", {
    session_id: sessionId,
  });

  return response.data;
}

export async function fetchPaymentStatus({ sessionId, courseId }) {
  const qs = new URLSearchParams();
  if (sessionId) qs.set("session_id", sessionId);
  if (courseId) qs.set("course_id", courseId);

  const token = localStorage.getItem(STORAGE_TOKEN_KEY);
  const client = token ? withAuth(token) : api;
  const response = await client.get(`/payments/status?${qs.toString()}`);

  return response.data;
}

/**
 * After Stripe redirect: confirm with Stripe API, then read local payment status.
 */
export async function finalizeStripePaymentReturn({ sessionId, courseId }) {
  if (!sessionId) {
    throw new Error(
      "Missing session_id in the return URL. Ensure STRIPE_SUCCESS_URL includes session_id={CHECKOUT_SESSION_ID}.",
    );
  }

  let confirmResult = null;

  try {
    confirmResult = await confirmStripeCheckout(sessionId);
  } catch (error) {
    const status = error?.response?.status;

    if (status !== 401 && status !== 422) {
      throw error;
    }
  }

  const status = await fetchPaymentStatus({ sessionId, courseId });

  return {
    ...status,
    confirm: confirmResult,
  };
}
