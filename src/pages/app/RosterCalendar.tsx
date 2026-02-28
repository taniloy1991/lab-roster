import React, { useEffect, useMemo, useState } from "react";

import { useNavigate } from "react-router-dom";
import { endOfMonth, format, parseISO, startOfMonth } from "date-fns";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { RosterMonthTable } from "./roster/RosterMonthTable";
import type { Shift, StaffRow } from "./roster/types";
import { useRosterVisualMonth, type VisualEntry, type VisualLeaveType } from "./roster/useRosterVisualMonth";

const shifts: Shift[] = ["morning", "evening", "night"];

const leaveOptions: Array<{ value: VisualLeaveType; label: string }> = [
  { value: "others", label: "Others" },
  { value: "earned_leave", label: "Earned Leave" },
  { value: "casual_leave", label: "Casual Leave" },
  { value: "week_off", label: "Week Off" },
  { value: "govt_holiday", label: "Govt. Holiday" },
  { value: "none", label: "None" },
];

export default function RosterCalendar() {
  const nav = useNavigate();
  const { activeInstitutionId, session } = useAuth();

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
    monthDays,
    reload,
    byDateShift,
    leaveStaffByDate,
    upsertStaffEntry,
    removeEntry,
    setLeaveForDate,
  } = useRosterVisualMonth({ activeInstitutionId, month });

  const [staff, setStaff] = useState<StaffRow[]>([]);
  const staffName = useMemo(() => new Map(staff.map((s) => [s.id, s.name])), [staff]);

  useEffect(() => {
    void reload();
  }, [reload, activeInstitutionId, month]);

  useEffect(() => {
    const loadStaff = async () => {
      if (!activeInstitutionId) return;
      const res = await supabase
        .from("staff")
        .select("id,name")
        .eq("institution_id", activeInstitutionId)
        .eq("is_active", true)
        .order("name");
      setStaff((res.data ?? []) as any);
    };
    void loadStaff();
  }, [activeInstitutionId]);

  // Persisted selection (backend table selected_roster_dates)
  const [selectedDates, setSelectedDates] = useState<Set<string>>(() => new Set());

  const loadSelectedDates = async () => {
    if (!activeInstitutionId) return;
    const res = await supabase
      .from("selected_roster_dates")
      .select("duty_date")
      .gte("duty_date", format(range.start, "yyyy-MM-dd"))
      .lte("duty_date", format(range.end, "yyyy-MM-dd"));

    setSelectedDates(new Set((res.data ?? []).map((r) => r.duty_date)));
  };

  useEffect(() => {
    void loadSelectedDates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeInstitutionId, month]);

  const toggleDate = async (dutyDate: string) => {
    const wasSelected = selectedDates.has(dutyDate);

    setSelectedDates((prev) => {
      const next = new Set(prev);
      if (next.has(dutyDate)) next.delete(dutyDate);
      else next.add(dutyDate);
      return next;
    });

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
    nav(`/print/roster?${qs.toString()}`);
  };

  // Dialog state for Shift assignment
  const [dlgOpen, setDlgOpen] = useState(false);
  const [dlgState, setDlgState] = useState<{
    dutyDate: string;
    shift: Shift;
    entry?: VisualEntry;
  } | null>(null);

  const [dlgStaffId, setDlgStaffId] = useState("");
  const [dlgNote, setDlgNote] = useState("");
  const [dlgSaving, setDlgSaving] = useState(false);

  // Dialog state for Leave assignment (single staff/date)
  const [leaveDlgOpen, setLeaveDlgOpen] = useState(false);
  const [leaveDlgDutyDate, setLeaveDlgDutyDate] = useState<string>("");
  const [leaveDlgStaffId, setLeaveDlgStaffId] = useState<string>("");
  const [leaveDlgType, setLeaveDlgType] = useState<VisualLeaveType>("none");
  const [leaveDlgSaving, setLeaveDlgSaving] = useState(false);

  const openAssign = (p: { dutyDate: string; shift: Shift; entry?: VisualEntry }) => {
    setDlgState({ dutyDate: p.dutyDate, shift: p.shift, entry: p.entry });
    setDlgStaffId(p.entry?.staff_id ?? "");
    setDlgNote(p.entry?.responsibility_note ?? "");
    setDlgOpen(true);
  };

  const openLeaveAssign = (p: { dutyDate: string; entry?: { entryId: string; staffId: string | null; leaveType: VisualLeaveType } }) => {
    setLeaveDlgDutyDate(p.dutyDate);
    setLeaveDlgStaffId(p.entry?.staffId ?? "");
    setLeaveDlgType(p.entry?.leaveType ?? "none");
    setLeaveDlgOpen(true);
  };

  const saveAssign = async () => {
    if (!dlgState || !activeInstitutionId) return;
    if (!dlgStaffId) return;

    setDlgSaving(true);
    try {
      await upsertStaffEntry({
        dutyDate: dlgState.dutyDate,
        shift: dlgState.shift,
        staffId: dlgStaffId,
        responsibilityNote: dlgNote,
        entryId: dlgState.entry?.id,
      });
      setDlgOpen(false);
    } finally {
      setDlgSaving(false);
    }
  };

  const saveLeaveAssign = async () => {
    if (!activeInstitutionId) return;
    if (!leaveDlgDutyDate) return;
    if (!leaveDlgStaffId) return;

    setLeaveDlgSaving(true);
    try {
      await setLeaveForDate({ dutyDate: leaveDlgDutyDate, staffId: leaveDlgStaffId, leaveType: leaveDlgType });
      setLeaveDlgOpen(false);
    } finally {
      setLeaveDlgSaving(false);
    }
  };

  if (!session) return null;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Duty roster</h2>
          <p className="text-sm text-muted-foreground">Visual planning only (no CL/OFF accounting impact).</p>
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
          <Button
            onClick={() => {
              void reload();
              void loadSelectedDates();
            }}
            disabled={loading}
          >
            {loading ? "Loading…" : "Refresh"}
          </Button>
        </div>
      </header>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-1 md:flex-row md:items-baseline md:justify-between">
            <div>
              <CardTitle className="text-lg">Month view</CardTitle>
              <CardDescription>Use Select Staff + responsibility per shift; set one Leave type per date.</CardDescription>
            </div>
            <div className="text-xs text-muted-foreground">
              {selectedDates.size ? `${selectedDates.size} selected` : "No date selected → exports full month"}
            </div>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <RosterMonthTable
            monthDays={monthDays}
            staff={staff}
            staffName={staffName}
            shifts={shifts}
            selectedDates={selectedDates}
            onToggleDate={(d) => void toggleDate(d)}
            onToggleAll={() => void selectAll()}
            byDateShift={byDateShift}
            leaveStaffByDate={leaveStaffByDate}
            leaveOptions={leaveOptions}
            onSetLeave={(p) => void setLeaveForDate(p)}
            onOpenLeaveAssign={openLeaveAssign}
            onOpenAssign={openAssign}
            onRemoveEntry={(id) => void removeEntry(id)}
          />
        </CardContent>
      </Card>

      <Dialog open={dlgOpen} onOpenChange={setDlgOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dlgState?.entry ? "Edit staff" : "Select staff"}</DialogTitle>
            <DialogDescription>{dlgState ? `${dlgState.dutyDate} • ${dlgState.shift}` : ""}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Staff</Label>
              <Select value={dlgStaffId} onValueChange={setDlgStaffId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select staff…" />
                </SelectTrigger>
                <SelectContent>
                  {staff.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Responsibility</Label>
              <Textarea
                value={dlgNote}
                onChange={(e) => setDlgNote(e.target.value)}
                placeholder="Write responsibility / note…"
              />
            </div>
          </div>

          <DialogFooter>
            <Button onClick={saveAssign} disabled={!dlgState || !dlgStaffId || dlgSaving}>
              {dlgSaving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={leaveDlgOpen} onOpenChange={setLeaveDlgOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Leave assignment</DialogTitle>
            <DialogDescription>{leaveDlgDutyDate ? `${leaveDlgDutyDate}` : ""}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Staff</Label>
              <Select value={leaveDlgStaffId} onValueChange={setLeaveDlgStaffId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select staff…" />
                </SelectTrigger>
                <SelectContent>
                  {staff.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Leave type (visual)</Label>
              <Select value={leaveDlgType} onValueChange={(v) => setLeaveDlgType(v as VisualLeaveType)} disabled={!leaveDlgStaffId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select leave…" />
                </SelectTrigger>
                <SelectContent>
                  {leaveOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={saveLeaveAssign} disabled={!leaveDlgDutyDate || !leaveDlgStaffId || leaveDlgSaving}>
              {leaveDlgSaving ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

