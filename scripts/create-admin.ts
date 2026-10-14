import { prisma } from "../lib/prisma";
import bcrypt from "bcryptjs";
import { authenticator } from "otplib";

authenticator.options = { window: 1 };

async function main() {
  const email = process.argv[2] || "menghongoppo68@gmail.com";
  const rawPassword = process.argv[3] || "KIRITO.COM.KH.STORE.SHOP";
  const role = process.argv[4] || "SUPERADMIN";

  const passwordHash = await bcrypt.hash(rawPassword, 12);
  const secret = authenticator.generateSecret(20);

  const admin = await prisma.admin.upsert({
    where: { email },
    update: {
      passwordHash,
      role,
      active: true,
      totpSecret: secret,
    },
    create: {
      email,
      passwordHash,
      name: "Menghong",
      role,
      active: true,
      totpSecret: secret,
    },
  });

  const issuer = "KiritoShop";
  const otpAuthUrl = authenticator.keyuri(admin.email, issuer, secret);
  const currentToken = authenticator.generate(secret);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(otpAuthUrl)}`;

  console.log("\n=======================================================");
  console.log("✅ KIRITOSHOP — ADMIN CREATED SUCCESSFULLY");
  console.log("=======================================================");
  console.log(`👤 Email: ${admin.email}`);
  console.log(`🔑 Role: ${admin.role} (Full Permissions)`);
  console.log(`🔒 Password: ${rawPassword}`);
  console.log(`🛡️ 2FA Secret Key (Manual entry): ${secret}`);
  console.log(`⚡ CURRENT 6-DIGIT 2FA TOKEN: [ ${currentToken} ]`);
  console.log(`📱 QR Code URL (to scan with Google Authenticator):`);
  console.log(qrUrl);
  console.log(`🔗 OTPAuth URI: ${otpAuthUrl}`);
  console.log("=======================================================\n");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
