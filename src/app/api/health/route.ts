import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // Check DB connectivity
    await prisma.$queryRaw`SELECT 1`;

    // (Optional) Here you could fetch the last run time of crons from an event log,
    // if you have a model storing cron run history. Otherwise, we can return ok status.
    
    return NextResponse.json({
      status: "healthy",
      db: "connected",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "unhealthy",
        db: "disconnected",
        error: (error as Error).message,
      },
      { status: 503 }
    );
  }
}
