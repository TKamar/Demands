import * as dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

// Load .env.local if it exists (for local development), otherwise load .env
const envLocalPath = path.join(process.cwd(), '.env.local');
const envPath = path.join(process.cwd(), '.env');
const configPath = fs.existsSync(envLocalPath) ? envLocalPath : envPath;
dotenv.config({ path: configPath });

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding test data for Sub-Project C...');

  // Ensure Center A exists
  await prisma.center.upsert({
    where: { name: 'Center A' },
    update: {},
    create: {
      name: 'Center A',
      displayName: 'Center A',
      isActive: true
    }
  });

  // Clear existing test data
  await prisma.user.deleteMany({
    where: {
      username: { in: ['admin1', 'mod1', 'manager1', 'user1'] }
    }
  });

  // Create test users
  const admin = await prisma.user.create({
    data: {
      username: 'admin1',
      fullName: 'Admin User',
      role: 'ADMIN',
      centerName: null
    }
  });

  const moderator = await prisma.user.create({
    data: {
      username: 'mod1',
      fullName: 'Moderator User',
      role: 'MODERATOR',
      centerName: null
    }
  });

  const centerManager = await prisma.user.create({
    data: {
      username: 'manager1',
      fullName: 'Center Manager User',
      role: 'CENTER_MANAGER',
      centerName: 'Center A'
    }
  });

  const user = await prisma.user.create({
    data: {
      username: 'user1',
      fullName: 'Regular User',
      role: 'REGULAR_USER',
      centerName: null
    }
  });

  console.log('✅ Created test users:');
  console.log(`  - ${admin.username} (${admin.role})`);
  console.log(`  - ${moderator.username} (${moderator.role})`);
  console.log(`  - ${centerManager.username} (${centerManager.role})`);
  console.log(`  - ${user.username} (${user.role})`);

  console.log('✅ Seeding complete');
}

main()
  .catch(e => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
