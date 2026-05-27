import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PageHeader } from "@/components/common/PageHeader";
import { LoadingState } from "@/components/common/LoadingState";
import IconActionButton from "@/components/common/IconActionButton";
import PublishStatusPill from "@/components/common/PublishStatusPill";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import {
  extractList,
  getApiErrorMessage,
  getCourseRouteKey,
} from "@/lib/utils";

const normalize = (value) =>
  String(value ?? "")
    .toLowerCase()
    .trim();

export default function InstructorContentPage() {
  const { client, user: me, isAdmin } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [requestedIds, setRequestedIds] = useState(new Set());
  const [requestingId, setRequestingId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const response = await client.get("/courses");
      const all = extractList(response.data);
      const visible = isAdmin
        ? all
        : all.filter(
            (c) =>
              String(c.instructor_id) === String(me?.id) ||
              (!c.instructor_id && String(c.user_id) === String(me?.id)),
          );
      setCourses(visible);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to load courses."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [client, me, isAdmin]);

  const togglePublish = async (course) => {
    try {
      const routeKey = getCourseRouteKey(course);
      await client.put(`/courses/${routeKey}`, {
        is_published: !course.is_published,
      });
      toast.success(
        course.is_published ? "Course unpublished." : "Course published.",
      );
      await load();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to update publish status."));
    }
  };

  const requestPublish = async (course) => {
    const routeKey = getCourseRouteKey(course);
    setRequestingId(routeKey);
    try {
      await client.post(`/courses/${routeKey}/publish-request`);
      setRequestedIds((prev) => new Set([...prev, routeKey]));
      toast.success("Publish request submitted.");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to submit publish request."));
    } finally {
      setRequestingId(null);
    }
  };

  const searchedCourses = courses.filter((c) =>
    [c.title, c.description, c.status].some((field) =>
      normalize(field).includes(normalize(searchTerm)),
    ),
  );

  return (
    <TooltipProvider>
      <section>
        <PageHeader
          title="Content"
          description="Create and manage your courses, modules and lessons."
          actions={
            <Button asChild>
              <Link to="/instructor/courses/new">New course</Link>
            </Button>
          }
        />

        {loading ? <LoadingState /> : null}

        {!loading ? (
          <div className="space-y-6">
            <Card className="overflow-hidden border-border bg-card/80 shadow-none">
              <CardContent className="p-0">
                <div className="flex flex-col gap-4 border-b border-border px-5 py-4 md:flex-row md:items-end md:justify-between">
                  <div>
                    <h2 className="text-[13px] font-medium tracking-[-0.01em] text-foreground">
                      Courses
                    </h2>
                    <p className="mt-1 text-[10px] mono-ui uppercase tracking-[0.08em] text-muted-foreground">
                      {searchedCourses.length} shown · {courses.length} total
                    </p>
                  </div>

                  <Input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search courses..."
                    className="h-8 w-full max-w-xs text-sm md:w-72"
                  />
                </div>

                <div className="overflow-hidden">
                  <div className="grid grid-cols-12 gap-3 border-b border-border px-5 py-3 text-[10px] font-medium uppercase tracking-[0.06em] text-muted-foreground mono-ui">
                    <span className="col-span-5">Title</span>
                    <span className="col-span-2">Enrollments</span>
                    <span className="col-span-2">Status</span>
                    <span className="col-span-3 text-right">Actions</span>
                  </div>

                  {searchedCourses.length === 0 ? (
                    <p className="px-5 py-6 text-sm text-muted-foreground">
                      No courses found.
                    </p>
                  ) : (
                    searchedCourses.map((course, index) => {
                      const routeKey = getCourseRouteKey(course);
                      const alreadyRequested = requestedIds.has(routeKey);
                      const isRequesting = requestingId === routeKey;

                      return (
                        <div
                          key={routeKey}
                          className={`grid grid-cols-12 items-center gap-3 border-b border-border px-5 py-4 transition-colors last:border-b-0 hover:bg-[#111] ${
                            index === 0 ? "bg-[#0f0f0f]" : ""
                          }`}
                        >
                          <div className="col-span-5 min-w-0">
                            <p className="truncate text-sm font-medium text-foreground">
                              {course.title}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {course.description}
                            </p>
                          </div>

                          <span className="col-span-2 text-[11px] mono-ui text-muted-foreground">
                            {course.enrollments_count ?? 0}
                          </span>

                          <div className="col-span-2">
                            <PublishStatusPill
                              status={
                                course.is_published ? "published" : "draft"
                              }
                            />
                          </div>

                          <div className="col-span-3 flex items-center justify-end gap-1.5">
                            <IconActionButton
                              label="Edit course"
                              onClick={() =>
                                navigate(`/instructor/courses/${routeKey}`, {
                                  state: { course },
                                })
                              }
                            >
                              <Pencil className="h-4 w-4" />
                            </IconActionButton>

                            {!course.is_published &&
                              (isAdmin ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 rounded-[var(--radius)] text-xs"
                                  onClick={() => togglePublish(course)}
                                >
                                  Publish
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 rounded-[var(--radius)] text-xs"
                                  onClick={() => requestPublish(course)}
                                  disabled={alreadyRequested || isRequesting}
                                >
                                  {alreadyRequested
                                    ? "Requested ✓"
                                    : isRequesting
                                      ? "…"
                                      : "Request publish"}
                                </Button>
                              ))}

                            {course.is_published && isAdmin && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 rounded-[var(--radius)] text-xs"
                                onClick={() => togglePublish(course)}
                              >
                                Unpublish
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : null}
      </section>
    </TooltipProvider>
  );
}
