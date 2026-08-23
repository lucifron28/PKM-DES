import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { HealthRecordUpdate } from "./types";

export async function loadHealthRecordUpdate(
  supabase: SupabaseClient,
  enrollmentId: string
): Promise<{ record: HealthRecordUpdate | null; error: Error | null }> {
  const { data, error } = await supabase.rpc("get_health_record_update", {
    p_enrollment_id: enrollmentId
  });

  return {
    record: (data as HealthRecordUpdate[] | null)?.[0] ?? null,
    error: error as Error | null
  };
}
