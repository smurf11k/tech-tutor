import { useEffect, useState } from "react";
import {
  Activity,
  Award,
  BookOpen,
  CreditCard,
  Download,
  UserPlus,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/common/StatCard";
import { LoadingState } from "@/components/common/LoadingState";
import {
  DashboardPanel,
  DonutChart,
  MetricBars,
  SparklineChart,
} from "@/components/common/DashboardCharts";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import {
  formatMoney,
  getApiErrorMessage,
  getStripeCurrency,
} from "@/lib/utils";

export default function AdminDashboardPage() {
  const { client } = useAuth();
  const toast = useToast();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const dashboardResponse = await client.get("/admin/platform-dashboard");

        setData(dashboardResponse.data);
      } catch (err) {
        const msg = getApiErrorMessage(err);
        setError(msg);
        toast.error(msg);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [client, toast]);

  async function handleExport() {
    if (exporting) {
      return;
    }

    setExporting(true);

    try {
      const response = await client.get("/admin/platform-export", {
        responseType: "blob",
      });
      const disposition = response.headers["content-disposition"];
      const filenameMatch = disposition?.match(/filename\*?=(?:UTF-8''|")?([^";]+)/i);
      const filename = filenameMatch
        ? decodeURIComponent(filenameMatch[1])
        : "platform-data.csv";
      const blob = new Blob([response.data], {
        type: "text/csv;charset=utf-8",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();

      setTimeout(() => window.URL.revokeObjectURL(url), 0);
      toast.success("Platform data export downloaded.");
    } catch (err) {
      const msg = getApiErrorMessage(err);
      toast.error(msg);
    } finally {
      setExporting(false);
    }
  }

  const summary = data?.summary;
  const paymentStatuses = data?.payment_statuses || [];
  const revenueByCourse = data?.revenue_by_course || [];
  const recentActivity = data?.recent_activity || [];
  const recentCertificates = data?.recent_certificates || [];
  const currency = getStripeCurrency();
  const activityBars = summary
    ? [
        {
          id: "users",
          label: "Active users",
          value: (summary.users_count || 0) - (summary.banned_users_count || 0),
          meta: `${summary.students_count || 0} students`,
        },
        {
          id: "courses",
          label: "Live courses",
          value: summary.published_courses_count || 0,
          meta: `${summary.draft_courses_count || 0} drafts`,
        },
        {
          id: "enrollments",
          label: "Enrollments",
          value: summary.enrollments_count || 0,
          meta: `${summary.certificates_count || 0} certificates`,
        },
        {
          id: "payments",
          label: "Settled payments",
          value: summary.paid_payments_count || 0,
          meta: `${summary.payments_count || 0} payment rows`,
        },
      ]
    : [];

  const kpis = summary
    ? [
        {
          key: "revenue",
          label: "TOTAL REVENUE",
          value: formatMoney(summary.revenue_total, currency),
          note: `${summary.paid_payments_count || 0} paid payments`,
        },
        {
          key: "users",
          label: "ACTIVE USERS",
          value: String(
            (summary.users_count || 0) - (summary.banned_users_count || 0),
          ),
          note: `${summary.students_count || 0} students`,
        },
        {
          key: "signup",
          label: "NEW SIGNUPS",
          value: String(summary.students_count || 0),
          note: `${summary.admins_count || 0} admins in the system`,
        },
        {
          key: "subs",
          label: "PAYMENT ROWS",
          value: String(summary.payments_count || 0),
          note: `${summary.paid_payments_count || 0} settled`,
        },
        {
          key: "banned",
          label: "BANNED USERS",
          value: String(summary.banned_users_count || 0),
          note: "moderation state",
        },
        {
          key: "courses",
          label: "LIVE COURSES",
          value: String(summary.published_courses_count || 0),
          note: `${summary.draft_courses_count || 0} drafts`,
        },
      ]
    : [];

  function activityMeta(type) {
    switch (type) {
      case "user_registered":
        return {
          label: "User registered",
          icon: UserPlus,
          tone: "bg-[#001a0d] text-primary",
        };
      case "course_created":
        return {
          label: "Course created",
          icon: BookOpen,
          tone: "bg-[#0f0a1a] text-[#a78bfa]",
        };
      case "enrollment_created":
        return {
          label: "Enrollment created",
          icon: Users,
          tone: "bg-[#0a141a] text-[#38bdf8]",
        };
      case "payment_recorded":
        return {
          label: "Payment recorded",
          icon: CreditCard,
          tone: "bg-[#1a0f00] text-[#f59e0b]",
        };
      case "certificate_issued":
        return {
          label: "Certificate issued",
          icon: Award,
          tone: "bg-[#171200] text-[#eab308]",
        };
      default:
        return {
          label: "Activity",
          icon: Activity,
          tone: "bg-[#111] text-muted-foreground",
        };
    }
  }

  return (
    <section className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-[10px] tracking-[0.12em] text-primary/70 mono-ui uppercase">
            // ADMIN
          </p>
          <h1 className="text-[20px] font-semibold tracking-[-0.02em]">
            Platform Dashboard
          </h1>
          <p className="text-xs text-[#555] mono-ui">
            $ platform --status --period last_30_days
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleExport}
            disabled={exporting}
            className="gap-2"
            aria-busy={exporting}
          >
            <Download className="size-4" />
            {exporting ? "Exporting..." : "Export data"}
          </Button>
        </div>
      </div>

      {loading ? <LoadingState /> : null}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {summary ? (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {kpis.map((item) => (
              <StatCard
                key={item.key}
                title={item.label}
                value={item.value}
                hint={item.note}
                className="h-full"
              />
            ))}
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <DashboardPanel
              title="Revenue by course"
              subtitle="live revenue from your active catalogue"
              right={<Badge variant="secondary">live</Badge>}
            >
              <MetricBars
                rows={revenueByCourse.slice(0, 6).map((row) => ({
                  id: row.course_id,
                  label: row.course_title || `Course ${row.course_id}`,
                  value: Number(row.revenue_total || 0),
                  meta: `${row.payments_count || 0} payments`,
                }))}
                valueFormatter={(value) => formatMoney(value, currency)}
              />
            </DashboardPanel>

            <DashboardPanel
              title="Payment statuses"
              subtitle="paid, pending, refunded, and failed payments"
              right={<Badge variant="secondary">snapshot</Badge>}
            >
              <DonutChart
                centerLabel="payments"
                segments={paymentStatuses.map((row, index) => ({
                  label: row.status,
                  value: Number(row.count || 0),
                  color:
                    row.status === "pending"
                      ? "#f59e0b"
                      : index === 0
                        ? "#00e574"
                        : index === 1
                          ? "#0ea5e9"
                          : index === 2
                            ? "#a78bfa"
                            : "#f59e0b",
                  meta: `${formatMoney(row.amount, currency)} total`,
                }))}
              />
            </DashboardPanel>
          </section>

          <section className="grid gap-4 lg:grid-cols-3">
            <DashboardPanel
              title="Platform snapshot"
              subtitle="the dashboard metrics flattened into a trend line"
              right={<Badge variant="secondary">overview</Badge>}
            >
              <SparklineChart
                values={activityBars.map((row) => row.value)}
                labels={activityBars.map((row) => row.label)}
              />
            </DashboardPanel>

            <DashboardPanel
              title="Recent certificates"
              subtitle="students' certificates arriving in the log"
              right={
                <Badge variant="secondary">{recentCertificates.length}</Badge>
              }
            >
              <div className="space-y-3">
                {recentCertificates.map((certificate) => (
                  <div
                    key={certificate.id}
                    className="flex items-start gap-3 border-b border-border pb-3 last:border-b-0 last:pb-0"
                  >
                    <span className="mt-0.5 inline-flex size-7 items-center justify-center rounded-md bg-[#001a0d] text-primary">
                      <Award className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-foreground">
                        {certificate.user?.name || "Unknown student"}
                      </p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {certificate.course?.title ||
                          `Course #${certificate.course_id}`}
                      </p>
                      <p className="mt-1 text-[10px] mono-ui text-muted-foreground">
                        #{certificate.certificate_number || certificate.id}
                      </p>
                    </div>
                    <span className="text-[10px] mono-ui text-muted-foreground">
                      {certificate.issued_at
                        ? new Date(certificate.issued_at).toLocaleDateString()
                        : "—"}
                    </span>
                  </div>
                ))}
              </div>
            </DashboardPanel>

            <DashboardPanel
              title="Recent activity"
              subtitle="shortened platform log"
              right={
                <Badge variant="secondary">
                  {Math.min(6, recentActivity.length)}
                </Badge>
              }
            >
              <div className="space-y-3">
                {recentActivity.slice(0, 6).map((item) => {
                  const meta = activityMeta(item.type);
                  const Icon = meta.icon;

                  return (
                    <div
                      key={`${item.type}-${item.id}`}
                      className="flex items-start gap-3 border-b border-border pb-3 last:border-b-0 last:pb-0"
                    >
                      <span
                        className={[
                          "mt-0.5 inline-flex size-7 items-center justify-center rounded-md",
                          meta.tone,
                        ].join(" ")}
                      >
                        <Icon className="size-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-foreground">
                          {meta.label}
                        </p>
                        <p className="truncate text-[11px] text-muted-foreground">
                          {item.label}
                        </p>
                      </div>
                      <span className="text-[10px] text-[#3a3a3a] mono-ui">
                        {item.created_at
                          ? new Date(item.created_at).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "—"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </DashboardPanel>
          </section>
        </>
      ) : null}
    </section>
  );
}
