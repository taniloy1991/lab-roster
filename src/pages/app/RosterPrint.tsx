import React, { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { endOfMonth, format, parseISO, startOfMonth } from "date-fns";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { PrintLayout } from "@/components/print/PrintLayout";
import { InstitutionPdfHeader } from "@/components/print/InstitutionPdfHeader";

type PdfRow = {
  duty_date: string;
  morning_staff: string;
  morning_note: string;
  evening_staff: string;
  evening_note: string;
  night_staff: string;
  night_note: string;
  leave_status: string;
};

export default function RosterPrint() {
  const { loading: authLoading, session, activeInstitutionId } = useAuth();

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
      .select("duty_date,shift,staff_id,responsibility_note,institution_id")
      .eq("institution_id", activeInstitutionId ?? "00000000-0000-0000-0000-000000000000")
      .gte("duty_date", start)
      .lte("duty_date", end)
      .not("shift", "is", null)
      .order("duty_date", { ascending: true })
      .order("created_at", { ascending: true });

    const staffIds = Array.from(
      new Set<string>(((rosterRes.data ?? []) as any[]).map((r) => String(r.staff_id)).filter((x) => x && x !== "null")),
    );

    const staffNameById = new Map<string, string>();
    if (staffIds.length) {
      const staffRes = await supabase.from("staff").select("id,name").in("id", staffIds);
      for (const s of (staffRes.data ?? []) as any[]) {
        staffNameById.set(String(s.id), String(s.name ?? "").trim());
      }
    }

    const byDateShift = new Map<string, { staff: string; note: string }[]>();
    for (const r of (rosterRes.data ?? []) as any[]) {
      const d = String(r.duty_date);
      if (hasSelection && !selectedSet.has(d)) continue;

      const shift = String(r.shift) as "morning" | "evening" | "night";
      const sid = String(r.staff_id ?? "");
      const name = staffNameById.get(sid) ?? "—";
      const note = String(r.responsibility_note ?? "").trim();

      const k = `${d}:${shift}`;
      const arr = byDateShift.get(k) ?? [];
      arr.push({ staff: name, note });
      byDateShift.set(k, arr);
    }

    const daysRes = await supabase
      .from("roster_days")
      .select("duty_date,leave_status")
      .gte("duty_date", start)
      .lte("duty_date", end)
      .eq("institution_id", activeInstitutionId ?? "00000000-0000-0000-0000-000000000000")
      .order("duty_date", { ascending: true });

    const leaveStatusByDate = new Map<string, string>();
    for (const r of (daysRes.data ?? []) as any[]) {
      const d = String(r.duty_date);
      if (hasSelection && !selectedSet.has(d)) continue;
      const v = String(r.leave_status ?? "").trim();
      if (v) leaveStatusByDate.set(d, v);
    }
    const dates = Array.from(
      new Set<string>([
        ...leaveStatusByDate.keys(),
        ...Array.from(byDateShift.keys()).map((k) => k.split(":")[0]),
      ]),
    ).sort();

    const fmtStaff = (arr?: { staff: string; note: string }[]) => {
      if (!arr?.length) return "";
      return arr.map((x) => x.staff).join(", ");
    };

    const fmtNotes = (arr?: { staff: string; note: string }[]) => {
      if (!arr?.length) return "";
      const notesOnly = arr
        .map((x) => {
          const t = x.note.trim();
          return t ? `${x.staff}: ${t}` : "";
        })
        .filter(Boolean);
      return notesOnly.join("\n");
    };

    setRows(
      dates.map((d) => {
        const m = byDateShift.get(`${d}:morning`);
        const e = byDateShift.get(`${d}:evening`);
        const n = byDateShift.get(`${d}:night`);

        return {
          duty_date: d,
          morning_staff: fmtStaff(m),
          morning_note: fmtNotes(m),
          evening_staff: fmtStaff(e),
          evening_note: fmtNotes(e),
          night_staff: fmtStaff(n),
          night_note: fmtNotes(n),
          leave_status: leaveStatusByDate.get(d) ?? "",
        };
      }),
    );

    setLoading(false);
  };

  const isBlank = (v: string | null | undefined) => !String(v ?? "").trim();
  const showNight = useMemo(() => rows.some((r) => !isBlank(r.night_staff) || !isBlank(r.night_note)), [rows]);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, activeInstitutionId]);

  if (authLoading) return null;
  if (!session) return <Navigate to="/login" replace />;

  return (
    <PrintLayout pageClassName="roster-print-page" className="bg-card">
      <header className="text-center">
        <InstitutionPdfHeader />

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
        {/* Screen/table view (kept wide + scrollable) */}
        <div className="print:hidden overflow-x-auto">
          <table className="w-full min-w-[1320px] text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr className="border-b">
                <th className="py-3 pr-4">Date</th>
                <th className="py-3 pr-4">Morning Staff</th>
                <th className="py-3 pr-4">Morning Duty Note</th>
                <th className="py-3 pr-4">Evening Staff</th>
                <th className="py-3 pr-4">Evening Duty Note</th>
                <th className="py-3 pr-4">Night Staff</th>
                <th className="py-3 pr-4">Night Duty Note</th>
                <th className="py-3 pr-4">Leave / Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={String(r.duty_date)} className="border-b last:border-b-0">
                  <td className="py-3 pr-4 tabular-nums font-medium">{r.duty_date}</td>
                  <td className="py-3 pr-4 align-top">{r.morning_staff || "—"}</td>
                  <td className="py-3 pr-4 align-top whitespace-pre-wrap">{r.morning_note || "—"}</td>
                  <td className="py-3 pr-4 align-top">{r.evening_staff || "—"}</td>
                  <td className="py-3 pr-4 align-top whitespace-pre-wrap">{r.evening_note || "—"}</td>
                  <td className="py-3 pr-4 align-top">{r.night_staff || "—"}</td>
                  <td className="py-3 pr-4 align-top whitespace-pre-wrap">{r.night_note || "—"}</td>
                  <td className="py-3 pr-4 align-top whitespace-pre-wrap">{r.leave_status || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Print/PDF view (portrait friendly, no horizontal scroll) */}
        <div className="hidden print:block">
          <div className="space-y-4">
            {rows.map((r) => {
              const hasMorning = !isBlank(r.morning_staff);
              const hasEvening = !isBlank(r.evening_staff);
              const hasNight = showNight && !isBlank(r.night_staff);

              return (
                <section key={String(r.duty_date)} className="break-inside-avoid rounded-md border border-border p-3">
                  <header className="flex items-start justify-between gap-3">
                    <div className="font-semibold tabular-nums">{r.duty_date}</div>
                    {r.leave_status ? (
                      <div className="text-right text-xs text-muted-foreground whitespace-pre-wrap">{r.leave_status}</div>
                    ) : null}
                  </header>

                  <div className="mt-3 grid grid-cols-1 gap-3">
                    {hasMorning ? (
                      <div className="grid grid-cols-[90px_1fr] gap-x-3 gap-y-1">
                        <div className="text-xs font-semibold text-muted-foreground">Morning</div>
                        <div className="text-sm">{r.morning_staff}</div>
                        {r.morning_note ? (
                          <>
                            <div className="text-xs text-muted-foreground">Note</div>
                            <div className="text-xs whitespace-pre-wrap">{r.morning_note}</div>
                          </>
                        ) : null}
                      </div>
                    ) : null}

                    {hasEvening ? (
                      <div className="grid grid-cols-[90px_1fr] gap-x-3 gap-y-1">
                        <div className="text-xs font-semibold text-muted-foreground">Evening</div>
                        <div className="text-sm">{r.evening_staff}</div>
                        {r.evening_note ? (
                          <>
                            <div className="text-xs text-muted-foreground">Note</div>
                            <div className="text-xs whitespace-pre-wrap">{r.evening_note}</div>
                          </>
                        ) : null}
                      </div>
                    ) : null}

                    {hasNight ? (
                      <div className="grid grid-cols-[90px_1fr] gap-x-3 gap-y-1">
                        <div className="text-xs font-semibold text-muted-foreground">Night</div>
                        <div className="text-sm">{r.night_staff}</div>
                        {r.night_note ? (
                          <>
                            <div className="text-xs text-muted-foreground">Note</div>
                            <div className="text-xs whitespace-pre-wrap">{r.night_note}</div>
                          </>
                        ) : null}
                      </div>
                    ) : null}

                    {!hasMorning && !hasEvening && !hasNight ? (
                      <div className="text-xs text-muted-foreground">No roster entries.</div>
                    ) : null}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      </section>

      <section className="mt-10 grid grid-cols-1 gap-8 text-sm sm:grid-cols-2">
        <div>
          <div className="text-muted-foreground">
            Prepared By: <span className="text-foreground">Asif Hossain</span>
          </div>
        </div>
        <div>
          <div className="text-muted-foreground">Approved By:</div>
          <div className="mt-3 border-b border-border" />
        </div>
      </section>
    </PrintLayout>
  );
}
