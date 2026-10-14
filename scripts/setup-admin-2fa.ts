import { prisma } from "../lib/prisma";
import { authenticator } from "otplib";

authenticator.options = { window: 1 };

async function main() {
  const email = process.env.ADMIN_EMAIL || "kanhatepi2011@gmail.com";
  
  let admin = await prisma.admin.findUnique({
    where: { email },
  });

  if (!admin) {
    console.error(`Admin not found for email: ${email}`);
    return;
  }

  let secret = admin.totpSecret;

  if (!secret) {
    secret = authenticator.generateSecret(20);
    await prisma.admin.update({
      where: { id: admin.id },
      data: { totpSecret: secret },
    });
    console.log("✅ New TOTP secret created and saved to database!");
  } else {
    console.log("ℹ️ Existing TOTP secret found in database.");
  }

  const issuer = "KiritoShop";
  const otpAuthUrl = authenticator.keyuri(admin.email, issuer, secret);
  const currentToken = authenticator.generate(secret);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(otpAuthUrl)}`;

  console.log("\n=======================================================");
  console.log("🔐 KIRITOSHOP — ADMIN 2FA (GOOGLE AUTHENTICATOR)");
  console.log("=======================================================");
  console.log(`👤 Admin: ${admin.email}`);
  console.log(`🔑 2FA Secret Key (Manual entry): ${secret}`);
  console.log(`⚡ CURRENT 6-DIGIT 2FA TOKEN: [ ${currentToken} ]`);
  console.log(`📱 QR Code URL (to scan with Google Authenticator):`);
  console.log(qrUrl);
  console.log(`🔗 OTPAuth URI: ${otpAuthUrl}`);
  console.log("=======================================================\n");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
