import { useEffect, useMemo, useState } from "react";
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
import {
  BookOpen,
  FileQuestion,
  Pencil,
  Trash2,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PageHeader } from "@/components/common/PageHeader";
import { LoadingState } from "@/components/common/LoadingState";
import PublishStatusPill from "@/components/common/PublishStatusPill";
import {
  LessonEditorForm,
  QuizEditorForm,
  makeEmptyQuestion,
  questionToForm,
} from "@/components/instructor/ContentEditors";
import { buildModuleContentItems } from "@/components/instructor/buildCourseContentItems";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { getApiErrorMessage, slugify } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const EMPTY_COURSE = {
  title: "",
  slug: "",
  description: "",
  subtitle: "",
  category: "",
  level: "beginner",
  language: "en",
  price: 0,
  is_published: false,
};

const EMPTY_LESSON = { title: "", content: "", is_published: false };
const EMPTY_QUIZ_FORM = { title: "", pass_score: 70, is_published: false };

function pendingCourseKey(id) {
  return `techtutor_pending_course_${id}`;
}

function courseToForm(course) {
  return {
    title: course.title || "",
    slug: course.slug || "",
    description: course.description || "",
    subtitle: course.subtitle || "",
    category: course.category || "",
    level: course.level || "beginner",
    language: course.language || "en",
    price: course.price || 0,
    is_published: Boolean(course.is_published),
  };
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

  const Icon = item._type === "lesson" ? BookOpen : FileQuestion;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group flex items-center gap-2 px-3 py-2 rounded-md border bg-card text-sm"
    >
      <span
        {...attributes}
        {...listeners}
        className="cursor-grab text-muted-foreground/40 hover:text-muted-foreground select-none shrink-0"
      >
        ⠿
      </span>
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
      <span className="flex-1 truncate">{item.title}</span>
      <PublishStatusPill status={item.is_published ? "published" : "draft"} />
      <div className="hidden group-hover:flex gap-1 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onEdit}
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive"
          onClick={onDelete}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
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
    <Card>
      <CardContent className="pt-4 space-y-3">
        {isEditing ? (
          <form
            className="flex items-center gap-2"
            onSubmit={(e) => onRename(e, module)}
          >
            <Input
              autoFocus
              value={editingModuleTitle}
              onChange={(e) => setEditingModuleTitle(e.target.value)}
              className="h-8 text-sm flex-1"
            />
            <Button
              type="submit"
              size="sm"
              className="rounded-[var(--radius)]"
              disabled={saving}
            >
              Save
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => onRename(null, null)}
            >
              Cancel
            </Button>
          </form>
        ) : (
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-1">
              {dragListeners && dragAttributes && (
                <span
                  {...dragAttributes}
                  {...dragListeners}
                  className="cursor-grab text-muted-foreground/40 hover:text-muted-foreground select-none shrink-0"
                >
                  ⠿
                </span>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 p-0"
                onClick={() => onToggleCollapse(module.id)}
              >
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${
                    isCollapsed ? "-rotate-90" : ""
                  }`}
                />
              </Button>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {module.title}
              </p>
            </div>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => onRename("start", module)}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive"
                onClick={() => onDelete(module)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}

        {!isCollapsed && (
          <>
            {items.length === 0 ? (
              <p className="text-xs text-muted-foreground">
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
                  <div className="space-y-1.5">
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
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </>
        )}

        <Separator />

        {!isCollapsed && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="rounded-[var(--radius)]"
              onClick={() => onAddLesson(module)}
            >
              + Lesson
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="rounded-[var(--radius)]"
              onClick={() => onAddQuiz(module)}
            >
              + Quiz
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
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
    if (fromState && String(fromState.id) === String(courseId))
      return fromState;
    if (!courseId) return null;
    const cached = sessionStorage.getItem(pendingCourseKey(courseId));
    if (!cached) return null;
    try {
      const parsed = JSON.parse(cached);
      sessionStorage.removeItem(pendingCourseKey(courseId));
      return String(parsed.id) === String(courseId) ? parsed : null;
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
  const [publishRequested, setPublishRequested] = useState(false);
  const [requestingPublish, setRequestingPublish] = useState(false);

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
    const fullCourse = { ...data, modules: modulesRes.data ?? [] };
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

    const payload = {
      ...courseForm,
      slug: courseForm.slug || slugify(courseForm.title),
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
        sessionStorage.setItem(pendingCourseKey(data.id), JSON.stringify(data));
        navigate(`/instructor/courses/${data.id}`, {
          replace: true,
          state: { course: data },
        });
        return;
      }
      await client.put(`/courses/${courseId}`, payload);
      await loadCourse();
      toast.success("Course saved.");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to save course."));
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
    setPanel("lesson");
  }

  function openEditLesson(lesson, module) {
    setLessonForm({
      title: lesson.title,
      content: lesson.content || "",
      is_published: lesson.is_published ?? false,
    });
    setEditingLesson(lesson);
    setEditingModule(module);
    setPanel("lesson");
  }

  async function saveLesson(isPublished) {
    setSaving(true);
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
        type: "text",
        is_published: isAdmin ? isPublished : false,
        position: nextPosition,
      };
      if (editingLesson) {
        await client.put(
          `/modules/${editingModule.id}/lessons/${editingLesson.id}`,
          payload,
        );
      } else {
        await client.post(`/modules/${editingModule.id}/lessons`, payload);
      }
      await loadCourse();
      setPanel("course");
      setEditingLesson(null);

      if (!isAdmin && isPublished) {
        toast.success(
          "Lesson saved. To publish, please request approval from an admin.",
        );
      } else {
        toast.success("Lesson saved.");
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to save lesson."));
    } finally {
      setSaving(false);
    }
  }

  async function deleteLesson(lesson, module) {
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
      await client.patch(`/courses/${course.id}/modules/reorder`, {
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
    setPanel("quiz");
  }

  function openEditQuiz(quiz, module) {
    setQuizForm({
      title: quiz.title,
      pass_score: quiz.pass_score ?? 70,
      is_published: quiz.is_published ?? false,
    });
    setEditingQuiz(quiz);
    setEditingModule(module);
    setQuizQuestions((quiz.questions ?? []).map(questionToForm));
    setPanel("quiz");
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
        is_published: isAdmin ? payload.is_published : false,
      };
      if (editingQuiz) {
        await client.put(
          `/courses/${courseId}/quizzes/${editingQuiz.id}`,
          fullPayload,
        );
      } else {
        await client.post(`/courses/${courseId}/quizzes`, fullPayload);
      }
      await loadCourse();
      setPanel("course");
      setEditingQuiz(null);

      if (!isAdmin && payload.is_published) {
        toast.success(
          "Quiz saved. To publish, please request approval from an admin.",
        );
      } else {
        toast.success("Quiz saved.");
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to save quiz."));
    } finally {
      setSaving(false);
    }
  }

  async function deleteQuiz(quiz, module) {
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

  // ---------------------------------------------------------------------------
  // Derived
  // ---------------------------------------------------------------------------

  const modules = course?.modules || [];
  const totalItems = modules.reduce(
    (sum, m) => sum + (m.lessons?.length ?? 0) + (m.quizzes?.length ?? 0),
    0,
  );
  const isPublished = course?.is_published ?? false;

  if (loading) return <LoadingState />;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <TooltipProvider>
      <section>
        <PageHeader
          title={isNew ? "Create course" : "Edit course"}
          description="Manage course metadata, modules, lessons and quizzes."
          actions={
            !isNew ? (
              <Button variant="outline" asChild>
                <Link to={`/courses/${courseId}`}>View public page</Link>
              </Button>
            ) : null
          }
        />

        <div className="grid grid-cols-2 gap-6 items-start">
          <div className="space-y-4">
            {panel === "course" && (
              <Card>
                <CardContent className="pt-6 space-y-4">
                  <button
                    type="button"
                    onClick={() => navigate("/instructor/content")}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    ← Content
                  </button>

                  <h2 className="text-lg font-semibold">
                    {isNew
                      ? "New Course"
                      : `Edit: ${courseForm.title || "Untitled"}`}
                  </h2>

                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label>Title</Label>
                      <Input
                        required
                        value={courseForm.title}
                        onChange={(e) =>
                          setCourseForm((f) => ({
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
                          setCourseForm((f) => ({ ...f, slug: e.target.value }))
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
                          setCourseForm((f) => ({
                            ...f,
                            price: e.target.value,
                          }))
                        }
                      />
                    </div>

                    <div className="space-y-1">
                      <Label>Description</Label>
                      <Textarea
                        value={courseForm.description}
                        onChange={(e) =>
                          setCourseForm((f) => ({
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
                </CardContent>
              </Card>
            )}

            {panel === "lesson" && (
              <LessonEditorForm
                mode={editingLesson ? "edit" : "create"}
                backLabel="Back to Course"
                title={editingLesson ? "Edit Lesson" : "New Lesson"}
                form={lessonForm}
                setForm={setLessonForm}
                onBack={() => {
                  setPanel("course");
                  setEditingLesson(null);
                }}
                onPublish={() => saveLesson(true)}
                onDraft={() => saveLesson(false)}
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

            {panel === "quiz" && (
              <QuizEditorForm
                mode={editingQuiz ? "edit" : "create"}
                backLabel="Back to Course"
                title={editingQuiz ? "Edit Quiz" : "New Quiz"}
                form={quizForm}
                setForm={setQuizForm}
                questions={quizQuestions}
                setQuestions={setQuizQuestions}
                onBack={() => {
                  setPanel("course");
                  setEditingQuiz(null);
                }}
                onSave={saveQuiz}
                onCancel={() => {
                  setPanel("course");
                  setEditingQuiz(null);
                }}
                onDelete={
                  editingQuiz
                    ? () => deleteQuiz(editingQuiz, editingModule)
                    : undefined
                }
                saving={saving}
              />
            )}
          </div>

          <div className="space-y-3">
            {!isNew && (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">
                    Course Content ({totalItems} item
                    {totalItems !== 1 ? "s" : ""})
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Drag to reorder
                  </p>
                </div>

                {modules.length === 0 && (
                  <p className="text-xs text-muted-foreground">
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
                    handleModuleReorder(arrayMove(modules, oldIndex, newIndex));
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

                <Card>
                  <CardContent className="pt-4 space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Add module
                    </p>
                    <form className="flex items-end gap-2" onSubmit={addModule}>
                      <div className="flex-1 space-y-1">
                        <Label>Module title</Label>
                        <Input
                          required
                          value={moduleTitle}
                          onChange={(e) => setModuleTitle(e.target.value)}
                        />
                      </div>
                      <Button
                        type="submit"
                        variant="outline"
                        size="sm"
                        className="rounded-[var(--radius)]"
                        disabled={saving}
                      >
                        + Module
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </>
            )}

            {isNew && (
              <div className="rounded-lg border border-dashed px-6 py-10 text-center text-sm text-muted-foreground">
                Modules, lessons and quizzes will appear here after you create
                the course.
              </div>
            )}
          </div>
        </div>
      </section>
    </TooltipProvider>
  );
}
