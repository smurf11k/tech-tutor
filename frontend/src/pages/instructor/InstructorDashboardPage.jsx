import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Award, Eye, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/common/StatCard";
import { LoadingState } from "@/components/common/LoadingState";
import { PageHeader } from "@/components/common/PageHeader";
import IconActionButton from "@/components/common/IconActionButton";
import {
  DashboardPanel,
  MetricBars,
  SparklineChart,
} from "@/components/common/DashboardCharts";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import {
  formatMoney,
  getApiErrorMessage,
  getCourseRouteKey,
  getStripeCurrency,
} from "@/lib/utils";

export default function InstructorDashboardPage() {
  const { client } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const currency = getStripeCurrency();

  useEffect(() => {
    async function load() {
      try {
        const response = await client.get("/instructor/dashboard");
        setDashboard(response.data);
      } catch (err) {
        toast.error(getApiErrorMessage(err, "Failed to load dashboard."));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [client]);

  const courseRows = (dashboard?.courses || []).map((course) => ({
    id: course.course_id,
    label: course.title,
    value: Number(course.revenue_total || 0),
    meta: `${course.enrollments_count || 0} enrolled • ${course.certificates_count || 0} certificates • ${course.completion_rate ?? 0}% completion`,
  }));

  const completionTrend = (dashboard?.courses || []).map((course) =>
    Number(course.completion_rate || 0),
  );
  const completionLabels = (dashboard?.courses || []).map(
    (course) => course.title,
  );
  const recentCertificates = dashboard?.recent_certificates || [];

  return (
    <TooltipProvider>
      <section>
        <PageHeader
          title="Instructor dashboard"
          description="Overview of your courses, enrollments, and revenue."
          actions={
            <Button asChild>
              <Link to="/instructor/courses/new">New course</Link>
            </Button>
          }
        />

        {loading ? <LoadingState /> : null}

        {dashboard ? (
          <div className="space-y-6">
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatCard
                title="Courses"
                value={dashboard.summary.courses_count}
                hint={`${dashboard.summary.published_courses_count} published`}
                className="h-full"
              />
              <StatCard
                title="Enrolled users"
                value={dashboard.summary.enrollments_count}
                hint={`${dashboard.summary.average_progress ?? 0}% avg progress`}
                className="h-full"
              />
              <StatCard
                title="Issued certificates"
                value={dashboard.summary.certificates_count}
                hint={`${dashboard.summary.average_quiz_score ?? 0}% avg quiz score`}
                className="h-full"
              />
              <StatCard
                title="Revenue"
                value={formatMoney(dashboard.summary.revenue_total, currency)}
                hint={`${dashboard.summary.published_courses_count} live courses`}
                className="h-full"
              />
            </section>

            <section className="grid gap-4 lg:grid-cols-2">
              <DashboardPanel
                title="Course revenue"
                subtitle="your courses ranked by generated revenue"
                right={
                  <Badge variant="secondary">
                    {dashboard.courses.length} courses
                  </Badge>
                }
              >
                {courseRows.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No courses yet.
                  </p>
                ) : (
                  <MetricBars
                    rows={courseRows.slice(0, 6)}
                    valueFormatter={(value) => formatMoney(value, currency)}
                  />
                )}
              </DashboardPanel>

              <DashboardPanel
                title="Completion trend"
                subtitle="certificate progress across your course catalog"
                right={<Badge variant="secondary">overview</Badge>}
              >
                {completionTrend.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No published metrics yet.
                  </p>
                ) : (
                  <SparklineChart
                    values={completionTrend}
                    labels={completionLabels}
                  />
                )}
              </DashboardPanel>
            </section>

            <section className="grid gap-4 lg:grid-cols-2">
              <DashboardPanel
                title="Recent certificates"
                subtitle="students' certificates issued through your courses"
                right={
                  <Badge variant="secondary">{recentCertificates.length}</Badge>
                }
              >
                <div className="space-y-3">
                  {recentCertificates.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No certificates yet.
                    </p>
                  ) : (
                    recentCertificates.map((certificate) => (
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
                            ? new Date(
                                certificate.issued_at,
                              ).toLocaleDateString()
                            : "—"}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </DashboardPanel>

              <DashboardPanel
                title="Course status"
                subtitle="quick access to editing and viewing the instructor catalog"
                right={<Badge variant="secondary">live</Badge>}
              >
                <div className="space-y-3">
                  {dashboard.courses.slice(0, 5).map((course) => (
                    <div
                      key={course.course_id}
                      className="flex items-center gap-3 border-b border-border pb-3 last:border-b-0 last:pb-0"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-foreground">
                          {course.title}
                        </p>
                        <p className="mt-1 text-[10px] mono-ui text-muted-foreground">
                          {course.enrollments_count} enrolled •{" "}
                          {course.certificates_count} certificates •{" "}
                          {course.average_progress ?? 0}% progress
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <IconActionButton
                          label="Edit course"
                          onClick={() =>
                            navigate(
                              `/instructor/courses/${getCourseRouteKey(course)}`,
                              { state: { course } },
                            )
                          }
                        >
                          <Pencil className="h-4 w-4" />
                        </IconActionButton>

                        <IconActionButton
                          label="View course"
                          onClick={() =>
                            navigate(`/courses/${getCourseRouteKey(course)}`, {
                              state: { course },
                            })
                          }
                        >
                          <Eye className="h-4 w-4" />
                        </IconActionButton>
                      </div>
                    </div>
                  ))}
                </div>
              </DashboardPanel>
            </section>
          </div>
        ) : null}
      </section>
    </TooltipProvider>
  );
}
