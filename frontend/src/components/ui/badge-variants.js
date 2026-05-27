import { cva } from "class-variance-authority";

const badgeVariants = cva(
  "inline-flex items-center rounded-[3px] border px-2 py-0.5 text-[10px] font-medium tracking-[0.04em] transition-colors mono-ui",
  {
    variants: {
      variant: {
        default: "border-[#003a1a] bg-[#001a0d] text-primary",
        secondary: "border-border bg-[#111] text-muted-foreground",
        outline: "border-border bg-transparent text-foreground",
        destructive: "border-[#3a0015] bg-[#1a0008] text-[#f43f5e]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export { badgeVariants };
