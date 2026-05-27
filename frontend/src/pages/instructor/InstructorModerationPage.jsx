import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/common/PageHeader";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { getApiErrorMessage } from "@/lib/utils";

export default function InstructorModerationPage() {
  const { client } = useAuth();
  const toast = useToast();

  const [comments, setComments] = useState({});
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    loadPendingComments();
  }, []);

  async function loadPendingComments() {
    setLoading(true);

    try {
      const response = await client.get("/instructor/pending-comments");
      setComments(response.data || {});
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to load pending comments."));
    } finally {
      setLoading(false);
    }
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
  ).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pending Comments"
        description={
          totalComments === 0
            ? "All caught up! No pending comments."
            : `${totalComments} comment${totalComments !== 1 ? "s" : ""} waiting for review`
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
              No pending comments. Keep your courses engaged!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(comments).map(([courseId, courseComments]) => (
            <div key={courseId} className="space-y-3">
              <div className="flex items-end justify-between gap-3">
                <h2 className="text-[13px] font-medium tracking-[-0.01em] text-foreground">
                  {Object.values(courseComments).flat().at(0)?.lesson?.module
                    ?.course?.title || "Course"}
                </h2>
                <Badge variant="secondary">
                  {Object.values(courseComments).flat().length}
                </Badge>
              </div>

              <div className="space-y-4">
                {Object.entries(courseComments).map(
                  ([lessonId, lessonComments]) => (
                    <div key={lessonId} className="space-y-3">
                      <h3 className="mb-3 text-[10px] font-medium uppercase tracking-[0.08em] text-muted-foreground mono-ui">
                        Lesson: {lessonComments[0]?.lesson?.title}
                      </h3>

                      <div className="space-y-3">
                        {lessonComments.map((comment) => (
                          <Card
                            key={comment.id}
                            className="overflow-hidden border-border bg-card/80 shadow-none"
                          >
                            <CardHeader className="flex flex-row items-start justify-between gap-4 border-b border-border px-5 py-4">
                              <CardTitle className="min-w-0 flex-1 text-[13px] font-medium tracking-[-0.01em] text-foreground">
                                <div className="mb-2 flex flex-wrap items-center gap-2">
                                  <span className="truncate">
                                    {comment.user?.name || "Unknown user"}
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
                                className="shrink-0 border-[#3a2d00] bg-[#1a1200] text-[10px] text-[#f59e0b]"
                              >
                                Pending
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
                    </div>
                  ),
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
