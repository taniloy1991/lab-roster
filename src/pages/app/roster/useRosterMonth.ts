import { useCallback, useMemo, useState } from "react";
import { addDays, endOfMonth, format, parseISO, startOfMonth } from "date-fns";

import { supabase } from "@/integrations/supabase/client";
import type { Assignment, RosterDay, Shift, StaffRow } from "./types";

export function useRosterMonth(params: { activeInstitutionId: string | null; month: string }) {
  const { activeInstitutionId, month } = params;

  const [loading, setLoading] = useState(false);
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [days, setDays] = useState<RosterDay[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);

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

    const staffRes = await supabase
      .from("staff")
      .select("id,name")
      .eq("institution_id", activeInstitutionId)
      .eq("is_active", true)
      .order("name");
    setStaff((staffRes.data ?? []) as StaffRow[]);

    const dayRes = await supabase
      .from("roster_days")
      .select("id,duty_date")
      .eq("institution_id", activeInstitutionId)
      .gte("duty_date", format(range.start, "yyyy-MM-dd"))
      .lte("duty_date", format(range.end, "yyyy-MM-dd"))
      .order("duty_date", { ascending: true });

    const rosterDays = (dayRes.data ?? []) as RosterDay[];
    setDays(rosterDays);

    const ids = rosterDays.map((d) => d.id);
    if (ids.length) {
      const aRes = await supabase
        .from("roster_shift_assignments")
        .select("id,roster_day_id,shift,staff_id,is_extra,duty_note")
        .in("roster_day_id", ids);
      setAssignments((aRes.data ?? []) as Assignment[]);
    } else {
      setAssignments([]);
    }

    setLoading(false);
  }, [activeInstitutionId, range.end, range.start]);

  const ensureDay = useCallback(
    async (dutyDate: string) => {
      if (!activeInstitutionId) return null;
      const existing = days.find((d) => d.duty_date === dutyDate);
      if (existing) return existing;

      const ins = await supabase
        .from("roster_days")
        .insert({ institution_id: activeInstitutionId, duty_date: dutyDate })
        .select("id,duty_date")
        .single();

      if (ins.data) {
        setDays((prev) => [...prev, ins.data as RosterDay].sort((a, b) => a.duty_date.localeCompare(b.duty_date)));
      }

      return (ins.data ?? null) as RosterDay | null;
    },
    [activeInstitutionId, days],
  );

  const addAssignment = useCallback(
    async (params: { dutyDate: string; shift: Shift; staffId: string; isExtra: boolean; dutyNote: string }) => {
      const day = await ensureDay(params.dutyDate);
      if (!day) return;

      await supabase.from("roster_shift_assignments").insert({
        roster_day_id: day.id,
        shift: params.shift,
        staff_id: params.staffId,
        is_extra: params.isExtra,
        duty_note: params.dutyNote.trim() ? params.dutyNote.trim() : null,
      });

      await reload();
    },
    [ensureDay, reload],
  );

  const removeAssignment = useCallback(
    async (assignmentId: string) => {
      await supabase.from("roster_shift_assignments").delete().eq("id", assignmentId);
      await reload();
    },
    [reload],
  );

  const updateDutyNote = useCallback(
    async (params: { assignmentId: string; dutyNote: string }) => {
      await supabase
        .from("roster_shift_assignments")
        .update({ duty_note: params.dutyNote.trim() ? params.dutyNote.trim() : null })
        .eq("id", params.assignmentId);
      await reload();
    },
    [reload],
  );

  const byDayShift = useMemo(() => {
    const map = new Map<string, Assignment[]>();
    for (const a of assignments) {
      const k = `${a.roster_day_id}:${a.shift}`;
      map.set(k, [...(map.get(k) ?? []), a]);
    }
    return map;
  }, [assignments]);

  const staffName = useMemo(() => new Map(staff.map((s) => [s.id, s.name])), [staff]);

  return {
    loading,
    staff,
    days,
    assignments,
    range,
    monthDays,
    reload,
    addAssignment,
    removeAssignment,
    updateDutyNote,
    byDayShift,
    staffName,
  };
}
