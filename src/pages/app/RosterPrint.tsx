import React, { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { endOfMonth, format, parseISO, startOfMonth } from "date-fns";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { InstitutionPdfHeader } from "@/components/print/InstitutionPdfHeader";

type SelectedPdfRow = {
  duty_date: string | null;
  morning_staff: string | null;
  evening_staff: string | null;
  night_staff: string | null;
  leave_staff: string | null;
};

type MonthGridRow = {
  duty_date: string | null;
  morning_staff: string | null;
  evening_staff: string | null;
  night_staff: string | null;
  leave_staff: string | null;
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
  const [rows, setRows] = useState<SelectedPdfRow[]>([]);
  const [mode, setMode] = useState<"selected" | "month">("month");

  const load = async () => {
    setLoading(true);

    // If there are selected dates in selected_roster_dates for this month → use roster_selected_pdf view.
    const selRes = await supabase
      .from("selected_roster_dates")
      .select("duty_date")
      .gte("duty_date", format(range.start, "yyyy-MM-dd"))
      .lte("duty_date", format(range.end, "yyyy-MM-dd"))
      .limit(1);

    const hasSelection = (selRes.data ?? []).length > 0;

    if (hasSelection) {
      setMode("selected");
      const res = await supabase.from("roster_selected_pdf").select("duty_date,morning_staff,evening_staff,night_staff,leave_staff");
      setRows((res.data ?? []) as SelectedPdfRow[]);
    } else {
      setMode("month");
      const res = await supabase
        .from("monthly_roster_grid")
        .select("duty_date,morning_staff,evening_staff,night_staff,leave_staff")
        .gte("duty_date", format(range.start, "yyyy-MM-dd"))
        .lte("duty_date", format(range.end, "yyyy-MM-dd"))
        .order("duty_date", { ascending: true });
      setRows((res.data ?? []) as MonthGridRow[]);
    }

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
    <>
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
                  <th className="py-3 pr-4">Morning</th>
                  <th className="py-3 pr-4">Evening</th>
                  <th className="py-3 pr-4">Night</th>
                  <th className="py-3 pr-4">Leave (CL/OFF)</th>
                </tr>
              </thead>
              <tbody>
                {(rows ?? []).map((r) => (
                  <tr key={String(r.duty_date)} className="border-b last:border-b-0">
                    <td className="py-3 pr-4 tabular-nums font-medium">{r.duty_date ?? "—"}</td>
                    <td className="py-3 pr-4 align-top">{r.morning_staff?.trim() || "—"}</td>
                    <td className="py-3 pr-4 align-top">{r.evening_staff?.trim() || "—"}</td>
                    <td className="py-3 pr-4 align-top">{r.night_staff?.trim() || "—"}</td>
                    <td className="py-3 pr-4 align-top">{r.leave_staff?.trim() || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
