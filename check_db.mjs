import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

async function checkDatabase() {
    const envContent = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8');
    const env = {};
    envContent.split('\n').forEach(line => {
        const [key, ...value] = line.split('=');
        if (key && value) env[key.trim()] = value.join('=').trim();
    });

    const supabaseUrl = env['VITE_SUPABASE_URL'];
    const supabaseAnonKey = env['VITE_SUPABASE_ANON_KEY'];

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Login as admin first
    const { data: authData } = await supabase.auth.signInWithPassword({
        email: 'pmuigai@kabarak.ac.ke',
        password: 'admin@123',
    });

    console.log('\n=== CHECKING USER_ROLES TABLE ===\n');

    const { data: roles, error } = await supabase
        .from('user_roles')
        .select('*');

    if (error) {
        console.error('Error:', error.message);
    } else {
        console.log(`Found ${roles.length} user roles:\n`);
        roles.forEach((role, index) => {
            console.log(`${index + 1}. User ID: ${role.user_id}`);
            console.log(`   Email: ${role.email || '❌ MISSING'}`);
            console.log(`   Role: ${role.role}`);
            console.log(`   Department: ${role.department || 'N/A'}`);
            console.log(`   Active: ${role.is_active}`);
            console.log(`   Email Verified: ${role.email_verified}`);
            console.log('');
        });
    }
}

checkDatabase();
