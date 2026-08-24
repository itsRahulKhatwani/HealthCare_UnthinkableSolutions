/**
 * This script proves the double-booking guard works under simultaneous requests.
 * It simulates two users trying to hold the same appointment slot at the exact same millisecond.
 * 
 * Pre-requisite: The app must be running locally on port 3000 (npm run dev).
 * Also, you need the actual UUIDs for a doctor and patient from your database,
 * and an authentication token (or we can bypass auth for the sake of the test if we mock it,
 * but since we have real auth, the easiest way to test is to obtain a valid session cookie or 
 * create a test-only endpoint).
 * 
 * For this test, we assume a test-only endpoint `/api/test/concurrency-hold` is available in development.
 */

async function runConcurrencyTest() {
  const API_URL = "http://localhost:3000/api/test/concurrency-hold";
  
  // Example payload
  const payload = {
    doctorId: "doctor-123", // Replaced by real UUID in endpoint
    patientId: "patient-123", // Replaced by real UUID in endpoint
    slotStart: new Date(new Date().setHours(10, 0, 0, 0)).toISOString(),
    slotEnd: new Date(new Date().setHours(10, 30, 0, 0)).toISOString(),
  };

  console.log(`Firing 2 simultaneous hold requests for slot ${payload.slotStart}...`);

  const req1 = fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const req2 = fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const [res1, res2] = await Promise.all([req1, req2]);

  const data1 = await res1.json();
  const data2 = await res2.json();

  console.log("Response 1:", res1.status, data1);
  console.log("Response 2:", res2.status, data2);

  if (
    (res1.status === 200 && res2.status === 409) ||
    (res1.status === 409 && res2.status === 200)
  ) {
    console.log("✅ Concurrency test PASSED: Exactly one booking succeeded, one cleanly rejected.");
  } else {
    console.log("❌ Concurrency test FAILED: Unexpected statuses.");
  }
}

runConcurrencyTest().catch(console.error);
