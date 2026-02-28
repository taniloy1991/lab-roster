import React, { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { endOfMonth, format, parseISO, startOfMonth } from "date-fns";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { InstitutionPdfHeader } from "@/components/print/InstitutionPdfHeader";

type LeaveType = "casual" | "off_use" | "general_off" | "government";

type PdfRow = {
  duty_date: string;
  morning: string;
  evening: string;
  night: string;
  leave: string;
};

export default function RosterPrint() {
  const { loading: authLoading, session, institutionRoles } = useAuth();
  const canView = institutionRoles.includes("lab_incharge") || institutionRoles.includes("staff");

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

    // If there are selected dates in selected_roster_dates for this month → use selected mode.
    const selRes = await supabase
      .from("selected_roster_dates")
      .select("duty_date")
      .gte("duty_date", format(range.start, "yyyy-MM-dd"))
      .lte("duty_date", format(range.end, "yyyy-MM-dd"))
      .limit(1);

    const hasSelection = (selRes.data ?? []).length > 0;
    setMode(hasSelection ? "selected" : "month");

    const start = format(range.start, "yyyy-MM-dd");
    const end = format(range.end, "yyyy-MM-dd");

    // Fetch assignment lines with duty notes
    const rosterRes = await supabase
      .from("roster_pdf_view")
      .select("duty_date,shift,name,duty_note,is_extra")
      .gte("duty_date", start)
      .lte("duty_date", end)
      .order("duty_date", { ascending: true });

    // Fetch leaves (new table)
    const leavesRes = await supabase
      .from("staff_leaves")
      .select("duty_date,staff_id,leave_type, staff:staff_id(name)")
      .gte("duty_date", start)
      .lte("duty_date", end);

    // Selected dates list (if any)
    const selectedRes = hasSelection
      ? await supabase
          .from("selected_roster_dates")
          .select("duty_date")
          .gte("duty_date", start)
          .lte("duty_date", end)
      : null;

    const selectedSet = new Set<string>((selectedRes?.data ?? []).map((r: any) => String(r.duty_date)));

    const byDate = new Map<string, { morning: string[]; evening: string[]; night: string[] }>();

    for (const r of (rosterRes.data ?? []) as any[]) {
      const d = String(r.duty_date);
      if (hasSelection && !selectedSet.has(d)) continue;

      const shift = String(r.shift) as "morning" | "evening" | "night";
      const name = (r.name ?? "—") as string;
      const note = String(r.duty_note ?? "").trim();
      const line = note ? `${name} — ${note}` : name;

      const cur = byDate.get(d) ?? { morning: [], evening: [], night: [] };
      cur[shift].push(line);
      byDate.set(d, cur);
    }

    const leaveByDate: Map<string, string[]> = new Map();
    for (const r of (leavesRes.data ?? []) as any[]) {
      const d = String(r.duty_date);
      if (hasSelection && !selectedSet.has(d)) continue;

      const staffName = r.staff?.name ?? "—";
      const type = String(r.leave_type) as LeaveType;
      const label =
        type === "casual"
          ? "CL"
          : type === "off_use"
            ? "OFF"
            : type === "general_off"
              ? "General OFF"
              : "Government";

      const arr = leaveByDate.get(d) ?? [];
      arr.push(`${staffName} (${label})`);
      leaveByDate.set(d, arr);
    }

    const dates = Array.from(byDate.keys()).sort();
    setRows(
      dates.map((d) => {
        const v = byDate.get(d) ?? { morning: [], evening: [], night: [] };
        return {
          duty_date: d,
          morning: v.morning.join("\n") || "—",
          evening: v.evening.join("\n") || "—",
          night: v.night.join("\n") || "—",
          leave: (leaveByDate.get(d) ?? []).join("\n") || "—",
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
  if (!canView) return <Navigate to="/app" replace />;

  return (
    <div className="roster-print-page">
      <div className="pdf-header hidden print:block mb-6">
        <InstitutionPdfHeader />
      </div>

      <div className="space-y-6">
        <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between print:hidden">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Duty roster — PDF</h2>
            <p className="text-sm text-muted-foreground">
              {mode === "selected" ? "Selected dates export" : "No date selected → exporting full month"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => nav("/app/roster")}>Back</Button>
            <Button variant="outline" onClick={() => window.print()}>Print / Save as PDF</Button>
            <Button onClick={load} disabled={loading}>{loading ? "Loading…" : "Refresh"}</Button>
          </div>
        </header>

        <Card className="print:shadow-none">
          <CardHeader className="print:pb-2">
            <CardTitle className="text-lg">{format(parseISO(`${month}-01`), "MMMM yyyy")}</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto print:overflow-visible">
            <table className="w-full min-w-[980px] text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr className="border-b">
                  <th className="py-3 pr-4">Date</th>
                  <th className="py-3 pr-4">Morning (Staff — Responsibility)</th>
                  <th className="py-3 pr-4">Evening (Staff — Responsibility)</th>
                  <th className="py-3 pr-4">Night (Staff — Responsibility)</th>
                  <th className="py-3 pr-4">Leave (CL/OFF type)</th>
                </tr>
              </thead>
              <tbody>
                {(rows ?? []).map((r) => (
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
