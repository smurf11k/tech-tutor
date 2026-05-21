import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StarRating } from "@/components/common/StarRating";

export function CourseReviews({
  reviews,
  isAuthenticated,
  reviewForm,
  onReviewFormChange,
  onSubmitReview,
  busy,
}) {
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">Reviews</h2>
      {reviews.length === 0 ? (
        <p className="text-sm text-muted-foreground">No reviews yet.</p>
      ) : null}
      {reviews.map((review) => (
        <Card key={review.id}>
          <CardContent className="space-y-2 pt-6">
            <StarRating value={review.rating} showCount={false} />
            {review.user?.name ? (
              <p className="text-xs text-muted-foreground">{review.user.name}</p>
            ) : null}
            {review.comment ? (
              <p className="text-sm">{review.comment}</p>
            ) : null}
          </CardContent>
        </Card>
      ))}
      {isAuthenticated ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Leave a review</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-3" onSubmit={onSubmitReview}>
              <label className="block space-y-2">
                <Label htmlFor="rating">Rating</Label>
                <Input
                  id="rating"
                  type="number"
                  min={1}
                  max={5}
                  value={reviewForm.rating}
                  onChange={(event) =>
                    onReviewFormChange({
                      ...reviewForm,
                      rating: Number(event.target.value),
                    })
                  }
                />
              </label>
              <label className="block space-y-2">
                <Label htmlFor="comment">Comment</Label>
                <Textarea
                  id="comment"
                  value={reviewForm.comment}
                  onChange={(event) =>
                    onReviewFormChange({
                      ...reviewForm,
                      comment: event.target.value,
                    })
                  }
                />
              </label>
              <Button type="submit" disabled={busy}>
                Submit review
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : (
        <Card className="glass-panel">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-6">
            <p className="text-sm text-muted-foreground">
              Log in to share your experience with this course.
            </p>
            <Button asChild size="sm" variant="outline">
              <Link to="/login">Log in to review</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </section>
  );
}
