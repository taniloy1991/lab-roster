import React, { useMemo, useState } from "react";
import { differenceInCalendarDays, getYear, isAfter } from "date-fns";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

import { DateRangePicker } from "./DateRangePicker";
import { StaffSelect } from "./StaffSelect";
import { formatDbDate } from "./dateFormat";
import { useInstitutionStaff } from "./useInstitutionStaff";

export function ClManagementSection() {
  const { toast } = useToast();
  const { staff, activeInstitutionId } = useInstitutionStaff();

  const [staffId, setStaffId] = useState("");
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [busy, setBusy] = useState(false);

  const year = useMemo(() => {
    if (!startDate) return new Date().getFullYear();
    return getYear(startDate);
  }, [startDate]);

  const totalDays = useMemo(() => {
    if (!startDate || !endDate) return null;
    if (isAfter(startDate, endDate)) return null;
    return differenceInCalendarDays(endDate, startDate) + 1;
  }, [startDate, endDate]);

  const deduct = async () => {
    if (!activeInstitutionId) return;
    if (!staffId) {
      toast({ title: "Staff is required", variant: "destructive" });
      return;
    }
    if (!startDate || !endDate) {
      toast({ title: "Start and end dates are required", variant: "destructive" });
      return;
    }
    if (getYear(startDate) !== getYear(endDate)) {
      toast({ title: "Date range must be within the same year", variant: "destructive" });
      return;
    }

    setBusy(true);
    const res = await supabase.from("cl_transactions" as any).insert({
      institution_id: activeInstitutionId,
      staff_id: staffId,
      start_date: formatDbDate(startDate),
      end_date: formatDbDate(endDate),
      total_days: 0,
      year: 0,
    });
    setBusy(false);

    if (res.error) {
      toast({ title: "Could not deduct CL", description: res.error.message, variant: "destructive" });
      return;
    }

    toast({ title: `Deducted CL${totalDays ? ` (${totalDays} days)` : ""}` });
    setStartDate(undefined);
    setEndDate(undefined);
  };

  const printHref = useMemo(() => {
    if (!staffId) return null;
    return `/print/cl-overview?staffId=${encodeURIComponent(staffId)}&year=${encodeURIComponent(String(year))}`;
  }, [staffId, year]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Casual Leave (CL) Management</CardTitle>
        <CardDescription>Each staff has 20 CL per year; you can only deduct CL.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <StaffSelect staff={staff} value={staffId} onChange={setStaffId} />
          <div className="md:col-span-2">
            <DateRangePicker startDate={startDate} endDate={endDate} onStartDate={setStartDate} onEndDate={setEndDate} />
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <Button onClick={deduct} disabled={busy}>
            {busy ? "Working…" : "Deduct / Minus CL"}
          </Button>
          <Button asChild variant="outline" disabled={!printHref}>
            <a href={printHref ?? "#"} target="_blank" rel="noreferrer">
              Print CL Overview
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
