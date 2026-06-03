import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/common/StatCard";
import { LoadingState } from "@/components/common/LoadingState";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { extractList, getApiErrorMessage } from "@/lib/utils";
import { resolveBackendAssetUrl } from "@/lib/api";

// TODO: move icons to separate files if they get reused elsewhere
function IconUsers({ size = 16 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
function IconStar({ size = 16 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}
function IconChalkboard({ size = 16 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8" />
      <path d="M12 17v4" />
    </svg>
  );
}
function IconShield({ size = 16 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}
function IconStatBan({ size = 16 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
    </svg>
  );
}

// Invite modal role icons
function IconGraduationCap({ size = 20 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
      <path d="M6 12v5c3 3 9 3 12 0v-5" />
    </svg>
  );
}
function IconPencilRuler({ size = 20 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m15 5 4 4" />
      <path d="M13 7 8.7 2.7a2.41 2.41 0 0 0-3.4 0L2.7 5.3a2.41 2.41 0 0 0 0 3.4L7 13" />
      <path d="m8 6 2 2" />
      <path d="m2 22 5.5-1.5L21 7a2.83 2.83 0 0 0-4-4L3.5 16.5Z" />
      <path d="m18 16 2 2" />
      <path d="m17 11 4.3 4.3a2.41 2.41 0 0 1 0 3.4l-2.6 2.6a2.41 2.41 0 0 1-3.4 0L11 17" />
    </svg>
  );
}
function IconCrown({ size = 20 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z" />
      <path d="M5 21h14" />
    </svg>
  );
}

function IconEye({ size = 13 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
function IconBan({ size = 13 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
    </svg>
  );
}
function IconUnlock({ size = 13 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 9.9-1" />
    </svg>
  );
}
function IconTrash({ size = 13 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M6 6l1 14h10l1-14" />
    </svg>
  );
}

const PAGE_SIZE = 10;

export default function AdminUsersPage() {
  const { client, user: me } = useAuth();
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [inviteForm, setInviteForm] = useState({ email: "", role: "student" });
  const [inviteUrl, setInviteUrl] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("joined_desc");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState(1);

  async function loadUsers() {
    setLoading(true);
    try {
      const response = await client.get("/admin/users");
      setUsers(extractList(response.data));
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, [client]);
  useEffect(() => {
    setPage(1);
  }, [search, roleFilter, statusFilter, sortOrder]);

  async function generateLink() {
    setBusy(true);
    try {
      const response = await client.post("/admin/users/invites", {
        role: inviteForm.role,
      });
      setInviteUrl(response.data.invite_url || "");
      toast.success("Invite link generated.");
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function sendInvite() {
    if (!inviteForm.email.trim()) return;
    setBusy(true);
    try {
      const response = await client.post("/admin/users/invites", {
        role: inviteForm.role,
        email: inviteForm.email.trim(),
      });
      setInviteUrl(response.data.invite_url || "");
      toast.success(response.data.message || "Invite sent.");
      setInviteForm((cur) => ({ ...cur, email: "" }));
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function generateAndSend() {
    setBusy(true);
    try {
      const payload = { role: inviteForm.role };
      if (inviteForm.email.trim()) payload.email = inviteForm.email.trim();
      const response = await client.post("/admin/users/invites", payload);
      setInviteUrl(response.data.invite_url || "");
      toast.success(
        response.data.message ||
          (payload.email ? "Invite sent." : "Link generated."),
      );
      if (payload.email) setInviteForm((cur) => ({ ...cur, email: "" }));
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function updateUser(user, patch) {
    setBusy(true);
    try {
      await client.patch(`/admin/users/${user.id}`, patch);
      await loadUsers();
      toast.success("User updated.");
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function deleteUser(user) {
    if (!window.confirm(`Delete ${user.name || user.email || "this user"}?`)) {
      return;
    }

    setBusy(true);
    try {
      await client.delete(`/admin/users/${user.id}`);
      await loadUsers();
      toast.success("User deleted.");
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const summary = useMemo(
    () => ({
      total: users.length,
      active: users.filter((u) => !u.is_banned).length,
      instructors: users.filter((u) => u.role === "instructor").length,
      banned: users.filter((u) => u.is_banned).length,
    }),
    [users],
  );

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      const matchesQuery =
        !q ||
        u.name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q);
      const matchesRole = roleFilter === "all" || u.role === roleFilter;
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "banned" ? u.is_banned : !u.is_banned);
      return matchesQuery && matchesRole && matchesStatus;
    });
  }, [users, search, roleFilter, statusFilter]);

  const sortedUsers = useMemo(() => {
    const list = [...filteredUsers];

    switch (sortOrder) {
      case "joined_asc":
        list.sort(
          (left, right) =>
            new Date(left.created_at || 0).getTime() -
            new Date(right.created_at || 0).getTime(),
        );
        break;
      case "name_asc":
        list.sort((left, right) => {
          const leftName = (left.name || left.email || "").toLowerCase();
          const rightName = (right.name || right.email || "").toLowerCase();
          return leftName.localeCompare(rightName);
        });
        break;
      default:
        list.sort(
          (left, right) =>
            new Date(right.created_at || 0).getTime() -
            new Date(left.created_at || 0).getTime(),
        );
        break;
    }

    return list;
  }, [filteredUsers, sortOrder]);

  const totalPages = Math.ceil(sortedUsers.length / PAGE_SIZE);
  const showPagination = totalPages > 1;
  const pagedUsers = sortedUsers.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );

  return (
    <section className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[10px] tracking-[0.12em] text-primary/70 mono-ui uppercase">
            // ADMIN
          </p>
          <h1 className="page-title">User Moderation</h1>
          <p className="mt-1 text-xs text-[#555] mono-ui">
            $ users --list --sort joined_desc
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setInviteOpen(true)}
          >
            Invite via link
          </Button>
          <Button size="sm" onClick={() => setInviteOpen(true)}>
            Add user
          </Button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid gap-3 md:grid-cols-4">
        <StatCard title="Total users" value={summary.total} />
        <StatCard title="Active users" value={summary.active} />
        <StatCard title="Instructors" value={summary.instructors} />
        <StatCard title="Banned" value={summary.banned} />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative max-w-[280px] flex-1 min-w-[220px]">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#3a3a3a]">
            @
          </span>
          <Input
            className="pl-8"
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {[
          ["all", "All"],
          ["student", "Students"],
          ["instructor", "Instructors"],
          ["admin", "Admins"],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setRoleFilter(value)}
            className={[
              "inline-flex items-center gap-1 rounded-[4px] border px-3 py-1.5 text-[11px] mono-ui transition-colors",
              roleFilter === value
                ? "border-[#003a1a] bg-[#001a0d] text-primary"
                : "border-border text-muted-foreground hover:border-[#2a2a2a] hover:text-foreground",
            ].join(" ")}
          >
            {label}
          </button>
        ))}
        {[
          ["all", "All statuses"],
          ["active", "Active"],
          ["banned", "Banned"],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setStatusFilter(value)}
            className={[
              "inline-flex items-center gap-1 rounded-[4px] border px-3 py-1.5 text-[11px] mono-ui transition-colors",
              statusFilter === value
                ? value === "banned"
                  ? "border-[#3a0015] bg-[#1a0008] text-[#f43f5e]"
                  : "border-[#003a1a] bg-[#001a0d] text-primary"
                : "border-border text-muted-foreground hover:border-[#2a2a2a] hover:text-foreground",
            ].join(" ")}
          >
            {label}
          </button>
        ))}
        <div className="ml-auto">
          <Select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="w-auto"
          >
            <option value="joined_desc">Sort: Joined (newest)</option>
            <option value="joined_asc">Sort: Joined (oldest)</option>
            <option value="name_asc">Sort: Name A-Z</option>
          </Select>
        </div>
      </div>

      {loading && <LoadingState />}

      {/* Table */}
      <Card className="overflow-hidden">
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full border-collapse text-[12px]">
            <thead>
              <tr className="border-b border-border">
                <th className="w-8 px-4 py-3">
                  <input
                    type="checkbox"
                    style={{ accentColor: "var(--primary)" }}
                  />
                </th>
                {["USER", "ROLE", "STATUS", "JOINED"].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left font-mono text-[10px] font-medium tracking-[0.06em] text-muted-foreground"
                  >
                    {h}
                  </th>
                ))}
                <th className="w-20 px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {pagedUsers.map((user) => (
                <tr
                  key={user.id}
                  className="group border-b border-border last:border-0 hover:bg-[#111] transition-colors"
                >
                  {/* Checkbox */}
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      style={{ accentColor: "var(--primary)" }}
                    />
                  </td>

                  {/* User */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {resolveBackendAssetUrl(user.avatar_url) ? (
                        <img
                          src={resolveBackendAssetUrl(user.avatar_url)}
                          alt={user.name || user.email || "User"}
                          className="size-7 flex-shrink-0 rounded-full border border-border object-cover"
                        />
                      ) : (
                        <div className="flex size-7 flex-shrink-0 items-center justify-center rounded-full border border-border bg-[#111] font-mono text-[9px] font-medium text-primary">
                          {(user.name || user.email || "?")[0].toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className="font-medium text-foreground leading-none mb-0.5">
                          {user.name || "—"}
                        </div>
                        <div className="font-mono text-[10px] text-muted-foreground">
                          {user.email}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Role dropdown */}
                  <td className="px-4 py-3">
                    <Select
                      value={user.role}
                      disabled={busy || user.id === me?.id}
                      onChange={(e) =>
                        updateUser(user, { role: e.target.value })
                      }
                      className="h-7 w-auto py-0 text-[11px] font-mono"
                    >
                      <option value="student">student</option>
                      <option value="instructor">instructor</option>
                      <option value="admin">admin</option>
                    </Select>
                  </td>

                  {/* Status badges (original style) */}
                  <td className="px-4 py-3">
                    <Badge
                      variant={user.is_banned ? "destructive" : "secondary"}
                      className="text-[10px] uppercase tracking-[0.06em]"
                    >
                      {user.is_banned ? "banned" : "active"}
                    </Badge>
                  </td>

                  {/* Joined */}
                  <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground">
                    {user.created_at
                      ? new Date(user.created_at).toLocaleDateString("en-CA")
                      : "—"}
                  </td>

                  {/* Actions — hover only, no external CSS needed */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                      <button
                        type="button"
                        title="View profile"
                        className="flex size-[26px] items-center justify-center rounded-[4px] border border-border bg-transparent text-muted-foreground transition-colors hover:bg-[#111] hover:text-foreground"
                      >
                        <IconEye />
                      </button>
                      <button
                        type="button"
                        title={user.is_banned ? "Unban user" : "Ban user"}
                        disabled={busy || user.id === me?.id}
                        onClick={() =>
                          updateUser(user, { is_banned: !user.is_banned })
                        }
                        className={[
                          "flex size-[26px] items-center justify-center rounded-[4px] border bg-transparent transition-colors disabled:pointer-events-none disabled:opacity-30",
                          user.is_banned
                            ? "border-[#003a1a] text-primary hover:bg-[#001a0d]"
                            : "border-[#3a1010] text-[#f87171] hover:bg-[#1a0808]",
                        ].join(" ")}
                      >
                        {user.is_banned ? <IconUnlock /> : <IconBan />}
                      </button>
                      <button
                        type="button"
                        title="Delete user"
                        disabled={busy || user.id === me?.id}
                        onClick={() => deleteUser(user)}
                        className="flex size-[26px] items-center justify-center rounded-[4px] border border-[#3a1010] bg-transparent text-[#f87171] transition-colors hover:bg-[#1a0808] disabled:pointer-events-none disabled:opacity-30"
                      >
                        <IconTrash />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Pagination — only renders when there's more than one page */}
      <div className="flex items-center justify-between gap-4">
        <div className="font-mono text-[11px] text-[#3a3a3a]">
          Showing {pagedUsers.length} of {sortedUsers.length} users
          {sortedUsers.length !== users.length
            ? ` (filtered from ${users.length})`
            : ""}
        </div>
        {showPagination && (
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPage(p)}
                className={[
                  "flex size-7 items-center justify-center rounded-[4px] border font-mono text-[11px] transition-colors",
                  p === page
                    ? "border-[#003a1a] bg-[#001a0d] text-primary"
                    : "border-border text-muted-foreground hover:border-[#2a2a2a] hover:text-foreground",
                ].join(" ")}
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Invite modal */}
      {inviteOpen && (
        <div
          className="fixed inset-0 z-[240] flex items-center justify-center overflow-y-auto bg-black/70 px-4 py-6 backdrop-blur-sm"
          onClick={() => setInviteOpen(false)}
        >
          <div
            className="relative w-[440px] rounded-[10px] border border-border bg-[#0a0a0a] p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="absolute right-3 top-3 flex size-7 items-center justify-center rounded-[4px] text-[#3a3a3a] hover:bg-[#111] hover:text-foreground"
              onClick={() => setInviteOpen(false)}
            >
              ×
            </button>
            <div className="text-[15px] font-medium">Invite via link</div>
            <div className="mb-5 font-mono text-[11px] text-muted-foreground">
              Generate a sign-up link that grants a specific role on
              registration.
            </div>

            <label className="mb-2 block text-[11px] font-mono text-muted-foreground">
              SELECT ROLE FOR INVITEE
            </label>
            <div className="mb-4 grid grid-cols-3 gap-2">
              {[
                {
                  value: "student",
                  label: "STUDENT",
                  Icon: IconGraduationCap,
                  color: "text-[#a78bfa]",
                },
                {
                  value: "instructor",
                  label: "INSTRUCTOR",
                  Icon: IconPencilRuler,
                  color: "text-[#d97706]",
                },
                {
                  value: "admin",
                  label: "ADMIN",
                  Icon: IconCrown,
                  color: "text-[#f87171]",
                },
              ].map(({ value, label, Icon, color }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() =>
                    setInviteForm((cur) => ({ ...cur, role: value }))
                  }
                  className={[
                    "rounded-[6px] border p-3 text-center transition-colors",
                    inviteForm.role === value
                      ? "border-[#003a1a] bg-[#001a0d]"
                      : "border-border hover:border-[#2a2a2a]",
                  ].join(" ")}
                >
                  <div
                    className={`mb-2 flex justify-center ${inviteForm.role === value ? color : "text-[#3a3a3a]"}`}
                  >
                    <Icon size={20} />
                  </div>
                  <div
                    className={
                      inviteForm.role === value
                        ? "font-mono text-[10px] text-primary"
                        : "font-mono text-[10px] text-muted-foreground"
                    }
                  >
                    {label}
                  </div>
                </button>
              ))}
            </div>

            <label className="mb-2 block text-[11px] font-mono text-muted-foreground">
              INVITE LINK
            </label>
            <div className="mb-4 flex items-center gap-2 rounded-[5px] border border-border bg-background px-3 py-2 font-mono text-[11px]">
              <span
                className={`flex-1 truncate ${inviteUrl ? "text-primary" : "text-[#3a3a3a] italic"}`}
              >
                {inviteUrl || "No link generated yet"}
              </span>
              <Button
                size="sm"
                variant="outline"
                type="button"
                disabled={!inviteUrl}
              >
                Copy
              </Button>
            </div>

            <label className="mb-2 block text-[11px] font-mono text-muted-foreground">
              OR SEND VIA EMAIL
            </label>
            <div className="mb-4 flex gap-2">
              <Input
                placeholder="colleague@example.com"
                value={inviteForm.email}
                onChange={(e) =>
                  setInviteForm((cur) => ({ ...cur, email: e.target.value }))
                }
              />
              <Button
                size="sm"
                variant="outline"
                type="button"
                onClick={sendInvite}
                disabled={busy || !inviteForm.email.trim()}
              >
                Send
              </Button>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                size="sm"
                variant="outline"
                type="button"
                onClick={() => setInviteOpen(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                type="button"
                onClick={generateAndSend}
                disabled={busy}
              >
                Generate new link
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
