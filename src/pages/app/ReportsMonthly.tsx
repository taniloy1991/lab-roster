import React, { useEffect, useMemo, useState } from "react";
import { endOfMonth, format, parseISO, startOfMonth } from "date-fns";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type StaffRow = { id: string; name: string };

type OffLedgerRow = { staff_id: string; entry_type: "earn" | "use" };

type DutyRow = { staff_id: string; roster_day_id: string };

type LeaveRow = { staff_id: string; start_date: string; end_date: string; leave_type: "casual" | "off"; status: string };

function daysInclusive(start: Date, end: Date) {
  const ms = 24 * 60 * 60 * 1000;
  return Math.floor((end.getTime() - start.getTime()) / ms) + 1;
}

export default function ReportsMonthly() {
  const { activeInstitutionId } = useAuth();
  const [month, setMonth] = useState(() => format(new Date(), "yyyy-MM"));
  const [institutionName, setInstitutionName] = useState<string>("");
  const [rows, setRows] = useState<
    Array<{ name: string; offEarned: number; offUsed: number; offBalance: number; casualRemaining: number; duties: number }>
  >([]);
  const [quota, setQuota] = useState(20);
  const [loading, setLoading] = useState(false);

  const range = useMemo(() => {
    const start = startOfMonth(parseISO(`${month}-01`));
    const end = endOfMonth(start);
    return { start, end };
  }, [month]);

  const load = async () => {
    if (!activeInstitutionId) return;
    setLoading(true);

    const inst = await supabase.from("institutions").select("name").eq("id", activeInstitutionId).maybeSingle();
    setInstitutionName(inst.data?.name ?? "");

    const settingsRes = await supabase
      .from("institution_settings")
      .select("casual_leave_quota_yearly")
      .eq("institution_id", activeInstitutionId)
      .maybeSingle();
    const quotaYearly = settingsRes.data?.casual_leave_quota_yearly ?? 20;
    setQuota(quotaYearly);

    const staffRes = await supabase
      .from("staff")
      .select("id,name")
      .eq("institution_id", activeInstitutionId)
      .eq("is_active", true)
      .order("name");
    const staff = (staffRes.data ?? []) as StaffRow[];
    const staffIds = staff.map((s) => s.id);

    const offRes = await supabase
      .from("compensatory_off_ledger")
      .select("staff_id,entry_type")
      .eq("institution_id", activeInstitutionId)
      .gte("duty_date", format(range.start, "yyyy-MM-dd"))
      .lte("duty_date", format(range.end, "yyyy-MM-dd"))
      .in("staff_id", staffIds.length ? staffIds : ["00000000-0000-0000-0000-000000000000"]);
    const offRows = (offRes.data ?? []) as OffLedgerRow[];

    const dutyRes = await supabase
      .from("roster_shift_assignments")
      .select("staff_id,roster_day_id")
      .in("staff_id", staffIds.length ? staffIds : ["00000000-0000-0000-0000-000000000000"]);

    const rosterIds = Array.from(new Set((dutyRes.data ?? []).map((d) => d.roster_day_id)));
    let dutyRows: DutyRow[] = (dutyRes.data ?? []) as DutyRow[];

    if (rosterIds.length) {
      const rosterDayRes = await supabase
        .from("roster_days")
        .select("id,duty_date")
        .in("id", rosterIds)
        .gte("duty_date", format(range.start, "yyyy-MM-dd"))
        .lte("duty_date", format(range.end, "yyyy-MM-dd"));
      const allowed = new Set((rosterDayRes.data ?? []).map((r) => r.id));
      dutyRows = (dutyRes.data ?? []).filter((d) => allowed.has(d.roster_day_id)) as DutyRow[];
    } else {
      dutyRows = [];
    }

    const leaveRes = await supabase
      .from("leave_requests")
      .select("staff_id,start_date,end_date,leave_type,status")
      .eq("institution_id", activeInstitutionId)
      .eq("status", "approved")
      .gte("start_date", format(range.start, "yyyy-MM-dd"))
      .lte("end_date", format(range.end, "yyyy-MM-dd"))
      .in("staff_id", staffIds.length ? staffIds : ["00000000-0000-0000-0000-000000000000"]);
    const leaveRows = (leaveRes.data ?? []) as LeaveRow[];

    const offByStaff = new Map<string, { earn: number; use: number }>();
    for (const r of offRows) {
      const cur = offByStaff.get(r.staff_id) ?? { earn: 0, use: 0 };
      if (r.entry_type === "earn") cur.earn += 1;
      else cur.use += 1;
      offByStaff.set(r.staff_id, cur);
    }

    const dutiesByStaff = new Map<string, number>();
    for (const d of dutyRows) dutiesByStaff.set(d.staff_id, (dutiesByStaff.get(d.staff_id) ?? 0) + 1);

    const casualTakenByStaff = new Map<string, number>();
    for (const l of leaveRows) {
      if (l.leave_type !== "casual") continue;
      const count = daysInclusive(parseISO(l.start_date), parseISO(l.end_date));
      casualTakenByStaff.set(l.staff_id, (casualTakenByStaff.get(l.staff_id) ?? 0) + count);
    }

    const merged = staff.map((s) => {
      const off = offByStaff.get(s.id) ?? { earn: 0, use: 0 };
      const duties = dutiesByStaff.get(s.id) ?? 0;
      const casualTaken = casualTakenByStaff.get(s.id) ?? 0;
      const casualRemaining = Math.max(0, quotaYearly - casualTaken);
      return {
        name: s.name,
        offEarned: off.earn,
        offUsed: off.use,
        offBalance: off.earn - off.use,
        casualRemaining,
        duties,
      };
    });

    setRows(merged);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeInstitutionId, month]);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between print:hidden">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Monthly Leave & OFF Balance Overview</h2>
          <p className="text-sm text-muted-foreground">Print-optimized. Save as PDF from the print dialog.</p>
        </div>
        <div className="flex items-center gap-2">
          <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-[190px]" />
          <Button onClick={() => window.print()} variant="outline">
            Print / PDF
          </Button>
          <Button onClick={load} disabled={loading}>
            {loading ? "Loading…" : "Refresh"}
          </Button>
        </div>
      </header>

      <Card className="print:shadow-none">
        <CardHeader className="print:pb-2">
          <CardTitle className="text-lg">
            {institutionName || "Institution"} — {format(parseISO(`${month}-01`), "MMMM yyyy")}
          </CardTitle>
          <p className="text-xs text-muted-foreground">Casual quota (yearly): {quota}</p>
        </CardHeader>
        <CardContent className="overflow-x-auto print:overflow-visible">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr className="border-b">
                <th className="py-3 pr-4">Staff</th>
                <th className="py-3 pr-4">OFF Earned</th>
                <th className="py-3 pr-4">OFF Used</th>
                <th className="py-3 pr-4">OFF Balance</th>
                <th className="py-3 pr-4">Casual Remaining</th>
                <th className="py-3 pr-4">Total Duties</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-muted-foreground">
                    No data for this month.
                  </td>
                </tr>
              ) : null}
              {rows.map((r) => (
                <tr key={r.name} className="border-b last:border-b-0">
                  <td className="py-3 pr-4 font-medium">{r.name}</td>
                  <td className="py-3 pr-4 tabular-nums">{r.offEarned.toFixed(0)}</td>
                  <td className="py-3 pr-4 tabular-nums">{r.offUsed.toFixed(0)}</td>
                  <td className="py-3 pr-4 tabular-nums">{r.offBalance.toFixed(0)}</td>
                  <td className="py-3 pr-4 tabular-nums">{r.casualRemaining}</td>
                  <td className="py-3 pr-4 tabular-nums">{r.duties}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
