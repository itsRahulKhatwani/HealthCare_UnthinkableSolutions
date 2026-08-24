import { PrismaClient, Role, AppointmentStatus, AiStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import { addDays, setHours, setMinutes, startOfToday } from "date-fns";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Clean existing
  await prisma.calendarEvent.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.visitNote.deleteMany();
  await prisma.symptomForm.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.doctorLeave.deleteMany();
  await prisma.doctorProfile.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash("password123", 10);

  // Create Admin
  const admin = await prisma.user.create({
    data: {
      email: "admin@healthcare.com",
      name: "Admin User",
      role: Role.ADMIN,
      passwordHash,
    },
  });

  // Create Patient
  const patient = await prisma.user.create({
    data: {
      email: "patient@example.com",
      name: "John Doe",
      role: Role.PATIENT,
      passwordHash,
    },
  });

  // Create Doctors
  const doc1 = await prisma.user.create({
    data: {
      email: "dr.smith@healthcare.com",
      name: "Dr. Smith (Cardiologist)",
      role: Role.DOCTOR,
      passwordHash,
      doctorProfile: {
        create: {
          specialisation: "Cardiology",
          workingHoursStart: "09:00",
          workingHoursEnd: "17:00",
          slotDurationMinutes: 30,
        },
      },
    },
  });

  const doc2 = await prisma.user.create({
    data: {
      email: "dr.jones@healthcare.com",
      name: "Dr. Jones (Dermatologist)",
      role: Role.DOCTOR,
      passwordHash,
      doctorProfile: {
        create: {
          specialisation: "Dermatology",
          workingHoursStart: "10:00",
          workingHoursEnd: "16:00",
          slotDurationMinutes: 15,
        },
      },
    },
  });

  // Create a leave day for doc1 tomorrow
  const tomorrow = addDays(startOfToday(), 1);
  await prisma.doctorLeave.create({
    data: {
      doctorId: doc1.id,
      date: tomorrow,
      reason: "Medical Conference",
    },
  });

  // Create some appointments
  const slotStart = setMinutes(setHours(startOfToday(), 10), 0);
  const slotEnd = setMinutes(setHours(startOfToday(), 10), 30);

  const appt1 = await prisma.appointment.create({
    data: {
      doctorId: doc1.id,
      patientId: patient.id,
      slotStart,
      slotEnd,
      status: AppointmentStatus.CONFIRMED,
      symptomForm: {
        create: {
          rawSymptoms: "Mild chest pain and shortness of breath.",
          aiSummary: { 
            chiefComplaint: "Chest pain",
            questions: ["When did it start?", "Is it sharp or dull?"]
          },
          aiUrgency: "HIGH",
          aiStatus: AiStatus.SUCCESS,
        }
      }
    },
  });

  console.log("Database seeded successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
