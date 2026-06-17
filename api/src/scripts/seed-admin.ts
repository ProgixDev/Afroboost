/**
 * Seed (or reset) an admin account.
 *
 *   npm run build
 *   node dist/scripts/seed-admin.js <email> <password> [name] [role]
 *
 * role defaults to super_admin. Requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.
 */
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from '../app.module';
import { AdminAuthService } from '../auth/admin-auth.service';
import { AdminRole } from '../common/types';

async function main() {
  const [email, password, name = 'Admin', role = 'super_admin'] =
    process.argv.slice(2);
  if (!email || !password) {
    Logger.error('Usage: seed-admin <email> <password> [name] [role]');
    process.exit(1);
  }

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });
  const admins = app.get(AdminAuthService);
  const result = await admins.upsertAdmin({
    name,
    email,
    password,
    role: role as AdminRole,
  });
  Logger.log(`Seeded admin ${result?.email} (${result?.role})`, 'seed-admin');
  await app.close();
  process.exit(0);
}

void main();
