import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { withAdminAuth } from "@/lib/withAdminAuth";
import { writeAuditForAdmin } from "@/lib/audit";
import { revalidateAdminChange } from "@/lib/adminRevalidate";

export const dynamic = "force-dynamic";

export const POST = withAdminAuth(
  async (req, _ctx, admin) => {
    const body = await req.json().catch(() => ({}));
    const { gameId, stockLimit, dailyLimit, dailyLimitPerUser } = body;

    if (!gameId || typeof gameId !== "string") {
      return NextResponse.json({ error: "Game ID is required" }, { status: 400 });
    }

    const game = await prisma.game.findUnique({ where: { id: gameId } });
    if (!game) {
      return NextResponse.json({ error: "Game not found" }, { status: 404 });
    }

    const updateData: Record<string, any> = {};

    if (stockLimit !== undefined) {
      updateData.stockLimit =
        stockLimit === null || stockLimit === "" ? null : Math.max(0, parseInt(String(stockLimit), 10));
    }
    if (dailyLimit !== undefined) {
      updateData.dailyLimit =
        dailyLimit === null || dailyLimit === "" ? null : Math.max(0, parseInt(String(dailyLimit), 10));
    }
    if (dailyLimitPerUser !== undefined) {
      updateData.dailyLimitPerUser =
        dailyLimitPerUser === null || dailyLimitPerUser === ""
          ? null
          : Math.max(0, parseInt(String(dailyLimitPerUser), 10));
    }

    const result = await prisma.product.updateMany({
      where: { gameId },
      data: updateData,
    });

    await writeAuditForAdmin(admin, req, {
      action: "product.batch_limits",
      targetType: "game",
      targetId: gameId,
      details: {
        gameName: game.name,
        updatedCount: result.count,
        limits: updateData,
      },
    });

    revalidateAdminChange("products", { gameSlug: game.slug });

    return NextResponse.json({
      success: true,
      updatedCount: result.count,
      limits: updateData,
    });
  },
  { permission: "products.write" }
);
