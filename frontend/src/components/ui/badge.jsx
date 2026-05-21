import { badgeVariants } from "@/components/ui/badge-variants";
import { cn } from "@/lib/utils";

function Badge({ className, variant, ...props }) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge };
