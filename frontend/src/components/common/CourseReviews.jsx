import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

function getRatingStats(reviews) {
  const counts = [0, 0, 0, 0, 0];
  reviews.forEach((review) => {
    const rating = Math.round(Number(review.rating || 0));
    if (rating >= 1 && rating <= 5) {
      counts[rating - 1] += 1;
    }
  });
  const total = reviews.length || 1;
  return [5, 4, 3, 2, 1].map((rating, index) => ({
    rating,
    count: counts[4 - index],
    percent: Math.round((counts[4 - index] / total) * 100),
  }));
}

export function CourseReviews({
  reviews,
  isAuthenticated,
  reviewForm,
  onReviewFormChange,
  onSubmitReview,
  busy,
}) {
  const averageRating =
    reviews.length > 0
      ? reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) /
        reviews.length
      : 0;
  const ratingStats = getRatingStats(reviews);

  return (
    <section className="mt-8">
      <div style={{ marginTop: 32 }}>
        <div className="text-[15px] font-medium" style={{ marginBottom: 18 }}>
          Student Reviews
        </div>

        <div
          style={{
            display: "flex",
            gap: 28,
            alignItems: "flex-start",
            marginBottom: 24,
          }}
        >
          <div style={{ textAlign: "center", width: 150, flexShrink: 0 }}>
            <div
              className="mono-ui"
              style={{
                fontSize: 56,
                fontWeight: 600,
                letterSpacing: "-0.04em",
                color: "var(--primary)",
                lineHeight: 1,
              }}
            >
              {averageRating.toFixed(1)}
            </div>
            <div style={{ color: "#d97706", fontSize: 18, marginTop: 4 }}>
              ★★★★★
            </div>
            <div
              className="mono-ui"
              style={{
                fontSize: 10,
                color: "var(--muted-foreground)",
                marginTop: 3,
              }}
            >
              Course rating
            </div>
          </div>

          <div style={{ flex: 1 }}>
            {ratingStats.map((item) => (
              <div key={item.rating} className="rating-bar-row">
                <span className="label">{item.rating}</span>
                <div className="bar">
                  <div className="fill" style={{ width: `${item.percent}%` }} />
                </div>
                <span className="pct">{item.percent}%</span>
              </div>
            ))}
          </div>
        </div>

        {reviews.length === 0 ? (
          <p className="text-sm text-muted-foreground">No reviews yet.</p>
        ) : null}

        <div>
          {reviews.map((review) => (
            <article key={review.id} className="review-card">
              <div className="review-header">
                <div className="avatar avatar-sm">
                  {(review.user?.name || "TT")
                    .split(" ")
                    .map((part) => part[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 500 }}>
                    {review.user?.name || "Anonymous"}
                  </div>
                  <div className="review-stars">★★★★★</div>
                </div>
                <div
                  style={{
                    marginLeft: "auto",
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    color: "var(--text3)",
                  }}
                >
                  {review.created_at
                    ? new Date(review.created_at).toLocaleDateString(
                        undefined,
                        {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        },
                      )
                    : "recent"}
                </div>
              </div>
              {review.comment ? (
                <p className="review-text">{review.comment}</p>
              ) : null}
            </article>
          ))}
        </div>
      </div>

      {isAuthenticated ? (
        <Card className="glass-panel mt-6">
          <CardHeader>
            <CardTitle className="text-[13px] mono-ui">
              Leave a review
            </CardTitle>
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
