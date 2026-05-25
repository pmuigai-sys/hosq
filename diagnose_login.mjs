import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

async function diagnose() {
    const envContent = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8');
    const env = {};
    envContent.split('\n').forEach(line => {
        const [key, ...value] = line.split('=');
        if (key && value) env[key.trim()] = value.join('=').trim();
    });

    const supabaseUrl = env['VITE_SUPABASE_URL'];
    const supabaseAnonKey = env['VITE_SUPABASE_ANON_KEY'];

    if (!supabaseUrl || !supabaseAnonKey) {
        console.error('Missing Supabase environment variables');
        process.exit(1);
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const email = 'pmuigai@kabarak.ac.ke';
    const password = 'admin@123';

    console.log(`\n=== DIAGNOSIS FOR ${email} ===\n`);

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (authError) {
        console.error('❌ Auth Error:', authError.message);
        return;
    }

    console.log('✅ Auth Success!');
    console.log('   User ID:', authData.user.id);
    console.log('   Email:', authData.user.email);
    console.log('   Email Confirmed:', authData.user.email_confirmed_at ? 'Yes' : 'No');

    console.log('\n--- Fetching user_roles ---');
    const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', authData.user.id)
        .maybeSingle();

    if (roleError) {
        console.error('❌ Role Fetch Error:', roleError.message);
    } else if (!roleData) {
        console.log('❌ No user role found for this user id.');
    } else {
        console.log('✅ User Role found:');
        console.log('   ID:', roleData.id);
        console.log('   Role:', roleData.role);
        console.log('   Department:', roleData.department || 'N/A');
        console.log('   Email:', roleData.email || '❌ MISSING');
        console.log('   Is Active:', roleData.is_active ? '✅' : '❌');
        console.log('   Email Verified:', roleData.email_verified ? '✅' : '❌');
        console.log('   Created At:', roleData.created_at);

        console.log('\n--- Access Check ---');
        if (roleData.role === 'admin') {
            console.log('✅ User is ADMIN');
        }
        if (roleData.is_active && roleData.email_verified) {
            console.log('✅ User can access the system');
        } else if (roleData.role === 'admin' && roleData.is_active) {
            console.log('✅ User can access as admin (verification not required for admins)');
        } else {
            console.log('❌ User CANNOT access the system');
            if (!roleData.is_active) console.log('   Reason: Account is not active');
            if (!roleData.email_verified && roleData.role !== 'admin') console.log('   Reason: Email not verified');
        }
    }

    console.log('\n=== END DIAGNOSIS ===\n');
}

diagnose();
