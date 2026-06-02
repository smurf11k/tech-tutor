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
import { LessonComments } from "@/components/common/LessonComments";
import { HlsVideoPlayer } from "@/components/markdown/MarkdownContent";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { buildCurriculumItems } from "@/lib/curriculum";
import {
  formatMinutes,
  getApiErrorMessage,
  getCourseRouteKey,
  resolveBackendAssetUrl,
} from "@/lib/utils";

const MAX_QUIZ_ATTEMPTS = 3;

function resolveLessonSnapshot(lesson) {
  const publishedRevision =
    lesson.publishedRevision || lesson.published_revision;
  const latestRevision = lesson.latestRevision || lesson.latest_revision;

  return publishedRevision || latestRevision || lesson;
}

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
  const [, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const curriculumItems = useMemo(() => buildCurriculumItems(course), [course]);

  const [issuingCertificate, setIssuingCertificate] = useState(false);

  const activeIndex = curriculumItems.findIndex(
    (item) => item.key === activeKey,
  );
  const activeItem = activeIndex >= 0 ? curriculumItems[activeIndex] : null;
  const completedItems = useMemo(() => {
    const completedLessons = new Set(completedLessonIds.map(String)).size;
    const passedQuizzes = curriculumItems.filter((item) => {
      if (item.type !== "quiz") {
        return false;
      }

      const summary = quizSummaries[item.id] || quizSummaries[String(item.id)];
      return Boolean(summary?.passed);
    }).length;

    return completedLessons + passedQuizzes;
  }, [completedLessonIds, curriculumItems, quizSummaries]);
  const progressPercent = Math.min(
    100,
    Math.round((completedItems / Math.max(1, curriculumItems.length)) * 100),
  );
  const activeQuizSummary =
    activeItem?.type === "quiz"
      ? quizSummaries[activeItem.id] || quizSummaries[String(activeItem.id)]
      : null;
  const activeQuizIsFinished = Boolean(
    activeQuizSummary?.latest_attempt &&
    (activeQuizSummary.passed ||
      activeQuizSummary.attempts_count >= MAX_QUIZ_ATTEMPTS),
  );
  const activeEstimatedTime =
    activeItem?.type === "lesson"
      ? formatMinutes(activeItem.lesson?.estimated_time_minutes)
      : activeItem?.type === "quiz"
        ? formatMinutes(activeItem.quiz?.estimated_time_minutes)
        : "";
  const topBarTimeLabel =
    activeEstimatedTime ||
    course?.duration ||
    formatMinutes(course?.total_estimated_minutes) ||
    "";

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

  useEffect(() => {
    if (activeItem?.type !== "quiz" || quizLocked) {
      return;
    }

    const summary =
      quizSummaries[activeItem.id] || quizSummaries[String(activeItem.id)];
    const latest = summary?.latest_attempt;

    if (
      latest &&
      (summary.passed || summary.attempts_count >= MAX_QUIZ_ATTEMPTS)
    ) {
      setQuizResult(latest);
    }
  }, [activeItem, quizLocked, quizSummaries]);

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
    if (quizLocked && key !== activeKey && !activeQuizIsFinished) {
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
    const response = await client.post(`/lessons/${lessonId}/progress`, {
      progress_percent: 100,
      completed_at: new Date().toISOString(),
    });

    if (response.data?.certificate) {
      toast.success("Certificate issued automatically!");
    }

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
    }
  }

  function goPrevious() {
    if (quizLocked && !activeQuizIsFinished) {
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

      if (attempt.certificate) {
        toast.success("Certificate issued automatically!");
      }

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

  async function issueCertificate() {
    setIssuingCertificate(true);

    try {
      await client.post(`/courses/${courseId}/certificate`);
      toast.success("Certificate issued successfully!");
    } catch (err) {
      const msg = getApiErrorMessage(err);

      if (msg.toLowerCase().includes("certificate already issued")) {
        toast.error("certificate already issued");
      } else {
        toast.error(msg || "Failed to issue certificate.");
      }
    } finally {
      setIssuingCertificate(false);
    }
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
    <section className="w-full overflow-hidden border border-border bg-card">
      <div className="grid min-h-[calc(100vh-170px)] lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-6">
        <aside className="border-r border-border bg-card/80">
          <div className="border-b border-border p-3.5 space-y-3">
            <p className="mb-1.5 text-xs font-medium leading-tight">
              {course.title}
            </p>

            {/* Progress bar */}
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground mono-ui">
              <div className="h-1.5 flex-1 overflow-hidden rounded bg-border">
                <div
                  className="h-full rounded bg-primary"
                  style={{
                    width: `${progressPercent}%`,
                  }}
                />
              </div>
              <span>{progressPercent}% complete</span>
            </div>

            {/* ✅ Issue certificate button */}
            <Button
              size="sm"
              className="w-full"
              variant="outline"
              disabled={issuingCertificate}
              onClick={issueCertificate}
            >
              {issuingCertificate
                ? "Issuing certificate..."
                : "Issue certificate"}
            </Button>
          </div>

          <div className="h-[calc(100%-68px)] overflow-y-auto p-2">
            <CourseCurriculumTree
              course={course}
              completedLessonIds={completedLessonIds}
              interactive
              activeKey={activeKey}
              onSelect={selectItem}
              quizSummaries={quizSummaries}
            />
          </div>
        </aside>

        <div className="flex min-h-[620px] min-w-0 flex-col overflow-hidden">
          <div className="flex h-12 items-center justify-between border-b border-border bg-card px-5">
            <p className="text-[13px] font-medium">
              {activeItem?.title || course.title}
            </p>
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground mono-ui">
              <span className="inline-flex items-center gap-1">
                <i className="ti ti-clock" style={{ fontSize: 12 }} />
                {topBarTimeLabel || "—"}
              </span>
              <Button variant="outline" size="sm" asChild>
                <Link to={`/courses/${courseId}`}>overview</Link>
              </Button>
              {canManage ? (
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/instructor/courses/${getCourseRouteKey(course)}`}>
                    manage
                  </Link>
                </Button>
              ) : null}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-7">
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
                hasNext={hasNext && (!quizLocked || activeQuizIsFinished)}
                onPrevious={goPrevious}
                onSetQuizAnswer={setQuizAnswer}
                onSubmit={handleQuizSubmit}
                onRetake={startQuizRetake}
                onCancel={cancelQuiz}
                onSkip={goNext}
              />
            ) : null}
          </div>
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
  const lessonSnapshot = resolveLessonSnapshot(lesson);
  const hasInlineVideo =
    /\[[^\]]+\]\([^)]*\.(?:m3u8|mp4|mov|webm|m4v|avi|mkv)(?:\?[^)]*)?\)/i.test(
      lessonSnapshot.content || "",
    );

  return (
    <article className="mx-auto flex h-full max-w-4xl flex-col gap-6">
      <header className="space-y-2 pb-2">
        <p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground mono-ui">
          Lesson
          {lessonSnapshot.estimated_time_minutes
            ? ` · ${formatMinutes(lessonSnapshot.estimated_time_minutes)}`
            : ""}
        </p>
        <h2 className="text-2xl font-semibold tracking-[-0.02em]">
          {lessonSnapshot.title}
        </h2>
      </header>

      <div className="flex-1 space-y-4">
        {!hasInlineVideo && lessonSnapshot.video_url ? (
          <HlsVideoPlayer
            src={resolveBackendAssetUrl(lessonSnapshot.video_url)}
          />
        ) : null}

        <MarkdownContent content={lessonSnapshot.content} />
      </div>

      <LessonComments
        lesson={lesson}
        client={client}
        isAuthenticated={isAuthenticated}
        course={course}
        user={user}
      />

      <footer className="flex flex-wrap justify-between gap-2 border-t border-border pt-4">
        <Button
          variant="outline"
          disabled={!hasPrevious || busy}
          onClick={onPrevious}
        >
          Previous
        </Button>
        <Button disabled={busy} onClick={onNext}>
          {hasNext ? "Next lesson" : "Finish"}
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
  onSetQuizAnswer,
  onSubmit,
  onRetake,
  onCancel,
  onSkip,
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
            {quiz.estimated_time_minutes
              ? ` · ${formatMinutes(quiz.estimated_time_minutes)}`
              : ""}
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
              {hasNext && <Button onClick={onSkip}>Skip quiz</Button>}
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
    <article className="mx-auto flex h-full max-w-3xl flex-col gap-6">
      <header className="space-y-2 pb-2">
        <p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground mono-ui">
          Quiz
          {quiz.estimated_time_minutes
            ? ` · ${formatMinutes(quiz.estimated_time_minutes)}`
            : ""}
        </p>
        <h2 className="text-[18px] font-semibold tracking-[-0.02em]">
          {quiz.title}
        </h2>
        {quiz.description ? (
          <p className="text-xs text-muted-foreground mono-ui">
            {quiz.description}
          </p>
        ) : null}
        {quizLocked ? (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            Complete and submit this quiz before moving to another item.
          </p>
        ) : null}
      </header>

      <div className="flex-1 space-y-4">
        {/* TODO: Implement per-question countdown timer and timeout behavior like the design mockup. */}
        <div className="mb-2 text-[11px] text-muted-foreground mono-ui">
          {summary?.attempts_count
            ? `attempts: ${summary.attempts_count}`
            : "attempts: 0"}
        </div>

        {(quiz.questions || []).map((question) => (
          <div
            key={question.id}
            className="space-y-3 rounded-md border border-border p-4"
          >
            <p className="text-sm font-medium leading-relaxed">
              {question.prompt}
            </p>
            <div className="space-y-2">
              {(question.options || []).map((option) => {
                const currentAnswer = quizAnswers[question.id];
                const isChecked = Array.isArray(currentAnswer)
                  ? currentAnswer.includes(option.key)
                  : currentAnswer === option.key;
                const isMulti = question.type === "multiple_choice";

                return (
                  <label
                    key={option.key}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "8px 12px",
                      borderRadius: 6,
                      border: `1px solid ${isChecked ? "var(--primary)" : "var(--border)"}`,
                      background: isChecked ? "var(--accent)" : "transparent",
                      cursor: "pointer",
                      transition: "border-color .12s, background .12s",
                      fontSize: 13,
                    }}
                  >
                    <input
                      type={isMulti ? "checkbox" : "radio"}
                      name={`question-${question.id}`}
                      checked={isChecked}
                      onChange={(e) =>
                        onSetQuizAnswer(question, option.key, e.target.checked)
                      }
                      style={{ display: "none" }}
                    />
                    <i
                      className={
                        isChecked
                          ? isMulti
                            ? "ti ti-checkbox"
                            : "ti ti-circle-dot"
                          : isMulti
                            ? "ti ti-square"
                            : "ti ti-circle"
                      }
                      style={{
                        fontSize: 16,
                        flexShrink: 0,
                        color: isChecked
                          ? "var(--primary)"
                          : "var(--muted-foreground)",
                      }}
                    />
                    <span
                      style={{
                        color: isChecked
                          ? "var(--foreground)"
                          : "var(--muted-foreground)",
                      }}
                    >
                      {option.text}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <footer className="flex flex-wrap justify-between gap-2 border-t border-border pt-4">
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
