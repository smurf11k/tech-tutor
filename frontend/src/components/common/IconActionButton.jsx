import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function IconActionButton({
  label,
  onClick,
  disabled = false,
  children,
  className = "",
  variant = "ghost",
  type = "button",
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type={type}
          size="icon"
          variant={variant}
          disabled={disabled}
          className={`h-8 w-8 ${className}`}
          onClick={onClick}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{label}</p>
      </TooltipContent>
    </Tooltip>
  );
}
