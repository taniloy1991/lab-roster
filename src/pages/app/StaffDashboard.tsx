import React, { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type StaffSelf = { id: string; name: string; designation: string | null };

type OffRow = { entry_type: "earn" | "use"; amount: number };

type LeaveRow = { start_date: string; end_date: string; status: string; leave_type: "casual" | "off" };

export default function StaffDashboard() {
  const { userId, activeInstitutionId } = useAuth();
  const [loading, setLoading] = useState(false);
  const [self, setSelf] = useState<StaffSelf | null>(null);
  const [offBalance, setOffBalance] = useState(0);
  const [leavesPending, setLeavesPending] = useState(0);

  const load = async () => {
    if (!userId || !activeInstitutionId) return;
    setLoading(true);

    const staffRes = await supabase
      .from("staff")
      .select("id,name,designation")
      .eq("institution_id", activeInstitutionId)
      .eq("user_id", userId)
      .maybeSingle();

    const staff = staffRes.data as StaffSelf | null;
    setSelf(staff);

    if (!staff) {
      setOffBalance(0);
      setLeavesPending(0);
      setLoading(false);
      return;
    }

    const offRes = await supabase.from("off_ledger").select("entry_type,amount").eq("staff_id", staff.id);
    const offRows = (offRes.data ?? []) as OffRow[];
    const earn = offRows.filter((r) => r.entry_type === "earn").reduce((a, b) => a + Number(b.amount), 0);
    const use = offRows.filter((r) => r.entry_type === "use").reduce((a, b) => a + Number(b.amount), 0);
    setOffBalance(earn - use);

    const leaveRes = await supabase.from("leave_requests").select("status").eq("staff_id", staff.id).eq("status", "pending");
    setLeavesPending((leaveRes.data ?? []).length);

    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, activeInstitutionId]);

  const subtitle = useMemo(() => format(new Date(), "eeee, dd MMM"), []);

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">My Panel</h2>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <Button onClick={load} disabled={loading}>
          {loading ? "Loading…" : "Refresh"}
        </Button>
      </header>

      {!self ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Account not linked</CardTitle>
            <CardDescription>
              Your login is not linked to a Staff record yet. Ask the Lab Incharge to link your account.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">OFF Balance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold tabular-nums">{offBalance.toFixed(0)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending Leave Requests</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold tabular-nums">{leavesPending}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">Role</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-base font-medium">Staff</div>
              <div className="text-xs text-muted-foreground">{self.designation ?? ""}</div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
