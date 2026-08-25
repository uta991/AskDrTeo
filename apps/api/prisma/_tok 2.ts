import { PrismaClient } from '@prisma/client';
import * as jwt from 'jsonwebtoken';
const prisma = new PrismaClient();
(async () => {
  const user = await prisma.user.findFirstOrThrow({ where: { email: process.argv[2] } });
  const s = await prisma.session.create({ data: { userId: user.id, refreshTokenHash: `t-${Math.random()}`, expiresAt: new Date(Date.now() + 3600e3) } });
  console.log(jwt.sign({ sub: user.id, sid: s.id }, process.env.JWT_ACCESS_SECRET!, { expiresIn: '30m' }));
})().finally(() => prisma.$disconnect());
