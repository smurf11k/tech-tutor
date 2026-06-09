import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/common/PageHeader";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { getApiErrorMessage } from "@/lib/utils";
import { ChevronDown, ChevronRight, EyeOff } from "lucide-react";

export default function InstructorModerationPage() {
  const { client } = useAuth();
  const toast = useToast();

  const [comments, setComments] = useState({});
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);
  const [collapsedCourses, setCollapsedCourses] = useState(() => {
    try {
      const saved = localStorage.getItem(
        "instructor-moderation-collapsed-courses",
      );
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });
  const [collapsedLessons, setCollapsedLessons] = useState(() => {
    try {
      const saved = localStorage.getItem(
        "instructor-moderation-collapsed-lessons",
      );
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });
  const [hiddenComments, setHiddenComments] = useState(() => {
    try {
      const saved = localStorage.getItem(
        "instructor-moderation-hidden-comments",
      );
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  useEffect(() => {
    loadUnansweredComments();
  }, []);

  async function loadUnansweredComments() {
    setLoading(true);

    try {
      const response = await client.get("/instructor/pending-comments");
      setComments(response.data || {});
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to load unanswered comments."));
    } finally {
      setLoading(false);
    }
  }

  function toggleCourse(courseId) {
    setCollapsedCourses((prev) => {
      const next = new Set(prev);
      if (next.has(courseId)) {
        next.delete(courseId);
      } else {
        next.add(courseId);
      }
      localStorage.setItem(
        "instructor-moderation-collapsed-courses",
        JSON.stringify([...next]),
      );
      return next;
    });
  }

  function toggleLesson(lessonId) {
    setCollapsedLessons((prev) => {
      const next = new Set(prev);
      if (next.has(lessonId)) {
        next.delete(lessonId);
      } else {
        next.add(lessonId);
      }
      localStorage.setItem(
        "instructor-moderation-collapsed-lessons",
        JSON.stringify([...next]),
      );
      return next;
    });
  }

  function hideComment(commentId) {
    setHiddenComments((prev) => {
      const next = new Set(prev);
      next.add(commentId);
      localStorage.setItem(
        "instructor-moderation-hidden-comments",
        JSON.stringify([...next]),
      );
      return next;
    });
  }

  async function handleDeleteComment(lessonId, commentId) {
    if (!confirm("Delete this comment?")) return;

    setDeleting(commentId);

    try {
      await client.delete(`/lessons/${lessonId}/comments/${commentId}`);

      setComments((prev) => {
        const updated = JSON.parse(JSON.stringify(prev));

        for (const course in updated) {
          for (const lesson in updated[course]) {
            updated[course][lesson] = updated[course][lesson].filter(
              (c) => c.id !== commentId,
            );

            if (updated[course][lesson].length === 0) {
              delete updated[course][lesson];
            }
          }

          if (Object.keys(updated[course]).length === 0) {
            delete updated[course];
          }
        }

        return updated;
      });

      toast.success("Comment deleted.");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to delete comment."));
    } finally {
      setDeleting(null);
    }
  }

  const totalComments = Object.values(comments).flatMap((courses) =>
    Object.values(courses).flat(),
  ).filter((c) => !hiddenComments.has(c.id)).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Unanswered Comments"
        description={
          totalComments === 0
            ? "All comments have replies. Great job!"
            : `${totalComments} comment${totalComments !== 1 ? "s" : ""} waiting for a reply`
        }
      />

      {loading ? (
        <Card className="border-border bg-card/80 shadow-none">
          <CardContent className="py-8">
            <p className="text-center text-sm text-muted-foreground mono-ui">
              Loading comments...
            </p>
          </CardContent>
        </Card>
      ) : totalComments === 0 ? (
        <Card className="border-border bg-card/80 shadow-none">
          <CardContent className="py-8">
            <p className="text-center text-sm text-muted-foreground mono-ui">
              No unanswered comments. Keep engaging with your students!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(comments).map(([courseId, courseComments]) => {
            const visibleCourseComments = Object.values(courseComments)
              .flat()
              .filter((c) => !hiddenComments.has(c.id));

            if (visibleCourseComments.length === 0) return null;

            const courseTitle =
              Object.values(courseComments).flat().at(0)?.lesson?.module
                ?.course?.title || "Course";

            return (
              <div key={courseId} className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <button
                    onClick={() => toggleCourse(courseId)}
                    className="flex items-center gap-2 text-left"
                  >
                    {collapsedCourses.has(courseId) ? (
                      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
                    )}
                    <h2 className="text-[13px] font-medium tracking-[-0.01em] text-foreground">
                      {courseTitle}
                    </h2>
                  </button>
                  <Badge variant="secondary">
                    {visibleCourseComments.length}
                  </Badge>
                </div>

                {!collapsedCourses.has(courseId) && (
                  <div className="space-y-4">
                    {Object.entries(courseComments).map(
                      ([lessonId, lessonComments]) => {
                        const visibleLessonComments = lessonComments.filter(
                          (c) => !hiddenComments.has(c.id),
                        );

                        if (visibleLessonComments.length === 0) return null;

                        return (
                          <div key={lessonId} className="space-y-3">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => toggleLesson(lessonId)}
                                className="flex items-center"
                              >
                                {collapsedLessons.has(lessonId) ? (
                                  <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
                                ) : (
                                  <ChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
                                )}
                              </button>
                              <h3 className="text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground mono-ui">
                                Lesson:{" "}
                                {lessonComments[0]?.lesson?.title ||
                                  "Unknown lesson"}
                              </h3>
                            </div>

                            {!collapsedLessons.has(lessonId) && (
                              <div className="space-y-3">
                                {visibleLessonComments.map((comment) => (
                                  <Card
                                    key={comment.id}
                                    className="overflow-hidden border-border bg-card/80 shadow-none"
                                  >
                                    <CardHeader className="flex flex-row items-start justify-between gap-4 border-b border-border px-5 py-4">
                                      <CardTitle className="min-w-0 flex-1 text-[13px] font-medium tracking-[-0.01em] text-foreground">
                                        <div className="mb-2 flex flex-wrap items-center gap-2">
                                          <span className="truncate">
                                            {comment.user?.name ||
                                              "Unknown user"}
                                          </span>
                                          {comment.user?.role_badge ? (
                                            <Badge
                                              variant="secondary"
                                              className="text-[10px]"
                                            >
                                              {comment.user.role_badge}
                                            </Badge>
                                          ) : null}
                                        </div>
                                        <span className="block text-[10px] mono-ui uppercase tracking-[0.08em] text-muted-foreground">
                                          {new Date(
                                            comment.created_at,
                                          ).toLocaleString()}
                                        </span>
                                      </CardTitle>
                                      <Badge
                                        variant="outline"
                                        className="shrink-0 border-[#003a2d] bg-[#001a12] text-[10px] text-[#34d399]"
                                      >
                                        Unanswered
                                      </Badge>
                                    </CardHeader>

                                    <CardContent className="space-y-4 px-5 py-4">
                                      <p className="break-words text-sm leading-6 text-foreground/90">
                                        {comment.body}
                                      </p>

                                      <div className="flex flex-wrap items-center gap-3 border-t border-border pt-3">
                                        <a
                                          href={`/learning/${comment.lesson?.module?.course?.id}?lesson=${comment.lesson?.id}`}
                                          className="inline-flex items-center gap-1.5 rounded-[4px] border border-border px-3 py-1.5 text-[11px] mono-ui text-muted-foreground transition-colors hover:border-border2 hover:text-foreground"
                                        >
                                          Go to Lesson
                                        </a>

                                        <button
                                          onClick={() =>
                                            hideComment(comment.id)
                                          }
                                          className="inline-flex items-center gap-1.5 rounded-[4px] border border-[#2a2d33] px-3 py-1.5 text-[11px] mono-ui text-[#9ca3af] transition-colors hover:border-[#3a3f47] hover:bg-[#1a1d21]"
                                        >
                                          <EyeOff className="size-3.5" />
                                          Hide
                                        </button>

                                        <button
                                          onClick={() =>
                                            handleDeleteComment(
                                              comment.lesson_id,
                                              comment.id,
                                            )
                                          }
                                          disabled={deleting === comment.id}
                                          className="inline-flex items-center gap-1.5 rounded-[4px] border border-[#3a1010] px-3 py-1.5 text-[11px] mono-ui text-[#f87171] transition-colors hover:border-[#5a1a1a] hover:bg-[#0d0404] disabled:opacity-50"
                                        >
                                          {deleting === comment.id
                                            ? "Deleting..."
                                            : "Delete"}
                                        </button>
                                      </div>
                                    </CardContent>
                                  </Card>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      },
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
