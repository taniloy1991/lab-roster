import React, { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { z } from "zod";

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

export default function StaffManagement() {
  const { activeInstitutionId } = useAuth();
  const [loading, setLoading] = useState(false);
  const [list, setList] = useState<StaffRow[]>([]);

  const [name, setName] = useState("");
  const [staffCode, setStaffCode] = useState("");
  const [designation, setDesignation] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<StaffRow | null>(null);
  const [editName, setEditName] = useState("");
  const [editStaffCode, setEditStaffCode] = useState("");
  const [editDesignation, setEditDesignation] = useState("");
  const [editPhone, setEditPhone] = useState("");

  const load = async () => {
    if (!activeInstitutionId) return;
    const res = await supabase
      .from("staff")
      .select("id,staff_code,name,designation,phone")
      .eq("institution_id", activeInstitutionId)
      .order("name");
    setList((res.data ?? []) as StaffRow[]);
  };

  useEffect(() => {
    load();
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
    load();
  };

  const openEdit = (s: StaffRow) => {
    setError(null);
    setEditTarget(s);
    setEditName(s.name ?? "");
    setEditStaffCode(s.staff_code ?? "");
    setEditDesignation(s.designation ?? "");
    setEditPhone(s.phone ?? "");
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
    load();
  };

  const remove = async (id: string) => {
    setLoading(true);
    await supabase.from("staff").delete().eq("id", id);
    setLoading(false);
    load();
  };

  const subtitle = useMemo(() => format(new Date(), "dd MMM yyyy"), []);

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
          <CardDescription>Delete is permanent in this MVP.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
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
                  <td className="py-3 pr-4 font-medium">{s.name}</td>
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
    </div>
  );
}
