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
