"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Clock, Calendar, CheckCircle, AlertCircle, ArrowRight, Activity } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function BookingFlow({ doctorId, availableSlots }: { doctorId: string, availableSlots: string[] }) {
  const router = useRouter();
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [heldAppointmentId, setHeldAppointmentId] = useState<string | null>(null);
  const [heldUntil, setHeldUntil] = useState<Date | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [rawSymptoms, setRawSymptoms] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Countdown timer logic
  useEffect(() => {
    if (!heldUntil) return;

    const interval = setInterval(() => {
      const remaining = Math.floor((heldUntil.getTime() - Date.now()) / 1000);
      if (remaining <= 0) {
        clearInterval(interval);
        setTimeLeft(0);
        setError("Your slot hold has expired. Please select a slot again.");
        setHeldAppointmentId(null);
        setHeldUntil(null);
        setSelectedSlot(null);
      } else {
        setTimeLeft(remaining);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [heldUntil]);

  const formatTimeLeft = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const handleHoldSlot = async (slotStart: string) => {
    setLoading(true);
    setError(null);
    try {
      const slotEnd = new Date(new Date(slotStart).getTime() + 30 * 60000).toISOString();
      
      const res = await fetch("/api/appointments/hold", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doctorId, slotStart, slotEnd }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error?.message || "Failed to hold slot");
      }
      
      setSelectedSlot(slotStart);
      setHeldAppointmentId(data.appointment.id);
      setHeldUntil(new Date(data.appointment.heldUntil));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!heldAppointmentId || !rawSymptoms) return;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/appointments/${heldAppointmentId}/symptom-form`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawSymptoms }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error?.message || "Failed to confirm booking");
      }
      
      setSuccess(true);
      setHeldUntil(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center p-16 text-center glass-card rounded-2xl relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-green-500/10 to-transparent pointer-events-none" />
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", bounce: 0.5, delay: 0.2 }}
        >
          <CheckCircle className="w-20 h-20 text-green-400 mb-6 drop-shadow-[0_0_15px_rgba(74,222,128,0.5)]" />
        </motion.div>
        <h2 className="text-3xl font-extrabold text-white mb-3">Booking Confirmed!</h2>
        <p className="text-gray-400 mb-8 max-w-sm">Your appointment has been successfully scheduled. We&apos;ve sent a confirmation email.</p>
        <button 
          onClick={() => router.push("/")} 
          className="px-8 py-3 bg-white text-black font-semibold rounded-full hover:scale-105 transition shadow-[0_0_20px_rgba(255,255,255,0.3)]"
        >
          Return to Dashboard
        </button>
      </motion.div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto p-1 glass-card rounded-2xl relative z-10">
      <div className="bg-background/80 backdrop-blur-3xl rounded-xl p-8 h-full border border-white/5">
        
        <AnimatePresence mode="wait">
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-8 p-4 bg-red-950/50 border border-red-500/30 rounded-lg flex items-start gap-3"
            >
              <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
              <p className="text-red-200 text-sm">{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {!heldAppointmentId ? (
          <motion.div
            key="slot-selection"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
          >
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30">
                <Calendar className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Select a Time</h2>
                <p className="text-sm text-gray-400">All times are displayed in your local timezone.</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {availableSlots.map((slot, index) => (
                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  key={slot}
                  onClick={() => handleHoldSlot(slot)}
                  disabled={loading}
                  className="group relative p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-primary/20 hover:border-primary/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <span className="relative z-10 text-white font-medium">
                    {format(new Date(slot), "h:mm a")}
                  </span>
                </motion.button>
              ))}
            </div>
            {availableSlots.length === 0 && (
              <div className="py-12 text-center border border-dashed border-white/10 rounded-xl bg-white/[0.02]">
                <p className="text-gray-400">No slots available for this specialist at the moment.</p>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="booking-form"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 p-5 bg-primary/10 rounded-xl border border-primary/20 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent pointer-events-none" />
              <div className="relative z-10">
                <h3 className="font-bold text-white text-lg flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-primary" />
                  Slot Reserved
                </h3>
                <p className="text-gray-300 text-sm mt-1">
                  {selectedSlot && format(new Date(selectedSlot), "MMMM d, yyyy 'at' h:mm a")}
                </p>
              </div>
              {timeLeft !== null && (
                <div className="relative z-10 flex items-center gap-3 bg-black/40 px-5 py-2.5 rounded-full border border-white/10 shadow-inner">
                  <Clock className={`w-4 h-4 ${timeLeft < 60 ? 'text-red-400 animate-pulse' : 'text-primary'}`} />
                  <span className={`font-mono font-bold tracking-wider ${timeLeft < 60 ? 'text-red-400' : 'text-white'}`}>
                    {formatTimeLeft(timeLeft)}
                  </span>
                </div>
              )}
            </div>

            <form onSubmit={handleConfirmBooking} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-200 mb-3 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-400" />
                  Symptom Analysis
                </label>
                <div className="relative group">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-primary to-blue-600 rounded-xl blur opacity-20 group-hover:opacity-40 transition duration-500" />
                  <textarea
                    value={rawSymptoms}
                    onChange={e => setRawSymptoms(e.target.value)}
                    required
                    rows={5}
                    className="relative w-full p-4 bg-black/60 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition resize-none"
                    placeholder="Describe your symptoms in detail for our AI pre-consultation analysis..."
                  />
                </div>
              </div>
              
              <button
                type="submit"
                disabled={loading || !rawSymptoms}
                className="group relative w-full flex items-center justify-center gap-2 py-4 bg-gradient-to-r from-primary to-blue-600 text-white font-bold rounded-xl hover:from-primary/90 hover:to-blue-600/90 transition-all disabled:opacity-50 overflow-hidden shadow-[0_0_30px_rgba(139,92,246,0.3)]"
              >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform" />
                <span className="relative z-10 flex items-center gap-2">
                  {loading ? "Confirming Booking..." : "Confirm Appointment"}
                  {!loading && <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
                </span>
              </button>
            </form>
          </motion.div>
        )}
      </div>
    </div>
  );
}
