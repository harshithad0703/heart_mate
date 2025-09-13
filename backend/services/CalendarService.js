const { google } = require("googleapis");
const moment = require("moment");

class CalendarService {
  constructor() {
    this.calendar = null;
    this.doctorEmail = process.env.DOCTOR_EMAIL;
    this.initializeAuth();
  }

  initializeAuth() {
    if (!process.env.GOOGLE_CALENDAR_CREDENTIALS) {
      console.warn(
        "GOOGLE_CALENDAR_CREDENTIALS not found in environment variables"
      );
      return;
    }

    try {
      const credentials = JSON.parse(process.env.GOOGLE_CALENDAR_CREDENTIALS);

      // For service account
      if (credentials.type === "service_account") {
        const jwtClient = new google.auth.JWT(
          credentials.client_email,
          null,
          credentials.private_key,
          ["https://www.googleapis.com/auth/calendar"]
        );

        this.calendar = google.calendar({ version: "v3", auth: jwtClient });
      }
      // For OAuth2 (if using different auth method)
      else {
        const oauth2Client = new google.auth.OAuth2(
          credentials.client_id,
          credentials.client_secret,
          credentials.redirect_uri
        );

        oauth2Client.setCredentials({
          refresh_token: credentials.refresh_token,
        });

        this.calendar = google.calendar({ version: "v3", auth: oauth2Client });
      }

      console.log("Google Calendar authentication initialized");
    } catch (error) {
      console.error("Error initializing Google Calendar auth:", error);
    }
  }

  async scheduleAppointment(patientInfo, symptomData) {
    if (!this.calendar) {
      console.warn(
        "📅 Google Calendar not configured - skipping appointment scheduling"
      );
      return { success: false, error: "Google Calendar not configured" };
    }

    try {
      console.log(
        `📅 Creating calendar appointment for ${patientInfo.name}...`
      );

      // Find the next available 30-min slot on the doctor's calendar
      const baseTime = this.calculateNextAvailableSlot();
      const calendarId = this.doctorEmail || "primary";
      const appointmentTime = await this.findNextAvailableSlot(baseTime, 30, calendarId);
      const event = this.createEventObject(
        patientInfo,
        symptomData,
        appointmentTime
      );

      // Use doctor's email as calendar ID to create event on their calendar
      

      console.log(`📅 Creating event on calendar: ${calendarId}`);

      const result = await this.calendar.events.insert({
        calendarId: calendarId, // Create on doctor's calendar, not service account's
        resource: event,
        // Removed sendUpdates since we're not adding attendees automatically
        // sendUpdates: "all",
        // Removed conferenceDataVersion since we're not creating meet links
        // conferenceDataVersion: 1,
      });

      console.log("✅ Calendar event created successfully:", result.data.id);

      return {
        success: true,
        eventId: result.data.id,
        appointmentTime: appointmentTime.toISOString(),
        meetingLink: result.data.htmlLink || result.data.hangoutLink,
      };
    } catch (error) {
      console.error("⚠️ Calendar appointment failed:", error.message);

      // Log specific error types for better debugging
      if (error.message.includes("DECODER routines")) {
        console.error("   📄 Issue with service account credentials format");
      } else if (error.message.includes("403")) {
        console.error(
          "   🔐 Permission denied - check calendar sharing with service account"
        );
      } else if (error.message.includes("400")) {
        console.error("   📝 Invalid request format");
      }

      return {
        success: false,
        error: `Calendar scheduling failed: ${error.message}`,
        details: error.code || "Unknown error",
      };
    }
  }

  calculateNextAvailableSlot() {
    // Calculate next available 15-minute slot after 1 hour
    const now = moment();
    const baseTime = now.add(1, "hour");

    // Round to next 15-minute interval
    const minutes = baseTime.minutes();
    const remainder = minutes % 15;
    if (remainder !== 0) {
      baseTime.add(15 - remainder, "minutes");
    }

    // Set seconds to 0
    baseTime.seconds(0).milliseconds(0);

    return baseTime.toDate();
  }

  createEventObject(patientInfo, symptomData, appointmentTime) {
    const endTime = moment(appointmentTime).add(30, "minutes").toDate(); // 30-minute appointment

    const description = this.formatEventDescription(patientInfo, symptomData);

    // Create event without attendees to avoid Domain-Wide Delegation requirement
    const eventObject = {
      summary: `Cardiology Consultation - ${patientInfo.name}`,
      description: description,
      start: {
        dateTime: appointmentTime.toISOString(),
        timeZone: "UTC",
      },
      end: {
        dateTime: endTime.toISOString(),
        timeZone: "UTC",
      },
      // Remove attendees to avoid Domain-Wide Delegation error
      // attendees: [
      //   { email: patientInfo.email, displayName: patientInfo.name },
      //   { email: this.doctorEmail, displayName: "Dr. Cardiologist" },
      // ],
      // Simplified - remove conference data to avoid compatibility issues
      // conferenceData: {
      //   createRequest: {
      //     requestId: `tricog-${Date.now()}`,
      //     conferenceSolutionKey: { type: "hangoutsMeet" },
      //   },
      // },
      reminders: {
        useDefault: false,
        overrides: [
          { method: "email", minutes: 24 * 60 }, // 24 hours before
          { method: "popup", minutes: 30 }, // 30 minutes before
        ],
      },
    };

    console.log(
      `📅 Creating calendar event on doctor's calendar: ${this.doctorEmail}`
    );
    console.log(`   📧 Patient: ${patientInfo.name} (${patientInfo.email})`);
    console.log(
      `   📝 Event will appear on the doctor's calendar with all patient details`
    );

    return eventObject;
  }

  formatEventDescription(patientInfo, symptomData) {
    let description = `Cardiology Consultation for ${patientInfo.name}\n\n`;
    description += `📧 Patient Email: ${patientInfo.email}\n`;
    description += `🩺 Primary Symptom: ${symptomData.symptom}\n\n`;
    if (symptomData?.severity) {
      description += `🚦 Severity: ${symptomData.severity.decorated} (${symptomData.severity.level})\n\n`;
    }
    description += `📝 Patient Assessment:\n`;

    for (const [category, responses] of Object.entries(symptomData.responses)) {
      description += `\n${this.formatCategoryName(category)}:\n`;
      if (Array.isArray(responses)) {
        responses.forEach((response, index) => {
          description += `  ${index + 1}. ${response}\n`;
        });
      } else {
        description += `  ${responses}\n`;
      }
    }

    description += `\n---\nGenerated by Tricog Health Assistant\nConsultation requested: ${new Date().toLocaleString()}`;

    return description;
  }

  formatCategoryName(category) {
    return category
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

  async checkAvailability(startTime, endTime, calendarId) {
    if (!this.calendar) {
      throw new Error("Google Calendar not configured");
    }

    try {
      const response = await this.calendar.freebusy.query({
        resource: {
          timeMin: startTime.toISOString(),
          timeMax: endTime.toISOString(),
          items: [{ id: calendarId || this.doctorEmail || "primary" }],
        },
      });

      const calKey = calendarId || this.doctorEmail || "primary";
      const busyTimes = (response.data.calendars[calKey]?.busy) || response.data.calendars.primary?.busy || [];
      return busyTimes.length === 0; // True if no conflicts
    } catch (error) {
      console.error("Error checking calendar availability:", error);
      return false;
    }
  }

  async findNextAvailableSlot(preferredTime, duration = 30, calendarId) {
    const startTime = moment(preferredTime);
    let attempts = 0;
    const maxAttempts = 48; // Check up to 48 slots (12 hours in 15-min increments)

    while (attempts < maxAttempts) {
      const slotStart = moment(startTime).add(attempts * 15, "minutes");
      const slotEnd = moment(slotStart).add(duration, "minutes");

      // Skip slots outside business hours (9 AM - 5 PM)
      if (slotStart.hour() >= 9 && slotEnd.hour() < 17) {
        const isAvailable = await this.checkAvailability(
          slotStart.toDate(),
          slotEnd.toDate(),
          calendarId
        );
        if (isAvailable) {
          return slotStart.toDate();
        }
      }

      attempts++;
    }

    // If no slot found, default to the originally calculated time
    return this.calculateNextAvailableSlot();
  }

  async cancelAppointment(eventId) {
    if (!this.calendar) {
      return { success: false, error: "Google Calendar not configured" };
    }

    try {
      await this.calendar.events.delete({
        calendarId: "primary",
        eventId: eventId,
        sendUpdates: "all",
      });

      return { success: true };
    } catch (error) {
      console.error("Error canceling appointment:", error);
      return { success: false, error: error.message };
    }
  }

  isConfigured() {
    return !!this.calendar;
  }
}

module.exports = CalendarService;
