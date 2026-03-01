import React, { useEffect, useMemo, useState } from "react";
import { endOfMonth, format, parseISO, startOfMonth } from "date-fns";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { KpiCards, type KpiItem } from "./lab/KpiCards";
import { TodayDutyOverview, type TodayDutyShift } from "./lab/TodayDutyOverview";

type StaffRow = { id: string; name: string; designation: string | null; phone: string | null };

type OffLedgerRow = { staff_id: string; entry_type: "earn" | "use" };

type LeaveRow = { staff_id: string; start_date: string; end_date: string; status: string; leave_type: "casual" | "off" };

type HolidayRow = { staff_id: string | null; holiday_type: string | null };

type VisualRow = { duty_date: string; shift: "morning" | "evening" | "night"; staff_id: string | null; responsibility_note: string | null };

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

  const [institutionName, setInstitutionName] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);

  // Snapshot + today
  const [kpis, setKpis] = useState<{
    totalStaff: number;
    presentToday: number;
    onLeaveToday: number;
    offToday: number;
    dutiesThisMonth: number;
    leaveTakenThisMonth: number;
  } | null>(null);

  const [todayDuty, setTodayDuty] = useState<TodayDutyShift[]>([
    { shift: "morning", entries: [] },
    { shift: "evening", entries: [] },
    { shift: "night", entries: [] },
  ]);

  const range = useMemo(() => {
    const start = startOfMonth(parseISO(`${month}-01`));
    const end = endOfMonth(start);
    return { start, end };
  }, [month]);

  const today = useMemo(() => format(new Date(), "yyyy-MM-dd"), []);

  const load = async () => {
    if (!activeInstitutionId) return;
    setLoading(true);

    // Institution info
    const instRes = await supabase.from("institutions").select("name,updated_at").eq("id", activeInstitutionId).maybeSingle();
    setInstitutionName(instRes.data?.name ?? null);
    setLastUpdatedAt(instRes.data?.updated_at ?? null);

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
    const staffNameById = new Map<string, string>(staff.map((s) => [s.id, s.name]));

    // Today leave/off (using holidays as daily status source)
    const holidayRes = await supabase
      .from("holidays")
      .select("staff_id,holiday_type")
      .eq("institution_id", activeInstitutionId)
      .eq("holiday_date", today)
      .in("staff_id", staffIds.length ? staffIds : ["00000000-0000-0000-0000-000000000000"]);

    const holidayRows = (holidayRes.data ?? []) as HolidayRow[];
    const onLeaveToday = holidayRows.filter((r) => (r.holiday_type ?? "").toLowerCase() === "casual").length;
    const offToday = holidayRows.filter((r) => (r.holiday_type ?? "").toLowerCase() === "general_off").length;
    const totalStaff = staff.length;
    const presentToday = Math.max(0, totalStaff - onLeaveToday - offToday);

    // Today duty overview (planning tool: roster_visual_entries)
    const todayRosterRes = await supabase
      .from("roster_visual_entries" as any)
      .select("duty_date,shift,staff_id,responsibility_note,institution_id")
      .eq("institution_id", activeInstitutionId)
      .eq("duty_date", today)
      .not("shift", "is", null)
      .order("created_at", { ascending: true });

    const byShift = new Map<"morning" | "evening" | "night", Array<{ staff: string; note: string }>>([
      ["morning", []],
      ["evening", []],
      ["night", []],
    ]);

    for (const r of (todayRosterRes.data ?? []) as any[]) {
      const shift = String(r.shift) as "morning" | "evening" | "night";
      const sid = String(r.staff_id ?? "");
      const staffName = staffNameById.get(sid) ?? "—";
      const note = String(r.responsibility_note ?? "").trim();
      byShift.get(shift)?.push({ staff: staffName, note });
    }

    setTodayDuty([
      { shift: "morning", entries: byShift.get("morning") ?? [] },
      { shift: "evening", entries: byShift.get("evening") ?? [] },
      { shift: "night", entries: byShift.get("night") ?? [] },
    ]);

    // Monthly OFF ledger
    const offRes = await supabase
      .from("compensatory_off_ledger")
      .select("staff_id,entry_type")
      .eq("institution_id", activeInstitutionId)
      .gte("duty_date", format(range.start, "yyyy-MM-dd"))
      .lte("duty_date", format(range.end, "yyyy-MM-dd"))
      .in("staff_id", staffIds.length ? staffIds : ["00000000-0000-0000-0000-000000000000"]);

    const offRows = (offRes.data ?? []) as OffLedgerRow[];

    // Monthly approved leaves (leave_requests)
    const leaveRes = await supabase
      .from("leave_requests")
      .select("staff_id,start_date,end_date,status,leave_type")
      .eq("institution_id", activeInstitutionId)
      .eq("status", "approved")
      .gte("start_date", format(range.start, "yyyy-MM-dd"))
      .lte("end_date", format(range.end, "yyyy-MM-dd"))
      .in("staff_id", staffIds.length ? staffIds : ["00000000-0000-0000-0000-000000000000"]);

    const leaveRows = (leaveRes.data ?? []) as LeaveRow[];

    // Duties assigned (FIX): get roster_days in range first, then assignments within those roster_day_ids
    const rosterDaysRes = await supabase
      .from("roster_days")
      .select("id")
      .eq("institution_id", activeInstitutionId)
      .gte("duty_date", format(range.start, "yyyy-MM-dd"))
      .lte("duty_date", format(range.end, "yyyy-MM-dd"));

    const rosterDayIds = (rosterDaysRes.data ?? []).map((r: any) => String(r.id));

    const dutyRes = await supabase
      .from("roster_shift_assignments")
      .select("staff_id,roster_day_id")
      .in("roster_day_id", rosterDayIds.length ? rosterDayIds : ["00000000-0000-0000-0000-000000000000"])
      .in("staff_id", staffIds.length ? staffIds : ["00000000-0000-0000-0000-000000000000"]);

    const dutyRows = (dutyRes.data ?? []).map((d: any) => ({ staff_id: String(d.staff_id) }));

    const offByStaff = new Map<string, { earn: number; use: number }>();
    for (const r of offRows) {
      const cur = offByStaff.get(r.staff_id) ?? { earn: 0, use: 0 };
      if (r.entry_type === "earn") cur.earn += 1;
      else cur.use += 1;
      offByStaff.set(r.staff_id, cur);
    }

    const dutiesByStaff = new Map<string, number>();
    for (const d of dutyRows) dutiesByStaff.set(d.staff_id, (dutiesByStaff.get(d.staff_id) ?? 0) + 1);

    const leavesByStaff = new Map<string, { casual: number; total: number }>();
    let leaveTakenThisMonth = 0;
    for (const l of leaveRows) {
      const start = parseISO(l.start_date);
      const end = parseISO(l.end_date);
      const count = daysInclusive(start, end);
      leaveTakenThisMonth += count;
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

    const dutiesThisMonth = Array.from(dutiesByStaff.values()).reduce((a, b) => a + b, 0);

    setKpis({
      totalStaff,
      presentToday,
      onLeaveToday,
      offToday,
      dutiesThisMonth,
      leaveTakenThisMonth,
    });

    setRows(merged);
    setLoading(false);
  };

  useEffect(() => {
    if (!activeInstitutionId) return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeInstitutionId, month]);

  const kpiItems: KpiItem[] = useMemo(() => {
    const v = kpis;
    return [
      { label: "Total Staff", value: v?.totalStaff ?? "—" },
      { label: "Present Today", value: v?.presentToday ?? "—" },
      { label: "On Leave Today", value: v?.onLeaveToday ?? "—" },
      { label: "OFF Today", value: v?.offToday ?? "—" },
      { label: "Total Duties Assigned (This Month)", value: v?.dutiesThisMonth ?? "—" },
      { label: "Total Leave Taken (This Month)", value: v?.leaveTakenThisMonth ?? "—" },
    ];
  }, [kpis]);

  const unassignedToday = useMemo(() => {
    const missing = todayDuty.filter((s) => s.entries.length === 0).map((s) => s.shift);
    return missing.length ? missing.join(", ") : null;
  }, [todayDuty]);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="flex items-center gap-3">
          <img
            src="/images/birdem-logo.png"
            alt="BIRDEM General Hospital logo"
            className="h-10 w-auto shrink-0"
            loading="eager"
          />
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Overview</h2>
            <p className="text-sm text-muted-foreground">Lab operational snapshot + monthly leave & OFF balance by staff.</p>
          </div>
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

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm">
          <span className="text-muted-foreground">Institution: </span>
          <span className="font-medium">{institutionName ?? "—"}</span>
        </div>
        <div className="text-xs text-muted-foreground">
          Last update: {lastUpdatedAt ? format(parseISO(lastUpdatedAt), "dd MMM yyyy, p") : "—"}
        </div>
      </div>

      <KpiCards items={kpiItems} />

      {unassignedToday ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Alerts</CardTitle>
            <CardDescription>Things that may need attention today.</CardDescription>
          </CardHeader>
          <CardContent className="pt-0 text-sm">
            <div>
              <span className="font-medium">Unassigned duty today:</span> <span className="text-muted-foreground">{unassignedToday}</span>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <TodayDutyOverview dateLabel={format(parseISO(`${today}T00:00:00`), "dd MMM yyyy")} shifts={todayDuty} />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Monthly Staff Summary</CardTitle>
          <CardDescription>
            Casual quota (yearly): <span className="font-medium text-foreground">{quota}</span>. Range: {format(range.start, "dd MMM")}–
            {format(range.end, "dd MMM")}
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
                <th className="py-3 pr-4">CL Remaining</th>
                <th className="py-3 pr-4">Leave Days</th>
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

          <p className="text-xs text-muted-foreground">Tip: Your browser’s print dialog can save this as PDF. Use the “Monthly Report” page for a print-optimized layout.</p>
        </CardContent>
      </Card>
    </div>
  );
}
