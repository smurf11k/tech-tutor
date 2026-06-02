import { Badge } from "@/components/ui/badge";

export default function PublishStatusPill({ status }) {
  if (status === "published") {
    return (
      <Badge className="border-green-600/35 bg-green-600/18 text-xs text-green-700 hover:bg-green-600/22 dark:text-green-400">
        Published
      </Badge>
    );
  }

  if (
    status === "pending_review" ||
    status === "pending_unpublish" ||
    status === "pending"
  ) {
    return (
      <Badge className="border-sky-600/35 bg-sky-600/18 text-xs text-sky-700 hover:bg-sky-600/22 dark:text-sky-400">
        Pending review
      </Badge>
    );
  }

  return (
    <Badge className="border-yellow-600/35 bg-yellow-600/18 text-xs text-yellow-700 hover:bg-yellow-600/22 dark:text-yellow-400">
      Draft
    </Badge>
  );
}
