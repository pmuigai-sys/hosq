/**
 * MANUAL UPDATE REQUIRED FOR AdminDashboard.tsx
 * 
 * Replace the handleCreateUser function (around line 89-155) with this:
 */

const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
        // Use Admin API to create user with auto-confirmed email
        const result = await createConfirmedUser(
            newUser.email,
            newUser.password,
            {
                role: newUser.role,
                department: newUser.department,
            }
        );

        if (!result.success || !result.userId) {
            throw new Error(result.error || 'User creation failed');
        }

        // Create user role in our custom table
        const { error: roleError } = await supabase.from('user_roles').insert({
            user_id: result.userId,
            email: newUser.email,
            role: newUser.role,
            department: newUser.department || null,
            email_verified: newUser.email_verified,
            is_active: true,
        } as Database['public']['Tables']['user_roles']['Insert']);

        if (roleError) throw roleError;

        // Show success message
        alert(
            `✅ User created successfully!\n\n` +
            `Email: ${newUser.email}\n` +
            `Role: ${newUser.role}\n` +
            `Email Confirmed: Yes (via Admin API)\n\n` +
            `The user can now log in immediately!`
        );

        setShowAddUser(false);
        setNewUser({
            email: '',
            password: '',
            role: 'receptionist',
            department: '',
            email_verified: false,
        });
        fetchEmployees();
    } catch (error: unknown) {
        console.error('Error creating user:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';

        // Check if it's a service key error
        if (errorMessage.includes('Admin client not initialized') || errorMessage.includes('SUPABASE_SERVICE_ROLE_KEY')) {
            alert(
                `❌ Admin API not configured!\n\n` +
                `To create users properly, you need to:\n\n` +
                `1. Get your Service Role Key from:\n` +
                `   Supabase Dashboard → Settings → API → service_role\n\n` +
                `2. Add it to your .env.local file:\n` +
                `   SUPABASE_SERVICE_ROLE_KEY=your_key_here\n\n` +
                `3. Restart the dev server (npm run dev)\n\n` +
                `Error: ${errorMessage}`
            );
        } else {
            alert(
                `Failed to create user: ${errorMessage}\n\n` +
                `Please check the console for more details.`
            );
        }
    } finally {
        setLoading(false);
    }
};

/**
 * NOTE: This update is OPTIONAL for now.
 * The current system will still work, but users will need manual SQL confirmation.
 * 
 * After you add SUPABASE_SERVICE_ROLE_KEY to .env.local and make this change,
 * new users will be auto-confirmed and can login immediately.
 */
