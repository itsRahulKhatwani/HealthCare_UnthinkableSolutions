import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse, successResponse } from "@/lib/api-response";
import { addMinutes, setHours, setMinutes, isSameDay } from "date-fns";

export async function GET(
  req: Request,
  { params }: { params: { doctorId: string } }
) {
  try {
    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get("date");
    
    if (!dateParam) {
      return errorResponse("Date is required (YYYY-MM-DD)", "INVALID_REQUEST", 400);
    }

    const queryDate = new Date(dateParam);
    queryDate.setHours(0, 0, 0, 0);

    const nextDate = new Date(queryDate);
    nextDate.setDate(nextDate.getDate() + 1);

    // Get doctor profile
    const profile = await prisma.doctorProfile.findUnique({
      where: { userId: params.doctorId },
    });

    if (!profile) {
      return errorResponse("Doctor profile not found", "NOT_FOUND", 404);
    }

    // Check for leave
    const leave = await prisma.doctorLeave.findFirst({
      where: {
        doctorId: params.doctorId,
        date: queryDate,
      },
    });

    if (leave) {
      return successResponse({ availableSlots: [] }); // Doctor is on leave
    }

    // Fetch existing appointments (CONFIRMED or unexpired HELD)
    const now = new Date();
    const existingAppointments = await prisma.appointment.findMany({
      where: {
        doctorId: params.doctorId,
        slotStart: { gte: queryDate, lt: nextDate },
        OR: [
          { status: "CONFIRMED" },
          { status: "COMPLETED" },
          {
            status: "HELD",
            heldUntil: { gt: now },
          },
        ],
      },
      select: {
        slotStart: true,
      },
    });

    const bookedTimes = new Set(existingAppointments.map(a => a.slotStart.getTime()));

    // Generate slots
    const [startH, startM] = profile.workingHoursStart.split(":").map(Number);
    const [endH, endM] = profile.workingHoursEnd.split(":").map(Number);

    let currentSlot = setMinutes(setHours(new Date(queryDate), startH), startM);
    const endTime = setMinutes(setHours(new Date(queryDate), endH), endM);

    const availableSlots: string[] = [];

    while (currentSlot < endTime) {
      const slotEnd = addMinutes(currentSlot, profile.slotDurationMinutes);
      if (slotEnd > endTime) break; // Don't overflow the end time

      // Also filter out past slots if queryDate is today
      if (currentSlot.getTime() > now.getTime() && !bookedTimes.has(currentSlot.getTime())) {
        availableSlots.push(currentSlot.toISOString());
      }
      
      currentSlot = addMinutes(currentSlot, profile.slotDurationMinutes);
    }

    return successResponse({ availableSlots });
  } catch (error: any) {
    return errorResponse("Internal server error", "INTERNAL_ERROR", 500);
  }
}
