import React from "react";
import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";

type Props = {
  className?: string;
};

type SignatureData = {
  preparedName: string;
  preparedTitle: string;
  approvedName: string;
  approvedTitle: string;
};

async function fetchSignatureData(activeInstitutionId: string | null): Promise<SignatureData> {
  const fallback: SignatureData = {
    preparedName: "Md. Asif Hossain",
    preparedTitle: "Research Assistant,\nDept. of Microbiology\nBIRDEM General Hospital",
    approvedName: "Prof. Dr. Lovely Barai",
    approvedTitle: "Professor & Head\nDept. of Microbiology\nBIRDEM General Hospital",
  };

  if (!activeInstitutionId) return fallback;

  const keys = [
    `pdf_prepared_by_name:${activeInstitutionId}`,
    `pdf_prepared_by_title:${activeInstitutionId}`,
    `pdf_approved_by_name:${activeInstitutionId}`,
    `pdf_approved_by_title:${activeInstitutionId}`,
    "pdf_prepared_by_name",
    "pdf_prepared_by_title",
    "pdf_approved_by_name",
    "pdf_approved_by_title",
  ];

  const res = await supabase.from("app_settings").select("setting_key,setting_value").in("setting_key", keys);
  if (res.error) throw res.error;

  const byKey = new Map<string, string>();
  for (const row of res.data ?? []) {
    const key = String(row.setting_key ?? "").trim();
    const value = String(row.setting_value ?? "").trim();
    if (key && value) byKey.set(key, value);
  }

  const pick = (specific: string, fallbackKey: string, defaultValue: string) => {
    return byKey.get(specific) ?? byKey.get(fallbackKey) ?? defaultValue;
  };

  return {
    preparedName: pick(`pdf_prepared_by_name:${activeInstitutionId}`, "pdf_prepared_by_name", fallback.preparedName),
    preparedTitle: pick(`pdf_prepared_by_title:${activeInstitutionId}`, "pdf_prepared_by_title", fallback.preparedTitle),
    approvedName: pick(`pdf_approved_by_name:${activeInstitutionId}`, "pdf_approved_by_name", fallback.approvedName),
    approvedTitle: pick(`pdf_approved_by_title:${activeInstitutionId}`, "pdf_approved_by_title", fallback.approvedTitle),
  };
}

export function BirdemMicrobiologySignatures({ className }: Props) {
  const { activeInstitutionId } = useAuth();

  const { data } = useQuery({
    queryKey: ["pdf_signature_data", activeInstitutionId],
    queryFn: () => fetchSignatureData(activeInstitutionId),
    staleTime: 5 * 60 * 1000,
  });

  const preparedName = data?.preparedName ?? "Md. Asif Hossain";
  const preparedTitle = data?.preparedTitle ?? "Research Assistant,\nDept. of Microbiology\nBIRDEM General Hospital";
  const approvedName = data?.approvedName ?? "Prof. Dr. Lovely Barai";
  const approvedTitle = data?.approvedTitle ?? "Professor & Head\nDept. of Microbiology\nBIRDEM General Hospital";

  return (
    <section
      className={
        "grid grid-cols-1 gap-8 text-sm sm:grid-cols-2 " +
        (className ?? "")
      }
    >
      <div>
        <div className="mb-3 border-b border-border" />
        <div className="text-muted-foreground whitespace-pre-line">
          Prepared by:
          {"\n"}
          <span className="text-foreground">{preparedName}</span>
          {"\n"}
          {preparedTitle}
        </div>
      </div>

      <div>
        <div className="mb-3 border-b border-border" />
        <div className="text-muted-foreground whitespace-pre-line">
          Approved by:
          {"\n"}
          <span className="text-foreground">{approvedName}</span>
          {"\n"}
          {approvedTitle}
        </div>
      </div>
    </section>
  );
}

