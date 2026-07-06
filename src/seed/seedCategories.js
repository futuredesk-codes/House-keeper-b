import { connectDB, disconnectDB } from '../config/db.js';
import Category from '../models/Category.js';

// One-time population of the service Category catalogue matching the
// category values already used by the seeded services. Safe to re-run —
// skips any category whose name already exists.
const CATEGORIES = ['NRK', 'KP'];

async function run() {
  await connectDB();

  for (const name of CATEGORIES) {
    const existing = await Category.findOne({ name: new RegExp(`^${name}$`, 'i') });
    if (existing) {
      // eslint-disable-next-line no-console
      console.log(`[seed] Skipping "${name}" — already exists`);
      continue;
    }
    await Category.create({ name });
    // eslint-disable-next-line no-console
    console.log(`[seed] Created category: ${name}`);
  }

  await disconnectDB();
  process.exit(0);
}

run().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[seed] Failed:', err);
  process.exit(1);
});
