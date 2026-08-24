import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export async function GET() {
  // In a real Vercel Cron, you would verify the authorization header:
  // if (req.headers.get("Authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
  //   return new NextResponse("Unauthorized", { status: 401 });
  // }

  try {
    const now = new Date();

    const released = await prisma.appointment.deleteMany({
      where: {
        status: "HELD",
        heldUntil: {
          lt: now,
        },
      },
    });

    logger.info("Cron: Released expired holds", { count: released.count });

    return NextResponse.json({ success: true, count: released.count });
  } catch (error: unknown) {
    logger.error("Cron failed: release-holds", { error: (error instanceof Error ? error.message : String(error)) });
    return NextResponse.json({ success: false, error: (error instanceof Error ? error.message : String(error)) }, { status: 500 });
  }
}
