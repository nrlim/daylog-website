import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // Create default admin user
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      email: 'admin@daylog.com',
      password: hashedPassword,
      role: 'admin',
    },
  });

  console.log('Created admin user:', { 
    id: admin.id, 
    username: admin.username, 
    email: admin.email 
  });
  console.log('Admin login credentials:');
  console.log('  Username: admin');
  console.log('  Password: admin123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
