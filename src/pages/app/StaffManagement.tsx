import React, { useEffect, useMemo, useState } from "react";
import { addYears, differenceInCalendarDays, format, intervalToDuration, isValid, parse } from "date-fns";
import { CalendarDays } from "lucide-react";
import { z } from "zod";
import { useNavigate } from "react-router-dom";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type StaffRow = {
  id: string;
  staff_code: string | null;
  name: string;
  designation: string | null;
  phone: string | null;
  dob: string | null;
  joining_date: string | null;
};

const staffCodeSchema = z
  .string()
  .trim()
  .max(32, { message: "Staff code must be 32 characters or less" })
  .regex(/^[A-Za-z0-9_-]*$/, { message: "Staff code can only use letters, numbers, _ or -" });

function friendlyStaffError(message: string) {
  const m = message.toLowerCase();
  if (m.includes("staff_institution_staff_code") || m.includes("staff_code") || m.includes("duplicate")) {
    return "Staff code already exists in this institution.";
  }
  return message;
}

function parseIsoDate(isoDate: string | null) {
  if (!isoDate) return undefined;
  const parsed = parse(isoDate, "yyyy-MM-dd", new Date());
  return isValid(parsed) ? parsed : undefined;
}

function formatIsoToDisplay(isoDate: string | null) {
  const parsed = parseIsoDate(isoDate);
  return parsed ? format(parsed, "dd/MM/yyyy") : "";
}

function SmartDatePicker(props: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const { id, label, value, onChange } = props;
  const selected = parseIsoDate(value || null);
  const currentYear = new Date().getFullYear();

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            className={cn("w-full justify-between font-normal", !selected && "text-muted-foreground")}
          >
            {selected ? format(selected, "dd/MM/yyyy") : "dd/mm/yyyy"}
            <CalendarDays className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selected}
            onSelect={(date) => onChange(date ? format(date, "yyyy-MM-dd") : "")}
            defaultMonth={selected ?? new Date()}
            captionLayout="dropdown-buttons"
            fromYear={1950}
            toYear={currentYear + 5}
            className="p-3 pointer-events-auto"
            initialFocus
          />
          <div className="border-t border-border p-2">
            <Button type="button" variant="ghost" className="w-full" onClick={() => onChange("")}>
              Clear date
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export default function StaffManagement() {
  const nav = useNavigate();
  const { activeInstitutionId } = useAuth();

  const [loading, setLoading] = useState(false);
  const [list, setList] = useState<StaffRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [staffCode, setStaffCode] = useState("");
  const [designation, setDesignation] = useState("");
  const [phone, setPhone] = useState("");
  const [dob, setDob] = useState("");
  const [joiningDate, setJoiningDate] = useState("");

  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<StaffRow | null>(null);
  const [editName, setEditName] = useState("");
  const [editStaffCode, setEditStaffCode] = useState("");
  const [editDesignation, setEditDesignation] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editDob, setEditDob] = useState("");
  const [editJoiningDate, setEditJoiningDate] = useState("");

  const [statementOpen, setStatementOpen] = useState(false);
  const [statementStaff, setStatementStaff] = useState<StaffRow | null>(null);

  const load = async () => {
    if (!activeInstitutionId) return;
    const res = await supabase
      .from("staff")
      .select("id,staff_code,name,designation,phone,dob,joining_date")
      .eq("institution_id", activeInstitutionId)
      .order("name");
    setList((res.data ?? []) as StaffRow[]);
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeInstitutionId]);

  const add = async () => {
    if (!activeInstitutionId) return;
    setError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Name is required");
      return;
    }

    const sc = staffCode.trim();
    const scRes = staffCodeSchema.safeParse(sc);
    if (!scRes.success) {
      setError(scRes.error.issues[0]?.message ?? "Invalid staff code");
      return;
    }

    setLoading(true);
    const res = await supabase.from("staff").insert({
      institution_id: activeInstitutionId,
      name: trimmedName,
      staff_code: sc || null,
      designation: designation.trim() || null,
      phone: phone.trim() || null,
      dob: dob || null,
      joining_date: joiningDate || null,
    });

    setLoading(false);
    if (res.error) {
      setError(friendlyStaffError(res.error.message));
      return;
    }

    setName("");
    setStaffCode("");
    setDesignation("");
    setPhone("");
    setDob("");
    setJoiningDate("");
    void load();
  };

  const openEdit = (s: StaffRow) => {
    setError(null);
    setEditTarget(s);
    setEditName(s.name ?? "");
    setEditStaffCode(s.staff_code ?? "");
    setEditDesignation(s.designation ?? "");
    setEditPhone(s.phone ?? "");
    setEditDob(s.dob ?? "");
    setEditJoiningDate(s.joining_date ?? "");
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!activeInstitutionId || !editTarget) return;
    setError(null);

    const trimmedName = editName.trim();
    if (!trimmedName) {
      setError("Name is required");
      return;
    }

    const sc = editStaffCode.trim();
    const scRes = staffCodeSchema.safeParse(sc);
    if (!scRes.success) {
      setError(scRes.error.issues[0]?.message ?? "Invalid staff code");
      return;
    }

    setLoading(true);
    const res = await supabase
      .from("staff")
      .update({
        name: trimmedName,
        staff_code: sc || null,
        designation: editDesignation.trim() || null,
        phone: editPhone.trim() || null,
        dob: editDob || null,
        joining_date: editJoiningDate || null,
      })
      .eq("id", editTarget.id)
      .eq("institution_id", activeInstitutionId);

    setLoading(false);
    if (res.error) {
      setError(friendlyStaffError(res.error.message));
      return;
    }

    setEditOpen(false);
    setEditTarget(null);
    void load();
  };

  const remove = async (id: string) => {
    setLoading(true);
    await supabase.from("staff").delete().eq("id", id);
    setLoading(false);
    void load();
  };

  const openStatement = (s: StaffRow) => {
    setStatementStaff(s);
    setStatementOpen(true);
  };

  const subtitle = useMemo(() => format(new Date(), "dd MMM yyyy"), []);

  const statementServiceInfo = useMemo(() => {
    if (!statementStaff?.joining_date) return null;
    const joining = parseIsoDate(statementStaff.joining_date);
    const now = new Date();
    if (!joining || joining > now) return null;

    const totalDays = differenceInCalendarDays(now, joining) + 1;
    const duration = intervalToDuration({ start: joining, end: now });

    return {
      totalDays,
      years: duration.years ?? 0,
      months: duration.months ?? 0,
      days: duration.days ?? 0,
      fullYears: duration.years ?? 0,
    };
  }, [statementStaff]);

  const statementPrlDate = useMemo(() => {
    if (!statementStaff?.dob) return null;
    const birthDate = parseIsoDate(statementStaff.dob);
    if (!birthDate) return null;
    return addYears(birthDate, 59);
  }, [statementStaff]);

  const statementElBalance = useMemo(() => {
    const fullYears = statementServiceInfo?.fullYears ?? 0;
    const earned = fullYears * 33;
    const recreationDeduction = Math.floor(fullYears / 3) * 15;
    return Math.max(0, earned - recreationDeduction);
  }, [statementServiceInfo]);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Staff</h2>
          <p className="text-sm text-muted-foreground">Manage staff for your institution. {subtitle}</p>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Add staff</CardTitle>
          <CardDescription>Name, staff code, phone, designation, DOB and joining date.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-7">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="staff_code">Staff code</Label>
            <Input
              id="staff_code"
              value={staffCode}
              onChange={(e) => setStaffCode(e.target.value)}
              placeholder="e.g. MIC-001"
              inputMode="text"
              autoCapitalize="characters"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="designation">Designation</Label>
            <Input id="designation" value={designation} onChange={(e) => setDesignation(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>

          <SmartDatePicker id="dob" label="DOB (dd/mm/yyyy)" value={dob} onChange={setDob} />
          <SmartDatePicker id="joining_date" label="Date of Joining (dd/mm/yyyy)" value={joiningDate} onChange={setJoiningDate} />

          <div className="flex items-end">
            <Button onClick={add} disabled={loading} className="w-full">
              {loading ? "Working…" : "Add"}
            </Button>
          </div>

          {error ? <p className="text-sm text-destructive md:col-span-7">{error}</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Staff list</CardTitle>
          <CardDescription>Click a name to view leave statement.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr className="border-b">
                <th className="py-3 pr-4">Staff code</th>
                <th className="py-3 pr-4">Name</th>
                <th className="py-3 pr-4">Designation</th>
                <th className="py-3 pr-4">Phone</th>
                <th className="py-3 pr-4">Action</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-muted-foreground">
                    No staff yet.
                  </td>
                </tr>
              ) : null}
              {list.map((s) => (
                <tr key={s.id} className="border-b last:border-b-0">
                  <td className="py-3 pr-4 font-mono text-xs text-muted-foreground">{s.staff_code ?? "—"}</td>
                  <td className="py-3 pr-4">
                    <button type="button" className="font-medium hover:underline" onClick={() => openStatement(s)}>
                      {s.name}
                    </button>
                  </td>
                  <td className="py-3 pr-4">{s.designation ?? "—"}</td>
                  <td className="py-3 pr-4">{s.phone ?? "—"}</td>
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2">
                      <Button variant="secondary" size="sm" onClick={() => openEdit(s)} disabled={loading}>
                        Edit
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => remove(s.id)} disabled={loading}>
                        Remove
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Dialog
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) setEditTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit staff</DialogTitle>
            <DialogDescription>Update staff details including staff code.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="edit_name">Name</Label>
              <Input id="edit_name" value={editName} onChange={(e) => setEditName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_staff_code">Staff code</Label>
              <Input
                id="edit_staff_code"
                value={editStaffCode}
                onChange={(e) => setEditStaffCode(e.target.value)}
                placeholder="e.g. MIC-001"
                inputMode="text"
                autoCapitalize="characters"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_designation">Designation</Label>
              <Input id="edit_designation" value={editDesignation} onChange={(e) => setEditDesignation(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_phone">Phone</Label>
              <Input id="edit_phone" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
            </div>

            <SmartDatePicker id="edit_dob" label="DOB (dd/mm/yyyy)" value={editDob} onChange={setEditDob} />
            <SmartDatePicker
              id="edit_joining_date"
              label="Date of Joining (dd/mm/yyyy)"
              value={editJoiningDate}
              onChange={setEditJoiningDate}
            />
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <DialogFooter>
            <Button onClick={saveEdit} disabled={loading || !editTarget}>
              {loading ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={statementOpen}
        onOpenChange={(open) => {
          setStatementOpen(open);
          if (!open) setStatementStaff(null);
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Staff Leave Statement</DialogTitle>
            <DialogDescription>{statementStaff ? statementStaff.name : ""}</DialogDescription>
          </DialogHeader>

          {statementStaff ? (
            <div className="space-y-4">
              <div className="grid gap-2 sm:grid-cols-3">
                <div className="rounded-md border border-input bg-background p-3">
                  <div className="text-xs text-muted-foreground">Total service</div>
                  <div className="text-base font-semibold tabular-nums">
                    {statementServiceInfo
                      ? `${statementServiceInfo.totalDays} days (${statementServiceInfo.years}y ${statementServiceInfo.months}m ${statementServiceInfo.days}d)`
                      : "—"}
                  </div>
                </div>
                <div className="rounded-md border border-input bg-background p-3">
                  <div className="text-xs text-muted-foreground">PRL Date</div>
                  <div className="text-base font-semibold tabular-nums">{statementPrlDate ? format(statementPrlDate, "dd/MM/yyyy") : "—"}</div>
                </div>
                <div className="rounded-md border border-input bg-background p-3">
                  <div className="text-xs text-muted-foreground">Total EL balance</div>
                  <div className="text-base font-semibold tabular-nums">{statementElBalance}</div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">EL formula: (full service years × 33) − (every completed 3 years × 15).</p>
            </div>
          ) : null}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                if (!statementStaff) return;
                const qs = new URLSearchParams();
                qs.set("staffId", statementStaff.id);
                nav(`/app/staff/statement/print?${qs.toString()}`);
              }}
              disabled={!statementStaff}
            >
              Download PDF
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
