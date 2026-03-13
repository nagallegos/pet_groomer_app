import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./useAuth";
import PageLoader from "./PageLoader";
import type { AppUserRole } from "../../lib/crmApi";

interface RequireAuthProps {
  allowedRoles?: AppUserRole[];
}

export default function RequireAuth({ allowedRoles }: RequireAuthProps) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <PageLoader label="Checking session..." />;
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/home" replace />;
  }

  return <Outlet />;
}
