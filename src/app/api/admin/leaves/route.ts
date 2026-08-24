import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { errorResponse, successResponse } from "@/lib/api-response";
import { logger } from "@/lib/logger";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }

    const { doctorId, date, reason } = await req.json();

    if (!doctorId || !date || !reason) {
      return errorResponse("Missing required fields", "INVALID_REQUEST", 400);
    }

    const leaveDate = new Date(date);
    leaveDate.setHours(0, 0, 0, 0);
    const nextDate = new Date(leaveDate);
    nextDate.setDate(nextDate.getDate() + 1);

    // Create the leave record
    const leave = await prisma.doctorLeave.create({
      data: {
        doctorId,
        date: leaveDate,
        reason,
      },
    });

    // Find conflicting confirmed appointments on that date
    const conflicts = await prisma.appointment.findMany({
      where: {
        doctorId,
        status: "CONFIRMED",
        slotStart: {
          gte: leaveDate,
          lt: nextDate,
        },
      },
      include: {
        patient: true,
      },
    });

    if (conflicts.length > 0) {
      const conflictIds = conflicts.map(c => c.id);

      // Update statuses to LEAVE_CONFLICT
      await prisma.appointment.updateMany({
        where: { id: { in: conflictIds } },
        data: { status: "LEAVE_CONFLICT" },
      });

      // Queue notifications for affected patients
      for (const conflict of conflicts) {
        await prisma.notification.create({
          data: {
            appointmentId: conflict.id,
            type: "LEAVE_CONFLICT",
            channel: "EMAIL",
            payload: {
              recipient: conflict.patient.email,
              subject: "Important: Appointment Cancellation",
              message: `Your appointment on ${conflict.slotStart.toLocaleString()} has been cancelled because the doctor is on leave (${reason}). Please rebook.`,
            },
          },
        });
        
        await prisma.notification.create({
          data: {
            appointmentId: conflict.id,
            type: "LEAVE_CONFLICT",
            channel: "CALENDAR",
          },
        });
      }

      logger.info("Admin created doctor leave with conflicts", { doctorId, leaveDate, conflictsCount: conflicts.length });
    } else {
      logger.info("Admin created doctor leave (no conflicts)", { doctorId, leaveDate });
    }

    return successResponse({
      leave,
      conflictsResolved: conflicts.length,
    });
  } catch (error: any) {
    logger.error("Error creating doctor leave", { error: error.message });
    return errorResponse("Internal server error", "INTERNAL_ERROR", 500);
  }
}
