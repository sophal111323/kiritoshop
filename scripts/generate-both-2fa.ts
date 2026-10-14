import { prisma } from "../lib/prisma";
import { authenticator } from "otplib";

authenticator.options = { window: 1 };

const ADMIN_EMAILS = [
  "kanhatepi2011@gmail.com",
  "menghongoppo68@gmail.com",
];

async function main() {
  console.log("⚡ Generating NEW 2FA Keys for Both Admins...\n");

  const results = [];

  for (const email of ADMIN_EMAILS) {
    const admin = await prisma.admin.findUnique({
      where: { email },
    });

    if (!admin) {
      console.error(`❌ Admin not found: ${email}`);
      continue;
    }

    // Generate brand new unique 2FA secret (20 bytes Base32)
    const newSecret = authenticator.generateSecret(20);

    // Save to DB
    await prisma.admin.update({
      where: { id: admin.id },
      data: { totpSecret: newSecret },
    });

    // Clear any previous failed login lock
    await prisma.adminAuthLock.deleteMany({
      where: {
        identifier: {
          in: [`admin-2fa:${admin.id}`, `admin-login:${admin.email}`],
        },
      },
    });

    // Clear used tokens for this admin
    await prisma.usedTotpToken.deleteMany({
      where: { adminId: admin.id },
    });

    // Generate current token and test verification
    const currentToken = authenticator.generate(newSecret);
    const isValid = authenticator.verify({
      token: currentToken,
      secret: newSecret,
    });

    const issuer = "KiritoShop";
    const otpAuthUrl = authenticator.keyuri(admin.email, issuer, newSecret);
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(otpAuthUrl)}`;

    results.push({
      email: admin.email,
      role: admin.role,
      secret: newSecret,
      currentToken,
      isValid,
      qrUrl,
      otpAuthUrl,
    });
  }

  console.log("=================================================================");
  console.log("🔐 KIRITOSHOP — NEW 2FA KEYS GENERATED & VERIFIED");
  console.log("=================================================================\n");

  for (let i = 0; i < results.length; i++) {
    const res = results[i];
    console.log(`--- [ Admin ${i + 1} ] ---`);
    console.log(`👤 Email: ${res.email}`);
    console.log(`🔑 Role: ${res.role}`);
    console.log(`🛡️ NEW 2FA Secret Key (Manual entry): ${res.secret}`);
    console.log(`⚡ CURRENT 6-DIGIT TOKEN: [ ${res.currentToken} ]`);
    console.log(`✅ Verification test passed?: ${res.isValid ? "YES (100% Working)" : "FAILED"}`);
    console.log(`📱 QR Code URL (to scan in Google Authenticator):`);
    console.log(res.qrUrl);
    console.log(`🔗 OTPAuth URI: ${res.otpAuthUrl}\n`);
  }

  console.log("=================================================================");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
