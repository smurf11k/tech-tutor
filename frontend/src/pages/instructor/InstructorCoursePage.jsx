import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LoadingState } from "@/components/common/LoadingState";
import PublishStatusPill from "@/components/common/PublishStatusPill";
import {
  LessonEditorForm,
  QuizEditorForm,
  questionToForm,
  questionFormToPayload,
} from "@/components/instructor/ContentEditors";
import { buildModuleContentItems } from "@/components/instructor/buildCourseContentItems";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import {
  getApiErrorMessage,
  resolveBackendAssetUrl,
  slugify,
} from "@/lib/utils";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TRACK_OPTIONS = [
  { value: "frontend", label: "Frontend" },
  { value: "backend", label: "Backend" },
  { value: "ml/ai", label: "ML/AI" },
  { value: "devops", label: "DevOps" },
];

const LEGACY_TRACK_MAP = {
  "web-development": "frontend",
  "client-server-development": "backend",
  "software-engineering": "backend",
  cybersecurity: "devops",
};

function normalizeTrack(value) {
  const input = String(value || "")
    .trim()
    .toLowerCase();
  const normalized = LEGACY_TRACK_MAP[input] || input;

  if (TRACK_OPTIONS.some((option) => option.value === normalized)) {
    return normalized;
  }

  return TRACK_OPTIONS[0].value;
}

const DEFAULT_PRICE_BENEFITS = [
  "Full lifetime access",
  "Access on all devices",
  "Certificate of completion",
];

const EMPTY_COURSE = {
  title: "",
  slug: "",
  description: "",
  category: TRACK_OPTIONS[0].value,
  level: "beginner",
  language: "en",
  what_you_will_learn: [],
  price_benefits: [...DEFAULT_PRICE_BENEFITS],
  tags: [],
  price: 0,
  is_published: false,
};

const EMPTY_LESSON = {
  title: "",
  content: "",
  estimated_time_minutes: 0,
  is_published: false,
  videoFile: null,
  video_name: "",
  video_path: "",
  video_url: "",
  remove_video: false,
};
const EMPTY_QUIZ_FORM = {
  title: "",
  pass_score: 70,
  estimated_time_minutes: 0,
  time_limit_seconds: 0,
  is_published: false,
};

function pendingCourseKey(id) {
  return `techtutor_pending_course_${id}`;
}

function normalizeCourseList(items) {
  return Array.from(
    new Set(
      (Array.isArray(items) ? items : [])
        .map((item) => String(item ?? "").trim())
        .filter(Boolean),
    ),
  );
}

function normalizeCourseTag(value) {
  return slugify(value || "");
}

function courseRouteKey(course) {
  return (
    course?.slug || course?.course_slug || course?.id || course?.course_id || ""
  );
}

function extractFieldErrors(error) {
  return error?.response?.data?.errors ?? {};
}

function courseToForm(course) {
  const courseTags = Array.isArray(course?.tags)
    ? course.tags.map((tag) => String(tag?.slug || tag?.name || tag || ""))
    : [];

  return {
    title: course.title || "",
    slug: course.slug || "",
    description: course.description || "",
    category: normalizeTrack(course.category),
    level: course.level || "beginner",
    language: course.language || "en",
    what_you_will_learn: normalizeCourseList(course.what_you_will_learn),
    price_benefits: normalizeCourseList(
      course.price_benefits?.length
        ? course.price_benefits
        : DEFAULT_PRICE_BENEFITS,
    ),
    tags: normalizeCourseList(courseTags).map(normalizeCourseTag),
    price: course.price || 0,
    is_published: Boolean(course.is_published),
  };
}

function ListEditorField({
  label,
  value,
  onChange,
  placeholder,
  helperText,
  error,
  maxItems = 10,
  normalizeItem = (input) => input,
}) {
  const [draft, setDraft] = useState("");

  const addItem = () => {
    const nextItem = normalizeItem(draft);
    if (!nextItem || value.length >= maxItems) {
      return;
    }

    if (value.includes(nextItem)) {
      setDraft("");
      return;
    }

    onChange([...value, nextItem]);
    setDraft("");
  };

  const removeItem = (index) => {
    onChange(value.filter((_, currentIndex) => currentIndex !== index));
  };

  return (
    <div className="space-y-2">
      <div className="space-y-1">
        <Label>{label}</Label>
        <div className="flex gap-2">
          <Input
            value={draft}
            placeholder={placeholder}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === ",") {
                event.preventDefault();
                addItem();
              }
            }}
            onBlur={addItem}
          />
          <Button type="button" variant="outline" onClick={addItem}>
            Add
          </Button>
        </div>
      </div>

      {helperText ? (
        <p className="text-xs text-muted-foreground">{helperText}</p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {value.map((item, index) => (
          <Badge
            key={`${item}-${index}`}
            variant="secondary"
            className="flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-normal"
          >
            <span>{item}</span>
            <button
              type="button"
              onClick={() => removeItem(index)}
              className="text-muted-foreground hover:text-foreground"
              aria-label={`Remove ${item}`}
            >
              <i className="ti ti-x" style={{ fontSize: 10 }} />
            </button>
          </Badge>
        ))}
      </div>

      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

function lessonToForm(lesson) {
  const latestRevision = lesson.latestRevision || lesson.latest_revision;
  const publishedRevision =
    lesson.publishedRevision || lesson.published_revision;
  const sourceLesson =
    latestRevision?.status && latestRevision.status !== "published"
      ? latestRevision
      : publishedRevision || latestRevision || lesson;

  return {
    title: sourceLesson.title || "",
    content: sourceLesson.content || "",
    estimated_time_minutes: sourceLesson.estimated_time_minutes ?? 0,
    is_published: lesson.is_published ?? false,
    videoFile: null,
    video_name:
      sourceLesson.video_name ||
      sourceLesson.video_path?.split("/").pop() ||
      sourceLesson.video_url?.split("/").pop() ||
      "",
    video_path: sourceLesson.video_path || "",
    video_url: sourceLesson.video_url || "",
    remove_video: false,
  };
}

function getLessonDisplayTitle(lesson) {
  const latestRevision = lesson.latestRevision || lesson.latest_revision;
  const publishedRevision =
    lesson.publishedRevision || lesson.published_revision;
  const activeRevision =
    latestRevision && latestRevision.status !== "published"
      ? latestRevision
      : publishedRevision || latestRevision;

  return activeRevision?.title || lesson.title || "Untitled lesson";
}

function getLessonStatus(lesson) {
  const latestRevision = lesson.latestRevision || lesson.latest_revision;

  if (latestRevision && latestRevision.status !== "published") {
    return latestRevision.status === "pending_unpublish"
      ? "pending"
      : latestRevision.status;
  }

  return lesson.is_published ? "published" : "draft";
}

function getQuizDisplayTitle(quiz) {
  const latestRevision = quiz.latestRevision || quiz.latest_revision;
  const publishedRevision = quiz.publishedRevision || quiz.published_revision;
  const activeRevision =
    latestRevision && latestRevision.status !== "published"
      ? latestRevision
      : publishedRevision || latestRevision;

  return activeRevision?.title || quiz.title || "Untitled quiz";
}

function getQuizStatus(quiz) {
  const latestRevision = quiz.latestRevision || quiz.latest_revision;
  const publishedRevision = quiz.publishedRevision || quiz.published_revision;
  const isPublished = Boolean(
    quiz.is_published || publishedRevision?.status === "published",
  );

  if (latestRevision && latestRevision.status !== "published") {
    return latestRevision.status === "pending_unpublish"
      ? "pending"
      : latestRevision.status;
  }

  if (publishedRevision && publishedRevision.status === "published") {
    return "published";
  }

  return isPublished ? "published" : "draft";
}

function resolveLessonSnapshot(lesson) {
  const latestRevision = lesson.latestRevision || lesson.latest_revision;
  const publishedRevision =
    lesson.publishedRevision || lesson.published_revision;

  return publishedRevision || latestRevision || lesson;
}

function resolveQuizSnapshot(quiz) {
  const latestRevision = quiz.latestRevision || quiz.latest_revision;
  const publishedRevision = quiz.publishedRevision || quiz.published_revision;

  if (latestRevision && latestRevision.status !== "published") {
    return latestRevision;
  }

  return publishedRevision || latestRevision || quiz;
}

function quizToForm(quiz) {
  const sourceQuiz = resolveQuizSnapshot(quiz);
  const publishedRevision = quiz?.publishedRevision || quiz?.published_revision;
  const isPublished = Boolean(
    quiz?.is_published || publishedRevision?.status === "published",
  );

  return {
    title: sourceQuiz.title || "",
    pass_score: sourceQuiz.pass_score ?? 70,
    estimated_time_minutes: sourceQuiz.estimated_time_minutes ?? 0,
    time_limit_seconds: sourceQuiz.time_limit_seconds ?? 0,
    is_published: isPublished || Boolean(sourceQuiz.is_published),
  };
}

function normalizeQuizState(quiz) {
  if (!quiz) {
    return quiz;
  }

  const latestRevision = quiz.latestRevision || quiz.latest_revision || null;
  const publishedRevision = quiz.publishedRevision || quiz.published_revision;
  const activeRevision = resolveQuizSnapshot(quiz);
  const isPublished = Boolean(
    quiz.is_published || publishedRevision?.status === "published",
  );

  const {
    id: _ignoredRevisionId,
    quiz_id: _ignoredQuizId,
    author_id: _ignoredAuthorId,
    version: _ignoredVersion,
    reviewed_by_id: _ignoredReviewedById,
    published_by_id: _ignoredPublishedById,
    reviewed_at: _ignoredReviewedAt,
    published_at: _ignoredPublishedAt,
    unpublished_at: _ignoredUnpublishedAt,
    rejection_reason: _ignoredRejectionReason,
    created_at: _ignoredCreatedAt,
    updated_at: _ignoredUpdatedAt,
    ...activeRevisionAttributes
  } = activeRevision ?? {};

  return {
    ...quiz,
    ...activeRevisionAttributes,
    is_published: isPublished,
    latestRevision,
    publishedRevision,
  };
}

// ---------------------------------------------------------------------------
// Saved status indicator — reacts to dirty state + save cycles
// ---------------------------------------------------------------------------

function SavedIndicator({ dirty, saving }) {
  // dirty = unsaved changes exist; saving = in-flight request
  if (saving) {
    return (
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          color: "var(--muted-foreground)",
          display: "flex",
          alignItems: "center",
          gap: 5,
        }}
      >
        <i
          className="ti ti-loader-2"
          style={{ fontSize: 11, animation: "spin 1s linear infinite" }}
        />
        saving…
      </span>
    );
  }
  if (dirty) {
    return (
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          color: "#d97706",
          display: "flex",
          alignItems: "center",
          gap: 5,
        }}
      >
        <i className="ti ti-circle-dot" style={{ fontSize: 11 }} />
        unsaved changes
      </span>
    );
  }
  return (
    <span
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 10,
        color: "var(--primary)",
        display: "flex",
        alignItems: "center",
        gap: 5,
      }}
    >
      <i className="ti ti-circle-check" style={{ fontSize: 11 }} />
      saved
    </span>
  );
}

function VideoUploadModal({
  open,
  fileName,
  progress,
  status,
  error,
  mode,
  onCancel,
  onDone,
}) {
  if (!open) {
    return null;
  }

  const isUploading = status === "uploading";
  const isRemoving = mode === "removing";
  const subtitle =
    status === "done"
      ? isRemoving
        ? "Video removed from the lesson. Changes are being saved now."
        : "Upload finished. Video processing continues on the server."
      : status === "error"
        ? isRemoving
          ? "Removing the video failed. You can close this dialog and try again."
          : "Upload failed. You can close this dialog and try again."
        : isRemoving
          ? "Removing the selected video from MinIO..."
          : "Uploading the source video to MinIO...";

  return (
    <div className="fixed inset-0 z-[240] flex items-center justify-center bg-black/70 px-4 py-6 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div>
            <p className="text-sm font-semibold">
              {isRemoving ? "Removing video" : "Uploading video"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {fileName || "Selected lesson video"}
            </p>
          </div>
          <span className="rounded-full border border-border bg-muted px-2.5 py-1 text-[11px] text-muted-foreground">
            {Math.max(0, Math.min(100, progress))}%
          </span>
        </div>

        <div className="space-y-4 px-5 py-5">
          <div className="space-y-2">
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-200"
                style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
            {error ? <p className="text-xs text-destructive">{error}</p> : null}
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              {isUploading ? "Cancel" : "Close"}
            </Button>
            <Button type="button" onClick={onDone} disabled={isUploading}>
              Done
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sortable content item (lesson or quiz) inside a module
// ---------------------------------------------------------------------------

function SortableContentItem({ item, onEdit, onDelete }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item._dnd_id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const isLesson = item._type === "lesson";
  const deleteTitle = item.is_published ? "Unpublish" : "Delete";

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        display: "flex",
        alignItems: "center",
        gap: 7,
        padding: "6px 10px 6px 22px",
        fontSize: 11,
        fontFamily: "var(--font-mono)",
        color: "var(--muted-foreground)",
        cursor: "pointer",
        borderBottom: "1px solid var(--border)",
        transition: "background .12s",
      }}
    >
      <span
        {...attributes}
        {...listeners}
        style={{
          cursor: "grab",
          color: "#3a3a3a",
          fontSize: 11,
          flexShrink: 0,
        }}
      >
        <i className="ti ti-grip-vertical" />
      </span>
      <i
        className={`ti ${isLesson ? "ti-player-play" : "ti-help-circle"}`}
        style={{ fontSize: 11, color: "#3a3a3a", flexShrink: 0 }}
      />
      <span
        style={{
          flex: 1,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {isLesson ? getLessonDisplayTitle(item) : getQuizDisplayTitle(item)}
      </span>
      <PublishStatusPill
        status={isLesson ? getLessonStatus(item) : getQuizStatus(item)}
      />
      <div style={{ gap: 2, flexShrink: 0, display: "flex" }}>
        <button
          onClick={onEdit}
          title="Edit"
          style={{
            width: 22,
            height: 22,
            background: "transparent",
            border: "none",
            color: "var(--muted-foreground)",
            fontSize: 12,
            borderRadius: 3,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.background = "var(--secondary)";
            e.currentTarget.style.color = "var(--text)";
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "var(--muted-foreground)";
          }}
        >
          <i className="ti ti-pencil" />
        </button>
        <button
          onClick={onDelete}
          title={deleteTitle}
          style={{
            width: 22,
            height: 22,
            background: "transparent",
            border: "none",
            color: "#f87171",
            fontSize: 12,
            borderRadius: 3,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onMouseOver={(e) => (e.currentTarget.style.background = "#1a0808")}
          onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}
        >
          <i className="ti ti-trash" />
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sortable module wrapper
// ---------------------------------------------------------------------------

function SortableModule(props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `module-${props.module.id}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <ModuleSection
        {...props}
        dragAttributes={attributes}
        dragListeners={listeners}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Module section — interleaved lessons+quizzes with DnD
// ---------------------------------------------------------------------------

function ModuleSection({
  module,
  onEditLesson,
  onEditQuiz,
  onDeleteLesson,
  onDeleteQuiz,
  onReorder,
  onAddLesson,
  onAddQuiz,
  onRename,
  onDelete,
  editingModuleId,
  editingModuleTitle,
  setEditingModuleTitle,
  saving,
  dragAttributes,
  dragListeners,
  isCollapsed,
  onToggleCollapse,
}) {
  const items = useMemo(
    () => buildModuleContentItems(module.lessons || [], module.quizzes || []),
    [module.lessons, module.quizzes],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const handleDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((i) => i._dnd_id === active.id);
    const newIndex = items.findIndex((i) => i._dnd_id === over.id);
    onReorder(module, arrayMove(items, oldIndex, newIndex));
  };

  const isEditing = editingModuleId === module.id;

  return (
    <div
      className="struct-module"
      style={{
        background: "var(--bg)",
        border: "1px solid var(--border)",
        borderRadius: 6,
        marginBottom: 6,
        overflow: "hidden",
      }}
    >
      {/* Module header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "8px 10px",
          borderBottom: isCollapsed ? "none" : "1px solid var(--border)",
          minWidth: 0,
        }}
      >
        {dragListeners && dragAttributes && (
          <span
            {...dragAttributes}
            {...dragListeners}
            title="Drag to reorder"
            style={{
              cursor: "grab",
              color: "#3a3a3a",
              fontSize: 13,
              flexShrink: 0,
              display: "flex",
            }}
          >
            <i className="ti ti-grip-vertical" />
          </span>
        )}

        <button
          onClick={() => onToggleCollapse(module.id)}
          style={{
            background: "transparent",
            border: "none",
            color: "#3a3a3a",
            cursor: "pointer",
            padding: 0,
            display: "flex",
            flexShrink: 0,
          }}
        >
          <i
            className="ti ti-chevron-right"
            style={{
              fontSize: 13,
              transition: "transform .15s",
              transform: isCollapsed ? "rotate(0deg)" : "rotate(90deg)",
            }}
          />
        </button>

        {isEditing ? (
          <form
            onSubmit={(e) => onRename(e, module)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              flex: 1,
              minWidth: 0,
            }}
          >
            <input
              autoFocus
              value={editingModuleTitle}
              onChange={(e) => setEditingModuleTitle(e.target.value)}
              style={{
                flex: 1,
                minWidth: 0,
                height: 24,
                padding: "0 7px",
                border: "1px solid var(--ring)",
                borderRadius: 4,
                fontSize: 11,
                fontFamily: "var(--font-mono)",
                background: "var(--card)",
                color: "var(--text)",
                outline: "none",
              }}
            />
            <button
              type="submit"
              disabled={saving}
              title="Save"
              style={{
                width: 24,
                height: 24,
                background: "var(--primary)",
                color: "#001a0d",
                border: "none",
                borderRadius: 4,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <i className="ti ti-check" style={{ fontSize: 13 }} />
            </button>
            <button
              type="button"
              onClick={() => onRename(null, null)}
              title="Cancel"
              style={{
                width: 24,
                height: 24,
                background: "transparent",
                color: "var(--muted-foreground)",
                border: "1px solid var(--border)",
                borderRadius: 4,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <i className="ti ti-x" style={{ fontSize: 13 }} />
            </button>
          </form>
        ) : (
          <>
            <span
              style={{
                fontSize: 11,
                fontWeight: 500,
                flex: 1,
                minWidth: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                fontFamily: "var(--font-mono)",
              }}
            >
              {module.title}
            </span>
            <button
              onClick={() => onRename("start", module)}
              title="Rename module"
              style={{
                width: 22,
                height: 22,
                background: "transparent",
                border: "none",
                color: "#3a3a3a",
                fontSize: 12,
                borderRadius: 3,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.color = "var(--text)";
                e.currentTarget.style.background = "var(--secondary)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.color = "#3a3a3a";
                e.currentTarget.style.background = "transparent";
              }}
            >
              <i className="ti ti-pencil" />
            </button>
            <button
              onClick={() => onDelete(module)}
              title="Delete module"
              style={{
                width: 22,
                height: 22,
                background: "transparent",
                border: "none",
                color: "#3a3a3a",
                fontSize: 12,
                borderRadius: 3,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.color = "#f87171";
                e.currentTarget.style.background = "#1a0808";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.color = "#3a3a3a";
                e.currentTarget.style.background = "transparent";
              }}
            >
              <i className="ti ti-trash" />
            </button>
          </>
        )}
      </div>

      {/* Lessons / quizzes */}
      {!isCollapsed && (
        <>
          {items.length === 0 ? (
            <p
              style={{
                padding: "8px 22px",
                fontSize: 11,
                fontFamily: "var(--font-mono)",
                color: "#3a3a3a",
              }}
            >
              No lessons or quizzes yet.
            </p>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={items.map((i) => i._dnd_id)}
                strategy={verticalListSortingStrategy}
              >
                {items.map((item) => (
                  <SortableContentItem
                    key={item._dnd_id}
                    item={item}
                    onEdit={() =>
                      item._type === "lesson"
                        ? onEditLesson(item, module)
                        : onEditQuiz(item, module)
                    }
                    onDelete={() =>
                      item._type === "lesson"
                        ? onDeleteLesson(item, module)
                        : onDeleteQuiz(item, module)
                    }
                  />
                ))}
              </SortableContext>
            </DndContext>
          )}

          <div style={{ display: "flex", gap: 6, padding: "6px 10px" }}>
            <button
              onClick={() => onAddLesson(module)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                padding: "4px 10px 4px 0",
                fontSize: 11,
                fontFamily: "var(--font-mono)",
                color: "#3a3a3a",
                background: "transparent",
                border: "none",
                cursor: "pointer",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.color = "var(--primary)";
                e.currentTarget.style.background = "var(--accent)";
                e.currentTarget.style.borderRadius = "4px";
                e.currentTarget.style.paddingLeft = "6px";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.color = "#3a3a3a";
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.paddingLeft = "0";
              }}
            >
              <i className="ti ti-plus" style={{ fontSize: 12 }} /> Add lesson
            </button>
            <button
              onClick={() => onAddQuiz(module)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                padding: "4px 10px 4px 0",
                fontSize: 11,
                fontFamily: "var(--font-mono)",
                color: "#3a3a3a",
                background: "transparent",
                border: "none",
                cursor: "pointer",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.color = "var(--primary)";
                e.currentTarget.style.background = "var(--accent)";
                e.currentTarget.style.borderRadius = "4px";
                e.currentTarget.style.paddingLeft = "6px";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.color = "#3a3a3a";
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.paddingLeft = "0";
              }}
            >
              <i className="ti ti-plus" style={{ fontSize: 12 }} /> Add quiz
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function InstructorCoursePage() {
  const { courseId } = useParams();
  const isNew = !courseId || courseId === "new";
  const location = useLocation();
  const navigate = useNavigate();
  const { client, isAdmin } = useAuth();
  const toast = useToast();

  const seededCourse = (() => {
    const fromState = location.state?.course;
    if (fromState && String(courseRouteKey(fromState)) === String(courseId))
      return fromState;
    if (!courseId) return null;
    const cached = sessionStorage.getItem(pendingCourseKey(courseId));
    if (!cached) return null;
    try {
      const parsed = JSON.parse(cached);
      sessionStorage.removeItem(pendingCourseKey(courseId));
      return String(courseRouteKey(parsed)) === String(courseId)
        ? parsed
        : null;
    } catch {
      return null;
    }
  })();

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------

  const [courseForm, setCourseForm] = useState(
    seededCourse ? courseToForm(seededCourse) : EMPTY_COURSE,
  );
  const [course, setCourse] = useState(seededCourse);
  const [courseErrors, setCourseErrors] = useState({});

  // Dirty tracking — set true on any form change, false after a successful save
  const [dirty, setDirty] = useState(false);

  const [panel, setPanel] = useState("course");
  const [editingLesson, setEditingLesson] = useState(null);
  const [editingQuiz, setEditingQuiz] = useState(null);
  const [editingModule, setEditingModule] = useState(null);

  const [lessonForm, setLessonForm] = useState(EMPTY_LESSON);
  const [quizForm, setQuizForm] = useState(EMPTY_QUIZ_FORM);
  const [quizQuestions, setQuizQuestions] = useState([]);

  const [editingModuleId, setEditingModuleId] = useState(null);
  const [editingModuleTitle, setEditingModuleTitle] = useState("");
  const [moduleTitle, setModuleTitle] = useState("");

  const [collapsedModules, setCollapsedModules] = useState({});

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [videoUploadModal, setVideoUploadModal] = useState({
    open: false,
    fileName: "",
    progress: 0,
    status: "idle",
    error: "",
    mode: "uploading",
  });
  const [publishRequested, setPublishRequested] = useState(false);
  const [requestingPublish, setRequestingPublish] = useState(false);
  const uploadAbortRef = useRef(null);
  const openedLessonFromStateRef = useRef(false);
  const openedQuizFromStateRef = useRef(false);

  // ---------------------------------------------------------------------------
  // Dirty-aware form setters
  // ---------------------------------------------------------------------------

  const setCourseFormDirty = (updater) => {
    setCourseForm(updater);
    setDirty(true);
    setCourseErrors({});
  };

  const setLessonFormDirty = (updater) => {
    setLessonForm(updater);
    setDirty(true);
  };

  const setQuizFormDirty = (updater) => {
    setQuizForm(updater);
    setDirty(true);
  };

  const closeVideoUploadModal = () => {
    uploadAbortRef.current = null;
    setVideoUploadModal({
      open: false,
      fileName: "",
      progress: 0,
      status: "idle",
      error: "",
      mode: "uploading",
    });
  };

  const cancelVideoUpload = () => {
    if (videoUploadModal.status === "uploading") {
      uploadAbortRef.current?.abort();
    }

    closeVideoUploadModal();
  };

  useEffect(
    () => () => {
      uploadAbortRef.current?.abort();
    },
    [],
  );

  useEffect(() => {
    if (!course || openedLessonFromStateRef.current) {
      if (!course) {
        return;
      }
    }

    const requestedLessonId = location.state?.lessonId;
    if (!requestedLessonId || openedLessonFromStateRef.current) {
      return;
    }

    const requestedModuleId = location.state?.moduleId;
    const module = course.modules?.find(
      (entry) =>
        String(entry.id) === String(requestedModuleId) ||
        (entry.lessons || []).some(
          (lesson) => String(lesson.id) === String(requestedLessonId),
        ),
    );
    const lesson = module?.lessons?.find(
      (entry) => String(entry.id) === String(requestedLessonId),
    );

    if (lesson && module) {
      openedLessonFromStateRef.current = true;
      openEditLesson(lesson, module);
    }
  }, [course, location.state]);

  useEffect(() => {
    if (!course || openedQuizFromStateRef.current) {
      return;
    }

    const requestedQuizId = location.state?.quizId;
    if (!requestedQuizId) {
      return;
    }

    const requestedModuleId = location.state?.moduleId;
    const module = course.modules?.find(
      (entry) =>
        String(entry.id) === String(requestedModuleId) ||
        (entry.quizzes || []).some(
          (quiz) => String(quiz.id) === String(requestedQuizId),
        ),
    );
    const quiz = module?.quizzes?.find(
      (entry) => String(entry.id) === String(requestedQuizId),
    );

    if (quiz && module) {
      openedQuizFromStateRef.current = true;
      openEditQuiz(quiz, module);
    }
  }, [course, location.state]);

  // ---------------------------------------------------------------------------
  // Sensors for drag-and-drop
  // ---------------------------------------------------------------------------

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  // ---------------------------------------------------------------------------
  // Data
  // ---------------------------------------------------------------------------

  const loadCourse = async () => {
    const { data } = await client.get(`/courses/${courseId}`);
    const modulesRes = await client.get(`/courses/${courseId}/modules`);
    const fullCourse = {
      ...data,
      modules: (modulesRes.data ?? []).map((module) => ({
        ...module,
        quizzes: (module.quizzes ?? []).map(normalizeQuizState),
      })),
    };
    setCourse(fullCourse);
    setCourseForm(courseToForm(data));
    return fullCourse;
  };

  useEffect(() => {
    if (isNew) return;
    setLoading(true);
    loadCourse()
      .catch((err) =>
        toast.error(getApiErrorMessage(err, "Failed to load course.")),
      )
      .finally(() => setLoading(false));
  }, [courseId]);

  // ---------------------------------------------------------------------------
  // Course save
  // ---------------------------------------------------------------------------

  async function saveCourse(targetPublished) {
    setSaving(true);
    setCourseErrors({});

    const payload = {
      ...courseForm,
      slug: courseForm.slug || slugify(courseForm.title),
      category: normalizeTrack(courseForm.category),
      what_you_will_learn: normalizeCourseList(courseForm.what_you_will_learn),
      price_benefits: normalizeCourseList(
        courseForm.price_benefits?.length
          ? courseForm.price_benefits
          : DEFAULT_PRICE_BENEFITS,
      ),
      tags: normalizeCourseList(courseForm.tags).map(normalizeCourseTag),
      price: Number(courseForm.price),
    };

    if (isAdmin && targetPublished !== undefined) {
      payload.is_published = targetPublished;
    } else {
      delete payload.is_published;
    }

    try {
      if (isNew) {
        const { data } = await client.post("/courses", payload);
        const routeKey = courseRouteKey(data);
        sessionStorage.setItem(
          pendingCourseKey(routeKey),
          JSON.stringify(data),
        );
        navigate(`/instructor/courses/${routeKey}`, {
          replace: true,
          state: { course: data },
        });
        setDirty(false);
        return;
      }
      const { data: updatedCourse } = await client.put(
        `/courses/${courseId}`,
        payload,
      );
      if (
        courseRouteKey(updatedCourse) &&
        courseRouteKey(updatedCourse) !== courseId
      ) {
        setCourse(updatedCourse);
        setCourseForm(courseToForm(updatedCourse));
        navigate(`/instructor/courses/${courseRouteKey(updatedCourse)}`, {
          replace: true,
          state: { course: updatedCourse },
        });
      } else {
        await loadCourse();
      }
      setDirty(false);
      toast.success("Course saved.");
    } catch (err) {
      const validationErrors = extractFieldErrors(err);
      if (Object.keys(validationErrors).length > 0) {
        setCourseErrors(validationErrors);
      }
      toast.error(getApiErrorMessage(err, "Failed to save course."));
    } finally {
      setSaving(false);
    }
  }

  async function deleteCourse() {
    if (!window.confirm("Delete this draft course? This cannot be undone.")) {
      return;
    }

    setSaving(true);
    try {
      await client.delete(`/courses/${courseId}`);
      toast.success("Course deleted.");
      navigate("/instructor/content", { replace: true });
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to delete course."));
    } finally {
      setSaving(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Publish request
  // ---------------------------------------------------------------------------

  async function requestPublish() {
    setRequestingPublish(true);
    try {
      await client.post(`/courses/${courseId}/publish-request`);
      setPublishRequested(true);
      toast.success(
        "Publish request submitted. An admin will review it shortly.",
      );
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to submit publish request."));
    } finally {
      setRequestingPublish(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Validation helpers
  // ---------------------------------------------------------------------------

  function checkDuplicateTitle(title, moduleId, excludeItemId = null) {
    const module = course?.modules?.find((m) => m.id === moduleId);
    if (!module) return null;

    const allTitles = [...(module.lessons || []), ...(module.quizzes || [])];

    const isDuplicate = allTitles.some(
      (item) =>
        item.title?.toLowerCase() === title.toLowerCase() &&
        item.id !== excludeItemId,
    );

    return isDuplicate
      ? `A lesson or quiz with this title already exists in this module.`
      : null;
  }

  // ---------------------------------------------------------------------------
  // Module CRUD
  // ---------------------------------------------------------------------------

  async function addModule(e) {
    e.preventDefault();
    if (!moduleTitle.trim()) return;

    const isDuplicate = (course?.modules || []).some(
      (m) => m.title?.toLowerCase() === moduleTitle.toLowerCase(),
    );
    if (isDuplicate) {
      toast.error("A module with this title already exists in this course.");
      return;
    }

    setSaving(true);
    const baseSlug = slugify(moduleTitle);
    const uniqueSlug = `${baseSlug}-${Date.now().toString(36)}`;
    try {
      await client.post(`/courses/${courseId}/modules`, {
        title: moduleTitle,
        slug: uniqueSlug,
      });
      setModuleTitle("");
      await loadCourse();
    } catch (err) {
      const msg = getApiErrorMessage(err);
      if (
        msg.toLowerCase().includes("duplicate") ||
        msg.toLowerCase().includes("unique")
      ) {
        toast.error(
          "A module with a similar title already exists. Please choose a different name.",
        );
      } else {
        toast.error(msg);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleModuleRename(eOrSignal, module) {
    if (eOrSignal === "start") {
      setEditingModuleId(module.id);
      setEditingModuleTitle(module.title);
      return;
    }
    if (eOrSignal === null) {
      setEditingModuleId(null);
      setEditingModuleTitle("");
      return;
    }
    eOrSignal.preventDefault();
    if (!editingModuleTitle.trim()) return;

    const isDuplicate = (course?.modules || []).some(
      (m) =>
        m.title?.toLowerCase() === editingModuleTitle.toLowerCase() &&
        m.id !== module.id,
    );
    if (isDuplicate) {
      toast.error("A module with this title already exists in this course.");
      return;
    }

    setSaving(true);
    try {
      const renamedSlug = `${slugify(editingModuleTitle)}-${Date.now().toString(36)}`;
      await client.put(`/courses/${courseId}/modules/${module.id}`, {
        title: editingModuleTitle,
        slug: renamedSlug,
      });
      setEditingModuleId(null);
      setEditingModuleTitle("");
      await loadCourse();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to rename module."));
    } finally {
      setSaving(false);
    }
  }

  async function deleteModule(module) {
    if (!confirm(`Delete module "${module.title}" and all its content?`))
      return;
    try {
      await client.delete(`/courses/${courseId}/modules/${module.id}`);
      await loadCourse();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to delete module."));
    }
  }

  // ---------------------------------------------------------------------------
  // Lesson panel
  // ---------------------------------------------------------------------------

  function openNewLesson(module) {
    setLessonForm(EMPTY_LESSON);
    setEditingLesson(null);
    setEditingModule(module);
    setDirty(false);
    setPanel("lesson");
  }

  function openEditLesson(lesson, module) {
    setLessonForm(lessonToForm(lesson));
    setEditingLesson(lesson);
    setEditingModule(module);
    setDirty(false);
    setPanel("lesson");
  }

  async function saveLesson(revisionStatus) {
    setSaving(true);
    let savedLesson = null;
    try {
      const duplicateError = checkDuplicateTitle(
        lessonForm.title,
        editingModule.id,
        editingLesson?.id,
      );
      if (duplicateError) {
        toast.error(duplicateError);
        setSaving(false);
        return;
      }

      const moduleObj = (course?.modules ?? []).find(
        (m) => m.id === editingModule.id,
      );

      let nextPosition;
      if (editingLesson) {
        nextPosition = editingLesson.position ?? 0;
      } else {
        const allItems = [
          ...(moduleObj?.lessons ?? []),
          ...(moduleObj?.quizzes ?? []),
        ];
        const maxPosition =
          allItems.length > 0
            ? Math.max(...allItems.map((item) => item.position ?? 0))
            : -1;
        nextPosition = maxPosition + 1;
      }

      const payload = {
        title: lessonForm.title,
        slug: slugify(lessonForm.title),
        content: lessonForm.content,
        type: "lesson",
        estimated_time_minutes:
          lessonForm.estimated_time_minutes > 0
            ? lessonForm.estimated_time_minutes
            : null,
        revision_status: revisionStatus,
        is_published: revisionStatus === "published",
        position: nextPosition,
      };

      const hasVideoUpload = Boolean(
        lessonForm.videoFile || lessonForm.remove_video,
      );

      if (hasVideoUpload) {
        const formData = new FormData();
        const uploadController = new AbortController();
        uploadAbortRef.current = uploadController;
        const isRemovingVideo =
          lessonForm.remove_video && !lessonForm.videoFile;

        setVideoUploadModal({
          open: true,
          fileName:
            (isRemovingVideo
              ? lessonForm.video_name || lessonForm.video_path?.split("/").pop()
              : lessonForm.videoFile?.name) ||
            lessonForm.video_name ||
            "Lesson video",
          progress: 0,
          status: "uploading",
          error: "",
          mode: isRemovingVideo ? "removing" : "uploading",
        });

        if (editingLesson) {
          formData.append("_method", "PUT");
        }

        Object.entries(payload).forEach(([key, value]) => {
          if (value === null || value === undefined) {
            return;
          }

          formData.append(key, String(value));
        });

        if (lessonForm.video_name) {
          formData.append("video_name", lessonForm.video_name);
        }

        if (lessonForm.remove_video) {
          formData.append("remove_video", "1");
        }

        formData.append("revision_status", revisionStatus);
        formData.append(
          "is_published",
          revisionStatus === "published" ? "1" : "0",
        );

        if (lessonForm.videoFile) {
          formData.append("video", lessonForm.videoFile);
        }

        const uploadProgressHandler = (event) => {
          if (!event.total) {
            return;
          }

          const nextProgress = Math.min(
            100,
            Math.round((event.loaded / event.total) * 100),
          );

          setVideoUploadModal((current) =>
            current.open ? { ...current, progress: nextProgress } : current,
          );
        };

        if (editingLesson) {
          const response = await client.post(
            `/modules/${editingModule.id}/lessons/${editingLesson.id}`,
            formData,
            {
              signal: uploadController.signal,
              onUploadProgress: uploadProgressHandler,
            },
          );
          savedLesson = response.data;
        } else {
          const response = await client.post(
            `/modules/${editingModule.id}/lessons`,
            formData,
            {
              signal: uploadController.signal,
              onUploadProgress: uploadProgressHandler,
            },
          );
          savedLesson = response.data;
        }

        setVideoUploadModal((current) =>
          current.open
            ? { ...current, progress: 100, status: "done", error: "" }
            : current,
        );
        if (savedLesson) {
          setEditingLesson((current) =>
            current ? { ...current, ...savedLesson } : savedLesson,
          );
        }
      } else if (editingLesson) {
        const response = await client.put(
          `/modules/${editingModule.id}/lessons/${editingLesson.id}`,
          payload,
        );
        setEditingLesson((current) =>
          current ? { ...current, ...response.data } : response.data,
        );
        savedLesson = response.data;
      } else {
        const response = await client.post(
          `/modules/${editingModule.id}/lessons`,
          payload,
        );
        setEditingLesson(response.data);
        savedLesson = response.data;
      }
      await loadCourse();
      setDirty(false);

      if (revisionStatus === "published") {
        toast.success("Lesson published.");
      } else if (revisionStatus === "pending_unpublish") {
        toast.success("Lesson unpublish requested.");
      } else if (revisionStatus === "pending_review") {
        toast.success("Lesson submitted for review.");
      } else {
        toast.success("Lesson saved as draft.");
      }

      return savedLesson;
    } catch (err) {
      if (err?.code === "ERR_CANCELED") {
        return;
      }

      if (lessonForm.videoFile) {
        setVideoUploadModal((current) =>
          current.open
            ? {
                ...current,
                status: "error",
                error: getApiErrorMessage(err, "Failed to upload video."),
              }
            : current,
        );
      }

      toast.error(getApiErrorMessage(err, "Failed to save lesson."));
    } finally {
      uploadAbortRef.current = null;
      setSaving(false);
    }
  }

  async function deleteLesson(lesson, module) {
    if (lesson.is_published) {
      if (isAdmin) {
        if (
          !confirm(
            `Unpublish lesson "${lesson.title}"? Students will no longer see it.`,
          )
        ) {
          return;
        }

        await applyLessonUnpublish(lesson, module);
      } else {
        if (
          !confirm(
            `Request unpublish for lesson "${lesson.title}"? An admin will review it.`,
          )
        ) {
          return;
        }

        await requestLessonUnpublish(lesson, module);
      }
      return;
    }

    if (!confirm("Delete this lesson?")) return;
    try {
      await client.delete(`/modules/${module.id}/lessons/${lesson.id}`);
      await loadCourse();
      if (panel === "lesson" && editingLesson?.id === lesson.id) {
        setPanel("course");
        setEditingLesson(null);
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to delete lesson."));
    }
  }

  async function applyLessonUnpublish(lesson, module) {
    setSaving(true);
    try {
      const { data } = await client.patch(
        `/modules/${module.id}/lessons/${lesson.id}/unpublish`,
      );
      setEditingLesson((current) => (current ? { ...current, ...data } : data));
      setLessonForm(lessonToForm(data));
      await loadCourse();
      toast.success("Lesson unpublished.");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to unpublish lesson."));
    } finally {
      setSaving(false);
    }
  }

  async function requestLessonUnpublish(lesson, module) {
    setSaving(true);
    try {
      const { data } = await client.get(
        `/modules/${module.id}/lessons/${lesson.id}`,
      );
      const sourceLesson = resolveLessonSnapshot(data);
      const { data: updatedLesson } = await client.put(
        `/modules/${module.id}/lessons/${lesson.id}`,
        {
          title: sourceLesson.title,
          slug: sourceLesson.slug,
          content: sourceLesson.content,
          type: "lesson",
          estimated_time_minutes: sourceLesson.estimated_time_minutes ?? 0,
          revision_status: "pending_unpublish",
          is_published: false,
          position: sourceLesson.position ?? lesson.position ?? 0,
        },
      );
      const pendingRevision = updatedLesson?.latestRevision ||
        updatedLesson?.latest_revision || { status: "pending_unpublish" };
      setEditingLesson((current) =>
        current
          ? {
              ...current,
              ...updatedLesson,
              latestRevision: {
                ...pendingRevision,
                status: "pending_unpublish",
              },
            }
          : updatedLesson,
      );
      await loadCourse();
      toast.success("Lesson unpublish requested.");
    } catch (err) {
      toast.error(
        getApiErrorMessage(err, "Failed to request lesson unpublish."),
      );
    } finally {
      setSaving(false);
    }
  }

  async function unpublishLesson(lesson, module) {
    if (
      !confirm(
        `Unpublish lesson "${lesson.title}"? Students will no longer see it.`,
      )
    ) {
      return;
    }

    await applyLessonUnpublish(lesson, module);
  }

  // ---------------------------------------------------------------------------
  // Reorder
  // ---------------------------------------------------------------------------

  async function handleReorder(module, reorderedItems) {
    const reorderedWithPositions = reorderedItems.map((item, index) => ({
      ...item,
      position: index,
    }));

    setCourse((prev) => ({
      ...prev,
      modules: (prev.modules || []).map((m) =>
        m.id !== module.id
          ? m
          : {
              ...m,
              lessons: reorderedWithPositions
                .filter((i) => i._type === "lesson")
                .map((l) => {
                  const { _type, _dnd_id, ...rest } = l;
                  return rest;
                }),
              quizzes: reorderedWithPositions
                .filter((i) => i._type === "quiz")
                .map((q) => {
                  const { _type, _dnd_id, ...rest } = q;
                  return rest;
                }),
            },
      ),
    }));

    try {
      await client.patch(`/modules/${module.id}/content/reorder`, {
        items: reorderedItems.map((item) => ({
          type: item._type,
          id: item.id,
        })),
      });
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to reorder content."));
      await loadCourse();
    }
  }

  async function handleModuleReorder(reorderedModules) {
    setCourse((prev) => ({
      ...prev,
      modules: reorderedModules.map((m, index) => ({
        ...m,
        position: index,
      })),
    }));

    try {
      await client.patch(`/courses/${courseRouteKey(course)}/modules/reorder`, {
        ids: reorderedModules.map((m) => m.id),
      });
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to reorder modules."));
      await loadCourse();
    }
  }

  // ---------------------------------------------------------------------------
  // Quiz panel
  // ---------------------------------------------------------------------------

  function openNewQuiz(module) {
    setQuizForm(EMPTY_QUIZ_FORM);
    setEditingQuiz(null);
    setEditingModule(module);
    setQuizQuestions([]);
    setDirty(false);
    setPanel("quiz");
  }

  async function openEditQuiz(quiz, module) {
    setPanel("quiz");
    setEditingModule(module);
    setEditingQuiz(quiz);
    const sourceQuiz = resolveQuizSnapshot(quiz);
    setQuizForm({
      title: sourceQuiz.title,
      pass_score: sourceQuiz.pass_score ?? 70,
      estimated_time_minutes: sourceQuiz.estimated_time_minutes ?? 0,
      time_limit_seconds: sourceQuiz.time_limit_seconds ?? 0,
      is_published: quiz.is_published ?? false,
    });
    setQuizQuestions([]);
    setDirty(false);
    // Fetch full quiz with questions — the module listing doesn't include them
    try {
      const { data } = await client.get(
        `/courses/${courseId}/quizzes/${quiz.id}`,
      );
      const activeQuiz = resolveQuizSnapshot(data);
      setEditingQuiz(normalizeQuizState(data));
      setQuizForm(quizToForm(data));
      setQuizQuestions((activeQuiz.questions ?? []).map(questionToForm));
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to load quiz questions."));
    }
  }

  async function saveQuiz(payload) {
    setSaving(true);
    try {
      const duplicateError = checkDuplicateTitle(
        payload.title,
        editingModule?.id,
        editingQuiz?.id,
      );
      if (duplicateError) {
        toast.error(duplicateError);
        setSaving(false);
        return;
      }

      const moduleObjQ = (course?.modules ?? []).find(
        (m) => m.id === editingModule?.id,
      );

      let nextQuizPosition;
      if (editingQuiz) {
        nextQuizPosition = editingQuiz.position ?? 0;
      } else {
        const allItems = [
          ...(moduleObjQ?.lessons ?? []),
          ...(moduleObjQ?.quizzes ?? []),
        ];
        const maxPosition =
          allItems.length > 0
            ? Math.max(...allItems.map((item) => item.position ?? 0))
            : -1;
        nextQuizPosition = maxPosition + 1;
      }

      const fullPayload = {
        ...payload,
        module_id: editingModule?.id ?? null,
        position: nextQuizPosition,
        is_published:
          payload.is_published ?? payload.revision_status === "published",
      };
      if (editingQuiz) {
        const response = await client.put(
          `/courses/${courseId}/quizzes/${editingQuiz.id}`,
          fullPayload,
        );
        const savedQuiz = resolveQuizSnapshot(response.data);
        setEditingQuiz(normalizeQuizState(response.data));
        setQuizForm(quizToForm(response.data));
        setQuizQuestions((savedQuiz.questions ?? []).map(questionToForm));
      } else {
        const response = await client.post(
          `/courses/${courseId}/quizzes`,
          fullPayload,
        );
        const savedQuiz = resolveQuizSnapshot(response.data);
        setEditingQuiz(normalizeQuizState(response.data));
        setQuizForm(quizToForm(response.data));
        setQuizQuestions((savedQuiz.questions ?? []).map(questionToForm));
      }
      await loadCourse();
      setDirty(false);

      if (payload.revision_status === "published") {
        toast.success("Quiz published.");
      } else if (payload.revision_status === "pending_review") {
        toast.success("Quiz submitted for review.");
      } else if (payload.revision_status === "pending_unpublish") {
        // toast handled by requestQuizUnpublish caller
      } else {
        toast.success("Quiz saved as draft.");
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to save quiz."));
    } finally {
      setSaving(false);
    }
  }

  async function deleteQuiz(quiz) {
    if (quiz.is_published) {
      if (isAdmin) {
        if (
          !confirm(
            `Unpublish quiz "${quiz.title}"? Students will no longer see it.`,
          )
        ) {
          return;
        }

        await applyQuizUnpublish(quiz);
      } else {
        if (
          !confirm(
            `Request unpublish for quiz "${quiz.title}"? An admin will review it.`,
          )
        ) {
          return;
        }

        await requestQuizUnpublish(quiz);
      }
      return;
    }

    if (!confirm("Delete this quiz and all its questions?")) return;
    try {
      await client.delete(`/courses/${courseId}/quizzes/${quiz.id}`);
      await loadCourse();
      if (panel === "quiz" && editingQuiz?.id === quiz.id) {
        setPanel("course");
        setEditingQuiz(null);
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to delete quiz."));
    }
  }

  async function applyQuizUnpublish(quiz) {
    setSaving(true);

    try {
      const { data } = await client.patch(
        `/courses/${courseId}/quizzes/${quiz.id}/unpublish`,
      );

      const savedQuiz = resolveQuizSnapshot(data);

      setEditingQuiz(normalizeQuizState(data));
      setQuizForm(quizToForm(data));
      setQuizQuestions((savedQuiz.questions ?? []).map(questionToForm));

      await loadCourse();

      toast.success("Quiz unpublished.");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to unpublish quiz."));
    } finally {
      setSaving(false);
    }
  }

  async function requestQuizUnpublish(quiz) {
    setSaving(true);
    try {
      const { data } = await client.get(
        `/courses/${courseId}/quizzes/${quiz.id}`,
      );
      const sourceQuiz = resolveQuizSnapshot(data);
      await saveQuiz({
        title: sourceQuiz.title,
        pass_score: sourceQuiz.pass_score ?? 70,
        estimated_time_minutes: sourceQuiz.estimated_time_minutes ?? 0,
        time_limit_seconds: sourceQuiz.time_limit_seconds ?? 0,
        is_published: false,
        revision_status: "pending_unpublish",
        questions: (sourceQuiz.questions ?? []).map((question) =>
          questionFormToPayload(questionToForm(question)),
        ),
      });
      setEditingQuiz((current) => {
        if (!current) return current;
        const existingRevision =
          current.latestRevision || current.latest_revision || {};
        return {
          ...current,
          latestRevision: { ...existingRevision, status: "pending_unpublish" },
        };
      });
      toast.success("Quiz unpublish requested.");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to request quiz unpublish."));
    } finally {
      setSaving(false);
    }
  }

  async function unpublishQuiz(quiz) {
    if (
      !confirm(
        `Unpublish quiz "${quiz.title}"? Students will no longer see it.`,
      )
    )
      return;

    await applyQuizUnpublish(quiz);
  }

  // ---------------------------------------------------------------------------
  // Derived
  // ---------------------------------------------------------------------------

  const modules = useMemo(() => course?.modules || [], [course?.modules]);
  const isPublished = course?.is_published ?? false;
  const pendingLessonRevision =
    editingLesson?.latestRevision || editingLesson?.latest_revision;
  const isPendingLessonRevision = [
    "pending_review",
    "pending_unpublish",
    "pending",
  ].includes(pendingLessonRevision?.status);
  const pendingQuizRevision =
    editingQuiz?.latestRevision || editingQuiz?.latest_revision;
  const isPendingQuizRevision = [
    "pending_review",
    "pending_unpublish",
    "pending",
  ].includes(pendingQuizRevision?.status);
  const lessonPrimaryLabel = isAdmin
    ? isPendingLessonRevision
      ? "Approve"
      : "Save & Publish"
    : "Submit for Review";
  const quizPrimaryLabel = isAdmin
    ? isPendingQuizRevision
      ? "Approve"
      : "Save & Publish"
    : "Submit for Review";
  const lessonVideos = useMemo(
    () =>
      modules.flatMap((module) =>
        (module.lessons || [])
          .map((lesson) => {
            const lessonSnapshot = resolveLessonSnapshot(lesson);

            return {
              courseTitle: course?.title || "",
              moduleTitle: module.title || "",
              module,
              lesson,
              lessonId: lesson.id,
              lessonSnapshot,
              videoName:
                lessonSnapshot.video_name ||
                lessonSnapshot.video_path?.split("/").pop() ||
                lessonSnapshot.video_url?.split("/").pop() ||
                "Uploaded video",
            };
          })
          .filter(
            ({ lessonSnapshot }) =>
              lessonSnapshot.video_url || lessonSnapshot.video_path,
          ),
      ),
    [course?.title, modules],
  );

  if (loading) return <LoadingState />;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <TooltipProvider>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <section
        style={{
          width: "100%",
          overflow: "hidden",
          border: "1px solid var(--border)",
          display: "grid",
          gridTemplateRows: "48px 1fr",
          height: "100vh",
        }}
      >
        {/* ── TOP BAR ── */}
        <div
          style={{
            background: "var(--card)",
            borderBottom: "1px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 16px",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 12, fontWeight: 500 }}>
              {courseForm.title || (isNew ? "New course" : "Untitled course")}
            </span>
            <SavedIndicator dirty={dirty} saving={saving} />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                fontSize: 10,
                fontFamily: "var(--font-mono)",
                fontWeight: 500,
                padding: "2px 8px",
                borderRadius: 3,
                letterSpacing: ".04em",
                ...(isPublished
                  ? {
                      background: "var(--accent)",
                      color: "var(--primary)",
                      border: "1px solid var(--ring)",
                    }
                  : {
                      background: "#1a0f00",
                      color: "#d97706",
                      border: "1px solid #3a2000",
                    }),
              }}
            >
              {isPublished ? "PUBLISHED" : "DRAFT"}
            </span>

            {!isNew && (
              <Button variant="outline" size="sm" asChild>
                <Link to={`/courses/${courseId}`}>
                  <i
                    className="ti ti-eye"
                    style={{ fontSize: 12, marginRight: 5 }}
                  />
                  Preview
                </Link>
              </Button>
            )}

            {!isNew && !isAdmin && !isPublished && (
              <Button
                size="sm"
                onClick={requestPublish}
                disabled={requestingPublish || publishRequested}
              >
                {publishRequested ? (
                  <>
                    <i
                      className="ti ti-circle-check"
                      style={{ marginRight: 5, fontSize: 12 }}
                    />
                    review_requested
                  </>
                ) : requestingPublish ? (
                  "Requesting…"
                ) : (
                  <>
                    Submit for review{" "}
                    <i
                      className="ti ti-arrow-right"
                      style={{ marginLeft: 4, fontSize: 12 }}
                    />
                  </>
                )}
              </Button>
            )}
          </div>
        </div>

        {/* ── BODY ── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 320px",
            overflow: "hidden",
          }}
        >
          {/* LEFT: Editor panel */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              borderRight: "1px solid var(--border)",
            }}
          >
            {/* Tab bar */}
            <div
              style={{
                display: "flex",
                borderBottom: "1px solid var(--border)",
                background: "var(--card)",
              }}
            >
              {[
                {
                  key: "course",
                  icon: "ti-settings",
                  label: "course_settings",
                  onClick: () => setPanel("course"),
                },
                {
                  key: "lesson",
                  icon: "ti-player-play",
                  label: "lesson_content",
                  onClick: () => {
                    if (panel === "lesson") return;
                    const firstModule = modules[0] ?? null;
                    setLessonForm(EMPTY_LESSON);
                    setEditingLesson(null);
                    setEditingModule(firstModule);
                    setDirty(false);
                    setPanel("lesson");
                  },
                },
                {
                  key: "quiz",
                  icon: "ti-help-circle",
                  label: "quiz",
                  onClick: () => {
                    if (panel === "quiz") return;
                    const firstModule = modules[0] ?? null;
                    setQuizForm(EMPTY_QUIZ_FORM);
                    setEditingQuiz(null);
                    setEditingModule(firstModule);
                    setQuizQuestions([]);
                    setDirty(false);
                    setPanel("quiz");
                  },
                },
              ].map(({ key, icon, label, onClick }) => (
                <button
                  key={key}
                  type="button"
                  onClick={onClick}
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    color:
                      panel === key
                        ? "var(--primary)"
                        : "var(--muted-foreground)",
                    padding: "9px 14px",
                    cursor: "pointer",
                    /* split border so shorthand doesn't kill the bottom line */
                    borderTop: "none",
                    borderLeft: "none",
                    borderRight: "none",
                    borderBottom:
                      panel === key
                        ? "2px solid var(--primary)"
                        : "2px solid transparent",
                    marginBottom: -1,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    background: "transparent",
                    transition: "color .12s",
                  }}
                >
                  <i className={`ti ${icon}`} style={{ fontSize: 12 }} />
                  {label}
                </button>
              ))}
            </div>

            {/* Scrollable content */}
            <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
              {/* ── COURSE SETTINGS panel ── */}
              {panel === "course" && (
                <div className="space-y-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate("/instructor/content")}
                    className="text-muted-foreground px-0 hover:bg-transparent hover:text-foreground"
                  >
                    <i
                      className="ti ti-arrow-left"
                      style={{ fontSize: 12, marginRight: 6 }}
                    />
                    Back to content
                  </Button>

                  <h2 className="text-lg font-semibold">
                    {isNew
                      ? "New Course"
                      : `Edit: ${courseForm.title || "Untitled"}`}
                  </h2>

                  <div className="space-y-4">
                    <div className="space-y-1">
                      <Label>Title</Label>
                      <Input
                        required
                        value={courseForm.title}
                        onChange={(e) =>
                          setCourseFormDirty((f) => ({
                            ...f,
                            title: e.target.value,
                          }))
                        }
                      />
                    </div>

                    <div className="space-y-1">
                      <Label>Slug</Label>
                      <Input
                        value={courseForm.slug}
                        placeholder={slugify(courseForm.title)}
                        onChange={(e) =>
                          setCourseFormDirty((f) => ({
                            ...f,
                            slug: e.target.value,
                          }))
                        }
                      />
                      {courseErrors.slug?.[0] ? (
                        <p className="text-xs text-destructive">
                          {courseErrors.slug[0]}
                        </p>
                      ) : null}
                    </div>

                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                      <div className="space-y-1">
                        <Label>Track</Label>
                        <select
                          value={courseForm.category || TRACK_OPTIONS[0].value}
                          onChange={(e) =>
                            setCourseFormDirty((f) => ({
                              ...f,
                              category: e.target.value,
                            }))
                          }
                          style={{
                            height: 34,
                            padding: "0 12px",
                            border: "1px solid var(--border)",
                            borderRadius: "var(--radius)",
                            fontSize: 12,
                            fontFamily: "var(--font-mono)",
                            background: "var(--card)",
                            color: "var(--foreground)",
                            outline: "none",
                            width: "100%",
                            cursor: "pointer",
                          }}
                        >
                          {TRACK_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <Label>Level</Label>
                        <select
                          value={courseForm.level}
                          onChange={(e) =>
                            setCourseFormDirty((f) => ({
                              ...f,
                              level: e.target.value,
                            }))
                          }
                          style={{
                            height: 34,
                            padding: "0 12px",
                            border: "1px solid var(--border)",
                            borderRadius: "var(--radius)",
                            fontSize: 12,
                            fontFamily: "var(--font-mono)",
                            background: "var(--card)",
                            color: "var(--foreground)",
                            outline: "none",
                            width: "100%",
                            cursor: "pointer",
                          }}
                        >
                          <option value="beginner">Beginner</option>
                          <option value="intermediate">Intermediate</option>
                          <option value="advanced">Advanced</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <Label>Language</Label>
                        <Input
                          value={courseForm.language}
                          onChange={(e) =>
                            setCourseFormDirty((f) => ({
                              ...f,
                              language: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <Label>Price</Label>
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          value={courseForm.price}
                          onChange={(e) =>
                            setCourseFormDirty((f) => ({
                              ...f,
                              price: e.target.value,
                            }))
                          }
                        />
                      </div>
                    </div>

                    <ListEditorField
                      label="What you'll learn"
                      value={courseForm.what_you_will_learn || []}
                      onChange={(items) =>
                        setCourseFormDirty((f) => ({
                          ...f,
                          what_you_will_learn: items,
                        }))
                      }
                      placeholder="Add a learning outcome and press Enter"
                      helperText="Add concise outcomes that describe what students will know after completing the course."
                      error={courseErrors.what_you_will_learn?.[0]}
                      maxItems={12}
                    />

                    <ListEditorField
                      label="Included in the price section"
                      value={courseForm.price_benefits || []}
                      onChange={(items) =>
                        setCourseFormDirty((f) => ({
                          ...f,
                          price_benefits: items,
                        }))
                      }
                      placeholder="Add a pricing benefit"
                      helperText="These items appear beside the price card. Keep the default course benefits or replace them with subscription perks later."
                      error={courseErrors.price_benefits?.[0]}
                      maxItems={6}
                    />

                    <ListEditorField
                      label="Tags"
                      value={courseForm.tags || []}
                      onChange={(items) =>
                        setCourseFormDirty((f) => ({
                          ...f,
                          tags: items,
                        }))
                      }
                      placeholder="Add a tag and press Enter"
                      helperText="Use 3-5 tags. They are normalized to lowercase, GitHub-style slugs."
                      error={courseErrors.tags?.[0]}
                      maxItems={5}
                      normalizeItem={normalizeCourseTag}
                    />

                    <div className="space-y-1">
                      <Label>Description</Label>
                      <Textarea
                        value={courseForm.description}
                        onChange={(e) =>
                          setCourseFormDirty((f) => ({
                            ...f,
                            description: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>

                  <Separator />

                  <div className="flex flex-wrap gap-2">
                    {isAdmin ? (
                      <>
                        <Button
                          onClick={() => saveCourse(true)}
                          disabled={saving}
                        >
                          {saving ? "Saving…" : "Save & Publish"}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => saveCourse(false)}
                          disabled={saving}
                        >
                          Save as Draft
                        </Button>
                      </>
                    ) : (
                      <Button onClick={() => saveCourse()} disabled={saving}>
                        {saving
                          ? "Saving…"
                          : isNew
                            ? "Create course"
                            : "Save course"}
                      </Button>
                    )}
                    {!isNew && !isPublished ? (
                      <Button
                        variant="destructive"
                        onClick={deleteCourse}
                        disabled={saving}
                      >
                        Delete draft
                      </Button>
                    ) : null}
                    <Button
                      variant="ghost"
                      onClick={() => navigate("/instructor/content")}
                      disabled={saving}
                    >
                      Cancel
                    </Button>
                  </div>

                  {!isNew && !isAdmin && !isPublished && (
                    <>
                      <Separator />
                      <div className="space-y-1.5">
                        <p className="text-xs text-muted-foreground">
                          Once your course is ready, request a review from an
                          admin to get it published.
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={requestPublish}
                          disabled={requestingPublish || publishRequested}
                        >
                          {publishRequested
                            ? "Publish requested ✓"
                            : requestingPublish
                              ? "Requesting…"
                              : "Request publish"}
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* ── LESSON CONTENT panel ── */}
              {panel === "lesson" && (
                <LessonEditorForm
                  mode={editingLesson ? "edit" : "create"}
                  title={editingLesson ? "Edit Lesson" : "New Lesson"}
                  form={lessonForm}
                  setForm={(updater) => setLessonFormDirty(updater)}
                  videoContext={{
                    courseSlug: course?.slug || "course",
                    moduleId: editingModule?.id,
                    lessonTitleFallback: lessonForm.title,
                  }}
                  primaryLabel={lessonPrimaryLabel}
                  onSubmitForReview={() => {
                    if (
                      isAdmin &&
                      pendingLessonRevision?.status === "pending_unpublish"
                    ) {
                      (async () => {
                        setSaving(true);
                        try {
                          await client.patch(
                            `/admin/moderation-queue/lesson-revisions/${pendingLessonRevision.id}`,
                            { action: "accept" },
                          );
                          toast.success("Lesson unpublished.");
                          await loadCourse();
                          window.dispatchEvent(new Event("moderation:changed"));
                        } catch (err) {
                          toast.error(
                            getApiErrorMessage(
                              err,
                              "Failed to approve revision.",
                            ),
                          );
                        } finally {
                          setSaving(false);
                        }
                      })();
                    } else {
                      saveLesson(isAdmin ? "published" : "pending_review");
                    }
                  }}
                  onDraft={() => saveLesson("draft")}
                  onUnpublish={
                    editingLesson?.is_published
                      ? isAdmin
                        ? () => unpublishLesson(editingLesson, editingModule)
                        : () =>
                            requestLessonUnpublish(editingLesson, editingModule)
                      : undefined
                  }
                  tertiaryLabel={
                    editingLesson?.is_published && !isAdmin
                      ? "Request unpublish"
                      : undefined
                  }
                  onCancel={() => {
                    setPanel("course");
                    setEditingLesson(null);
                  }}
                  onDelete={
                    editingLesson
                      ? () => deleteLesson(editingLesson, editingModule)
                      : undefined
                  }
                  saving={saving}
                />
              )}

              {/* ── QUIZ panel ── */}
              {panel === "quiz" && (
                <QuizEditorForm
                  mode={editingQuiz ? "edit" : "create"}
                  title={editingQuiz ? "Edit Quiz" : "New Quiz"}
                  form={quizForm}
                  setForm={(updater) => setQuizFormDirty(updater)}
                  primaryLabel={quizPrimaryLabel}
                  isAdmin={isAdmin}
                  questions={quizQuestions}
                  setQuestions={(updater) => {
                    setQuizQuestions(updater);
                    setDirty(true);
                  }}
                  onSave={saveQuiz}
                  onSubmitForReview={() => {
                    if (
                      isAdmin &&
                      pendingQuizRevision?.status === "pending_unpublish"
                    ) {
                      (async () => {
                        setSaving(true);
                        try {
                          await client.patch(
                            `/admin/moderation-queue/quiz-revisions/${pendingQuizRevision.id}`,
                            { action: "accept" },
                          );
                          toast.success("Quiz unpublished.");
                          await loadCourse();
                          window.dispatchEvent(new Event("moderation:changed"));
                        } catch (err) {
                          toast.error(
                            getApiErrorMessage(
                              err,
                              "Failed to approve revision.",
                            ),
                          );
                        } finally {
                          setSaving(false);
                        }
                      })();
                    } else {
                      saveQuiz({
                        title: quizForm.title,
                        pass_score: quizForm.pass_score ?? 70,
                        estimated_time_minutes:
                          quizForm.estimated_time_minutes ?? 0,
                        time_limit_seconds: quizForm.time_limit_seconds ?? 0,
                        is_published: true,
                        revision_status: "published",
                        questions: (quizQuestions ?? []).map((q, idx) => ({
                          ...questionFormToPayload(q),
                          position: idx + 1,
                        })),
                      });
                    }
                  }}
                  onUnpublish={
                    editingQuiz?.is_published
                      ? isAdmin
                        ? () => unpublishQuiz(editingQuiz)
                        : () => requestQuizUnpublish(editingQuiz)
                      : undefined
                  }
                  tertiaryLabel={
                    editingQuiz?.is_published && !isAdmin
                      ? "Request unpublish"
                      : undefined
                  }
                  onCancel={() => {
                    setPanel("course");
                    setEditingQuiz(null);
                  }}
                  onDelete={
                    editingQuiz ? () => deleteQuiz(editingQuiz) : undefined
                  }
                  saving={saving}
                />
              )}
            </div>
          </div>

          {/* RIGHT: Course structure panel */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              background: "var(--card)",
            }}
          >
            <div
              style={{
                padding: "12px 14px",
                borderBottom: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  color: "var(--muted-foreground)",
                  letterSpacing: ".06em",
                }}
              >
                // COURSE STRUCTURE
              </span>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  color: "#3a3a3a",
                }}
              >
                drag to reorder
              </span>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: 8 }}>
              {!isNew ? (
                <>
                  {modules.length === 0 && (
                    <p
                      style={{
                        fontSize: 11,
                        fontFamily: "var(--font-mono)",
                        color: "#3a3a3a",
                        padding: "6px 4px",
                      }}
                    >
                      No modules yet. Add one below.
                    </p>
                  )}

                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={({ active, over }) => {
                      if (!over || active.id === over.id) return;
                      const oldIndex = modules.findIndex(
                        (m) => `module-${m.id}` === active.id,
                      );
                      const newIndex = modules.findIndex(
                        (m) => `module-${m.id}` === over.id,
                      );
                      handleModuleReorder(
                        arrayMove(modules, oldIndex, newIndex),
                      );
                    }}
                  >
                    <SortableContext
                      items={modules.map((m) => `module-${m.id}`)}
                      strategy={verticalListSortingStrategy}
                    >
                      {modules.map((module) => (
                        <SortableModule
                          key={module.id}
                          module={module}
                          onEditLesson={openEditLesson}
                          onEditQuiz={openEditQuiz}
                          onDeleteLesson={deleteLesson}
                          onDeleteQuiz={deleteQuiz}
                          onReorder={handleReorder}
                          onAddLesson={openNewLesson}
                          onAddQuiz={openNewQuiz}
                          onRename={handleModuleRename}
                          onDelete={deleteModule}
                          editingModuleId={editingModuleId}
                          editingModuleTitle={editingModuleTitle}
                          setEditingModuleTitle={setEditingModuleTitle}
                          saving={saving}
                          isCollapsed={collapsedModules[module.id] || false}
                          onToggleCollapse={(moduleId) =>
                            setCollapsedModules((prev) => ({
                              ...prev,
                              [moduleId]: !prev[moduleId],
                            }))
                          }
                        />
                      ))}
                    </SortableContext>
                  </DndContext>

                  {/* Add module */}
                  <div
                    style={{
                      background: "var(--bg)",
                      border: "1px solid var(--border)",
                      borderRadius: 6,
                      marginTop: 4,
                      padding: "10px 12px",
                    }}
                  >
                    <p
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 10,
                        color: "#3a3a3a",
                        letterSpacing: ".08em",
                        marginBottom: 8,
                        textTransform: "uppercase",
                      }}
                    >
                      Add module
                    </p>
                    <form
                      style={{ display: "flex", gap: 6 }}
                      onSubmit={addModule}
                    >
                      <input
                        required
                        value={moduleTitle}
                        onChange={(e) => setModuleTitle(e.target.value)}
                        placeholder="Module title"
                        style={{
                          flex: 1,
                          height: 30,
                          padding: "0 10px",
                          border: "1px solid var(--border)",
                          borderRadius: 4,
                          fontSize: 11,
                          fontFamily: "var(--font-mono)",
                          background: "var(--card)",
                          color: "var(--text)",
                          outline: "none",
                        }}
                      />
                      <button
                        type="submit"
                        disabled={saving}
                        style={{
                          height: 30,
                          padding: "0 10px",
                          background: "transparent",
                          color: "var(--muted-foreground)",
                          border: "1px solid #2a2a2a",
                          borderRadius: 4,
                          fontSize: 11,
                          fontFamily: "var(--font-mono)",
                          cursor: "pointer",
                          whiteSpace: "nowrap",
                        }}
                      >
                        <i
                          className="ti ti-plus"
                          style={{ fontSize: 12, marginRight: 4 }}
                        />
                        Add
                      </button>
                    </form>
                  </div>

                  <div
                    style={{
                      background: "var(--bg)",
                      border: "1px solid var(--border)",
                      borderRadius: 6,
                      marginTop: 8,
                      padding: "10px 12px",
                    }}
                  >
                    <p
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 10,
                        color: "#3a3a3a",
                        letterSpacing: ".08em",
                        marginBottom: 8,
                        textTransform: "uppercase",
                      }}
                    >
                      Lesson videos
                    </p>

                    {lessonVideos.length === 0 ? (
                      <p
                        style={{
                          fontSize: 11,
                          fontFamily: "var(--font-mono)",
                          color: "#3a3a3a",
                        }}
                      >
                        No uploaded videos in this course yet.
                      </p>
                    ) : (
                      <div style={{ overflowX: "auto" }}>
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1.2fr 1fr 1fr 1.2fr auto",
                            gap: 8,
                            minWidth: 720,
                            fontSize: 11,
                            fontFamily: "var(--font-mono)",
                            color: "var(--muted-foreground)",
                            paddingBottom: 6,
                            borderBottom: "1px solid var(--border)",
                          }}
                        >
                          <span>Course</span>
                          <span>Module</span>
                          <span>Lesson</span>
                          <span>Video file</span>
                          <span>Actions</span>
                        </div>

                        {lessonVideos.map(
                          ({
                            lesson,
                            lessonId,
                            module,
                            videoName,
                            courseTitle,
                            moduleTitle,
                            lessonSnapshot,
                          }) => {
                            const watchUrl = resolveBackendAssetUrl(
                              lessonSnapshot.video_url ||
                                (lessonSnapshot.video_path
                                  ? `/storage/${lessonSnapshot.video_path}`
                                  : ""),
                            );

                            return (
                              <div
                                key={lesson.id}
                                style={{
                                  display: "grid",
                                  gridTemplateColumns:
                                    "1.2fr 1fr 1fr 1.2fr auto",
                                  gap: 8,
                                  alignItems: "center",
                                  padding: "8px 0",
                                  borderBottom: "1px solid var(--border)",
                                  minWidth: 720,
                                }}
                              >
                                <span
                                  style={{
                                    fontSize: 11,
                                    color: "var(--foreground)",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {courseTitle}
                                </span>
                                <span
                                  style={{
                                    fontSize: 11,
                                    color: "var(--foreground)",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {moduleTitle}
                                </span>
                                <span
                                  style={{
                                    fontSize: 11,
                                    color: "var(--foreground)",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {lesson.title}
                                </span>
                                <span
                                  style={{
                                    fontSize: 11,
                                    color: "var(--foreground)",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {videoName}
                                </span>
                                <div style={{ display: "flex", gap: 6 }}>
                                  <Button
                                    asChild
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs rounded-[var(--radius)]"
                                  >
                                    <Link
                                      to={`/learning/${courseId}?lesson=${lessonId}`}
                                    >
                                      Watch
                                    </Link>
                                  </Button>
                                  <Button
                                    asChild
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs rounded-[var(--radius)]"
                                  >
                                    <a
                                      href={watchUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                    >
                                      File
                                    </a>
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 text-xs rounded-[var(--radius)]"
                                    onClick={() =>
                                      openEditLesson(lesson, module)
                                    }
                                  >
                                    Edit
                                  </Button>
                                </div>
                              </div>
                            );
                          },
                        )}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div
                  style={{
                    border: "1px dashed #2a2a2a",
                    borderRadius: 6,
                    padding: "36px 24px",
                    textAlign: "center",
                  }}
                >
                  <p
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 11,
                      color: "#3a3a3a",
                    }}
                  >
                    Modules, lessons and quizzes will appear here after you
                    create the course.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <VideoUploadModal
        open={videoUploadModal.open}
        fileName={videoUploadModal.fileName}
        progress={videoUploadModal.progress}
        status={videoUploadModal.status}
        error={videoUploadModal.error}
        mode={videoUploadModal.mode}
        onCancel={cancelVideoUpload}
        onDone={closeVideoUploadModal}
      />
    </TooltipProvider>
  );
}
