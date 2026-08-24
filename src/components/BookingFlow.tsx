"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Clock, Calendar, CheckCircle, AlertCircle } from "lucide-react";

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
      const slotEnd = new Date(new Date(slotStart).getTime() + 30 * 60000).toISOString(); // assuming 30 min slots
      
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
    } catch (err: any) {
      setError(err.message);
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
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center border rounded-lg bg-green-50 border-green-200">
        <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
        <h2 className="text-2xl font-bold text-green-900 mb-2">Booking Confirmed!</h2>
        <p className="text-green-700 mb-6">Your appointment has been successfully scheduled. We've sent a confirmation email.</p>
        <button onClick={() => router.push("/")} className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition">
          Return Home
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto p-6 bg-white rounded-xl shadow-sm border">
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {!heldAppointmentId ? (
        <div>
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            Select an Available Slot
          </h2>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {availableSlots.map(slot => (
              <button
                key={slot}
                onClick={() => handleHoldSlot(slot)}
                disabled={loading}
                className="p-3 border rounded-md text-sm font-medium hover:border-blue-500 hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {format(new Date(slot), "h:mm a")}
              </button>
            ))}
          </div>
          {availableSlots.length === 0 && (
            <p className="text-gray-500 text-center py-8">No slots available for this doctor.</p>
          )}
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-8 p-4 bg-blue-50 rounded-lg border border-blue-100">
            <div>
              <h3 className="font-semibold text-blue-900">Slot Reserved</h3>
              <p className="text-blue-700 text-sm">{selectedSlot && format(new Date(selectedSlot), "MMMM d, yyyy 'at' h:mm a")}</p>
            </div>
            {timeLeft !== null && (
              <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm border border-blue-200">
                <Clock className="w-4 h-4 text-orange-500" />
                <span className="font-mono font-bold text-orange-600">{formatTimeLeft(timeLeft)}</span>
              </div>
            )}
          </div>

          <form onSubmit={handleConfirmBooking} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                What are your symptoms? (Please be as detailed as possible)
              </label>
              <textarea
                value={rawSymptoms}
                onChange={e => setRawSymptoms(e.target.value)}
                required
                rows={5}
                className="w-full p-3 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                placeholder="E.g., I've had a headache for 3 days and feel slightly dizzy..."
              />
            </div>
            
            <button
              type="submit"
              disabled={loading || !rawSymptoms}
              className="w-full py-3 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 transition disabled:opacity-50"
            >
              {loading ? "Confirming..." : "Confirm Appointment"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
