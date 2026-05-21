import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingState } from "@/components/common/LoadingState";
import { PageHeader } from "@/components/common/PageHeader";
import { useAuth } from "@/contexts/AuthContext";
import { getApiErrorMessage } from "@/lib/utils";

export default function ProfilePage() {
  const { user, client, refreshUser } = useAuth();
  const [profile, setProfile] = useState(user);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(!user);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const data = await refreshUser();
        setProfile(data);
      } catch (err) {
        setError(getApiErrorMessage(err));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [refreshUser]);

  async function resendVerification() {
    setError("");
    setMessage("");
    try {
      const response = await client.post("/auth/email/resend");
      setMessage(response.data.message);
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }

  async function toggleEmailNotifications() {
    setError("");
    setMessage("");
    setSaving(true);
    try {
      const response = await client.patch("/auth/me", {
        email_notifications_enabled: !profile?.email_notifications_enabled,
      });
      setProfile(response.data);
      setMessage(
        `Email notifications ${!profile?.email_notifications_enabled ? "enabled" : "disabled"}`,
      );
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <LoadingState />;
  }

  return (
    <section>
      <PageHeader title="Profile" description="Your account details." />
      {message ? (
        <p className="mb-4 text-sm text-muted-foreground">{message}</p>
      ) : null}
      <Card className="glass-panel">
        <CardHeader>
          <CardTitle>{profile?.name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>Email: {profile?.email}</p>
          <p>Role: {profile?.role}</p>
          <p>Verified: {profile?.email_verified_at ? "Yes" : "No"}</p>
          {profile?.is_banned ? (
            <p className="text-destructive">Account banned</p>
          ) : null}
          {!profile?.email_verified_at ? (
            <Button size="sm" onClick={resendVerification}>
              Resend verification email
            </Button>
          ) : null}
        </CardContent>
      </Card>

      <Card className="glass-panel mt-4">
        <CardHeader>
          <CardTitle>Email Notifications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">
                {profile?.email_notifications_enabled
                  ? "Email notifications are enabled"
                  : "Email notifications are disabled"}
              </p>
              <p className="text-sm text-muted-foreground">
                Receive emails about new comments and replies to your comments
              </p>
            </div>
            <Button
              onClick={toggleEmailNotifications}
              disabled={saving}
              variant={
                profile?.email_notifications_enabled ? "destructive" : "default"
              }
            >
              {saving
                ? "Saving..."
                : profile?.email_notifications_enabled
                  ? "Disable"
                  : "Enable"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
