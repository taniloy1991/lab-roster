import React, { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type StaffRow = { id: string; name: string };

type HolidayRow = {
  id: string;
  holiday_date: string;
  name: string;
  holiday_type: string | null;
  staff_id: string | null;
};

export default function HolidaysCalendar() {
  const { activeInstitutionId } = useAuth();

  const [staff, setStaff] = useState<StaffRow[]>([]);
  const staffName = useMemo(() => new Map(staff.map((s) => [s.id, s.name])), [staff]);

  const [list, setList] = useState<HolidayRow[]>([]);
  const [holidayDate, setHolidayDate] = useState<Date | undefined>(undefined);
  const [holidayType, setHolidayType] = useState<"general_off" | "government" | "casual">("general_off");
  const [staffId, setStaffId] = useState<string>("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!activeInstitutionId) return;

    const [staffRes, holidayRes] = await Promise.all([
      supabase
        .from("staff")
        .select("id,name")
        .eq("institution_id", activeInstitutionId)
        .eq("is_active", true)
        .order("name"),
      supabase
        .from("holidays")
        .select("id,holiday_date,name,holiday_type,staff_id")
        .eq("institution_id", activeInstitutionId)
        .order("holiday_date", { ascending: true }),
    ]);

    setStaff((staffRes.data ?? []) as StaffRow[]);
    setList((holidayRes.data ?? []) as HolidayRow[]);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeInstitutionId]);

  const add = async () => {
    if (!activeInstitutionId) return;
    setError(null);

    if (!holidayDate) return setError("Holiday date is required");
    if (!name.trim()) return setError("Holiday name is required");

    // Staff required for CL/OFF; optional for government.
    if ((holidayType === "casual" || holidayType === "general_off") && !staffId) {
      return setError("Staff is required for CL/OFF holiday types");
    }

    setLoading(true);
    const res = await supabase.from("holidays").insert({
      institution_id: activeInstitutionId,
      holiday_date: format(holidayDate, "yyyy-MM-dd"),
      name: name.trim(),
      holiday_type: holidayType,
      staff_id: holidayType === "government" ? null : staffId,
    });
    setLoading(false);

    if (res.error) {
      // Friendly duplicate message (new uniqueness rules)
      if ((res.error as any).code === "23505") {
        setError(
          holidayType === "government"
            ? "Government holiday already exists for this date."
            : "This staff already has a holiday/leave entry for this date.",
        );
      } else {
        setError(res.error.message);
      }
      return;
    }

    setHolidayDate(undefined);
    setHolidayType("general_off");
    setStaffId("");
    setName("");
    void load();
  };

  const remove = async (id: string) => {
    setLoading(true);
    await supabase.from("holidays").delete().eq("id", id);
    setLoading(false);
    void load();
  };
  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-semibold tracking-tight">Holidays</h2>
        <p className="text-sm text-muted-foreground">Manage CL/OFF and government holidays.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Add holiday</CardTitle>
          <CardDescription>Government holidays do not affect CL/OFF balances.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-5">
          <div className="space-y-2">
            <Label>Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn("w-full justify-start text-left font-normal", !holidayDate && "text-muted-foreground")}
                >
                  {holidayDate ? format(holidayDate, "yyyy-MM-dd") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={holidayDate}
                  onSelect={setHolidayDate}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>Staff</Label>
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={staffId}
              onChange={(e) => setStaffId(e.target.value)}
              disabled={holidayType === "government"}
            >
              <option value="">Select staff…</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label>Type</Label>
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={holidayType}
              onChange={(e) => setHolidayType(e.target.value as any)}
            >
              <option value="general_off">general_off</option>
              <option value="government">government</option>
              <option value="casual">casual</option>
            </select>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>Name</Label>
            <input
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Eid Holiday"
            />
          </div>

          <div className="flex items-end md:col-span-5">
            <Button onClick={add} disabled={loading} className="w-full">
              {loading ? "Working…" : "Add"}
            </Button>
          </div>

          {error ? <p className="md:col-span-5 text-sm text-destructive">{error}</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Holiday list</CardTitle>
          <CardDescription>Date | Staff | Type | Delete</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr className="border-b">
                <th className="py-3 pr-4">Date</th>
                <th className="py-3 pr-4">Staff</th>
                <th className="py-3 pr-4">Type</th>
                <th className="py-3 pr-4">Action</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-muted-foreground">
                    No holidays yet.
                  </td>
                </tr>
              ) : null}
              {list.map((h) => (
                <tr key={h.id} className="border-b last:border-b-0">
                  <td className="py-3 pr-4 tabular-nums">{h.holiday_date}</td>
                  <td className="py-3 pr-4 font-medium">{h.staff_id ? staffName.get(h.staff_id) ?? "—" : "—"}</td>
                  <td className="py-3 pr-4 font-mono text-xs text-muted-foreground">{h.holiday_type ?? "—"}</td>
                  <td className="py-3 pr-4">
                    <Button variant="outline" size="sm" onClick={() => remove(h.id)} disabled={loading}>
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
