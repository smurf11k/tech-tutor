import { CheckCircle2, ChevronDown, ChevronRight, Play } from "lucide-react";
import { cn, formatMinutes } from "@/lib/utils";

export function CourseCurriculumTree({
  course,
  completedLessonIds = [],
  interactive = false,
  activeKey = null,
  onSelect,
  quizSummaries = {},
}) {
  const completedSet = new Set(completedLessonIds.map(String));

  // Build content items respecting position order (lessons + quizzes mixed)
  const modules = (course?.modules || [])
    .filter((module) => {
      const hasPublishedContent = [
        ...(module.lessons || []),
        ...(module.quizzes || []),
      ].some((item) => item.is_published);
      return hasPublishedContent;
    })
    .map((module) => {
      const content = [
        ...(module.lessons || []).map((lesson) => ({
          ...lesson,
          _type: "lesson",
          _position: lesson.position ?? 0,
        })),
        ...(module.quizzes || []).map((quiz) => ({
          ...quiz,
          _type: "quiz",
          _position: quiz.position ?? 0,
        })),
      ]
        .filter((item) => item.is_published)
        .sort((a, b) => a._position - b._position);

      return { ...module, _content: content };
    });

  return (
    <div className="space-y-2">
      {modules.map((module, moduleIndex) => {
        const opened = moduleIndex === 0 || interactive;
        const moduleMinutes = module._content.reduce(
          (sum, item) => sum + Number(item.estimated_time_minutes || 0),
          0,
        );

        return (
          <section
            key={module.id}
            className="overflow-hidden rounded-[6px] border border-border"
          >
            <div className="flex items-center justify-between bg-card px-3.5 py-3">
              <div>
                <p className="text-[13px] font-medium">{module.title}</p>
                <p className="text-[10px] text-muted-foreground mono-ui">
                  {module._content.length} item
                  {module._content.length === 1 ? "" : "s"}
                  {moduleMinutes > 0
                    ? ` · ${formatMinutes(moduleMinutes)}`
                    : ""}
                </p>
              </div>
              {opened ? (
                <ChevronDown className="size-4 text-[#3a3a3a]" />
              ) : (
                <ChevronRight className="size-4 text-[#3a3a3a]" />
              )}
            </div>

            {opened ? (
              <ul>
                {module._content.map((item) => {
                  const isLesson = item._type === "lesson";
                  const isQuiz = item._type === "quiz";
                  const itemKey = isLesson
                    ? `lesson-${item.id}`
                    : `quiz-${item.id}`;
                  const isDone = isLesson && completedSet.has(String(item.id));
                  const summary =
                    isQuiz &&
                    (quizSummaries[item.id] || quizSummaries[String(item.id)]);
                  const isPassed = summary?.passed;
                  const isActive = activeKey === itemKey;

                  const content = (
                    <>
                      {isLesson ? (
                        <LessonIcon done={isDone} />
                      ) : isPassed ? (
                        <CheckCircle2 className="size-3.5 text-primary" />
                      ) : (
                        <i
                          className="ti ti-help-circle"
                          style={{ fontSize: 14, color: "#3a3a3a" }}
                        />
                      )}

                      <span className="flex-1 truncate">{item.title}</span>

                      <span className="shrink-0 text-[10px] text-[#3a3a3a] mono-ui">
                        {isQuiz ? "quiz" : "lesson"}
                        {item.estimated_time_minutes
                          ? ` · ${formatMinutes(item.estimated_time_minutes)}`
                          : ""}
                      </span>
                    </>
                  );

                  return (
                    <li key={itemKey} className="border-t border-border">
                      {interactive ? (
                        <button
                          type="button"
                          onClick={() => onSelect?.(itemKey)}
                          className={cn(
                            "flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-[12px] text-muted-foreground mono-ui transition-colors",
                            isActive
                              ? "bg-[#001a0d] text-primary"
                              : "hover:bg-[#111] hover:text-foreground",
                          )}
                        >
                          {content}
                        </button>
                      ) : (
                        <div className="flex items-center gap-2 px-3.5 py-2.5 text-[12px] text-muted-foreground mono-ui">
                          {content}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}

function LessonIcon({ done }) {
  if (done) {
    return <CheckCircle2 className="size-4 shrink-0 text-primary" />;
  }

  return <Play className="size-4 shrink-0 opacity-60" />;
}
