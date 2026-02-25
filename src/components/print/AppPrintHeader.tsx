import React from "react";
import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

async function fetchAppSetting(settingKey: string) {
  const res = await supabase
    .from("app_settings")
    .select("setting_value")
    .eq("setting_key", settingKey)
    .maybeSingle();

  if (res.error) throw res.error;
  return res.data?.setting_value ?? "";
}

export function AppPrintHeader() {
  const { data } = useQuery({
    queryKey: ["app_settings", "pdf_header_text"],
    queryFn: () => fetchAppSetting("pdf_header_text"),
    staleTime: 5 * 60 * 1000,
  });

  const text = (data ?? "").trim();
  if (!text) return null;

  return (
    <div className="mx-auto max-w-3xl px-4 text-center text-sm leading-tight text-foreground">
      <div className="whitespace-pre-line font-medium">{text}</div>
    </div>
  );
}

