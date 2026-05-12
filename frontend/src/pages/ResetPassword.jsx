import { useState } from "react";
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
import api from "@/lib/api";

export default function ResetPassword({ token, email, onSuccess }) {
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(null);

  async function handleResetPassword(event) {
    event.preventDefault();
    setLoading(true);
    setNotice(null);

    try {
      await api.post("/auth/reset-password", {
        token,
        email,
        password,
        password_confirmation: passwordConfirmation,
      });

      setNotice({
        variant: "default",
        title: "Password reset successful!",
        description: "Your password has been reset. Redirecting to login...",
      });

      setTimeout(() => {
        window.location.href = "/";
      }, 2000);
    } catch (error) {
      setNotice({
        variant: "destructive",
        title: "Password reset failed",
        description:
          error?.response?.data?.message ||
          error?.response?.data?.errors?.password?.[0] ||
          "Could not reset your password. The link may have expired.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
      <Card className="w-full max-w-sm border-white/10 bg-slate-950/70">
        <CardHeader>
          <CardTitle className="text-white">Reset Your Password</CardTitle>
          <CardDescription>
            Enter your new password below. Passwords must be at least 8
            characters.
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

          <form onSubmit={handleResetPassword} className="space-y-3">
            <div className="text-sm text-slate-400">
              Resetting password for:{" "}
              <span className="text-white font-medium">{email}</span>
            </div>

            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="New password"
              className="border-white/10 bg-white/5 text-white placeholder:text-slate-500"
              required
              minLength="8"
            />

            <Input
              type="password"
              value={passwordConfirmation}
              onChange={(e) => setPasswordConfirmation(e.target.value)}
              placeholder="Confirm password"
              className="border-white/10 bg-white/5 text-white placeholder:text-slate-500"
              required
              minLength="8"
            />

            <Button
              type="submit"
              size="lg"
              disabled={loading}
              className="w-full"
            >
              {loading ? "Resetting..." : "Reset Password"}
            </Button>

            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={() => (window.location.href = "/")}
              disabled={loading}
              className="w-full"
            >
              Cancel
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
