import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

async function checkUser() {
    const envContent = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8');
    const env = {};
    envContent.split('\n').forEach(line => {
        const [key, ...value] = line.split('=');
        if (key && value) env[key.trim()] = value.join('=').trim();
    });

    const supabaseUrl = env['VITE_SUPABASE_URL'];
    const supabaseAnonKey = env['VITE_SUPABASE_ANON_KEY'];

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const email = 'ptmthairu@gmail.com';
    const password = 'admin@123';

    console.log(`\n=== CHECKING ${email} ===\n`);

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (authError) {
        console.error('❌ Auth Error:', authError.message);
        console.log('\nThis error means Supabase Auth is blocking the login.');
        console.log('The user exists but email is not confirmed in auth.users table.\n');
        return;
    }

    console.log('✅ Auth Success!');
    console.log('   User ID:', authData.user.id);
    console.log('   Email:', authData.user.email);
    console.log('   Email Confirmed:', authData.user.email_confirmed_at ? 'Yes' : 'No');

    const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', authData.user.id)
        .maybeSingle();

    if (roleError) {
        console.error('❌ Role Error:', roleError.message);
    } else if (!roleData) {
        console.log('❌ No user role found');
    } else {
        console.log('\n✅ User Role:');
        console.log('   Email:', roleData.email);
        console.log('   Role:', roleData.role);
        console.log('   Is Active:', roleData.is_active);
        console.log('   Email Verified (in user_roles):', roleData.email_verified);
    }
}

checkUser();
