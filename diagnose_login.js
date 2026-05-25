const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function diagnose() {
    const envContent = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8');
    const env = {};
    envContent.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) env[key.trim()] = value.trim();
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

    console.log(`Attempting to sign in with ${email}...`);
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (authError) {
        console.error('Auth Error:', authError.message);
        return;
    }

    console.log('Auth Success! User ID:', authData.user.id);

    console.log('Fetching user_roles...');
    const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', authData.user.id)
        .maybeSingle();

    if (roleError) {
        console.error('Role Fetch Error:', roleError.message);
    } else if (!roleData) {
        console.log('No user role found for this user id.');
    } else {
        console.log('User Role found:', JSON.stringify(roleData, null, 2));
    }
}

diagnose();
