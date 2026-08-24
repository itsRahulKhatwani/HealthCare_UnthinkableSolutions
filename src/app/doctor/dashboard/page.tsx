import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import Link from "next/link";

export default async function DoctorDashboard() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "DOCTOR") {
    redirect("/api/auth/signin");
  }

  const appointments = await prisma.appointment.findMany({
    where: { doctorId: session.user.id },
    include: { patient: true, symptomForm: true, visitNote: true },
    orderBy: { slotStart: "asc" },
  });

  return (
    <main className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Doctor Dashboard</h1>
            <p className="text-gray-500 mt-1">Welcome back, {session.user.name}</p>
          </div>
          <Link href="/" className="text-blue-600 hover:underline">Home</Link>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-xl font-semibold">Your Appointments</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-gray-500 text-sm">
                <tr>
                  <th className="px-6 py-3 font-medium">Date & Time</th>
                  <th className="px-6 py-3 font-medium">Patient</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium">AI Pre-Visit</th>
                  <th className="px-6 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {appointments.map((appt) => (
                  <tr key={appt.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-gray-900 font-medium">
                      {format(new Date(appt.slotStart), "MMM d, h:mm a")}
                    </td>
                    <td className="px-6 py-4 text-gray-600">{appt.patient.name}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 text-xs font-medium rounded-full
                        ${appt.status === "CONFIRMED" ? "bg-green-100 text-green-700" : ""}
                        ${appt.status === "COMPLETED" ? "bg-blue-100 text-blue-700" : ""}
                        ${appt.status === "HELD" ? "bg-orange-100 text-orange-700" : ""}
                        ${appt.status === "CANCELLED" || appt.status === "LEAVE_CONFLICT" ? "bg-red-100 text-red-700" : ""}
                      `}>
                        {appt.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {appt.symptomForm ? (
                        <div className="text-sm">
                          <p className="font-medium text-gray-900">Urgency: {appt.symptomForm.aiUrgency || "Unknown"}</p>
                          <p className="text-gray-500 truncate max-w-xs" title={(appt.symptomForm.aiSummary as { chiefComplaint?: string })?.chiefComplaint}>
                            {(appt.symptomForm.aiSummary as { chiefComplaint?: string })?.chiefComplaint || "No AI summary available"}
                          </p>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">N/A</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {appt.status === "CONFIRMED" && !appt.visitNote && (
                        <button className="text-sm text-blue-600 hover:underline font-medium">
                          Add Visit Note
                        </button>
                      )}
                      {appt.visitNote && (
                        <span className="text-sm text-green-600 font-medium flex items-center gap-1">
                          Completed
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                {appointments.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                      No appointments scheduled.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
