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
import { extractList, getApiErrorMessage } from "@/lib/utils";

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
      await client.put(`/courses/${course.id ?? course.course_id}`, {
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
    const id = course.id ?? course.course_id;
    setRequestingId(id);
    try {
      await client.post(`/courses/${id}/publish-request`);
      setRequestedIds((prev) => new Set([...prev, id]));
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
            <Card>
              <CardContent className="pt-4 space-y-4">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <h2 className="text-lg font-semibold">Courses</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      {searchedCourses.length} shown · {courses.length} total
                    </p>
                  </div>

                  <Input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search courses..."
                    className="w-64 h-8 text-sm"
                  />
                </div>

                <div className="border rounded-lg overflow-hidden">
                  <div className="grid grid-cols-12 gap-3 px-4 py-3 border-b text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    <span className="col-span-5">Title</span>
                    <span className="col-span-2">Enrollments</span>
                    <span className="col-span-2">Status</span>
                    <span className="col-span-3 text-right">Actions</span>
                  </div>

                  {searchedCourses.length === 0 && (
                    <p className="px-4 py-6 text-sm text-muted-foreground">
                      No courses found.
                    </p>
                  )}

                  {searchedCourses.map((course, index) => {
                    const id = course.id ?? course.course_id;
                    const alreadyRequested = requestedIds.has(id);
                    const isRequesting = requestingId === id;

                    return (
                      <div
                        key={id}
                        className={`grid grid-cols-12 gap-3 px-4 py-4 items-center ${
                          index !== 0 ? "border-t" : ""
                        }`}
                      >
                        <div className="col-span-5 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {course.title}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {course.description}
                          </p>
                        </div>

                        <span className="col-span-2 text-sm text-muted-foreground">
                          {course.enrollments_count ?? 0}
                        </span>

                        <div className="col-span-2">
                          <PublishStatusPill
                            status={course.is_published ? "published" : "draft"}
                          />
                        </div>

                        <div className="col-span-3 flex justify-end items-center gap-1">
                          <IconActionButton
                            label="Edit course"
                            onClick={() =>
                              navigate(`/instructor/courses/${id}`, {
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
                                className="h-8 text-xs rounded-[var(--radius)]"
                                onClick={() => togglePublish(course)}
                              >
                                Publish
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 text-xs rounded-[var(--radius)]"
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
                              className="h-8 text-xs rounded-[var(--radius)]"
                              onClick={() => togglePublish(course)}
                            >
                              Unpublish
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : null}
      </section>
    </TooltipProvider>
  );
}
