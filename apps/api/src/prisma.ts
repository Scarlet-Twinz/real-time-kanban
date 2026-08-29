import { PrismaClient } from '@prisma/client';

const globalAny: any = global;

export const prisma =
  globalAny.__prismaClient__ ??
  new PrismaClient({
    log: ['query'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalAny.__prismaClient__ = prisma;
}