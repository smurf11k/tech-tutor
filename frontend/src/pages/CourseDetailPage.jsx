import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CourseCurriculumTree } from "@/components/instructor/CourseCurriculumTree";
import { CourseReviews } from "@/components/common/CourseReviews";
import { LoadingState } from "@/components/common/LoadingState";
import { PageHeader } from "@/components/common/PageHeader";
import { StarRating } from "@/components/common/StarRating";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import api from "@/lib/api";
import { extractList, formatMoney, getApiErrorMessage } from "@/lib/utils";

export default function CourseDetailPage() {
  const { courseId } = useParams();
  const { token, user, isAuthenticated, isInstructor, isAdmin, client } =
    useAuth();
  const catalogClient = useMemo(() => (token ? client : api), [client, token]);

  const [course, setCourse] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [coursePaymentStatus, setCoursePaymentStatus] = useState(null);

  async function loadCourse() {
    setLoading(true);
    setError("");
    try {
      const paymentRequest = isAuthenticated
        ? client.get("/payments").catch(() => ({ data: [] }))
        : Promise.resolve({ data: [] });

      const [courseResponse, reviewsResponse, paymentsResponse] =
        await Promise.all([
          catalogClient.get(`/courses/${courseId}`),
          catalogClient.get(`/courses/${courseId}/reviews`),
          paymentRequest,
        ]);
      setCourse(courseResponse.data);
      setReviews(extractList(reviewsResponse.data));

      const coursePayments = extractList(paymentsResponse.data).filter(
        (payment) => String(payment.course_id) === String(courseId),
      );
      const paid = coursePayments.find((payment) => payment.status === "paid");
      const pending = coursePayments.find(
        (payment) => payment.status === "pending",
      );
      setCoursePaymentStatus(paid ? "paid" : pending ? "pending" : null);
    } catch (err) {
      const message = getApiErrorMessage(err, "Failed to load course.");
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCourse();
  }, [courseId, catalogClient, isAuthenticated, client]);

  async function handleEnroll() {
    if (!isAuthenticated) {
      toast.error("Log in to enroll.");
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await client.post(`/courses/${courseId}/enrollments`);
      setMessage("Enrolled successfully.");
      toast.success("Enrolled successfully.");
      await loadCourse();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Enrollment failed."));
    } finally {
      setBusy(false);
    }
  }

  async function handleStripeCheckout() {
    setBusy(true);
    setError("");
    try {
      const origin = window.location.origin;
      const response = await client.post(
        `/courses/${courseId}/payments/stripe-checkout`,
        {
          success_url: `${origin}/payment/success?course_id=${courseId}`,
          cancel_url: `${origin}/payment/cancel?course_id=${courseId}`,
        },
      );

      const checkoutUrl = response.data?.checkout?.url;

      if (checkoutUrl) {
        window.location.href = checkoutUrl;
        return;
      }

      toast.error(
        response.data?.message ||
          "Stripe checkout URL was not returned. Check STRIPE_SECRET_KEY in backend .env.",
      );
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Checkout failed."));
    } finally {
      setBusy(false);
    }
  }

  async function handleSubmitReview(event) {
    event.preventDefault();
    setBusy(true);
    try {
      await client.post(`/courses/${courseId}/reviews`, reviewForm);
      setReviewForm({ rating: 5, comment: "" });
      setMessage("Review submitted for moderation.");
      toast.success("Review submitted for moderation.");
      const reviewsResponse = await client.get(`/courses/${courseId}/reviews`);
      setReviews(extractList(reviewsResponse.data));
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Could not submit review."));
    } finally {
      setBusy(false);
    }
  }

  async function handleRequestCertificate() {
    setBusy(true);
    try {
      await client.post(`/courses/${courseId}/certificate`);
      setMessage("Certificate issued or already available.");
      toast.success("Certificate issued or already available.");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Certificate request failed."));
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <LoadingState label="Loading course..." />;
  }

  if (!course) {
    return null;
  }

  const canManage =
    isAdmin || (isInstructor && course.instructor_id === user?.id);
  const isEnrolled = Boolean(course.is_enrolled);
  const isPaidCourse = Number(course.price) > 0;
  const needsPurchase = isPaidCourse && coursePaymentStatus !== "paid";

  return (
    <section className="space-y-8">
      <PageHeader
        title={course.title}
        description={course.subtitle || course.description}
        actions={
          <>
            {canManage ? (
              <Button variant="outline" asChild>
                <Link to={`/instructor/courses/${course.id}`}>
                  Manage course
                </Link>
              </Button>
            ) : null}
            {isAuthenticated ? (
              <>
                {isEnrolled ? (
                  <>
                    <Button asChild>
                      <Link to={`/learning/${course.id}`}>
                        {course.is_complete
                          ? "Revisit course"
                          : "Continue learning"}
                      </Link>
                    </Button>
                    <Badge variant="secondary">Enrolled</Badge>
                    {typeof course.progress_percent === "number" ? (
                      <Badge variant="outline">
                        {course.progress_percent}% complete
                      </Badge>
                    ) : null}
                    {course.is_complete ? (
                      <Badge variant="secondary">Completed</Badge>
                    ) : null}
                    <Button
                      variant="outline"
                      onClick={handleRequestCertificate}
                      disabled={busy}
                    >
                      Request certificate
                    </Button>
                  </>
                ) : null}
                {!canManage && !isEnrolled ? (
                  <Button
                    onClick={handleEnroll}
                    disabled={busy || needsPurchase}
                  >
                    Enroll
                  </Button>
                ) : null}
                {!canManage && needsPurchase && !isEnrolled ? (
                  <Button
                    variant="secondary"
                    onClick={handleStripeCheckout}
                    disabled={busy || coursePaymentStatus === "pending"}
                  >
                    {coursePaymentStatus === "pending"
                      ? "Checkout in progress"
                      : "Buy with Stripe"}
                  </Button>
                ) : null}
                {!canManage && coursePaymentStatus === "paid" ? (
                  <Badge variant="secondary">Paid</Badge>
                ) : null}
              </>
            ) : (
              <Button asChild>
                <Link
                  to="/login"
                  state={{ from: { pathname: `/courses/${courseId}` } }}
                >
                  Log in to enroll
                </Link>
              </Button>
            )}
          </>
        }
      />
      {message ? (
        <p className="text-sm text-muted-foreground">{message}</p>
      ) : null}

      <Card className="glass-panel">
        <CardContent className="space-y-4 pt-6">
          <StarRating
            value={course.average_rating}
            count={course.published_reviews_count}
            size="lg"
          />
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{course.level || "level n/a"}</Badge>
            <Badge variant="secondary">
              {course.category || "uncategorized"}
            </Badge>
            <Badge>{formatMoney(course.price)}</Badge>
            {!course.is_published ? (
              <Badge variant="destructive">Draft</Badge>
            ) : null}
          </div>
          {course.description ? (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {course.description}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <CourseCurriculumTree course={course} />

      <CourseReviews
        reviews={reviews}
        isAuthenticated={isAuthenticated}
        reviewForm={reviewForm}
        onReviewFormChange={setReviewForm}
        onSubmitReview={handleSubmitReview}
        busy={busy}
      />
    </section>
  );
}
