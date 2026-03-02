import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
        const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''

        const supabase = createClient(supabaseUrl, supabaseAnonKey)

        // Perform a simple query to keep the database active
        const { data, error } = await supabase
            .from('profiles') // Adjust if necessary, but 'profiles' is common
            .select('count')
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
