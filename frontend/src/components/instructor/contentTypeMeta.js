import { Play } from "lucide-react";

const QuizIcon = () => (
  <i className="ti ti-help-circle" style={{ fontSize: 14 }} />
);

export const CONTENT_TYPE_META = {
  lesson: { icon: Play, label: "Lesson" },
  quiz: { icon: QuizIcon, label: "Quiz" },
};
