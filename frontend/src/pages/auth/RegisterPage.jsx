import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthShell } from "@/components/common/AuthShell";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { useCaptcha } from "@/hooks/useCaptcha";
import { getDefaultRouteForUser } from "@/lib/navigation";
import { getApiErrorMessage } from "@/lib/utils";

export default function RegisterPage() {
  const { applySession } = useAuth();
  const captcha = useCaptcha();
  const toast = useToast();
  const navigate = useNavigate();
  const [step, setStep] = useState("request");
  const [form, setForm] = useState({
    name: "",
    nickname: "",
    email: "",
    password: "",
    password_confirmation: "",
    code: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const captchaNotice = captcha.enabled && captcha.isBypassAvailable;

  const passwordChecks = useMemo(() => {
    const password = form.password;
    const checks = [
      { label: "8+ characters", ok: password.length >= 8 },
      { label: "1 lowercase letter", ok: /[a-z]/.test(password) },
      { label: "1 uppercase letter", ok: /[A-Z]/.test(password) },
      { label: "1 number", ok: /\d/.test(password) },
      { label: "1 special symbol", ok: /[^A-Za-z0-9]/.test(password) },
    ];

    return {
      checks,
      score: checks.filter((check) => check.ok).length,
      complete: checks.every((check) => check.ok),
    };
  }, [form.password]);

  async function requestCode(event) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const captcha_token = await captcha.resolveToken("register");
      const response = await api.post(
        "/auth/register/request-verification-code",
        {
          name: form.name,
          nickname: form.nickname,
          email: form.email,
          password: form.password,
          password_confirmation: form.password_confirmation,
          captcha_token,
        },
      );
      toast.success(response.data.message || "Verification code sent.");
      setStep("verify");
    } catch (err) {
      const msg = getApiErrorMessage(err, "Could not send verification code.");
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  async function verifyCode(event) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await api.post("/auth/register/verify-code", {
        email: form.email,
        code: form.code,
        name: form.name,
        nickname: form.nickname,
        password: form.password,
        password_confirmation: form.password_confirmation,
        token_name: "web",
      });
      applySession({ token: response.data.token, user: response.data.user });
      navigate(getDefaultRouteForUser(response.data.user), { replace: true });
    } catch (err) {
      const msg = getApiErrorMessage(err, "Verification failed.");
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Sign up"
      description={
        step === "request"
          ? "Create a student account."
          : "Enter the 6-digit code sent to your email."
      }
      footer={
        <>
          Already have an account?{" "}
          <Link className="text-primary hover:underline" to="/login">
            Log in
          </Link>
        </>
      }
    >
      {captchaNotice ? (
        <p className="text-xs text-muted-foreground">
          Local dev: CAPTCHA bypass is active (no site key).
        </p>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {step === "request" ? (
        <form className="space-y-3" onSubmit={requestCode}>
          <label className="block space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              required
              value={form.name}
              onChange={(event) =>
                setForm((current) => ({ ...current, name: event.target.value }))
              }
            />
          </label>
          <label className="block space-y-2">
            <Label htmlFor="nickname">Nickname</Label>
            <Input
              id="nickname"
              required
              minLength={3}
              value={form.nickname}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  nickname: event.target.value,
                }))
              }
            />
          </label>
          <label className="block space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              required
              value={form.email}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  email: event.target.value,
                }))
              }
            />
          </label>
          <label className="block space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              required
              minLength={8}
              value={form.password}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  password: event.target.value,
                }))
              }
            />
            <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
              <div className="flex items-center justify-between text-[11px] text-muted-foreground mono-ui">
                <span>Password strength</span>
                <span>{passwordChecks.score}/5</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-border">
                <div
                  className={`h-full rounded-full transition-all ${passwordChecks.complete ? "bg-primary" : passwordChecks.score >= 3 ? "bg-amber-500" : "bg-destructive"}`}
                  style={{ width: `${(passwordChecks.score / 5) * 100}%` }}
                />
              </div>
              <div className="grid gap-1 text-[11px] text-muted-foreground sm:grid-cols-2">
                {passwordChecks.checks.map((check) => (
                  <div key={check.label} className="flex items-center gap-2">
                    <span
                      className={
                        check.ok ? "text-primary" : "text-muted-foreground"
                      }
                    >
                      {check.ok ? "✓" : "•"}
                    </span>
                    <span>{check.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </label>
          <label className="block space-y-2">
            <Label htmlFor="password_confirmation">Confirm password</Label>
            <Input
              id="password_confirmation"
              type="password"
              required
              minLength={8}
              value={form.password_confirmation}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  password_confirmation: event.target.value,
                }))
              }
            />
          </label>
          <Button
            type="submit"
            className="w-full"
            disabled={
              loading ||
              !captcha.ready ||
              !passwordChecks.complete ||
              form.password !== form.password_confirmation
            }
          >
            {loading ? "Sending code..." : "Send verification code"}
          </Button>
        </form>
      ) : (
        <form className="space-y-3" onSubmit={verifyCode}>
          <label className="block space-y-2">
            <Label htmlFor="code">Verification code</Label>
            <Input
              id="code"
              required
              value={form.code}
              onChange={(event) =>
                setForm((current) => ({ ...current, code: event.target.value }))
              }
            />
          </label>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating account..." : "Complete sign up"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={() => setStep("request")}
          >
            Back
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
