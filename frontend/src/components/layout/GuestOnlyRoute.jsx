import { Navigate } from "react-router-dom";
import { LoadingState } from "@/components/common/LoadingState";
import { useAuth } from "@/contexts/AuthContext";
import { getDefaultRouteForUser } from "@/lib/navigation";

export function GuestOnlyRoute({ children }) {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return (
      <div className="container py-10">
        <LoadingState />
      </div>
    );
  }

  if (isAuthenticated && user) {
    return <Navigate to={getDefaultRouteForUser(user)} replace />;
  }

  return children;
}
