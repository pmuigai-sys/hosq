import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

export const config = {
  verify_jwt: false,
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey, apikey',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: corsHeaders })
    }

    if (req.method !== 'GET' && req.method !== 'POST') {
        return new Response(
            JSON.stringify({ error: 'Method not allowed. Use GET or POST.' }),
            { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
        const authHeader = req.headers.get('Authorization')
        const bearer = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : ''
        const apiKeyHeader = req.headers.get('apikey') ?? req.headers.get('Apikey') ?? ''
        const supabaseKey =
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ??
            Deno.env.get('SERVICE_ROLE_KEY') ??
            Deno.env.get('SUPABASE_ANON_KEY') ??
            bearer ??
            apiKeyHeader ??
            ''

        if (!supabaseUrl || !supabaseKey) {
            return new Response(
                JSON.stringify({
                    error: 'Missing Supabase runtime configuration',
                    details: 'Expected SUPABASE_URL and one of SUPABASE_SERVICE_ROLE_KEY/SERVICE_ROLE_KEY/SUPABASE_ANON_KEY or request auth headers.',
                }),
                { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
            )
        }

        const supabase = createClient(supabaseUrl, supabaseKey)

        // Perform a simple query against a known table to keep the database active.
        const { data, error } = await supabase
            .from('queue_stages')
            .select('id')
            .limit(1)

        if (error) throw error

        return new Response(
            JSON.stringify({
                ok: true,
                message: 'Heartbeat successful',
                timestamp: new Date().toISOString(),
                sampledRows: (data ?? []).length,
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        )
    } catch (error: unknown) {
        return new Response(
            JSON.stringify({
                ok: false,
                error: error instanceof Error ? error.message : 'Unknown keep-alive error',
            }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        )
    }
})
