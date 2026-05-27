import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CourseCard } from "@/components/common/CourseCard";
import { LoadingState } from "@/components/common/LoadingState";
import { PageHeader } from "@/components/common/PageHeader";
import { useAuth } from "@/contexts/AuthContext";
import {
  extractList,
  getApiErrorMessage,
  getCourseRouteKey,
} from "@/lib/utils";

export default function MyLearningPage() {
  const { client } = useAuth();
  const [courses, setCourses] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const response = await client.get("/learning/courses", {
          params: { per_page: 50 },
        });
        setCourses(extractList(response.data));
      } catch (err) {
        setError(getApiErrorMessage(err, "Failed to load your courses."));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [client]);

  return (
    <section className="home-shell py-9">
      <PageHeader
        title="My learning"
        description="Courses you are enrolled in. Open a course to continue lessons and quizzes."
      />
      {loading ? <LoadingState label="Loading your courses..." /> : null}
      {!loading && courses.length > 0 ? (
        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              href={`/learning/${getCourseRouteKey(course)}`}
              showProgress
            />
          ))}
        </section>
      ) : null}
      {!loading && courses.length === 0 ? (
        <Card className="glass-panel w-full max-w-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Play className="size-4 text-primary" />
              No enrollments yet
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>Browse the catalog and enroll in a course to see it here.</p>
            <Button asChild size="sm">
              <Link to="/">Browse catalog</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}
    </section>
  );
}
