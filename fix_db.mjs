import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

async function fixDatabase() {
    const envContent = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8');
    const env = {};
    envContent.split('\n').forEach(line => {
        const [key, ...value] = line.split('=');
        if (key && value) env[key.trim()] = value.join('=').trim();
    });

    const supabaseUrl = env['VITE_SUPABASE_URL'];
    const supabaseAnonKey = env['VITE_SUPABASE_ANON_KEY'];

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    console.log('Fetching all user roles...');
    const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('*');

    if (rolesError) {
        console.error('Error fetching roles:', rolesError.message);
        return;
    }

    console.log(`Found ${roles.length} roles. Updating missing emails and verification for admin...`);

    for (const role of roles) {
        let updates = {};

        // For the specific admin user provided
        if (role.role === 'admin') {
            updates.email_verified = true;
            updates.is_active = true;
            updates.email = 'pmuigai@kabarak.ac.ke';
        } else if (!role.email) {
            // We don't easily know other users' emails without accessing auth.users (which we can't from anon key)
            // but we can try to guess or just leave it for now if we don't have it.
        }

        if (Object.keys(updates).length > 0) {
            const { error: updateError } = await supabase
                .from('user_roles')
                .update(updates)
                .eq('id', role.id);

            if (updateError) {
                console.error(`Error updating role ${role.id}:`, updateError.message);
            } else {
                console.log(`Updated role ${role.id} (Set verified=true, email=${updates.email})`);
            }
        }
    }
}

fixDatabase();
