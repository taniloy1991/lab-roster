import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type InstitutionRow = {
  id: string;
  name: string;
  created_at: string;
};

function formatDateTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export default function SetupSuperAdmin() {
  const navigate = useNavigate();
  const { userId, globalRoles, refresh, activeInstitutionId } = useAuth();

  const [loading, setLoading] = useState(false);
  const [institutionName, setInstitutionName] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  const [institutions, setInstitutions] = useState<InstitutionRow[]>([]);
  const [institutionsLoading, setInstitutionsLoading] = useState(false);
  const [institutionsError, setInstitutionsError] = useState<string | null>(null);

  const isSuperAdmin = globalRoles.includes("super_admin");

  const canClaim = useMemo(() => !!userId && !isSuperAdmin, [userId, isSuperAdmin]);

  const fetchInstitutions = async () => {
    if (!userId || !isSuperAdmin) return;
    setInstitutionsLoading(true);
    setInstitutionsError(null);

    const res = await supabase
      .from("institutions")
      .select("id,name,created_at")
      .order("created_at", { ascending: false });

    if (res.error) {
      setInstitutionsError(res.error.message);
      setInstitutions([]);
      setInstitutionsLoading(false);
      return;
    }

    setInstitutions((res.data ?? []) as InstitutionRow[]);
    setInstitutionsLoading(false);
  };

  useEffect(() => {
    setStatus(null);
  }, [userId]);

  useEffect(() => {
    fetchInstitutions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, isSuperAdmin]);

  const claim = async () => {
    if (!userId) return;
    setLoading(true);
    setStatus(null);

    const ins = await supabase.from("global_user_roles").insert({ user_id: userId, role: "super_admin" });
    if (ins.error) {
      setStatus(ins.error.message);
      setLoading(false);
      return;
    }

    await refresh();
    await fetchInstitutions();
    setLoading(false);
  };

  const createInstitution = async () => {
    if (!institutionName.trim()) {
      setStatus("Institution name is required");
      return;
    }

    setLoading(true);
    setStatus(null);

    const instRes = await supabase.from("institutions").insert({ name: institutionName.trim() }).select("id").single();
    if (instRes.error) {
      setStatus(instRes.error.message);
      setLoading(false);
      return;
    }

    const settingsRes = await supabase
      .from("institution_settings")
      .insert({ institution_id: instRes.data.id, casual_leave_quota_yearly: 20, weekly_off_quota: 1 });
    if (settingsRes.error) {
      setStatus(settingsRes.error.message);
      setLoading(false);
      return;
    }

    setInstitutionName("");
    setStatus("Institution created.");
    await fetchInstitutions();
    setLoading(false);
  };

  const manageInstitution = async (institutionId: string) => {
    if (!userId) return;

    setLoading(true);
    setStatus(null);

    const upd = await supabase
      .from("profiles")
      .update({ active_institution_id: institutionId })
      .eq("user_id", userId);

    if (upd.error) {
      setStatus(upd.error.message);
      setLoading(false);
      return;
    }

    await refresh();
    setLoading(false);

    // Redirect into the app; AppHome will route based on roles + active institution.
    navigate("/app", { replace: true });
  };

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-semibold tracking-tight">Setup</h2>
        <p className="text-sm text-muted-foreground">Bootstrap Super Admin and create your first institution.</p>
      </header>

      {!userId ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Sign in required</CardTitle>
            <CardDescription>
              Please{" "}
              <Link className="underline" to="/login">
                sign in
              </Link>{" "}
              to run initial setup.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Claim Super Admin</CardTitle>
                <CardDescription>Only possible if no Super Admin exists yet.</CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={claim} disabled={!canClaim || loading}>
                  {isSuperAdmin ? "Already Super Admin" : loading ? "Working…" : "Claim role"}
                </Button>
                {status ? <p className="mt-3 text-sm text-muted-foreground">{status}</p> : null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Create Institution</CardTitle>
                <CardDescription>Creates default leave quotas (Casual 20, Weekly off 1).</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="institution">Institution name</Label>
                  <Input id="institution" value={institutionName} onChange={(e) => setInstitutionName(e.target.value)} />
                </div>
                <Button onClick={createInstitution} disabled={!isSuperAdmin || loading}>
                  {loading ? "Creating…" : "Create"}
                </Button>
                {!isSuperAdmin ? <p className="text-xs text-muted-foreground">You need Super Admin to create institutions.</p> : null}
              </CardContent>
            </Card>
          </div>

          {isSuperAdmin ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Institutions</CardTitle>
                <CardDescription>
                  Select an institution to set your active context{activeInstitutionId ? " (currently set)" : ""}.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {institutionsError ? <p className="text-sm text-destructive">{institutionsError}</p> : null}

                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-muted-foreground">
                    {institutionsLoading ? "Loading…" : `${institutions.length} institution${institutions.length === 1 ? "" : "s"}`}
                  </p>
                  <Button variant="outline" size="sm" onClick={fetchInstitutions} disabled={institutionsLoading || loading}>
                    Refresh
                  </Button>
                </div>

                <div className="mt-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Institution Name</TableHead>
                        <TableHead>Created Date</TableHead>
                        <TableHead className="w-[140px]">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {institutions.map((inst) => (
                        <TableRow key={inst.id}>
                          <TableCell className="font-medium">{inst.name}</TableCell>
                          <TableCell>{formatDateTime(inst.created_at)}</TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => manageInstitution(inst.id)}
                              disabled={loading}
                            >
                              Manage
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}

                      {!institutionsLoading && institutions.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} className="text-muted-foreground">
                            No institutions yet.
                          </TableCell>
                        </TableRow>
                      ) : null}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>
      )}
    </div>
  );
}
