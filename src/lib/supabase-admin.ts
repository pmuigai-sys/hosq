import { createClient } from '@supabase/supabase-js';

/**
 * Admin Supabase Client
 * Uses service_role key for admin operations
 * ⚠️ NEVER expose this client to the frontend!
 */

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
    throw new Error('Missing VITE_SUPABASE_URL environment variable');
}

if (!supabaseServiceKey) {
    console.warn(
        '⚠️ VITE_SUPABASE_SERVICE_ROLE_KEY not found. Admin operations will not work.\n' +
        'Add it to your .env.local file from Supabase Dashboard → Settings → API'
    );
}

// Create admin client with service role key
export const supabaseAdmin = supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
            detectSessionInUrl: false,
            storageKey: 'supabase-admin',
        },
    })
    : null;

/**
 * Confirm a user's email using the Admin API
 * This is the proper way to verify users programmatically
 */
export async function confirmUserEmail(userId: string): Promise<{ success: boolean; error?: string }> {
    if (!supabaseAdmin) {
        return {
            success: false,
            error: 'Admin client not initialized. Add VITE_SUPABASE_SERVICE_ROLE_KEY to .env.local',
        };
    }

    try {
        const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
            email_confirm: true,
        });

        if (error) {
            console.error('Error confirming user email:', error);
            return { success: false, error: error.message };
        }

        console.log('✅ User email confirmed:', data.user.email);
        return { success: true };
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        console.error('Unexpected error:', err);
        return { success: false, error: message };
    }
}

/**
 * Create a new user with auto-confirmed email
 * This is the proper way to create users programmatically
 */
export async function createConfirmedUser(
    email: string,
    password: string,
    metadata?: { role?: string; department?: string }
): Promise<{ success: boolean; userId?: string; error?: string }> {
    if (!supabaseAdmin) {
        return {
            success: false,
            error: 'Admin client not initialized. Add VITE_SUPABASE_SERVICE_ROLE_KEY to .env.local',
        };
    }

    try {
        const { data, error } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true, // Auto-confirm email
            user_metadata: metadata,
        });

        if (error) {
            console.error('Error creating user:', error);
            return { success: false, error: error.message };
        }

        console.log('✅ User created and confirmed:', data.user.email);
        return { success: true, userId: data.user.id };
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        console.error('Unexpected error:', err);
        return { success: false, error: message };
    }
}
