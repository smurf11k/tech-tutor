import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Link,
  useParams,
  useSearchParams,
  useNavigate,
} from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CourseCurriculumTree } from "@/components/instructor/CourseCurriculumTree";
import { LoadingState } from "@/components/common/LoadingState";
import { MarkdownContent } from "@/components/markdown/MarkdownContent";
import { PageHeader } from "@/components/common/PageHeader";
import { LessonComments } from "@/components/common/LessonComments";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { buildCurriculumItems } from "@/lib/curriculum";
import { getApiErrorMessage } from "@/lib/utils";

const MAX_QUIZ_ATTEMPTS = 3;

export default function CourseLearningPage() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const lessonIdFromQuery = searchParams.get("lesson");
  const quizIdFromQuery = searchParams.get("quiz");

  const { user, isAuthenticated, isInstructor, isAdmin, client } = useAuth();
  const toast = useToast();

  const [course, setCourse] = useState(null);
  const [completedLessonIds, setCompletedLessonIds] = useState([]);
  const [quizSummaries, setQuizSummaries] = useState({});
  const [activeKey, setActiveKey] = useState(null);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizResult, setQuizResult] = useState(null);
  const [quizLocked, setQuizLocked] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const curriculumItems = useMemo(() => buildCurriculumItems(course), [course]);

  const activeIndex = curriculumItems.findIndex(
    (item) => item.key === activeKey,
  );
  const activeItem = activeIndex >= 0 ? curriculumItems[activeIndex] : null;

  const loadLearningState = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await client.get(`/learning/courses/${courseId}`);
      const payload = response.data;
      setCourse(payload.course);
      setCompletedLessonIds(payload.completed_lesson_ids || []);
      setQuizSummaries(payload.quiz_summaries || {});

      const items = buildCurriculumItems(payload.course);
      setActiveKey((current) => current || (items[0]?.key ?? null));
    } catch (err) {
      const msg = getApiErrorMessage(err, "Failed to load course.");
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [client, courseId, toast]);

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    loadLearningState();
  }, [isAuthenticated, loadLearningState]);

  // Auto-select lesson from query param
  useEffect(() => {
    if (lessonIdFromQuery && curriculumItems.length > 0) {
      const lessonKey = `lesson-${lessonIdFromQuery}`;
      const exists = curriculumItems.some((item) => item.key === lessonKey);
      if (exists) {
        setActiveKey(lessonKey);
      }
    }
  }, [lessonIdFromQuery, curriculumItems]);

  // Auto-select quiz from query param
  useEffect(() => {
    if (quizIdFromQuery && curriculumItems.length > 0) {
      const quizKey = `quiz-${quizIdFromQuery}`;
      const exists = curriculumItems.some((item) => item.key === quizKey);
      if (exists) {
        setActiveKey(quizKey);
      }
    }
  }, [quizIdFromQuery, curriculumItems]);

  useEffect(() => {
    if (!quizLocked) {
      return undefined;
    }

    function handleBeforeUnload(event) {
      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [quizLocked]);

  function setQuizAnswer(question, optionKey, checked) {
    setQuizAnswers((current) => {
      if (question.type === "multiple_choice") {
        const existingAnswer = current[question.id];
        const selectedAnswers = Array.isArray(existingAnswer)
          ? existingAnswer
          : existingAnswer
            ? [existingAnswer]
            : [];

        const nextAnswers = checked
          ? Array.from(new Set([...selectedAnswers, optionKey]))
          : selectedAnswers.filter((value) => value !== optionKey);

        return { ...current, [question.id]: nextAnswers };
      }

      return { ...current, [question.id]: optionKey };
    });
  }

  function selectItem(key) {
    if (quizLocked && key !== activeKey) {
      toast.error("Finish the quiz before leaving this page.");
      return;
    }

    const item = curriculumItems.find((entry) => entry.key === key);
    setActiveKey(key);

    // Update URL with lesson or quiz parameter
    if (item?.type === "lesson") {
      navigate(`/learning/${courseId}?lesson=${item.id}`, { replace: true });
    } else if (item?.type === "quiz") {
      navigate(`/learning/${courseId}?quiz=${item.id}`, { replace: true });
    }

    if (item?.type === "quiz") {
      const summary = quizSummaries[item.id] || quizSummaries[String(item.id)];
      const latest = summary?.latest_attempt;

      if (
        latest &&
        (summary.passed || summary.attempts_count >= MAX_QUIZ_ATTEMPTS)
      ) {
        setQuizResult(latest);
        setQuizLocked(false);
        setQuizAnswers({});
        return;
      }

      setQuizResult(null);
      setQuizAnswers({});
      setQuizLocked(true);
      return;
    }

    setQuizResult(null);
    setQuizAnswers({});
    setQuizLocked(false);
  }

  async function markLessonComplete(lessonId) {
    await client.post(`/lessons/${lessonId}/progress`, {
      progress_percent: 100,
      completed_at: new Date().toISOString(),
    });
    setCompletedLessonIds((current) =>
      current.includes(lessonId) ? current : [...current, lessonId],
    );
  }

  async function goNext() {
    if (!activeItem || activeIndex < 0) {
      return;
    }

    if (activeItem.type === "lesson") {
      setBusy(true);
      try {
        await markLessonComplete(activeItem.id);
      } catch (err) {
        toast.error(getApiErrorMessage(err, "Could not save progress."));
        setBusy(false);
        return;
      }
      setBusy(false);
    }

    const nextItem = curriculumItems[activeIndex + 1];
    if (nextItem) {
      selectItem(nextItem.key);
      if (nextItem.type === "quiz") {
        setQuizLocked(true);
      }
    }
  }

  function goPrevious() {
    if (quizLocked) {
      toast.error("Finish the quiz before leaving this page.");
      return;
    }
    const previousItem = curriculumItems[activeIndex - 1];
    if (previousItem) {
      selectItem(previousItem.key);
    }
  }

  async function handleQuizSubmit(quiz) {
    setBusy(true);
    try {
      const response = await client.post(`/quizzes/${quiz.id}/attempts`, {
        answers: quizAnswers,
      });
      const attempt = response.data;
      setQuizResult(attempt);
      setQuizLocked(false);
      setQuizSummaries((current) => {
        const existing = current[quiz.id] || current[String(quiz.id)] || {};
        const attemptsCount = (existing.attempts_count || 0) + 1;

        return {
          ...current,
          [quiz.id]: {
            attempts_count: attemptsCount,
            latest_attempt: attempt,
            best_score: Math.max(existing.best_score || 0, attempt.score || 0),
            passed: existing.passed || attempt.passed,
          },
        };
      });
      toast.success(attempt.passed ? "Quiz passed!" : "Quiz submitted.");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Quiz submission failed."));
    } finally {
      setBusy(false);
    }
  }

  function startQuizRetake(quiz) {
    setQuizAnswers({});
    setQuizResult(null);
    setQuizLocked(true);
    setActiveKey(`quiz-${quiz.id}`);
  }

  function cancelQuiz() {
    setQuizAnswers({});
    setQuizResult(null);
    setQuizLocked(false);
  }

  if (!isAuthenticated) {
    return (
      <section className="space-y-4">
        <Button asChild>
          <Link
            to="/login"
            state={{ from: { pathname: `/learning/${courseId}` } }}
          >
            Log in
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to={`/courses/${courseId}`}>Back to course overview</Link>
        </Button>
      </section>
    );
  }

  if (loading) {
    return <LoadingState label="Loading course content..." />;
  }

  if (!course) {
    return null;
  }

  const canManage =
    isAdmin || (isInstructor && course.instructor_id === user?.id);
  const hasNext = activeIndex >= 0 && activeIndex < curriculumItems.length - 1;
  const hasPrevious = activeIndex > 0;

  return (
    <section className="space-y-6">
      <PageHeader
        title={course.title}
        description="Work through lessons and quizzes at your own pace."
        actions={
          <>
            <Button variant="outline" asChild>
              <Link to={`/courses/${courseId}`}>Course overview</Link>
            </Button>
            {canManage ? (
              <Button variant="outline" asChild>
                <Link to={`/instructor/courses/${course.id}`}>
                  Manage course
                </Link>
              </Button>
            ) : null}
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <CourseCurriculumTree
            course={course}
            completedLessonIds={completedLessonIds}
            interactive
            activeKey={activeKey}
            onSelect={selectItem}
            quizSummaries={quizSummaries}
          />
        </aside>

        <div className="min-h-[420px] rounded-xl border border-border/60 glass-panel p-6">
          {!activeItem ? (
            <p className="text-sm text-muted-foreground">
              Select a lesson or quiz from the curriculum.
            </p>
          ) : null}

          {activeItem?.type === "lesson" ? (
            <LessonPanel
              lesson={activeItem.lesson}
              busy={busy}
              hasPrevious={hasPrevious}
              hasNext={hasNext}
              onPrevious={goPrevious}
              onNext={goNext}
              client={client}
              isAuthenticated={isAuthenticated}
              course={course}
              user={user}
            />
          ) : null}

          {activeItem?.type === "quiz" ? (
            <QuizPanel
              quiz={activeItem.quiz}
              quizAnswers={quizAnswers}
              quizResult={quizResult}
              quizLocked={quizLocked}
              busy={busy}
              summary={
                quizSummaries[activeItem.id] ||
                quizSummaries[String(activeItem.id)]
              }
              hasPrevious={hasPrevious}
              hasNext={hasNext && !quizLocked}
              onPrevious={goPrevious}
              onNext={goNext}
              onSetQuizAnswer={setQuizAnswer}
              onSubmit={handleQuizSubmit}
              onRetake={startQuizRetake}
              onCancel={cancelQuiz}
            />
          ) : null}
        </div>
      </div>
    </section>
  );
}

function LessonPanel({
  lesson,
  busy,
  hasPrevious,
  hasNext,
  onPrevious,
  onNext,
  client,
  isAuthenticated,
  course,
  user,
}) {
  return (
    <article className="flex h-full flex-col gap-6">
      <header className="space-y-2 border-b border-border/60 pb-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          Lesson
        </p>
        <h2 className="text-2xl font-semibold">{lesson.title}</h2>
      </header>

      <div className="flex-1 space-y-4">
        <MarkdownContent content={lesson.content} />
        {lesson.video_url ? (
          <a
            href={lesson.video_url}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-primary hover:underline"
          >
            Open video resource
          </a>
        ) : null}
        {lesson.file_url ? (
          <a
            href={lesson.file_url}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-primary hover:underline"
          >
            Download attachment
          </a>
        ) : null}
      </div>

      <LessonComments
        lesson={lesson}
        client={client}
        isAuthenticated={isAuthenticated}
        course={course}
        user={user}
      />

      <footer className="flex flex-wrap justify-between gap-2 border-t border-border/60 pt-4">
        <Button
          variant="outline"
          disabled={!hasPrevious || busy}
          onClick={onPrevious}
        >
          Previous
        </Button>
        <Button disabled={!hasNext || busy} onClick={onNext}>
          {hasNext ? "Next" : "Finish"}
        </Button>
      </footer>
    </article>
  );
}

function QuizPanel({
  quiz,
  quizAnswers,
  quizResult,
  quizLocked,
  busy,
  summary,
  hasPrevious,
  hasNext,
  onPrevious,
  onNext,
  onSetQuizAnswer,
  onSubmit,
  onRetake,
  onCancel,
}) {
  const attemptsCount = summary?.attempts_count || 0;
  const canRetake =
    quizResult && !quizResult.passed && attemptsCount < MAX_QUIZ_ATTEMPTS;

  if (quizResult) {
    return (
      <article className="space-y-6">
        <header className="space-y-2 border-b border-border/60 pb-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Quiz result
          </p>
          <h2 className="text-2xl font-semibold">{quiz.title}</h2>
        </header>
        <div className="space-y-3 rounded-lg border border-border p-4">
          <p className="text-lg font-medium">
            Score: {quizResult.score}% (pass: {quiz.pass_score}%)
          </p>
          <p
            className={quizResult.passed ? "text-primary" : "text-destructive"}
          >
            {quizResult.passed
              ? "You passed this quiz."
              : "You did not pass this quiz."}
          </p>
          <p className="text-sm text-muted-foreground">
            Attempts used: {attemptsCount} / {MAX_QUIZ_ATTEMPTS}
          </p>
        </div>
        <footer className="flex flex-wrap gap-2">
          {canRetake ? (
            <Button onClick={() => onRetake(quiz)}>Retake quiz</Button>
          ) : null}
          {quizResult.passed ? (
            <>
              {hasNext && <Button onClick={onNext}>Continue to next</Button>}
              {hasPrevious && (
                <Button variant="outline" onClick={onPrevious}>
                  Back
                </Button>
              )}
            </>
          ) : null}
        </footer>
      </article>
    );
  }

  return (
    <article className="flex h-full flex-col gap-6">
      <header className="space-y-2 border-b border-border/60 pb-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          Quiz
        </p>
        <h2 className="text-2xl font-semibold">{quiz.title}</h2>
        {quiz.description ? (
          <p className="text-sm text-muted-foreground">{quiz.description}</p>
        ) : null}
        {quizLocked ? (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            Complete and submit this quiz before moving to another item.
          </p>
        ) : null}
      </header>

      <div className="flex-1 space-y-4">
        {(quiz.questions || []).map((question) => (
          <div
            key={question.id}
            className="space-y-3 rounded-md border border-border p-4"
          >
            <p className="text-sm font-medium">{question.prompt}</p>
            <div className="space-y-2">
              {(question.options || []).map((option) => {
                const currentAnswer = quizAnswers[question.id];
                const isChecked = Array.isArray(currentAnswer)
                  ? currentAnswer.includes(option.key)
                  : currentAnswer === option.key;

                return (
                  <label
                    key={option.key}
                    className="flex cursor-pointer items-start gap-3 rounded-md border border-border px-3 py-2 text-sm"
                  >
                    <input
                      type={
                        question.type === "multiple_choice"
                          ? "checkbox"
                          : "radio"
                      }
                      name={`question-${question.id}`}
                      checked={isChecked}
                      onChange={(event) =>
                        onSetQuizAnswer(
                          question,
                          option.key,
                          event.target.checked,
                        )
                      }
                      className="mt-1"
                    />
                    <span>
                      <span className="mr-2 font-medium">{option.key}.</span>
                      {option.text}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <footer className="flex flex-wrap justify-between gap-2 border-t border-border/60 pt-4">
        <div className="flex gap-2">
          <Button
            variant="outline"
            disabled={!hasPrevious || quizLocked || busy}
            onClick={onPrevious}
          >
            Previous
          </Button>
          <Button variant="destructive" disabled={busy} onClick={onCancel}>
            Cancel
          </Button>
        </div>
        <Button disabled={busy} onClick={() => onSubmit(quiz)}>
          Submit quiz
        </Button>
      </footer>
    </article>
  );
}
