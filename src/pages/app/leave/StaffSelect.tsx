import React from "react";

import { Label } from "@/components/ui/label";

export function StaffSelect(props: {
  label?: string;
  staff: { id: string; name: string }[];
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
}) {
  const { label = "Staff", staff, value, onChange, disabled } = props;

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <select
        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      >
        <option value="">Select staff…</option>
        {staff.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
    </div>
  );
}
