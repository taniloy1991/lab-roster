import React, { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type StaffRow = { id: string; name: string; designation: string | null; phone: string | null };

export default function StaffManagement() {
  const { activeInstitutionId } = useAuth();
  const [loading, setLoading] = useState(false);
  const [list, setList] = useState<StaffRow[]>([]);
  const [name, setName] = useState("");
  const [designation, setDesignation] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!activeInstitutionId) return;
    const res = await supabase
      .from("staff")
      .select("id,name,designation,phone")
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
    if (!name.trim()) {
      setError("Name is required");
      return;
    }

    setLoading(true);
    const res = await supabase.from("staff").insert({
      institution_id: activeInstitutionId,
      name: name.trim(),
      designation: designation.trim() || null,
      phone: phone.trim() || null,
    });

    setLoading(false);
    if (res.error) {
      setError(res.error.message);
      return;
    }

    setName("");
    setDesignation("");
    setPhone("");
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
          <CardDescription>Name, phone and designation (no fixed government holidays assumed).</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
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

          {error ? <p className="md:col-span-4 text-sm text-destructive">{error}</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Staff list</CardTitle>
          <CardDescription>Delete is permanent in this MVP.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr className="border-b">
                <th className="py-3 pr-4">Name</th>
                <th className="py-3 pr-4">Designation</th>
                <th className="py-3 pr-4">Phone</th>
                <th className="py-3 pr-4">Action</th>
              </tr>
            </thead>
            <tbody>
              {list.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-muted-foreground">
                    No staff yet.
                  </td>
                </tr>
              ) : null}
              {list.map((s) => (
                <tr key={s.id} className="border-b last:border-b-0">
                  <td className="py-3 pr-4 font-medium">{s.name}</td>
                  <td className="py-3 pr-4">{s.designation ?? "—"}</td>
                  <td className="py-3 pr-4">{s.phone ?? "—"}</td>
                  <td className="py-3 pr-4">
                    <Button variant="outline" size="sm" onClick={() => remove(s.id)} disabled={loading}>
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
