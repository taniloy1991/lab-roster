import React, { useEffect, useMemo, useState } from "react";

import { useNavigate } from "react-router-dom";
import { endOfMonth, format, parseISO, startOfMonth } from "date-fns";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import { RosterMonthTable } from "./roster/RosterMonthTable";
import type { Shift, StaffRow } from "./roster/types";
import type { VisualLeaveType } from "./roster/useRosterVisualMonth";
import { useRosterVisualMonth } from "./roster/useRosterVisualMonth";

const shifts: Shift[] = ["morning", "evening"];

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
    leaveByDate,
    addShiftEntry,
    updateShiftEntry,
    addLeaveEntry,
    updateLeaveEntry,
    removeEntry,
  } = useRosterVisualMonth({
    activeInstitutionId,
    month,
  });

  const [staff, setStaff] = useState<StaffRow[]>([]);

  useEffect(() => {
    void reload();
  }, [reload, activeInstitutionId, month]);

  useEffect(() => {
    const loadStaff = async () => {
      if (!activeInstitutionId) return;
      const res = await supabase
        .from("staff")
        .select("id,name,designation,phone")
        .eq("institution_id", activeInstitutionId)
        .eq("is_active", true)
        .order("name");
      setStaff((res.data ?? []) as any);
    };
    void loadStaff();
  }, [activeInstitutionId]);

  const [selectedDates, setSelectedDates] = useState<Set<string>>(() => new Set());

  const loadSelectedDates = async () => {
    if (!activeInstitutionId) return;
    const res = await supabase
      .from("selected_roster_dates")
      .select("duty_date")
      .eq("institution_id", activeInstitutionId)
      .gte("duty_date", format(range.start, "yyyy-MM-dd"))
      .lte("duty_date", format(range.end, "yyyy-MM-dd"));

    setSelectedDates(new Set((res.data ?? []).map((r) => r.duty_date)));
  };

  useEffect(() => {
    void loadSelectedDates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeInstitutionId, month]);

  const toggleDate = async (dutyDate: string) => {
    if (!activeInstitutionId) return;

    const wasSelected = selectedDates.has(dutyDate);

    setSelectedDates((prev) => {
      const next = new Set(prev);
      if (next.has(dutyDate)) next.delete(dutyDate);
      else next.add(dutyDate);
      return next;
    });

    if (wasSelected) {
      await supabase.from("selected_roster_dates").delete().eq("institution_id", activeInstitutionId).eq("duty_date", dutyDate);
    } else {
      await supabase.from("selected_roster_dates").delete().eq("institution_id", activeInstitutionId).eq("duty_date", dutyDate);
      await supabase.from("selected_roster_dates").insert({ institution_id: activeInstitutionId, duty_date: dutyDate });
    }
  };

  const selectAll = async () => {
    if (!activeInstitutionId) return;

    const dates = monthDays;
    setSelectedDates(new Set(dates));
    await supabase
      .from("selected_roster_dates")
      .delete()
      .eq("institution_id", activeInstitutionId)
      .gte("duty_date", format(range.start, "yyyy-MM-dd"))
      .lte("duty_date", format(range.end, "yyyy-MM-dd"));

    if (dates.length) {
      await supabase.from("selected_roster_dates").insert(dates.map((d) => ({ institution_id: activeInstitutionId, duty_date: d })));
    }
  };

  const clearSelection = async () => {
    if (!activeInstitutionId) return;

    setSelectedDates(new Set());
    await supabase
      .from("selected_roster_dates")
      .delete()
      .eq("institution_id", activeInstitutionId)
      .gte("duty_date", format(range.start, "yyyy-MM-dd"))
      .lte("duty_date", format(range.end, "yyyy-MM-dd"));
  };

  const downloadSelectedPdf = () => {
    const qs = new URLSearchParams();
    qs.set("month", month);
    nav(`/print/roster?${qs.toString()}`);
  };

  if (!session) return null;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Duty roster</h2>
          <p className="text-sm text-muted-foreground">Planning tool with date-wise Morning, Evening and OFF/CL assignment.</p>
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
              <CardDescription>Pick one or more staff per shift and add date-wise OFF/CL staff assignments.</CardDescription>
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
            shifts={shifts}
            selectedDates={selectedDates}
            onToggleDate={(d) => void toggleDate(d)}
            onToggleAll={() => void selectAll()}
            byDateShift={byDateShift}
            leaveByDate={leaveByDate}
            onAddShiftEntry={(p) => void addShiftEntry(p)}
            onUpdateShiftEntry={(p) => void updateShiftEntry(p)}
            onAddLeaveEntry={(p: { dutyDate: string; staffId: string; leaveType: VisualLeaveType }) => void addLeaveEntry(p)}
            onUpdateLeaveEntry={(p: { id: string; staffId: string; leaveType: VisualLeaveType }) => void updateLeaveEntry(p)}
            onRemoveShiftEntry={(p) => void removeEntry(p)}
            onRemoveLeaveEntry={(p) => void removeEntry(p)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
