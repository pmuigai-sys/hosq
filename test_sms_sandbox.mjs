// No external dependencies needed for this simple test
// Run with: node test_sms_activation_sandbox.mjs

const VITE_SUPABASE_URL = "https://xealdrmirciqcnnkwmag.supabase.co";
const VITE_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhlYWxkcm1pcmNpcWNubmt3bWFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzOTIwMTQsImV4cCI6MjA4NTk2ODAxNH0.1G2bRdoypSLxOs6VnETkdz8iegcEwDv2v3FwaIgfACE";

async function testSMSSandbox() {
    console.log("🚀 Starting SMS SANDBOX Activation Test...");

    const testData = {
        to: "+254700000000",
        message: "HOSQ Sandbox Test - Peter",
        // We can't easily force the Edge Function to use 'sandbox' username 
        // without changing the Supabase secret, but I'll try to send it in the body 
        // if I update the function to prioritize body username (but I haven't done that).
    };

    try {
        const response = await fetch(
            `${VITE_SUPABASE_URL}/functions/v1/send-sms`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${VITE_SUPABASE_ANON_KEY}`,
                    'apikey': VITE_SUPABASE_ANON_KEY,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(testData),
            }
        );

        const data = await response.json();
        console.log("Status:", response.status);
        console.log("Response:", JSON.stringify(data, null, 2));

    } catch (error) {
        console.error("💥 ERROR:", error.message);
    }
}

testSMSSandbox();
