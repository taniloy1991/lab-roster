import React, { useCallback, useEffect, useMemo, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";

type LeaveRow = {
  id: string;
  leave_type: "casual" | "off";
  start_date: string;
  end_date: string;
  reason: string | null;
  staff?: { name: string } | null;
};

export default function LeaveManagement() {
  const { toast } = useToast();
  const { loading: authLoading, activeInstitutionId } = useAuth();

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<LeaveRow[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!activeInstitutionId) return;

    setLoading(true);
    const res = await supabase
      .from("leave_requests")
      .select("id, leave_type, start_date, end_date, reason, staff:staff_id ( name )")
      .eq("institution_id", activeInstitutionId)
      .eq("status", "pending")
      .order("created_at", { ascending: true });

    if (res.error) {
      toast({
        title: "Failed to load leaves",
        description: res.error.message,
        variant: "destructive",
      });
      setRows([]);
      setLoading(false);
      return;
    }

    setRows((res.data ?? []) as LeaveRow[]);
    setLoading(false);
  }, [activeInstitutionId, toast]);

  useEffect(() => {
    if (authLoading) return;
    if (!activeInstitutionId) {
      setRows([]);
      setLoading(false);
      return;
    }
    load();
  }, [authLoading, activeInstitutionId, load]);

  const title = useMemo(() => `Pending leave requests`, []);

  const decide = useCallback(
    async (id: string, nextStatus: "approved" | "rejected") => {
      setBusyId(id);
      const res = await supabase.from("leave_requests").update({ status: nextStatus }).eq("id", id);

      if (res.error) {
        toast({
          title: `Could not ${nextStatus === "approved" ? "approve" : "reject"} leave`,
          description: res.error.message,
          variant: "destructive",
        });
        setBusyId(null);
        return;
      }

      toast({
        title: nextStatus === "approved" ? "Leave approved" : "Leave rejected",
      });

      await load();
      setBusyId(null);
    },
    [load, toast],
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{title}</CardTitle>
          <CardDescription>Review and act on leave requests that are awaiting decision.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Staff</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Start</TableHead>
                <TableHead>End</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-muted-foreground">
                    Loading…
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-muted-foreground">
                    No pending leave requests.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.staff?.name ?? "—"}</TableCell>
                    <TableCell className="capitalize">{r.leave_type}</TableCell>
                    <TableCell>{r.start_date}</TableCell>
                    <TableCell>{r.end_date}</TableCell>
                    <TableCell className="max-w-[36ch] truncate">{r.reason ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={busyId === r.id}
                          onClick={() => decide(r.id, "approved")}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busyId === r.id}
                          onClick={() => decide(r.id, "rejected")}
                        >
                          Reject
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
