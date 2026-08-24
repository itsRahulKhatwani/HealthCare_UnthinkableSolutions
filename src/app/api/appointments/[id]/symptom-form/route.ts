import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { errorResponse, successResponse } from "@/lib/api-response";
import { generatePreVisitSummary } from "@/lib/gemini";
import { logger } from "@/lib/logger";
import { NotificationType, NotificationChannel } from "@prisma/client";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }

    const { rawSymptoms } = await req.json();
    if (!rawSymptoms) {
      return errorResponse("Symptoms are required", "INVALID_REQUEST", 400);
    }

    const appointment = await prisma.appointment.findUnique({
      where: { id: params.id },
      include: { doctor: true, patient: true },
    });

    if (!appointment) {
      return errorResponse("Appointment not found", "NOT_FOUND", 404);
    }

    if (appointment.patientId !== session.user.id && session.user.role !== "ADMIN") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 403);
    }

    if (appointment.status !== "HELD") {
      return errorResponse("Appointment is not in HELD status", "INVALID_STATUS", 400);
    }

    // Generate AI Summary (this does not block confirmation if it fails)
    const aiResult = await generatePreVisitSummary(rawSymptoms);

    // Confirm appointment and save symptom form in a transaction
    const [updatedAppt, symptomForm] = await prisma.$transaction([
      prisma.appointment.update({
        where: { id: appointment.id },
        data: {
          status: "CONFIRMED",
          heldUntil: null,
        },
      }),
      prisma.symptomForm.create({
        data: {
          appointmentId: appointment.id,
          rawSymptoms,
          aiSummary: aiResult.aiSummary || {},
          aiUrgency: aiResult.aiUrgency,
          aiStatus: aiResult.aiStatus,
        },
      }),
      // Queue Email Notifications
      prisma.notification.create({
        data: {
          appointmentId: appointment.id,
          type: NotificationType.BOOKING_CONFIRM,
          channel: NotificationChannel.EMAIL,
          payload: { recipient: appointment.patient.email, role: "PATIENT" },
        },
      }),
      prisma.notification.create({
        data: {
          appointmentId: appointment.id,
          type: NotificationType.BOOKING_CONFIRM,
          channel: NotificationChannel.EMAIL,
          payload: { recipient: appointment.doctor.email, role: "DOCTOR" },
        },
      }),
      // Queue Calendar Event creation (could also be handled via background job or synchronously here)
      prisma.notification.create({
        data: {
          appointmentId: appointment.id,
          type: NotificationType.BOOKING_CONFIRM,
          channel: NotificationChannel.CALENDAR,
        },
      }),
    ]);

    logger.info("Appointment confirmed via symptom form", { appointmentId: appointment.id });

    return successResponse({ appointment: updatedAppt, symptomForm }, 200);
  } catch (error: unknown) {
    logger.error("Error confirming appointment", { error: (error instanceof Error ? error.message : String(error)) });
    return errorResponse("Internal server error", "INTERNAL_ERROR", 500);
  }
}
