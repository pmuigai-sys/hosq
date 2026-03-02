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

    const tokenId = Deno.env.get("BULKSMS_TOKEN_ID")?.trim();
    const tokenSecret = Deno.env.get("BULKSMS_TOKEN_SECRET")?.trim();

    if (!tokenId || !tokenSecret) {
      return new Response(
        JSON.stringify({
          error: "BulkSMS.com credentials not configured",
          details: "Please set BULKSMS_TOKEN_ID and BULKSMS_TOKEN_SECRET environment variables",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { to, message, patientId, queueEntryId }: SMSRequest = await req.json();

    if (!to || !message) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: to, message" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // BulkSMS requires E.164 (must start with +)
    const formattedPhone = to.startsWith("+") ? to : `+${to}`;

    // BulkSMS.com V1 API Endpoint
    const url = "https://api.bulksms.com/v1/messages";

    // Basic Auth Header (Base64 of tokenId:tokenSecret)
    const authHeader = `Basic ${btoa(`${tokenId}:${tokenSecret}`)}`;

    const payload = [
      {
        to: formattedPhone,
        body: message,
      }
    ];

    console.log(`Calling BulkSMS API: ${url} for recipient: ${formattedPhone}`);

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Authorization": authHeader,
      },
      body: JSON.stringify(payload),
    });

    const bodyText = await response.text();
    console.log(`BulkSMS API Response Raw: ${bodyText}`);

    let data;
    try {
      data = JSON.parse(bodyText);
    } catch (e) {
      console.error("Failed to parse BulkSMS response as JSON:", bodyText);
      return new Response(
        JSON.stringify({
          error: "Failed to parse provider response",
          details: bodyText,
          providerStatus: response.status,
        }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // BulkSMS V1 response is an array of message results
    const result = data[0];
    const logStatus = response.status >= 200 && response.status < 300 ? "sent" : "failed";

    await supabase.from("sms_logs").insert({
      patient_id: patientId || null,
      queue_entry_id: queueEntryId || null,
      phone_number: formattedPhone,
      message,
      status: logStatus,
      twilio_sid: result?.id || null, // Reusing column for external ID
    });

    if (!response.ok) {
      return new Response(
        JSON.stringify({
          error: "Failed to send SMS",
          details: data,
        }),
        {
          status: response.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        messageId: result?.id,
        status: result?.status?.type,
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
