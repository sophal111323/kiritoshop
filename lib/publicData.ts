import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { maskCdnUrl } from "@/lib/cdnMask";
import { getStartOfTodayCambodia } from "@/lib/timeUtils";

const rawPublicRevalidateSeconds = Number(
  process.env.PUBLIC_DATA_REVALIDATE_SECONDS || 10
);

export const PUBLIC_DATA_REVALIDATE_SECONDS =
  Number.isFinite(rawPublicRevalidateSeconds) && rawPublicRevalidateSeconds > 0
    ? rawPublicRevalidateSeconds
    : 10;

export const getPublicSettings = unstable_cache(
  async () => {
    const settings = await prisma.settings
      .findUnique({
        where: { id: 1 },
        select: {
          siteName: true,
          exchangeRate: true,
          supportTelegram: true,
          supportTikTok: true,
          supportEmail: true,
          maintenanceMode: true,
          maintenanceMessage: true,
          announcementEnabled: true,
          announcement: true,
          announcementTone: true,
          appMinSupportedVersion: true,
          appLatestVersion: true,
          appForceUpdate: true,
          appUpdateUrl: true,
          ordersEnabled: true,
          paymentsEnabled: true,
          promosEnabled: true,
          logoUrl: true,
          logoText: true,
          logoTagline: true,
          updatedAt: true,
        },
      })
      .catch(() => null);

    return {
      siteName: settings?.siteName || "KiritoShop",
      exchangeRate: settings?.exchangeRate ?? 4100,
      supportTelegram: settings?.supportTelegram || "@kiritostore46",
      supportTikTok: settings?.supportTikTok || "https://www.tiktok.com/@kiritoshop.store?_r=1&_t=ZS-9AXZigmANa4",
      supportEmail: settings?.supportEmail || null,
      maintenanceMode: settings?.maintenanceMode ?? false,
      maintenanceMessage:
        settings?.maintenanceMessage ||
        "Server កំពុងថែទាំបណ្តោះអាសន្ន។ សូមរង់ចាំប្រហែល 30 នាទី។",
      announcementEnabled: Boolean(
        settings?.announcementEnabled && settings?.announcement?.trim()
      ),
      announcementText: settings?.announcement || "",
      announcement: settings?.announcement || null,
      announcementTone: settings?.announcementTone || "info",
      appConfig: {
        minSupportedVersion: settings?.appMinSupportedVersion || "1.0.0",
        latestVersion: settings?.appLatestVersion || "1.0.0",
        forceUpdate: settings?.appForceUpdate ?? false,
        updateUrl: settings?.appUpdateUrl || "",
      },
      featureFlags: {
        ordersEnabled: settings?.ordersEnabled ?? true,
        paymentsEnabled: settings?.paymentsEnabled ?? true,
        promosEnabled: settings?.promosEnabled ?? true,
      },
      logoUrl: settings?.logoUrl || "/logo.png",
      logoText: settings?.logoText || "KiritoShop",
      logoTagline: settings?.logoTagline || "Instant · Secure · 24/7",
      updatedAt: settings?.updatedAt ?? null,
    };
  },
  ["public-settings-v2"],
  {
    tags: ["settings", "public-settings"],
    revalidate: PUBLIC_DATA_REVALIDATE_SECONDS,
  }
);

async function withDbRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch {
    await new Promise((r) => setTimeout(r, 600));
    return await fn();
  }
}

export const getPublicHomeData = unstable_cache(
  async () => {
    return withDbRetry(async () => {
      const startOfDay = getStartOfTodayCambodia();
      const [games, banners, todayOrders] = await Promise.all([
        prisma.game.findMany({
          where: { active: true },
          orderBy: [{ featured: "desc" }, { sortOrder: "asc" }],
          select: {
            id: true,
            slug: true,
            name: true,
            publisher: true,
            currencyName: true,
            imageUrl: true,
            featured: true,
            dailyLimit: true,
          },
        }),
        prisma.heroBanner.findMany({
          where: { active: true },
          orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
          select: {
            id: true,
            title: true,
            subtitle: true,
            imageUrl: true,
            linkUrl: true,
            ctaLabel: true,
          },
        }),
        prisma.order.groupBy({
          by: ["gameId"],
          where: {
            status: { in: ["PAID", "PROCESSING", "DELIVERED"] },
            createdAt: { gte: startOfDay },
          },
          _count: { id: true },
        }),
      ]);

      const todayMap = new Map<string, number>();
      for (const row of todayOrders) {
        todayMap.set(row.gameId, row._count.id);
      }

      const sanitizedGames = games.map((g) => {
        const todayCount = todayMap.get(g.id) || 0;
        const isOutOfStock = Boolean(
          g.dailyLimit && g.dailyLimit > 0 && todayCount >= g.dailyLimit
        );
        return {
          ...g,
          imageUrl: maskCdnUrl(g.imageUrl) || g.imageUrl,
          dailyLimit: g.dailyLimit,
          todayPaidCount: todayCount,
          isOutOfStock,
        };
      });

      const sanitizedBanners = banners.map((b) => ({
        ...b,
        imageUrl: maskCdnUrl(b.imageUrl) || b.imageUrl,
      }));

      return { games: sanitizedGames, banners: sanitizedBanners };
    });
  },
  ["public-home-v3"],
  {
    tags: ["home", "games", "banners"],
    revalidate: PUBLIC_DATA_REVALIDATE_SECONDS,
  }
);

export const getPublicFaqs = unstable_cache(
  async () => {
    return prisma.faq.findMany({
      where: { active: true },
      orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
      select: {
        id: true,
        question: true,
        answer: true,
        category: true,
        sortOrder: true,
      },
    });
  },
  ["public-faqs-v2"],
  {
    tags: ["faqs"],
    revalidate: PUBLIC_DATA_REVALIDATE_SECONDS,
  }
);

const getCachedPublicGameBySlug = unstable_cache(
  async (slug: string) => {
    const game = await prisma.game.findUnique({
      where: { slug },
      select: {
        id: true,
        slug: true,
        name: true,
        publisher: true,
        description: true,
        imageUrl: true,
        bannerUrl: true,
        currencyName: true,
        uidLabel: true,
        uidExample: true,
        requiresServer: true,
        servers: true,
        categoryOrder: true,
        active: true,
        seoTitle: true,
        seoDescription: true,
        checkIdGameCode: true,
        dailyLimit: true,
        dailyLimitPerUser: true,
        updatedAt: true,
        products: {
          where: { active: true },
          orderBy: { sortOrder: "asc" },
          select: {
            id: true,
            name: true,
            amount: true,
            bonus: true,
            priceUsd: true,
            badge: true,
            category: true,
            imageUrl: true,
            inStock: true,
            sortOrder: true,
            stockLimit: true,
            dailyLimit: true,
            dailyLimitPerUser: true,
            updatedAt: true,
          },
        },
        randomPackages: {
          where: { active: true },
          orderBy: { sortOrder: "asc" },
          select: {
            id: true,
            name: true,
            description: true,
            priceUsd: true,
            badge: true,
            imageUrl: true,
            bannerUrl: true,
            sortOrder: true,
            inStock: true,
            slots: {
              select: {
                id: true,
                label: true,
                rewardAmount: true,
                rewardType: true,
                probability: true,
                color: true,
              },
              orderBy: { sortOrder: "asc" },
            },
          },
        },
      },
    });

    if (!game) return null;

    const startOfDay = getStartOfTodayCambodia();
    let isGameOutOfStock = false;
    let gameTodayPaidCount = 0;

    if (game.dailyLimit && game.dailyLimit > 0) {
      gameTodayPaidCount = await prisma.order.count({
        where: {
          gameId: game.id,
          status: { in: ["PAID", "PROCESSING", "DELIVERED"] },
          createdAt: { gte: startOfDay },
        },
      });
      if (gameTodayPaidCount >= game.dailyLimit) {
        isGameOutOfStock = true;
      }
    }

    const hasAnyLimit = game.products.some((p) => p.stockLimit || p.dailyLimit);
    const totalSoldMap = new Map<string, number>();
    const todaySoldMap = new Map<string, number>();

    if (hasAnyLimit) {
      const productIds = game.products.map((p) => p.id);

      const [totalPaidGroup, todayPaidGroup] = await Promise.all([
        prisma.order.groupBy({
          by: ["productId"],
          where: {
            productId: { in: productIds },
            status: { in: ["PAID", "PROCESSING", "DELIVERED"] },
          },
          _count: { id: true },
        }),
        prisma.order.groupBy({
          by: ["productId"],
          where: {
            productId: { in: productIds },
            status: { in: ["PAID", "PROCESSING", "DELIVERED"] },
            createdAt: { gte: startOfDay },
          },
          _count: { id: true },
        }),
      ]);

      for (const item of totalPaidGroup) {
        totalSoldMap.set(item.productId, item._count.id);
      }
      for (const item of todayPaidGroup) {
        todaySoldMap.set(item.productId, item._count.id);
      }
    }

    const normalProducts = game.products.map((p) => {
      const totalSold = totalSoldMap.get(p.id) || 0;
      const todaySold = todaySoldMap.get(p.id) || 0;

      const isStockExceeded = p.stockLimit !== null && p.stockLimit !== undefined && totalSold >= p.stockLimit;
      const isDailyExceeded = p.dailyLimit !== null && p.dailyLimit !== undefined && todaySold >= p.dailyLimit;
      const isAvailable = !isGameOutOfStock && p.inStock !== false && !isStockExceeded && !isDailyExceeded;

      return {
        ...p,
        imageUrl: maskCdnUrl(p.imageUrl) || p.imageUrl,
        isRandomSpin: false,
        randomPackageId: null,
        inStock: isAvailable,
        soldCount: totalSold,
        todaySoldCount: todaySold,
        isDailyLimitReached: isDailyExceeded,
        isStockLimitReached: isStockExceeded,
      };
    });

    const mysteryProducts = (game.randomPackages || []).map((pkg) => ({
      id: `spin_${pkg.id}`,
      name: pkg.name,
      amount: 0,
      bonus: 0,
      priceUsd: pkg.priceUsd,
      badge: pkg.badge || "🎡 Mystery Box",
      category: "🎡 Mystery Box",
      imageUrl: maskCdnUrl(pkg.imageUrl) || pkg.imageUrl,
      sortOrder: pkg.sortOrder,
      updatedAt: new Date(),
      isRandomSpin: true,
      randomPackageId: pkg.id,
      inStock: !isGameOutOfStock && (pkg as any).inStock !== false,
      description: pkg.description,
      slots: pkg.slots,
    }));

    return {
      ...game,
      imageUrl: maskCdnUrl(game.imageUrl) || game.imageUrl,
      bannerUrl: maskCdnUrl(game.bannerUrl),
      products: [...mysteryProducts, ...normalProducts],
      randomPackages: game.randomPackages,
      isOutOfStock: isGameOutOfStock,
      todayPaidCount: gameTodayPaidCount,
    };
  },
  ["public-game-by-slug-v2"],
  {
    tags: ["games", "products"],
    revalidate: PUBLIC_DATA_REVALIDATE_SECONDS,
  }
);

export function getPublicGameBySlug(slug: string) {
  return getCachedPublicGameBySlug(slug);
}
