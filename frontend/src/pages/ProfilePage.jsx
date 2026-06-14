import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingState } from "@/components/common/LoadingState";
import { PageHeader } from "@/components/common/PageHeader";
import { useAuth } from "@/contexts/AuthContext";
import { getApiErrorMessage, resolveBackendAssetUrl } from "@/lib/utils";
import { extractList, formatMoney } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ToggleSwitch } from "@/components/ui/toggle-switch";

const profileTabs = [
  { id: "account", label: "Account" },
  { id: "notifications", label: "Notifications" },
  { id: "billing", label: "Billing" },
  { id: "danger", label: "Danger zone" },
];

function resolveTab(hash) {
  const tabId = hash.replace("#", "");
  return profileTabs.some((tab) => tab.id === tabId) ? tabId : "account";
}

export default function ProfilePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, client, refreshUser, logout } = useAuth();

  const [profile, setProfile] = useState(user);
  const [draftName, setDraftName] = useState(user?.name || "");
  const [draftNickname, setDraftNickname] = useState(user?.nickname || "");
  const [draftBio, setDraftBio] = useState(user?.bio || "");
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [removeAvatar, setRemoveAvatar] = useState(false);

  const [activeTab, setActiveTab] = useState(resolveTab(location.hash));
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(!user);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingNotifications, setSavingNotifications] = useState(false);
  const [billingLoading, setBillingLoading] = useState(false);
  const [billingError, setBillingError] = useState("");
  const [payments, setPayments] = useState([]);
  const [billingLoaded, setBillingLoaded] = useState(false);
  const currentProfile = profile || user;
  const [preferences, setPreferences] = useState({
    email_notifications_enabled: currentProfile?.email_notifications_enabled ?? true,
    email_notifications_comment_reply: currentProfile?.email_notifications_comment_reply ?? true,
    email_notifications_thread: currentProfile?.email_notifications_thread ?? true,
    email_notifications_quiz_result: currentProfile?.email_notifications_quiz_result ?? true,
    email_notifications_new_course: currentProfile?.email_notifications_new_course ?? false,
    email_notifications_new_content: currentProfile?.email_notifications_new_content ?? true,
    email_notifications_new_enrollment: currentProfile?.email_notifications_new_enrollment ?? true,
    email_notifications_instructor_quiz_result: currentProfile?.email_notifications_instructor_quiz_result ?? true,
    email_notifications_approval_result: currentProfile?.email_notifications_approval_result ?? true,
    email_notifications_course_submitted: currentProfile?.email_notifications_course_submitted ?? true,
    email_notifications_lesson_submitted: currentProfile?.email_notifications_lesson_submitted ?? true,
  });

  useEffect(() => {
    async function load() {
      setLoading(true);
      const data = await refreshUser();
      setProfile(data || user);
      setDraftName((data || user)?.name || "");
      setDraftNickname((data || user)?.nickname || "");
      setDraftBio((data || user)?.bio || "");
      setAvatarFile(null);
      setLoading(false);
    }
    load();
  }, [refreshUser]);

  useEffect(() => setActiveTab(resolveTab(location.hash)), [location.hash]);

  useEffect(() => {
    if (activeTab !== "billing" || billingLoaded || !currentProfile) return;

    let cancelled = false;
    async function loadBilling() {
      setBillingLoading(true);
      setBillingError("");
      try {
        const response = await client.get("/auth/me/payments");
        if (!cancelled) {
          setPayments(extractList(response.data));
          setBillingLoaded(true);
        }
      } catch (err) {
        if (!cancelled)
          setBillingError(
            getApiErrorMessage(err, "Failed to load billing history."),
          );
      } finally {
        if (!cancelled) setBillingLoading(false);
      }
    }
    loadBilling();
    return () => {
      cancelled = true;
    };
  }, [activeTab, billingLoaded, client, currentProfile]);

  useEffect(() => {
    if (removeAvatar) {
      setAvatarPreview("");
      return;
    }
    if (avatarFile) {
      const url = URL.createObjectURL(avatarFile);
      setAvatarPreview(url);
      return () => URL.revokeObjectURL(url);
    }
    setAvatarPreview(currentProfile?.avatar_url || "");
  }, [avatarFile, currentProfile?.avatar_url, removeAvatar]);

  useEffect(() => setAvatarFailed(false), [avatarPreview]);

  function handleTabChange(tabId) {
    setActiveTab(tabId);
    if (tabId === "account") {
      navigate("/profile", { replace: true });
      return;
    }
    navigate(`/profile#${tabId}`, { replace: true });
  }

  async function handleProfileSave(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    setSavingProfile(true);
    try {
      const formData = new FormData();
      formData.append("_method", "PATCH");
      formData.append("name", draftName.trim());
      formData.append("nickname", draftNickname.trim().toLowerCase());
      formData.append("bio", draftBio.trim());
      if (removeAvatar) formData.append("remove_avatar", "1");
      if (avatarFile) formData.append("avatar", avatarFile);

      const response = await client.post("/auth/me", formData);
      setProfile(response.data);
      setAvatarFailed(false);
      setDraftName(response.data?.name || "");
      setAvatarFile(null);
      setRemoveAvatar(false);
      setMessage("Profile updated.");
      await refreshUser();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSavingProfile(false);
    }
  }

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
    setSavingNotifications(true);
    try {
      const response = await client.patch("/api/auth/me", {
        email_notifications_enabled: !profile?.email_notifications_enabled,
      });
      setProfile(response.data);
      await refreshUser();
      setMessage(
        `Email notifications ${!profile?.email_notifications_enabled ? "enabled" : "disabled"}`,
      );
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSavingNotifications(false);
    }
  }

  async function savePreference(key, value) {
    setError("");
    setMessage("");
    setSavingNotifications(true);
    try {
      const payload = { [key]: value };
      const response = await client.patch("/api/auth/me", payload);
      setProfile(response.data);
      setPreferences((prev) => ({ ...prev, [key]: value }));
      setMessage("Notification preference saved.");
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSavingNotifications(false);
    }
  }

  async function handleLogout() {
    await logout();
    navigate("/", { replace: true });
  }

  async function handleDeleteAccount() {
    if (!window.confirm("Delete this account permanently?")) {
      return;
    }

    setError("");
    setMessage("");

    try {
      await client.delete("/auth/me");
      await logout();
      navigate("/", { replace: true });
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }

  if (loading || !currentProfile) return <LoadingState />;

  function getAvatarSrc() {
    if (removeAvatar) return null;
    if (avatarFile) return avatarPreview;
    return resolveBackendAssetUrl(currentProfile?.avatar_url) || null;
  }

  function renderAvatar(size = "small") {
    const classes = size === "large" ? "h-[104px] w-[104px]" : "h-10 w-10";
    const avatarSrc = getAvatarSrc();

    if (avatarSrc && !avatarFailed) {
      return (
        <img
          src={avatarSrc}
          alt={currentProfile?.name || "Profile avatar"}
          className={`${classes} rounded-full border border-border object-cover`}
          onError={() => setAvatarFailed(true)}
        />
      );
    }

    const initials = currentProfile?.name
      ? currentProfile.name
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2)
      : "??";

    return (
      <div
        className={`${classes} flex items-center justify-center rounded-full border border-border bg-muted text-muted-foreground font-semibold mono-ui`}
      >
        {initials}
      </div>
    );
  }

  return (
    <section className="home-shell py-9">
      <div className="grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="space-y-3">
          <div className="relative flex items-center gap-3 rounded-lg border border-border bg-card p-4">
            <div className="shrink-0">{renderAvatar("small")}</div>
            <div className="min-w-0">
              <p className="text-[13px] font-medium">{currentProfile?.name}</p>
              <p className="text-[10px] text-muted-foreground mono-ui">
                @
                {currentProfile?.nickname ||
                  currentProfile?.email?.split("@")[0] ||
                  "user"}
              </p>
              <span className="mt-1 inline-flex rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground mono-ui">
                {currentProfile?.role_badge ||
                  currentProfile?.role?.toUpperCase() ||
                  "USER"}
              </span>
            </div>
            {currentProfile?.email_verified_at ? (
              <span className="absolute right-2 top-2 inline-flex h-4 w-4 items-center justify-center rounded-full border border-border bg-background text-primary">
                <i className="ti ti-circle-check text-[10px]" />
              </span>
            ) : null}
          </div>

          <div className="space-y-1">
            {profileTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabChange(tab.id)}
                className={[
                  "block w-full rounded-[5px] px-2.5 py-2 text-left text-[12px] mono-ui transition-colors",
                  activeTab === tab.id
                    ? "border border-[#003a1a] bg-[#001a0d] text-primary"
                    : "text-muted-foreground hover:bg-[#111] hover:text-foreground",
                ].join(" ")}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </aside>

        <div className="min-w-0 space-y-4">
          <PageHeader title="Profile Settings" description="$ whoami --edit" />

          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {message ? (
            <p className="text-sm text-muted-foreground">{message}</p>
          ) : null}

          {activeTab === "account" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-[14px]">Account</CardTitle>
              </CardHeader>
              <CardContent>
                <form className="space-y-4" onSubmit={handleProfileSave}>
                  <div className="grid gap-4 sm:grid-cols-[120px_minmax(0,1fr)]">
                    <div className="space-y-2">
                      <div className="flex h-[104px] w-[104px] items-center justify-center overflow-hidden rounded-full border border-border bg-card">
                        {renderAvatar("large")}
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="profile-name">Username</Label>
                        <Input
                          id="profile-name"
                          value={draftName}
                          onChange={(e) => setDraftName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="profile-nickname">Nickname</Label>
                        <Input
                          id="profile-nickname"
                          value={draftNickname}
                          onChange={(e) => setDraftNickname(e.target.value)}
                        />
                        <p className="text-[11px] text-muted-foreground mono-ui">
                          Shown as @{draftNickname || "nickname"}.
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="profile-bio">Bio</Label>
                        <Textarea
                          id="profile-bio"
                          rows={4}
                          value={draftBio}
                          onChange={(e) => setDraftBio(e.target.value)}
                          placeholder="A short bio for your profile and course page."
                        />
                        <p className="text-[11px] text-muted-foreground mono-ui">
                          Optional. Used only on instructor course pages.
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="profile-avatar">Profile image</Label>
                        <Input
                          id="profile-avatar"
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            setRemoveAvatar(false);
                            setAvatarFile(e.target.files?.[0] || null);
                          }}
                        />
                        <p className="text-[11px] text-muted-foreground mono-ui">
                          PNG, JPG, GIF, WebP or SVG.
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {(avatarFile || currentProfile?.avatar_url) && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setAvatarFile(null);
                                setRemoveAvatar(true);
                                setAvatarPreview("");
                              }}
                            >
                              clear_image
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 text-sm">
                    <div className="space-y-2">
                      <Label htmlFor="profile-email">Email</Label>
                      <Input
                        id="profile-email"
                        type="email"
                        value={currentProfile?.email || ""}
                        disabled
                      />
                    </div>
                    {currentProfile?.is_banned && (
                      <p className="text-destructive">Account banned</p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button type="submit" disabled={savingProfile}>
                      {savingProfile ? "saving..." : "save_profile"}
                    </Button>
                    {!currentProfile?.email_verified_at && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={resendVerification}
                      >
                        resend_verification_email
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={handleLogout}
                    >
                      log_out
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {activeTab === "notifications" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-[14px]">Notifications</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[13px] font-medium">
                      {currentProfile?.email_notifications_enabled
                        ? "Email notifications enabled"
                        : "Email notifications disabled"}
                    </p>
                    <p className="text-[11px] text-muted-foreground mono-ui">
                      Master switch for all email notifications.
                    </p>
                  </div>
                  <Button
                    onClick={toggleEmailNotifications}
                    disabled={savingNotifications}
                    variant={
                      currentProfile?.email_notifications_enabled
                        ? "destructive"
                        : "default"
                    }
                  >
                    {savingNotifications
                      ? "saving..."
                      : currentProfile?.email_notifications_enabled
                        ? "disable"
                        : "enable"}
                  </Button>
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="text-[13px] font-medium mb-3">Learning Activity</p>
                    <div className="space-y-3">
                      {[
                        { key: 'email_notifications_comment_reply', label: 'Comment replies', desc: 'Receive email when someone replies to my comment.' },
                        { key: 'email_notifications_thread', label: 'Thread notifications', desc: 'Receive email when someone posts in a course discussion where I previously commented.' },
                        { key: 'email_notifications_quiz_result', label: 'Quiz results', desc: 'Receive email when a quiz is graded or results become available.' },
                        { key: 'email_notifications_new_course', label: 'New courses', desc: 'Receive email when a newly published course becomes available.' },
                        { key: 'email_notifications_new_content', label: 'New course content', desc: 'Receive email when an enrolled course receives new lessons or modules.' },
                      ].map((item) => (
                        <div key={item.key} className="flex items-center justify-between">
                          <div className="pr-4">
                            <p className="text-[13px] font-medium">{item.label}</p>
                            <p className="text-[11px] text-muted-foreground mono-ui">{item.desc}</p>
                          </div>
                          <ToggleSwitch
                            checked={preferences[item.key] ?? false}
                            onChange={(value) => savePreference(item.key, value)}
                            disabled={savingNotifications || !currentProfile?.email_notifications_enabled}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {(currentProfile?.role === 'instructor' || currentProfile?.role === 'admin') && (
                    <div>
                      <p className="text-[13px] font-medium mb-3">Instructor Notifications</p>
                      <div className="space-y-3">
                        {[
                          { key: 'email_notifications_new_enrollment', label: 'New enrollments', desc: 'Receive email when a student enrolls in my course.' },
                          { key: 'email_notifications_instructor_quiz_result', label: 'Student quiz results', desc: 'Receive email when students complete quizzes in my courses.' },
                          { key: 'email_notifications_approval_result', label: 'Approval results', desc: 'Receive email when my publish requests are approved.' },
                        ].map((item) => (
                          <div key={item.key} className="flex items-center justify-between">
                            <div className="pr-4">
                              <p className="text-[13px] font-medium">{item.label}</p>
                              <p className="text-[11px] text-muted-foreground mono-ui">{item.desc}</p>
                            </div>
                            <ToggleSwitch
                              checked={preferences[item.key] ?? false}
                              onChange={(value) => savePreference(item.key, value)}
                              disabled={savingNotifications || !currentProfile?.email_notifications_enabled}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {currentProfile?.role === 'admin' && (
                    <div>
                      <p className="text-[13px] font-medium mb-3">Admin Notifications</p>
                      <div className="space-y-3">
                        {[
                          { key: 'email_notifications_course_submitted', label: 'Course submissions', desc: 'Receive email when a course is submitted for approval.' },
                          { key: 'email_notifications_lesson_submitted', label: 'Lesson submissions', desc: 'Receive email when a lesson is submitted for approval.' },
                        ].map((item) => (
                          <div key={item.key} className="flex items-center justify-between">
                            <div className="pr-4">
                              <p className="text-[13px] font-medium">{item.label}</p>
                              <p className="text-[11px] text-muted-foreground mono-ui">{item.desc}</p>
                            </div>
                            <ToggleSwitch
                              checked={preferences[item.key] ?? false}
                              onChange={(value) => savePreference(item.key, value)}
                              disabled={savingNotifications || !currentProfile?.email_notifications_enabled}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === "billing" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-[14px]">Billing</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {billingLoading && <LoadingState compact />}
                {billingError && (
                  <p className="text-sm text-destructive">{billingError}</p>
                )}
                {!billingLoading && payments.length === 0 && !billingError && (
                  <p className="text-sm text-muted-foreground">
                    No purchases yet.
                  </p>
                )}
                <div className="space-y-3">
                  {payments.map((payment) => (
                    <div
                      key={payment.id}
                      className="rounded-lg border border-border bg-card p-4 text-sm"
                    >
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                        <p className="font-medium">
                          {payment.course?.title ||
                            `Course #${payment.course_id}`}
                        </p>
                        <span className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground mono-ui">
                          {payment.status}
                        </span>
                      </div>
                      <p className="text-muted-foreground">
                        {formatMoney(payment.amount, payment.currency || "USD")}{" "}
                        · {payment.provider}
                      </p>
                      <p className="text-[11px] text-muted-foreground mono-ui">
                        Purchased on{" "}
                        {new Date(
                          payment.created_at || payment.paid_at || Date.now(),
                        ).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === "danger" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-[14px] text-destructive">
                  Danger zone
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-3 text-[12px] text-muted-foreground mono-ui">
                  Deleting your account removes your profile, tokens, and
                  avatar.
                </p>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDeleteAccount}
                >
                  delete_account
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </section>
  );
}
