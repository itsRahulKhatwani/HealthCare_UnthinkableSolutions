import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { Activity, ShieldCheck, Clock, CalendarDays, ArrowRight } from "lucide-react";

export default async function Home() {
  const session = await getServerSession(authOptions);
  const doctors = await prisma.user.findMany({
    where: { role: "DOCTOR" },
    include: { doctorProfile: true },
  });

  return (
    <main className="min-h-screen relative overflow-hidden bg-background">
      {/* Dynamic Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 bg-grid-white/[0.02]">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/30 rounded-full blur-[120px] animate-blob" />
        <div className="absolute top-[20%] right-[-10%] w-[30%] h-[50%] bg-blue-600/20 rounded-full blur-[100px] animate-blob animation-delay-2000" />
        <div className="absolute bottom-[-20%] left-[20%] w-[50%] h-[40%] bg-violet-600/20 rounded-full blur-[120px] animate-blob animation-delay-4000" />
      </div>

      {/* Header */}
      <nav className="fixed top-0 w-full z-50 glass border-b border-white/5 transition-all">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
              <Activity className="text-white w-6 h-6" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">HealthSync</span>
          </div>
          
          <div className="flex items-center gap-6">
            {session ? (
              <div className="flex items-center gap-4">
                <div className="text-right hidden sm:block">
                  <p className="font-semibold text-white text-sm">{session.user.name}</p>
                  <p className="text-xs text-primary font-medium tracking-wide">{session.user.role}</p>
                </div>
                {session.user.role === "ADMIN" && (
                  <Link href="/admin/dashboard" className="px-5 py-2.5 glass rounded-full text-white text-sm font-medium hover:bg-white/10 transition">Dashboard</Link>
                )}
                {session.user.role === "DOCTOR" && (
                  <Link href="/doctor/dashboard" className="px-5 py-2.5 glass rounded-full text-white text-sm font-medium hover:bg-white/10 transition">Dashboard</Link>
                )}
              </div>
            ) : (
              <Link href="/api/auth/signin" className="px-6 py-2.5 bg-white text-black rounded-full font-semibold hover:scale-105 transition shadow-[0_0_20px_rgba(255,255,255,0.3)]">
                Sign In
              </Link>
            )}
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 pt-32 pb-24">
        {/* Hero Section */}
        <div className="pt-20 pb-32 text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border-primary/30 mb-8 animate-float">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary-foreground/80">Next-Generation Healthcare Scheduling</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 text-transparent bg-clip-text bg-gradient-to-r from-white via-primary-foreground to-gray-400">
            Book your follow-ups with <span className="text-glow bg-clip-text text-transparent bg-gradient-to-r from-primary to-blue-500">absolute precision.</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-400 mb-12 max-w-2xl mx-auto leading-relaxed text-balance">
            Experience frictionless healthcare scheduling. Real-time availability, instant AI-powered symptom analysis, and guaranteed slot reservations.
          </p>
        </div>

        {/* Doctors Grid */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-12">
            <CalendarDays className="w-8 h-8 text-primary" />
            <h2 className="text-3xl font-bold text-white">Available Specialists</h2>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {doctors.map((doctor, i) => (
              <div 
                key={doctor.id} 
                className="group glass-panel rounded-2xl p-1 transition-all duration-500 hover:scale-[1.02] hover:shadow-[0_0_40px_rgba(139,92,246,0.15)]"
                style={{ animationDelay: `${i * 150}ms` }}
              >
                <div className="bg-background/80 rounded-xl p-6 h-full border border-white/5 group-hover:border-primary/30 transition-colors">
                  <div className="flex justify-between items-start mb-6">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-gray-800 to-gray-900 border border-white/10 flex items-center justify-center">
                      <span className="text-xl font-bold text-white">{doctor.name.charAt(0)}</span>
                    </div>
                    <span className="px-3 py-1 text-xs font-medium bg-primary/10 text-primary rounded-full border border-primary/20">
                      {doctor.doctorProfile?.specialisation}
                    </span>
                  </div>
                  
                  <h3 className="text-xl font-bold text-white mb-2">{doctor.name}</h3>
                  
                  <div className="space-y-3 mb-8">
                    <div className="flex items-center gap-3 text-sm text-gray-400">
                      <Clock className="w-4 h-4 text-primary" />
                      <span>{doctor.doctorProfile?.workingHoursStart} - {doctor.doctorProfile?.workingHoursEnd}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-400">
                      <Activity className="w-4 h-4 text-blue-500" />
                      <span>{doctor.doctorProfile?.slotDurationMinutes} min consultations</span>
                    </div>
                  </div>
                  
                  <Link
                    href={`/book/${doctor.id}`}
                    className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-white/5 hover:bg-primary text-white rounded-lg font-medium transition-all duration-300 group-hover:shadow-[0_0_20px_rgba(139,92,246,0.3)]"
                  >
                    Check Availability
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>
            ))}
            
            {doctors.length === 0 && (
              <div className="col-span-full glass-panel p-12 text-center rounded-2xl">
                <p className="text-gray-400 text-lg">No specialists available currently. Please run the seed script.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
