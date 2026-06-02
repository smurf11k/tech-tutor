import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import LessonMDEditor from "@/components/markdown/LessonMarkdownEditor";
import { resolveBackendAssetUrl, slugify } from "@/lib/utils";

const VIDEO_FILE_PATTERN = /\.(mp4|mov|webm|m4v|avi|mkv)(?:[?#].*)?$/i;

function getFileExtension(fileName) {
  const match = String(fileName || "").match(/\.([^.]+)$/);
  return match ? match[1].toLowerCase() : "mp4";
}

function buildVideoFileName(courseSlug, lessonTitle, originalName) {
  const timestamp = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "")
    .replace("T", "-");
  const baseName =
    slugify([courseSlug, lessonTitle, timestamp].filter(Boolean).join("-")) ||
    "lesson-video";
  return `${baseName}.${getFileExtension(originalName)}`;
}

function buildVideoPath(moduleId, fileName) {
  return `lesson-videos/module-${moduleId}/${fileName}`;
}

function stripVideoMarkdown(content = "") {
  return content
    .replace(
      /\n{2,}\[[^\]]+\]\([^)]*\.(?:mp4|mov|webm|m4v|avi|mkv)(?:\?[^)]*)?\)\s*/gi,
      "\n\n",
    )
    .trimEnd();
}

// ---------------------------------------------------------------------------
// Video drop zone (lesson panel)
// ---------------------------------------------------------------------------

function VideoDropZone({ videoFile, onVideoFileChange }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file && file.type.startsWith("video/")) onVideoFileChange(file);
    },
    [onVideoFileChange],
  );

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      style={{
        border: `1px dashed ${dragging ? "var(--green-mid)" : "var(--border2, #2a2a2a)"}`,
        background: dragging ? "var(--green-dim)" : "transparent",
        borderRadius: 6,
        padding: "20px 16px",
        textAlign: "center",
        cursor: "pointer",
        transition: "border-color .15s, background .15s",
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onVideoFileChange(file);
        }}
      />
      <i
        className="ti ti-video"
        style={{
          fontSize: 22,
          color: "var(--text3, #3a3a3a)",
          display: "block",
          marginBottom: 6,
        }}
      />
      {videoFile ? (
        <p
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--primary)",
          }}
        >
          {videoFile.name}
        </p>
      ) : (
        <>
          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--muted-foreground)",
            }}
          >
            Drop your video here or{" "}
            <span style={{ color: "var(--primary)" }}>browse files</span>
          </p>
          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              color: "var(--text3, #3a3a3a)",
              marginTop: 4,
            }}
          >
            MP4, MOV up to 4 GB
          </p>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared primitives
// ---------------------------------------------------------------------------

export function EditorHeader({ backLabel, title, onBack, className = "" }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {onBack && (
        <Button
          type="button"
          onClick={onBack}
          variant="outline"
          size="sm"
          className="h-8 rounded-[var(--radius)] px-3 text-xs text-muted-foreground"
        >
          ← {backLabel}
        </Button>
      )}
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
    </div>
  );
}

export function EditorCard({ children, className = "" }) {
  return (
    <Card className="border-border/70">
      <CardContent
        className={`space-y-5 px-4 py-3 sm:px-5 sm:py-4 ${className}`}
      >
        {children}
      </CardContent>
    </Card>
  );
}

export function EditorActions({
  className = "",
  primaryLabel,
  onPrimary,
  primaryDisabled,
  primaryVariant = "default",
  secondaryLabel,
  onSecondary,
  secondaryDisabled,
  secondaryVariant = "outline",
  tertiaryLabel,
  onTertiary,
  tertiaryDisabled,
  tertiaryVariant = "outline",
  destructiveLabel,
  onDestructive,
  destructiveDisabled,
  destructiveVariant = "destructive",
}) {
  return (
    <div className={`flex flex-wrap gap-2 pt-1 ${className}`}>
      {primaryLabel && (
        <Button
          size="sm"
          variant={primaryVariant}
          className="rounded-[var(--radius)]"
          onClick={onPrimary}
          disabled={primaryDisabled}
        >
          {primaryLabel}
        </Button>
      )}
      {secondaryLabel && (
        <Button
          size="sm"
          variant={secondaryVariant}
          className="rounded-[var(--radius)]"
          onClick={onSecondary}
          disabled={secondaryDisabled}
        >
          {secondaryLabel}
        </Button>
      )}
      {tertiaryLabel && (
        <Button
          size="sm"
          variant={tertiaryVariant}
          className="rounded-[var(--radius)]"
          onClick={onTertiary}
          disabled={tertiaryDisabled}
        >
          {tertiaryLabel}
        </Button>
      )}
      {destructiveLabel && (
        <Button
          size="sm"
          variant={destructiveVariant}
          className="rounded-[var(--radius)]"
          onClick={onDestructive}
          disabled={destructiveDisabled}
        >
          {destructiveLabel}
        </Button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Lesson editor
// ---------------------------------------------------------------------------

export function LessonEditorForm({
  mode,
  backLabel,
  title,
  form,
  setForm,
  videoContext,
  onBack,
  primaryLabel = "Submit for Review",
  secondaryLabel = "Save Draft",
  tertiaryLabel,
  onSubmitForReview,
  onDraft,
  onUnpublish,
  onCancel,
  onDelete,
  saving,
}) {
  const isEdit = mode === "edit";
  const existingVideoName =
    form.video_name ||
    form.video_path?.split("/").pop() ||
    form.video_url?.split("/").pop() ||
    "";

  const handleVideoFileChange = (file) => {
    const videoName = buildVideoFileName(
      videoContext?.courseSlug,
      form.title || videoContext?.lessonTitleFallback,
      file.name,
    );
    const videoPath = buildVideoPath(videoContext?.moduleId, videoName);

    setForm((current) => ({
      ...current,
      videoFile: file,
      video_name: videoName,
      video_path: videoPath,
      remove_video: false,
      content: stripVideoMarkdown(current.content || ""),
    }));
  };

  const handleRemoveVideo = () => {
    setForm((current) => ({
      ...current,
      videoFile: null,
      video_name: "",
      video_path: "",
      video_url: "",
      remove_video: true,
      content: stripVideoMarkdown(current.content || ""),
    }));
  };

  return (
    <div className="space-y-4">
      <EditorHeader backLabel={backLabel} title={title} onBack={onBack} />

      <EditorCard>
        <div className="space-y-1">
          <Label>Lesson Title</Label>
          <Input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="e.g. Intro to React Hooks"
          />
        </div>

        <div className="space-y-1">
          <Label>Estimated Time (min)</Label>
          <Input
            type="number"
            min={0}
            value={form.estimated_time_minutes ?? 0}
            onChange={(e) =>
              setForm({
                ...form,
                estimated_time_minutes: Number(e.target.value),
              })
            }
            className="w-36"
          />
        </div>

        <div className="space-y-1">
          <Label>Video</Label>
          <div className="space-y-3">
            <VideoDropZone
              videoFile={form.videoFile}
              onVideoFileChange={handleVideoFileChange}
            />
            {(form.videoFile || form.video_url) && (
              <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                <span className="font-mono text-[11px] text-foreground">
                  {form.videoFile?.name || existingVideoName}
                </span>
                {form.video_url ? (
                  <a
                    href={resolveBackendAssetUrl(form.video_url)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline"
                  >
                    Watch
                  </a>
                ) : null}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={handleRemoveVideo}
                >
                  Remove video
                </Button>
              </div>
            )}
            {form.video_name ? (
              <p className="text-[11px] text-muted-foreground">
                Inserted as{" "}
                <span className="font-mono">[{form.video_name}]</span>
              </p>
            ) : null}
          </div>
        </div>

        <div className="space-y-1">
          <Label>Content</Label>
          <LessonMDEditor
            value={form.content}
            onChange={(value) => setForm({ ...form, content: value })}
          />
        </div>

        <Separator />

        <EditorActions
          primaryLabel={primaryLabel}
          onPrimary={onSubmitForReview}
          primaryDisabled={saving}
          secondaryLabel={secondaryLabel}
          onSecondary={onDraft}
          secondaryDisabled={saving}
          tertiaryLabel={
            tertiaryLabel ??
            (isEdit && form.is_published && onUnpublish
              ? "Unpublish"
              : "Cancel")
          }
          onTertiary={
            isEdit && form.is_published && onUnpublish ? onUnpublish : onCancel
          }
          tertiaryDisabled={saving}
          destructiveLabel={
            onDelete
              ? isEdit && form.is_published && onUnpublish
                ? undefined
                : isEdit && form.is_published
                  ? "Unpublish Lesson"
                  : "Delete Lesson"
              : undefined
          }
          onDestructive={onDelete}
          destructiveDisabled={saving}
        />
      </EditorCard>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Question helpers — exported so QuizEditorForm can use them
// ---------------------------------------------------------------------------

const INITIAL_OPTION_KEYS = ["a", "b", "c", "d"];

export function makeEmptyQuestion() {
  return {
    type: "single_choice",
    prompt: "",
    options: INITIAL_OPTION_KEYS.map((key) => ({
      key,
      text: "",
      is_correct: false,
    })),
    points: 1,
  };
}

// Convert a saved question (correct_answers array OR is_correct per-option) back to form shape
export function questionToForm(q) {
  const hasCorrectAnswers =
    Array.isArray(q.correct_answers) && q.correct_answers.length > 0;
  return {
    type: q.type ?? "single_choice",
    prompt: q.prompt ?? "",
    options: (q.options ?? []).map((opt) => ({
      key: opt.key,
      text: opt.text,
      is_correct: hasCorrectAnswers
        ? q.correct_answers.includes(opt.key)
        : Boolean(opt.is_correct),
    })),
    points: q.points ?? 1,
  };
}

// Convert form shape -> API payload shape.
// Backend reads is_correct from inside each option to derive correct_answers,
// so we must keep is_correct in the options array.
export function questionFormToPayload(form) {
  return {
    type: form.type,
    prompt: form.prompt,
    points: form.points,
    options: form.options.map(({ key, text, is_correct }) => ({
      key,
      text,
      is_correct: Boolean(is_correct),
    })),
  };
}

// ---------------------------------------------------------------------------
// Inline question editor card
// ---------------------------------------------------------------------------

function QuestionEditorCard({ mode, form, setForm, saving, onSave, onCancel }) {
  const isEdit = mode === "edit";

  const setOption = (index, field, value) => {
    const options = form.options.map((opt, i) => {
      if (field === "is_correct" && value && form.type === "single_choice") {
        return i === index
          ? { ...opt, is_correct: true }
          : { ...opt, is_correct: false };
      }
      return i === index ? { ...opt, [field]: value } : opt;
    });
    setForm({ ...form, options });
  };

  const addOption = () => {
    if (form.options.length >= 8) return;
    const nextKey = String.fromCharCode(97 + form.options.length);
    setForm({
      ...form,
      options: [...form.options, { key: nextKey, text: "", is_correct: false }],
    });
  };

  const removeOption = (index) => {
    if (form.options.length <= 2) return;
    setForm({ ...form, options: form.options.filter((_, i) => i !== index) });
  };

  return (
    <EditorCard>
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        {isEdit ? "Edit Question" : "New Question"}
      </p>

      <div className="space-y-1">
        <Label className="text-xs">Question Type</Label>
        <select
          value={form.type}
          onChange={(e) => setForm({ ...form, type: e.target.value })}
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
            maxWidth: 280,
            cursor: "pointer",
          }}
        >
          <option value="single_choice">Single Choice</option>
          <option value="multiple_choice">Multiple Choice</option>
        </select>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Prompt</Label>
        <Textarea
          value={form.prompt}
          onChange={(e) => setForm({ ...form, prompt: e.target.value })}
          rows={2}
          placeholder="Question text"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs">
            Options{" "}
            <span className="text-muted-foreground font-normal">
              — tick correct answer{form.type === "multiple_choice" ? "s" : ""}
            </span>
          </Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={addOption}
            disabled={form.options.length >= 8}
          >
            <i
              className="ti ti-plus"
              style={{ fontSize: 11, marginRight: 4 }}
            />{" "}
            Add option
          </Button>
        </div>

        <div className="space-y-2">
          {form.options.map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type={form.type === "single_choice" ? "radio" : "checkbox"}
                name={`correct_${form.prompt}`}
                checked={opt.is_correct}
                onChange={(e) => setOption(i, "is_correct", e.target.checked)}
                className="shrink-0"
              />
              <span className="text-xs font-mono text-muted-foreground w-4 shrink-0 select-none">
                {String.fromCharCode(65 + form.options.indexOf(opt))}.
              </span>
              <Input
                value={opt.text}
                onChange={(e) => setOption(i, "text", e.target.value)}
                placeholder={`Option ${opt.key.toUpperCase()}`}
                className="flex-1 h-8 text-sm"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                onClick={() => removeOption(i)}
                disabled={form.options.length <= 2}
              >
                <i className="ti ti-trash" style={{ fontSize: 14 }} />
              </Button>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Points</Label>
        <Input
          type="number"
          min={1}
          max={100}
          value={form.points}
          onChange={(e) => setForm({ ...form, points: Number(e.target.value) })}
          className="w-24 h-8 text-sm"
        />
      </div>

      <EditorActions
        primaryLabel={isEdit ? "Save Question" : "Add Question"}
        onPrimary={onSave}
        primaryDisabled={saving}
        tertiaryLabel="Cancel"
        onTertiary={onCancel}
        tertiaryDisabled={saving}
      />
    </EditorCard>
  );
}

// ---------------------------------------------------------------------------
// Quiz editor — manages questions locally, saves all at once via quiz payload
// ---------------------------------------------------------------------------

export function QuizEditorForm({
  mode,
  backLabel,
  title,
  form,
  setForm,
  primaryLabel = "Submit for Review",
  secondaryLabel = "Save Draft",
  tertiaryLabel,
  questions, // array of question form objects (already in form shape)
  setQuestions,
  onBack,
  onSave, // called with (quizPayload) — includes questions
  onSubmitForReview, // if provided, called instead of onSave for primary action
  onDraft, // if provided, called instead of onSave("draft") for secondary action
  onUnpublish, // if provided, shown as tertiary when quiz is published
  onCancel,
  onDelete,
  saving,
  isAdmin = false,
  hint = "Questions are saved together with the quiz.",
}) {
  const isEdit = mode === "edit";

  // Local state for the inline question editor
  const [editingIndex, setEditingIndex] = useState(null); // null | "new" | number
  const [questionForm, setQuestionForm] = useState(makeEmptyQuestion());

  const handleSaveQuestion = () => {
    if (editingIndex === "new") {
      setQuestions([...questions, questionForm]);
    } else {
      setQuestions(
        questions.map((q, i) => (i === editingIndex ? questionForm : q)),
      );
    }
    setEditingIndex(null);
    setQuestionForm(makeEmptyQuestion());
  };

  const handleDeleteQuestion = (index) => {
    setQuestions(questions.filter((_, i) => i !== index));
    if (editingIndex === index) {
      setEditingIndex(null);
      setQuestionForm(makeEmptyQuestion());
    }
  };

  const handleSubmit = (revisionStatus) => {
    const payload = {
      title: form.title,
      pass_score: form.pass_score ?? 70,
      estimated_time_minutes:
        form.estimated_time_minutes > 0 ? form.estimated_time_minutes : null,
      time_limit_seconds:
        form.time_limit_seconds > 0 ? form.time_limit_seconds : null,
      is_published: revisionStatus === "published",
      revision_status: revisionStatus,
      questions: questions.map((q, idx) => ({
        ...questionFormToPayload(q),
        position: idx + 1,
      })),
    };
    onSave(payload);
  };

  // Primary action: use onSubmitForReview if provided (same pattern as LessonEditorForm),
  // otherwise fall back to handleSubmit with admin-aware status.
  const handlePrimary = onSubmitForReview
    ? onSubmitForReview
    : () => handleSubmit(isAdmin ? "published" : "pending_review");

  // Secondary action: use onDraft if provided, otherwise fall back to handleSubmit("draft").
  const handleDraft = onDraft ? onDraft : () => handleSubmit("draft");

  return (
    <div className="space-y-4">
      <EditorHeader backLabel={backLabel} title={title} onBack={onBack} />

      <EditorCard>
        <div className="space-y-1">
          <Label>Quiz Title</Label>
          <Input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="e.g. Module 1 Knowledge Check"
          />
        </div>

        <div className="flex flex-wrap gap-4">
          <div className="space-y-1">
            <Label>Pass Score (%)</Label>
            <Input
              type="number"
              min={0}
              max={100}
              value={form.pass_score ?? 70}
              onChange={(e) =>
                setForm({ ...form, pass_score: Number(e.target.value) })
              }
              className="w-32"
            />
          </div>

          <div className="space-y-1">
            <Label>Estimated Time (min)</Label>
            <Input
              type="number"
              min={0}
              value={form.estimated_time_minutes ?? 0}
              onChange={(e) =>
                setForm({
                  ...form,
                  estimated_time_minutes: Number(e.target.value),
                })
              }
              className="w-36"
            />
          </div>

          <div className="space-y-1">
            <Label>
              Time Limit (min){" "}
              <span className="text-muted-foreground font-normal text-xs">
                — 0 = no limit
              </span>
            </Label>
            <Input
              type="number"
              min={0}
              value={
                form.time_limit_seconds > 0
                  ? Math.round(form.time_limit_seconds / 60)
                  : 0
              }
              onChange={(e) => {
                const mins = Number(e.target.value);
                setForm({
                  ...form,
                  time_limit_seconds: mins > 0 ? mins * 60 : 0,
                });
              }}
              className="w-32"
            />
          </div>
        </div>

        <Separator />

        <EditorActions
          primaryLabel={primaryLabel}
          onPrimary={handlePrimary}
          primaryDisabled={saving}
          secondaryLabel={secondaryLabel}
          onSecondary={handleDraft}
          secondaryDisabled={saving}
          tertiaryLabel={
            tertiaryLabel ??
            (isEdit && form.is_published && onUnpublish
              ? "Unpublish"
              : "Cancel")
          }
          onTertiary={
            isEdit && form.is_published && onUnpublish ? onUnpublish : onCancel
          }
          tertiaryDisabled={saving}
          destructiveLabel={
            onDelete
              ? isEdit && form.is_published && onUnpublish
                ? undefined
                : isEdit && form.is_published
                  ? "Unpublish Quiz"
                  : "Delete Quiz"
              : undefined
          }
          onDestructive={onDelete}
          destructiveDisabled={saving}
        />
      </EditorCard>

      {/* Questions list */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">
          Questions ({questions.length})
        </h3>

        {questions.map((q, i) => (
          <div key={i}>
            {editingIndex === i ? (
              <QuestionEditorCard
                mode="edit"
                form={questionForm}
                setForm={setQuestionForm}
                saving={saving}
                onSave={handleSaveQuestion}
                onCancel={() => {
                  setEditingIndex(null);
                  setQuestionForm(makeEmptyQuestion());
                }}
              />
            ) : (
              <Card className="border-border/70">
                <CardContent className="pt-3 pb-3">
                  <div className="flex items-start gap-3">
                    <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded shrink-0 mt-0.5">
                      Q{i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">{q.prompt}</p>
                      <ul className="mt-1.5 space-y-0.5">
                        {(q.options ?? []).map((opt) => (
                          <li
                            key={opt.key}
                            className="text-xs text-muted-foreground flex items-center gap-1.5"
                          >
                            <span
                              style={{
                                color: opt.is_correct
                                  ? "var(--primary)"
                                  : undefined,
                                fontWeight: opt.is_correct ? 500 : undefined,
                              }}
                            >
                              {opt.text}
                            </span>
                            {opt.is_correct && (
                              <i
                                className="ti ti-circle-check"
                                style={{
                                  fontSize: 13,
                                  color: "var(--primary)",
                                  flexShrink: 0,
                                }}
                              />
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                          setQuestionForm({ ...q });
                          setEditingIndex(i);
                        }}
                      >
                        <i className="ti ti-pencil" style={{ fontSize: 16 }} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleDeleteQuestion(i)}
                      >
                        <i className="ti ti-trash" style={{ fontSize: 16 }} />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        ))}

        {editingIndex === "new" ? (
          <QuestionEditorCard
            mode="create"
            form={questionForm}
            setForm={setQuestionForm}
            saving={false}
            onSave={handleSaveQuestion}
            onCancel={() => {
              setEditingIndex(null);
              setQuestionForm(makeEmptyQuestion());
            }}
          />
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="rounded-[var(--radius)]"
            onClick={() => {
              setQuestionForm(makeEmptyQuestion());
              setEditingIndex("new");
            }}
          >
            + Add Question
          </Button>
        )}

        {questions.length === 0 && editingIndex !== "new" && (
          <p className="text-xs text-muted-foreground">No questions yet.</p>
        )}
      </div>

      {hint && (
        <p className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
          <i className="ti ti-bulb" style={{ fontSize: 14 }} />
          <span>{hint}</span>
        </p>
      )}
    </div>
  );
}
