import { google } from "googleapis";
import { logger } from "./logger";

export async function createCalendarEvent(
  accessToken: string,
  refreshToken: string,
  eventDetails: {
    summary: string;
    description: string;
    startTime: string; // ISO String
    endTime: string;   // ISO String
  }
) {
  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );

    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    const event = {
      summary: eventDetails.summary,
      description: eventDetails.description,
      start: {
        dateTime: eventDetails.startTime,
        timeZone: "UTC",
      },
      end: {
        dateTime: eventDetails.endTime,
        timeZone: "UTC",
      },
    };

    const response = await calendar.events.insert({
      calendarId: "primary",
      requestBody: event,
    });

    return { success: true, eventId: response.data.id };
  } catch (error: any) {
    logger.error("Failed to create Google Calendar event", { error: error.message });
    throw error;
  }
}
