import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Institution = {
  id: string;
  name: string;
  created_at: string;
};

type InstitutionSettings = {
  institution_id: string;
  casual_leave_quota_yearly: number;
  weekly_off_quota: number;
  created_at: string;
  updated_at: string;
};

type MemberRow = {
  institution_user_id: string;
  user_id: string;
  roles: string[];
};

export default function InstitutionDashboard() {
  const navigate = useNavigate();
  const { loading, session, userId, activeInstitutionId, institutionRoles } = useAuth();

  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [institution, setInstitution] = useState<Institution | null>(null);
  const [settings, setSettings] = useState<InstitutionSettings | null>(null);
  const [staffCount, setStaffCount] = useState<number>(0);
  const [members, setMembers] = useState<MemberRow[]>([]);

  const canAddStaff = useMemo(() => institutionRoles.includes("lab_incharge"), [institutionRoles]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (loading) return;
      if (!session) return;

      setPageLoading(true);
      setError(null);

      if (!activeInstitutionId) {
        setPageLoading(false);
        setError("No active institution selected. Go back to Overview and click Manage.");
        return;
      }

      try {
        const [instRes, settingsRes, staffRes, membersRes] = await Promise.all([
          supabase.from("institutions").select("id,name,created_at").eq("id", activeInstitutionId).maybeSingle(),
          supabase
            .from("institution_settings")
            .select("institution_id,casual_leave_quota_yearly,weekly_off_quota,created_at,updated_at")
            .eq("institution_id", activeInstitutionId)
            .maybeSingle(),
          supabase.from("staff").select("id", { count: "exact", head: true }).eq("institution_id", activeInstitutionId),
          supabase.from("institution_users").select("id,user_id").eq("institution_id", activeInstitutionId),
        ]);

        if (instRes.error) throw instRes.error;
        if (settingsRes.error) throw settingsRes.error;
        if (staffRes.error) throw staffRes.error;
        if (membersRes.error) throw membersRes.error;

        const memberRows = (membersRes.data ?? []) as { id: string; user_id: string }[];
        const institutionUserIds = memberRows.map((m) => m.id);

        const rolesRes = institutionUserIds.length
          ? await supabase.from("user_roles").select("institution_user_id,role").in("institution_user_id", institutionUserIds)
          : { data: [], error: null };

        if ((rolesRes as any).error) throw (rolesRes as any).error;

        const rolesByInstitutionUserId = new Map<string, string[]>();
        for (const r of ((rolesRes as any).data ?? []) as { institution_user_id: string; role: string }[]) {
          const arr = rolesByInstitutionUserId.get(r.institution_user_id) ?? [];
          arr.push(r.role);
          rolesByInstitutionUserId.set(r.institution_user_id, arr);
        }

        const membersView: MemberRow[] = memberRows.map((m) => ({
          institution_user_id: m.id,
          user_id: m.user_id,
          roles: rolesByInstitutionUserId.get(m.id) ?? [],
        }));

        if (cancelled) return;
        setInstitution(instRes.data as Institution | null);
        setSettings(settingsRes.data as InstitutionSettings | null);
        setStaffCount(staffRes.count ?? 0);
        setMembers(membersView);
      } catch (e: any) {
        if (cancelled) return;
        setError(e?.message ?? "Failed to load institution dashboard");
      } finally {
        if (cancelled) return;
        setPageLoading(false);
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [activeInstitutionId, loading, session]);

  if (loading) return null;

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold tracking-tight">Institution Dashboard</h2>
          <p className="text-sm text-muted-foreground">Active institution context for Super Admin.</p>
        </div>
        <Button variant="outline" onClick={() => navigate("/app/setup", { replace: true })}>
          Back to Overview
        </Button>
      </header>

      {error ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Unable to load</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="secondary" asChild>
              <Link to="/app/setup">Go to Overview</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Institution</CardTitle>
            <CardDescription>Basic details for the currently active institution.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid gap-2 md:grid-cols-2">
              <div>
                <p className="text-xs text-muted-foreground">Institution name</p>
                <p className="text-sm font-medium">{pageLoading ? "Loading…" : institution?.name ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Institution ID</p>
                <p className="text-sm font-mono break-all">{activeInstitutionId ?? "—"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Staff</CardTitle>
            <CardDescription>Summary for this institution.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-xs text-muted-foreground">Staff count</p>
              <p className="text-2xl font-semibold">{pageLoading ? "…" : staffCount}</p>
            </div>
            <Button
              onClick={() => {
                if (!canAddStaff) {
                  // Keep safe: don’t bounce them into a route that will immediately redirect.
                  return;
                }
                navigate("/app/staff");
              }}
              disabled={!canAddStaff}
            >
              Add Staff
            </Button>
            {!canAddStaff ? <p className="text-xs text-muted-foreground">Assign Lab Incharge role to add staff.</p> : null}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Leave quota settings</CardTitle>
          <CardDescription>Loaded from institution_settings.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <p className="text-xs text-muted-foreground">Casual leave quota (yearly)</p>
              <p className="text-sm font-medium">{pageLoading ? "Loading…" : settings?.casual_leave_quota_yearly ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Weekly off quota</p>
              <p className="text-sm font-medium">{pageLoading ? "Loading…" : settings?.weekly_off_quota ?? "—"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Members & Roles</CardTitle>
          <CardDescription>Memberships and roles for the active institution.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User ID</TableHead>
                <TableHead>Roles</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((m) => (
                <TableRow key={m.institution_user_id}>
                  <TableCell className="font-mono text-xs break-all">{m.user_id}</TableCell>
                  <TableCell className="text-sm">{m.roles.length ? m.roles.join(", ") : "—"}</TableCell>
                </TableRow>
              ))}

              {!pageLoading && members.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2} className="text-muted-foreground">
                    No members found.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>

          <p className="mt-3 text-xs text-muted-foreground">
            Note: This view intentionally avoids showing other users’ profile details unless backend policies allow it.
          </p>
        </CardContent>
      </Card>

      {userId ? <p className="text-xs text-muted-foreground">Signed in as: {userId}</p> : null}
    </div>
  );
}
