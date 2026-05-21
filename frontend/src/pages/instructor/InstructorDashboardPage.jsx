import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TooltipProvider } from "@/components/ui/tooltip";
import { StatCard } from "@/components/common/StatCard";
import { LoadingState } from "@/components/common/LoadingState";
import { PageHeader } from "@/components/common/PageHeader";
import IconActionButton from "@/components/common/IconActionButton";
import PublishStatusPill from "@/components/common/PublishStatusPill";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { getApiErrorMessage } from "@/lib/utils";

export default function InstructorDashboardPage() {
  const { client } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

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
            <section className="grid gap-4 md:grid-cols-3">
              <StatCard
                title="Courses"
                value={dashboard.summary.courses_count}
              />
              <StatCard
                title="Enrollments"
                value={dashboard.summary.enrollments_count}
              />
              <StatCard
                title="Revenue"
                value={dashboard.summary.revenue_total}
              />
            </section>

            <Card>
              <CardContent className="pt-4 space-y-4">
                <div>
                  <h2 className="text-lg font-semibold">Your Courses</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {dashboard.courses.length} total
                  </p>
                </div>

                <div className="border rounded-lg overflow-hidden">
                  <div className="grid grid-cols-12 gap-3 px-4 py-3 border-b text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    <span className="col-span-6">Title</span>
                    <span className="col-span-2">Enrollments</span>
                    <span className="col-span-2">Status</span>
                    <span className="col-span-2 text-right">Actions</span>
                  </div>

                  {dashboard.courses.length === 0 && (
                    <p className="px-4 py-6 text-sm text-muted-foreground">
                      No courses yet.
                    </p>
                  )}

                  {dashboard.courses.map((course, index) => (
                    <div
                      key={course.course_id}
                      className={`grid grid-cols-12 gap-3 px-4 py-4 items-center ${
                        index !== 0 ? "border-t" : ""
                      }`}
                    >
                      <div className="col-span-6 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {course.title}
                        </p>
                      </div>

                      <span className="col-span-2 text-sm text-muted-foreground">
                        {course.enrollments_count}
                      </span>

                      <div className="col-span-2">
                        <PublishStatusPill
                          status={course.is_published ? "published" : "draft"}
                        />
                      </div>

                      <div className="col-span-2 flex justify-end gap-1">
                        <IconActionButton
                          label="Edit course"
                          onClick={() =>
                            navigate(
                              `/instructor/courses/${course.course_id}`,
                              { state: { course } },
                            )
                          }
                        >
                          <Pencil className="h-4 w-4" />
                        </IconActionButton>

                        <IconActionButton
                          label="View course"
                          onClick={() =>
                            navigate(`/courses/${course.course_id}`, {
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
              </CardContent>
            </Card>
          </div>
        ) : null}
      </section>
    </TooltipProvider>
  );
}
