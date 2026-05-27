import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AuthShell } from "@/components/common/AuthShell";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { getDefaultRouteForUser } from "@/lib/navigation";
import { getApiErrorMessage } from "@/lib/utils";

export default function AcceptInvite({ token }) {
  const { applySession } = useAuth();
  const navigate = useNavigate();
  const [invite, setInvite] = useState(null);
  const [loadingInvite, setLoadingInvite] = useState(true);
  const [name, setName] = useState("");
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(null);

  const passwordChecks = useMemo(() => {
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
  }, [password]);

  useEffect(() => {
    let cancelled = false;

    async function loadInvite() {
      setLoadingInvite(true);
      setNotice(null);

      try {
        const response = await api.get(`/auth/invite/${token}`);
        if (!cancelled) {
          setInvite(response.data);
        }
      } catch (error) {
        if (!cancelled) {
          setNotice({
            variant: "destructive",
            title: "Invitation unavailable",
            description: getApiErrorMessage(
              error,
              "This invitation is invalid or has expired.",
            ),
          });
        }
      } finally {
        if (!cancelled) {
          setLoadingInvite(false);
        }
      }
    }

    loadInvite();
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function handleAcceptInvite(event) {
    event.preventDefault();
    setLoading(true);
    setNotice(null);

    try {
      const response = await api.post(`/auth/invite/${token}/accept`, {
        name: name.trim(),
        nickname: nickname.trim(),
        password,
        password_confirmation: passwordConfirmation,
        token_name: "web",
      });

      applySession({
        token: response.data.token,
        user: response.data.user,
      });

      navigate(getDefaultRouteForUser(response.data.user), { replace: true });
    } catch (error) {
      setNotice({
        variant: "destructive",
        title: "Could not complete invitation",
        description: getApiErrorMessage(
          error,
          "The invitation may have expired.",
        ),
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Accept your invitation"
      description="Finish onboarding with the role assigned by your administrator. Links expire in 5 minutes."
    >
      {notice ? (
        <Alert
          variant={notice.variant === "destructive" ? "destructive" : "default"}
        >
          <AlertTitle>{notice.title}</AlertTitle>
          <AlertDescription>{notice.description}</AlertDescription>
        </Alert>
      ) : null}

      {loadingInvite ? (
        <p className="text-sm text-muted-foreground">Checking invitation...</p>
      ) : null}

      {!loadingInvite && invite ? (
        <>
          <section className="rounded-xl border border-border/80 bg-muted/30 p-3 text-sm">
            <p>
              Email: <span className="font-medium">{invite.email}</span>
            </p>
            <div className="mt-2 flex items-center gap-2">
              Role: <Badge variant="secondary">{invite.role}</Badge>
            </div>
          </section>
          <form onSubmit={handleAcceptInvite} className="space-y-3">
            <label className="block space-y-2">
              <Label>Full name</Label>
              <Input
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </label>
            <label className="block space-y-2">
              <Label>Nickname</Label>
              <Input
                required
                minLength={3}
                value={nickname}
                onChange={(event) => setNickname(event.target.value)}
              />
            </label>
            <label className="block space-y-2">
              <Label>Password</Label>
              <Input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
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
              <Label>Confirm password</Label>
              <Input
                type="password"
                required
                minLength={8}
                value={passwordConfirmation}
                onChange={(event) =>
                  setPasswordConfirmation(event.target.value)
                }
              />
            </label>
            <Button
              type="submit"
              className="w-full"
              disabled={
                loading ||
                !passwordChecks.complete ||
                password !== passwordConfirmation
              }
            >
              {loading ? "Creating account..." : "Create account"}
            </Button>
          </form>
        </>
      ) : null}

      {!loadingInvite && !invite ? (
        <Button variant="outline" className="w-full" asChild>
          <Link to="/">Back to home</Link>
        </Button>
      ) : null}
    </AuthShell>
  );
}
