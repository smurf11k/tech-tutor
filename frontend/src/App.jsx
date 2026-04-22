import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import api, { withAuth } from "@/lib/api";

function App() {
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [token, setToken] = useState(localStorage.getItem("techtutor_token") || "");
  const [tokenDraft, setTokenDraft] = useState(token);

  const courseCount = useMemo(() => courses.length, [courses]);

  async function fetchCourses() {
    setLoading(true);
    setMessage("");
    try {
      const response = await api.get("/courses");
      const data = response.data?.data ?? response.data ?? [];
      setCourses(Array.isArray(data) ? data : []);
      if (Array.isArray(data) && data.length > 0 && !selectedCourse) {
        await fetchCourseDetails(data[0].id);
      }
    } catch (error) {
      setMessage(error?.response?.data?.message || "Failed to load courses.");
    } finally {
      setLoading(false);
    }
  }

  async function fetchCourseDetails(courseId) {
    setLoading(true);
    try {
      const response = await api.get(`/courses/${courseId}`);
      setSelectedCourse(response.data);
    } catch (error) {
      setMessage(error?.response?.data?.message || "Failed to load course details.");
    } finally {
      setLoading(false);
    }
  }

  async function enrollSelectedCourse() {
    if (!selectedCourse) {
      return;
    }

    if (!token) {
      setMessage("Add a Sanctum token to enroll.");
      return;
    }

    setLoading(true);
    setMessage("");
    try {
      await withAuth(token).post(`/courses/${selectedCourse.id}/enrollments`);
      setMessage("Enrollment successful.");
    } catch (error) {
      setMessage(error?.response?.data?.message || "Enrollment failed.");
    } finally {
      setLoading(false);
    }
  }

  function saveToken() {
    localStorage.setItem("techtutor_token", tokenDraft.trim());
    setToken(tokenDraft.trim());
    setMessage("Token saved locally in browser storage.");
  }

  useEffect(() => {
    fetchCourses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="mx-auto w-full max-w-6xl p-4 sm:p-6">
      <header className="mb-6 rounded-xl border bg-card p-4 text-left shadow-sm">
        <h1 className="text-2xl font-semibold text-card-foreground">TechTutor Minimal Frontend</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Connected to <span className="font-mono">{api.defaults.baseURL}</span>
        </p>
      </header>

      <section className="mb-6 rounded-xl border bg-card p-4 text-left shadow-sm">
        <h2 className="mb-3 text-lg font-medium text-card-foreground">Auth Token (for protected actions)</h2>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            value={tokenDraft}
            onChange={(event) => setTokenDraft(event.target.value)}
            placeholder="Paste Sanctum token"
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          />
          <Button onClick={saveToken} disabled={loading}>
            Save Token
          </Button>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <article className="rounded-xl border bg-card p-4 text-left shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-medium text-card-foreground">Courses ({courseCount})</h2>
            <Button size="sm" variant="outline" onClick={fetchCourses} disabled={loading}>
              Refresh
            </Button>
          </div>

          <div className="space-y-2">
            {courses.map((course) => (
              <button
                key={course.id}
                type="button"
                onClick={() => fetchCourseDetails(course.id)}
                className="w-full rounded-lg border px-3 py-2 text-left transition hover:bg-muted"
              >
                <p className="font-medium text-card-foreground">{course.title}</p>
                <p className="text-xs text-muted-foreground">/{course.slug}</p>
              </button>
            ))}
            {courses.length === 0 && !loading && (
              <p className="text-sm text-muted-foreground">No courses found.</p>
            )}
          </div>
        </article>

        <article className="rounded-xl border bg-card p-4 text-left shadow-sm">
          {!selectedCourse && <p className="text-sm text-muted-foreground">Select a course to view details.</p>}

          {selectedCourse && (
            <>
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-card-foreground">{selectedCourse.title}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">/{selectedCourse.slug}</p>
                </div>
                <Button onClick={enrollSelectedCourse} disabled={loading}>
                  Enroll
                </Button>
              </div>

              <p className="mb-4 text-sm text-muted-foreground">
                {selectedCourse.description || "No description yet."}
              </p>

              <div className="mb-4 grid gap-2 text-sm sm:grid-cols-2">
                <p>
                  <span className="font-medium">Price:</span> ${selectedCourse.price}
                </p>
                <p>
                  <span className="font-medium">Published:</span>{" "}
                  {selectedCourse.is_published ? "Yes" : "No"}
                </p>
              </div>

              <h3 className="mb-2 text-base font-medium text-card-foreground">Modules</h3>
              <div className="space-y-3">
                {(selectedCourse.modules || []).map((module) => (
                  <div key={module.id} className="rounded-lg border p-3">
                    <p className="font-medium text-card-foreground">{module.title}</p>
                    <p className="text-xs text-muted-foreground">/{module.slug}</p>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                      {(module.lessons || []).map((lesson) => (
                        <li key={lesson.id}>{lesson.title}</li>
                      ))}
                    </ul>
                  </div>
                ))}
                {(selectedCourse.modules || []).length === 0 && (
                  <p className="text-sm text-muted-foreground">No modules yet.</p>
                )}
              </div>
            </>
          )}
        </article>
      </section>

      {message && (
        <p className="mt-4 rounded-lg border border-input bg-muted px-3 py-2 text-sm text-muted-foreground">
          {message}
        </p>
      )}
    </main>
  );
}

export default App;
