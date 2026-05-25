// Diagnostics for SMS configuration (no secrets returned).
export const config = {
  verify_jwt: false,
};

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const required = ["BULKSMS_TOKEN_ID", "BULKSMS_TOKEN_SECRET", "SUPABASE_URL"];
    const missing = required.filter((key) => !Deno.env.get(key));
    const hasServiceRoleKey =
      Boolean(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")) ||
      Boolean(Deno.env.get("SERVICE_ROLE_KEY"));

    if (!hasServiceRoleKey) {
      missing.push("SUPABASE_SERVICE_ROLE_KEY");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey =
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
      Deno.env.get("SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const [{ data: smsSetting }, { count: activeOverrides }, { count: failedSms24h }] =
      await Promise.all([
        supabase
          .from("system_settings")
          .select("value")
          .eq("key", "sms_enabled")
          .maybeSingle(),
        supabase
          .from("checkin_cooldown_overrides")
          .select("*", { count: "exact", head: true })
          .gt("bypass_until", new Date().toISOString()),
        supabase
          .from("sms_logs")
          .select("*", { count: "exact", head: true })
          .eq("status", "failed")
          .gte("sent_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
      ]);

    const smsEnabled =
      typeof smsSetting?.value === "object" && smsSetting?.value !== null
        ? (smsSetting.value as Record<string, unknown>).enabled !== false
        : true;

    return new Response(
      JSON.stringify({
        ok: missing.length === 0,
        missing,
        diagnostics: {
          smsEnabled,
          activeCooldownBypasses: activeOverrides ?? 0,
          failedSmsLast24h: failedSms24h ?? 0,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
