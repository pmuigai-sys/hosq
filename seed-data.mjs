import { init, id } from '@instantdb/admin';

const appId = '963e32dd-da05-4f18-a75f-96606b6a2546';
const adminToken = 'per_eb63ee25ad212962b560e4db17a73b05cd224994a5dd8cfee689e54d66109733';

const db = init({
  appId,
  adminToken,
});

async function main() {
  console.log('Seeding default data...');
  try {
    const stages = [
      { name: 'registration', display_name: 'Registration', order_number: 1 },
      { name: 'doctor', display_name: 'Doctor Consultation', order_number: 2 },
      { name: 'billing', display_name: 'Billing', order_number: 3 },
      { name: 'pharmacy', display_name: 'Pharmacy', order_number: 4 },
    ];

    const flags = [
      { name: 'cardiac_emergency', description: 'Cardiac Emergency - Chest pain, heart attack symptoms' },
      { name: 'severe_bleeding', description: 'Severe Bleeding - Uncontrolled bleeding' },
      { name: 'breathing_difficulty', description: 'Breathing Difficulty - Severe respiratory distress' },
      { name: 'unconscious', description: 'Unconscious - Patient is not responsive' },
      { name: 'severe_pain', description: 'Severe Pain - Pain level 8+ requiring immediate attention' },
    ];

    const txs = [];

    for (const stage of stages) {
      txs.push(
        db.tx.queue_stages[id()].update({
          ...stage,
          is_active: true,
          created_at: new Date().toISOString(),
        })
      );
    }

    for (const flag of flags) {
      txs.push(
        db.tx.emergency_flags[id()].update({
          ...flag,
          is_active: true,
          created_at: new Date().toISOString(),
        })
      );
    }

    const result = await db.transact(txs);
    console.log('Success!', result);
  } catch (err) {
    console.error('Failed to seed data:', err);
    process.exit(1);
  }
}

main();
