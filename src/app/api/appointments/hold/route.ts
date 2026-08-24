import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { errorResponse, successResponse } from "@/lib/api-response";
import { logger } from "@/lib/logger";

export async function POST() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }

    const body = await req.json();
    const { doctorId, slotStart, slotEnd } = body;

    if (!doctorId || !slotStart || !slotEnd) {
      return errorResponse("Missing required fields", "INVALID_REQUEST", 400);
    }

    const patientId = session.user.id;
    const start = new Date(slotStart);
    const end = new Date(slotEnd);
    const heldUntil = new Date(Date.now() + 7 * 60 * 1000); // 7 minutes from now

    // Concurrency guard: Create the hold
    // We rely on the DB unique constraint on (doctorId, slotStart)
    const appointment = await prisma.appointment.create({
      data: {
        doctorId,
        patientId,
        slotStart: start,
        slotEnd: end,
        status: "HELD",
        heldUntil,
      },
    });

    logger.info("Slot hold created", { appointmentId: appointment.id, doctorId, patientId, slotStart });

    return successResponse({ appointment }, 200);
  } catch (error: unknown) {
    // Prisma unique constraint violation code
    if (error.code === "P2002") {
      logger.warn("Concurrency guard triggered: Slot just taken", { error: (error instanceof Error ? error.message : String(error)) });
      return errorResponse("This slot was just taken by someone else.", "SLOT_TAKEN", 409);
    }

    logger.error("Error creating slot hold", { error: (error instanceof Error ? error.message : String(error)) });
    return errorResponse("Internal server error", "INTERNAL_ERROR", 500);
  }
}
