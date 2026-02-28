import React, { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { endOfMonth, format, parseISO, startOfMonth } from "date-fns";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { PrintLayout } from "@/components/print/PrintLayout";

type VisualLeaveType = "others" | "earned_leave" | "casual_leave" | "week_off" | "govt_holiday" | "none";

type PdfRow = {
  duty_date: string;
  morning: string;
  evening: string;
  night: string;
  leave: string;
};

const leaveLabel: Record<VisualLeaveType, string> = {
  others: "Others",
  earned_leave: "Earned Leave",
  casual_leave: "Casual Leave",
  week_off: "Week Off",
  govt_holiday: "Govt. Holiday",
  none: "None",
};

export default function RosterPrint() {
  const { loading: authLoading, session } = useAuth();

  const [params] = useSearchParams();
  const nav = useNavigate();

  const month =
    params.get("month") ??
    (() => {
      const d = new Date();
      return format(d, "yyyy-MM");
    })();

  const range = useMemo(() => {
    const start = startOfMonth(parseISO(`${month}-01`));
    const end = endOfMonth(start);
    return { start, end };
  }, [month]);

  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<PdfRow[]>([]);
  const [mode, setMode] = useState<"selected" | "month">("month");

  const load = async () => {
    setLoading(true);

    const start = format(range.start, "yyyy-MM-dd");
    const end = format(range.end, "yyyy-MM-dd");

    // If there are selected dates in selected_roster_dates for this month → use selected mode.
    const selRes = await supabase
      .from("selected_roster_dates")
      .select("duty_date")
      .gte("duty_date", start)
      .lte("duty_date", end)
      .limit(1);

    const hasSelection = (selRes.data ?? []).length > 0;
    setMode(hasSelection ? "selected" : "month");

    const selectedRes = hasSelection
      ? await supabase.from("selected_roster_dates").select("duty_date").gte("duty_date", start).lte("duty_date", end)
      : null;

    const selectedSet = new Set<string>((selectedRes?.data ?? []).map((r: any) => String(r.duty_date)));

    const rosterRes = await supabase
      .from("roster_visual_entries" as any)
      .select("id,duty_date,shift,staff_id,responsibility_note,leave_type, staff:staff_id(name)")
      .gte("duty_date", start)
      .lte("duty_date", end)
      .order("duty_date", { ascending: true })
      .order("created_at", { ascending: true });

    const byDate = new Map<string, { morning: string[]; evening: string[]; night: string[] }>();
    const leaveByDate = new Map<string, VisualLeaveType>();

    for (const r of (rosterRes.data ?? []) as any[]) {
      const d = String(r.duty_date);
      if (hasSelection && !selectedSet.has(d)) continue;

      if (r.shift == null && r.staff_id == null) {
        leaveByDate.set(d, (r.leave_type ?? "none") as VisualLeaveType);
        continue;
      }

      const shift = String(r.shift) as "morning" | "evening" | "night";
      const name = r.staff?.name ?? "—";
      const note = String(r.responsibility_note ?? "").trim();
      const line = note ? `${name} — ${note}` : name;

      const cur = byDate.get(d) ?? { morning: [], evening: [], night: [] };
      cur[shift].push(line);
      byDate.set(d, cur);
    }

    const dates = Array.from(new Set([...byDate.keys(), ...leaveByDate.keys()])).sort();

    setRows(
      dates.map((d) => {
        const v = byDate.get(d) ?? { morning: [], evening: [], night: [] };
        const leave = leaveLabel[leaveByDate.get(d) ?? "none"] ?? "None";

        return {
          duty_date: d,
          morning: v.morning.join("\n") || "—",
          evening: v.evening.join("\n") || "—",
          night: v.night.join("\n") || "—",
          leave: leave || "—",
        };
      }),
    );

    setLoading(false);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);

  if (authLoading) return null;
  if (!session) return <Navigate to="/login" replace />;

  return (
    <PrintLayout pageClassName="roster-print-page" className="bg-card">
      <header className="text-center">
        <div className="text-base font-semibold leading-tight">Department of Microbiology</div>
        <div className="text-base font-semibold leading-tight">BIRDEM GENERAL HOSPITAL</div>

        <h1 className="mt-6 text-xl font-semibold tracking-tight">{format(parseISO(`${month}-01`), "MMMM yyyy")}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {mode === "selected" ? "Selected dates export" : "No date selected → exporting full month"}
        </p>
      </header>

      <section className="mt-8 print:hidden">
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" onClick={() => nav("/app/roster")}>
            Back
          </Button>
          <Button variant="outline" onClick={() => window.print()}>
            Print / Save as PDF
          </Button>
          <Button onClick={load} disabled={loading}>
            {loading ? "Loading…" : "Refresh"}
          </Button>
        </div>
      </section>

      <section className="mt-6">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr className="border-b">
                <th className="py-3 pr-4">Date</th>
                <th className="py-3 pr-4">Morning (Staff — Responsibility)</th>
                <th className="py-3 pr-4">Evening (Staff — Responsibility)</th>
                <th className="py-3 pr-4">Night (Staff — Responsibility)</th>
                <th className="py-3 pr-4">Leave (Visual Leave Type)</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={String(r.duty_date)} className="border-b last:border-b-0">
                  <td className="py-3 pr-4 tabular-nums font-medium">{r.duty_date}</td>
                  <td className="py-3 pr-4 align-top whitespace-pre-wrap">{r.morning}</td>
                  <td className="py-3 pr-4 align-top whitespace-pre-wrap">{r.evening}</td>
                  <td className="py-3 pr-4 align-top whitespace-pre-wrap">{r.night}</td>
                  <td className="py-3 pr-4 align-top whitespace-pre-wrap">{r.leave}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-10 grid grid-cols-1 gap-8 text-sm sm:grid-cols-2">
        <div>
          <div className="text-muted-foreground">Prepared By:</div>
          <div className="mt-3 border-b border-border" />
        </div>
        <div>
          <div className="text-muted-foreground">Approved By:</div>
          <div className="mt-3 border-b border-border" />
        </div>
      </section>
    </PrintLayout>
  );
}
