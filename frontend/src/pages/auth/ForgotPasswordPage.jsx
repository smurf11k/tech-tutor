import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthShell } from "@/components/common/AuthShell";
import { useToast } from "@/contexts/ToastContext";
import api from "@/lib/api";
import { getApiErrorMessage } from "@/lib/utils";

export default function ForgotPasswordPage() {
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);

    try {
      const response = await api.post("/auth/forgot-password", { email });
      toast.success(response.data.message || "Reset email sent.");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Could not send reset email."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Forgot password"
      description="We will email you a reset link."
      footer={
        <Link className="text-primary hover:underline" to="/login">
          Back to login
        </Link>
      }
    >
      <form className="space-y-3" onSubmit={handleSubmit}>
        <label className="block space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Sending..." : "Send reset link"}
        </Button>
      </form>
    </AuthShell>
  );
}
