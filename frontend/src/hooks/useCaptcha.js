import { useEffect, useState } from "react";
import {
  getCaptchaToken,
  isCaptchaBypassAvailable,
  isCaptchaConfigured,
  preloadCaptcha,
} from "@/lib/captcha";

export function useCaptcha() {
  const [ready, setReady] = useState(!isCaptchaConfigured());
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    if (!isCaptchaConfigured()) {
      setReady(true);
      return;
    }

    let cancelled = false;

    preloadCaptcha()
      .then(() => {
        if (!cancelled) {
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
    setReady(!isCaptchaConfigured());

    if (!isCaptchaConfigured()) {
      return;
    }

    try {
      await preloadCaptcha();
      setReady(true);
    } catch (error) {
      setLoadError(error.message || "CAPTCHA failed to load.");
    }
  }

  return {
    ready,
    loadError,
    isConfigured: isCaptchaConfigured(),
    isBypassAvailable: isCaptchaBypassAvailable(),
    resolveToken,
    reload,
  };
}
