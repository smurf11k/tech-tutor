// TODO: delete

import { Pencil, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import {
  QuestionEditorForm,
  makeEmptyQuestion,
} from "@/components/instructor/ContentEditors";
import { getApiErrorMessage } from "@/lib/utils";

function CorrectAnswerBadge({ option }) {
  if (!option.is_correct) return null;
  return (
    <span className="ml-1 text-xs text-green-600 dark:text-green-400 font-medium">
      ✓
    </span>
  );
}

export default function QuizQuestionsList({
  quizId,
  courseId,
  questions,
  setQuestions,
  form,
  setForm,
  editingId,
  setEditingId,
  saving,
  setSaving,
  onError,
  className = "space-y-3",
}) {
  const { client } = useAuth();

  const reloadQuestions = async () => {
    const { data } = await client.get(
      `/courses/${courseId}/quizzes/${quizId}/questions`,
    );
    setQuestions(Array.isArray(data) ? data : (data.data ?? []));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editingId && editingId !== "new") {
        await client.put(
          `/courses/${courseId}/quizzes/${quizId}/questions/${editingId}`,
          form,
        );
      } else {
        await client.post(
          `/courses/${courseId}/quizzes/${quizId}/questions`,
          form,
        );
      }
      await reloadQuestions();
      setForm(makeEmptyQuestion());
      setEditingId(null);
    } catch (err) {
      onError?.(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (questionId) => {
    if (!confirm("Delete this question?")) return;
    try {
      await client.delete(
        `/courses/${courseId}/quizzes/${quizId}/questions/${questionId}`,
      );
      await reloadQuestions();
      if (editingId === questionId) {
        setEditingId(null);
        setForm(makeEmptyQuestion());
      }
    } catch (err) {
      onError?.(getApiErrorMessage(err));
    }
  };

  return (
    <div className={className}>
      <h3 className="text-sm font-semibold">Questions ({questions.length})</h3>

      {questions.map((q, i) => (
        <Card key={q.id}>
          <CardContent className="pt-3 pb-3">
            {editingId === q.id ? (
              <QuestionEditorForm
                mode="edit"
                form={form}
                setForm={setForm}
                saving={saving}
                onSave={handleSave}
                onCancel={() => {
                  setEditingId(null);
                  setForm(makeEmptyQuestion());
                }}
              />
            ) : (
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
                        <CorrectAnswerBadge option={opt} />
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
                      setForm({
                        type: q.type,
                        prompt: q.prompt,
                        options: q.options.map((opt) => ({
                          key: opt.key,
                          text: opt.text,
                          is_correct: (q.correct_answers ?? []).includes(
                            opt.key,
                          ),
                        })),
                        points: q.points ?? 1,
                      });
                      setEditingId(q.id);
                    }}
                    aria-label="Edit question"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(q.id)}
                    aria-label="Delete question"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {editingId === "new" ? (
        <QuestionEditorForm
          mode="create"
          form={form}
          setForm={setForm}
          saving={saving}
          onSave={handleSave}
          onCancel={() => {
            setEditingId(null);
            setForm(makeEmptyQuestion());
          }}
        />
      ) : (
        <div className="pt-2">
          <Button
            variant="outline"
            size="sm"
            className="rounded-[var(--radius)]"
            onClick={() => {
              setForm(makeEmptyQuestion());
              setEditingId("new");
            }}
          >
            + Add Question
          </Button>
        </div>
      )}

      {questions.length === 0 && editingId !== "new" && (
        <p className="text-xs text-muted-foreground">No questions yet.</p>
      )}
    </div>
  );
}
