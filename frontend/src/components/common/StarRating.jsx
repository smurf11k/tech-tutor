import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function StarRating({
  value,
  count,
  className,
  showCount = true,
  size = "sm",
}) {
  const rating = Number(value);
  const hasRating = Number.isFinite(rating) && rating > 0;
  const iconSize = size === "lg" ? "size-5" : "size-4";

  if (!hasRating) {
    return showCount ? (
      <p className={cn("text-xs text-muted-foreground", className)}>No ratings yet</p>
    ) : null;
  }

  const rounded = Math.round(rating * 10) / 10;

  return (
    <div
      className={cn("flex flex-wrap items-center gap-1.5", className)}
      aria-label={`Rated ${rounded} out of 5${count ? ` from ${count} reviews` : ""}`}
    >
      <span className="flex items-center gap-0.5 text-amber-400">
        {Array.from({ length: 5 }).map((_, index) => (
          <Star
            key={index}
            className={cn(
              iconSize,
              index < Math.round(rating)
                ? "fill-current"
                : "fill-transparent text-muted-foreground/40",
            )}
          />
        ))}
      </span>
      <span className="text-sm font-medium">{rounded.toFixed(1)}</span>
      {showCount && count > 0 ? (
        <span className="text-xs text-muted-foreground">({count})</span>
      ) : null}
    </div>
  );
}
