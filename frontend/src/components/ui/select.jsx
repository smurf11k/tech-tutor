import * as React from "react";

import { cn } from "@/lib/utils";

function Select({ className, ...props }) {
  return (
    <select
      data-slot="select"
      className={cn(
        "flex h-[34px] w-full rounded-[var(--radius)] border border-input bg-card px-3 py-1.5 text-xs text-foreground transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 mono-ui",
        className,
      )}
      {...props}
    />
  );
}

export { Select };
