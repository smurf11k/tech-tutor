import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

const stripeCurrency = (import.meta.env.VITE_STRIPE_CURRENCY || "USD").trim();
const backendOrigin =
  typeof window !== "undefined"
    ? window.location.origin
    : "http://localhost:5173";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function getCourseRouteKey(course) {
  return (
    course?.slug || course?.course_slug || course?.id || course?.course_id || ""
  );
}

export function resolveBackendAssetUrl(url) {
  if (!url) {
    return "";
  }

  if (url.startsWith("http://") || url.startsWith("https://")) {
    try {
      const parsed = new URL(url);
      const frontendOrigin = new URL(backendOrigin);

      if (parsed.origin === frontendOrigin.origin) {
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

  return new URL(
    url.startsWith("/") ? url : `/${url}`,
    backendOrigin,
  ).toString();
}

export function extractList(payload) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  return [];
}

export function formatMoney(amount, currency = "USD") {
  const numeric = Number(amount ?? 0);
  return `${currency} ${Number.isFinite(numeric) ? numeric.toFixed(2) : "0.00"}`;
}

export function getStripeCurrency() {
  return stripeCurrency.toUpperCase() || "USD";
}

export function formatMinutes(minutes) {
  const numeric = Number(minutes ?? 0);

  if (!Number.isFinite(numeric) || numeric <= 0) {
    return "";
  }

  const rounded = Math.round(numeric);

  if (rounded < 60) {
    return `${rounded}m`;
  }

  const hours = Math.floor(rounded / 60);
  const remainingMinutes = rounded % 60;

  return remainingMinutes ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

export function getApiErrorMessage(error, fallback = "Something went wrong.") {
  const data = error?.response?.data;

  if (data?.message) {
    return data.message;
  }

  const firstFieldError = data?.errors
    ? Object.values(data.errors).flat()[0]
    : null;

  return firstFieldError || fallback;
}

function isCaptchaRelatedError(error) {
  const message = String(error?.message || "").toLowerCase();
  const captchaField = error?.response?.data?.errors?.captcha_token?.[0];

  return (
    Boolean(captchaField) ||
    message.includes("captcha") ||
    message.includes("security check")
  );
}

export function getLoginErrorMessage(error) {
  if (isCaptchaRelatedError(error)) {
    const detail =
      error?.response?.data?.errors?.captcha_token?.[0] ||
      error?.message ||
      "Security check failed.";

    return `${detail} Refresh the page and try signing in again.`;
  }

  if (!error?.response) {
    const networkDetail = error?.message ? `${error.message} ` : "";

    return `${networkDetail}Could not reach the server. Refresh the page and try again.`;
  }

  const status = error.response.status;
  const apiMessage = getApiErrorMessage(error, "");

  if (status === 401) {
    return apiMessage
      ? `${apiMessage} If the problem continues, refresh the page and try again.`
      : "Invalid email or password. Refresh the page and try again.";
  }

  if (status === 422 && apiMessage) {
    return `${apiMessage} Refresh the page and try again.`;
  }

  if (apiMessage) {
    return apiMessage;
  }

  return "Login failed. Refresh the page and try again.";
}

export function getAuthFormError({ submitError, captcha, loading }) {
  if (submitError) {
    return submitError;
  }

  if (!loading && !captcha.ready && captcha.loadError) {
    return `${captcha.loadError} Refresh the page to reload the security check.`;
  }

  return "";
}
