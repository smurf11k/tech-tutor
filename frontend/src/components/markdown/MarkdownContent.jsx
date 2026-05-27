import ReactMarkdown from "react-markdown";
import { cn, resolveBackendAssetUrl } from "@/lib/utils";

const VIDEO_FILE_PATTERN = /\.(mp4|mov|webm|m4v|avi|mkv)(?:[?#].*)?$/i;

function getMarkdownText(children) {
  if (Array.isArray(children)) {
    return children.join("");
  }

  return typeof children === "string" ? children : "";
}

function VideoLink({ href, children }) {
  const resolvedHref = resolveBackendAssetUrl(href);
  const label = getMarkdownText(children) || href;

  return (
    <figure className="my-4 overflow-hidden rounded-xl border border-border bg-black/95 shadow-sm">
      <video
        controls
        preload="metadata"
        className="w-full max-h-[70vh] bg-black"
        src={resolvedHref}
      />
      {label ? (
        <figcaption className="border-t border-white/10 px-4 py-2 text-xs text-muted-foreground">
          {label}
        </figcaption>
      ) : null}
    </figure>
  );
}

// When a paragraph's sole child is a video link, react-markdown still wraps it
// in a <p>, making <figure> a descendant of <p> — invalid HTML. We detect that
// case and render a <div> instead so block-level elements are always valid.
function MarkdownParagraph({ children }) {
  const kids = Array.isArray(children) ? children : [children];
  const isVideoOnly =
    kids.length === 1 &&
    kids[0]?.type === MarkdownLink &&
    VIDEO_FILE_PATTERN.test(kids[0]?.props?.href ?? "");

  if (isVideoOnly) {
    return <div>{children}</div>;
  }

  return <p>{children}</p>;
}

function MarkdownLink({ href, children, ...props }) {
  const label = getMarkdownText(children);
  const resolvedHref =
    href?.startsWith("#") ||
    href?.startsWith("mailto:") ||
    href?.startsWith("tel:")
      ? href
      : resolveBackendAssetUrl(href);

  if (href && VIDEO_FILE_PATTERN.test(href)) {
    return <VideoLink href={href}>{children}</VideoLink>;
  }

  return (
    <a href={resolvedHref} target="_blank" rel="noreferrer" {...props}>
      {label || children}
    </a>
  );
}

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
      <ReactMarkdown components={{ a: MarkdownLink, p: MarkdownParagraph }}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
