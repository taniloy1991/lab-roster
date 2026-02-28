import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth, type AppRole, type GlobalRole } from "@/providers/AuthProvider";

export function RoleGate({
  requireAnyInstitutionRole,
  requireGlobalRole,
  children,
}: {
  requireAnyInstitutionRole?: AppRole[];
  requireGlobalRole?: GlobalRole;
  children: React.ReactNode;
}) {
  const { loading, session, globalRoles, institutionRoles } = useAuth();

  const isSuperAdmin = globalRoles.includes("super_admin");

  if (loading) return null;
  if (!session) return <Navigate to="/login" replace />;

  // super_admin overrides any other restriction
  if (isSuperAdmin) return <>{children}</>;

  if (requireGlobalRole) {
    const ok = globalRoles.includes(requireGlobalRole);
    return ok ? <>{children}</> : <Navigate to="/app" replace />;
  }

  if (requireAnyInstitutionRole?.length) {
    const ok = requireAnyInstitutionRole.some((r) => institutionRoles.includes(r));
    return ok ? <>{children}</> : <Navigate to="/app" replace />;
  }

  return <>{children}</>;
}
