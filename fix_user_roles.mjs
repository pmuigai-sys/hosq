import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

async function fixUserRoles() {
    const envContent = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8');
    const env = {};
    envContent.split('\n').forEach(line => {
        const [key, ...value] = line.split('=');
        if (key && value) env[key.trim()] = value.join('=').trim();
    });

    const supabaseUrl = env['VITE_SUPABASE_URL'];
    const supabaseServiceKey = env['SUPABASE_SERVICE_ROLE_KEY'] || env['VITE_SUPABASE_ANON_KEY'];

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('\n=== FIXING USER_ROLES ===\n');

    // Get all auth users
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();

    if (usersError) {
        console.error('Error fetching users:', usersError.message);
        console.log('\nTrying alternative approach...\n');

        // Alternative: Login as admin and update what we can see
        const { data: authData } = await supabase.auth.signInWithPassword({
            email: 'pmuigai@kabarak.ac.ke',
            password: 'admin@123',
        });

        // Get all user_roles
        const { data: roles, error: rolesError } = await supabase
            .from('user_roles')
            .select('*');

        if (rolesError) {
            console.error('Error fetching roles:', rolesError.message);
            return;
        }

        console.log(`Found ${roles.length} user roles to update\n`);

        for (const role of roles) {
            const updates = {};

            // For admin, set email and verify
            if (role.role === 'admin') {
                updates.email = 'pmuigai@kabarak.ac.ke';
                updates.email_verified = true;
                updates.is_active = true;
            }

            if (Object.keys(updates).length > 0) {
                const { error: updateError } = await supabase
                    .from('user_roles')
                    .update(updates)
                    .eq('id', role.id);

                if (updateError) {
                    console.error(`❌ Error updating role ${role.id}:`, updateError.message);
                } else {
                    console.log(`✅ Updated ${role.role} - Email: ${updates.email}, Verified: ${updates.email_verified}`);
                }
            }
        }
    } else {
        console.log(`Found ${users.length} auth users\n`);

        // Update each user_role with their email from auth.users
        for (const user of users) {
            const { data: roleData, error: roleError } = await supabase
                .from('user_roles')
                .select('*')
                .eq('user_id', user.id)
                .single();

            if (roleError) {
                console.log(`No role found for user ${user.email}`);
                continue;
            }

            const updates = {
                email: user.email,
            };

            // If admin, also verify
            if (roleData.role === 'admin') {
                updates.email_verified = true;
                updates.is_active = true;
            }

            const { error: updateError } = await supabase
                .from('user_roles')
                .update(updates)
                .eq('user_id', user.id);

            if (updateError) {
                console.error(`❌ Error updating ${user.email}:`, updateError.message);
            } else {
                console.log(`✅ Updated ${user.email} (${roleData.role})`);
            }
        }
    }

    console.log('\n=== DONE ===\n');
}

fixUserRoles();
