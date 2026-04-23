import { useEffect, useMemo, useState } from "react";
import { BookOpen, CreditCard, LogOut, RefreshCcw, ShieldCheck, UserRound } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import api, { createDevToken, withAuth } from "@/lib/api";

const STORAGE_TOKEN_KEY = "techtutor_token";
const STORAGE_USER_KEY = "techtutor_user";
const DEFAULT_PASSWORD = "password";

const demoAccounts = [
  { role: "student", label: "Student", email: "student@techtutor.test", password: DEFAULT_PASSWORD },
  { role: "student", label: "Student 2", email: "student2@techtutor.test", password: DEFAULT_PASSWORD },
  { role: "instructor", label: "Instructor", email: "instructor@techtutor.test", password: DEFAULT_PASSWORD },
  { role: "admin", label: "Admin", email: "admin@techtutor.test", password: DEFAULT_PASSWORD },
  { role: "banned", label: "Banned", email: "banned@techtutor.test", password: DEFAULT_PASSWORD },
];

function readStoredSession() {
  const token = localStorage.getItem(STORAGE_TOKEN_KEY);
  const user = localStorage.getItem(STORAGE_USER_KEY);

  if (!token || !user) {
    return { token: "", user: null };
  }

  try {
    return { token, user: JSON.parse(user) };
  } catch {
    return { token: "", user: null };
  }
}

function roleBadgeVariant(role) {
  if (role === "admin") return "default";
  if (role === "instructor") return "secondary";
  if (role === "banned") return "destructive";
  return "outline";
}

function App() {
  const storedSession = readStoredSession();

  const [authToken, setAuthToken] = useState(storedSession.token);
  const [currentUser, setCurrentUser] = useState(storedSession.user);
  const [credentials, setCredentials] = useState({
    email: storedSession.user?.email ?? demoAccounts[0].email,
    password: DEFAULT_PASSWORD,
  });
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [payments, setPayments] = useState([]);
  const [adminUsers, setAdminUsers] = useState([]);
  const [moderationQueue, setModerationQueue] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(null);

  const authenticatedClient = useMemo(() => withAuth(authToken), [authToken]);
  const canSeePrivateCatalog = currentUser?.role === "admin" || currentUser?.role === "instructor";
  const catalogClient = canSeePrivateCatalog ? authenticatedClient : api;

  async function loadCourseDetails(courseId, client = catalogClient) {
    const response = await client.get(`/courses/${courseId}`);
    setSelectedCourse(response.data);

    if (!authToken) {
      setReviews([]);
      return;
    }

    try {
      const reviewsResponse = await authenticatedClient.get(`/courses/${courseId}/reviews`);
      setReviews(Array.isArray(reviewsResponse.data) ? reviewsResponse.data : []);
    } catch {
      setReviews([]);
    }
  }

  async function loadCourses(client = catalogClient) {
    const response = await client.get("/courses");
    const nextCourses = response.data?.data ?? response.data ?? [];
    const normalizedCourses = Array.isArray(nextCourses) ? nextCourses : [];
    setCourses(normalizedCourses);

    if (normalizedCourses.length === 0) {
      setSelectedCourse(null);
      setReviews([]);
      return;
    }

    const preferredCourseId = selectedCourse?.id ?? normalizedCourses[0].id;
    const courseToLoad = normalizedCourses.find((course) => course.id === preferredCourseId) ?? normalizedCourses[0];
    await loadCourseDetails(courseToLoad.id, client);
  }

  async function loadRoleData() {
    if (!authToken) {
      setPayments([]);
      setAdminUsers([]);
      setModerationQueue([]);
      return;
    }

    const paymentRequest = authenticatedClient.get("/payments");
    const userRequest = currentUser?.role === "admin" ? authenticatedClient.get("/admin/users") : Promise.resolve(null);
    const moderationRequest =
      currentUser?.role === "admin" ? authenticatedClient.get("/admin/moderation-queue") : Promise.resolve(null);

    const [paymentsResponse, usersResponse, moderationResponse] = await Promise.all([
      paymentRequest,
      userRequest,
      moderationRequest,
    ]);

    setPayments(Array.isArray(paymentsResponse.data) ? paymentsResponse.data : []);
    setAdminUsers(usersResponse?.data?.data ?? []);
    setModerationQueue(Array.isArray(moderationResponse?.data) ? moderationResponse.data : []);
  }

  async function refreshDashboard() {
    setLoading(true);
    try {
      await Promise.all([loadCourses(), loadRoleData()]);
      setNotice(null);
    } catch (error) {
      setNotice({
        variant: "destructive",
        title: "Something went wrong",
        description: error?.response?.data?.message || "Failed to load demo content.",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin(event) {
    event?.preventDefault();
    setLoading(true);
    try {
      const response = await createDevToken({
        email: credentials.email,
        password: credentials.password,
        token_name: "frontend-demo",
      });

      localStorage.setItem(STORAGE_TOKEN_KEY, response.token);
      localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(response.user));
      setAuthToken(response.token);
      setCurrentUser(response.user);
      setNotice({
        variant: "default",
        title: "Signed in",
        description: `You are now browsing as ${response.user.name} (${response.user.role}).`,
      });
    } catch (error) {
      setNotice({
        variant: "destructive",
        title: "Login failed",
        description: error?.response?.data?.message || "Unable to create a local dev token.",
      });
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem(STORAGE_TOKEN_KEY);
    localStorage.removeItem(STORAGE_USER_KEY);
    setAuthToken("");
    setCurrentUser(null);
    setAdminUsers([]);
    setModerationQueue([]);
    setPayments([]);
    setCredentials((prev) => ({ ...prev, password: DEFAULT_PASSWORD }));
    setNotice({
      variant: "default",
      title: "Signed out",
      description: "Back to guest mode. Public catalog remains visible.",
    });
  }

  async function handleEnroll() {
    if (!selectedCourse || currentUser?.role !== "student") {
      return;
    }

    setLoading(true);
    try {
      await authenticatedClient.post(`/courses/${selectedCourse.id}/enrollments`);
      await loadRoleData();
      setNotice({
        variant: "default",
        title: "Enrollment successful",
        description: `You are enrolled in ${selectedCourse.title}.`,
      });
    } catch (error) {
      setNotice({
        variant: "destructive",
        title: "Enrollment failed",
        description: error?.response?.data?.message || "Could not enroll in this course.",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleModeration(reviewId, isPublished) {
    setLoading(true);
    try {
      await authenticatedClient.patch(`/admin/moderation-queue/reviews/${reviewId}`, {
        is_published: isPublished,
      });
      await Promise.all([loadRoleData(), selectedCourse ? loadCourseDetails(selectedCourse.id) : Promise.resolve()]);
      setNotice({
        variant: "default",
        title: isPublished ? "Review approved" : "Review hidden",
        description: "Moderation queue updated.",
      });
    } catch (error) {
      setNotice({
        variant: "destructive",
        title: "Moderation failed",
        description: error?.response?.data?.message || "Could not update review visibility.",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authToken, currentUser?.role]);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(245,158,11,0.14),_transparent_32%),linear-gradient(180deg,_rgba(15,23,42,0.98),_rgba(15,23,42,1))] px-4 py-6 text-left text-slate-100 sm:px-6 lg:px-10">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <section className="overflow-hidden rounded-[32px] border border-white/10 bg-white/5 shadow-2xl backdrop-blur">
          <div className="grid gap-6 p-6 lg:grid-cols-[1.4fr_0.9fr] lg:p-8">
            <div className="space-y-4">
              <Badge variant="outline" className="border-amber-400/40 bg-amber-400/10 text-amber-100">
                Local demo mode
              </Badge>
              <div className="space-y-3">
                <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                  TechTutor demo console
                </h1>
                <p className="max-w-2xl text-sm text-slate-300 sm:text-base">
                  Seeded content, quick role login, and just enough UI to inspect student, instructor, and admin
                  states without building the whole product first.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-slate-300">
                <Badge variant="secondary" className="bg-white/10 text-white">
                  API: {api.defaults.baseURL}
                </Badge>
                <Badge variant="secondary" className="bg-white/10 text-white">
                  Shared demo password: {DEFAULT_PASSWORD}
                </Badge>
                {currentUser && (
                  <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-100">
                    Viewing as {currentUser.name}
                  </Badge>
                )}
              </div>
            </div>

            <Card className="border-white/10 bg-slate-950/70">
              <CardHeader>
                <CardTitle className="text-white">Quick login</CardTitle>
                <CardDescription>
                  Use seeded accounts to test different views. The frontend creates a local dev token behind the scenes.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2 sm:grid-cols-2">
                  {demoAccounts.map((account) => (
                    <button
                      key={account.email}
                      type="button"
                      onClick={() => setCredentials({ email: account.email, password: account.password })}
                      className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-left transition hover:border-amber-300/40 hover:bg-white/10"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-white">{account.label}</span>
                        <Badge variant={roleBadgeVariant(account.role)}>{account.role}</Badge>
                      </div>
                      <p className="mt-2 text-xs text-slate-400">{account.email}</p>
                    </button>
                  ))}
                </div>

                <form className="space-y-3" onSubmit={handleLogin}>
                  <Input
                    value={credentials.email}
                    onChange={(event) => setCredentials((prev) => ({ ...prev, email: event.target.value }))}
                    placeholder="Email"
                    className="border-white/10 bg-white/5 text-white placeholder:text-slate-500"
                  />
                  <Input
                    type="password"
                    value={credentials.password}
                    onChange={(event) => setCredentials((prev) => ({ ...prev, password: event.target.value }))}
                    placeholder="Password"
                    className="border-white/10 bg-white/5 text-white placeholder:text-slate-500"
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button type="submit" size="lg" disabled={loading}>
                      Sign in
                    </Button>
                    <Button type="button" size="lg" variant="outline" onClick={refreshDashboard} disabled={loading}>
                      <RefreshCcw className="mr-1 size-4" />
                      Refresh
                    </Button>
                    {currentUser && (
                      <Button type="button" size="lg" variant="ghost" onClick={handleLogout}>
                        <LogOut className="mr-1 size-4" />
                        Logout
                      </Button>
                    )}
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </section>

        {notice && (
          <Alert variant={notice.variant === "destructive" ? "destructive" : "default"}>
            <AlertTitle>{notice.title}</AlertTitle>
            <AlertDescription>{notice.description}</AlertDescription>
          </Alert>
        )}

        <section className="grid gap-6 xl:grid-cols-[1.25fr_0.9fr]">
          <div className="grid gap-6">
            <Card className="border-white/10 bg-slate-950/70">
              <CardHeader className="flex flex-row items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-white">Course catalog</CardTitle>
                  <CardDescription>
                    Guests and students see the public catalog. Instructor and admin sessions can inspect private content too.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="border-white/15 text-slate-300">
                  {courses.length} courses
                </Badge>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2">
                {courses.map((course) => (
                  <button
                    key={course.id}
                    type="button"
                    onClick={() => loadCourseDetails(course.id)}
                    className={`rounded-2xl border p-4 text-left transition ${
                      selectedCourse?.id === course.id
                        ? "border-amber-300/60 bg-amber-300/10"
                        : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-white">{course.title}</p>
                        <p className="mt-1 text-xs text-slate-400">/{course.slug}</p>
                      </div>
                      <Badge variant={course.is_published ? "secondary" : "outline"}>
                        {course.is_published ? "Published" : "Draft"}
                      </Badge>
                    </div>
                    <p className="mt-3 text-sm text-slate-300">
                      {course.description || "No description yet."}
                    </p>
                    <p className="mt-3 text-xs text-slate-400">${course.price}</p>
                  </button>
                ))}
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-slate-950/70">
              <CardHeader>
                <CardTitle className="text-white">
                  {selectedCourse ? selectedCourse.title : "Select a course"}
                </CardTitle>
                <CardDescription>
                  {selectedCourse
                    ? "Preview nested modules, lessons, and the review state for this seeded course."
                    : "Choose a course from the catalog to inspect its details."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {!selectedCourse && <p className="text-sm text-slate-400">No course selected yet.</p>}

                {selectedCourse && (
                  <>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="border-white/15 text-slate-300">
                        ${selectedCourse.price}
                      </Badge>
                      <Badge variant={selectedCourse.is_published ? "secondary" : "outline"}>
                        {selectedCourse.is_published ? "Published" : "Draft"}
                      </Badge>
                      {currentUser?.role === "student" && (
                        <Button size="sm" onClick={handleEnroll} disabled={loading}>
                          Enroll
                        </Button>
                      )}
                    </div>

                    <p className="text-sm text-slate-300">{selectedCourse.description}</p>
                    <Separator className="bg-white/10" />

                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Modules</h3>
                      {(selectedCourse.modules || []).map((module) => (
                        <div key={module.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                          <div className="flex items-center justify-between gap-3">
                            <p className="font-medium text-white">{module.title}</p>
                            <span className="text-xs text-slate-500">/{module.slug}</span>
                          </div>
                          <div className="mt-3 space-y-2">
                            {(module.lessons || []).map((lesson) => (
                              <div
                                key={lesson.id}
                                className="flex items-center justify-between rounded-xl border border-white/10 px-3 py-2 text-sm"
                              >
                                <span className="text-slate-200">{lesson.title}</span>
                                <Badge variant={lesson.is_preview ? "secondary" : "outline"}>
                                  {lesson.is_preview ? "Preview" : lesson.type}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    {authToken && (
                      <>
                        <Separator className="bg-white/10" />
                        <div className="space-y-3">
                          <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">Reviews</h3>
                          {reviews.length === 0 && (
                            <p className="text-sm text-slate-400">
                              No visible reviews for this viewer yet. Admins still have the moderation queue.
                            </p>
                          )}
                          {reviews.map((review) => (
                            <div key={review.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <p className="font-medium text-white">{review.user?.name}</p>
                                  <p className="text-xs text-slate-500">{review.rating}/5 rating</p>
                                </div>
                                <Badge variant={review.is_published ? "secondary" : "outline"}>
                                  {review.is_published ? "Visible" : "Hidden"}
                                </Badge>
                              </div>
                              <p className="mt-3 text-sm text-slate-300">{review.comment || "No comment."}</p>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6">
            <Card className="border-white/10 bg-slate-950/70">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <CreditCard className="size-4" />
                  {currentUser ? `${currentUser.role} payments view` : "Role-based payments"}
                </CardTitle>
                <CardDescription>
                  Students see their purchases, instructors see revenue for their courses, and admins see everything.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {!currentUser && <p className="text-sm text-slate-400">Sign in to load payment data.</p>}
                {currentUser && payments.length === 0 && <p className="text-sm text-slate-400">No payments found.</p>}
                {payments.map((payment) => (
                  <div key={payment.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium text-white">{payment.course?.title || "Course payment"}</p>
                      <Badge variant="secondary">
                        {payment.currency} {payment.amount}
                      </Badge>
                    </div>
                    <p className="mt-2 text-xs text-slate-400">
                      {payment.provider} • {payment.user?.name || currentUser?.name}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>

            {currentUser?.role === "admin" && (
              <>
                <Card className="border-white/10 bg-slate-950/70">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-white">
                      <UserRound className="size-4" />
                      User management
                    </CardTitle>
                    <CardDescription>Seeded accounts let you test admin list, roles, and banned states.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {adminUsers.map((user) => (
                      <div key={user.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="font-medium text-white">{user.name}</p>
                            <p className="text-xs text-slate-400">{user.email}</p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Badge variant={roleBadgeVariant(user.role)}>{user.role}</Badge>
                            {user.is_banned && <Badge variant="destructive">banned</Badge>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card className="border-white/10 bg-slate-950/70">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-white">
                      <ShieldCheck className="size-4" />
                      Moderation queue
                    </CardTitle>
                    <CardDescription>Approve or hide seeded unpublished reviews directly from the admin view.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {moderationQueue.length === 0 && <p className="text-sm text-slate-400">Queue is empty.</p>}
                    {moderationQueue.map((item) => (
                      <div key={item.review.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                        <div className="flex items-center justify-between gap-2">
                          <Badge variant="outline">{item.content_type}</Badge>
                          <p className="text-xs text-slate-500">{item.review.course?.title}</p>
                        </div>
                        <p className="mt-3 font-medium text-white">{item.review.user?.name}</p>
                        <p className="mt-1 text-sm text-slate-300">{item.review.comment}</p>
                        <div className="mt-4 flex flex-wrap gap-2">
                          <Button size="sm" onClick={() => handleModeration(item.review.id, true)} disabled={loading}>
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleModeration(item.review.id, false)}
                            disabled={loading}
                          >
                            Keep hidden
                          </Button>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </>
            )}

            <Card className="border-white/10 bg-slate-950/70">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <BookOpen className="size-4" />
                  Demo notes
                </CardTitle>
                <CardDescription>Useful local testing hints so you can move quickly between views.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-slate-300">
                <p>
                  Use <span className="font-mono text-amber-200">composer db:fresh</span> to reseed everything quickly.
                </p>
                <p>
                  Use <span className="font-mono text-amber-200">composer db:reset-hard</span> when you want to wipe the
                  Docker-backed Postgres data directory too.
                </p>
                <p>All demo accounts use the same password: <span className="font-mono text-amber-200">password</span>.</p>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </main>
  );
}

export default App;
