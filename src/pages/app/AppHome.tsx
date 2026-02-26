import React from "react";
import { Navigate } from "react-router-dom";

import { useAuth } from "@/providers/AuthProvider";

export default function AppHome() {
  const { loading, session, globalRoles, institutionRoles, activeInstitutionId } = useAuth();

  if (loading) return null;
  if (!session) return <Navigate to="/login" replace />;

  if (globalRoles.includes("super_admin") && !activeInstitutionId) {
    // Resolve institution context without ever showing Setup UI for assigned users.
    return <Navigate to="/app/dashboard" replace />;
  }

  if (!activeInstitutionId) {
    return <Navigate to="/app/dashboard" replace />;
  }

  if (institutionRoles.includes("lab_incharge")) return <Navigate to="/app/lab" replace />;
  if (institutionRoles.includes("staff")) return <Navigate to="/app/me" replace />;

  return <Navigate to="/app/dashboard" replace />;
}
