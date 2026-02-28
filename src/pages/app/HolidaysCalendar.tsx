import React from "react";

import { ClManagementSection } from "@/pages/app/leave/ClManagementSection";
import { OffManagementSection } from "@/pages/app/leave/OffManagementSection";

export default function HolidaysCalendar() {
  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-semibold tracking-tight">Leave Management</h2>
        <p className="text-sm text-muted-foreground">Manage Casual Leave (CL) and General OFF with dynamic balances.</p>
      </header>

      <ClManagementSection />
      <OffManagementSection />
    </div>
  );
}
