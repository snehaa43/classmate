import { PrismaClient } from '@prisma/client';

/**
 * ============================================================================
 * PRISMA CLIENT SINGLETON INSTANCE
 * Prevents multiple instances of Prisma Client in development hot reloading
 * ============================================================================
 */

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
