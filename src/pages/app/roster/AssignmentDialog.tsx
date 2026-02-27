import React, { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

import type { Assignment, Shift, StaffRow } from "./types";

type AddState = {
  mode: "add";
  dutyDate: string;
  shift: Shift;
  leaveStaffIds?: Set<string>;
};

type EditState = {
  mode: "edit";
  dutyDate: string;
  shift: Shift;
  assignment: Assignment;
  leaveStaffIds?: Set<string>;
};

export type AssignmentDialogState = AddState | EditState;

export function AssignmentDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  state: AssignmentDialogState | null;
  staff: StaffRow[];
  staffName: Map<string, string>;
  onAdd: (params: { dutyDate: string; shift: Shift; staffId: string; isExtra: boolean; dutyNote: string }) => Promise<void>;
  onUpdate: (params: { assignmentId: string; dutyNote: string }) => Promise<void>;
  onRemove: (assignmentId: string) => Promise<void>;
  canEdit: boolean;
}) {
  const { open, onOpenChange, state, staff, staffName, onAdd, onUpdate, onRemove, canEdit } = props;

  const isEdit = state?.mode === "edit";

  const [staffId, setStaffId] = useState("");
  const [isExtra, setIsExtra] = useState(false);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const title = useMemo(() => {
    if (!state) return "Duty details";
    return state.mode === "add" ? "Assign staff" : "Edit duty note";
  }, [state]);

  const subtitle = useMemo(() => {
    if (!state) return "";
    const base = `${state.dutyDate} • ${state.shift}`;
    if (state.mode === "add") return `Add assignment for ${base}`;
    return `Update note for ${base}`;
  }, [state]);

  React.useEffect(() => {
    if (!open || !state) return;

    if (state.mode === "add") {
      setStaffId("");
      setIsExtra(false);
      setNote("");
    } else {
      setStaffId(state.assignment.staff_id);
      setIsExtra(state.assignment.is_extra);
      setNote(state.assignment.duty_note ?? "");
    }
  }, [open, state]);

  const disableSave = !canEdit || saving || !state || (state.mode === "add" && !staffId);

  const handleSave = async () => {
    if (!state || !canEdit) return;
    setSaving(true);
    try {
      if (state.mode === "add") {
        await onAdd({
          dutyDate: state.dutyDate,
          shift: state.shift,
          staffId,
          isExtra,
          dutyNote: note,
        });
      } else {
        await onUpdate({ assignmentId: state.assignment.id, dutyNote: note });
      }
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!state || state.mode !== "edit" || !canEdit) return;
    setSaving(true);
    try {
      await onRemove(state.assignment.id);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{subtitle}</DialogDescription>
        </DialogHeader>

        {state ? (
          <div className="space-y-4">
            {state.leaveStaffIds?.size ? (
              <div className="rounded-md border border-input bg-background px-3 py-2 text-xs text-muted-foreground">
                Some staff are on leave for this date; they are disabled in the dropdown.
              </div>
            ) : null}

            <div className="space-y-2">
              <Label>Staff</Label>
              {isEdit ? (
                <Input value={staffName.get(staffId) ?? "Unknown"} readOnly />
              ) : (
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={staffId}
                  onChange={(e) => setStaffId(e.target.value)}
                  disabled={!canEdit}
                >
                  <option value="">Select staff…</option>
                  {staff.map((s) => {
                    const onLeave = Boolean(state.leaveStaffIds?.has(s.id));
                    return (
                      <option key={s.id} value={s.id} disabled={onLeave}>
                        {s.name}{onLeave ? " (On Leave)" : ""}
                      </option>
                    );
                  })}
                </select>
              )}

              {!isEdit && staffId && state.leaveStaffIds?.has(staffId) ? (
                <p className="text-xs text-destructive">Staff is on Leave</p>
              ) : null}

              {isEdit && state.leaveStaffIds?.has(staffId) ? (
                <p className="text-xs text-destructive">Staff is on Leave</p>
              ) : null}
            </div>

            {!isEdit ? (
              <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                <div>
                  <div className="text-sm font-medium">Extra duty</div>
                  <div className="text-xs text-muted-foreground">Mark as extra (does not change shift)</div>
                </div>
                <Switch checked={isExtra} onCheckedChange={setIsExtra} disabled={!canEdit} />
              </div>
            ) : null}

            <div className="space-y-2">
              <Label>Duty note</Label>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Write tasks / notes for this duty…"
                disabled={!canEdit}
              />
            </div>
          </div>
        ) : null}

        <DialogFooter>
          {isEdit ? (
            <Button type="button" variant="destructive" onClick={handleRemove} disabled={!canEdit || saving}>
              Remove
            </Button>
          ) : null}
          <Button type="button" onClick={handleSave} disabled={disableSave}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
