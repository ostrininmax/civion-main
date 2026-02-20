"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureDemoUserId = ensureDemoUserId;
async function ensureDemoUserId(prisma) {
    const user = await prisma.user.upsert({
        where: { email: 'demo@civic.local' },
        update: {},
        create: { email: 'demo@civic.local', role: 'resident' }
    });
    return user.id;
}
