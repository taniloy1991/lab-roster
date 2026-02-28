import { useCallback, useMemo, useState } from "react";
import { addDays, endOfMonth, format, parseISO, startOfMonth } from "date-fns";

import { supabase } from "@/integrations/supabase/client";

export type VisualShift = "morning" | "evening" | "night";
export type VisualLeaveType = "others" | "earned_leave" | "casual_leave" | "week_off" | "govt_holiday" | "none";

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

    setEntries((res.data ?? []) as any);
    setLoading(false);
  }, [activeInstitutionId, range.end, range.start]);

  const upsertStaffEntry = useCallback(
    async (p: { dutyDate: string; shift: VisualShift; staffId: string; responsibilityNote: string; entryId?: string }) => {
      if (!activeInstitutionId) return;

      const payload: any = {
        institution_id: activeInstitutionId,
        duty_date: p.dutyDate,
        shift: p.shift,
        staff_id: p.staffId,
        responsibility_note: p.responsibilityNote.trim() ? p.responsibilityNote.trim() : null,
      };

      if (p.entryId) {
        await supabase.from("roster_visual_entries" as any).update(payload).eq("id", p.entryId);
      } else {
        // Avoid duplicate-key errors: upsert against unique index (institution_id,duty_date,shift,staff_id)
        await supabase.from("roster_visual_entries" as any).upsert(payload, {
          onConflict: "institution_id,duty_date,shift,staff_id",
        });
      }

      await reload();
    },
    [activeInstitutionId, reload],
  );

  const removeEntry = useCallback(
    async (entryId: string) => {
      await supabase.from("roster_visual_entries" as any).delete().eq("id", entryId);
      await reload();
    },
    [reload],
  );

  const setLeaveForDate = useCallback(
    async (p: { dutyDate: string; leaveType: VisualLeaveType }) => {
      if (!activeInstitutionId) return;

      // Enforce single leave row/date: delete then insert (idempotent)
      await supabase
        .from("roster_visual_entries" as any)
        .delete()
        .eq("institution_id", activeInstitutionId)
        .eq("duty_date", p.dutyDate)
        .is("shift", null)
        .is("staff_id", null);

      if (p.leaveType !== "none") {
        await supabase.from("roster_visual_entries" as any).insert({
          institution_id: activeInstitutionId,
          duty_date: p.dutyDate,
          shift: null,
          staff_id: null,
          leave_type: p.leaveType,
        });
      } else {
        // Store an explicit "none" row or not? Spec says store selection; keep DB clean by storing nothing.
      }

      await reload();
    },
    [activeInstitutionId, reload],
  );

  const byDate = useMemo(() => {
    const map = new Map<string, VisualEntry[]>();
    for (const e of entries) {
      const k = String((e as any).duty_date);
      map.set(k, [...(map.get(k) ?? []), e]);
    }
    return map;
  }, [entries]);

  const leaveByDate = useMemo(() => {
    const map = new Map<string, VisualLeaveType>();
    for (const e of entries) {
      if ((e as any).shift == null && (e as any).staff_id == null) {
        const k = String((e as any).duty_date);
        map.set(k, ((e as any).leave_type ?? "none") as VisualLeaveType);
      }
    }
    return map;
  }, [entries]);

  const byDateShift = useMemo(() => {
    const map = new Map<string, VisualEntry[]>();
    for (const e of entries) {
      const shift = (e as any).shift as VisualShift | null;
      const staffId = (e as any).staff_id as string | null;
      if (!shift || !staffId) continue;
      const k = `${String((e as any).duty_date)}:${shift}`;
      map.set(k, [...(map.get(k) ?? []), e]);
    }
    return map;
  }, [entries]);

  return {
    loading,
    entries,
    range,
    monthDays,
    reload,
    upsertStaffEntry,
    removeEntry,
    setLeaveForDate,
    byDate,
    byDateShift,
    leaveByDate,
  };
}
