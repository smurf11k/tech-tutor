import { BookOpen, CheckCircle2, ClipboardList } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

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
    <Card className="glass-panel">
      <CardHeader>
        <CardTitle className="text-base">What you will learn</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {modules.map((module) => (
          <section key={module.id} className="space-y-2">
            <p className="text-sm font-semibold text-foreground">
              {module.title}
            </p>
            <ul className="space-y-1 border-l border-border/80 pl-3">
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

                return (
                  <li key={itemKey}>
                    {interactive ? (
                      <button
                        type="button"
                        onClick={() => onSelect?.(itemKey)}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                          isActive
                            ? "bg-primary/15 text-primary"
                            : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                        )}
                      >
                        {isLesson ? (
                          <>
                            <LessonIcon done={isDone} />
                            <span className="flex-1">{item.title}</span>
                            <Badge variant="outline" className="text-[10px]">
                              {item.type}
                            </Badge>
                          </>
                        ) : (
                          <>
                            {isPassed ? (
                              <CheckCircle2 className="size-4 shrink-0 text-primary" />
                            ) : (
                              <ClipboardList className="size-4 shrink-0" />
                            )}
                            <span className="flex-1">{item.title}</span>
                          </>
                        )}
                      </button>
                    ) : (
                      <div className="flex items-center gap-2 py-1 text-sm text-muted-foreground">
                        {isLesson ? (
                          <>
                            <LessonIcon done={isDone} />
                            <span className="flex-1">{item.title}</span>
                            <Badge variant="outline" className="text-[10px]">
                              {item.type}
                            </Badge>
                            {item.is_preview ? (
                              <Badge
                                variant="secondary"
                                className="text-[10px]"
                              >
                                Preview
                              </Badge>
                            ) : null}
                          </>
                        ) : (
                          <>
                            <ClipboardList className="size-4 shrink-0" />
                            <span className="flex-1">{item.title}</span>
                            <Badge variant="outline" className="text-[10px]">
                              Quiz
                            </Badge>
                          </>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </CardContent>
    </Card>
  );
}

function LessonIcon({ done }) {
  if (done) {
    return <CheckCircle2 className="size-4 shrink-0 text-primary" />;
  }

  return <BookOpen className="size-4 shrink-0 opacity-60" />;
}
