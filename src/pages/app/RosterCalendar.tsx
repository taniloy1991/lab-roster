import React, { useEffect, useMemo, useState } from "react";

import { useNavigate } from "react-router-dom";
import { endOfMonth, format, parseISO, startOfMonth } from "date-fns";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import { AssignmentDialog, type AssignmentDialogState } from "./roster/AssignmentDialog";
import { RosterMonthTable } from "./roster/RosterMonthTable";
import type { Shift } from "./roster/types";
import { useRosterMonth } from "./roster/useRosterMonth";

type LeaveGridRow = {
  duty_date: string | null;
  leave_staff: string | null;
};

export default function RosterCalendar() {
  const nav = useNavigate();
  const { activeInstitutionId, institutionRoles } = useAuth();
  const canEdit = institutionRoles.includes("lab_incharge");

  const [month, setMonth] = useState(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    return `${yyyy}-${mm}`;
  });

  const range = useMemo(() => {
    const start = startOfMonth(parseISO(`${month}-01`));
    const end = endOfMonth(start);
    return { start, end };
  }, [month]);

  const {
    loading,
    staff,
    days,
    monthDays,
    reload,
    addAssignment,
    removeAssignment,
    updateDutyNote,
    byDayShift,
    staffName,
  } = useRosterMonth({ activeInstitutionId, month });

  useEffect(() => {
    reload();
  }, [reload, activeInstitutionId, month]);

  const daysByDate = useMemo(() => new Map(days.map((d) => [d.duty_date, d])), [days]);

  // Persisted selection (backend table selected_roster_dates)
  const [selectedDates, setSelectedDates] = useState<Set<string>>(() => new Set());

  const loadSelectedDates = async () => {
    if (!activeInstitutionId) return;
    const res = await supabase
      .from("selected_roster_dates")
      .select("duty_date")
      .gte("duty_date", format(range.start, "yyyy-MM-dd"))
      .lte("duty_date", format(range.end, "yyyy-MM-dd"));

    const next = new Set((res.data ?? []).map((r) => r.duty_date));
    setSelectedDates(next);
  };

  useEffect(() => {
    void loadSelectedDates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeInstitutionId, month]);

  const toggleDate = async (dutyDate: string) => {
    const wasSelected = selectedDates.has(dutyDate);

    // Optimistic UI update
    setSelectedDates((prev) => {
      const next = new Set(prev);
      if (next.has(dutyDate)) next.delete(dutyDate);
      else next.add(dutyDate);
      return next;
    });

    // Keep DB in sync (idempotent: delete then insert)
    if (wasSelected) {
      await supabase.from("selected_roster_dates").delete().eq("duty_date", dutyDate);
    } else {
      await supabase.from("selected_roster_dates").delete().eq("duty_date", dutyDate);
      await supabase.from("selected_roster_dates").insert({ duty_date: dutyDate });
    }
  };

  const selectAll = async () => {
    const dates = monthDays;
    setSelectedDates(new Set(dates));
    await supabase
      .from("selected_roster_dates")
      .delete()
      .gte("duty_date", format(range.start, "yyyy-MM-dd"))
      .lte("duty_date", format(range.end, "yyyy-MM-dd"));
    if (dates.length) {
      await supabase.from("selected_roster_dates").insert(dates.map((d) => ({ duty_date: d })));
    }
  };

  const clearSelection = async () => {
    setSelectedDates(new Set());
    await supabase
      .from("selected_roster_dates")
      .delete()
      .gte("duty_date", format(range.start, "yyyy-MM-dd"))
      .lte("duty_date", format(range.end, "yyyy-MM-dd"));
  };

  const downloadSelectedPdf = () => {
    const qs = new URLSearchParams();
    qs.set("month", month);
    nav(`/app/roster/print?${qs.toString()}`);
  };

  // Leave column data source: monthly_roster_grid.leave_staff
  const [leaveByDate, setLeaveByDate] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    if (!activeInstitutionId) return;
    let cancelled = false;

    (async () => {
      const res = await supabase
        .from("monthly_roster_grid")
        .select("duty_date,leave_staff")
        .gte("duty_date", format(range.start, "yyyy-MM-dd"))
        .lte("duty_date", format(range.end, "yyyy-MM-dd"));

      if (cancelled) return;

      const map = new Map<string, string>();
      for (const r of (res.data ?? []) as LeaveGridRow[]) {
        if (!r.duty_date) continue;
        const val = (r.leave_staff ?? "").trim();
        if (val) map.set(r.duty_date, val);
      }
      setLeaveByDate(map);
    })();

    return () => {
      cancelled = true;
    };
  }, [activeInstitutionId, range.end, range.start]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogState, setDialogState] = useState<AssignmentDialogState | null>(null);

  const openAdd = async (params: { dutyDate: string; shift: Shift }) => {
    // Determine who is on leave for this date (CL/OFF only); government holidays do not block.
    const leaveRes = await supabase
      .from("holidays")
      .select("staff_id,holiday_type")
      .eq("institution_id", activeInstitutionId)
      .eq("holiday_date", params.dutyDate)
      .in("holiday_type", ["casual", "general_off"]);

    const leaveStaffIds = new Set(
      ((leaveRes.data ?? []) as { staff_id: string | null }[]).map((r) => r.staff_id).filter(Boolean) as string[],
    );

    setDialogState({ mode: "add", dutyDate: params.dutyDate, shift: params.shift, leaveStaffIds });
    setDialogOpen(true);
  };

  const openEdit = async (params: { dutyDate: string; shift: Shift; assignment: any }) => {
    const leaveRes = await supabase
      .from("holidays")
      .select("staff_id,holiday_type")
      .eq("institution_id", activeInstitutionId)
      .eq("holiday_date", params.dutyDate)
      .in("holiday_type", ["casual", "general_off"]);

    const leaveStaffIds = new Set(
      ((leaveRes.data ?? []) as { staff_id: string | null }[]).map((r) => r.staff_id).filter(Boolean) as string[],
    );

    setDialogState({ mode: "edit", dutyDate: params.dutyDate, shift: params.shift, assignment: params.assignment, leaveStaffIds });
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Duty roster</h2>
          <p className="text-sm text-muted-foreground">Calendar-based, 3 shifts/day. Add notes per assignment.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-[190px]" />
          <Button variant="secondary" onClick={selectAll} disabled={loading}>
            Select All (Month)
          </Button>
          <Button variant="outline" onClick={clearSelection} disabled={loading}>
            Clear Selection
          </Button>
          <Button variant="outline" onClick={downloadSelectedPdf}>
            Download Selected as PDF
          </Button>
          <Button onClick={() => { reload(); void loadSelectedDates(); }} disabled={loading}>
            {loading ? "Loading…" : "Refresh"}
          </Button>
        </div>
      </header>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-1 md:flex-row md:items-baseline md:justify-between">
            <div>
              <CardTitle className="text-lg">Month view</CardTitle>
              <CardDescription>
                {canEdit ? "Click +Add or a staff chip to add/edit duty note." : "Read-only view for staff."}
              </CardDescription>
            </div>
            <div className="text-xs text-muted-foreground">
              {selectedDates.size ? `${selectedDates.size} selected` : "No date selected → exports full month"}
            </div>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <RosterMonthTable
            monthDays={monthDays}
            daysByDate={daysByDate}
            assignmentsByDayShift={byDayShift}
            staffName={staffName}
            canEdit={canEdit}
            selectedDates={selectedDates}
            onToggleDate={(d) => void toggleDate(d)}
            onToggleAll={() => void selectAll()}
            onAdd={openAdd}
            onEdit={openEdit}
            leaveByDate={leaveByDate}
          />
        </CardContent>
      </Card>

      <AssignmentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        state={dialogState}
        staff={staff}
        staffName={staffName}
        canEdit={canEdit}
        onAdd={async ({ dutyDate, shift, staffId, isExtra, dutyNote }) =>
          addAssignment({ dutyDate, shift, staffId, isExtra, dutyNote })
        }
        onUpdate={async ({ assignmentId, dutyNote }) => updateDutyNote({ assignmentId, dutyNote })}
        onRemove={async (assignmentId) => removeAssignment(assignmentId)}
      />
    </div>
  );
}

