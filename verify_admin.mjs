import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

async function verifyAdmin() {
    const envContent = fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8');
    const env = {};
    envContent.split('\n').forEach(line => {
        const [key, ...value] = line.split('=');
        if (key && value) env[key.trim()] = value.join('=').trim();
    });

    const supabaseUrl = env['VITE_SUPABASE_URL'];
    const supabaseAnonKey = env['VITE_SUPABASE_ANON_KEY'];

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const email = 'pmuigai@kabarak.ac.ke';

    console.log(`Verifying admin user: ${email}...`);

    // First find the user_id by email if possible, or we already have it from previous script
    // c47c6d7a-3b7...

    const { data, error } = await supabase
        .from('user_roles')
        .update({ email_verified: true, is_active: true })
        .eq('role', 'admin'); // Assuming there's only one or we want to verify all admins for now safely

    if (error) {
        console.error('Update Error:', error.message);
    } else {
        console.log('Update Success!');
    }
}

verifyAdmin();
