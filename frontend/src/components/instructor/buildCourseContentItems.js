// Builds a sorted, interleaved list of lessons and quizzes for a single module.
// Both use a `position` field to determine order.
export function buildModuleContentItems(lessons = [], quizzes = []) {
  return [
    ...lessons.map((lesson) => ({
      ...lesson,
      _type: "lesson",
      _dnd_id: `lesson-${lesson.id}`,
    })),
    ...quizzes.map((quiz) => ({
      ...quiz,
      _type: "quiz",
      _dnd_id: `quiz-${quiz.id}`,
    })),
  ].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
}
