import React, { useEffect, useMemo, useState } from "react";
import { addDays, format, parseISO, startOfMonth, endOfMonth } from "date-fns";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type StaffRow = { id: string; name: string };

type RosterDay = { id: string; duty_date: string };

type Assignment = { id: string; roster_day_id: string; shift: "morning" | "evening" | "night"; staff_id: string; is_extra: boolean };

export default function RosterCalendar() {
  const { activeInstitutionId, institutionRoles } = useAuth();
  const isLab = institutionRoles.includes("lab_incharge");

  const [month, setMonth] = useState(() => format(new Date(), "yyyy-MM"));
  const [loading, setLoading] = useState(false);
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [days, setDays] = useState<RosterDay[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);

  const range = useMemo(() => {
    const start = startOfMonth(parseISO(`${month}-01`));
    const end = endOfMonth(start);
    return { start, end };
  }, [month]);

  const load = async () => {
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
        .select("id,roster_day_id,shift,staff_id,is_extra")
        .in("roster_day_id", ids);
      setAssignments((aRes.data ?? []) as Assignment[]);
    } else {
      setAssignments([]);
    }

    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeInstitutionId, month]);

  const byDayShift = useMemo(() => {
    const map = new Map<string, Assignment[]>();
    for (const a of assignments) {
      const k = `${a.roster_day_id}:${a.shift}`;
      map.set(k, [...(map.get(k) ?? []), a]);
    }
    return map;
  }, [assignments]);

  const staffName = useMemo(() => new Map(staff.map((s) => [s.id, s.name])), [staff]);

  const ensureDay = async (dutyDate: string) => {
    if (!activeInstitutionId) return null;
    const existing = days.find((d) => d.duty_date === dutyDate);
    if (existing) return existing;

    const ins = await supabase
      .from("roster_days")
      .insert({ institution_id: activeInstitutionId, duty_date: dutyDate })
      .select("id,duty_date")
      .single();

    if (ins.data) setDays((prev) => [...prev, ins.data as RosterDay].sort((a, b) => a.duty_date.localeCompare(b.duty_date)));
    return (ins.data ?? null) as RosterDay | null;
  };

  const addAssignment = async (dutyDate: string, shift: Assignment["shift"], staffId: string, isExtra: boolean) => {
    const day = await ensureDay(dutyDate);
    if (!day) return;

    await supabase.from("roster_shift_assignments").insert({
      roster_day_id: day.id,
      shift,
      staff_id: staffId,
      is_extra: isExtra,
    });

    // NOTE: Auto OFF-earn on extra duty will be added via DB trigger in the next iteration.
    load();
  };

  const removeAssignment = async (assignmentId: string) => {
    await supabase.from("roster_shift_assignments").delete().eq("id", assignmentId);
    load();
  };

  const monthDays = useMemo(() => {
    const arr: string[] = [];
    for (let d = range.start; d <= range.end; d = addDays(d, 1)) arr.push(format(d, "yyyy-MM-dd"));
    return arr;
  }, [range.start, range.end]);

  const shifts: Array<Assignment["shift"]> = ["morning", "evening", "night"];

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Duty roster</h2>
          <p className="text-sm text-muted-foreground">Calendar-based, 3 shifts/day. Multiple staff per shift.</p>
        </div>
        <div className="flex items-center gap-2">
          <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-[190px]" />
          <Button onClick={load} disabled={loading}>
            {loading ? "Loading…" : "Refresh"}
          </Button>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Month view</CardTitle>
          <CardDescription>
            {isLab ? "Tap a cell to add staff." : "Read-only view for staff."}
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr className="border-b">
                <th className="py-3 pr-4">Date</th>
                {shifts.map((s) => (
                  <th key={s} className="py-3 pr-4 capitalize">
                    {s}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {monthDays.map((dutyDate) => {
                const day = days.find((x) => x.duty_date === dutyDate);
                return (
                  <tr key={dutyDate} className="border-b last:border-b-0">
                    <td className="py-3 pr-4 tabular-nums">
                      <div className="font-medium">{dutyDate}</div>
                    </td>
                    {shifts.map((shift) => {
                      const list = day ? byDayShift.get(`${day.id}:${shift}`) ?? [] : [];
                      return (
                        <td key={shift} className="py-3 pr-4 align-top">
                          <div className="flex flex-wrap gap-2">
                            {list.map((a) => (
                              <button
                                key={a.id}
                                onClick={() => (isLab ? removeAssignment(a.id) : undefined)}
                                className="rounded-md border bg-card px-2 py-1 text-xs text-foreground hover:bg-accent disabled:opacity-70"
                                disabled={!isLab}
                                title={isLab ? "Remove" : undefined}
                              >
                                {staffName.get(a.staff_id) ?? "Unknown"}
                                {a.is_extra ? " +extra" : ""}
                              </button>
                            ))}

                            {isLab && staff.length ? (
                              <select
                                className="h-8 rounded-md border bg-background px-2 text-xs"
                                defaultValue=""
                                onChange={(e) => {
                                  const staffId = e.target.value;
                                  if (!staffId) return;
                                  addAssignment(dutyDate, shift, staffId, false);
                                  e.currentTarget.value = "";
                                }}
                              >
                                <option value="">+ Add</option>
                                {staff.map((s) => (
                                  <option key={s.id} value={s.id}>
                                    {s.name}
                                  </option>
                                ))}
                              </select>
                            ) : null}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
