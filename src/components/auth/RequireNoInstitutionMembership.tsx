import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";

/**
 * Blocks access when the logged-in user already belongs to at least one institution.
 * Intended for the initial bootstrap/setup screen only.
 */
export function RequireNoInstitutionMembership({ children }: { children: React.ReactNode }) {
  const { loading, session, userId } = useAuth();
  const [checking, setChecking] = useState(false);
  const [hasMembership, setHasMembership] = useState<boolean | null>(null);

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;
    (async () => {
      setChecking(true);
      try {
        const res = await supabase.from("institution_users").select("id").eq("user_id", userId).limit(1);
        if (cancelled) return;
        setHasMembership(!res.error && (res.data?.length ?? 0) > 0);
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (loading) return null;
  if (!session) return <Navigate to="/login" replace />;

  // While we validate, don't render setup UI to avoid flicker.
  if (checking || hasMembership === null) return null;

  if (hasMembership) return <Navigate to="/app/dashboard" replace />;

  return <>{children}</>;
}
