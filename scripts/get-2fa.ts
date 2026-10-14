import { prisma } from "../lib/prisma";
import { authenticator } from "otplib";

async function main() {
  const admins = await prisma.admin.findMany();
  console.log(`=== ADMINS ===`);
  for (const a of admins) {
    console.log(`- Email: ${a.email}`);
    console.log(`  Role: ${a.role}`);
    console.log(`  Active: ${a.active}`);
    console.log(`  Has TOTP Secret: ${Boolean(a.totpSecret)}`);
  }

  console.log(`\n=== AUTH LOCKS ===`);
  const locks = await prisma.adminAuthLock.findMany();
  console.log(locks);

  console.log(`\n=== RECENT AUDIT LOGS ===`);
  const logs = await prisma.auditLog.findMany({ take: 5, orderBy: { createdAt: "desc" } });
  console.log(logs);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
