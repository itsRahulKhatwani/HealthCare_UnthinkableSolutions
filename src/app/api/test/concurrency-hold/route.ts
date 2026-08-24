import { prisma } from "@/lib/prisma";
import { errorResponse, successResponse } from "@/lib/api-response";

// TEST ONLY ENDPOINT
export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return errorResponse("Not found", "NOT_FOUND", 404);
  }

  try {
    const body = await req.json();
    const { doctorId, patientId, slotStart, slotEnd } = body;

    const start = new Date(slotStart);
    const end = new Date(slotEnd);
    const heldUntil = new Date(Date.now() + 7 * 60 * 1000);

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

    return successResponse({ appointment }, 200);
  } catch (error: unknown) {
    if (typeof error === "object" && error !== null && "code" in error && (error as { code: string }).code === "P2002") {
      return errorResponse("This slot was just taken by someone else.", "SLOT_TAKEN", 409);
    }
    return errorResponse("Internal server error", "INTERNAL_ERROR", 500);
  }
}
