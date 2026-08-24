import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { errorResponse, successResponse } from "@/lib/api-response";
import { generatePostVisitSummary } from "@/lib/gemini";
import { logger } from "@/lib/logger";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== "DOCTOR" && session.user.role !== "ADMIN")) {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
    }

    const { doctorNotes, prescription } = await req.json();

    const appointment = await prisma.appointment.findUnique({
      where: { id: params.id },
    });

    if (!appointment) {
      return errorResponse("Appointment not found", "NOT_FOUND", 404);
    }

    if (appointment.doctorId !== session.user.id && session.user.role !== "ADMIN") {
      return errorResponse("Unauthorized", "UNAUTHORIZED", 403);
    }

    // Generate patient-friendly summary via Gemini
    const aiResult = await generatePostVisitSummary(doctorNotes, prescription);

    // Save the visit note
    const visitNote = await prisma.visitNote.create({
      data: {
        appointmentId: appointment.id,
        doctorNotes,
        prescription: prescription || {},
        aiPatientSummary: aiResult.aiPatientSummary,
        aiStatus: aiResult.aiStatus,
      },
    });

    // Update appointment status to COMPLETED
    const updatedAppt = await prisma.appointment.update({
      where: { id: appointment.id },
      data: { status: "COMPLETED" },
    });

    logger.info("Visit note saved and appointment completed", { appointmentId: appointment.id });

    return successResponse({ appointment: updatedAppt, visitNote });
  } catch (error: unknown) {
    logger.error("Error saving visit note", { error: (error instanceof Error ? error.message : String(error)) });
    return errorResponse("Internal server error", "INTERNAL_ERROR", 500);
  }
}
