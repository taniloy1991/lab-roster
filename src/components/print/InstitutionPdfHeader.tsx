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

/**
 * Print/PDF header:
 * - Logo top-left (from app_settings.pdf_logo_url if present)
 * - Title:
 *   Department of Microbiology
 *   BIRDEM GENERAL HOSPITAL
 */
export function InstitutionPdfHeader() {
  const { data: logoUrl } = useQuery({
    queryKey: ["app_settings", "pdf_logo_url"],
    queryFn: () => fetchAppSetting("pdf_logo_url"),
    staleTime: 5 * 60 * 1000,
  });

  const logo = (logoUrl ?? "").trim();

  return (
    <div className="mx-auto max-w-5xl px-4">
      <div className="flex items-start gap-4">
        <div className="w-16 shrink-0">
          {logo ? (
            <img
              src={logo}
              alt="Institution logo"
              className="h-14 w-14 object-contain"
              loading="eager"
            />
          ) : null}
        </div>

        <div className="flex-1 text-center">
          <div className="text-base font-semibold leading-tight text-foreground">Department of Microbiology</div>
          <div className="text-base font-semibold leading-tight text-foreground">BIRDEM GENERAL HOSPITAL</div>
        </div>

        {/* right spacer to keep the title centered even when logo exists */}
        <div className="w-16 shrink-0" />
      </div>
    </div>
  );
}
