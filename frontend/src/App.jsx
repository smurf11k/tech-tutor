import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  CreditCard,
  LogOut,
  RefreshCcw,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import api, {
  backendOrigin,
  buildGoogleLoginUrl,
  loginUser,
  withAuth,
} from "@/lib/api";
import {
  parsePaymentReturnFromUrl,
  fetchPaymentStatus,
} from "@/hooks/usePaymentReturn";
import ResetPassword from "@/pages/ResetPassword";
import AcceptInvite from "@/pages/AcceptInvite";

const STORAGE_TOKEN_KEY = "techtutor_token";
const STORAGE_USER_KEY = "techtutor_user";
const DEFAULT_PASSWORD = "password";
const GOOGLE_AUTH_MESSAGE_TYPE = "techtutor-google-auth";
const STRIPE_CURRENCY = (
  import.meta.env.VITE_STRIPE_CURRENCY || "USD"
).toUpperCase();

function formatAmountWithCurrency(value, currency = STRIPE_CURRENCY) {
  const amount = value ?? "0.00";
  const code = (currency || STRIPE_CURRENCY).toUpperCase();
  return `${code} ${amount}`;
}

const defaultCatalogFilters = {
  q: "",
  category: "",
  level: "",
  price_type: "",
  sort: "newest",
};

const demoAccounts = [
  {
    role: "student",
    label: "Student",
    email: "student@techtutor.test",
    password: DEFAULT_PASSWORD,
  },
  {
    role: "student",
    label: "Student 2",
    email: "student2@techtutor.test",
    password: DEFAULT_PASSWORD,
  },
  {
    role: "instructor",
    label: "Instructor",
    email: "instructor@techtutor.test",
    password: DEFAULT_PASSWORD,
  },
  {
    role: "admin",
    label: "Admin",
    email: "admin@techtutor.test",
    password: DEFAULT_PASSWORD,
  },
  {
    role: "banned",
    label: "Banned",
    email: "banned@techtutor.test",
    password: DEFAULT_PASSWORD,
  },
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

function isGoogleAuthMessage(event) {
  return (
    event.origin === backendOrigin &&
    event.data?.type === GOOGLE_AUTH_MESSAGE_TYPE
  );
}

function App() {
  // Check if we're on the password reset page
  const searchParams = new URLSearchParams(window.location.search);
  const resetToken = searchParams.get("token");
  const resetEmail = searchParams.get("email");
  const inviteToken = searchParams.get("token");

  if (window.location.pathname === "/invite" && inviteToken) {
    return <AcceptInvite token={inviteToken} />;
  }

  if (resetToken && resetEmail) {
    return <ResetPassword token={resetToken} email={resetEmail} />;
  }

  const storedSession = readStoredSession();

  const [authToken, setAuthToken] = useState(storedSession.token);
  const [currentUser, setCurrentUser] = useState(storedSession.user);
  const [credentials, setCredentials] = useState({
    email: storedSession.user?.email ?? demoAccounts[0].email,
    password: DEFAULT_PASSWORD,
    captcha_token: "",
  });
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizAnalytics, setQuizAnalytics] = useState({});
  const [payments, setPayments] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [instructorDashboard, setInstructorDashboard] = useState(null);
  const [adminPlatformDashboard, setAdminPlatformDashboard] = useState(null);
  const [adminUsers, setAdminUsers] = useState([]);
  const [inviteForm, setInviteForm] = useState({
    email: "",
    role: "instructor",
  });
  const [lastInviteUrl, setLastInviteUrl] = useState("");
  const [moderationQueue, setModerationQueue] = useState([]);
  const [catalogFilters, setCatalogFilters] = useState(defaultCatalogFilters);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
  const [showSignUp, setShowSignUp] = useState(false);
  const [signUpStep, setSignUpStep] = useState("request-code"); // 'request-code' or 'verify-code'
  const [signUpData, setSignUpData] = useState({
    name: "",
    email: "",
    password: "",
    password_confirmation: "",
    code: "",
  });
  const [lessonDrafts, setLessonDrafts] = useState({});
  const [uploadingModuleId, setUploadingModuleId] = useState(null);
  const [openingLessonId, setOpeningLessonId] = useState(null);
  const [editingLessonId, setEditingLessonId] = useState(null);
  const [lessonEditDrafts, setLessonEditDrafts] = useState({});
  const [savingLessonId, setSavingLessonId] = useState(null);
  const [deletingLessonId, setDeletingLessonId] = useState(null);

  const authenticatedClient = useMemo(() => withAuth(authToken), [authToken]);
  const canSeePrivateCatalog =
    currentUser?.role === "admin" || currentUser?.role === "instructor";
  const catalogClient = canSeePrivateCatalog ? authenticatedClient : api;

  useEffect(() => {
    function handleGoogleAuthMessage(event) {
      if (!isGoogleAuthMessage(event)) {
        return;
      }

      const payload = event.data?.payload;

      if (payload?.token && payload?.user) {
        localStorage.setItem(STORAGE_TOKEN_KEY, payload.token);
        localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(payload.user));
        setAuthToken(payload.token);
        setCurrentUser(payload.user);
        setCredentials({
          email: payload.user.email,
          password: DEFAULT_PASSWORD,
          captcha_token: "",
        });
        setNotice({
          variant: "default",
          title: "Google sign-in complete",
          description:
            event.data?.message ||
            `You are now browsing as ${payload.user.name} (${payload.user.role}).`,
        });
        return;
      }

      setNotice({
        variant: "destructive",
        title: "Google sign-in failed",
        description:
          event.data?.message || "Google did not return a usable session.",
      });
    }

    window.addEventListener("message", handleGoogleAuthMessage);

    return () => window.removeEventListener("message", handleGoogleAuthMessage);
  }, []);

  function buildLessonSlug(value) {
    return String(value ?? "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 255);
  }

  function getLessonDraft(moduleId) {
    return (
      lessonDrafts[moduleId] ?? {
        title: "",
        slug: "",
        is_preview: false,
        lesson_file: null,
      }
    );
  }

  function updateLessonDraft(moduleId, patch) {
    setLessonDrafts((prev) => ({
      ...prev,
      [moduleId]: {
        ...getLessonDraft(moduleId),
        ...patch,
      },
    }));
  }

  function getLessonEditDraft(lesson) {
    return (
      lessonEditDrafts[lesson.id] ?? {
        title: lesson.title ?? "",
        slug: lesson.slug ?? "",
        type: lesson.type ?? "text",
        is_preview: Boolean(lesson.is_preview),
        lesson_file: null,
      }
    );
  }

  function updateLessonEditDraft(lessonId, patch) {
    setLessonEditDrafts((prev) => ({
      ...prev,
      [lessonId]: {
        ...(prev[lessonId] ?? {}),
        ...patch,
      },
    }));
  }

  function startLessonEdit(lesson) {
    setEditingLessonId(lesson.id);
    setLessonEditDrafts((prev) => ({
      ...prev,
      [lesson.id]: {
        title: lesson.title ?? "",
        slug: lesson.slug ?? "",
        type: lesson.type ?? "text",
        is_preview: Boolean(lesson.is_preview),
        lesson_file: null,
      },
    }));
  }

  function cancelLessonEdit(lessonId) {
    setEditingLessonId((prev) => (prev === lessonId ? null : prev));
  }

  async function loadCourseDetails(courseId, client = catalogClient) {
    const response = await client.get(`/courses/${courseId}`);
    setSelectedCourse(response.data);
    setQuizAnswers({});
    setQuizAnalytics({});

    if (
      authToken &&
      (currentUser?.role === "instructor" || currentUser?.role === "admin")
    ) {
      const quizzes = Array.isArray(response.data?.quizzes)
        ? response.data.quizzes
        : [];
      const analyticsEntries = await Promise.all(
        quizzes.map(async (quiz) => {
          try {
            const analyticsResponse = await authenticatedClient.get(
              `/quizzes/${quiz.id}/analytics`,
            );

            return [quiz.id, analyticsResponse.data];
          } catch {
            return [quiz.id, null];
          }
        }),
      );

      setQuizAnalytics(
        Object.fromEntries(
          analyticsEntries.filter(([, analytics]) => analytics !== null),
        ),
      );
    }

    if (!authToken) {
      setReviews([]);
      return;
    }

    try {
      const reviewsResponse = await authenticatedClient.get(
        `/courses/${courseId}/reviews`,
      );
      setReviews(
        Array.isArray(reviewsResponse.data) ? reviewsResponse.data : [],
      );
    } catch {
      setReviews([]);
    }
  }

  async function loadCourses(client = catalogClient) {
    const params = Object.fromEntries(
      Object.entries(catalogFilters).filter(
        ([, value]) => value !== null && value !== undefined && value !== "",
      ),
    );
    const response = await client.get("/courses", { params });
    const nextCourses = response.data?.data ?? response.data ?? [];
    const normalizedCourses = Array.isArray(nextCourses) ? nextCourses : [];
    setCourses(normalizedCourses);

    if (normalizedCourses.length === 0) {
      setSelectedCourse(null);
      setReviews([]);
      return;
    }

    const preferredCourseId = selectedCourse?.id ?? normalizedCourses[0].id;
    const courseToLoad =
      normalizedCourses.find((course) => course.id === preferredCourseId) ??
      normalizedCourses[0];
    await loadCourseDetails(courseToLoad.id, client);
  }

  async function handleCatalogFiltersSubmit(event) {
    event.preventDefault();
    setLoading(true);
    try {
      await loadCourses();
      setNotice(null);
    } catch (error) {
      setNotice({
        variant: "destructive",
        title: "Catalog filter failed",
        description:
          error?.response?.data?.message || "Could not apply catalog filters.",
      });
    } finally {
      setLoading(false);
    }
  }

  async function clearCatalogFilters() {
    setCatalogFilters(defaultCatalogFilters);
    setLoading(true);
    try {
      const response = await catalogClient.get("/courses", {
        params: { sort: defaultCatalogFilters.sort },
      });
      const nextCourses = response.data?.data ?? response.data ?? [];
      const normalizedCourses = Array.isArray(nextCourses) ? nextCourses : [];
      setCourses(normalizedCourses);

      if (normalizedCourses.length === 0) {
        setSelectedCourse(null);
        setReviews([]);
        return;
      }

      await loadCourseDetails(normalizedCourses[0].id, catalogClient);
      setNotice(null);
    } catch (error) {
      setNotice({
        variant: "destructive",
        title: "Catalog reset failed",
        description:
          error?.response?.data?.message || "Could not reset catalog filters.",
      });
    } finally {
      setLoading(false);
    }
  }

  async function loadRoleData() {
    if (!authToken) {
      setPayments([]);
      setCertificates([]);
      setInstructorDashboard(null);
      setAdminPlatformDashboard(null);
      setAdminUsers([]);
      setModerationQueue([]);
      return;
    }

    const paymentRequest = authenticatedClient.get("/payments");
    const certificateRequest = authenticatedClient.get("/certificates");
    const dashboardRequest =
      currentUser?.role === "instructor" || currentUser?.role === "admin"
        ? authenticatedClient.get("/instructor/dashboard")
        : Promise.resolve(null);
    const userRequest =
      currentUser?.role === "admin"
        ? authenticatedClient.get("/admin/users")
        : Promise.resolve(null);
    const platformDashboardRequest =
      currentUser?.role === "admin"
        ? authenticatedClient.get("/admin/platform-dashboard")
        : Promise.resolve(null);
    const moderationRequest =
      currentUser?.role === "admin"
        ? authenticatedClient.get("/admin/moderation-queue")
        : Promise.resolve(null);

    const [
      paymentsResponse,
      certificatesResponse,
      dashboardResponse,
      usersResponse,
      platformDashboardResponse,
      moderationResponse,
    ] = await Promise.all([
      paymentRequest,
      certificateRequest,
      dashboardRequest,
      userRequest,
      platformDashboardRequest,
      moderationRequest,
    ]);

    setPayments(
      Array.isArray(paymentsResponse.data) ? paymentsResponse.data : [],
    );
    setCertificates(
      Array.isArray(certificatesResponse.data) ? certificatesResponse.data : [],
    );
    setInstructorDashboard(dashboardResponse?.data ?? null);
    setAdminPlatformDashboard(platformDashboardResponse?.data ?? null);
    setAdminUsers(usersResponse?.data?.data ?? []);
    setModerationQueue(
      Array.isArray(moderationResponse?.data) ? moderationResponse.data : [],
    );
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
        description:
          error?.response?.data?.message || "Failed to load demo content.",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin(event) {
    event?.preventDefault();
    setLoading(true);
    try {
      const response = await loginUser({
        email: credentials.email,
        password: credentials.password,
        captcha_token: credentials.captcha_token,
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
        description:
          error?.response?.data?.message ||
          "Unable to sign in with these credentials.",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleRequestVerificationCode(event) {
    event?.preventDefault();
    setLoading(true);
    try {
      await api.post("/auth/register/request-verification-code", {
        name: signUpData.name.trim(),
        email: signUpData.email.toLowerCase().trim(),
        password: signUpData.password,
        password_confirmation: signUpData.password_confirmation,
      });

      setSignUpStep("verify-code");
      setNotice({
        variant: "default",
        title: "Verification code sent",
        description: `Check your email at ${signUpData.email} for the 6-digit code.`,
      });
    } catch (error) {
      setNotice({
        variant: "destructive",
        title: "Sign-up request failed",
        description:
          error?.response?.data?.message || "Could not send verification code.",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleSignUpVerifyCode(event) {
    event?.preventDefault();
    setLoading(true);
    try {
      const response = await api.post("/auth/register/verify-code", {
        email: signUpData.email.toLowerCase().trim(),
        code: signUpData.code.trim(),
        name: signUpData.name.trim(),
        password: signUpData.password,
        password_confirmation: signUpData.password_confirmation,
        role: "student",
        token_name: "frontend-demo",
      });

      localStorage.setItem(STORAGE_TOKEN_KEY, response.token);
      localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(response.user));
      setAuthToken(response.token);
      setCurrentUser(response.user);
      setShowSignUp(false);
      setSignUpStep("request-code");
      setSignUpData({
        name: "",
        email: "",
        password: "",
        password_confirmation: "",
        code: "",
      });
      setNotice({
        variant: "default",
        title: "Sign-up complete",
        description: `Welcome ${response.user.name}! Your email is verified.`,
      });
    } catch (error) {
      setNotice({
        variant: "destructive",
        title: "Sign-up verification failed",
        description:
          error?.response?.data?.message || "Could not verify your email code.",
      });
    } finally {
      setLoading(false);
    }
  }

  function handleGoogleLogin() {
    const popup = window.open(
      buildGoogleLoginUrl(window.location.origin),
      "techtutor-google-auth",
      "width=520,height=720",
    );

    if (!popup) {
      setNotice({
        variant: "destructive",
        title: "Popup blocked",
        description: "Allow popups for the Google sign-in demo.",
      });
      return;
    }

    popup.focus();
    setNotice({
      variant: "default",
      title: "Google sign-in started",
      description: "Finish the Google flow in the popup window.",
    });
  }

  function handleDemoCaptcha() {
    setCredentials((prev) => ({
      ...prev,
      captcha_token: "demo-captcha-token",
    }));

    setNotice({
      variant: "default",
      title: "Demo CAPTCHA enabled",
      description:
        "The demo shell now sends a placeholder CAPTCHA token for local testing.",
    });
  }

  function clearDemoCaptcha() {
    setCredentials((prev) => ({
      ...prev,
      captcha_token: "",
    }));
  }

  async function handleForgotPasswordRequest(event) {
    event?.preventDefault();
    setLoading(true);
    try {
      await api.post("/auth/forgot-password", {
        email: forgotPasswordEmail,
      });

      setNotice({
        variant: "default",
        title: "Password reset email sent",
        description: `Check your email (${forgotPasswordEmail}) for the reset link.`,
      });

      setShowForgotPassword(false);
      setForgotPasswordEmail("");
    } catch (error) {
      setNotice({
        variant: "destructive",
        title: "Forgot password request failed",
        description:
          error?.response?.data?.message ||
          "Could not process forgot password request.",
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
    setCertificates([]);
    setInstructorDashboard(null);
    setAdminPlatformDashboard(null);
    setCredentials((prev) => ({
      ...prev,
      password: DEFAULT_PASSWORD,
      captcha_token: "",
    }));
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
      await authenticatedClient.post(
        `/courses/${selectedCourse.id}/enrollments`,
      );
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
        description:
          error?.response?.data?.message || "Could not enroll in this course.",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handlePurchaseCourse() {
    if (!selectedCourse || currentUser?.role !== "student") {
      return;
    }

    setLoading(true);
    try {
      const response = await authenticatedClient.post(
        `/courses/${selectedCourse.id}/payments`,
        {
          provider: "manual_demo",
          amount: Number(selectedCourse.price),
          currency: STRIPE_CURRENCY.toLowerCase(),
          provider_payload: {
            source: "frontend_demo",
          },
        },
      );

      await Promise.all([loadRoleData(), loadCourseDetails(selectedCourse.id)]);
      setNotice({
        variant: "default",
        title: "Purchase complete",
        description: `Receipt ${response.data.payment.receipt_number} issued and enrollment is active.`,
      });
    } catch (error) {
      setNotice({
        variant: "destructive",
        title: "Purchase failed",
        description:
          error?.response?.data?.message || "Could not purchase this course.",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleStripeCheckout() {
    if (!selectedCourse || currentUser?.role !== "student") {
      return;
    }

    setLoading(true);
    try {
      const successUrl =
        import.meta.env.VITE_STRIPE_SUCCESS_URL ||
        "http://localhost:5173/payment/success"; // fallback
      const cancelUrl =
        import.meta.env.VITE_STRIPE_CANCEL_URL ||
        "http://localhost:5173/payment/cancel"; // fallback

      const response = await authenticatedClient.post(
        `/courses/${selectedCourse.id}/payments/stripe-checkout`,
        {
          success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: cancelUrl,
        },
      );

      const checkoutUrl = response.data.checkout?.url;

      if (checkoutUrl) {
        window.location.assign(checkoutUrl);
        return;
      }

      await loadRoleData();
      setNotice({
        variant: "default",
        title: "Stripe checkout created",
        description:
          "Complete payment in Stripe and you will be redirected back for automatic confirmation.",
      });
    } catch (error) {
      setNotice({
        variant: "destructive",
        title: "Stripe checkout failed",
        description:
          error?.response?.data?.message ||
          "Could not create a Stripe checkout session.",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleStripeReturnFromUrl() {
    const { sessionId, courseId } = parsePaymentReturnFromUrl(
      window.location.search,
    );

    if (!sessionId) {
      return;
    }

    // Clean URL to remove payment params
    const cleanedUrl = new URL(window.location.href);
    cleanedUrl.searchParams.delete("session_id");
    cleanedUrl.searchParams.delete("sessionId");
    cleanedUrl.searchParams.delete("course_id");
    cleanedUrl.searchParams.delete("courseId");
    window.history.replaceState({}, "", cleanedUrl.toString());

    setLoading(true);
    try {
      if (authToken) {
        await authenticatedClient.post("/payments/stripe/confirm", {
          session_id: sessionId,
        });
      }

      const statusResponse = await fetchPaymentStatus({
        sessionId,
        courseId,
      });

      if (
        statusResponse.status === "completed" ||
        statusResponse.status === "paid"
      ) {
        await Promise.all([
          loadRoleData(),
          courseId ? loadCourseDetails(Number(courseId)) : Promise.resolve(),
        ]);

        setNotice({
          variant: "default",
          title: "Payment successful",
          description:
            "Your payment has been verified. You can enroll now if the course is still showing a lock.",
        });
      } else if (statusResponse.status === "pending") {
        setNotice({
          variant: "default",
          title: "Payment processing",
          description:
            "Your payment is being processed. Enrollment will be activated shortly.",
        });
      } else if (statusResponse.status === "failed") {
        setNotice({
          variant: "destructive",
          title: "Payment failed",
          description: "Payment processing failed. Please try again.",
        });
      } else {
        setNotice({
          variant: "default",
          title: "Payment status",
          description: `Current status: ${statusResponse.status}`,
        });
      }
    } catch (error) {
      // Fallback: treat as pending (webhook may still be processing)
      setNotice({
        variant: "default",
        title: "Checking payment status",
        description:
          "We are verifying your payment. Please refresh if it doesn't update.",
      });
    } finally {
      setLoading(false);
    }
  }

  function handleQuizAnswerChange(quizId, question, optionKey, checked = true) {
    setQuizAnswers((prev) => {
      const quizState = prev[quizId] ?? {};

      if (question.type === "multiple_choice") {
        const currentAnswers = Array.isArray(quizState[question.id])
          ? quizState[question.id]
          : [];
        const nextAnswers = checked
          ? [...new Set([...currentAnswers, optionKey])]
          : currentAnswers.filter((key) => key !== optionKey);

        return {
          ...prev,
          [quizId]: {
            ...quizState,
            [question.id]: nextAnswers,
          },
        };
      }

      return {
        ...prev,
        [quizId]: {
          ...quizState,
          [question.id]: optionKey,
        },
      };
    });
  }

  async function handleQuizAttempt(quiz) {
    if (!currentUser || !selectedCourse) {
      return;
    }

    setLoading(true);
    try {
      const response = await authenticatedClient.post(
        `/quizzes/${quiz.id}/attempts`,
        {
          answers: quizAnswers[quiz.id] ?? {},
        },
      );

      setNotice({
        variant: "default",
        title: response.data.passed ? "Quiz passed" : "Quiz submitted",
        description: `Backend calculated score: ${response.data.score}%.`,
      });
      await loadCourseDetails(selectedCourse.id);
    } catch (error) {
      setNotice({
        variant: "destructive",
        title: "Quiz submission failed",
        description:
          error?.response?.data?.message || "Could not submit quiz attempt.",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleLessonComplete(lesson) {
    if (!selectedCourse || currentUser?.role !== "student") {
      return;
    }

    setLoading(true);
    try {
      const response = await authenticatedClient.post(
        `/lessons/${lesson.id}/progress`,
        {
          progress_percent: 100,
        },
      );

      await Promise.all([loadRoleData(), loadCourseDetails(selectedCourse.id)]);

      setNotice({
        variant: "default",
        title: response.data.certificate
          ? "Certificate issued"
          : "Lesson completed",
        description: response.data.certificate
          ? `Certificate ${response.data.certificate.certificate_number} is ready.`
          : `${lesson.title} marked complete.`,
      });
    } catch (error) {
      setNotice({
        variant: "destructive",
        title: "Progress update failed",
        description:
          error?.response?.data?.message || "Could not mark lesson complete.",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateFileLesson(event, module) {
    event.preventDefault();

    if (!selectedCourse) {
      return;
    }

    if (!currentUser || !["instructor", "admin"].includes(currentUser.role)) {
      return;
    }

    const draft = getLessonDraft(module.id);
    const title = draft.title.trim();
    const slug = (draft.slug.trim() || buildLessonSlug(title)).slice(0, 255);

    if (!title) {
      setNotice({
        variant: "destructive",
        title: "Lesson title required",
        description: "Enter a lesson title before uploading.",
      });
      return;
    }

    if (!slug) {
      setNotice({
        variant: "destructive",
        title: "Lesson slug required",
        description: "Enter a valid lesson slug (letters, numbers, dashes).",
      });
      return;
    }

    if (!draft.lesson_file) {
      setNotice({
        variant: "destructive",
        title: "Attachment required",
        description:
          "Choose a lesson file (.md, .txt, .pdf, etc.) before creating the lesson.",
      });
      return;
    }

    const formData = new FormData();
    formData.append("title", title);
    formData.append("slug", slug);
    formData.append("type", "file");
    formData.append("is_preview", draft.is_preview ? "1" : "0");
    formData.append("lesson_file", draft.lesson_file);

    setUploadingModuleId(module.id);
    try {
      await authenticatedClient.post(
        `/modules/${module.id}/lessons`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        },
      );

      await loadCourseDetails(selectedCourse.id);

      setLessonDrafts((prev) => ({
        ...prev,
        [module.id]: {
          title: "",
          slug: "",
          is_preview: false,
          lesson_file: null,
        },
      }));

      setNotice({
        variant: "default",
        title: "Lesson uploaded",
        description: `File lesson created in ${module.title}.`,
      });
    } catch (error) {
      setNotice({
        variant: "destructive",
        title: "Lesson upload failed",
        description:
          error?.response?.data?.message ||
          "Could not create the file lesson. Check title/slug uniqueness and file format.",
      });
    } finally {
      setUploadingModuleId(null);
    }
  }

  async function handleOpenLessonAttachment(lesson) {
    if (!currentUser) {
      return;
    }

    setOpeningLessonId(lesson.id);
    try {
      const response = await authenticatedClient.get(
        `/lessons/${lesson.id}/attachment`,
        {
          responseType: "blob",
        },
      );

      const blobUrl = window.URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.target = "_blank";
      link.rel = "noreferrer";
      link.click();

      window.setTimeout(() => window.URL.revokeObjectURL(blobUrl), 15000);
    } catch (error) {
      setNotice({
        variant: "destructive",
        title: "Attachment open failed",
        description:
          error?.response?.data?.message ||
          "Could not open this attachment. Please try again.",
      });
    } finally {
      setOpeningLessonId(null);
    }
  }

  async function handleUpdateLesson(module, lesson) {
    if (!selectedCourse || !currentUser) {
      return;
    }

    if (!["instructor", "admin"].includes(currentUser.role)) {
      return;
    }

    const draft = getLessonEditDraft(lesson);
    const title = String(draft.title ?? "").trim();
    const slug = String(draft.slug ?? "").trim();

    if (!title || !slug) {
      setNotice({
        variant: "destructive",
        title: "Lesson update failed",
        description: "Title and slug are required.",
      });
      return;
    }

    const formData = new FormData();
    formData.append("_method", "PUT");
    formData.append("title", title);
    formData.append("slug", slug);
    formData.append("type", draft.type || "text");
    formData.append("is_preview", draft.is_preview ? "1" : "0");
    formData.append("position", String(lesson.position ?? 0));

    if (draft.lesson_file) {
      formData.append("lesson_file", draft.lesson_file);
    }

    setSavingLessonId(lesson.id);
    try {
      await authenticatedClient.post(
        `/modules/${module.id}/lessons/${lesson.id}`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        },
      );

      await loadCourseDetails(selectedCourse.id);
      setEditingLessonId(null);

      setNotice({
        variant: "default",
        title: "Lesson updated",
        description: `${lesson.title} was updated successfully.`,
      });
    } catch (error) {
      setNotice({
        variant: "destructive",
        title: "Lesson update failed",
        description:
          error?.response?.data?.message ||
          "Could not update this lesson. Check title/slug and try again.",
      });
    } finally {
      setSavingLessonId(null);
    }
  }

  async function handleDeleteLesson(module, lesson) {
    if (!selectedCourse || !currentUser) {
      return;
    }

    if (!["instructor", "admin"].includes(currentUser.role)) {
      return;
    }

    const shouldDelete = window.confirm(
      `Delete lesson \"${lesson.title}\"? This cannot be undone.`,
    );

    if (!shouldDelete) {
      return;
    }

    setDeletingLessonId(lesson.id);
    try {
      await authenticatedClient.delete(
        `/modules/${module.id}/lessons/${lesson.id}`,
      );
      await loadCourseDetails(selectedCourse.id);
      setEditingLessonId((prev) => (prev === lesson.id ? null : prev));

      setNotice({
        variant: "default",
        title: "Lesson deleted",
        description: `${lesson.title} was removed.`,
      });
    } catch (error) {
      setNotice({
        variant: "destructive",
        title: "Lesson delete failed",
        description:
          error?.response?.data?.message ||
          "Could not delete this lesson right now.",
      });
    } finally {
      setDeletingLessonId(null);
    }
  }

  async function handleSendUserInvite(event) {
    event?.preventDefault();
    setLoading(true);

    try {
      const response = await authenticatedClient.post("/admin/users/invites", {
        email: inviteForm.email.toLowerCase().trim(),
        role: inviteForm.role,
      });

      setLastInviteUrl(response.data.invite_url ?? "");
      setInviteForm((prev) => ({ ...prev, email: "" }));
      setNotice({
        variant: "default",
        title: "Invitation sent",
        description: `Invite link for ${response.data.role} role expires in 5 minutes. Open the link below if email is not configured locally.`,
      });
    } catch (error) {
      setNotice({
        variant: "destructive",
        title: "Invitation failed",
        description:
          error?.response?.data?.message ||
          error?.response?.data?.errors?.email?.[0] ||
          "Could not send the invitation.",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleModeration(item, isPublished) {
    const content = item.review ?? item.comment;
    const moderationType =
      item.content_type === "comment" ? "comments" : "reviews";

    if (!content?.id) {
      return;
    }

    setLoading(true);
    try {
      await authenticatedClient.patch(
        `/admin/moderation-queue/${moderationType}/${content.id}`,
        {
          is_published: isPublished,
        },
      );
      await Promise.all([
        loadRoleData(),
        selectedCourse
          ? loadCourseDetails(selectedCourse.id)
          : Promise.resolve(),
      ]);
      setNotice({
        variant: "default",
        title: isPublished ? "Content approved" : "Content hidden",
        description: "Moderation queue updated.",
      });
    } catch (error) {
      setNotice({
        variant: "destructive",
        title: "Moderation failed",
        description:
          error?.response?.data?.message ||
          "Could not update content visibility.",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authToken, currentUser?.role]);

  useEffect(() => {
    handleStripeReturnFromUrl();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authToken]);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(245,158,11,0.14),_transparent_32%),linear-gradient(180deg,_rgba(15,23,42,0.98),_rgba(15,23,42,1))] px-4 py-6 text-left text-slate-100 sm:px-6 lg:px-10">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <section className="overflow-hidden rounded-[32px] border border-white/10 bg-white/5 shadow-2xl backdrop-blur">
          <div className="grid gap-6 p-6 lg:grid-cols-[1.4fr_0.9fr] lg:p-8">
            <div className="space-y-4">
              <Badge
                variant="outline"
                className="border-amber-400/40 bg-amber-400/10 text-amber-100"
              >
                Local demo mode
              </Badge>
              <div className="space-y-3">
                <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                  TechTutor demo console
                </h1>
                <p className="max-w-2xl text-sm text-slate-300 sm:text-base">
                  Seeded content, quick role login, and just enough UI to
                  inspect student, instructor, and admin states without building
                  the whole product first.
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
                  <Badge
                    variant="secondary"
                    className="bg-emerald-500/20 text-emerald-100"
                  >
                    Viewing as {currentUser.name}
                  </Badge>
                )}
              </div>
            </div>

            <Card className="border-white/10 bg-slate-950/70">
              <CardHeader>
                <CardTitle className="text-white">Quick login</CardTitle>
                <CardDescription>
                  Use seeded accounts to test different views. The frontend
                  signs in through the real auth API.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2 sm:grid-cols-2">
                  {demoAccounts.map((account) => (
                    <button
                      key={account.email}
                      type="button"
                      onClick={() =>
                        setCredentials({
                          email: account.email,
                          password: account.password,
                          captcha_token: "",
                        })
                      }
                      className="rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-left transition hover:border-amber-300/40 hover:bg-white/10"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-white">
                          {account.label}
                        </span>
                        <Badge variant={roleBadgeVariant(account.role)}>
                          {account.role}
                        </Badge>
                      </div>
                      <p className="mt-2 text-xs text-slate-400">
                        {account.email}
                      </p>
                    </button>
                  ))}
                </div>

                <form className="space-y-3" onSubmit={handleLogin}>
                  <Input
                    value={credentials.email}
                    onChange={(event) =>
                      setCredentials((prev) => ({
                        ...prev,
                        email: event.target.value,
                      }))
                    }
                    placeholder="Email"
                    className="border-white/10 bg-white/5 text-white placeholder:text-slate-500"
                  />
                  <Input
                    type="password"
                    value={credentials.password}
                    onChange={(event) =>
                      setCredentials((prev) => ({
                        ...prev,
                        password: event.target.value,
                      }))
                    }
                    placeholder="Password"
                    className="border-white/10 bg-white/5 text-white placeholder:text-slate-500"
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button type="submit" size="lg" disabled={loading}>
                      Sign in
                    </Button>
                    <Button
                      type="button"
                      size="lg"
                      variant="outline"
                      onClick={() => {
                        setShowSignUp(true);
                        setSignUpStep("request-code");
                        setSignUpData({
                          name: "",
                          email: "",
                          password: "",
                          password_confirmation: "",
                          code: "",
                        });
                      }}
                      disabled={loading}
                    >
                      Sign up
                    </Button>
                    <Button
                      type="button"
                      size="lg"
                      variant="outline"
                      onClick={handleDemoCaptcha}
                      disabled={loading}
                    >
                      <ShieldCheck className="mr-1 size-4" />
                      Demo CAPTCHA
                    </Button>
                    <Button
                      type="button"
                      size="lg"
                      variant="ghost"
                      onClick={clearDemoCaptcha}
                      disabled={loading || !credentials.captcha_token}
                    >
                      Clear demo CAPTCHA
                    </Button>
                    <Button
                      type="button"
                      size="lg"
                      variant="secondary"
                      onClick={handleGoogleLogin}
                      disabled={loading}
                    >
                      Continue with Google
                    </Button>
                    <Button
                      type="button"
                      size="lg"
                      variant="outline"
                      onClick={() => setShowForgotPassword(true)}
                      disabled={loading}
                    >
                      Forgot Password
                    </Button>
                    <Button
                      type="button"
                      size="lg"
                      variant="outline"
                      onClick={refreshDashboard}
                      disabled={loading}
                    >
                      <RefreshCcw className="mr-1 size-4" />
                      Refresh
                    </Button>
                    {currentUser && (
                      <Button
                        type="button"
                        size="lg"
                        variant="ghost"
                        onClick={handleLogout}
                      >
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

        {showForgotPassword && (
          <section className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <Card className="w-full max-w-sm border-white/10 bg-slate-950">
              <CardHeader>
                <CardTitle className="text-white">Forgot Password?</CardTitle>
                <CardDescription>
                  Enter your email to receive a password reset link.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <form
                  className="space-y-3"
                  onSubmit={handleForgotPasswordRequest}
                >
                  <Input
                    type="email"
                    value={forgotPasswordEmail}
                    onChange={(event) =>
                      setForgotPasswordEmail(event.target.value)
                    }
                    placeholder="Email address"
                    className="border-white/10 bg-white/5 text-white placeholder:text-slate-500"
                    required
                  />
                  <div className="flex gap-2">
                    <Button
                      type="submit"
                      size="lg"
                      disabled={loading}
                      className="flex-1"
                    >
                      Send Reset Link
                    </Button>
                    <Button
                      type="button"
                      size="lg"
                      variant="outline"
                      onClick={() => {
                        setShowForgotPassword(false);
                        setForgotPasswordEmail("");
                      }}
                      disabled={loading}
                    >
                      Cancel
                    </Button>
                  </div>
                  <p className="text-xs text-slate-400">
                    {credentials.captcha_token
                      ? "Demo CAPTCHA token is attached for local testing."
                      : "Use the demo CAPTCHA button while testing locally; replace it with the real widget in production."}
                  </p>
                </form>
              </CardContent>
            </Card>
          </section>
        )}

        {showSignUp && (
          <section className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <Card className="w-full max-w-sm border-white/10 bg-slate-950">
              <CardHeader>
                <CardTitle className="text-white">
                  {signUpStep === "request-code"
                    ? "Create account"
                    : "Verify email"}
                </CardTitle>
                <CardDescription>
                  {signUpStep === "request-code"
                    ? "Enter your details and password to sign up."
                    : "Enter the 6-digit code sent to your email."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {signUpStep === "request-code" ? (
                  <form
                    className="space-y-3"
                    onSubmit={handleRequestVerificationCode}
                  >
                    <Input
                      value={signUpData.name}
                      onChange={(event) =>
                        setSignUpData((prev) => ({
                          ...prev,
                          name: event.target.value,
                        }))
                      }
                      placeholder="Full name"
                      className="border-white/10 bg-white/5 text-white placeholder:text-slate-500"
                      required
                    />
                    <Input
                      type="email"
                      value={signUpData.email}
                      onChange={(event) =>
                        setSignUpData((prev) => ({
                          ...prev,
                          email: event.target.value,
                        }))
                      }
                      placeholder="Email address"
                      className="border-white/10 bg-white/5 text-white placeholder:text-slate-500"
                      required
                    />
                    <Input
                      type="password"
                      value={signUpData.password}
                      onChange={(event) =>
                        setSignUpData((prev) => ({
                          ...prev,
                          password: event.target.value,
                        }))
                      }
                      placeholder="Password (min 8 chars)"
                      className="border-white/10 bg-white/5 text-white placeholder:text-slate-500"
                      required
                    />
                    <Input
                      type="password"
                      value={signUpData.password_confirmation}
                      onChange={(event) =>
                        setSignUpData((prev) => ({
                          ...prev,
                          password_confirmation: event.target.value,
                        }))
                      }
                      placeholder="Confirm password"
                      className="border-white/10 bg-white/5 text-white placeholder:text-slate-500"
                      required
                    />
                    <div className="flex gap-2">
                      <Button
                        type="submit"
                        size="lg"
                        disabled={loading}
                        className="flex-1"
                      >
                        Send verification code
                      </Button>
                      <Button
                        type="button"
                        size="lg"
                        variant="outline"
                        onClick={() => {
                          setShowSignUp(false);
                          setSignUpStep("request-code");
                          setSignUpData({
                            name: "",
                            email: "",
                            password: "",
                            password_confirmation: "",
                            code: "",
                          });
                        }}
                        disabled={loading}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                ) : (
                  <form className="space-y-3" onSubmit={handleSignUpVerifyCode}>
                    <Input
                      value={signUpData.code}
                      onChange={(event) =>
                        setSignUpData((prev) => ({
                          ...prev,
                          code: event.target.value
                            .replace(/\D/g, "")
                            .slice(0, 6),
                        }))
                      }
                      placeholder="000000"
                      maxLength="6"
                      className="border-white/10 bg-white/5 text-white placeholder:text-slate-500 text-center text-2xl tracking-widest"
                      required
                    />
                    <p className="text-xs text-slate-400">
                      Check your email for the 6-digit verification code
                    </p>
                    <div className="flex gap-2">
                      <Button
                        type="submit"
                        size="lg"
                        disabled={loading || signUpData.code.length !== 6}
                        className="flex-1"
                      >
                        Verify & sign up
                      </Button>
                      <Button
                        type="button"
                        size="lg"
                        variant="outline"
                        onClick={() => {
                          setSignUpStep("request-code");
                          setSignUpData((prev) => ({
                            ...prev,
                            code: "",
                          }));
                        }}
                        disabled={loading}
                      >
                        Back
                      </Button>
                    </div>
                  </form>
                )}
              </CardContent>
            </Card>
          </section>
        )}

        {notice && (
          <Alert
            variant={
              notice.variant === "destructive" ? "destructive" : "default"
            }
          >
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
                    Guests and students see the public catalog. Instructor and
                    admin sessions can inspect private content too.
                  </CardDescription>
                </div>
                <Badge
                  variant="outline"
                  className="border-white/15 text-slate-300"
                >
                  {courses.length} courses
                </Badge>
              </CardHeader>
              <CardContent className="space-y-4">
                <form
                  className="grid gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                  onSubmit={handleCatalogFiltersSubmit}
                >
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                    <Input
                      value={catalogFilters.q}
                      onChange={(event) =>
                        setCatalogFilters((prev) => ({
                          ...prev,
                          q: event.target.value,
                        }))
                      }
                      placeholder="Search catalog"
                      className="border-white/10 bg-white/5 text-white placeholder:text-slate-500"
                    />
                    <Input
                      value={catalogFilters.category}
                      onChange={(event) =>
                        setCatalogFilters((prev) => ({
                          ...prev,
                          category: event.target.value,
                        }))
                      }
                      placeholder="Category"
                      className="border-white/10 bg-white/5 text-white placeholder:text-slate-500"
                    />
                    <select
                      value={catalogFilters.level}
                      onChange={(event) =>
                        setCatalogFilters((prev) => ({
                          ...prev,
                          level: event.target.value,
                        }))
                      }
                      className="h-10 rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white"
                    >
                      <option value="">Any level</option>
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                    </select>
                    <select
                      value={catalogFilters.price_type}
                      onChange={(event) =>
                        setCatalogFilters((prev) => ({
                          ...prev,
                          price_type: event.target.value,
                        }))
                      }
                      className="h-10 rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white"
                    >
                      <option value="">Any price</option>
                      <option value="free">Free</option>
                      <option value="paid">Paid</option>
                    </select>
                    <select
                      value={catalogFilters.sort}
                      onChange={(event) =>
                        setCatalogFilters((prev) => ({
                          ...prev,
                          sort: event.target.value,
                        }))
                      }
                      className="h-10 rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white"
                    >
                      <option value="newest">Newest</option>
                      <option value="oldest">Oldest</option>
                      <option value="title">Title</option>
                      <option value="price_asc">Price low</option>
                      <option value="price_desc">Price high</option>
                      <option value="rating">Rating</option>
                    </select>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button type="submit" disabled={loading}>
                      Apply filters
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={clearCatalogFilters}
                      disabled={loading}
                    >
                      Clear
                    </Button>
                  </div>
                </form>

                <div className="grid gap-3 md:grid-cols-2">
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
                          <p className="font-semibold text-white">
                            {course.title}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            /{course.slug}
                          </p>
                        </div>
                        <Badge
                          variant={
                            course.is_published ? "secondary" : "outline"
                          }
                        >
                          {course.is_published ? "Published" : "Draft"}
                        </Badge>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {course.category && (
                          <Badge variant="outline">{course.category}</Badge>
                        )}
                        {course.level && (
                          <Badge variant="outline">{course.level}</Badge>
                        )}
                        {course.duration_minutes && (
                          <Badge variant="outline">
                            {course.duration_minutes} min
                          </Badge>
                        )}
                      </div>
                      <p className="mt-3 text-sm text-slate-300">
                        {course.subtitle ||
                          course.description ||
                          "No description yet."}
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                        <span>{formatAmountWithCurrency(course.price)}</span>
                        {course.average_rating && (
                          <span>
                            {Number(course.average_rating).toFixed(1)}/5 rating
                          </span>
                        )}
                        <span>{course.enrollments_count ?? 0} enrollments</span>
                      </div>
                    </button>
                  ))}
                </div>
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
                {!selectedCourse && (
                  <p className="text-sm text-slate-400">
                    No course selected yet.
                  </p>
                )}

                {selectedCourse && (
                  <>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant="outline"
                        className="border-white/15 text-slate-300"
                      >
                        {formatAmountWithCurrency(selectedCourse.price)}
                      </Badge>
                      <Badge
                        variant={
                          selectedCourse.is_published ? "secondary" : "outline"
                        }
                      >
                        {selectedCourse.is_published ? "Published" : "Draft"}
                      </Badge>
                      {currentUser?.role === "student" && (
                        <>
                          {Number(selectedCourse.price) > 0 && (
                            <>
                              <Button
                                size="sm"
                                onClick={handlePurchaseCourse}
                                disabled={loading}
                              >
                                Demo purchase
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={handleStripeCheckout}
                                disabled={loading}
                              >
                                Stripe checkout
                              </Button>
                            </>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleEnroll}
                            disabled={loading}
                          >
                            Enroll
                          </Button>
                        </>
                      )}
                    </div>

                    <p className="text-sm text-slate-300">
                      {selectedCourse.description}
                    </p>
                    <Separator className="bg-white/10" />

                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
                        Modules
                      </h3>
                      {(selectedCourse.modules || []).map((module) => (
                        <div
                          key={module.id}
                          className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <p className="font-medium text-white">
                              {module.title}
                            </p>
                            <span className="text-xs text-slate-500">
                              /{module.slug}
                            </span>
                          </div>
                          {(currentUser?.role === "instructor" ||
                            currentUser?.role === "admin") && (
                            <form
                              className="mt-3 grid gap-2 rounded-xl border border-white/10 bg-slate-950/40 p-3"
                              onSubmit={(event) =>
                                handleCreateFileLesson(event, module)
                              }
                            >
                              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                                Add file lesson
                              </p>
                              <div className="grid gap-2 sm:grid-cols-2">
                                <Input
                                  value={getLessonDraft(module.id).title}
                                  onChange={(event) => {
                                    const title = event.target.value;
                                    const existingDraft = getLessonDraft(
                                      module.id,
                                    );

                                    updateLessonDraft(module.id, {
                                      title,
                                      slug:
                                        existingDraft.slug === ""
                                          ? buildLessonSlug(title)
                                          : existingDraft.slug,
                                    });
                                  }}
                                  placeholder="Lesson title"
                                  className="border-white/10 bg-white/5 text-white placeholder:text-slate-500"
                                  disabled={
                                    loading || uploadingModuleId === module.id
                                  }
                                />
                                <Input
                                  value={getLessonDraft(module.id).slug}
                                  onChange={(event) =>
                                    updateLessonDraft(module.id, {
                                      slug: buildLessonSlug(event.target.value),
                                    })
                                  }
                                  placeholder="lesson-slug"
                                  className="border-white/10 bg-white/5 text-white placeholder:text-slate-500"
                                  disabled={
                                    loading || uploadingModuleId === module.id
                                  }
                                />
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                <Input
                                  type="file"
                                  accept=".md,.txt,.pdf,.doc,.docx,.rtf,.png,.jpg,.jpeg,.webp,.mp4,.mov,.m4v,.mp3,.wav,.zip"
                                  onChange={(event) =>
                                    updateLessonDraft(module.id, {
                                      lesson_file:
                                        event.target.files &&
                                        event.target.files[0]
                                          ? event.target.files[0]
                                          : null,
                                    })
                                  }
                                  className="max-w-sm border-white/10 bg-white/5 text-white file:mr-3 file:rounded-md file:border-0 file:bg-white/10 file:px-3 file:py-1 file:text-xs file:text-white"
                                  disabled={
                                    loading || uploadingModuleId === module.id
                                  }
                                />
                                <label className="flex items-center gap-2 text-xs text-slate-300">
                                  <input
                                    type="checkbox"
                                    checked={
                                      getLessonDraft(module.id).is_preview
                                    }
                                    onChange={(event) =>
                                      updateLessonDraft(module.id, {
                                        is_preview: event.target.checked,
                                      })
                                    }
                                    disabled={
                                      loading || uploadingModuleId === module.id
                                    }
                                  />
                                  Preview lesson
                                </label>
                                <Button
                                  type="submit"
                                  size="sm"
                                  disabled={
                                    loading || uploadingModuleId === module.id
                                  }
                                >
                                  {uploadingModuleId === module.id
                                    ? "Uploading..."
                                    : "Upload + create lesson"}
                                </Button>
                              </div>
                            </form>
                          )}
                          <div className="mt-3 space-y-2">
                            {(module.lessons || []).map((lesson) => (
                              <div
                                key={lesson.id}
                                className="flex flex-col gap-3 rounded-xl border border-white/10 px-3 py-3 text-sm"
                              >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <span className="text-slate-200">
                                    {lesson.title}
                                  </span>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <Badge
                                      variant={
                                        lesson.is_preview
                                          ? "secondary"
                                          : "outline"
                                      }
                                    >
                                      {lesson.is_preview
                                        ? "Preview"
                                        : lesson.type}
                                    </Badge>
                                  </div>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                  {currentUser &&
                                    lesson.type === "file" &&
                                    (lesson.file_path || lesson.file_url) && (
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        onClick={() =>
                                          handleOpenLessonAttachment(lesson)
                                        }
                                        disabled={
                                          loading ||
                                          openingLessonId === lesson.id
                                        }
                                      >
                                        {openingLessonId === lesson.id
                                          ? "Opening..."
                                          : "Open attachment"}
                                      </Button>
                                    )}
                                  {(currentUser?.role === "instructor" ||
                                    currentUser?.role === "admin") && (
                                    <>
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="secondary"
                                        onClick={() => startLessonEdit(lesson)}
                                        disabled={
                                          loading ||
                                          deletingLessonId === lesson.id
                                        }
                                      >
                                        Edit
                                      </Button>
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="destructive"
                                        onClick={() =>
                                          handleDeleteLesson(module, lesson)
                                        }
                                        disabled={
                                          loading ||
                                          deletingLessonId === lesson.id
                                        }
                                      >
                                        {deletingLessonId === lesson.id
                                          ? "Deleting..."
                                          : "Delete"}
                                      </Button>
                                    </>
                                  )}
                                  {!lesson.file_url &&
                                    lesson.type === "file" && (
                                      <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-xs text-amber-100">
                                        File lesson: attach a .md, .txt, .pdf,
                                        or similar file to enable the action.
                                      </span>
                                    )}
                                  {currentUser?.role === "student" && (
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      onClick={() =>
                                        handleLessonComplete(lesson)
                                      }
                                      disabled={loading}
                                    >
                                      Complete
                                    </Button>
                                  )}
                                </div>
                                {editingLessonId === lesson.id &&
                                  (currentUser?.role === "instructor" ||
                                    currentUser?.role === "admin") && (
                                    <form
                                      className="grid gap-2 rounded-xl border border-white/10 bg-slate-950/40 p-3"
                                      onSubmit={(event) => {
                                        event.preventDefault();
                                        handleUpdateLesson(module, lesson);
                                      }}
                                    >
                                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                                        Edit lesson
                                      </p>
                                      <div className="grid gap-2 sm:grid-cols-2">
                                        <Input
                                          value={
                                            getLessonEditDraft(lesson).title
                                          }
                                          onChange={(event) =>
                                            updateLessonEditDraft(lesson.id, {
                                              title: event.target.value,
                                            })
                                          }
                                          placeholder="Lesson title"
                                          className="border-white/10 bg-white/5 text-white placeholder:text-slate-500"
                                          disabled={
                                            savingLessonId === lesson.id
                                          }
                                        />
                                        <Input
                                          value={
                                            getLessonEditDraft(lesson).slug
                                          }
                                          onChange={(event) =>
                                            updateLessonEditDraft(lesson.id, {
                                              slug: buildLessonSlug(
                                                event.target.value,
                                              ),
                                            })
                                          }
                                          placeholder="lesson-slug"
                                          className="border-white/10 bg-white/5 text-white placeholder:text-slate-500"
                                          disabled={
                                            savingLessonId === lesson.id
                                          }
                                        />
                                      </div>
                                      <div className="flex flex-wrap items-center gap-2">
                                        <select
                                          value={
                                            getLessonEditDraft(lesson).type
                                          }
                                          onChange={(event) =>
                                            updateLessonEditDraft(lesson.id, {
                                              type: event.target.value,
                                            })
                                          }
                                          className="h-10 rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-white"
                                          disabled={
                                            savingLessonId === lesson.id
                                          }
                                        >
                                          <option value="text">text</option>
                                          <option value="video">video</option>
                                          <option value="file">file</option>
                                        </select>
                                        {getLessonEditDraft(lesson).type ===
                                          "file" && (
                                          <Input
                                            type="file"
                                            accept=".md,.txt,.pdf,.doc,.docx,.rtf,.png,.jpg,.jpeg,.webp,.mp4,.mov,.m4v,.mp3,.wav,.zip"
                                            onChange={(event) =>
                                              updateLessonEditDraft(lesson.id, {
                                                lesson_file:
                                                  event.target.files &&
                                                  event.target.files[0]
                                                    ? event.target.files[0]
                                                    : null,
                                              })
                                            }
                                            className="max-w-sm border-white/10 bg-white/5 text-white file:mr-3 file:rounded-md file:border-0 file:bg-white/10 file:px-3 file:py-1 file:text-xs file:text-white"
                                            disabled={
                                              savingLessonId === lesson.id
                                            }
                                          />
                                        )}
                                        <label className="flex items-center gap-2 text-xs text-slate-300">
                                          <input
                                            type="checkbox"
                                            checked={
                                              getLessonEditDraft(lesson)
                                                .is_preview
                                            }
                                            onChange={(event) =>
                                              updateLessonEditDraft(lesson.id, {
                                                is_preview:
                                                  event.target.checked,
                                              })
                                            }
                                            disabled={
                                              savingLessonId === lesson.id
                                            }
                                          />
                                          Preview lesson
                                        </label>
                                      </div>
                                      <div className="flex flex-wrap items-center gap-2">
                                        <Button
                                          type="submit"
                                          size="sm"
                                          disabled={
                                            savingLessonId === lesson.id
                                          }
                                        >
                                          {savingLessonId === lesson.id
                                            ? "Saving..."
                                            : "Save"}
                                        </Button>
                                        <Button
                                          type="button"
                                          size="sm"
                                          variant="outline"
                                          onClick={() =>
                                            cancelLessonEdit(lesson.id)
                                          }
                                          disabled={
                                            savingLessonId === lesson.id
                                          }
                                        >
                                          Cancel
                                        </Button>
                                      </div>
                                    </form>
                                  )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    {(selectedCourse.quizzes || []).length > 0 && (
                      <>
                        <Separator className="bg-white/10" />
                        <div className="space-y-3">
                          <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
                            Quizzes
                          </h3>
                          {selectedCourse.quizzes.map((quiz) => (
                            <div
                              key={quiz.id}
                              className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                            >
                              {(() => {
                                const analytics = quizAnalytics[quiz.id];

                                return (
                                  <>
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                      <div>
                                        <p className="font-medium text-white">
                                          {quiz.title}
                                        </p>
                                        <p className="text-xs text-slate-500">
                                          {quiz.pass_score}% pass score
                                        </p>
                                      </div>
                                      <Badge
                                        variant={
                                          quiz.is_published
                                            ? "secondary"
                                            : "outline"
                                        }
                                      >
                                        {quiz.is_published
                                          ? "Published"
                                          : "Draft"}
                                      </Badge>
                                    </div>

                                    {analytics && (
                                      <div className="mt-4 grid gap-2 rounded-xl border border-white/10 bg-slate-950/50 p-3 text-xs text-slate-300 sm:grid-cols-4">
                                        <div>
                                          <p className="text-slate-500">
                                            Attempts
                                          </p>
                                          <p className="mt-1 font-medium text-white">
                                            {analytics.attempts_count}
                                          </p>
                                        </div>
                                        <div>
                                          <p className="text-slate-500">
                                            Average
                                          </p>
                                          <p className="mt-1 font-medium text-white">
                                            {analytics.average_score ?? "N/A"}%
                                          </p>
                                        </div>
                                        <div>
                                          <p className="text-slate-500">
                                            Pass rate
                                          </p>
                                          <p className="mt-1 font-medium text-white">
                                            {analytics.pass_rate ?? "N/A"}%
                                          </p>
                                        </div>
                                        <div>
                                          <p className="text-slate-500">
                                            Students
                                          </p>
                                          <p className="mt-1 font-medium text-white">
                                            {analytics.unique_students_count}
                                          </p>
                                        </div>
                                      </div>
                                    )}

                                    <div className="mt-4 space-y-4">
                                      {(quiz.questions || []).map(
                                        (question) => (
                                          <div
                                            key={question.id}
                                            className="rounded-xl border border-white/10 p-3"
                                          >
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                              <p className="text-sm font-medium text-white">
                                                {question.prompt}
                                              </p>
                                              <Badge variant="outline">
                                                {question.type.replace(
                                                  "_",
                                                  " ",
                                                )}
                                              </Badge>
                                            </div>
                                            <div className="mt-3 grid gap-2">
                                              {(question.options || []).map(
                                                (option) => {
                                                  const selectedAnswer =
                                                    quizAnswers[quiz.id]?.[
                                                      question.id
                                                    ];
                                                  const isChecked =
                                                    question.type ===
                                                    "multiple_choice"
                                                      ? Array.isArray(
                                                          selectedAnswer,
                                                        ) &&
                                                        selectedAnswer.includes(
                                                          option.key,
                                                        )
                                                      : selectedAnswer ===
                                                        option.key;

                                                  return (
                                                    <label
                                                      key={option.key}
                                                      className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-200"
                                                    >
                                                      <input
                                                        type={
                                                          question.type ===
                                                          "multiple_choice"
                                                            ? "checkbox"
                                                            : "radio"
                                                        }
                                                        name={`quiz-${quiz.id}-question-${question.id}`}
                                                        checked={isChecked}
                                                        onChange={(event) =>
                                                          handleQuizAnswerChange(
                                                            quiz.id,
                                                            question,
                                                            option.key,
                                                            event.target
                                                              .checked,
                                                          )
                                                        }
                                                        disabled={
                                                          !authToken || loading
                                                        }
                                                      />
                                                      <span>{option.text}</span>
                                                    </label>
                                                  );
                                                },
                                              )}
                                            </div>
                                            {analytics?.question_breakdown?.find(
                                              (item) =>
                                                item.question_id ===
                                                question.id,
                                            ) && (
                                              <p className="mt-2 text-xs text-slate-500">
                                                Correct rate:{" "}
                                                {
                                                  analytics.question_breakdown.find(
                                                    (item) =>
                                                      item.question_id ===
                                                      question.id,
                                                  ).correct_rate
                                                }
                                                %
                                              </p>
                                            )}
                                          </div>
                                        ),
                                      )}
                                    </div>

                                    {currentUser?.role === "student" && (
                                      <Button
                                        type="button"
                                        size="sm"
                                        className="mt-4"
                                        onClick={() => handleQuizAttempt(quiz)}
                                        disabled={loading || !quiz.is_published}
                                      >
                                        Submit attempt
                                      </Button>
                                    )}
                                  </>
                                );
                              })()}
                            </div>
                          ))}
                        </div>
                      </>
                    )}

                    {authToken && (
                      <>
                        <Separator className="bg-white/10" />
                        <div className="space-y-3">
                          <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
                            Reviews
                          </h3>
                          {reviews.length === 0 && (
                            <p className="text-sm text-slate-400">
                              No visible reviews for this viewer yet. Admins
                              still have the moderation queue.
                            </p>
                          )}
                          {reviews.map((review) => (
                            <div
                              key={review.id}
                              className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <p className="font-medium text-white">
                                    {review.user?.name}
                                  </p>
                                  <p className="text-xs text-slate-500">
                                    {review.rating}/5 rating
                                  </p>
                                </div>
                                <Badge
                                  variant={
                                    review.is_published
                                      ? "secondary"
                                      : "outline"
                                  }
                                >
                                  {review.is_published ? "Visible" : "Hidden"}
                                </Badge>
                              </div>
                              <p className="mt-3 text-sm text-slate-300">
                                {review.comment || "No comment."}
                              </p>
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
            {instructorDashboard && (
              <Card className="border-white/10 bg-slate-950/70">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-white">
                    <BookOpen className="size-4" />
                    Instructor dashboard
                  </CardTitle>
                  <CardDescription>
                    Live overview from courses, enrollments, progress,
                    certificates, quizzes, and payments.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                      <p className="text-xs text-slate-500">Courses</p>
                      <p className="mt-1 text-lg font-semibold text-white">
                        {instructorDashboard.summary?.courses_count ?? 0}
                      </p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                      <p className="text-xs text-slate-500">Enrollments</p>
                      <p className="mt-1 text-lg font-semibold text-white">
                        {instructorDashboard.summary?.enrollments_count ?? 0}
                      </p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                      <p className="text-xs text-slate-500">Certificates</p>
                      <p className="mt-1 text-lg font-semibold text-white">
                        {instructorDashboard.summary?.certificates_count ?? 0}
                      </p>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                      <p className="text-xs text-slate-500">Revenue</p>
                      <p className="mt-1 text-lg font-semibold text-white">
                        {formatAmountWithCurrency(
                          instructorDashboard.summary?.revenue_total,
                        )}
                      </p>
                    </div>
                  </div>

                  {(instructorDashboard.courses || []).map((course) => (
                    <div
                      key={course.course_id}
                      className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="font-medium text-white">
                            {course.title}
                          </p>
                          <p className="text-xs text-slate-500">
                            /{course.slug}
                          </p>
                        </div>
                        <Badge
                          variant={
                            course.is_published ? "secondary" : "outline"
                          }
                        >
                          {course.is_published ? "Published" : "Draft"}
                        </Badge>
                      </div>
                      <div className="mt-3 grid gap-2 text-xs text-slate-300 sm:grid-cols-2">
                        <span>{course.enrollments_count} enrollments</span>
                        <span>{course.certificates_count} certificates</span>
                        <span>
                          {course.average_progress ?? "N/A"}% avg progress
                        </span>
                        <span>
                          {course.average_quiz_score ?? "N/A"}% quiz avg
                        </span>
                        <span>
                          {course.completion_rate ?? "N/A"}% completion
                        </span>
                        <span>
                          {formatAmountWithCurrency(course.revenue_total)}{" "}
                          revenue
                        </span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            <Card className="border-white/10 bg-slate-950/70">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <CreditCard className="size-4" />
                  {currentUser
                    ? `${currentUser.role} payments view`
                    : "Role-based payments"}
                </CardTitle>
                <CardDescription>
                  Students see their purchases, instructors see revenue for
                  their courses, and admins see everything.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {!currentUser && (
                  <p className="text-sm text-slate-400">
                    Sign in to load payment data.
                  </p>
                )}
                {currentUser && payments.length === 0 && (
                  <p className="text-sm text-slate-400">No payments found.</p>
                )}
                {payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium text-white">
                        {payment.course?.title || "Course payment"}
                      </p>
                      <Badge variant="secondary">
                        {payment.currency} {payment.amount}
                      </Badge>
                    </div>
                    <p className="mt-2 text-xs text-slate-400">
                      {payment.provider} •{" "}
                      {payment.user?.name || currentUser?.name}
                    </p>
                    {payment.receipt_number && (
                      <p className="mt-2 text-xs text-slate-400">
                        Receipt {payment.receipt_number}
                      </p>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-slate-950/70">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white">
                  <BookOpen className="size-4" />
                  Certificates
                </CardTitle>
                <CardDescription>
                  Certificates are issued once a student completes every lesson
                  in a course.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {!currentUser && (
                  <p className="text-sm text-slate-400">
                    Sign in to load certificate data.
                  </p>
                )}
                {currentUser && certificates.length === 0 && (
                  <p className="text-sm text-slate-400">
                    No certificates issued yet.
                  </p>
                )}
                {certificates.map((certificate) => (
                  <div
                    key={certificate.id}
                    className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-white">
                          {certificate.course?.title || "Course certificate"}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {certificate.certificate_number}
                        </p>
                      </div>
                      <Badge variant="secondary">Issued</Badge>
                    </div>
                    <p className="mt-2 text-xs text-slate-400">
                      {certificate.user?.name || currentUser?.name} •{" "}
                      {certificate.issued_at
                        ? new Date(certificate.issued_at).toLocaleDateString()
                        : "recently"}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>

            {currentUser?.role === "admin" && (
              <>
                {adminPlatformDashboard && (
                  <Card className="border-white/10 bg-slate-950/70">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-white">
                        <ShieldCheck className="size-4" />
                        Platform monitor
                      </CardTitle>
                      <CardDescription>
                        Live admin snapshot of platform activity, moderation,
                        and paid revenue.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid gap-2 sm:grid-cols-2">
                        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                          <p className="text-xs text-slate-500">Users</p>
                          <p className="mt-1 text-lg font-semibold text-white">
                            {adminPlatformDashboard.summary?.users_count ?? 0}
                          </p>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                          <p className="text-xs text-slate-500">Courses</p>
                          <p className="mt-1 text-lg font-semibold text-white">
                            {adminPlatformDashboard.summary?.courses_count ?? 0}
                          </p>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                          <p className="text-xs text-slate-500">
                            Pending moderation
                          </p>
                          <p className="mt-1 text-lg font-semibold text-white">
                            {(adminPlatformDashboard.summary
                              ?.pending_reviews_count ?? 0) +
                              (adminPlatformDashboard.summary
                                ?.pending_comments_count ?? 0)}
                          </p>
                        </div>
                        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                          <p className="text-xs text-slate-500">Paid revenue</p>
                          <p className="mt-1 text-lg font-semibold text-white">
                            {formatAmountWithCurrency(
                              adminPlatformDashboard.summary?.revenue_total,
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                          Payment statuses
                        </p>
                        {(adminPlatformDashboard.payment_statuses || []).map(
                          (status) => (
                            <div
                              key={status.status}
                              className="flex items-center justify-between rounded-xl border border-white/10 px-3 py-2 text-sm"
                            >
                              <span className="text-slate-200">
                                {status.status}
                              </span>
                              <span className="text-slate-400">
                                {status.count} •{" "}
                                {formatAmountWithCurrency(status.amount)}
                              </span>
                            </div>
                          ),
                        )}
                      </div>

                      <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                          Recent activity
                        </p>
                        {(adminPlatformDashboard.recent_activity || [])
                          .slice(0, 6)
                          .map((activity, index) => (
                            <div
                              key={`${activity.type}-${activity.id}-${index}`}
                              className="rounded-xl border border-white/10 px-3 py-2 text-sm"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-slate-200">
                                  {activity.label}
                                </span>
                                <Badge variant="outline">
                                  {activity.type.replace("_", " ")}
                                </Badge>
                              </div>
                            </div>
                          ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                <Card className="border-white/10 bg-slate-950/70">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-white">
                      <UserRound className="size-4" />
                      User management
                    </CardTitle>
                    <CardDescription>
                      Invite new users with a pre-selected role. Links expire in
                      5 minutes.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <form
                      onSubmit={handleSendUserInvite}
                      className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-4 space-y-3"
                    >
                      <p className="text-sm font-medium text-white">
                        Send role invite
                      </p>
                      <Input
                        type="email"
                        value={inviteForm.email}
                        onChange={(event) =>
                          setInviteForm((prev) => ({
                            ...prev,
                            email: event.target.value,
                          }))
                        }
                        placeholder="new.user@example.com"
                        className="border-white/10 bg-white/5 text-white placeholder:text-slate-500"
                        required
                      />
                      <select
                        value={inviteForm.role}
                        onChange={(event) =>
                          setInviteForm((prev) => ({
                            ...prev,
                            role: event.target.value,
                          }))
                        }
                        className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
                      >
                        <option value="student">student</option>
                        <option value="instructor">instructor</option>
                      </select>
                      <Button type="submit" size="sm" disabled={loading}>
                        Send invite email
                      </Button>
                      {lastInviteUrl && (
                        <p className="text-xs text-slate-400 break-all">
                          Demo link:{" "}
                          <a
                            href={lastInviteUrl}
                            className="text-amber-200 underline"
                          >
                            {lastInviteUrl}
                          </a>
                        </p>
                      )}
                    </form>

                    {adminUsers.map((user) => (
                      <div
                        key={user.id}
                        className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="font-medium text-white">
                              {user.name}
                            </p>
                            <p className="text-xs text-slate-400">
                              {user.email}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Badge variant={roleBadgeVariant(user.role)}>
                              {user.role}
                            </Badge>
                            {user.is_banned && (
                              <Badge variant="destructive">banned</Badge>
                            )}
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
                    <CardDescription>
                      Approve or hide seeded unpublished reviews directly from
                      the admin view.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {moderationQueue.length === 0 && (
                      <p className="text-sm text-slate-400">Queue is empty.</p>
                    )}
                    {moderationQueue.map((item, index) => {
                      const content = item.review ?? item.comment;
                      const courseTitle =
                        item.review?.course?.title ??
                        item.comment?.lesson?.module?.course?.title ??
                        "Unknown course";
                      const body =
                        item.review?.comment ??
                        item.comment?.body ??
                        "No content.";
                      const authorName = content?.user?.name ?? "Unknown user";
                      const key = `${item.content_type}-${content?.id ?? index}`;

                      return (
                        <div
                          key={key}
                          className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <Badge variant="outline">{item.content_type}</Badge>
                            <p className="text-xs text-slate-500">
                              {courseTitle}
                            </p>
                          </div>
                          <p className="mt-3 font-medium text-white">
                            {authorName}
                          </p>
                          <p className="mt-1 text-sm text-slate-300">{body}</p>
                          <div className="mt-4 flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleModeration(item, true)}
                              disabled={loading}
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleModeration(item, false)}
                              disabled={loading}
                            >
                              Keep hidden
                            </Button>
                          </div>
                        </div>
                      );
                    })}
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
                <CardDescription>
                  Useful local testing hints so you can move quickly between
                  views.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-slate-300">
                <p>
                  Use{" "}
                  <span className="font-mono text-amber-200">
                    composer db:fresh
                  </span>{" "}
                  to reseed everything quickly.
                </p>
                <p>
                  Use{" "}
                  <span className="font-mono text-amber-200">
                    composer db:fresh:seed
                  </span>{" "}
                  to reseed or fully recreate tables as needed.
                </p>
                <p>
                  All demo accounts use the same password:{" "}
                  <span className="font-mono text-amber-200">password</span>.
                </p>
                <p>
                  Sign in as admin, send an invite from User management, then
                  open the returned link within 5 minutes to onboard with the
                  chosen role.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </main>
  );
}

export default App;
