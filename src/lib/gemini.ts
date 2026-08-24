import { GoogleGenerativeAI } from "@google/generative-ai";
import { logger } from "./logger";

// Initialize the Google Generative AI with the API key from env
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "placeholder");

export async function generatePreVisitSummary(rawSymptoms: string): Promise<{
  aiSummary: unknown;
  aiUrgency: "LOW" | "MEDIUM" | "HIGH";
  aiStatus: "SUCCESS" | "FAILED";
}> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
You are a medical AI assistant. Analyze the following patient symptoms and generate a pre-visit summary.
Output exactly valid JSON without any markdown formatting. Do not wrap in \`\`\`json.
The JSON must have this schema:
{
  "chiefComplaint": "A short summary of the main issue",
  "questions": ["Question 1", "Question 2", "Question 3"],
  "urgency": "LOW" | "MEDIUM" | "HIGH"
}

Patient symptoms:
"${rawSymptoms}"
    `;

    // Set a timeout of 10s using AbortController
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    }, { signal: controller.signal });

    clearTimeout(timeout);

    const text = result.response.text();
    const cleanText = text.replace(/```json/g, "").replace(/```/g, "").trim();

    try {
      const parsed = JSON.parse(cleanText);
      return {
        aiSummary: {
          chiefComplaint: parsed.chiefComplaint || "Not available",
          questions: parsed.questions || [],
        },
        aiUrgency: ["LOW", "MEDIUM", "HIGH"].includes(parsed.urgency) ? parsed.urgency : "MEDIUM",
        aiStatus: "SUCCESS",
      };
    } catch (_parseError) {
      logger.error("Gemini JSON parse failed", { text: cleanText });
      return { aiSummary: null, aiUrgency: "MEDIUM", aiStatus: "FAILED" };
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("Gemini API call failed", { error: errorMessage });
    return { aiSummary: null, aiUrgency: "MEDIUM", aiStatus: "FAILED" };
  }
}

export async function generatePostVisitSummary(doctorNotes: string, prescription: unknown): Promise<{
  aiPatientSummary: string;
  aiStatus: "SUCCESS" | "FAILED";
}> {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
You are a medical AI assistant. Create a patient-friendly summary of their visit based on the doctor's notes and prescription.
Keep it simple, reassuring, and clearly explain the medication schedule.

Doctor's Notes:
${doctorNotes}

Prescription:
${JSON.stringify(prescription)}
    `;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    }, { signal: controller.signal });

    clearTimeout(timeout);

    return {
      aiPatientSummary: result.response.text().trim(),
      aiStatus: "SUCCESS",
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("Gemini post-visit API call failed", { error: errorMessage });
    return { aiPatientSummary: "", aiStatus: "FAILED" };
  }
}
