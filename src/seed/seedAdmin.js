import { connectDB, disconnectDB } from '../config/db.js';
import { env } from '../config/env.js';
import TeamMember from '../models/TeamMember.js';
import { ROLES, permissionsForRole } from '../constants/roles.js';

// Creates (or updates the password of) the bootstrap Super Admin account.
async function run() {
  await connectDB();

  const email = env.seed.email.toLowerCase();
  let admin = await TeamMember.findOne({ email });

  if (admin) {
    admin.role = ROLES.SUPER_ADMIN;
    admin.permissions = permissionsForRole(ROLES.SUPER_ADMIN);
    admin.status = 'active';
    await admin.setPassword(env.seed.password);
    await admin.save();
    // eslint-disable-next-line no-console
    console.log(`[seed] Updated existing Super Admin: ${email}`);
  } else {
    admin = new TeamMember({
      name: env.seed.name,
      email,
      role: ROLES.SUPER_ADMIN,
      permissions: permissionsForRole(ROLES.SUPER_ADMIN),
      status: 'active',
    });
    await admin.setPassword(env.seed.password);
    await admin.save();
    // eslint-disable-next-line no-console
    console.log(`[seed] Created Super Admin: ${email}`);
  }

  // eslint-disable-next-line no-console
  console.log(`[seed] Login with email "${email}" and the SEED_ADMIN_PASSWORD from your .env`);
  await disconnectDB();
  process.exit(0);
}

run().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[seed] Failed:', err);
  process.exit(1);
});
