import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export default async function Home() {
  const session = await getServerSession(authOptions);
  const doctors = await prisma.user.findMany({
    where: { role: "DOCTOR" },
    include: { doctorProfile: true },
  });

  return (
    <main className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Healthcare Appointment Manager</h1>
            <p className="text-gray-500 mt-1">Book and manage your healthcare follow-ups.</p>
          </div>
          <div>
            {session ? (
              <div className="text-right">
                <p className="font-medium text-gray-900">{session.user.name}</p>
                <p className="text-sm text-gray-500">{session.user.role}</p>
                {session.user.role === "ADMIN" && (
                  <Link href="/admin/dashboard" className="text-blue-600 hover:underline text-sm block mt-1">Admin Dashboard</Link>
                )}
                {session.user.role === "DOCTOR" && (
                  <Link href="/doctor/dashboard" className="text-blue-600 hover:underline text-sm block mt-1">Doctor Dashboard</Link>
                )}
              </div>
            ) : (
              <Link href="/api/auth/signin" className="px-5 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition shadow-sm">
                Sign In
              </Link>
            )}
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-semibold mb-6 text-gray-800">Our Specialists</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {doctors.map(doctor => (
              <div key={doctor.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <h3 className="text-xl font-semibold text-gray-900">{doctor.name}</h3>
                <p className="text-blue-600 font-medium mb-4">{doctor.doctorProfile?.specialisation}</p>
                
                <div className="text-sm text-gray-600 mb-6 space-y-1">
                  <p>Working Hours: {doctor.doctorProfile?.workingHoursStart} - {doctor.doctorProfile?.workingHoursEnd}</p>
                  <p>Consultation Time: {doctor.doctorProfile?.slotDurationMinutes} mins</p>
                </div>
                
                <Link
                  href={`/book/${doctor.id}`}
                  className="inline-block w-full text-center px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition"
                >
                  Book Appointment
                </Link>
              </div>
            ))}
            
            {doctors.length === 0 && (
              <p className="text-gray-500 italic">No doctors available currently. Please run the seed script to populate demo data.</p>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
