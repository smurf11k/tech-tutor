const siteKey = (import.meta.env.VITE_CAPTCHA_SITE_KEY || "").trim();

const apiBaseUrl = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api"
).toLowerCase();

let scriptPromise = null;

export function isCaptchaConfigured() {
  return siteKey.length > 0;
}

export function isLocalApiTarget() {
  return (
    apiBaseUrl.includes("localhost") || apiBaseUrl.includes("127.0.0.1")
  );
}

/** Local dev without a site key: backend accepts demo-captcha-token. */
export function isCaptchaBypassAvailable() {
  return (import.meta.env.DEV || isLocalApiTarget()) && !isCaptchaConfigured();
}

/**
 * Preload reCAPTCHA v3 (runs in the background; no visible widget).
 */
export function preloadCaptcha() {
  if (!isCaptchaConfigured()) {
    return Promise.resolve();
  }

  return loadCaptchaScript();
}

function loadCaptchaScript() {
  if (typeof window !== "undefined" && window.grecaptcha) {
    return Promise.resolve();
  }

  if (scriptPromise) {
    return scriptPromise;
  }

  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-techtutor-recaptcha="v3"]');

    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("CAPTCHA failed to load.")), {
        once: true,
      });
      return;
    }

    const script = document.createElement("script");
    script.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(siteKey)}`;
    script.async = true;
    script.defer = true;
    script.dataset.techtutorRecaptcha = "v3";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("CAPTCHA failed to load."));
    document.head.appendChild(script);
  });

  return scriptPromise;
}

function waitForGrecaptchaReady() {
  return new Promise((resolve) => {
    window.grecaptcha.ready(() => resolve());
  });
}

/**
 * @param {string} action reCAPTCHA v3 action name (e.g. login, register)
 */
export async function getCaptchaToken(action = "submit") {
  if (!isCaptchaConfigured()) {
    if (isCaptchaBypassAvailable()) {
      return "demo-captcha-token";
    }

    throw new Error(
      "CAPTCHA is enabled on the API but VITE_CAPTCHA_SITE_KEY is missing in frontend/.env.",
    );
  }

  await loadCaptchaScript();
  await waitForGrecaptchaReady();

  const token = await window.grecaptcha.execute(siteKey, { action });

  if (!token) {
    throw new Error("CAPTCHA did not return a token. Check your site key and domain allowlist.");
  }

  return token;
}
