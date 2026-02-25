import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "lab_incharge" | "staff";
export type GlobalRole = "super_admin";

export type AuthState = {
  loading: boolean;
  session: Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"] | null;
  userId: string | null;
  activeInstitutionId: string | null;
  globalRoles: GlobalRole[];
  institutionRoles: AppRole[];
};

type AuthContextValue = AuthState & {
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function fetchRolesAndInstitution(userId: string): Promise<{
  activeInstitutionId: string | null;
  globalRoles: GlobalRole[];
  institutionRoles: AppRole[];
}> {
  const profileRes = await supabase
    .from("profiles")
    .select("active_institution_id")
    .eq("user_id", userId)
    .maybeSingle();

  const activeInstitutionId = profileRes.data?.active_institution_id ?? null;

  const globalRes = await supabase
    .from("global_user_roles")
    .select("role")
    .eq("user_id", userId);

  const globalRoles = (globalRes.data ?? []).map((r) => r.role as GlobalRole);

  if (!activeInstitutionId) {
    return { activeInstitutionId, globalRoles, institutionRoles: [] };
  }

  // membership row
  const membershipRes = await supabase
    .from("institution_users")
    .select("id")
    .eq("user_id", userId)
    .eq("institution_id", activeInstitutionId)
    .maybeSingle();

  const institutionUserId = membershipRes.data?.id ?? null;
  if (!institutionUserId) {
    return { activeInstitutionId, globalRoles, institutionRoles: [] };
  }

  const rolesRes = await supabase
    .from("user_roles")
    .select("role")
    .eq("institution_user_id", institutionUserId);

  const institutionRoles = (rolesRes.data ?? []).map((r) => r.role as AppRole);
  return { activeInstitutionId, globalRoles, institutionRoles };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    loading: true,
    session: null,
    userId: null,
    activeInstitutionId: null,
    globalRoles: [],
    institutionRoles: [],
  });

  const refresh = async () => {
    setState((s) => ({ ...s, loading: true }));
    const { data } = await supabase.auth.getSession();
    const session = data.session;
    const userId = session?.user?.id ?? null;

    if (!userId) {
      setState({
        loading: false,
        session: null,
        userId: null,
        activeInstitutionId: null,
        globalRoles: [],
        institutionRoles: [],
      });
      return;
    }

    const roleInfo = await fetchRolesAndInstitution(userId);
    setState({
      loading: false,
      session,
      userId,
      ...roleInfo,
    });
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      // Recompute roles/institution after any auth event
      refresh();
    });

    // Must run after listener is set up
    refresh();

    return () => {
      sub.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const value = useMemo<AuthContextValue>(() => ({ ...state, refresh, signOut }), [state]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
