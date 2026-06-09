import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingState } from "@/components/common/LoadingState";
import { PageHeader } from "@/components/common/PageHeader";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { extractList, getApiErrorMessage } from "@/lib/utils";

export default function AdminModerationPage() {
  const { client } = useAuth();
  const toast = useToast();
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [declineReasons, setDeclineReasons] = useState({});

  const loadQueue = useCallback(async () => {
    setLoading(true);
    try {
      const response = await client.get("/admin/moderation-queue");
      setQueue(extractList(response.data));
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to load moderation queue."));
    } finally {
      setLoading(false);
    }
  }, [client, toast]);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  useEffect(() => {
    const handler = () => loadQueue();
    window.addEventListener("moderation:changed", handler);
    return () => window.removeEventListener("moderation:changed", handler);
  }, [loadQueue]);

  async function moderateReview(reviewId, isPublished) {
    setBusy(true);
    try {
      await client.patch(`/admin/moderation-queue/reviews/${reviewId}`, {
        is_published: isPublished,
        declined_reason: declineReasons[reviewId] || undefined,
      });
    } catch (err) {
      toast.error(getApiErrorMessage(err));
      return;
    } finally {
      setBusy(false);
    }

    if (!isPublished) {
      setDeclineReasons((current) => {
        const next = { ...current };
        delete next[reviewId];
        return next;
      });
    }

    toast.success(isPublished ? "Review approved." : "Review declined.");
    await loadQueue();
  }

  async function moderatePublishRequest(publishRequestId, action, requestType) {
    setBusy(true);
    try {
      await client.patch(
        `/admin/moderation-queue/publish-requests/${publishRequestId}`,
        {
          action,
          declined_reason: declineReasons[publishRequestId] || undefined,
        },
      );
      if (action === "accept") {
        toast.success(
          requestType === "unpublish"
            ? "Course unpublished."
            : "Course published.",
        );
      } else {
        toast.success(
          requestType === "unpublish"
            ? "Unpublish request declined."
            : "Publish request declined.",
        );
      }
      setDeclineReasons((current) => {
        const next = { ...current };
        delete next[publishRequestId];
        return next;
      });
      window.dispatchEvent(new Event("moderation:changed"));
      await loadQueue();
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <PageHeader
        title="Moderation queue"
        description="Approve or decline reviews, lesson revisions, quiz revisions, comments, and course publish requests."
      />
      {loading ? <LoadingState /> : null}
      <section className="space-y-3">
        {/* TODO: Add queue filters by type/date once moderation endpoint supports filtering query params. */}
        {queue.map((item, index) => {
          if (item.content_type === "publish_request") {
            const request = item.publish_request;
            const course = request?.course;
            const key = `publish-${request?.id ?? index}`;

            return (
              <Card key={key}>
                <CardHeader>
                  <CardTitle className="text-[13px] flex flex-wrap items-center gap-2 mono-ui">
                    <Badge variant="outline">
                      {request?.request_type === "unpublish"
                        ? "unpublish request"
                        : "publish request"}
                    </Badge>
                    {course?.title || "Unknown course"}
                  </CardTitle>
                </CardHeader>
                {/* TODO: Add request type: publish request / unpublish request */}
                <CardContent className="space-y-3 text-sm">
                  <p>
                    Requested by:{" "}
                    <span className="font-medium">
                      {request?.requester?.name || "Unknown"}
                    </span>
                  </p>
                  {course?.subtitle ? (
                    <p className="text-muted-foreground">{course.subtitle}</p>
                  ) : null}
                  <label className="block space-y-2">
                    <Label htmlFor={`decline-${request.id}`}>
                      Decline reason (optional)
                    </Label>
                    <Input
                      id={`decline-${request.id}`}
                      value={declineReasons[request.id] || ""}
                      onChange={(event) =>
                        setDeclineReasons((current) => ({
                          ...current,
                          [request.id]: event.target.value,
                        }))
                      }
                      placeholder="Reason shown to the instructor"
                    />
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      disabled={busy}
                      onClick={() =>
                        moderatePublishRequest(
                          request.id,
                          "accept",
                          request?.request_type,
                        )
                      }
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={busy}
                      onClick={() =>
                        moderatePublishRequest(
                          request.id,
                          "decline",
                          request?.request_type,
                        )
                      }
                    >
                      Decline
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          }

          if (item.content_type === "lesson_revision") {
            const revision = item.lesson_revision;
            const lesson = revision?.lesson;
            const course = lesson?.module?.course;
            const key = `lesson-revision-${revision?.id ?? index}`;
            const courseRouteKey = course?.slug || course?.id;

            return (
              <Card key={key}>
                <CardHeader>
                  <CardTitle className="text-[13px] flex flex-wrap items-center gap-2 mono-ui">
                    <Badge variant="outline">lesson revision</Badge>
                    <Badge variant="outline" className="ml-2">
                      {revision?.status === "pending_unpublish"
                        ? "unpublish request"
                        : "publish request"}
                    </Badge>
                    {lesson?.title || "Untitled lesson"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {courseRouteKey ? (
                    <Button size="sm" variant="outline" asChild>
                      <Link
                        to={`/instructor/courses/${courseRouteKey}`}
                        state={{
                          course,
                          lessonId: lesson?.id,
                          moduleId: lesson?.module?.id,
                        }}
                      >
                        Open in editor
                      </Link>
                    </Button>
                  ) : null}
                  <label className="block space-y-2">
                    <Label htmlFor={`decline-${revision.id}`}>
                      Decline reason (optional)
                    </Label>
                    <Input
                      id={`decline-${revision.id}`}
                      value={declineReasons[revision.id] || ""}
                      onChange={(event) =>
                        setDeclineReasons((current) => ({
                          ...current,
                          [revision.id]: event.target.value,
                        }))
                      }
                      placeholder="Reason shown to the instructor"
                    />
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      disabled={busy}
                      onClick={() =>
                        moderateLessonRevision(
                          revision.id,
                          "accept",
                          revision?.status,
                        )
                      }
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={busy}
                      onClick={() =>
                        moderateLessonRevision(
                          revision.id,
                          "decline",
                          revision?.status,
                        )
                      }
                    >
                      Decline
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          }

          if (item.content_type === "quiz_revision") {
            const revision = item.quiz_revision;
            const quiz = revision?.quiz;
            const course = quiz?.module?.course;
            const key = `quiz-revision-${revision?.id ?? index}`;
            const courseRouteKey = course?.slug || course?.id;

            return (
              <Card key={key}>
                <CardHeader>
                  <CardTitle className="text-[13px] flex flex-wrap items-center gap-2 mono-ui">
                    <Badge variant="outline">quiz revision</Badge>
                    <Badge variant="outline" className="ml-2">
                      {revision?.status === "pending_unpublish"
                        ? "unpublish request"
                        : "publish request"}
                    </Badge>
                    {quiz?.title || "Untitled quiz"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {courseRouteKey ? (
                    <Button size="sm" variant="outline" asChild>
                      <Link
                        to={`/instructor/courses/${courseRouteKey}`}
                        state={{
                          course,
                          quizId: quiz?.id,
                          moduleId: quiz?.module?.id,
                        }}
                      >
                        Open in editor
                      </Link>
                    </Button>
                  ) : null}
                  <label className="block space-y-2">
                    <Label htmlFor={`decline-${revision.id}`}>
                      Decline reason (optional)
                    </Label>
                    <Input
                      id={`decline-${revision.id}`}
                      value={declineReasons[revision.id] || ""}
                      onChange={(event) =>
                        setDeclineReasons((current) => ({
                          ...current,
                          [revision.id]: event.target.value,
                        }))
                      }
                      placeholder="Reason shown to the instructor"
                    />
                  </label>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      disabled={busy}
                      onClick={() =>
                        moderateQuizRevision(
                          revision.id,
                          "accept",
                          revision?.status,
                        )
                      }
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={busy}
                      onClick={() =>
                        moderateQuizRevision(
                          revision.id,
                          "decline",
                          revision?.status,
                        )
                      }
                    >
                      Decline
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          }

          const content = item.review;
          const body = item.review?.comment ?? "";
          const key = `${item.content_type}-${content?.id ?? index}`;

          return (
            <Card key={key}>
              <CardHeader>
                <CardTitle className="text-[13px] flex flex-wrap items-center gap-2 mono-ui">
                  <Badge variant="outline">{item.content_type}</Badge>
                  {content?.user?.name || "Unknown user"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm">{body}</p>
                <label className="block space-y-2">
                  <Label htmlFor={`decline-${content.id}`}>
                    Decline reason (optional)
                  </Label>
                  <Input
                    id={`decline-${content.id}`}
                    value={declineReasons[content.id] || ""}
                    onChange={(event) =>
                      setDeclineReasons((current) => ({
                        ...current,
                        [content.id]: event.target.value,
                      }))
                    }
                    placeholder="Reason shown to the reviewer"
                  />
                </label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    disabled={busy}
                    onClick={() => moderateReview(content.id, true)}
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={busy}
                    onClick={() => moderateReview(content.id, false)}
                  >
                    Decline
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </section>
      {!loading && queue.length === 0 ? (
        <p className="text-sm text-muted-foreground">Queue is empty.</p>
      ) : null}
    </section>
  );
}
