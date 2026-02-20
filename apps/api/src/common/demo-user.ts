import type { PrismaService } from '../db/prisma.service';

export async function ensureDemoUserId(prisma: PrismaService) {
  const user = await prisma.user.upsert({
    where: { email: 'demo@civic.local' },
    update: {},
    create: { email: 'demo@civic.local', role: 'resident' }
  });
  return user.id;
}
