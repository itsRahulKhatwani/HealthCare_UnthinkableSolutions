import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";

export default async function AdminDashboard() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "ADMIN") {
    redirect("/api/auth/signin");
  }

  const doctors = await prisma.user.findMany({
    where: { role: "DOCTOR" },
    include: { doctorProfile: true },
  });

  const leaves = await prisma.doctorLeave.findMany({
    include: { doctor: true },
    orderBy: { date: "desc" },
    take: 10,
  });

  // Calculate Metrics
  const totalAppointments = await prisma.appointment.count();
  const successfulSummaries = await prisma.symptomForm.count({ where: { aiStatus: "SUCCESS" } });
  const failedSummaries = await prisma.symptomForm.count({ where: { aiStatus: "FAILED" } });
  
  const totalNotifications = await prisma.notification.count();
  const failedNotifications = await prisma.notification.count({ where: { status: "FAILED" } });

  return (
    <main className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-500 mt-1">System Overview and Management</p>
          </div>
          <Link href="/" className="text-blue-600 hover:underline">Home</Link>
        </div>

        {/* Metrics Grid */}
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-gray-500 text-sm font-medium">Total Appointments</h3>
            <p className="text-3xl font-bold text-gray-900 mt-2">{totalAppointments}</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-gray-500 text-sm font-medium">AI Summary Status</h3>
            <div className="mt-2 flex items-baseline gap-4">
              <div>
                <p className="text-2xl font-bold text-green-600">{successfulSummaries}</p>
                <p className="text-xs text-gray-500">Success</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">{failedSummaries}</p>
                <p className="text-xs text-gray-500">Failed</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-gray-500 text-sm font-medium">Notification Status</h3>
            <div className="mt-2 flex items-baseline gap-4">
              <div>
                <p className="text-2xl font-bold text-blue-600">{totalNotifications}</p>
                <p className="text-xs text-gray-500">Total</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">{failedNotifications}</p>
                <p className="text-xs text-gray-500">Failed</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Doctors List */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-semibold">Doctors Directory</h2>
            </div>
            <ul className="divide-y divide-gray-100">
              {doctors.map(doc => (
                <li key={doc.id} className="p-6 hover:bg-gray-50">
                  <p className="font-semibold text-gray-900">{doc.name}</p>
                  <p className="text-sm text-gray-500">{doc.doctorProfile?.specialisation}</p>
                  <p className="text-xs text-gray-400 mt-1">Hours: {doc.doctorProfile?.workingHoursStart} - {doc.doctorProfile?.workingHoursEnd}</p>
                </li>
              ))}
            </ul>
          </div>

          {/* Recent Leaves */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-semibold">Recent Doctor Leaves</h2>
            </div>
            <ul className="divide-y divide-gray-100">
              {leaves.map(leave => (
                <li key={leave.id} className="p-6 hover:bg-gray-50 flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-gray-900">{leave.doctor.name}</p>
                    <p className="text-sm text-gray-500">Reason: {leave.reason}</p>
                  </div>
                  <span className="text-sm font-medium text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                    {format(new Date(leave.date), "MMM d, yyyy")}
                  </span>
                </li>
              ))}
              {leaves.length === 0 && (
                <li className="p-6 text-gray-500 text-center">No leaves recorded.</li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </main>
  );
}
