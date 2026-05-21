import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { LoadingState } from "@/components/common/LoadingState";
import { PageHeader } from "@/components/common/PageHeader";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { extractList, getApiErrorMessage } from "@/lib/utils";

export default function AdminUsersPage() {
  const { client, user: me } = useAuth();
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [inviteForm, setInviteForm] = useState({ email: "", role: "student" });
  const [inviteUrl, setInviteUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

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

  async function sendInvite(event) {
    event.preventDefault();
    setBusy(true);
    try {
      const response = await client.post("/admin/users/invites", inviteForm);
      setInviteUrl(response.data.invite_url || "");
      toast.success(response.data.message || "Invite sent.");
      setInviteForm({ email: "", role: "student" });
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

  return (
    <section className="space-y-6">
      <PageHeader
        title="User management"
        description="Invite users and manage roles."
      />

      <Card className="glass-panel">
        <CardHeader>
          <CardTitle className="text-base">Send invite</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-3" onSubmit={sendInvite}>
            <label className="space-y-2 block md:col-span-2">
              <Label>Email</Label>
              <Input
                type="email"
                required
                value={inviteForm.email}
                onChange={(event) =>
                  setInviteForm((current) => ({
                    ...current,
                    email: event.target.value,
                  }))
                }
              />
            </label>
            <label className="space-y-2 block">
              <Label>Role</Label>
              <Select
                value={inviteForm.role}
                onChange={(event) =>
                  setInviteForm((current) => ({
                    ...current,
                    role: event.target.value,
                  }))
                }
              >
                <option value="student">student</option>
                <option value="instructor">instructor</option>
              </Select>
            </label>
            <p className="md:col-span-3">
              <Button type="submit" disabled={busy}>
                Send invite
              </Button>
            </p>
          </form>
          {inviteUrl ? (
            <p className="mt-3 text-xs break-all text-muted-foreground">
              Invite link (5 min): {inviteUrl}
            </p>
          ) : null}
        </CardContent>
      </Card>

      {loading ? <LoadingState /> : null}
      <Card>
        <CardContent className="overflow-x-auto">
          <table className="min-w-full table-auto">
            <thead>
              <tr className="text-left">
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Email</th>
                <th className="px-4 py-2">Role</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-t">
                  <td className="px-4 py-3 align-top">
                    <div className="font-medium">{user.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {user.id}
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div className="text-sm">{user.email}</div>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <Select
                      value={user.role}
                      disabled={busy || user.id === me?.id}
                      onChange={(event) =>
                        updateUser(user, { role: event.target.value })
                      }
                    >
                      <option value="student">student</option>
                      <option value="instructor">instructor</option>
                      <option value="admin">admin</option>
                    </Select>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div className="flex gap-2 items-center">
                      <Badge className="text-xs capitalize">{user.role}</Badge>
                      {user.is_banned ? (
                        <Badge variant="destructive">banned</Badge>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={busy || user.id === me?.id}
                        onClick={() =>
                          updateUser(user, { is_banned: !user.is_banned })
                        }
                      >
                        {user.is_banned ? "Unban" : "Ban"}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </section>
  );
}
