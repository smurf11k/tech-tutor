import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StarRating } from "@/components/common/StarRating";
import { formatMoney } from "@/lib/utils";
import { cn } from "@/lib/utils";

function resolveLearningLabel(course) {
  if (course?.is_complete) {
    return "Revisit course";
  }

  return "Continue learning";
}

export function CourseCard({ course, className, href, showProgress = false }) {
  const linkTo = href ?? `/courses/${course.id}`;
  const isLearningLink = href?.includes("/learning/");
  const actionLabel = isLearningLink
    ? resolveLearningLabel(course)
    : "View course";
  const progressPercent = Number(course?.progress_percent ?? 0);

  return (
    <Card
      className={cn(
        "glass-panel group transition-all hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5",
        className,
      )}
    >
      <CardHeader>
        <CardTitle className="text-lg leading-snug">{course.title}</CardTitle>
        <p className="text-sm text-muted-foreground line-clamp-2">
          {course.subtitle || course.description?.slice(0, 120)}
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <StarRating
          value={course.average_rating}
          count={course.published_reviews_count}
        />
        {showProgress ? (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Progress</span>
              <span className="font-medium text-foreground">{progressPercent}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
              />
            </div>
            {course.is_complete ? (
              <Badge variant="secondary" className="text-[10px]">
                Completed
              </Badge>
            ) : null}
          </div>
        ) : null}
        <div className="flex flex-wrap gap-2">
          {course.level ? <Badge variant="outline">{course.level}</Badge> : null}
          {course.category ? (
            <Badge variant="secondary">{course.category}</Badge>
          ) : null}
          {!course.is_published ? (
            <Badge variant="destructive">Draft</Badge>
          ) : null}
        </div>
        <p className="text-sm font-medium text-primary">{formatMoney(course.price)}</p>
        <Button asChild className="w-full group-hover:bg-primary/90">
          <Link to={linkTo}>
            {actionLabel}
            <ArrowRight className="ml-1 size-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
