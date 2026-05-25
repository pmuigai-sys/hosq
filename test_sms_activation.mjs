// No external dependencies needed for this simple test
// Run with: node test_sms_activation.mjs

const VITE_SUPABASE_URL = "https://xealdrmirciqcnnkwmag.supabase.co";
const VITE_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhlYWxkcm1pcmNpcWNubmt3bWFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzOTIwMTQsImV4cCI6MjA4NTk2ODAxNH0.1G2bRdoypSLxOs6VnETkdz8iegcEwDv2v3FwaIgfACE";

async function testSMS() {
    console.log("🚀 Starting SMS Activation Test...");

    const testData = {
        to: "+254715538259", // Placeholder Kenyan number
        message: "HOSQ Activation Test: Your SMS system is now successfully linked to Africa's Talking. - Peter",
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

        if (response.ok) {
            console.log("✅ SUCCESS: SMS function triggered successfully!");
            console.log("Response Data:", JSON.stringify(data, null, 2));
        } else {
            console.log("❌ FAILED: Function returned an error.");
            console.log("Status:", response.status);
            console.log("Error Details:", JSON.stringify(data, null, 2));

            if (JSON.stringify(data).includes("Balance") || JSON.stringify(data).includes("Insufficient")) {
                console.log("\n💡 NOTE: It looks like you might need to load airtime (credit) in your Africa's Talking dashboard to send real messages.");
            }
        }
    } catch (error) {
        console.error("💥 ERROR: Could not connect to the Supabase function.", error.message);
    }
}

testSMS();
