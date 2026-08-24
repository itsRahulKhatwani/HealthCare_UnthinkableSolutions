# Healthcare Appointment & Follow-up Manager

A production-grade healthcare appointment platform built with Next.js 14, Prisma, PostgreSQL (Supabase), and Google Gemini API.

## Features
- **Atomic Double-Booking Guard**: Guarantees no two patients can book the same slot simultaneously utilizing PostgreSQL composite unique constraints.
- **Slot Holds & Countdowns**: Temporarily hold a slot (with a real-time UI countdown) while filling out symptoms.
- **AI-Powered Summaries**: Generates pre-visit clinical summaries and post-visit patient-friendly instructions using Google Gemini. Features strict timeouts and fallback mechanisms.
- **Doctor Leave Management**: Admins can register leaves, which automatically finds and cancels conflicting appointments and queues patient notifications.
- **Resilient Notifications**: Email and Calendar events are queued and processed asynchronously by Cron jobs with exponential backoff retries.

## Architecture & System Design
Please read the [`SYSTEM_DESIGN.md`](./SYSTEM_DESIGN.md) for an in-depth look at how concurrency, slot holds, and failure handling were engineered.

---

## Hosted Application URL
**Live Deployment:** [https://health-care-unthinkable-solutions.vercel.app/](https://health-care-unthinkable-solutions.vercel.app/)

---

## Setup & Local Development

### 1. Prerequisites
- Node.js 18+
- A Supabase account (Free Tier)
- Google Cloud Project (for Calendar API OAuth)
- Resend API Key
- Google AI Studio API Key (Gemini)

### 2. Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```
Fill in the necessary credentials. The `DATABASE_URL` must point to a PostgreSQL database (like Supabase).

### 3. Install Dependencies
```bash
npm install
```

### 4. Database Setup
Once your `DATABASE_URL` is configured in `.env.local` and `prisma.config.ts`, push the schema to your database:
```bash
npx prisma db push
```

### 5. Seed the Database
Populate the database with the Admin, test Doctors, a test Patient, and sample appointments:
```bash
npm run prisma:seed
```

### 6. Run the Application
```bash
npm run dev
```
The app will be available at `http://localhost:3000`.

---

## Demo Credentials

After running the seed script, you can log in with the following credentials (Password for all: `password123`):

- **Admin**: `admin@healthcare.com`
- **Doctor (Cardiologist)**: `dr.smith@healthcare.com`
- **Doctor (Dermatologist)**: `dr.jones@healthcare.com`
- **Patient**: `patient@example.com`

---

## Concurrency Load Test

To prove the atomic double-booking guard works under simultaneous requests, a script is provided.

**How to run:**
Ensure the app is running locally on port 3000.
```bash
npx tsx scripts/concurrency-test.ts
```

**Expected Output:**
```
Firing 2 simultaneous hold requests for slot 2026-08-25T10:00:00.000Z...
Response 1: 200 { appointment: { id: '...', status: 'HELD', ... } }
Response 2: 409 { error: { code: 'SLOT_TAKEN', message: 'This slot was just taken by someone else.' } }
✅ Concurrency test PASSED: Exactly one booking succeeded, one cleanly rejected.
```

---

## API Routes Documentation

- **`POST /api/appointments/hold`**: Secures a temporary 7-minute hold on a slot using a unique database constraint.
- **`POST /api/appointments/[id]/symptom-form`**: Submits raw symptoms, hits Gemini for an AI summary, confirms the appointment, and queues notifications.
- **`POST /api/appointments/[id]/visit-note`**: Submits doctor notes, hits Gemini for a patient-friendly summary, and marks the appointment COMPLETED.
- **`GET /api/doctors/[doctorId]/slots?date=YYYY-MM-DD`**: Calculates available slots subtracting booked/held slots and leaves.
- **`POST /api/admin/leaves`**: Creates a doctor leave and cascades `LEAVE_CONFLICT` statuses to affected patients.
- **`GET /api/health`**: Healthcheck endpoint verifying DB connectivity.

**Cron Endpoints (Triggered via Vercel Cron):**
- **`/api/cron/release-holds`**: Sweeps expired slot holds.
- **`/api/cron/medication-reminders`**: Processes and queues daily medication reminders.
- **`/api/cron/retry-notifications`**: Retries FAILED notifications (Email/Calendar) with backoff.

---

## Database Schema (Prisma)

- **User**: Represents Doctors, Patients, and Admins.
- **DoctorProfile**: Holds doctor-specific data (specialization, working hours).
- **Appointment**: Core entity linking a Doctor and Patient. Includes a `@@unique([doctorId, slotStart])` constraint to prevent double-booking at the database level. Tracks `status` (HELD, CONFIRMED, CANCELLED) and `heldUntil` for the booking flow countdown.
- **SymptomForm / VisitNote**: 1-to-1 relations with Appointment storing raw input and Gemini AI summaries.
- **Notification**: Outbox pattern for asynchronous email and calendar notifications.
- **CalendarEvent**: Tracks the IDs of events created on Google Calendar.

---

## LLM Prompts (Google Gemini)

### 1. Pre-Visit Summary (Symptom Analysis)
Used when a patient submits their symptoms during the booking flow.
```text
You are a medical AI assistant. Analyze the following patient symptoms and generate a pre-visit summary.
Output exactly valid JSON without any markdown formatting. Do not wrap in \`\`\`json.
The JSON must have this schema:
{
  "chiefComplaint": "A short summary of the main issue",
  "questions": ["Question 1", "Question 2", "Question 3"],
  "urgency": "LOW" | "MEDIUM" | "HIGH"
}

Patient symptoms:
"{rawSymptoms}"
```

### 2. Post-Visit Summary (Patient Instructions)
Used when a doctor concludes a visit and submits their clinical notes.
```text
You are a medical AI assistant. Create a patient-friendly summary of their visit based on the doctor's notes and prescription.
Keep it simple, reassuring, and clearly explain the medication schedule.

Doctor's Notes:
{doctorNotes}

Prescription:
{prescription}
```

---

## Google Calendar Setup Steps

To enable the automated calendar invites for appointments, follow these steps:

1. **Create a Google Cloud Project**: Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. **Enable the Calendar API**: Search for "Google Calendar API" and click Enable.
3. **Configure OAuth Consent Screen**: Setup an external consent screen. You only need the `.../auth/calendar.events` scope.
4. **Create OAuth Credentials**: 
   - Go to Credentials > Create Credentials > OAuth client ID.
   - Set Application Type to "Web application".
   - Add Authorized redirect URIs (e.g., `https://developers.google.com/oauthplayground` for testing).
   - Copy the generated **Client ID** and **Client Secret**.
5. **Get a Refresh Token**:
   - Go to the [OAuth 2.0 Playground](https://developers.google.com/oauthplayground/).
   - Input your Client ID and Secret in the OAuth Playground settings (gear icon).
   - Select the `https://www.googleapis.com/auth/calendar.events` scope and Authorize APIs.
   - Exchange the authorization code for tokens.
   - Copy the **Refresh Token**.
6. **Set Environment Variables**: Add the Client ID, Secret, and Refresh Token to your `.env.local` file (and Vercel environment variables).
