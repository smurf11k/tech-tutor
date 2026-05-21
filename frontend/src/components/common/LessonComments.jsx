import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ErrorAlert } from "@/components/common/ErrorAlert";
import { useAuth } from "@/contexts/AuthContext";
import { getApiErrorMessage } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

export function LessonComments({
  lesson,
  client,
  isAuthenticated,
  course,
  user,
}) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newCommentBody, setNewCommentBody] = useState("");
  const [replyingTo, setReplyingTo] = useState(null);
  const [submitLoading, setSubmitLoading] = useState(false);

  const isInstructor =
    user && (user.role === "admin" || user.id === course?.instructor_id);
  const isAdmin = user?.role === "admin";
  const canModerate = isInstructor || isAdmin;

  useEffect(() => {
    if (!lesson?.id) return;

    setReplyingTo(null);
    setNewCommentBody("");
    setComments([]); // Clear immediately
    setLoading(true);
    setError(""); // Clear error

    // Create an abort controller for this request
    const controller = new AbortController();

    const loadComments = async () => {
      const currentLessonId = lesson.id;

      try {
        const response = await client.get(`/lessons/${lesson.id}/comments`, {
          signal: controller.signal,
        });
        // Only set comments if:
        // 1. Request wasn't aborted
        // 2. We're still looking at the same lesson
        if (!controller.signal.aborted && currentLessonId === lesson.id) {
          setComments(response.data);
        }
      } catch (err) {
        // Don't set error if request was aborted or cancelled
        if (
          controller.signal.aborted ||
          err.name === "AbortError" ||
          err.code === "ECONNABORTED" ||
          err.message === "canceled"
        ) {
          return;
        }
        // Only show error if we're still on this lesson
        if (currentLessonId === lesson.id) {
          setError(getApiErrorMessage(err));
        }
      } finally {
        setLoading(false);
      }
    };

    loadComments();

    // Cleanup: abort pending request if lesson changes before it completes
    return () => controller.abort();
  }, [lesson?.id, client]);

  async function handleSubmitComment() {
    if (!newCommentBody.trim()) return;

    setSubmitLoading(true);
    setError("");
    try {
      const payload = {
        body: newCommentBody,
      };

      if (replyingTo) {
        payload.parent_comment_id = replyingTo;
      }

      const response = await client.post(
        `/lessons/${lesson.id}/comments`,
        payload,
      );

      if (replyingTo) {
        // Add reply to parent comment
        setComments(
          comments.map((c) => {
            if (c.id === replyingTo) {
              return {
                ...c,
                replies: [...(c.replies || []), response.data],
              };
            }
            return c;
          }),
        );
      } else {
        // Add top-level comment
        setComments([response.data, ...comments]);
      }

      setNewCommentBody("");
      setReplyingTo(null);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSubmitLoading(false);
    }
  }

  async function handleDeleteComment(commentId, parentId = null) {
    if (!window.confirm("Are you sure you want to delete this comment?"))
      return;

    try {
      await client.delete(`/lessons/${lesson.id}/comments/${commentId}`);

      if (parentId) {
        // Remove reply from parent
        setComments(
          comments.map((c) => {
            if (c.id === parentId) {
              return {
                ...c,
                replies: c.replies.filter((r) => r.id !== commentId),
              };
            }
            return c;
          }),
        );
      } else {
        // Remove top-level comment
        setComments(comments.filter((c) => c.id !== commentId));
      }
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }

  if (!isAuthenticated) {
    return (
      <Card className="glass-panel">
        <CardHeader>
          <CardTitle>Comments</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Sign in to view and post comments.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-panel">
      <CardHeader>
        <CardTitle>Comments</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <ErrorAlert message={error} />

        {/* Comments list */}
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading comments...</p>
        ) : comments.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No comments yet. Be the first to share your thoughts!
          </p>
        ) : (
          <div className="space-y-4">
            {comments.map((comment) => (
              <CommentThread
                key={comment.id}
                comment={comment}
                user={user}
                onReply={setReplyingTo}
                onDelete={handleDeleteComment}
                canModerate={canModerate}
              />
            ))}
          </div>
        )}

        {/* Comment form */}
        <div className="space-y-3 rounded-lg border border-border/60 bg-muted/30 p-4">
          <p className="text-sm font-medium">
            {replyingTo ? "Reply to comment" : "Add a comment"}
          </p>
          <Textarea
            placeholder="Share your thoughts..."
            value={newCommentBody}
            onChange={(e) => setNewCommentBody(e.target.value)}
            className="min-h-24"
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleSubmitComment}
              disabled={!newCommentBody.trim() || submitLoading}
            >
              {submitLoading ? "Posting..." : "Post comment"}
            </Button>
            {replyingTo && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setReplyingTo(null)}
              >
                Cancel
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CommentThread({ comment, user, onReply, onDelete, canModerate }) {
  return (
    <div className="space-y-3">
      <CommentItem
        comment={comment}
        user={user}
        onReply={onReply}
        onDelete={onDelete}
        canModerate={canModerate}
      />

      {/* Nested replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="ml-6 space-y-3 border-l-2 border-border/60 pl-4">
          {comment.replies.map((reply) => (
            <NestedCommentThread
              key={reply.id}
              comment={reply}
              parentId={comment.id}
              user={user}
              onDelete={onDelete}
              canModerate={canModerate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function NestedCommentThread({
  comment,
  parentId,
  user,
  onDelete,
  canModerate,
}) {
  return (
    <div className="space-y-3">
      <CommentItem
        comment={comment}
        user={user}
        onDelete={() => onDelete(comment.id, parentId)}
        canModerate={canModerate}
        isNested
      />

      {/* Deep nested replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="ml-6 space-y-3 border-l-2 border-border/60 pl-4">
          {comment.replies.map((reply) => (
            <NestedCommentThread
              key={reply.id}
              comment={reply}
              parentId={comment.id}
              user={user}
              onDelete={onDelete}
              canModerate={canModerate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CommentItem({
  comment,
  user,
  onReply,
  onDelete,
  canModerate = false,
  isNested = false,
}) {
  const isOwner = user?.id === comment.user.id;
  const canDelete = isOwner || user?.role === "admin" || canModerate;

  return (
    <div className="rounded-lg border border-border/60 bg-card/50 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <p className="font-medium text-sm">{comment.user.name}</p>
          {comment.user.role_badge && (
            <Badge variant="secondary" className="text-xs">
              {comment.user.role_badge}
            </Badge>
          )}
          {!comment.is_published && (
            <Badge
              variant="outline"
              className="text-xs bg-yellow-50/50 text-yellow-700"
            >
              Pending
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {formatDate(comment.created_at)}
        </p>
      </div>

      <p className="text-sm text-foreground/90 mb-3">{comment.body}</p>

      <div className="flex gap-2 flex-wrap">
        {!isNested && onReply && (
          <button
            onClick={() => onReply(comment.id)}
            className="text-xs text-primary hover:underline"
          >
            Reply
          </button>
        )}
        {canDelete && (
          <button
            onClick={() => onDelete(comment.id)}
            className="text-xs text-destructive hover:underline"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}

function formatDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}
