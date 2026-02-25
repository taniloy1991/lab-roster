import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SetupSuperAdmin() {
  const { userId, globalRoles, refresh } = useAuth();
  const [loading, setLoading] = useState(false);
  const [institutionName, setInstitutionName] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  const isSuperAdmin = globalRoles.includes("super_admin");

  const canClaim = useMemo(() => !!userId && !isSuperAdmin, [userId, isSuperAdmin]);

  useEffect(() => {
    setStatus(null);
  }, [userId]);

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

    setStatus("Institution created. Next: add members and assign Lab Incharge (coming next). ");
    setLoading(false);
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
              Please <Link className="underline" to="/login">sign in</Link> to run initial setup.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
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
              {!isSuperAdmin ? (
                <p className="text-xs text-muted-foreground">You need Super Admin to create institutions.</p>
              ) : null}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
