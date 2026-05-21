import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
      <div>
        <h1 className="text-3xl font-bold mb-2">Pending Comments</h1>

        <p className="text-muted-foreground">
          {totalComments === 0
            ? "All caught up! No pending comments."
            : `${totalComments} comment${
                totalComments !== 1 ? "s" : ""
              } waiting for review`}
        </p>
      </div>

      {loading ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Loading comments...
            </p>
          </CardContent>
        </Card>
      ) : totalComments === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              No pending comments. Keep your courses engaged!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(comments).map(([courseId, courseComments]) => (
            <div key={courseId}>
              <h2 className="text-xl font-semibold mb-4 text-foreground/80">
                {Object.values(courseComments).flat().at(0)?.lesson?.module
                  ?.course?.title || "Course"}
              </h2>

              <div className="space-y-4">
                {Object.entries(courseComments).map(
                  ([lessonId, lessonComments]) => (
                    <div key={lessonId}>
                      <h3 className="text-sm font-medium mb-3 text-muted-foreground">
                        Lesson: {lessonComments[0]?.lesson?.title}
                      </h3>

                      <div className="space-y-3">
                        {lessonComments.map((comment) => (
                          <Card key={comment.id} className="overflow-hidden">
                            <CardContent className="pt-4">
                              <div className="space-y-3">
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                                      <p className="font-medium text-sm">
                                        {comment.user?.name}
                                      </p>

                                      {comment.user?.role_badge && (
                                        <Badge
                                          variant="secondary"
                                          className="text-xs"
                                        >
                                          {comment.user.role_badge}
                                        </Badge>
                                      )}
                                    </div>

                                    <p className="text-xs text-muted-foreground mb-3">
                                      {new Date(
                                        comment.created_at,
                                      ).toLocaleString()}
                                    </p>

                                    <p className="text-sm text-foreground/90 break-words">
                                      {comment.body}
                                    </p>
                                  </div>

                                  <Badge
                                    variant="outline"
                                    className="text-xs bg-yellow-50/50 text-yellow-700 shrink-0"
                                  >
                                    Pending
                                  </Badge>
                                </div>

                                <div className="flex gap-3 pt-2 border-t border-border/60">
                                  <a
                                    href={`/learning/${comment.lesson?.module?.course?.id}?lesson=${comment.lesson?.id}`}
                                    className="text-xs text-primary hover:underline"
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
                                    className="text-xs text-destructive hover:underline disabled:opacity-50"
                                  >
                                    {deleting === comment.id
                                      ? "Deleting..."
                                      : "Delete"}
                                  </button>
                                </div>
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
