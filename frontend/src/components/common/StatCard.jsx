import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatCard({ title, value, hint, className }) {
  return (
    <Card
      className={cn(
        "relative overflow-hidden border-border bg-card/80 shadow-none",
        className,
      )}
    >
      <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
      <CardHeader className="pb-2 pt-4">
        <CardTitle className="text-[10px] font-medium tracking-[0.08em] text-muted-foreground mono-ui uppercase">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-4">
        <p className="stat-value text-[28px] font-semibold tracking-[-0.04em] text-foreground">
          {value}
        </p>
        {hint ? (
          <p className="mt-1 text-[11px] mono-ui text-muted-foreground">
            {hint}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
