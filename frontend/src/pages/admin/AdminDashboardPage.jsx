import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/common/StatCard";
import { LoadingState } from "@/components/common/LoadingState";
import { PageHeader } from "@/components/common/PageHeader";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { getApiErrorMessage } from "@/lib/utils";

export default function AdminDashboardPage() {
  const { client } = useAuth();
  const toast = useToast();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const response = await client.get("/admin/platform-dashboard");
        setData(response.data);
      } catch (err) {
        const msg = getApiErrorMessage(err);
        setError(msg);
        toast.error(msg);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [client]);

  const summary = data?.summary;

  return (
    <section>
      <PageHeader
        title="Admin dashboard"
        description="Platform-wide activity and monitoring."
        actions={
          <>
            <Button variant="outline" asChild>
              <Link to="/admin/users">Users</Link>
            </Button>
            <Button asChild>
              <Link to="/admin/moderation">Moderation</Link>
            </Button>
          </>
        }
      />
      {loading ? <LoadingState /> : null}
      {summary ? (
        <section className="grid gap-4 md:grid-cols-3">
          <StatCard
            title="Users"
            value={summary.users_count}
            hint={`${summary.students_count} students · ${summary.instructors_count} instructors · ${summary.banned_users_count} banned`}
          />
          <StatCard
            title="Courses"
            value={summary.courses_count}
            hint={`${summary.published_courses_count} published · ${summary.draft_courses_count} drafts`}
          />
          <StatCard
            title="Revenue"
            value={summary.revenue_total}
            hint={`${summary.paid_payments_count} paid of ${summary.payments_count} payments`}
          />
        </section>
      ) : null}
    </section>
  );
}
