import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

function buildSparklinePath(values, width, height, padding) {
  if (!values.length) {
    return { line: "", area: "" };
  }

  const numericValues = values.map((value) => Number(value || 0));
  const maxValue = Math.max(1, ...numericValues);
  const step =
    values.length > 1 ? (width - padding * 2) / (values.length - 1) : 0;
  const points = numericValues.map((value, index) => {
    const x = padding + step * index;
    const normalized = value / maxValue;
    const y = height - padding - normalized * (height - padding * 2);
    return { x, y };
  });

  const line = points.map((point) => `${point.x},${point.y}`).join(" ");
  const area = [
    `${points[0].x},${height - padding}`,
    ...points.map((point) => `${point.x},${point.y}`),
    `${points[points.length - 1].x},${height - padding}`,
  ].join(" ");

  return { line, area };
}

export function DashboardPanel({
  title,
  subtitle,
  right,
  className,
  children,
}) {
  return (
    <Card
      className={cn(
        "overflow-hidden border-border bg-card/80 shadow-none",
        className,
      )}
    >
      <CardContent className="p-0">
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div>
            <p className="text-[13px] font-medium tracking-[-0.01em] text-foreground">
              {title}
            </p>
            {subtitle ? (
              <p className="mt-1 text-[10px] mono-ui uppercase tracking-[0.08em] text-muted-foreground">
                {subtitle}
              </p>
            ) : null}
          </div>
          {right ? <div className="shrink-0">{right}</div> : null}
        </div>
        <div className="p-5">{children}</div>
      </CardContent>
    </Card>
  );
}

export function MetricBars({
  rows,
  labelKey = "label",
  valueKey = "value",
  metaKey = "meta",
  valueFormatter = (value) => value,
  barClassName = "bg-primary",
  className,
}) {
  const maxValue = Math.max(
    1,
    ...rows.map((row) => Number(row[valueKey] || 0)),
  );

  return (
    <div className={cn("space-y-3", className)}>
      {rows.map((row, index) => {
        const value = Number(row[valueKey] || 0);
        const width = Math.max(8, Math.round((value / maxValue) * 100));

        return (
          <div
            key={row.id || row[labelKey] || index}
            className="border-b border-border pb-3 last:border-b-0 last:pb-0"
          >
            <div className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-[4px] border border-border bg-[#111] text-[10px] mono-ui text-muted-foreground">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <p className="truncate text-xs font-medium text-foreground">
                    {row[labelKey]}
                  </p>
                  <span className="whitespace-nowrap text-[11px] mono-ui text-primary">
                    {valueFormatter(value, row)}
                  </span>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-border">
                  <div
                    className={cn("h-full rounded-full", barClassName)}
                    style={{ width: `${width}%` }}
                  />
                </div>
                {row[metaKey] ? (
                  <p className="mt-1 text-[10px] mono-ui text-muted-foreground">
                    {row[metaKey]}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function SparklineChart({
  values,
  labels,
  color = "#00e574",
  height = 120,
  className,
}) {
  const width = 320;
  const padding = 14;
  const { line, area } = buildSparklinePath(values, width, height, padding);
  const numericValues = values.map((value) => Number(value || 0));
  const maxValue = Math.max(1, ...numericValues);
  const minValue = numericValues.length ? Math.min(...numericValues) : 0;

  return (
    <div className={cn("space-y-3", className)}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-[120px] w-full overflow-visible"
      >
        {[0.25, 0.5, 0.75].map((lineY) => (
          <line
            key={lineY}
            x1={padding}
            x2={width - padding}
            y1={(height - padding * 2) * lineY + padding}
            y2={(height - padding * 2) * lineY + padding}
            stroke="#1e1e1e"
            strokeDasharray="3 4"
            strokeWidth="1"
          />
        ))}
        {area ? <polygon points={area} fill={`${color}12`} /> : null}
        {line ? (
          <polyline
            points={line}
            fill="none"
            stroke={color}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null}
        {numericValues.map((value, index) => {
          const step =
            values.length > 1 ? (width - padding * 2) / (values.length - 1) : 0;
          const x = padding + step * index;
          const normalized = value / maxValue;
          const y = height - padding - normalized * (height - padding * 2);

          return (
            <circle
              key={`${index}-${value}`}
              cx={x}
              cy={y}
              r="2.5"
              fill={color}
            />
          );
        })}
      </svg>

      <div className="flex items-center justify-between gap-3 text-[10px] mono-ui text-muted-foreground">
        <span>{labels?.[0] || "start"}</span>
        <span>
          {labels?.[Math.floor((labels?.length || 1) / 2)] || "middle"}
        </span>
        <span>{labels?.[labels?.length - 1] || "latest"}</span>
      </div>
      <div className="flex items-center justify-between gap-3 text-[10px] mono-ui text-muted-foreground">
        <span>min {Math.round(minValue)}</span>
        <span>max {Math.round(maxValue)}</span>
      </div>
    </div>
  );
}

export function DonutChart({ segments, centerLabel, centerValue, className }) {
  const numericSegments = segments.map((segment) => ({
    ...segment,
    value: Number(segment.value || 0),
  }));
  const total = Math.max(1, ...numericSegments.map((segment) => segment.value));
  const normalizedTotal = segments.reduce(
    (sum, segment) => sum + Number(segment.value || 0),
    0,
  );

  const positiveSegments = numericSegments.filter(
    (segment) => segment.value > 0,
  );
  const minVisiblePercent = positiveSegments.length > 1 ? 8 : 0;
  const minimumTotal = positiveSegments.length * minVisiblePercent;
  const extraSpace = Math.max(0, 100 - minimumTotal);
  const positivePercentTotal = positiveSegments.reduce(
    (sum, segment) => sum + segment.value / total,
    0,
  );

  const adjustedSegments = numericSegments.map((segment) => {
    if (segment.value <= 0) {
      return { ...segment, percent: 0 };
    }

    const rawPercent = (segment.value / total) * 100;
    const share =
      positivePercentTotal > 0 ? rawPercent / (positivePercentTotal * 100) : 0;
    return {
      ...segment,
      percent:
        minVisiblePercent +
        (positiveSegments.length > 1 ? extraSpace * share : 100),
    };
  });

  let cursor = 0;
  const gradient = adjustedSegments
    .map((segment) => {
      if (segment.percent <= 0) {
        return null;
      }

      const start = cursor;
      cursor += segment.percent;
      const end = cursor;
      return `${segment.color} ${start}% ${end}%`;
    })
    .filter(Boolean)
    .join(", ");

  return (
    <div
      className={cn("grid gap-4 md:grid-cols-[minmax(0,180px)_1fr]", className)}
    >
      <div className="flex items-center justify-center">
        <div
          className="relative flex size-40 items-center justify-center rounded-full border border-border"
          style={{ background: `conic-gradient(${gradient})` }}
        >
          <div className="flex size-[118px] flex-col items-center justify-center rounded-full border border-border bg-card text-center">
            <span className="text-[10px] mono-ui uppercase tracking-[0.08em] text-muted-foreground">
              {centerLabel}
            </span>
            {centerValue !== undefined && centerValue !== null ? (
              <span className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-foreground">
                {centerValue}
              </span>
            ) : null}
            <span className="mt-1 text-[10px] mono-ui text-muted-foreground">
              total {normalizedTotal}
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {segments.map((segment) => (
          <div
            key={segment.label}
            className="flex items-center gap-3 border-b border-border pb-2 last:border-b-0 last:pb-0"
          >
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: segment.color }}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-foreground">
                {segment.label}
              </p>
              {segment.meta ? (
                <p className="mt-0.5 text-[10px] mono-ui text-muted-foreground">
                  {segment.meta}
                </p>
              ) : null}
            </div>
            <span className="whitespace-nowrap text-[11px] mono-ui text-primary">
              {segment.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DashboardBadge({ children }) {
  return <Badge variant="secondary">{children}</Badge>;
}
