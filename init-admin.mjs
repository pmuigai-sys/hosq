import { init, id } from '@instantdb/admin';

const appId = '963e32dd-da05-4f18-a75f-96606b6a2546';
const adminToken = 'per_eb63ee25ad212962b560e4db17a73b05cd224994a5dd8cfee689e54d66109733';

const db = init({
  appId,
  adminToken,
});

async function main() {
  console.log('Adding admin user...');
  try {
    const result = await db.transact([
      db.tx.user_roles[id()].update({
        email: 'pmuigai@kabarak.ac.ke',
        role: 'admin',
        department: 'Administration',
        is_active: true,
        email_verified: true,
        created_at: new Date().toISOString(),
      }),
    ]);
    console.log('Success!', result);
  } catch (err) {
    console.error('Failed to add admin user:', err);
    process.exit(1);
  }
}

main();
