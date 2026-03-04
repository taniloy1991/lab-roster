import React, { useEffect, useMemo, useState } from "react";
import { addYears, differenceInCalendarDays, format, intervalToDuration, isValid, parse } from "date-fns";
import { z } from "zod";
import { useNavigate } from "react-router-dom";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type StaffRow = {
  id: string;
  staff_code: string | null;
  name: string;
  designation: string | null;
  phone: string | null;
  dob: string | null;
  joining_date: string | null;
};

type LeaveHistoryRow = { date: string | null; type: string | null };

type ClBalanceRow = { remaining_days: number | null };

type OffBalanceRow = { off_balance: number | null };

const BIRDEM_INSTITUTION_ID = "cfa40334-46e7-431d-9f77-3f3aa1a6b339";
const ASIF_USER_ID = "f6b0964c-ce2e-457f-9aa7-0fe164d69454";

const staffCodeSchema = z
  .string()
  .trim()
  .max(32, { message: "Staff code must be 32 characters or less" })
  .regex(/^[A-Za-z0-9_-]*$/, { message: "Staff code can only use letters, numbers, _ or -" });

const dateDisplaySchema = z
  .string()
  .trim()
  .refine((value) => value.length === 0 || /^\d{2}\/\d{2}\/\d{4}$/.test(value), {
    message: "Use dd/mm/yyyy format",
  });

function friendlyStaffError(message: string) {
  const m = message.toLowerCase();
  if (m.includes("staff_institution_staff_code") || m.includes("staff_code") || m.includes("duplicate")) {
    return "Staff code already exists in this institution.";
  }
  return message;
}

function formatIsoToDisplay(isoDate: string | null) {
  if (!isoDate) return "";
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) return "";
  return format(parsed, "dd/MM/yyyy");
}

function displayDateToIso(value: string) {
  const parsed = parse(value, "dd/MM/yyyy", new Date());
  if (!isValid(parsed)) return null;
  if (format(parsed, "dd/MM/yyyy") !== value) return null;
  return format(parsed, "yyyy-MM-dd");
}

export default function StaffManagement() {
  const nav = useNavigate();
  const { activeInstitutionId, institutionRoles, session } = useAuth();
  const [loading, setLoading] = useState(false);
  const [list, setList] = useState<StaffRow[]>([]);

  const canUseBirdemAsifEnhancements =
    activeInstitutionId === BIRDEM_INSTITUTION_ID &&
    session?.user?.id === ASIF_USER_ID &&
    institutionRoles.includes("lab_incharge");

  const [name, setName] = useState("");
  const [staffCode, setStaffCode] = useState("");
  const [designation, setDesignation] = useState("");
  const [phone, setPhone] = useState("");
  const [dob, setDob] = useState("");
  const [joiningDate, setJoiningDate] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<StaffRow | null>(null);
  const [editName, setEditName] = useState("");
  const [editStaffCode, setEditStaffCode] = useState("");
  const [editDesignation, setEditDesignation] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editDob, setEditDob] = useState("");
  const [editJoiningDate, setEditJoiningDate] = useState("");

  // Leave statement dialog
  const [statementOpen, setStatementOpen] = useState(false);
  const [statementStaff, setStatementStaff] = useState<StaffRow | null>(null);
  const [statementLoading, setStatementLoading] = useState(false);
  const [statementClRemaining, setStatementClRemaining] = useState(0);
  const [statementOffBalance, setStatementOffBalance] = useState(0);
  const [statementHistory, setStatementHistory] = useState<LeaveHistoryRow[]>([]);

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

    const dobInput = dob.trim();
    const joiningInput = joiningDate.trim();

    const dobRes = dateDisplaySchema.safeParse(dobInput);
    if (!dobRes.success) {
      setError(dobRes.error.issues[0]?.message ?? "Invalid DOB");
      return;
    }

    const joiningRes = dateDisplaySchema.safeParse(joiningInput);
    if (!joiningRes.success) {
      setError(joiningRes.error.issues[0]?.message ?? "Invalid joining date");
      return;
    }

    const parsedDob = dobInput ? displayDateToIso(dobInput) : null;
    if (dobInput && !parsedDob) {
      setError("DOB is invalid. Use a real date in dd/mm/yyyy format.");
      return;
    }

    const parsedJoiningDate = joiningInput ? displayDateToIso(joiningInput) : null;
    if (joiningInput && !parsedJoiningDate) {
      setError("Date of joining is invalid. Use a real date in dd/mm/yyyy format.");
      return;
    }

    setLoading(true);
    const payload: Record<string, unknown> = {
      institution_id: activeInstitutionId,
      name: trimmedName,
      staff_code: sc || null,
      designation: designation.trim() || null,
      phone: phone.trim() || null,
    };

    if (canUseBirdemAsifEnhancements) {
      payload.dob = parsedDob;
      payload.joining_date = parsedJoiningDate;
    }

    const res = await supabase.from("staff").insert(payload as never);

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
    setEditDob(formatIsoToDisplay(s.dob));
    setEditJoiningDate(formatIsoToDisplay(s.joining_date));
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

    const dobInput = editDob.trim();
    const joiningInput = editJoiningDate.trim();

    const dobRes = dateDisplaySchema.safeParse(dobInput);
    if (!dobRes.success) {
      setError(dobRes.error.issues[0]?.message ?? "Invalid DOB");
      return;
    }

    const joiningRes = dateDisplaySchema.safeParse(joiningInput);
    if (!joiningRes.success) {
      setError(joiningRes.error.issues[0]?.message ?? "Invalid joining date");
      return;
    }

    const parsedDob = dobInput ? displayDateToIso(dobInput) : null;
    if (dobInput && !parsedDob) {
      setError("DOB is invalid. Use a real date in dd/mm/yyyy format.");
      return;
    }

    const parsedJoiningDate = joiningInput ? displayDateToIso(joiningInput) : null;
    if (joiningInput && !parsedJoiningDate) {
      setError("Date of joining is invalid. Use a real date in dd/mm/yyyy format.");
      return;
    }

    setLoading(true);
    const payload: Record<string, unknown> = {
      name: trimmedName,
      staff_code: sc || null,
      designation: editDesignation.trim() || null,
      phone: editPhone.trim() || null,
    };

    if (canUseBirdemAsifEnhancements) {
      payload.dob = parsedDob;
      payload.joining_date = parsedJoiningDate;
    }

    const res = await supabase
      .from("staff")
      .update(payload as never)
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

  const openStatement = async (s: StaffRow) => {
    setStatementStaff(s);
    setStatementOpen(true);

    if (canUseBirdemAsifEnhancements) {
      setStatementHistory([]);
      setStatementClRemaining(0);
      setStatementOffBalance(0);
      setStatementLoading(false);
      return;
    }

    setStatementLoading(true);

    const [clRes, offRes, histRes] = await Promise.all([
      supabase.from("cl_balance_view").select("remaining_days").eq("staff_id", s.id).maybeSingle(),
      supabase.from("off_balance_view").select("off_balance").eq("staff_id", s.id).maybeSingle(),
      supabase.from("staff_leave_history").select("date,type").eq("staff_id", s.id).order("date", { ascending: true }),
    ]);

    setStatementClRemaining(Number(((clRes.data as ClBalanceRow | null)?.remaining_days ?? 0) || 0));
    setStatementOffBalance(Number(((offRes.data as OffBalanceRow | null)?.off_balance ?? 0) || 0));
    setStatementHistory((histRes.data ?? []) as LeaveHistoryRow[]);
    setStatementLoading(false);
  };

  const subtitle = useMemo(() => format(new Date(), "dd MMM yyyy"), []);

  const statementServiceInfo = useMemo(() => {
    if (!statementStaff?.joining_date) return null;
    const joining = new Date(statementStaff.joining_date);
    const now = new Date();
    if (Number.isNaN(joining.getTime()) || joining > now) return null;

    const totalDays = differenceInCalendarDays(now, joining) + 1;
    const duration = intervalToDuration({ start: joining, end: now });

    return {
      totalDays,
      years: duration.years ?? 0,
      months: duration.months ?? 0,
      days: duration.days ?? 0,
      fullYears: Math.max(0, differenceInCalendarDays(now, joining) >= 0 ? (duration.years ?? 0) : 0),
    };
  }, [statementStaff]);

  const statementPrlDate = useMemo(() => {
    if (!statementStaff?.dob) return null;
    const birthDate = new Date(statementStaff.dob);
    if (Number.isNaN(birthDate.getTime())) return null;
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
          <CardDescription>Name, staff code, phone and designation.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-5">
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
          <div className="flex items-end">
            <Button onClick={add} disabled={loading} className="w-full">
              {loading ? "Working…" : "Add"}
            </Button>
          </div>

          {error ? <p className="md:col-span-5 text-sm text-destructive">{error}</p> : null}
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
                    <button
                      type="button"
                      className="font-medium hover:underline"
                      onClick={() => void openStatement(s)}
                    >
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

          <div className="grid gap-3 sm:grid-cols-2">
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
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="rounded-md border border-input bg-background p-3">
                  <div className="text-xs text-muted-foreground">CL remaining</div>
                  <div className="text-xl font-semibold tabular-nums">{statementClRemaining}</div>
                </div>
                <div className="rounded-md border border-input bg-background p-3">
                  <div className="text-xs text-muted-foreground">OFF balance</div>
                  <div className="text-xl font-semibold tabular-nums">{statementOffBalance}</div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-sm">
                  <thead className="text-left text-xs text-muted-foreground">
                    <tr className="border-b">
                      <th className="py-3 pr-4">Date</th>
                      <th className="py-3 pr-4">Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {statementLoading ? (
                      <tr>
                        <td colSpan={2} className="py-10 text-center text-muted-foreground">Loading…</td>
                      </tr>
                    ) : statementHistory.length === 0 ? (
                      <tr>
                        <td colSpan={2} className="py-10 text-center text-muted-foreground">No leave history.</td>
                      </tr>
                    ) : (
                      statementHistory.map((r, idx) => (
                        <tr key={`${r.date}-${idx}`} className="border-b last:border-b-0">
                          <td className="py-3 pr-4 tabular-nums">{r.date ?? "—"}</td>
                          <td className="py-3 pr-4">{r.type ?? "—"}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
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
