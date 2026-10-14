import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  await prisma.settings.upsert({
    where: { id: 1 },
    update: {
      siteName: "KiritoShop",
      supportTelegram: "@kiritostore46",
      supportTikTok: "https://www.tiktok.com/@kiritoshop.store?_r=1&_t=ZS-9AXZigmANa4",
      supportEmail: "support@kiritoshop.com",
    },
    create: {
      id: 1,
      siteName: "KiritoShop",
      exchangeRate: 4100,
      supportTelegram: "@kiritostore46",
      supportTikTok: "https://www.tiktok.com/@kiritoshop.store?_r=1&_t=ZS-9AXZigmANa4",
      supportEmail: "support@kiritoshop.com",
    },
  });
  console.log("✅ Database siteName, email, and social handles updated to KiritoShop!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
