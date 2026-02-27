import React, { useEffect, useMemo, useState } from "react";

import { useNavigate } from "react-router-dom";

import { useAuth } from "@/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import { AssignmentDialog, type AssignmentDialogState } from "./roster/AssignmentDialog";
import { RosterMonthTable } from "./roster/RosterMonthTable";
import type { Shift } from "./roster/types";
import { useRosterMonth } from "./roster/useRosterMonth";

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

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogState, setDialogState] = useState<AssignmentDialogState | null>(null);

  const openAdd = (params: { dutyDate: string; shift: Shift }) => {
    setDialogState({ mode: "add", dutyDate: params.dutyDate, shift: params.shift });
    setDialogOpen(true);
  };

  const openEdit = (params: { dutyDate: string; shift: Shift; assignment: any }) => {
    setDialogState({ mode: "edit", dutyDate: params.dutyDate, shift: params.shift, assignment: params.assignment });
    setDialogOpen(true);
  };

  const [selectedDates, setSelectedDates] = useState<Set<string>>(() => new Set());

  const toggleDate = (dutyDate: string) => {
    setSelectedDates((prev) => {
      const next = new Set(prev);
      if (next.has(dutyDate)) next.delete(dutyDate);
      else next.add(dutyDate);
      return next;
    });
  };

  const toggleAll = () => {
    setSelectedDates((prev) => {
      if (prev.size === monthDays.length) return new Set();
      return new Set(monthDays);
    });
  };

  const exportToPdf = () => {
    const dates = Array.from(selectedDates).sort().join(",");
    const qs = new URLSearchParams();
    qs.set("month", month);
    if (dates) qs.set("dates", dates);
    nav(`/app/roster/print?${qs.toString()}`);
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
          <Button variant="outline" onClick={exportToPdf}>
            Export Selected as PDF
          </Button>
          <Button onClick={reload} disabled={loading}>
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
            onToggleDate={toggleDate}
            onToggleAll={toggleAll}
            onAdd={openAdd}
            onEdit={openEdit}
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

