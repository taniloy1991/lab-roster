import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";

/**
 * Canonical post-login landing page.
 *
 * Rules:
 * - If the user has ANY institution membership, they must NEVER see /app/setup.
 * - If they have memberships but no active institution context, pick the first membership institution and set it.
 * - If they have no memberships, allow /app/setup.
 */
export default function DashboardLanding() {
  const { loading, session, userId, activeInstitutionId, refresh } = useAuth();
  const [checking, setChecking] = useState(false);
  const [hasMembership, setHasMembership] = useState<boolean | null>(null);

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;
    (async () => {
      setChecking(true);
      try {
        const res = await supabase
          .from("institution_users")
          .select("institution_id")
          .eq("user_id", userId)
          .order("created_at", { ascending: true })
          .limit(1);

        if (cancelled) return;

        const firstInstitutionId = res.data?.[0]?.institution_id ?? null;
        const member = !res.error && !!firstInstitutionId;
        setHasMembership(member);

        // If they are a member somewhere but have no active context yet, set it.
        if (member && !activeInstitutionId) {
          await supabase.from("profiles").update({ active_institution_id: firstInstitutionId }).eq("user_id", userId);
          await refresh();
        }
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [userId, activeInstitutionId, refresh]);

  if (loading) return null;
  if (!session) return <Navigate to="/login" replace />;

  if (checking || hasMembership === null) return null;

  // No membership => only then allow setup.
  if (!hasMembership) return <Navigate to="/app/setup" replace />;

  // Membership exists => route into app; AppHome will forward to role-specific pages.
  return <Navigate to="/app" replace />;
}
