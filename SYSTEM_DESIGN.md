# Healthcare Appointment & Follow-up Manager - System Design

This document details the critical engineering decisions and mechanisms used to ensure the platform is robust, safe under high concurrency, and resilient to failure.

## 1. Double-Booking Prevention (The Slot Hold Mechanism)

**Problem:** Multiple patients might try to book the exact same doctor slot simultaneously. Without atomic guarantees, the system could confirm two bookings for the same time, leading to poor patient experience and scheduling conflicts.

**Decision & Implementation:**
We handle this by leveraging the database's atomic guarantees rather than relying purely on application-level logic. 
- A composite unique constraint is defined on the `Appointment` table: `@@unique([doctorId, slotStart])`.
- When a patient selects a slot, the system attempts to create a row with `status="HELD"` and a `heldUntil` timestamp (7 minutes in the future).
- If two requests hit the endpoint simultaneously for the same slot, the database allows only one `INSERT` to succeed. The second request throws a constraint violation error (Prisma code `P2002`).
- The application explicitly catches this `P2002` error and translates it into a clean HTTP `409 Conflict` response to the user, instructing them the slot was just taken.

**Tradeoffs:** While this approach forces a database write even for holds that might be abandoned, it provides mathematical certainty against double-booking without requiring distributed locks (like Redis), keeping the architecture simple and reliant on our primary data store (PostgreSQL).

## 2. Slot Hold Lifecycle & Cleanup

**Problem:** If a user holds a slot but abandons the symptom form, that slot would remain unavailable to others forever unless cleaned up.

**Decision & Implementation:**
- Slot holds are temporal. The `Appointment` row includes a `heldUntil` timestamp.
- The UI features a real-time countdown timer synchronized to this timestamp. Once expired, the UI blocks submission.
- On the backend, when calculating available slots (`/api/doctors/[doctorId]/slots`), we explicitly ignore `HELD` appointments where `heldUntil < now()`, immediately returning them to the pool of available slots even before database cleanup.
- A Vercel Cron job (`/api/cron/release-holds`) runs every minute to sweep and hard-delete any `HELD` rows past their `heldUntil` time, keeping the database clean and performing.

## 3. Doctor Leave Conflict Handling

**Problem:** Doctors may take unexpected leave, conflicting with already confirmed appointments.

**Decision & Implementation:**
- When an Admin creates a `DoctorLeave` record for a specific date, the backend synchronously queries the database for all `Appointment` records where `status = "CONFIRMED"` and the `slotStart` falls on that date.
- The system updates these appointments in bulk to `status = "LEAVE_CONFLICT"`.
- It then queues an email notification and a calendar cancellation event for each affected patient by creating `Notification` records.
- The admin endpoint returns the count of affected appointments, providing immediate visibility to the admin that patients were impacted and notified.

## 4. Notification & LLM Failure Handling

**Problem:** Integrating external APIs (Resend, Google Calendar, Google Gemini) introduces latency and potential failure points. If an email fails to send or Gemini times out, it should not crash the core booking flow or drop data silently.

**Decision & Implementation:**
- **LLM Resilience:** Every Gemini call is wrapped in a strict `try/catch` block and an `AbortController` (10s timeout). If the LLM fails to generate a pre-visit summary, the system falls back gracefully. It saves the `rawSymptoms`, sets `aiStatus="FAILED"`, and allows the appointment to be `CONFIRMED`. The raw input is still available to the doctor, who can manually request a retry later.
- **Notification Queuing:** Emails and Calendar events are not sent synchronously during the booking HTTP request. Instead, they are written to a `Notification` table with `status="PENDING"`.
- **Retry Mechanism:** A cron job (`/api/cron/retry-notifications`) sweeps `PENDING` and `FAILED` notifications. If an external API call fails, it increments `retryCount`. It attempts to send up to 5 times. This guarantees delivery even if the Resend or Google APIs have transient downtime.

By treating external integrations as asynchronous, background processes, the core application remains highly available and resilient.
