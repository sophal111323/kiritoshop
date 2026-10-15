import { prisma } from "@/lib/prisma";
import { notifyTelegram, escapeHtml } from "@/lib/telegram";
import { fulfillPaidOrder } from "@/lib/fulfillment";
import { getSupplier } from "@/lib/topup";
import { startBackgroundOrderTracker } from "@/lib/order-tracker";
import { markAffiliateOrderCompleted } from "@/lib/affiliate/store";
import { extractRedeemCode } from "@/lib/redeem";
import { consumeOrderCouponAtomically } from "@/lib/coupon";
import { generateOrderToken } from "@/lib/orderToken";
import { revalidateAdminChange } from "@/lib/adminRevalidate";
import { getStartOfTodayCambodia } from "@/lib/timeUtils";

/**
 * Runs post-payment work after an order safely transitions to PAID.
 *
 * Executes supplier top-up fulfillment and sends ONE SINGLE comprehensive
 * Telegram notification containing both payment details and fulfillment result.
 */
export async function notifyAndMaybeDeliverPaidOrder(orderId: string) {
  const fullOrder = await prisma.order.findUnique({
    where: { id: orderId },
    include: { game: true, product: true, randomPackage: true },
  });

  if (!fullOrder) return null;

  // ── Auto Stock Limit Check: Mark product out of stock when limit reached ──
  if (fullOrder.productId && fullOrder.product) {
    const p = fullOrder.product;
    if (p.stockLimit !== null && p.stockLimit !== undefined) {
      const paidOrdersCount = await prisma.order.count({
        where: {
          productId: p.id,
          status: { in: ["PAID", "PROCESSING", "DELIVERED"] },
        },
      });
      if (paidOrdersCount >= p.stockLimit && p.inStock !== false) {
        await prisma.product.update({
          where: { id: p.id },
          data: { inStock: false },
        });
        if (fullOrder.game?.slug) {
          revalidateAdminChange("products", { gameSlug: fullOrder.game.slug });
        }
        await notifyTelegram(
          `🔴 <b>[ទំនិញដាច់ស្តុក / OUT OF STOCK]</b>\n` +
            `ទំនិញ: <b>${escapeHtml(p.name)}</b> (${escapeHtml(fullOrder.game?.name)})\n` +
            `បានលក់គ្រប់ចំនួន: <b>${paidOrdersCount}/${p.stockLimit}</b>\n` +
            `ប្រព័ន្ធបានប្តូរទៅជា <b>Out of Stock (អស់ស្តុក)</b> ដោយស្វ័យប្រវត្តិ!`
        );
      }
    }
  }

  // ── Auto Game Daily Limit Check: Alert and revalidate when daily limit reached ──
  if (fullOrder.game && fullOrder.game.dailyLimit) {
    const startOfDay = getStartOfTodayCambodia();
    const gameTodayPaid = await prisma.order.count({
      where: {
        gameId: fullOrder.gameId,
        status: { in: ["PAID", "PROCESSING", "DELIVERED"] },
        createdAt: { gte: startOfDay },
      },
    });
    if (gameTodayPaid >= fullOrder.game.dailyLimit) {
      if (fullOrder.game?.slug) {
        revalidateAdminChange("games", { gameSlug: fullOrder.game.slug });
      }
      revalidateAdminChange("home");
      await notifyTelegram(
        `🔴 <b>[ហាងពេញកំណត់ប្រចាំថ្ងៃ / GAME DAILY LIMIT REACHED]</b>\n` +
          `ហាង: <b>${escapeHtml(fullOrder.game.name)}</b>\n` +
          `បានលក់គ្រប់ចំនួនថ្ងៃនេះ: <b>${gameTodayPaid}/${fullOrder.game.dailyLimit}</b>\n` +
          `ហ្គេមត្រូវបានបិទលើ Homepage ដោយស្វ័យប្រវត្តិ (Out of Stock)!`
      );
    }
  }

  // ── Promoter attribution: mark affiliate order completed ($0.04 credited)
  try {
    markAffiliateOrderCompleted(fullOrder.orderNumber);
  } catch (err) {
    console.error("Failed to mark affiliate order completed:", err);
  }

  // ── Random Spin / Mystery Box Order ────────────────────────────────────────
  // When an order is a random spin, payment is confirmed, but reward delivery
  // must wait until the user spins the wheel and clicks Claim.
  if (fullOrder.isRandomSpin && fullOrder.randomPackageId) {
    await prisma.randomSpinTransaction.upsert({
      where: { orderId: fullOrder.id },
      create: {
        orderId: fullOrder.id,
        orderNumber: fullOrder.orderNumber,
        packageId: fullOrder.randomPackageId,
        gameId: fullOrder.gameId,
        playerUid: fullOrder.playerUid,
        serverId: fullOrder.serverId,
        playerNickname: fullOrder.playerNickname,
        status: "PENDING",
      },
      update: {},
    });

    const baseUrl =
      process.env.PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || "";
    let spinLink = "";
    if (baseUrl) {
      try {
        const spinToken = generateOrderToken(fullOrder.orderNumber);
        spinLink = `\n<a href="${baseUrl}/spin/${fullOrder.orderNumber}?token=${spinToken}">🎡 Open Spin Wheel</a>`;
      } catch {
        // Order-token secret missing: omit the link rather than send one that 404s.
        spinLink = "";
      }
    }

    await notifyTelegram(
      `🎁 <b>Mystery Box Payment Successful!</b>\n` +
        `<b>#${escapeHtml(fullOrder.orderNumber)}</b>\n` +
        `${escapeHtml(fullOrder.game.name)} – ${escapeHtml(fullOrder.randomPackage?.name || "Mystery Box")}\n` +
        `UID: <code>${escapeHtml(fullOrder.playerUid)}</code>\n` +
        `Amount: $${fullOrder.amountUsd.toFixed(2)}\n` +
        `Status: 🎡 <b>Ready for Lucky Spin</b>${spinLink}`
    );

    return { ok: true, isRandomSpin: true, status: "PENDING" };
  }

  // ── Free Fire ឈុត (Manual Outfit / Set Delivery) ───────────────────────────
  const isFreeFireOutfit =
    fullOrder.game?.slug === "freefire-shop" ||
    fullOrder.game?.name?.includes("ឈុត") ||
    fullOrder.product?.name?.includes("ឈុត");

  if (isFreeFireOutfit) {
    await prisma.order.update({
      where: { id: fullOrder.id },
      data: {
        status: "PROCESSING",
        deliveryNote: "រង់ចាំប្រគល់អីវ៉ាន់ឈុត Free Fire ដោយ Admin (Telegram: @kiritostore46)",
      },
    });

    await consumeOrderCouponAtomically(fullOrder.id);

    const baseUrl =
      process.env.PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || "";
    const adminLink = baseUrl
      ? `\n<a href="${baseUrl}/admin/orders/${fullOrder.orderNumber}">👉 Open in Admin</a>`
      : "";

    await notifyTelegram(
      `🎽 <b>ការបញ្ជាទិញ Free Fire ឈុត ថ្មី!</b>\n` +
        `<b>#${escapeHtml(fullOrder.orderNumber)}</b>\n` +
        `ហ្គេម: ${escapeHtml(fullOrder.game.name)}\n` +
        `កញ្ចប់: ${escapeHtml(fullOrder.product.name)}\n` +
        `Player ID: <code>${escapeHtml(fullOrder.playerUid)}</code>\n` +
        `តម្លៃ: $${fullOrder.amountUsd.toFixed(2)} (${escapeHtml(fullOrder.paymentMethod || "KHQR")})\n` +
        `⚠️ <b>អតិថិជនបានទូទាត់រួចរាល់! ទំនាក់ទំនងមកកាន់ Telegram: @kiritostore46 ដើម្បីទទួលអីវ៉ាន់</b>${adminLink}`
    );

    return { ok: true, isFreeFireOutfit: true, status: "PROCESSING" };
  }

  // 1. Run fulfillment with silentTelegram so it doesn't send a duplicate message
  const fulfillmentResult = await fulfillPaidOrder(fullOrder.orderNumber, {
    silentTelegram: true,
  });

  // 2. Query updated order status after fulfillment
  const updatedOrder =
    (await prisma.order.findUnique({
      where: { id: orderId },
      include: { game: true, product: true },
    })) || fullOrder;

  const baseUrl =
    process.env.PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || "";
  const link = baseUrl
    ? `\n<a href="${baseUrl}/admin/orders/${updatedOrder.orderNumber}">Open in admin</a>`
    : "";

  // Buyer identity (nickname / contact / email)
  const customerLines = [
    updatedOrder.playerNickname
      ? `🎮 Nickname: ${escapeHtml(updatedOrder.playerNickname)}`
      : null,
    updatedOrder.customerEmail
      ? `📧 ${escapeHtml(updatedOrder.customerEmail)}`
      : null,
    updatedOrder.customerPhone
      ? `📱 ${escapeHtml(updatedOrder.customerPhone)}`
      : null,
  ].filter(Boolean);

  // Supplier & Topup status summary
  const supplierName =
    updatedOrder.product?.supplier || updatedOrder.topupProvider || "frozenyuki";
  const supplier = getSupplier(supplierName);
  const supplierDisplayName = supplier.displayName;

  let statusSection = "";
  if (updatedOrder.status === "DELIVERED") {
    await consumeOrderCouponAtomically(updatedOrder.id);
    const refText = updatedOrder.topupProviderRef
      ? ` (Ref: <code>${escapeHtml(updatedOrder.topupProviderRef)}</code>)`
      : "";
    statusSection = `✅ <b>Topup DELIVERED</b> via ${escapeHtml(supplierDisplayName)}${refText}`;
  } else if (updatedOrder.status === "PROCESSING") {
    const refText = updatedOrder.topupProviderRef
      ? `${escapeHtml(supplierDisplayName)} ref: <code>${escapeHtml(updatedOrder.topupProviderRef)}</code> (processing)`
      : `Processing via ${escapeHtml(supplierDisplayName)}`;
    statusSection = `⏳ <b>Topup PROCESSING:</b> ${refText}`;
  } else if (fulfillmentResult?.error || updatedOrder.failureReason) {
    const err =
      fulfillmentResult?.error || updatedOrder.failureReason || "Unknown error";
    statusSection = `⚠️ <b>Topup FAILED (${escapeHtml(supplierDisplayName)}) — Please process manually</b>\nError: ${escapeHtml(err)}`;
  } else {
    statusSection = `📦 <b>Status:</b> ${escapeHtml(updatedOrder.status)}`;
  }

  const redeemCode = extractRedeemCode(updatedOrder);
  const redeemLine = redeemCode
    ? `🎟️ <b>Redeem Code:</b> <code>${escapeHtml(redeemCode)}</code>\n`
    : "";

  // 3. Send ONE SINGLE unified Telegram notification
  await notifyTelegram(
    `💰 <b>Payment successful!</b>\n` +
      `<b>#${escapeHtml(updatedOrder.orderNumber)}</b>\n` +
      `${escapeHtml(updatedOrder.game.name)} – ${escapeHtml(updatedOrder.product.name)}\n` +
      `UID: <code>${escapeHtml(updatedOrder.playerUid)}</code>\n` +
      (customerLines.length > 0 ? `${customerLines.join("\n")}\n` : "") +
      `${redeemLine}` +
      `Amount: $${updatedOrder.amountUsd.toFixed(2)}\n` +
      `Method: ${escapeHtml(updatedOrder.paymentMethod || "KHQR")}\n` +
      `${statusSection}${link}`
  );

  // 4. Auto-track upstream delivery in background if order is PROCESSING
  if (updatedOrder.status === "PROCESSING" && updatedOrder.topupProviderRef) {
    startBackgroundOrderTracker(updatedOrder.orderNumber);
  }

  return fulfillmentResult;
}
