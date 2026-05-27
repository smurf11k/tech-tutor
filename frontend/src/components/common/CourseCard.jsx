import { Link } from "react-router-dom";
import { ArrowRight, Clock3, Star, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  cn,
  formatMoney,
  getCourseRouteKey,
  getStripeCurrency,
} from "@/lib/utils";

function toCompactCount(value) {
  const count = Number(value || 0);

  if (!Number.isFinite(count) || count <= 0) {
    return "0";
  }

  if (count >= 1000) {
    return `${(count / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  }

  return String(count);
}

function resolveBadgeTone(badge) {
  const key = String(badge || "").toLowerCase();

  if (key.includes("new")) return "violet";
  if (key.includes("hot") || key.includes("trend")) return "rose";
  return "amber";
}

function badgeClass(tone) {
  if (tone === "violet") {
    return "border-[#2a1a4a] bg-[#0f0a1a] text-[#8b5cf6]";
  }

  if (tone === "rose") {
    return "border-[#3a0015] bg-[#1a0008] text-[#f43f5e]";
  }

  return "border-[#3a2000] bg-[#1a0f00] text-[#d97706]";
}

function resolveLearningLabel(course) {
  return course?.is_complete ? "Revisit course" : "Continue learning";
}

function normalizeTags(course) {
  return Array.isArray(course?.tags)
    ? course.tags
        .map((tag) => String(tag?.name || tag?.slug || tag || "").trim())
        .filter(Boolean)
    : [];
}

export function CourseCard({
  course,
  className,
  href,
  actionLabel,
  showPrice = true,
  showProgress = false,
  progressPercent,
  badge,
  badgeTone,
  level,
  author,
  authorTag,
  duration,
  learners,
  rating,
  tags,
  price,
}) {
  const linkTo = href ?? `/courses/${getCourseRouteKey(course)}`;
  const isLearningLink = linkTo.includes("/learning/");
  const resolvedActionLabel =
    actionLabel ||
    (isLearningLink ? resolveLearningLabel(course) : "view_course");
  const resolvedProgressPercent = Number(
    progressPercent ?? course?.progress_percent ?? 0,
  );
  const shouldShowProgress = showProgress || isLearningLink;
  const resolvedBadge =
    badge || course?.badge || (course?.is_published ? "COURSE" : "DRAFT");
  const resolvedBadgeTone =
    badgeTone ||
    (course?.is_published ? undefined : "rose") ||
    resolveBadgeTone(resolvedBadge);
  const resolvedLevel = level || course?.level || "BEGINNER";
  const resolvedAuthor =
    author ||
    course?.instructor_name ||
    course?.instructor?.name ||
    course?.author ||
    "TechTutor";
  const resolvedAuthorTag =
    authorTag ||
    course?.authorTag ||
    course?.instructor_initials ||
    (course?.instructor_name || course?.instructor?.name || "TT")
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  const resolvedDuration =
    duration || course?.duration || course?.total_duration || "--";
  const resolvedLearners =
    learners ||
    toCompactCount(course?.enrollments_count ?? course?.students_count);
  const resolvedRating = Number(
    rating ??
      (Number.isFinite(Number(course?.rating))
        ? Number(course.rating)
        : Number(course?.average_rating ?? 0)),
  );
  const ratingLabel = Number.isFinite(resolvedRating)
    ? resolvedRating.toFixed(1)
    : "0.0";
  const resolvedTags = tags || normalizeTags(course);
  const resolvedPrice = price ?? course?.price;
  const currency = getStripeCurrency();

  return (
    <article
      className={cn(
        "flex flex-col gap-2.5 bg-background p-[18px] transition-colors hover:bg-[#111] border border-border rounded-lg",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className={cn(
            "inline-flex rounded-[3px] border px-1.5 py-0.5 text-[10px] mono-ui tracking-[0.04em]",
            badgeClass(resolvedBadgeTone),
          )}
        >
          {resolvedBadge || "COURSE"}
        </span>
        <span className="inline-flex rounded-[3px] border border-[#222] bg-[#111] px-1.5 py-0.5 text-[10px] text-[#555] mono-ui">
          {String(resolvedLevel || "BEGINNER").toUpperCase()}
        </span>
      </div>

      <h3 className="text-[13px] font-medium leading-5 text-[#d0d0d0]">
        {course?.title}
      </h3>

      <div className="flex items-center gap-2 text-[11px] text-[#555] mono-ui">
        <span className="flex size-5 items-center justify-center rounded-full border border-border bg-[#1a1a1a] text-[8px] text-primary">
          {resolvedAuthorTag || "TT"}
        </span>
        {resolvedAuthor}
      </div>

      <div className="flex gap-2.5 text-[11px] text-[#3a3a3a] mono-ui">
        <span className="inline-flex items-center gap-1">
          <Clock3 className="size-3" />
          {resolvedDuration}
        </span>
        <span className="inline-flex items-center gap-1">
          <Users className="size-3" />
          {resolvedLearners}
        </span>
        <span className="inline-flex items-center gap-1">
          <Star className="size-3 text-[#d97706]" />
          {ratingLabel}
        </span>
      </div>

      {shouldShowProgress ? (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[10px] text-[#666] mono-ui">
            <span>progress</span>
            <span className="text-[#aaa]">
              {Math.max(0, Math.min(100, resolvedProgressPercent))}%
            </span>
          </div>
          <div className="h-[4px] overflow-hidden rounded-[2px] bg-border">
            <div
              className="h-full rounded-[2px] bg-primary"
              style={{
                width: `${Math.max(0, Math.min(100, resolvedProgressPercent))}%`,
              }}
            />
          </div>
        </div>
      ) : null}

      {resolvedTags.length ? (
        <div className="flex flex-wrap gap-1">
          {resolvedTags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="rounded-[3px] border border-border bg-[#111] px-1.5 py-0.5 text-[10px] text-[#444] mono-ui"
            >
              {tag}
            </span>
          ))}
        </div>
      ) : null}

      {showPrice ? (
        <p className="text-xs font-medium text-primary mono-ui">
          {formatMoney(resolvedPrice, currency)}
        </p>
      ) : null}

      <div className="border-t border-border pt-2.5">
        <Button
          asChild
          variant="outline"
          className="h-[30px] w-full text-[11px] mono-ui"
        >
          <Link to={linkTo}>
            {resolvedActionLabel}
            <ArrowRight className="size-3.5" />
          </Link>
        </Button>
      </div>
    </article>
  );
}
