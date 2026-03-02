import React from "react";
import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";

type HeaderBranding = {
  logo: string;
  line1: string;
  line2: string;
};

async function fetchInstitutionHeader(activeInstitutionId: string | null): Promise<HeaderBranding> {
  const fallbackLogo = "/images/birdem-logo.png";
  const fallbackLine1 = "Department of Microbiology";
  const fallbackLine2 = "BIRDEM GENERAL HOSPITAL";

  if (!activeInstitutionId) {
    return { logo: fallbackLogo, line1: fallbackLine1, line2: fallbackLine2 };
  }

  const keys = [
    `pdf_logo_url:${activeInstitutionId}`,
    "pdf_logo_url",
    `pdf_header_line_1:${activeInstitutionId}`,
    "pdf_header_line_1",
  ];

  const [settingsRes, institutionRes] = await Promise.all([
    supabase.from("app_settings").select("setting_key,setting_value").in("setting_key", keys),
    supabase.from("institutions").select("name").eq("id", activeInstitutionId).maybeSingle(),
  ]);

  if (settingsRes.error) throw settingsRes.error;
  if (institutionRes.error) throw institutionRes.error;

  const byKey = new Map<string, string>();
  for (const row of settingsRes.data ?? []) {
    const k = String(row.setting_key ?? "").trim();
    const v = String(row.setting_value ?? "").trim();
    if (k && v) byKey.set(k, v);
  }

  const pick = (specific: string, fallback: string, defaultValue: string) => {
    return byKey.get(specific) ?? byKey.get(fallback) ?? defaultValue;
  };

  const line2 = (institutionRes.data?.name ?? "").trim().toUpperCase() || fallbackLine2;

  return {
    logo: pick(`pdf_logo_url:${activeInstitutionId}`, "pdf_logo_url", fallbackLogo),
    line1: pick(`pdf_header_line_1:${activeInstitutionId}`, "pdf_header_line_1", fallbackLine1),
    line2,
  };
}

/**
 * Print/PDF header:
 * - Logo top-left (institution-scoped app settings key first)
 * - Title lines from institution branding and current institution name
 */
export function InstitutionPdfHeader() {
  const { activeInstitutionId } = useAuth();

  const { data } = useQuery({
    queryKey: ["institution_pdf_header", activeInstitutionId],
    queryFn: () => fetchInstitutionHeader(activeInstitutionId),
    staleTime: 5 * 60 * 1000,
  });

  const logo = data?.logo ?? "/images/birdem-logo.png";
  const line1 = data?.line1 ?? "Department of Microbiology";
  const line2 = data?.line2 ?? "BIRDEM GENERAL HOSPITAL";

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
          <div className="text-base font-semibold leading-tight text-foreground">{line1}</div>
          <div className="text-base font-semibold leading-tight text-foreground">{line2}</div>
        </div>

        {/* right spacer to keep the title centered even when logo exists */}
        <div className="w-16 shrink-0" />
      </div>
    </div>
  );
}

