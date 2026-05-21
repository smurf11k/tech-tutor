import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { GuestOnlyRoute } from "@/components/layout/GuestOnlyRoute";
import HomePage from "@/pages/HomePage";
import CourseDetailPage from "@/pages/CourseDetailPage";
import ProfilePage from "@/pages/ProfilePage";
import MyLearningPage from "@/pages/MyLearningPage";
import CourseLearningPage from "@/pages/CourseLearningPage";
import CertificatesPage from "@/pages/CertificatesPage";
import PaymentsPage from "@/pages/PaymentsPage";
import PaymentReturnPage from "@/pages/PaymentReturnPage";
import LoginPage from "@/pages/auth/LoginPage";
import RegisterPage from "@/pages/auth/RegisterPage";
import ForgotPasswordPage from "@/pages/auth/ForgotPasswordPage";
import ResetPassword from "@/pages/ResetPassword";
import AcceptInvite from "@/pages/AcceptInvite";
import InstructorDashboardPage from "@/pages/instructor/InstructorDashboardPage";
import InstructorCoursePage from "@/pages/instructor/InstructorCoursePage";
import InstructorContentPage from "@/pages/instructor/InstructorContentPage";
import InstructorModerationPage from "@/pages/instructor/InstructorModerationPage";
import AdminDashboardPage from "@/pages/admin/AdminDashboardPage";
import AdminUsersPage from "@/pages/admin/AdminUsersPage";
import AdminModerationPage from "@/pages/admin/AdminModerationPage";
import SideShell from "@/components/layout/SideShell";
import CoursesPage from "@/pages/CoursesPage";

export default function App() {
  return (
    <Routes>
      <Route path="/invite" element={<AcceptInviteRoute />} />
      <Route path="/reset-password" element={<ResetPasswordRoute />} />

      <Route element={<AppLayout />}>
        <Route index element={<HomePage />} />
        <Route path="courses" element={<CoursesPage />} />
        <Route path="courses/:courseId" element={<CourseDetailPage />} />
        <Route
          path="login"
          element={
            <GuestOnlyRoute>
              <LoginPage />
            </GuestOnlyRoute>
          }
        />
        <Route
          path="register"
          element={
            <GuestOnlyRoute>
              <RegisterPage />
            </GuestOnlyRoute>
          }
        />
        <Route path="forgot-password" element={<ForgotPasswordPage />} />
        <Route
          path="payment/success"
          element={<PaymentReturnPage variant="success" />}
        />
        <Route
          path="payment/cancel"
          element={<PaymentReturnPage variant="cancel" />}
        />

        <Route
          path="learning"
          element={
            <ProtectedRoute>
              <MyLearningPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="learning/:courseId"
          element={
            <ProtectedRoute>
              <CourseLearningPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="certificates"
          element={
            <ProtectedRoute>
              <CertificatesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="payments"
          element={
            <ProtectedRoute>
              <PaymentsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="instructor"
          element={
            <ProtectedRoute roles={["instructor", "admin"]}>
              <SideShell
                title="Instructor"
                menu={[
                  { to: "/instructor", label: "Dashboard" },
                  { to: "/instructor/content", label: "Content" },
                  { to: "/instructor/moderation", label: "Comments" },
                ]}
              >
                <InstructorDashboardPage />
              </SideShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="instructor/courses/:courseId"
          element={
            <ProtectedRoute roles={["instructor", "admin"]}>
              <SideShell
                title="Instructor"
                menu={[
                  { to: "/instructor", label: "Dashboard" },
                  { to: "/instructor/content", label: "Content" },
                  { to: "/instructor/moderation", label: "Comments" },
                ]}
              >
                <InstructorCoursePage />
              </SideShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="instructor/content"
          element={
            <ProtectedRoute roles={["instructor", "admin"]}>
              <SideShell
                title="Instructor"
                menu={[
                  { to: "/instructor", label: "Dashboard" },
                  { to: "/instructor/content", label: "Content" },
                  { to: "/instructor/moderation", label: "Comments" },
                ]}
              >
                <InstructorContentPage />
              </SideShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="instructor/moderation"
          element={
            <ProtectedRoute roles={["instructor", "admin"]}>
              <SideShell
                title="Instructor"
                menu={[
                  { to: "/instructor", label: "Dashboard" },
                  { to: "/instructor/content", label: "Content" },
                  { to: "/instructor/moderation", label: "Comments" },
                ]}
              >
                <InstructorModerationPage />
              </SideShell>
            </ProtectedRoute>
          }
        />

        <Route
          path="admin"
          element={
            <ProtectedRoute roles={["admin"]}>
              <SideShell
                title="Admin"
                menu={[
                  { to: "/admin", label: "Dashboard" },
                  { to: "/admin/users", label: "Users" },
                  { to: "/admin/moderation", label: "Moderation" },
                ]}
              >
                <AdminDashboardPage />
              </SideShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/users"
          element={
            <ProtectedRoute roles={["admin"]}>
              <SideShell
                title="Admin"
                menu={[
                  { to: "/admin", label: "Dashboard" },
                  { to: "/admin/users", label: "Users" },
                  { to: "/admin/moderation", label: "Moderation" },
                ]}
              >
                <AdminUsersPage />
              </SideShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/moderation"
          element={
            <ProtectedRoute roles={["admin"]}>
              <SideShell
                title="Admin"
                menu={[
                  { to: "/admin", label: "Dashboard" },
                  { to: "/admin/users", label: "Users" },
                  { to: "/admin/moderation", label: "Moderation" },
                ]}
              >
                <AdminModerationPage />
              </SideShell>
            </ProtectedRoute>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function AcceptInviteRoute() {
  const token = new URLSearchParams(window.location.search).get("token");

  if (!token) {
    return <Navigate to="/register" replace />;
  }

  return <AcceptInvite token={token} />;
}

function ResetPasswordRoute() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");
  const email = params.get("email");

  if (!token || !email) {
    return <Navigate to="/forgot-password" replace />;
  }

  return <ResetPassword token={token} email={email} />;
}
