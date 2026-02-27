import React, { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { addDays, endOfMonth, format, parseISO, startOfMonth } from "date-fns";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { InstitutionPdfHeader } from "@/components/print/InstitutionPdfHeader";
import { useRosterMonth } from "./roster/useRosterMonth";
import type { Shift } from "./roster/types";

type LeaveRow = {
  staff_id: string;
  start_date: string;
  end_date: string;
  leave_type: "casual" | "off";
  status: string;
};

function daysInclusive(start: Date, end: Date) {
  const ms = 24 * 60 * 60 * 1000;
  return Math.floor((end.getTime() - start.getTime()) / ms) + 1;
}

function expandDates(startIso: string, endIso: string) {
  const start = parseISO(startIso);
  const end = parseISO(endIso);
  const out: string[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) out.push(format(d, "yyyy-MM-dd"));
  return out;
}

const shifts: Shift[] = ["morning", "evening", "night"];

export default function RosterPrint() {
  const { loading: authLoading, session, userId, activeInstitutionId, institutionRoles } = useAuth();
  const canView = institutionRoles.includes("lab_incharge") || institutionRoles.includes("staff");

  const [params] = useSearchParams();
  const nav = useNavigate();

  const month =
    params.get("month") ??
    (() => {
      const d = new Date();
      return format(d, "yyyy-MM");
    })();

  const selectedDates = useMemo(() => {
    const raw = (params.get("dates") ?? "").trim();
    if (!raw) return [] as string[];
    return raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }, [params]);

  const {
    loading,
    days,
    monthDays,
    reload,
    byDayShift,
    staffName,
  } = useRosterMonth({ activeInstitutionId, month });

  useEffect(() => {
    reload();
  }, [reload, activeInstitutionId, month]);

  const daysByDate = useMemo(() => new Map(days.map((d) => [d.duty_date, d])), [days]);

  // Day-off / leave summary (CL/OFF). EL not present in schema; kept as blank if requested.
  const [leaveSummaryByDate, setLeaveSummaryByDate] = useState<Map<string, { cl: number; off: number }>>(new Map());

  const range = useMemo(() => {
    const start = startOfMonth(parseISO(`${month}-01`));
    const end = endOfMonth(start);
    return { start, end };
  }, [month]);

  useEffect(() => {
    if (!activeInstitutionId) return;

    let cancelled = false;
    (async () => {
      const leaveRes = await supabase
        .from("leave_requests")
        .select("staff_id,start_date,end_date,leave_type,status")
        .eq("institution_id", activeInstitutionId)
        .eq("status", "approved")
        .gte("start_date", format(range.start, "yyyy-MM-dd"))
        .lte("end_date", format(range.end, "yyyy-MM-dd"));

      if (cancelled) return;

      const rows = (leaveRes.data ?? []) as LeaveRow[];
      const map = new Map<string, { cl: number; off: number }>();

      for (const r of rows) {
        const dates = expandDates(r.start_date, r.end_date);
        for (const d of dates) {
          const cur = map.get(d) ?? { cl: 0, off: 0 };
          if (r.leave_type === "casual") cur.cl += 1;
          if (r.leave_type === "off") cur.off += 1;
          map.set(d, cur);
        }
      }

      setLeaveSummaryByDate(map);
    })();

    return () => {
      cancelled = true;
    };
  }, [activeInstitutionId, range.end, range.start]);

  const filteredDays = useMemo(() => {
    if (!selectedDates.length) return monthDays;
    const set = new Set(selectedDates);
    return monthDays.filter((d) => set.has(d));
  }, [monthDays, selectedDates]);

  const renderShift = (dutyDate: string, shift: Shift) => {
    const day = daysByDate.get(dutyDate);
    const list = day ? byDayShift.get(`${day.id}:${shift}`) ?? [] : [];
    if (!list.length) return "—";

    return list
      .map((a) => {
        const name = staffName.get(a.staff_id) ?? "Unknown";
        return a.is_extra ? `${name} (extra)` : name;
      })
      .join(", ");
  };

  const renderDayOffLeave = (dutyDate: string) => {
    const day = daysByDate.get(dutyDate);
    const parts: string[] = [];

    if (day?.is_friday) parts.push("Day Off");
    if (day?.is_govt_holiday) parts.push("Govt Holiday");

    const sum = leaveSummaryByDate.get(dutyDate);
    if (sum?.cl) parts.push(`CL: ${sum.cl}`);
    if (sum?.off) parts.push(`OFF: ${sum.off}`);

    // EL not modeled in current backend.

    return parts.length ? parts.join(" • ") : "—";
  };

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
              {selectedDates.length ? `Selected dates: ${selectedDates.length}` : "No date selected → exporting full month"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => nav("/app/roster")}
              >Back</Button>
            <Button variant="outline" onClick={() => window.print()}>
              Print / Save as PDF
            </Button>
            <Button onClick={reload} disabled={loading}>
              {loading ? "Loading…" : "Refresh"}
            </Button>
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
                  {shifts.map((s) => (
                    <th key={s} className="py-3 pr-4 capitalize">
                      {s}
                    </th>
                  ))}
                  <th className="py-3 pr-4">Day Off / CL / EL</th>
                </tr>
              </thead>
              <tbody>
                {filteredDays.map((dutyDate) => (
                  <tr key={dutyDate} className="border-b last:border-b-0">
                    <td className="py-3 pr-4 tabular-nums font-medium">{dutyDate}</td>
                    {shifts.map((s) => (
                      <td key={s} className="py-3 pr-4 align-top">
                        {renderShift(dutyDate, s)}
                      </td>
                    ))}
                    <td className="py-3 pr-4 align-top">{renderDayOffLeave(dutyDate)}</td>
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
