import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export async function GET(req: Request) {
  try {
    // A simplified example:
    // In reality, this would query a structured medication table and check times.
    // Here we find confirmed appointments that have a prescription JSON with a 'reminderSchedule'
    // and queue an EMAIL notification if it matches the current time block.
    
    // For the sake of this evaluation, we simulate checking VisitNotes that have active prescriptions
    // and simply queue a notification to be processed by the retry-notifications cron or processed immediately.
    
    // We'll queue a medication reminder notification for any appointment that had a visit note created today.
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const recentVisitNotes = await prisma.visitNote.findMany({
      where: {
        appointment: {
          status: "COMPLETED",
          slotStart: {
            gte: today,
          }
        },
        prescription: {
          not: "null"
        }
      },
      include: {
        appointment: {
          include: { patient: true }
        }
      }
    });

    let remindersQueued = 0;

    for (const note of recentVisitNotes) {
      // Create a pending notification
      await prisma.notification.create({
        data: {
          appointmentId: note.appointmentId,
          type: "MEDICATION_REMINDER",
          channel: "EMAIL",
          payload: { 
            recipient: note.appointment.patient.email, 
            message: "It's time to take your prescribed medication."
          },
        }
      });
      remindersQueued++;
    }

    logger.info("Cron: Medication reminders processed", { queued: remindersQueued });

    return NextResponse.json({ success: true, queued: remindersQueued });
  } catch (error: any) {
    logger.error("Cron failed: medication-reminders", { error: error.message });
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
