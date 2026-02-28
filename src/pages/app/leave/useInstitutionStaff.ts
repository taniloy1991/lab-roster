import { useCallback, useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";

export type StaffOption = { id: string; name: string };

export function useInstitutionStaff() {
  const { activeInstitutionId } = useAuth();
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!activeInstitutionId) {
      setStaff([]);
      return;
    }

    setLoading(true);
    const res = await supabase
      .from("staff")
      .select("id,name")
      .eq("institution_id", activeInstitutionId)
      .eq("is_active", true)
      .order("name");

    setLoading(false);
    setStaff((res.data ?? []) as StaffOption[]);
  }, [activeInstitutionId]);

  useEffect(() => {
    void load();
  }, [load]);

  return { staff, loading, reload: load, activeInstitutionId };
}
