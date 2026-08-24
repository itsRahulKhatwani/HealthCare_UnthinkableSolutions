import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import BookingContainer from "./BookingContainer";
import Link from "next/link";
import { ArrowLeft, UserRound } from "lucide-react";

export default async function BookDoctorPage({ params }: { params: { doctorId: string } }) {
  const doctor = await prisma.user.findFirst({
    where: { id: params.doctorId, role: "DOCTOR" },
    include: { doctorProfile: true },
  });

  if (!doctor || !doctor.doctorProfile) {
    notFound();
  }

  return (
    <main className="min-h-screen relative overflow-hidden bg-background">
      {/* Dynamic Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 bg-grid-white/[0.02]">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[120px] animate-blob" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[30%] h-[50%] bg-blue-600/20 rounded-full blur-[100px] animate-blob animation-delay-4000" />
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12 relative z-10 space-y-8">
        <Link href="/" className="inline-flex items-center text-sm font-medium text-gray-400 hover:text-white transition-colors group">
          <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" /> 
          Return to Specialists
        </Link>
        
        <div className="glass-panel p-8 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-6 border border-white/10 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 blur-[50px] pointer-events-none" />
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-blue-600 p-[2px]">
              <div className="w-full h-full bg-background rounded-full flex items-center justify-center">
                <UserRound className="w-8 h-8 text-white/80" />
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-extrabold text-white tracking-tight">Consultation with {doctor.name}</h1>
              <span className="inline-block mt-2 px-3 py-1 bg-primary/10 text-primary border border-primary/20 rounded-full text-sm font-medium">
                {doctor.doctorProfile.specialisation}
              </span>
            </div>
          </div>
        </div>

        <BookingContainer doctorId={doctor.id} />
      </div>
    </main>
  );
}
