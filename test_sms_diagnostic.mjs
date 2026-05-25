// Comprehensive Diagnostic Tool for Africa's Talking Authentication
// Run with: node test_sms_diagnostic.mjs

const VITE_SUPABASE_URL = "https://xealdrmirciqcnnkwmag.supabase.co";
const VITE_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhlYWxkcm1pcmNpcWNubmt3bWFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzOTIwMTQsImV4cCI6MjA4NTk2ODAxNH0.1G2bRdoypSLxOs6VnETkdz8iegcEwDv2v3FwaIgfACE";

async function runDiagnostic() {
    console.log("🔍 Running Africa's Talking Authentication Diagnostic...");

    const testCases = [
        { name: "Master Username (ptm)", username: "ptm" },
        { name: "App Name (hosq)", username: "hosq" }
    ];

    for (const testCase of testCases) {
        console.log(`\n--- Testing Case: ${testCase.name} ---`);

        const testData = {
            to: "+254700000000",
            message: `HOSQ Diagnostic Test [${testCase.name}]`,
            // I'll send the username in the body, but I need to update the Edge Function to accept it
            forcedUsername: testCase.username
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
            console.log(`Status: ${response.status}`);
            console.log(`Response:`, JSON.stringify(data, null, 2));

        } catch (error) {
            console.error(`💥 Error in ${testCase.name}:`, error.message);
        }
    }
}

console.log("NOTE: This diagnostic assumes the Edge Function has been updated to accept 'forcedUsername' in the request body.");
runDiagnostic();
