import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

type AppRole = "lab_incharge" | "staff";

type MemberRow = {
  institution_user_id: string;
  user_id: string;
  roles: AppRole[];
};

export default function InstitutionDashboard() {
  const navigate = useNavigate();
  const { loading, session, userId, activeInstitutionId, institutionRoles, globalRoles } = useAuth();

  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [institution, setInstitution] = useState<Institution | null>(null);
  const [settings, setSettings] = useState<InstitutionSettings | null>(null);
  const [staffCount, setStaffCount] = useState<number>(0);
  const [members, setMembers] = useState<MemberRow[]>([]);

  const [memberUserId, setMemberUserId] = useState("");
  const [memberRole, setMemberRole] = useState<AppRole>("staff");
  const [roleBusy, setRoleBusy] = useState(false);
  const [roleMessage, setRoleMessage] = useState<string | null>(null);

  const canAddStaff = useMemo(
    () => globalRoles.includes("super_admin") || institutionRoles.includes("lab_incharge"),
    [globalRoles, institutionRoles],
  );

  const loadDashboard = useCallback(async () => {
    if (!activeInstitutionId) {
      throw new Error("No active institution selected. Go back to Overview and click Manage.");
    }

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

    const rolesByInstitutionUserId = new Map<string, AppRole[]>();
    for (const r of ((rolesRes as any).data ?? []) as { institution_user_id: string; role: string }[]) {
      const arr = rolesByInstitutionUserId.get(r.institution_user_id) ?? [];
      arr.push(r.role as AppRole);
      rolesByInstitutionUserId.set(r.institution_user_id, arr);
    }

    const membersView: MemberRow[] = memberRows.map((m) => ({
      institution_user_id: m.id,
      user_id: m.user_id,
      roles: rolesByInstitutionUserId.get(m.id) ?? [],
    }));

    return {
      institution: instRes.data as Institution | null,
      settings: settingsRes.data as InstitutionSettings | null,
      staffCount: staffRes.count ?? 0,
      members: membersView,
    };
  }, [activeInstitutionId]);

  const refreshDashboard = useCallback(async () => {
    if (loading) return;
    if (!session) return;

    setPageLoading(true);
    setError(null);

    try {
      const data = await loadDashboard();
      setInstitution(data.institution);
      setSettings(data.settings);
      setStaffCount(data.staffCount);
      setMembers(data.members);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load institution dashboard");
    } finally {
      setPageLoading(false);
    }
  }, [loadDashboard, loading, session]);

  useEffect(() => {
    void refreshDashboard();
  }, [refreshDashboard]);

  const addMemberAndRole = useCallback(async () => {
    const targetUserId = memberUserId.trim();
    if (!targetUserId) {
      setRoleMessage("User ID is required.");
      return;
    }
    if (!activeInstitutionId) {
      setRoleMessage("No active institution selected.");
      return;
    }

    setRoleBusy(true);
    setRoleMessage(null);

    try {
      const existing = await supabase
        .from("institution_users")
        .select("id")
        .eq("institution_id", activeInstitutionId)
        .eq("user_id", targetUserId)
        .maybeSingle();

      if (existing.error) throw existing.error;

      const membershipId =
        existing.data?.id ??
        (
          await supabase
            .from("institution_users")
            .insert({ institution_id: activeInstitutionId, user_id: targetUserId })
            .select("id")
            .single()
        ).data?.id;

      if (!membershipId) {
        throw new Error("Unable to create membership.");
      }

      const roleIns = await supabase.from("user_roles").insert({ institution_user_id: membershipId, role: memberRole });
      if (roleIns.error) {
        // Handle unique constraint gracefully.
        if (roleIns.error.message.toLowerCase().includes("duplicate")) {
          setRoleMessage("That role is already assigned to this member.");
          return;
        }
        throw roleIns.error;
      }

      setRoleMessage("Role assigned.");
      await refreshDashboard();
    } catch (e: any) {
      setRoleMessage(e?.message ?? "Failed to assign role");
    } finally {
      setRoleBusy(false);
    }
  }, [activeInstitutionId, memberRole, memberUserId, refreshDashboard]);

  const removeRole = useCallback(
    async (institutionUserId: string, role: AppRole) => {
      setRoleBusy(true);
      setRoleMessage(null);

      try {
        const del = await supabase
          .from("user_roles")
          .delete()
          .eq("institution_user_id", institutionUserId)
          .eq("role", role);

        if (del.error) throw del.error;

        setRoleMessage("Role removed.");
        await refreshDashboard();
      } catch (e: any) {
        setRoleMessage(e?.message ?? "Failed to remove role");
      } finally {
        setRoleBusy(false);
      }
    },
    [refreshDashboard],
  );

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
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-[1fr_200px_160px] md:items-end">
            <div className="space-y-2">
              <Label htmlFor="memberUserId">Add existing user (User ID)</Label>
              <Input
                id="memberUserId"
                value={memberUserId}
                onChange={(e) => setMemberUserId(e.target.value)}
                placeholder="UUID (auth user id)"
                autoComplete="off"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="memberRole">Role</Label>
              <select
                id="memberRole"
                value={memberRole}
                onChange={(e) => setMemberRole(e.target.value as AppRole)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="lab_incharge">lab_incharge</option>
                <option value="staff">staff</option>
              </select>
            </div>

            <Button onClick={addMemberAndRole} disabled={roleBusy || pageLoading || !activeInstitutionId}>
              {roleBusy ? "Working…" : "Add / Assign"}
            </Button>
          </div>

          {roleMessage ? <p className="text-sm text-muted-foreground">{roleMessage}</p> : null}

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
                  <TableCell>
                    {m.roles.length ? (
                      <div className="flex flex-wrap items-center gap-2">
                        {m.roles.map((r) => (
                          <div key={r} className="flex items-center gap-2 rounded-md border border-input bg-background px-2 py-1">
                            <span className="text-xs font-medium">{r}</span>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-7 px-2"
                              onClick={() => removeRole(m.institution_user_id, r)}
                              disabled={roleBusy}
                            >
                              Remove
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>
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

          <p className="text-xs text-muted-foreground">
            Note: This view intentionally avoids showing other users’ profile details unless backend policies allow it.
          </p>
        </CardContent>
      </Card>

      {userId ? <p className="text-xs text-muted-foreground">Signed in as: {userId}</p> : null}
    </div>
  );
}
