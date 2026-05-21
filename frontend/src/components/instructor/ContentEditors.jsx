import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Lightbulb, Pencil, Plus, Trash2 } from "lucide-react";
import LessonMDEditor from "@/components/markdown/LessonMarkdownEditor";

// ---------------------------------------------------------------------------
// Shared primitives
// ---------------------------------------------------------------------------

export function EditorHeader({ backLabel, title, onBack, className = "" }) {
  return (
    <div className={`space-y-2 ${className}`}>
      <Button
        type="button"
        onClick={onBack}
        variant="outline"
        size="sm"
        className="h-8 rounded-[var(--radius)] px-3 text-xs text-muted-foreground"
      >
        ← {backLabel}
      </Button>
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
  onBack,
  onPublish,
  onDraft,
  onCancel,
  onDelete,
  saving,
}) {
  const isEdit = mode === "edit";

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
          <Label>Content</Label>
          <LessonMDEditor
            value={form.content}
            onChange={(value) => setForm({ ...form, content: value })}
          />
        </div>

        <Separator />

        <EditorActions
          primaryLabel="Save & Publish"
          onPrimary={onPublish}
          primaryDisabled={saving}
          secondaryLabel={
            isEdit && form.is_published ? "Unpublish → Draft" : "Save as Draft"
          }
          onSecondary={onDraft}
          secondaryDisabled={saving}
          tertiaryLabel="Cancel"
          onTertiary={onCancel}
          tertiaryDisabled={saving}
          destructiveLabel={onDelete ? "Delete Lesson" : undefined}
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

// Convert a saved question (correct_answers array) back to form shape
export function questionToForm(q) {
  return {
    type: q.type,
    prompt: q.prompt,
    options: (q.options ?? []).map((opt) => ({
      key: opt.key,
      text: opt.text,
      is_correct: (q.correct_answers ?? []).includes(opt.key),
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
        <Select
          value={form.type}
          onChange={(e) => setForm({ ...form, type: e.target.value })}
          className="w-full max-w-xs"
        >
          <option value="single_choice">Single Choice</option>
          <option value="multiple_choice">Multiple Choice</option>
        </Select>
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
            <Plus className="h-3 w-3 mr-1" /> Add option
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
              <span className="text-xs font-mono text-muted-foreground w-4 shrink-0">
                {opt.key.toUpperCase()}
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
                <Trash2 className="h-3.5 w-3.5" />
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
  questions, // array of question form objects (already in form shape)
  setQuestions,
  onBack,
  onSave, // called with (quizPayload) — includes questions
  onCancel,
  onDelete,
  saving,
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

  const handleSubmit = (isPublished) => {
    const payload = {
      title: form.title,
      pass_score: form.pass_score ?? 70,
      is_published: isPublished,
      questions: questions.map((q, idx) => ({
        ...questionFormToPayload(q),
        position: idx + 1,
      })),
    };
    onSave(payload);
  };

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

        <Separator />

        <EditorActions
          primaryLabel="Save & Publish"
          onPrimary={() => handleSubmit(true)}
          primaryDisabled={saving}
          secondaryLabel={
            isEdit && form.is_published ? "Unpublish → Draft" : "Save as Draft"
          }
          onSecondary={() => handleSubmit(false)}
          secondaryDisabled={saving}
          tertiaryLabel="Cancel"
          onTertiary={onCancel}
          tertiaryDisabled={saving}
          destructiveLabel={onDelete ? "Delete Quiz" : undefined}
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
                            className="text-xs text-muted-foreground flex items-center gap-1"
                          >
                            <span className="font-mono">
                              {opt.key.toUpperCase()}.
                            </span>
                            <span>{opt.text}</span>
                            {opt.is_correct && (
                              <span className="text-green-600 dark:text-green-400 font-medium">
                                ✓
                              </span>
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
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleDeleteQuestion(i)}
                      >
                        <Trash2 className="h-4 w-4" />
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
          <Lightbulb className="h-3.5 w-3.5" />
          <span>{hint}</span>
        </p>
      )}
    </div>
  );
}
