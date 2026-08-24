"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { BookingFlow } from "@/components/BookingFlow";

export default function BookingContainer({ doctorId }: { doctorId: string }) {
  const [date, setDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [slots, setSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSlots() {
      setLoading(true);
      try {
        const res = await fetch(`/api/doctors/${doctorId}/slots?date=${date}`);
        const data = await res.json();
        if (data.availableSlots) {
          setSlots(data.availableSlots);
        }
      } catch (error) {
        console.error("Failed to fetch slots", error);
      } finally {
        setLoading(false);
      }
    }
    fetchSlots();
  }, [doctorId, date]);

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <label className="block text-sm font-medium text-gray-700 mb-2">Select Date</label>
        <input 
          type="date" 
          value={date} 
          onChange={e => setDate(e.target.value)}
          min={format(new Date(), "yyyy-MM-dd")}
          className="p-3 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none w-full sm:w-auto"
        />
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <BookingFlow doctorId={doctorId} availableSlots={slots} />
      )}
    </div>
  );
}
