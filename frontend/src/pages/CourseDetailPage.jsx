import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";

import {
  Check,
  Clock3,
  Star,
  Users,
  ChevronDown,
  ChevronRight,
  Play,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LoadingState } from "@/components/common/LoadingState";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import api from "@/lib/api";
import {
  extractList,
  formatMinutes,
  formatMoney,
  getApiErrorMessage,
  getCourseRouteKey,
  getStripeCurrency,
} from "@/lib/utils";

const MODULES_INITIAL = 4;
const REVIEWS_INITIAL = 5;

// ── Lesson type icon ────────────────────────────────────────────────
function LessonIcon({ isQuiz }) {
  if (isQuiz)
    return (
      <i
        className="ti ti-help-circle"
        style={{ fontSize: 14, color: "#3a3a3a" }}
      />
    );
  return <Play className="size-3 text-[#3a3a3a] flex-shrink-0" />;
}

// ── Single module row ────────────────────────────────────────────────
function ModuleRow({ module, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen);

  const lessons = (module.lessons || [])
    .filter((l) => l.is_published)
    .map((l) => ({ ...l, _isQuiz: false }));
  const quizzes = (module.quizzes || [])
    .filter((q) => q.is_published)
    .map((q) => ({ ...q, _isQuiz: true }));
  const items = [...lessons, ...quizzes].sort(
    (a, b) => (a.position ?? 0) - (b.position ?? 0),
  );
  const moduleMinutes = items.reduce(
    (sum, item) => sum + Number(item.estimated_time_minutes || 0),
    0,
  );

  return (
    <div className="border border-border rounded-[6px] overflow-hidden mb-2">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-[14px] py-[12px] bg-[#0a0a0a] text-left"
      >
        <div>
          <p className="text-[13px] font-medium text-[#d0d0d0]">
            {module.title}
          </p>
          <p className="text-[10px] text-[#3a3a3a] mono-ui mt-0.5">
            {items.length} items
            {moduleMinutes > 0 ? ` · ${formatMinutes(moduleMinutes)}` : ""}
          </p>
        </div>
        {open ? (
          <ChevronDown className="size-3.5 text-[#3a3a3a] flex-shrink-0" />
        ) : (
          <ChevronRight className="size-3.5 text-[#3a3a3a] flex-shrink-0" />
        )}
      </button>

      {open && items.length > 0 && (
        <div>
          {items.map((item, i) => (
            <div
              key={`${item._isQuiz ? "quiz" : "lesson"}-${item.id ?? i}`}
              className="flex items-center gap-2.5 px-[14px] py-[9px] border-t border-border text-[12px] text-[#555] mono-ui"
            >
              <LessonIcon isQuiz={item._isQuiz} />
              <span className="flex-1 truncate">{item.title}</span>
              {item.estimated_time_minutes ? (
                <span className="text-[10px] text-[#3a3a3a] ml-auto pl-3 flex-shrink-0">
                  {formatMinutes(item.estimated_time_minutes)}
                </span>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Curriculum tab ───────────────────────────────────────────────────
function CurriculumTab({ course }) {
  const allModules = course.modules || [];
  // Only show modules that have at least one published lesson or quiz
  const modules = allModules.filter(
    (m) =>
      (m.lessons || []).some((l) => l.is_published) ||
      (m.quizzes || []).some((q) => q.is_published),
  );
  const [showAll, setShowAll] = useState(false);

  const totalItems = modules.reduce(
    (sum, m) =>
      sum +
      (m.lessons || []).filter((l) => l.is_published).length +
      (m.quizzes || []).filter((q) => q.is_published).length,
    0,
  );

  const visible = showAll ? modules : modules.slice(0, MODULES_INITIAL);

  return (
    <div>
      <p className="text-[11px] text-[#555] mono-ui mb-4">
        {modules.length} modules · {totalItems} items total
      </p>

      {visible.map((mod, i) => (
        <ModuleRow key={mod.id ?? i} module={mod} defaultOpen={i === 0} />
      ))}

      {modules.length > MODULES_INITIAL && !showAll && (
        <button
          onClick={() => setShowAll(true)}
          className="text-[11px] text-[#555] mono-ui mt-2 hover:text-[#888] transition-colors"
        >
          + {modules.length - MODULES_INITIAL} more modules
        </button>
      )}
    </div>
  );
}

// ── Instructor tab ───────────────────────────────────────────────────
function InstructorTab({ course }) {
  const name =
    course.instructor_name || course.instructor?.name || "Instructor";
  const bio =
    course.instructor_bio ||
    course.instructor?.bio ||
    "No instructor bio available.";
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="avatar avatar-lg flex-shrink-0 flex items-center justify-center rounded-full bg-[#111] border border-border text-primary mono-ui text-[16px] font-medium w-[48px] h-[48px]">
          {initials}
        </div>
        <div>
          <p className="text-[14px] font-medium text-[#d0d0d0]">{name}</p>
          <p className="text-[11px] text-[#555] mono-ui">
            {course.instructor_title ||
              course.instructor?.title ||
              "Course Instructor"}
          </p>
        </div>
      </div>
      <p className="text-[13px] text-[#555] leading-7 mono-ui">{bio}</p>
    </div>
  );
}

// ── Rating bar ───────────────────────────────────────────────────────
function RatingBar({ star, pct }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="text-[10px] text-[#555] mono-ui w-2 text-right">
        {star}
      </span>
      <div className="flex-1 h-[5px] bg-border rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[10px] text-[#3a3a3a] mono-ui w-7">{pct}%</span>
    </div>
  );
}

// ── Reviews tab ──────────────────────────────────────────────────────
function ReviewsTab({
  reviews,
  course,
  isAuthenticated,
  reviewForm,
  onReviewFormChange,
  onSubmitReview,
  busy,
}) {
  const [showAll, setShowAll] = useState(false);
  const averageRating = Number(course.average_rating || 0);
  const ratingLabel = Number.isFinite(averageRating)
    ? averageRating.toFixed(1)
    : "0.0";

  const visible = showAll ? reviews : reviews.slice(0, REVIEWS_INITIAL);

  return (
    <div className="space-y-6">
      {/* Rating summary */}
      <div className="flex gap-7 items-start">
        <div className="text-center flex-shrink-0">
          <p className="text-[52px] font-semibold tracking-[-0.04em] text-primary leading-none">
            {ratingLabel}
          </p>
          <p className="text-[#d97706] text-[16px] mt-1">★★★★★</p>
          <p className="text-[10px] text-[#3a3a3a] mono-ui mt-1">
            Course rating
          </p>
        </div>
        <div className="flex-1 space-y-1 pt-1">
          {[5, 4, 3, 2, 1].map((star) => {
            const count = reviews.filter(
              (r) => Math.round(r.rating) === star,
            ).length;
            const pct = reviews.length
              ? Math.round((count / reviews.length) * 100)
              : 0;
            return <RatingBar key={star} star={star} pct={pct} />;
          })}
        </div>
      </div>

      {/* Review list */}
      <div>
        {visible.map((r, i) => {
          const displayName =
            r.user_name ||
            r.reviewer_name ||
            r.username ||
            r.user?.name ||
            r.user?.username ||
            null;
          const initials = displayName
            ? displayName
                .split(" ")
                .map((w) => w[0])
                .join("")
                .toUpperCase()
                .slice(0, 2)
            : "?";
          return (
            <div
              key={r.id ?? i}
              className="py-4 border-b border-border last:border-0"
            >
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-[26px] h-[26px] rounded-full border border-border bg-[#111] flex items-center justify-center text-[9px] text-primary mono-ui flex-shrink-0">
                  {initials}
                </div>
                <div className="flex-1">
                  <p className="text-[12px] font-medium text-[#aaa]">
                    {displayName ?? "anonymous"}
                  </p>
                  <p className="text-[#d97706] text-[11px]">
                    {"★".repeat(Math.round(r.rating || 5))}
                  </p>
                </div>
                {r.created_at && (
                  <p className="text-[10px] text-[#3a3a3a] mono-ui flex-shrink-0">
                    {new Date(r.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                )}
              </div>
              <p className="text-[13px] text-[#555] leading-7">{r.comment}</p>
            </div>
          );
        })}

        {reviews.length === 0 && (
          <p className="text-[12px] text-[#3a3a3a] mono-ui">No reviews yet.</p>
        )}

        {reviews.length > REVIEWS_INITIAL && !showAll && (
          <button
            onClick={() => setShowAll(true)}
            className="text-[11px] text-[#555] mono-ui mt-2 hover:text-[#888] transition-colors"
          >
            show {reviews.length - REVIEWS_INITIAL} more reviews
          </button>
        )}
      </div>

      {/* Submit review */}
      {isAuthenticated && (
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle className="text-[13px] mono-ui">
              Leave a review
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <label className="block space-y-2">
                <Label>Your rating</Label>
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() =>
                        onReviewFormChange({ ...reviewForm, rating: star })
                      }
                      className={`text-[22px] leading-none px-0.5 transition-colors ${
                        star <= reviewForm.rating
                          ? "text-[#d97706]"
                          : "text-[#2a2a2a]"
                      }`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </label>
              <label className="block space-y-2">
                <Label>Comment</Label>
                <Textarea
                  rows={5}
                  placeholder="Share your experience with this course..."
                  value={reviewForm.comment}
                  onChange={(e) =>
                    onReviewFormChange({
                      ...reviewForm,
                      comment: e.target.value,
                    })
                  }
                />
              </label>
              <Button
                onClick={(e) => onSubmitReview(e)}
                disabled={busy || !reviewForm.comment.trim()}
              >
                {busy ? "Submitting..." : "Submit review"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────
export default function CourseDetailPage() {
  const { courseId } = useParams();
  const { token, user, isAuthenticated, isInstructor, isAdmin, client } =
    useAuth();
  const currency = getStripeCurrency();
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
  const [activeTab, setActiveTab] = useState("curriculum");

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
        (p) => String(p.course_id) === String(courseId),
      );
      const paid = coursePayments.find((p) => p.status === "paid");
      const pending = coursePayments.find((p) => p.status === "pending");
      setCoursePaymentStatus(paid ? "paid" : pending ? "pending" : null);
    } catch (err) {
      const msg = getApiErrorMessage(err, "Failed to load course.");
      setError(msg);
      toast.error(msg);
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
          success_url: `${origin}/payment/success?course_id=${course.id}`,
          cancel_url: `${origin}/payment/cancel?course_id=${course.id}`,
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

  if (loading) return <LoadingState label="Loading course..." />;
  if (!course) return null;

  const isEnrolled = Boolean(course.is_enrolled);
  const isPaidCourse = Number(course.price) > 0;
  const needsPurchase = isPaidCourse && coursePaymentStatus !== "paid";
  const averageRating = Number(course.average_rating || 0);
  const ratingLabel = Number.isFinite(averageRating)
    ? averageRating.toFixed(1)
    : "0.0";
  const enrolledUsersCount = course.enrollments_count ?? course.students_count;

  const tabs = [
    { id: "curriculum", label: "Curriculum" },
    { id: "instructor", label: "Instructor" },
    { id: "reviews", label: `Reviews (${reviews.length})` },
  ];

  return (
    <section className="space-y-0">
      {/* ── Hero ── */}
      <div className="home-shell border-b border-border bg-card/80 py-9">
        <div className="grid gap-10 lg:grid-cols-[1fr_320px]">
          <div>
            <p className="mb-3 text-[10px] text-[#3a3a3a] mono-ui">
              courses /{" "}
              <span className="text-muted-foreground">
                {String(course.category || "course").toLowerCase()}
              </span>
            </p>
            <h1 className="text-[28px] font-semibold leading-[1.2] tracking-[-0.03em]">
              {course.title}
            </h1>
            <p className="mt-2 max-w-[560px] text-[13px] leading-7 text-muted-foreground">
              {course.subtitle || course.description}
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground mono-ui">
              <Badge>{course.level || "BEGINNER"}</Badge>
              <span className="inline-flex items-center gap-1">
                <Star className="size-3 text-[#d97706]" />
                <strong className="text-foreground">{ratingLabel}</strong>
                <span className="text-[#3a3a3a]">
                  ({course.published_reviews_count || 0} reviews)
                </span>
              </span>
              <span className="inline-flex items-center gap-1">
                <Users className="size-3" />
                {enrolledUsersCount ?? "—"} students
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock3 className="size-3" />
                {course.duration ||
                  formatMinutes(course.total_estimated_minutes) ||
                  "—"}
              </span>
            </div>

            {course.tags?.length ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {course.tags.map((tag) => (
                  <Badge key={tag.id || tag.slug || tag.name} variant="outline">
                    {tag.name || tag.slug}
                  </Badge>
                ))}
              </div>
            ) : null}

            {/* Instructor row */}
            {(course.instructor_name || course.instructor?.name) && (
              <div className="mt-4 flex items-center gap-2 text-[12px] text-[#555]">
                <div className="w-[24px] h-[24px] rounded-full border border-border bg-[#111] flex items-center justify-center text-[9px] text-primary mono-ui flex-shrink-0">
                  {(course.instructor_name || course.instructor?.name)
                    .split(" ")
                    .map((w) => w[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2)}
                </div>
                <span>
                  Created by{" "}
                  <span className="text-primary">
                    {course.instructor_name || course.instructor?.name}
                  </span>
                </span>
              </div>
            )}
          </div>

          {/* Price card */}
          <Card className="sticky top-[68px] h-fit">
            <CardContent className="space-y-3 pt-5">
              <div className="flex items-baseline gap-2">
                <p className="text-[28px] font-semibold tracking-[-0.03em]">
                  {formatMoney(course.price, currency)}
                </p>
              </div>

              {isAuthenticated ? (
                isEnrolled ? (
                  <Button asChild className="w-full">
                    <Link to={`/learning/${getCourseRouteKey(course)}`}>
                      {course.is_complete
                        ? "revisit_course"
                        : "continue_learning"}
                    </Link>
                  </Button>
                ) : (
                  <Button
                    onClick={
                      needsPurchase ? handleStripeCheckout : handleEnroll
                    }
                    disabled={busy}
                    className="w-full"
                  >
                    {needsPurchase ? "buy_with_stripe" : "enroll_now"}
                  </Button>
                )
              ) : (
                <Button asChild className="w-full">
                  <Link
                    to="/login"
                    state={{ from: { pathname: `/courses/${courseId}` } }}
                  >
                    log_in_to_enroll
                  </Link>
                </Button>
              )}

              <div className="border-t border-border pt-3 text-xs text-muted-foreground mono-ui space-y-1">
                {(course.price_benefits?.length
                  ? course.price_benefits
                  : [
                      "Full lifetime access",
                      "Access on all devices",
                      "Certificate of completion",
                    ]
                ).map((item) => (
                  <p key={item} className="inline-flex items-center gap-1">
                    <Check className="size-3 text-primary" /> {item}
                  </p>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="home-shell grid gap-10 py-8 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          {message && (
            <p className="text-sm text-muted-foreground">{message}</p>
          )}

          {/* What you'll learn */}
          <Card>
            <CardContent className="pt-5">
              <h2 className="mb-3 text-[15px] font-medium">
                What you'll learn
              </h2>
              <div className="grid gap-2 text-xs text-muted-foreground md:grid-cols-2">
                {(course.what_you_will_learn?.length
                  ? course.what_you_will_learn
                  : [
                      "Core syntax, scope and closures",
                      "Async/await and API data flows",
                      "DOM manipulation and events",
                      "OOP with classes and patterns",
                      "Build deployable projects",
                      "Testing fundamentals",
                    ]
                ).map((item) => (
                  <p key={item} className="inline-flex items-start gap-2">
                    <Check className="mt-0.5 size-3.5 text-primary" />
                    {item}
                  </p>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Tabs */}
          <div className="border-b border-border flex gap-0">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={[
                  "font-mono text-[12px] px-4 py-2.5 border-b-2 -mb-px transition-colors",
                  activeTab === tab.id
                    ? "text-primary border-primary"
                    : "text-[#3a3a3a] border-transparent hover:text-[#888]",
                ].join(" ")}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab panels */}
          {activeTab === "curriculum" && <CurriculumTab course={course} />}
          {activeTab === "instructor" && <InstructorTab course={course} />}
          {activeTab === "reviews" && (
            <ReviewsTab
              reviews={reviews}
              course={course}
              isAuthenticated={isAuthenticated}
              reviewForm={reviewForm}
              onReviewFormChange={setReviewForm}
              onSubmitReview={handleSubmitReview}
              busy={busy}
            />
          )}
        </div>

        <div />
      </div>
    </section>
  );
}
