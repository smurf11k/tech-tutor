import { cva } from "class-variance-authority";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-[var(--radius)] border text-[12px] font-medium whitespace-nowrap transition-colors outline-none select-none disabled:pointer-events-none disabled:opacity-50 focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-0 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5 mono-ui",
  {
    variants: {
      variant: {
        default:
          "border-primary bg-primary text-primary-foreground hover:bg-[#00ff80]",
        outline:
          "border-border bg-transparent text-muted-foreground hover:border-[#555] hover:bg-[#111] hover:text-foreground",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-[#171717]",
        ghost:
          "border-transparent bg-transparent text-muted-foreground hover:bg-[#111] hover:text-foreground",
        destructive:
          "border-[#3a1010] bg-transparent text-destructive hover:bg-[#1a0808]",
        link: "border-transparent bg-transparent px-0 text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-8 px-3.5",
        xs: "h-6 px-2 text-[10px]",
        sm: "h-7 px-2.5 text-[11px]",
        lg: "h-10 px-5 text-[13px]",
        icon: "size-8",
        "icon-xs": "size-6",
        "icon-sm": "size-7",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export { buttonVariants };
