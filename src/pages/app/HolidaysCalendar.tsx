import React, { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type HolidayRow = { id: string; holiday_date: string; name: string };

export default function HolidaysCalendar() {
  const { activeInstitutionId } = useAuth();
  const [list, setList] = useState<HolidayRow[]>([]);
  const [holidayDate, setHolidayDate] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!activeInstitutionId) return;
    const res = await supabase
      .from("holidays")
      .select("id,holiday_date,name")
      .eq("institution_id", activeInstitutionId)
      .order("holiday_date", { ascending: true });
    setList((res.data ?? []) as HolidayRow[]);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeInstitutionId]);

  const add = async () => {
    if (!activeInstitutionId) return;
    setError(null);
    if (!holidayDate) return setError("Holiday date is required");
    if (!name.trim()) return setError("Holiday name is required");

    setLoading(true);
    const res = await supabase.from("holidays").insert({
      institution_id: activeInstitutionId,
      holiday_date: holidayDate,
      name: name.trim(),
    });
    setLoading(false);

    if (res.error) {
      setError(res.error.message);
      return;
    }

    setHolidayDate("");
    setName("");
    load();
  };

  const remove = async (id: string) => {
    setLoading(true);
    await supabase.from("holidays").delete().eq("id", id);
    setLoading(false);
    load();
  };

  const today = useMemo(() => format(new Date(), "yyyy-MM-dd"), []);

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-semibold tracking-tight">Holidays</h2>
        <p className="text-sm text-muted-foreground">Custom holiday list (no fixed government holidays).</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Add holiday</CardTitle>
          <CardDescription>Holidays affect duty roster and leave calculation (next step).</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="holidayDate">Date</Label>
            <Input id="holidayDate" type="date" value={holidayDate} min={today} onChange={(e) => setHolidayDate(e.target.value)} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="holidayName">Name</Label>
            <Input id="holidayName" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="flex items-end">
            <Button onClick={add} disabled={loading} className="w-full">
              {loading ? "Working…" : "Add"}
            </Button>
          </div>
          {error ? <p className="md:col-span-4 text-sm text-destructive">{error}</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Holiday list</CardTitle>
          <CardDescription>Calendar view coming next; list view is fast and mobile-friendly.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr className="border-b">
                <th className="py-3 pr-4">Date</th>
                <th className="py-3 pr-4">Name</th>
                <th className="py-3 pr-4">Action</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-10 text-center text-muted-foreground">
                    No holidays yet.
                  </td>
                </tr>
              ) : null}
              {list.map((h) => (
                <tr key={h.id} className="border-b last:border-b-0">
                  <td className="py-3 pr-4 tabular-nums">{h.holiday_date}</td>
                  <td className="py-3 pr-4 font-medium">{h.name}</td>
                  <td className="py-3 pr-4">
                    <Button variant="outline" size="sm" onClick={() => remove(h.id)} disabled={loading}>
                      Remove
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
