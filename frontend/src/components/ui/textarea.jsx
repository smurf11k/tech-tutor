import * as React from "react";

import { cn } from "@/lib/utils";

function Textarea({ className, ...props }) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex min-h-24 w-full rounded-[var(--radius)] border border-input bg-card px-3 py-2 text-xs text-foreground transition-colors placeholder:text-[#3a3a3a] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 mono-ui",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
