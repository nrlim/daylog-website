import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient({
  log: ['error', 'warn'],
  errorFormat: 'pretty',
});

prisma.$connect()
  .then(() => console.log('✓ Database connected'))
  .catch((err) => {
    console.error('✗ Database connection failed:', err.message);
    process.exit(1);
  });
