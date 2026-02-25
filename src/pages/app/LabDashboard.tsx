import React, { useMemo, useState } from "react";
import { endOfMonth, format, parseISO, startOfMonth } from "date-fns";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

type StaffRow = { id: string; name: string; designation: string | null; phone: string | null };

type OffRow = { staff_id: string; entry_type: "earn" | "use"; amount: number };

type LeaveRow = { staff_id: string; start_date: string; end_date: string; status: string; leave_type: "casual" | "off" };

type DutyRow = { staff_id: string };

function daysInclusive(start: Date, end: Date) {
  const ms = 24 * 60 * 60 * 1000;
  return Math.floor((end.getTime() - start.getTime()) / ms) + 1;
}

export default function LabDashboard() {
  const { activeInstitutionId } = useAuth();
  const [month, setMonth] = useState(() => format(new Date(), "yyyy-MM"));
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<
    Array<{
      staff: StaffRow;
      offEarned: number;
      offUsed: number;
      offBalance: number;
      casualTaken: number;
      casualRemaining: number;
      leavesTaken: number;
      dutiesAssigned: number;
    }>
  >([]);
  const [quota, setQuota] = useState(20);

  const range = useMemo(() => {
    const start = startOfMonth(parseISO(`${month}-01`));
    const end = endOfMonth(start);
    return { start, end };
  }, [month]);

  const load = async () => {
    if (!activeInstitutionId) return;
    setLoading(true);

    const settingsRes = await supabase
      .from("institution_settings")
      .select("casual_leave_quota_yearly")
      .eq("institution_id", activeInstitutionId)
      .maybeSingle();

    const quotaYearly = settingsRes.data?.casual_leave_quota_yearly ?? 20;
    setQuota(quotaYearly);

    const staffRes = await supabase
      .from("staff")
      .select("id,name,designation,phone")
      .eq("institution_id", activeInstitutionId)
      .eq("is_active", true)
      .order("name");

    const staff = (staffRes.data ?? []) as StaffRow[];
    const staffIds = staff.map((s) => s.id);

    const offRes = await supabase
      .from("off_ledger")
      .select("staff_id,entry_type,amount")
      .eq("institution_id", activeInstitutionId)
      .gte("entry_date", format(range.start, "yyyy-MM-dd"))
      .lte("entry_date", format(range.end, "yyyy-MM-dd"))
      .in("staff_id", staffIds.length ? staffIds : ["00000000-0000-0000-0000-000000000000"]);

    const offRows = (offRes.data ?? []) as OffRow[];

    const leaveRes = await supabase
      .from("leave_requests")
      .select("staff_id,start_date,end_date,status,leave_type")
      .eq("institution_id", activeInstitutionId)
      .eq("status", "approved")
      .gte("start_date", format(range.start, "yyyy-MM-dd"))
      .lte("end_date", format(range.end, "yyyy-MM-dd"))
      .in("staff_id", staffIds.length ? staffIds : ["00000000-0000-0000-0000-000000000000"]);

    const leaveRows = (leaveRes.data ?? []) as LeaveRow[];

    const dutyRes = await supabase
      .from("roster_shift_assignments")
      .select("staff_id, roster_day_id")
      .in("staff_id", staffIds.length ? staffIds : ["00000000-0000-0000-0000-000000000000"]);

    const rosterIds = Array.from(new Set((dutyRes.data ?? []).map((d) => d.roster_day_id)));

    let dutyRows: DutyRow[] = (dutyRes.data ?? []).map((d) => ({ staff_id: d.staff_id }));

    // Filter duties by date range by fetching roster_days for the roster_day_ids we saw
    if (rosterIds.length) {
      const rosterDayRes = await supabase
        .from("roster_days")
        .select("id,duty_date")
        .in("id", rosterIds)
        .gte("duty_date", format(range.start, "yyyy-MM-dd"))
        .lte("duty_date", format(range.end, "yyyy-MM-dd"));

      const allowed = new Set((rosterDayRes.data ?? []).map((r) => r.id));
      dutyRows = (dutyRes.data ?? [])
        .filter((d) => allowed.has(d.roster_day_id))
        .map((d) => ({ staff_id: d.staff_id }));
    } else {
      dutyRows = [];
    }

    const offByStaff = new Map<string, { earn: number; use: number }>();
    for (const r of offRows) {
      const cur = offByStaff.get(r.staff_id) ?? { earn: 0, use: 0 };
      if (r.entry_type === "earn") cur.earn += Number(r.amount);
      else cur.use += Number(r.amount);
      offByStaff.set(r.staff_id, cur);
    }

    const dutiesByStaff = new Map<string, number>();
    for (const d of dutyRows) dutiesByStaff.set(d.staff_id, (dutiesByStaff.get(d.staff_id) ?? 0) + 1);

    const leavesByStaff = new Map<string, { casual: number; total: number }>();
    for (const l of leaveRows) {
      const start = parseISO(l.start_date);
      const end = parseISO(l.end_date);
      const count = daysInclusive(start, end);
      const cur = leavesByStaff.get(l.staff_id) ?? { casual: 0, total: 0 };
      cur.total += count;
      if (l.leave_type === "casual") cur.casual += count;
      leavesByStaff.set(l.staff_id, cur);
    }

    const merged = staff.map((s) => {
      const off = offByStaff.get(s.id) ?? { earn: 0, use: 0 };
      const leaves = leavesByStaff.get(s.id) ?? { casual: 0, total: 0 };
      const dutiesAssigned = dutiesByStaff.get(s.id) ?? 0;
      const offBalance = off.earn - off.use;
      const casualRemaining = Math.max(0, quotaYearly - leaves.casual);

      return {
        staff: s,
        offEarned: off.earn,
        offUsed: off.use,
        offBalance,
        casualTaken: leaves.casual,
        casualRemaining,
        leavesTaken: leaves.total,
        dutiesAssigned,
      };
    });

    setRows(merged);
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Overview</h2>
          <p className="text-sm text-muted-foreground">Monthly Leave & OFF balance snapshot by staff.</p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Month</span>
            <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-[190px]" />
          </div>
          <Button onClick={load} disabled={loading}>
            {loading ? "Loading…" : "Refresh"}
          </Button>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Staff Overview</CardTitle>
          <CardDescription>
            Casual quota (yearly): <span className="font-medium text-foreground">{quota}</span>. Range: {format(range.start, "dd MMM")}
            –{format(range.end, "dd MMM")}
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr className="border-b">
                <th className="py-3 pr-4">Staff</th>
                <th className="py-3 pr-4">OFF Earned</th>
                <th className="py-3 pr-4">OFF Used</th>
                <th className="py-3 pr-4">OFF Balance</th>
                <th className="py-3 pr-4">Casual Remaining</th>
                <th className="py-3 pr-4">Leaves Taken</th>
                <th className="py-3 pr-4">Duties Assigned</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && !loading ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-muted-foreground">
                    No data yet. Add staff and create roster/leave/off entries.
                  </td>
                </tr>
              ) : null}
              {rows.map((r) => (
                <tr key={r.staff.id} className="border-b last:border-b-0">
                  <td className="py-3 pr-4">
                    <div className="font-medium">{r.staff.name}</div>
                    <div className="text-xs text-muted-foreground">{[r.staff.designation, r.staff.phone].filter(Boolean).join(" • ")}</div>
                  </td>
                  <td className="py-3 pr-4 tabular-nums">{r.offEarned.toFixed(0)}</td>
                  <td className="py-3 pr-4 tabular-nums">{r.offUsed.toFixed(0)}</td>
                  <td className="py-3 pr-4 tabular-nums">
                    <span className={r.offBalance < 0 ? "text-destructive" : "text-foreground"}>{r.offBalance.toFixed(0)}</span>
                  </td>
                  <td className="py-3 pr-4 tabular-nums">{r.casualRemaining}</td>
                  <td className="py-3 pr-4 tabular-nums">{r.leavesTaken}</td>
                  <td className="py-3 pr-4 tabular-nums">{r.dutiesAssigned}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <Separator className="my-5" />

          <p className="text-xs text-muted-foreground">
            Tip: Your browser’s print dialog can save this as PDF. Use the “Monthly Report” page for a print-optimized layout.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
