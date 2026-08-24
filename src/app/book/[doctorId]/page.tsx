import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import BookingContainer from "./BookingContainer";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function BookDoctorPage({ params }: { params: { doctorId: string } }) {
  const doctor = await prisma.user.findUnique({
    where: { id: params.doctorId, role: "DOCTOR" },
    include: { doctorProfile: true },
  });

  if (!doctor || !doctor.doctorProfile) {
    notFound();
  }

  return (
    <main className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-4xl mx-auto space-y-8">
        <Link href="/" className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 transition">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to doctors
        </Link>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Book Appointment with {doctor.name}</h1>
            <p className="text-gray-500 mt-1">{doctor.doctorProfile.specialisation}</p>
          </div>
        </div>

        <BookingContainer doctorId={doctor.id} />
      </div>
    </main>
  );
}
