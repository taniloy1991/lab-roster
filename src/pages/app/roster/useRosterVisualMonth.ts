import { useCallback, useMemo, useState } from "react";
import { addDays, endOfMonth, format, parseISO, startOfMonth } from "date-fns";

import { supabase } from "@/integrations/supabase/client";

export type VisualShift = "morning" | "evening" | "night";

export type VisualEntry = {
  id: string;
  institution_id: string;
  duty_date: string; // yyyy-MM-dd
  shift: VisualShift;
  staff_id: string;
  responsibility_note: string | null; // used as "Duty Note" in UI
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
      .select("id,institution_id,duty_date,shift,staff_id,responsibility_note,created_by,created_at")
      .eq("institution_id", activeInstitutionId)
      .gte("duty_date", format(range.start, "yyyy-MM-dd"))
      .lte("duty_date", format(range.end, "yyyy-MM-dd"))
      .order("duty_date", { ascending: true })
      .order("created_at", { ascending: true });

    // Keep only shift rows (planning assignments). Leave rows (shift NULL) are not used.
    const clean = ((res.data ?? []) as any[])
      .filter((r) => r.shift != null && r.staff_id != null)
      .map((r) => ({
        id: String(r.id),
        institution_id: String(r.institution_id),
        duty_date: String(r.duty_date),
        shift: String(r.shift) as VisualShift,
        staff_id: String(r.staff_id),
        responsibility_note: r.responsibility_note == null ? null : String(r.responsibility_note),
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

  const removeEntry = useCallback(
    async (p: { id: string }) => {
      if (!activeInstitutionId) return;
      await supabase.from("roster_visual_entries" as any).delete().eq("id", p.id).eq("institution_id", activeInstitutionId);
      await reload();
    },
    [activeInstitutionId, reload],
  );

  const byDateShift = useMemo(() => {
    const map = new Map<string, VisualEntry[]>();
    for (const e of entries) {
      const k = `${e.duty_date}:${e.shift}`;
      const arr = map.get(k) ?? [];
      arr.push(e);
      map.set(k, arr);
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
    removeEntry,
    byDateShift,
  };
}


