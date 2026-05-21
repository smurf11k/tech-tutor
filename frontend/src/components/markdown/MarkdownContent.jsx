import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";

export function MarkdownContent({ content, className }) {
  if (!content) {
    return null;
  }

  return (
    <div
      className={cn(
        "space-y-3 text-sm leading-relaxed max-w-none",
        "[&_h1]:text-2xl [&_h1]:font-semibold [&_h2]:text-xl [&_h2]:font-semibold",
        "[&_h3]:text-lg [&_h3]:font-medium [&_p]:text-muted-foreground",
        "[&_a]:text-primary [&_a]:underline [&_ul]:list-disc [&_ul]:pl-5",
        "[&_ol]:list-decimal [&_ol]:pl-5 [&_code]:rounded [&_code]:bg-muted [&_code]:px-1",
        className,
      )}
    >
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}
