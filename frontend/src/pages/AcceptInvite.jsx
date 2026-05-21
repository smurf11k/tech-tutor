import { useEffect, useState } from "react";
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
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(null);

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
        description: getApiErrorMessage(error, "The invitation may have expired."),
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
          variant={
            notice.variant === "destructive" ? "destructive" : "default"
          }
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
              <Label>Password</Label>
              <Input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
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
            <Button type="submit" className="w-full" disabled={loading}>
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
