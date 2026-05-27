import { cn } from "@/lib/utils";

export function Label({ className, ...props }) {
  return (
    <label
      className={cn(
        "text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground mono-ui",
        className,
      )}
      {...props}
    />
  );
}
