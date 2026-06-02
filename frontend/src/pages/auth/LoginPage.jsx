import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthShell } from "@/components/common/AuthShell";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { useCaptcha } from "@/hooks/useCaptcha";
import { buildGoogleLoginUrl } from "@/lib/api";
import { resolvePostAuthPath } from "@/lib/navigation";
import { getAuthFormError, getLoginErrorMessage } from "@/lib/utils";

export default function LoginPage() {
  const { login, isAuthenticated, user } = useAuth();
  const captcha = useCaptcha();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const displayError = getAuthFormError({
    submitError: error,
    captcha,
    loading,
  });

  useEffect(() => {
    if (isAuthenticated && user) {
      navigate(resolvePostAuthPath(user, location.state?.from?.pathname), {
        replace: true,
      });
    }
  }, [isAuthenticated, user, navigate, location.state?.from?.pathname]);

  function clearError() {
    if (error) {
      setError("");
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const captcha_token = await captcha.resolveToken("login");
      const data = await login({ ...form, captcha_token });
      navigate(resolvePostAuthPath(data.user, location.state?.from?.pathname), {
        replace: true,
      });
    } catch (err) {
      const msg = getLoginErrorMessage(err);
      setError(msg);
      toast.error(msg);
      await captcha.reload();
    } finally {
      setLoading(false);
    }
  }

  function handleGoogleLogin() {
    window.open(
      buildGoogleLoginUrl(window.location.origin),
      "techtutor-google-auth",
      "width=520,height=720",
    );
  }

  return (
    <AuthShell
      title="Log in"
      description="Access your courses and account."
      footer={
        <>
          <Link className="text-primary hover:underline" to="/forgot-password">
            Forgot password?
          </Link>
          {" · "}
          <Link className="text-primary hover:underline" to="/register">
            Create account
          </Link>
        </>
      }
    >
      {captcha.enabled && captcha.isBypassAvailable ? (
        <p className="text-xs text-muted-foreground">
          Local dev: CAPTCHA bypass is active (no site key).
        </p>
      ) : null}
      {displayError ? (
        <p className="text-sm text-destructive">{displayError}</p>
      ) : null}
      <form className="space-y-3" onSubmit={handleSubmit}>
        <label className="block space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            required
            value={form.email}
            onChange={(event) => {
              clearError();
              setForm((current) => ({ ...current, email: event.target.value }));
            }}
          />
        </label>
        <label className="block space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            required
            value={form.password}
            onChange={(event) => {
              clearError();
              setForm((current) => ({
                ...current,
                password: event.target.value,
              }));
            }}
          />
        </label>
        <Button
          type="submit"
          className="w-full"
          disabled={loading || !captcha.ready}
        >
          {loading ? "Signing in..." : "Sign in"}
        </Button>
      </form>
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={handleGoogleLogin}
      >
        Continue with Google
      </Button>
    </AuthShell>
  );
}
