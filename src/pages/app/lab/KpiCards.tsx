import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type KpiItem = {
  label: string;
  value: React.ReactNode;
  hint?: string;
};

export function KpiCards({ items }: { items: KpiItem[] }) {
  return (
    <section aria-label="Lab snapshot" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((it) => (
        <Card key={it.label}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{it.label}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-semibold tracking-tight tabular-nums">{it.value}</div>
            {it.hint ? <div className="mt-1 text-xs text-muted-foreground">{it.hint}</div> : null}
          </CardContent>
        </Card>
      ))}
    </section>
  );
}
