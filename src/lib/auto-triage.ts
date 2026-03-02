export async function runAutoEmergencyTriage(
  queueEntryId: string,
  patientId: string,
  visitReason: string,
  age?: number
): Promise<{ success: boolean; flagged?: boolean; error?: string }> {
  try {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/auto-emergency-triage`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          queueEntryId,
          patientId,
          visitReason,
          age: typeof age === "number" ? age : null,
        }),
      }
    );

    const data = await response.json();
    if (!response.ok) {
      const detail = data?.details ? ` - ${JSON.stringify(data.details)}` : "";
      return { success: false, error: `${data?.error || "Auto triage failed"}${detail}` };
    }

    return {
      success: true,
      flagged: Boolean(data?.flagged),
    };
  } catch {
    return { success: false, error: "Network error while running auto triage" };
  }
}
