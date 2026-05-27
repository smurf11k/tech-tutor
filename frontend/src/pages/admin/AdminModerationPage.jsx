import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingState } from "@/components/common/LoadingState";
import { PageHeader } from "@/components/common/PageHeader";
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

  async function moderateReview(reviewId, isPublished) {
    setBusy(true);
    try {
      await client.patch(`/admin/moderation-queue/reviews/${reviewId}`, {
        is_published: isPublished,
      });
      toast.success(isPublished ? "Review approved." : "Review declined.");
      await loadQueue();
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function moderateComment(commentId, isPublished) {
    setBusy(true);
    try {
      await client.patch(`/admin/moderation-queue/comments/${commentId}`, {
        is_published: isPublished,
      });
      toast.success(isPublished ? "Comment approved." : "Comment declined.");
      await loadQueue();
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function moderatePublishRequest(publishRequestId, action) {
    setBusy(true);
    try {
      await client.patch(
        `/admin/moderation-queue/publish-requests/${publishRequestId}`,
        {
          action,
          declined_reason: declineReasons[publishRequestId] || undefined,
        },
      );
      toast.success(
        action === "accept" ? "Course published." : "Publish request declined.",
      );
      setDeclineReasons((current) => {
        const next = { ...current };
        delete next[publishRequestId];
        return next;
      });
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
        description="Approve or decline reviews, comments, and course publish requests."
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
                    <Badge variant="outline">publish request</Badge>
                    {course?.title || "Unknown course"}
                  </CardTitle>
                </CardHeader>
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
                        moderatePublishRequest(request.id, "accept")
                      }
                    >
                      Approve & publish
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={busy}
                      onClick={() =>
                        moderatePublishRequest(request.id, "decline")
                      }
                    >
                      Decline
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          }

          const content = item.review ?? item.comment;
          const body = item.review?.comment ?? item.comment?.body ?? "";
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
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    disabled={busy}
                    onClick={() =>
                      item.content_type === "review"
                        ? moderateReview(content.id, true)
                        : moderateComment(content.id, true)
                    }
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={busy}
                    onClick={() =>
                      item.content_type === "review"
                        ? moderateReview(content.id, false)
                        : moderateComment(content.id, false)
                    }
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
