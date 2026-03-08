import { useCallback, useMemo, useState } from "react";
import { addDays, endOfMonth, format, parseISO, startOfMonth } from "date-fns";

import { supabase } from "@/integrations/supabase/client";

export type VisualShift = "morning" | "evening" | "night";
export type VisualLeaveType = "casual_leave" | "week_off";

export type VisualEntry = {
  id: string;
  institution_id: string;
  duty_date: string; // yyyy-MM-dd
  shift: VisualShift | null;
  staff_id: string | null;
  responsibility_note: string | null;
  leave_type: VisualLeaveType | null;
  created_by: string | null;
  created_at: string;
};

export type ShiftVisualEntry = VisualEntry & {
  shift: VisualShift;
  staff_id: string;
};

export type LeaveVisualEntry = VisualEntry & {
  shift: null;
  staff_id: string;
  leave_type: VisualLeaveType;
};

export function useRosterVisualMonth(params: { activeInstitutionId: string | null; month: string }) {
  const { activeInstitutionId, month } = params;

  const [loading, setLoading] = useState(false);
  const [entries, setEntries] = useState<VisualEntry[]>([]);

  const range = useMemo(() => {
    const start = startOfMonth(parseISO(`${month}-01`));
    const end = endOfMonth(start);
    return { start, end };
  }, [month]);

  const monthDays = useMemo(() => {
    const arr: string[] = [];
    for (let d = range.start; d <= range.end; d = addDays(d, 1)) arr.push(format(d, "yyyy-MM-dd"));
    return arr;
  }, [range.start, range.end]);

  const reload = useCallback(async () => {
    if (!activeInstitutionId) return;
    setLoading(true);

    const res = await supabase
      .from("roster_visual_entries" as any)
      .select("id,institution_id,duty_date,shift,staff_id,responsibility_note,leave_type,created_by,created_at")
      .eq("institution_id", activeInstitutionId)
      .gte("duty_date", format(range.start, "yyyy-MM-dd"))
      .lte("duty_date", format(range.end, "yyyy-MM-dd"))
      .order("duty_date", { ascending: true })
      .order("created_at", { ascending: true });

    const clean = ((res.data ?? []) as any[])
      .map((r) => ({
        id: String(r.id),
        institution_id: String(r.institution_id),
        duty_date: String(r.duty_date),
        shift: r.shift == null ? null : (String(r.shift) as VisualShift),
        staff_id: r.staff_id == null ? null : String(r.staff_id),
        responsibility_note: r.responsibility_note == null ? null : String(r.responsibility_note),
        leave_type: r.leave_type == null ? null : (String(r.leave_type) as VisualLeaveType),
        created_by: r.created_by == null ? null : String(r.created_by),
        created_at: String(r.created_at),
      })) as VisualEntry[];

    setEntries(clean);
    setLoading(false);
  }, [activeInstitutionId, range.end, range.start]);

  const addShiftEntry = useCallback(
    async (p: { dutyDate: string; shift: VisualShift; staffId: string; dutyNote: string }) => {
      if (!activeInstitutionId) return;

      await supabase.from("roster_visual_entries" as any).insert({
        institution_id: activeInstitutionId,
        duty_date: p.dutyDate,
        shift: p.shift,
        staff_id: p.staffId,
        responsibility_note: p.dutyNote.trim() ? p.dutyNote.trim() : null,
      });

      await reload();
    },
    [activeInstitutionId, reload],
  );

  const updateShiftEntry = useCallback(
    async (p: { id: string; staffId: string; dutyNote: string }) => {
      if (!activeInstitutionId) return;

      await supabase
        .from("roster_visual_entries" as any)
        .update({
          staff_id: p.staffId,
          responsibility_note: p.dutyNote.trim() ? p.dutyNote.trim() : null,
        })
        .eq("id", p.id)
        .eq("institution_id", activeInstitutionId);

      await reload();
    },
    [activeInstitutionId, reload],
  );

  const addLeaveEntry = useCallback(
    async (p: { dutyDate: string; staffId: string; leaveType: VisualLeaveType }) => {
      if (!activeInstitutionId) return;

      await supabase.from("roster_visual_entries" as any).insert({
        institution_id: activeInstitutionId,
        duty_date: p.dutyDate,
        shift: null,
        staff_id: p.staffId,
        leave_type: p.leaveType,
      });

      await reload();
    },
    [activeInstitutionId, reload],
  );

  const updateLeaveEntry = useCallback(
    async (p: { id: string; staffId: string; leaveType: VisualLeaveType }) => {
      if (!activeInstitutionId) return;

      await supabase
        .from("roster_visual_entries" as any)
        .update({
          staff_id: p.staffId,
          leave_type: p.leaveType,
          responsibility_note: null,
          shift: null,
        })
        .eq("id", p.id)
        .eq("institution_id", activeInstitutionId);

      await reload();
    },
    [activeInstitutionId, reload],
  );

  const removeEntry = useCallback(
    async (p: { id: string }) => {
      if (!activeInstitutionId) return;
      await supabase.from("roster_visual_entries" as any).delete().eq("id", p.id).eq("institution_id", activeInstitutionId);
      await reload();
    },
    [activeInstitutionId, reload],
  );

  const byDateShift = useMemo(() => {
    const map = new Map<string, ShiftVisualEntry[]>();
    for (const e of entries) {
      if (!e.shift || !e.staff_id) continue;
      const k = `${e.duty_date}:${e.shift}`;
      const arr = map.get(k) ?? [];
      arr.push(e as ShiftVisualEntry);
      map.set(k, arr);
    }
    return map;
  }, [entries]);

  const leaveByDate = useMemo(() => {
    const map = new Map<string, LeaveVisualEntry[]>();
    for (const e of entries) {
      if (e.shift !== null || !e.staff_id || !e.leave_type) continue;
      const arr = map.get(e.duty_date) ?? [];
      arr.push(e as LeaveVisualEntry);
      map.set(e.duty_date, arr);
    }
    return map;
  }, [entries]);

  return {
    loading,
    entries,
    range,
    monthDays,
    reload,
    addShiftEntry,
    updateShiftEntry,
    addLeaveEntry,
    updateLeaveEntry,
    removeEntry,
    byDateShift,
    leaveByDate,
  };
}


