import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
        const supabaseKey =
            Deno.env.get('SUPABASE_ANON_KEY') ??
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ??
            Deno.env.get('SERVICE_ROLE_KEY') ??
            ''

        const supabase = createClient(supabaseUrl, supabaseKey)

        // Perform a simple query against a known table to keep the database active.
        const { data, error } = await supabase
            .from('queue_stages')
            .select('id')
            .limit(1)

        if (error) throw error

        return new Response(
            JSON.stringify({ message: 'Heartbeat successful', timestamp: new Date().toISOString() }),
            { headers: { "Content-Type": "application/json" } },
        )
    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { "Content-Type": "application/json" } },
        )
    }
})
