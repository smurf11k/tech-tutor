import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import api from "@/lib/api";

export default function AcceptInvite({ token }) {
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
            description:
              error?.response?.data?.message ||
              "This invitation is invalid or has expired.",
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
        token_name: "invite-onboarding",
      });

      localStorage.setItem("techtutor_token", response.data.token);
      localStorage.setItem(
        "techtutor_user",
        JSON.stringify(response.data.user),
      );

      setNotice({
        variant: "default",
        title: "Welcome to TechTutor",
        description: `Your ${response.data.user.role} account is ready. Redirecting...`,
      });

      setTimeout(() => {
        window.location.href = "/";
      }, 1500);
    } catch (error) {
      setNotice({
        variant: "destructive",
        title: "Could not complete invitation",
        description:
          error?.response?.data?.message ||
          error?.response?.data?.errors?.token?.[0] ||
          "The invitation may have expired.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="border-white/10 bg-slate-950/70">
          <CardHeader>
            <CardTitle className="text-white">Accept your invitation</CardTitle>
            <CardDescription className="text-slate-400">
              Finish onboarding with the role assigned by your administrator.
              Invitation links expire in 5 minutes.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {notice && (
              <Alert
                variant={
                  notice.variant === "destructive" ? "destructive" : "default"
                }
              >
                <AlertTitle>{notice.title}</AlertTitle>
                <AlertDescription>{notice.description}</AlertDescription>
              </Alert>
            )}

            {loadingInvite && (
              <p className="text-sm text-slate-400">Checking invitation...</p>
            )}

            {!loadingInvite && invite && (
              <>
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-300">
                  <p>
                    Email:{" "}
                    <span className="font-medium text-white">{invite.email}</span>
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <span>Role:</span>
                    <Badge variant="secondary">{invite.role}</Badge>
                  </div>
                </div>

                <form onSubmit={handleAcceptInvite} className="space-y-3">
                  <Input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Full name"
                    className="border-white/10 bg-white/5 text-white placeholder:text-slate-500"
                    required
                  />
                  <Input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Password"
                    className="border-white/10 bg-white/5 text-white placeholder:text-slate-500"
                    required
                    minLength={8}
                  />
                  <Input
                    type="password"
                    value={passwordConfirmation}
                    onChange={(event) =>
                      setPasswordConfirmation(event.target.value)
                    }
                    placeholder="Confirm password"
                    className="border-white/10 bg-white/5 text-white placeholder:text-slate-500"
                    required
                    minLength={8}
                  />
                  <Button
                    type="submit"
                    size="lg"
                    disabled={loading}
                    className="w-full text-white"
                  >
                    {loading ? "Creating account..." : "Create account"}
                  </Button>
                </form>
              </>
            )}

            {!loadingInvite && !invite && (
              <Button
                type="button"
                variant="outline"
                className="w-full text-white border-white/10"
                onClick={() => {
                  window.location.href = "/";
                }}
              >
                Back to demo
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
