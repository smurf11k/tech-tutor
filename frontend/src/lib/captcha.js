import api from "@/lib/api";

let scriptPromise = null;
let configPromise = null;
let cachedConfig = {
  loaded: false,
  enabled: false,
  siteKey: "",
};

export function getCaptchaConfig() {
  if (cachedConfig.loaded) {
    return Promise.resolve(cachedConfig);
  }

  if (!configPromise) {
    configPromise = api
      .get("/app-config")
      .then((response) => {
        cachedConfig = {
          loaded: true,
          enabled: Boolean(response.data?.captcha_enabled),
          siteKey: (response.data?.captcha_site_key || "").trim(),
        };

        return cachedConfig;
      })
      .catch(() => {
        cachedConfig = {
          loaded: true,
          enabled: false,
          siteKey: "",
        };

        return cachedConfig;
      })
      .finally(() => {
        configPromise = null;
      });
  }

  return configPromise;
}

export function isCaptchaEnabled() {
  return cachedConfig.loaded && cachedConfig.enabled;
}

export function isCaptchaConfigured() {
  return (
    cachedConfig.loaded &&
    cachedConfig.enabled &&
    cachedConfig.siteKey.length > 0
  );
}

/** Local dev without a site key: backend accepts demo-captcha-token. */
export function isCaptchaBypassAvailable() {
  return (
    cachedConfig.loaded &&
    cachedConfig.enabled &&
    import.meta.env.DEV &&
    !isCaptchaConfigured()
  );
}

/**
 * Preload reCAPTCHA v3 (runs in the background; no visible widget).
 */
export function preloadCaptcha() {
  return getCaptchaConfig().then((config) => {
    if (!config.enabled) {
      return config;
    }

    if (!config.siteKey) {
      throw new Error(
        "CAPTCHA is enabled on the API but VITE_CAPTCHA_SITE_KEY is missing in backend/.env.",
      );
    }

    return loadCaptchaScript(config.siteKey).then(() => config);
  });
}

function loadCaptchaScript(siteKey) {
  if (typeof window !== "undefined" && window.grecaptcha) {
    return Promise.resolve();
  }

  if (scriptPromise) {
    return scriptPromise;
  }

  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(
      'script[data-techtutor-recaptcha="v3"]',
    );

    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener(
        "error",
        () => reject(new Error("CAPTCHA failed to load.")),
        {
          once: true,
        },
      );
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
  const config = await getCaptchaConfig();

  if (!config.enabled) {
    if (import.meta.env.DEV) {
      return "demo-captcha-token";
    }

    return "";
  }

  if (!config.siteKey) {
    throw new Error(
      "CAPTCHA is enabled on the API but VITE_CAPTCHA_SITE_KEY is missing in backend/.env.",
    );
  }

  await loadCaptchaScript(config.siteKey);
  await waitForGrecaptchaReady();

  const token = await window.grecaptcha.execute(config.siteKey, { action });

  if (!token) {
    throw new Error(
      "CAPTCHA did not return a token. Check your site key and domain allowlist.",
    );
  }

  return token;
}
