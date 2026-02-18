// Allow unauthenticated calls from the patient self-serve flow.
export const config = {
  verify_jwt: false,
};

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, apikey",
};

interface SMSRequest {
  to: string;
  message: string;
  patientId?: string;
  queueEntryId?: string;
  forcedUsername?: string; // Added for diagnostics
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const apiKey = Deno.env.get("AFRICA_STALKING_API_KEY")?.trim();
    // Use forcedUsername if provided (for diagnostics), otherwise default to secret
    const body = await req.json().catch(() => ({}));
    const usernameFromEnv = Deno.env.get("AFRICA_STALKING_USERNAME")?.trim() || "sandbox";
    const username = (body.forcedUsername || usernameFromEnv).trim();

    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error: "Africa's Talking API key not configured",
          details: "Please set AFRICA_STALKING_API_KEY and AFRICA_STALKING_USERNAME environment variables",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { to, message, patientId, queueEntryId }: SMSRequest = body;

    if (!to || !message) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: to, message" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Africa's Talking requires E.164 (must start with +)
    const formattedPhone = to.startsWith("+") ? to : `+${to}`;

    // Africa's Talking API Endpoint
    const isSandbox = username.toLowerCase() === "sandbox";
    const apiBase = isSandbox
      ? "https://api.sandbox.africastalking.com"
      : "https://api.africastalking.com";

    const url = `${apiBase}/version1/messaging`;

    const formData = new URLSearchParams();
    formData.append("username", username);
    formData.append("to", formattedPhone);
    formData.append("message", message);

    console.log(`Calling AT API: ${url} with username: ${username} (isSandbox: ${isSandbox})`);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
        "apiKey": apiKey,
      },
      body: formData.toString(),
    });

    const bodyText = await response.text();
    console.log(`AT API Response Raw: ${bodyText}`);

    let data;
    try {
      data = JSON.parse(bodyText);
    } catch (e) {
      console.error("Failed to parse Africa's Talking response as JSON:", bodyText);
      return new Response(
        JSON.stringify({
          error: "Failed to parse provider response",
          details: bodyText,
          providerStatus: response.status,
          usedUsername: username
        }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // AT response structure: data.SMSMessageData.Recipients[0]
    const result = data.SMSMessageData?.Recipients?.[0];
    const logStatus = result?.status === "Success" ? "sent" : "failed";

    await supabase.from("sms_logs").insert({
      patient_id: patientId || null,
      queue_entry_id: queueEntryId || null,
      phone_number: formattedPhone,
      message,
      status: logStatus,
      twilio_sid: result?.messageId || null,
    });

    if (!response.ok || logStatus === "failed") {
      return new Response(
        JSON.stringify({
          error: "Failed to send SMS",
          details: data,
          usedUsername: username
        }),
        {
          status: response.status === 201 ? 200 : response.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        messageId: result?.messageId,
        status: result?.status,
        usedUsername: username
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error sending SMS:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
