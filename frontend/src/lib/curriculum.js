export function buildCurriculumItems(course) {
  const items = [];

  // Build items from modules - lessons and quizzes ordered by position
  for (const module of course?.modules || []) {
    // Combine lessons and quizzes, sort by position
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
    ].sort((a, b) => a._position - b._position);

    // Add to curriculum, filtering by published status
    for (const item of content) {
      if (!item.is_published) continue;

      if (item._type === "lesson") {
        items.push({
          key: `lesson-${item.id}`,
          type: "lesson",
          id: item.id,
          title: item.title,
          moduleTitle: module.title,
          lesson: item,
          module,
        });
      } else if (item._type === "quiz") {
        items.push({
          key: `quiz-${item.id}`,
          type: "quiz",
          id: item.id,
          title: item.title,
          moduleTitle: module.title,
          quiz: item,
          module,
        });
      }
    }
  }

  return items;
}
