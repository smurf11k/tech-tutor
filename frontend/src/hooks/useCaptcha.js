import { useEffect, useState } from "react";
import {
  getCaptchaToken,
  isCaptchaBypassAvailable,
  isCaptchaConfigured,
  isCaptchaEnabled,
  preloadCaptcha,
} from "@/lib/captcha";

export function useCaptcha() {
  const [ready, setReady] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;

    preloadCaptcha()
      .then((config) => {
        if (!cancelled) {
          setEnabled(config.enabled);
          setReady(true);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setLoadError(error.message || "CAPTCHA failed to load.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function resolveToken(action) {
    if (loadError) {
      throw new Error(loadError);
    }

    if (!isCaptchaEnabled()) {
      return "";
    }

    const token = await getCaptchaToken(action);

    if (!token) {
      throw new Error(
        "CAPTCHA is required but VITE_CAPTCHA_SITE_KEY is not configured.",
      );
    }

    return token;
  }

  async function reload() {
    setLoadError("");
    setReady(false);

    try {
      const config = await preloadCaptcha();
      setEnabled(config.enabled);
      setReady(true);
    } catch (error) {
      setLoadError(error.message || "CAPTCHA failed to load.");
    }
  }

  return {
    ready,
    loadError,
    enabled,
    isConfigured: isCaptchaConfigured(),
    isBypassAvailable: isCaptchaBypassAvailable(),
    resolveToken,
    reload,
  };
}
