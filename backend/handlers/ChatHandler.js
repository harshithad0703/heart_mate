const { v4: uuidv4 } = require("uuid");

class ChatHandler {
  constructor({ dbService, geminiService, telegramService, calendarService }) {
    this.dbService = dbService;
    this.geminiService = geminiService;
    this.telegramService = telegramService;
    this.calendarService = calendarService;
    try {
      const SeverityService = require("../services/SeverityService");
      this.severityService = new SeverityService();
    } catch (e) {
      console.error("Failed to initialize SeverityService:", e.message);
      this.severityService = null;
    }

    // Session management
    this.sessions = new Map(); // socketId -> session data

    // Conversation states
    this.STATES = {
      WELCOME: "welcome",
      COLLECTING_NAME: "collecting_name",
      COLLECTING_EMAIL: "collecting_email",
      COLLECTING_SYMPTOMS: "collecting_symptoms",
      ASKING_FOLLOW_UP: "asking_follow_up",
      CONFIRMING_SLOT: "confirming_slot",
      SELECTING_SLOT: "selecting_slot",
      COMPLETED: "completed",
    };
  }

  async handleMessage(socket, data) {
    const { message, timestamp } = data;
    const socketId = socket.id;

    try {
      // Get or create session
      let session = this.sessions.get(socketId);
      if (!session) {
        console.log(`Creating new session for ${socketId}`);
        session = await this.initializeSession(socketId);
        this.sessions.set(socketId, session);
      } else {
        console.log(
          `Using existing session for ${socketId}, state: ${session.state}`
        );
      }

      // Save user message to database
      if (session.patient && session.patient.id) {
        await this.dbService.saveChatMessage(
          session.patient.id,
          message,
          "user"
        );
      }

      // Process message based on current state
      let response;
      switch (session.state) {
        case this.STATES.WELCOME:
          // This shouldn't happen anymore since we set state to COLLECTING_NAME on connection
          response = await this.handleWelcome(session, message);
          break;
        case this.STATES.COLLECTING_NAME:
          response = await this.handleNameCollection(session, message);
          break;
        case this.STATES.COLLECTING_EMAIL:
          response = await this.handleEmailCollection(session, message);
          break;
        case this.STATES.COLLECTING_SYMPTOMS:
          response = await this.handleSymptomCollection(session, message);
          break;
        case this.STATES.ASKING_FOLLOW_UP:
          response = await this.handleFollowUpResponse(session, message);
          break;
        case this.STATES.CONFIRMING_SLOT:
          response = await this.handleSlotConfirmation(session, message);
          break;
        case this.STATES.SELECTING_SLOT:
          response = await this.handleSlotSelection(session, message);
          break;
        case this.STATES.COMPLETED:
          response = await this.handleCompletedState(session, message);
          break;
        default:
          response = await this.geminiService.generateErrorMessage();
      }

      // Send response to user
      if (response) {
        socket.emit("bot_message", {
          message: response,
          timestamp: new Date().toISOString(),
          type: "text",
        });

        // Save bot response to database
        if (session.patient && session.patient.id) {
          await this.dbService.saveChatMessage(
            session.patient.id,
            response,
            "bot"
          );
        }
      }

      // Update session
      this.sessions.set(socketId, session);
    } catch (error) {
      console.error("Error handling message:", error);
      socket.emit("bot_message", {
        message: "I apologize, but I encountered an error. Please try again.",
        timestamp: new Date().toISOString(),
        type: "error",
      });
    }
  }

  async initializeSession(socketId) {
    const session = {
      id: uuidv4(),
      socketId,
      state: this.STATES.WELCOME,
      patient: {},
      currentSymptom: null,
      followUpQuestions: [],
      currentQuestionIndex: 0,
      responses: {},
      startTime: new Date(),
    };

    console.log(`Session initialized for ${socketId}`);
    return session;
  }

  async handleWelcome(session, message) {
    // Move directly to symptom collection; name/email are collected via submission
    session.state = this.STATES.COLLECTING_SYMPTOMS;
    return "Hello! I'm your Tricog Health assistant. Let's proceed with your symptoms. Please describe what you're experiencing (e.g., chest pain, shortness of breath).";
  }

  async handleNameCollection(session, message) {
    // Track attempts to prevent infinite loops
    if (!session.nameAttempts) session.nameAttempts = 0;
    session.nameAttempts++;

    const extractedName = await this.geminiService.extractPatientInfo(
      message,
      "name"
    );

    if (
      extractedName === "INVALID" ||
      !(await this.geminiService.isValidName(extractedName))
    ) {
      // After 3 attempts, use the message as-is if it's reasonable
      if (session.nameAttempts >= 3) {
        const fallbackName = message
          .trim()
          .replace(/[^a-zA-Z\s]/g, "")
          .trim();
        if (fallbackName.length >= 2) {
          console.log(
            `Using fallback name after ${session.nameAttempts} attempts: ${fallbackName}`
          );
          session.patient.name = fallbackName;
          session.state = this.STATES.COLLECTING_EMAIL;
          return `Thank you, ${session.patient.name}! Now, could you please provide your email address so we can send you appointment details?`;
        }
      }

      return `I didn't catch your name properly. Could you please tell me your full name? (Just type your name, like "John Smith")`;
    }

    session.patient.name = extractedName.trim();
    session.state = this.STATES.COLLECTING_EMAIL;
    console.log(`Name collected successfully: ${session.patient.name}`);

    return `Nice to meet you, ${session.patient.name}! Now, could you please provide your email address so we can send you appointment details?`;
  }

  async handleEmailCollection(session, message) {
    // Track attempts to prevent infinite loops
    if (!session.emailAttempts) session.emailAttempts = 0;
    session.emailAttempts++;

    const extractedEmail = await this.geminiService.extractPatientInfo(
      message,
      "email"
    );

    if (
      extractedEmail === "INVALID" ||
      !(await this.geminiService.isValidEmail(extractedEmail))
    ) {
      // After 3 attempts, try to find email pattern manually
      if (session.emailAttempts >= 3) {
        const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
        const emailMatch = message.match(emailRegex);

        if (emailMatch) {
          console.log(
            `Using fallback email after ${session.emailAttempts} attempts: ${emailMatch[0]}`
          );
          session.patient.email = emailMatch[0];

          // Create or update patient in database
          const patient = await this.dbService.createOrUpdatePatient(
            session.socketId,
            session.patient
          );
          session.patient = patient;

          session.state = this.STATES.COLLECTING_SYMPTOMS;
          return "Thank you! Now, could you please describe what symptoms you're experiencing? For example, chest pain, shortness of breath, palpitations, etc.";
        }
      }

      return `Please provide a valid email address (like john@example.com). ${
        session.emailAttempts >= 2
          ? "Just type your email address directly."
          : ""
      }`;
    }

    session.patient.email = extractedEmail.trim();
    console.log(`Email collected successfully: ${session.patient.email}`);

    // Create or update patient in database
    const patient = await this.dbService.createOrUpdatePatient(
      session.socketId,
      session.patient
    );
    session.patient = patient;

    session.state = this.STATES.COLLECTING_SYMPTOMS;

    return "Thank you! Now, could you please describe what symptoms you're experiencing? For example, chest pain, shortness of breath, palpitations, etc.";
  }

  async handleSymptomCollection(session, message) {
    // Get all available symptoms
    const availableSymptoms = await this.dbService.getAllSymptoms();

    // Use Gemini to parse the symptom from the message
    const identifiedSymptom = await this.geminiService.parseSymptomFromMessage(
      message,
      availableSymptoms
    );

    if (identifiedSymptom === "NO_SYMPTOM_FOUND") {
      const symptomList = availableSymptoms
        .slice(0, 10)
        .map((s) => s.name)
        .join(", ");
      return `I didn't recognize that symptom. Here are some common symptoms I can help with: ${symptomList}. Could you please describe your symptoms using these terms?`;
    }

    // Find the matching symptom data
    const symptomData = availableSymptoms.find(
      (s) => s.name === identifiedSymptom
    );
    if (!symptomData) {
      return "I couldn't find information about that symptom. Could you please describe it differently?";
    }

    // Set up follow-up questions
    session.currentSymptom = symptomData;
    session.followUpQuestions = this.flattenFollowUpQuestions(
      symptomData.follow_up_questions
    );
    session.currentQuestionIndex = 0;
    session.responses = {};
    session.state = this.STATES.ASKING_FOLLOW_UP;

    // Persist identified symptom on patient immediately for doctor dashboard visibility
    try {
      if (session.patient && session.patient.id) {
        await this.dbService.updatePatientCaseData(session.patient.id, {
          symptom: symptomData.name,
        });
      }
    } catch (e) {
      console.error("Failed to persist identified symptom on patient:", e.message);
    }

    // Generate acknowledgment and first question
    const acknowledgment =
      await this.geminiService.generateSymptomAcknowledgment(
        identifiedSymptom,
        session.followUpQuestions.length > 0
      );

    if (session.followUpQuestions.length === 0) {
      // No follow-up questions, proceed to completion
      return await this.completeConsultation(session);
    }

    const firstQuestion = session.followUpQuestions[0].question;
    const formattedQuestion =
      await this.geminiService.generateQuestionTransition(firstQuestion);

    return `${acknowledgment}\n\n${formattedQuestion}`;
  }

  async handleFollowUpResponse(session, message) {
    // Save the response
    const currentQuestion =
      session.followUpQuestions[session.currentQuestionIndex];
    if (!session.responses[currentQuestion.category]) {
      session.responses[currentQuestion.category] = [];
    }
    session.responses[currentQuestion.category].push(message);

    // Move to next question
    session.currentQuestionIndex++;

    if (session.currentQuestionIndex >= session.followUpQuestions.length) {
      // All questions answered, complete consultation
      return await this.completeConsultation(session);
    }

    // Ask next question
    const nextQuestion =
      session.followUpQuestions[session.currentQuestionIndex];
    const transition = await this.geminiService.generateFollowUpTransition(
      session.currentQuestionIndex,
      session.followUpQuestions.length
    );

    const formattedQuestion =
      await this.geminiService.generateQuestionTransition(
        nextQuestion.question
      );

    return `${transition}\n${formattedQuestion}`;
  }

  async handleSlotSelection(session, message) {
    const text = String(message || "").trim().toLowerCase();
    if (!Array.isArray(session.offeredSlots) || session.offeredSlots.length === 0) {
      session.state = this.STATES.COMPLETED;
      return "I couldn't find any available slots at the moment. Our team will contact you shortly to schedule your appointment.";
    }

    if (text === "none" || text === "no" || text === "n") {
      session.state = this.STATES.COMPLETED;
      return "No problem. Our team will reach out to arrange another time.";
    }

    const choice = parseInt(text, 10);
    if (isNaN(choice) || choice < 1 || choice > session.offeredSlots.length) {
      const options = session.offeredSlots.map((iso, idx) => `${idx + 1}`).join(", ");
      return `Please reply with one of the option numbers: ${options}, or type "none".`;
    }

    const selectedIso = session.offeredSlots[choice - 1];
    const selectedDate = new Date(selectedIso);
    const symptomData = {
      symptom: session.currentSymptom?.name,
      responses: session.responses,
    };
    const severity = session.pendingSeverity || { level: "LOW", decorated: "🟢 Low" };

    try {
      const result = await this.calendarService.scheduleAppointmentAt(
        session.patient,
        { ...symptomData, severity },
        selectedDate
      );
      if (result.success) {
        const appointmentTime = new Date(result.appointmentTime);
        await this.dbService.saveAppointment(
          session.patient.id,
          result.eventId,
          result.appointmentTime
        );
        try {
          await this.dbService.updatePatientCaseData(session.patient.id, {
            appointment_time: result.appointmentTime,
          });
        } catch (_) {}

        // Notify doctor now
        try {
          await this.telegramService.sendDoctorNotification(
            session.patient,
            { ...symptomData, severity },
            appointmentTime
          );
        } catch (_) {}

        session.state = this.STATES.COMPLETED;
        session.offeredSlots = [];
        session.pendingSeverity = undefined;
        return `Your appointment is scheduled for ${appointmentTime.toLocaleString()}. Our team will share the details shortly.`;
      }
      // if failed, surface a message
      return `I couldn't schedule that slot (${selectedDate.toLocaleString()}). Please choose another option or type "none".`;
    } catch (e) {
      return `There was an issue scheduling your selected slot. Please pick another option or type "none".`;
    }
  }

  async handleSlotConfirmation(session, message) {
    const text = String(message || "").trim().toLowerCase();
    if (!session.proposedSlot) {
      // Fallback to listing slots if proposal missing
      try {
        const severity = session.pendingSeverity || { level: "LOW", decorated: "🟢 Low" };
        const slots = await this.calendarService.getAvailableSlotsForSeverity(severity.level, {
          durationMinutes: 30,
          stepMinutes: 15,
          limit: 8,
        });
        if (Array.isArray(slots) && slots.length > 0) {
          session.state = this.STATES.SELECTING_SLOT;
          session.offeredSlots = slots.map((d) => new Date(d).toISOString());
          const human = (iso) => new Date(iso).toLocaleString();
          const list = session.offeredSlots
            .map((iso, idx) => `${idx + 1}. ${human(iso)}`)
            .join("\n");
          return [
            `Here are some available times:`,
            list,
            `\nPlease reply with the number of your preferred slot, or type "none".`,
          ].join("\n");
        }
      } catch (_) {}
      session.state = this.STATES.COMPLETED;
      return "I couldn't find any available slots at the moment. Our team will contact you shortly to schedule your appointment.";
    }

    const yesValues = ["yes", "y", "ok", "okay", "confirm", "book", "schedule"];
    const noValues = ["no", "n", "later", "change", "different"];

    if (yesValues.includes(text)) {
      try {
        const selectedDate = new Date(session.proposedSlot);
        const severity = session.pendingSeverity || { level: "LOW", decorated: "🟢 Low" };
        const symptomData = {
          symptom: session.currentSymptom?.name,
          responses: session.responses,
          severity,
        };
        const result = await this.calendarService.scheduleAppointmentAt(
          session.patient,
          symptomData,
          selectedDate
        );
        if (result.success) {
          const appointmentTime = new Date(result.appointmentTime);
          await this.dbService.saveAppointment(
            session.patient.id,
            result.eventId,
            result.appointmentTime
          );
          try {
            await this.dbService.updatePatientCaseData(session.patient.id, {
              appointment_time: result.appointmentTime,
            });
          } catch (_) {}

          // Notify doctor
          try {
            await this.telegramService.sendDoctorNotification(
              session.patient,
              symptomData,
              appointmentTime
            );
          } catch (_) {}

          session.state = this.STATES.COMPLETED;
          session.offeredSlots = [];
          session.pendingSeverity = undefined;
          session.proposedSlot = undefined;
          return `Your appointment is scheduled for ${appointmentTime.toLocaleString()}. Our team will share the details shortly.`;
        }
        return `I couldn't schedule that time. Would you like to pick another slot? Reply "no" to see options.`;
      } catch (e) {
        return `There was an issue scheduling that time. Reply "no" to see other options.`;
      }
    }

    if (noValues.includes(text)) {
      // Show multiple options
      try {
        const severity = session.pendingSeverity || { level: "LOW", decorated: "🟢 Low" };
        const slots = await this.calendarService.getAvailableSlotsForSeverity(severity.level, {
          durationMinutes: 30,
          stepMinutes: 15,
          limit: 8,
        });
        if (Array.isArray(slots) && slots.length > 0) {
          session.state = this.STATES.SELECTING_SLOT;
          session.offeredSlots = slots.map((d) => new Date(d).toISOString());
          const human = (iso) => new Date(iso).toLocaleString();
          const list = session.offeredSlots
            .map((iso, idx) => `${idx + 1}. ${human(iso)}`)
            .join("\n");
          session.proposedSlot = undefined;
          return [
            `No problem. Here are some other available times:`,
            list,
            `\nPlease reply with the number of your preferred slot, or type "none".`,
          ].join("\n");
        }
      } catch (e) {
        console.error("Failed to list slots after decline:", e.message);
      }
      session.state = this.STATES.COMPLETED;
      session.proposedSlot = undefined;
      return "I couldn't find alternative slots right now. Our team will contact you to arrange a time.";
    }

    return 'Please reply with "yes" to confirm this time, or "no" to see other options.';
  }

  async completeConsultation(session) {
    // We will move to SELECTING_SLOT if slots are available, else COMPLETE

    let appointmentScheduled = false;
    let telegramSent = false;
    let appointmentTime = new Date();

    try {
      // Save patient symptom data (this should always work)
      const symptomData = {
        symptom: session.currentSymptom.name,
        responses: session.responses,
      };

      // Analyze severity silently (doctor-only visibility)
      let severity = { level: "LOW", decorated: "🟢 Low" };
      try {
        if (this.severityService) {
          severity = this.severityService.analyze(
            session.currentSymptom.name,
            session.responses
          );
        }
      } catch (sevErr) {
        console.error("Severity analysis failed:", sevErr.message);
      }

      await this.dbService.savePatientSymptom(
        session.patient.id,
        session.currentSymptom.name,
        session.responses
      );
      console.log(`✅ Patient symptom data saved for ${session.patient.name}`);

      // Persist severity on patient record
      try {
        await this.dbService.updatePatientSeverity(
          session.patient.id,
          severity.level
        );
        // also reflect it on session.patient for use in downstream services
        session.patient.severity = severity.level;
        // store case snapshot on patient for doctor dashboard
        await this.dbService.updatePatientCaseData(session.patient.id, {
          symptom: session.currentSymptom.name,
          responses: session.responses,
          severity: severity.level,
        });
      } catch (sevSaveErr) {
        console.error("Failed to save patient severity:", sevSaveErr.message);
      }

      // Severity-based scheduling flow
      try {
        // For CRITICAL and MEDIUM, propose the next available slot and ask for confirmation
        if (severity.level === "CRITICAL" || severity.level === "MEDIUM") {
          const slots = await this.calendarService.getAvailableSlotsForSeverity(severity.level, {
            durationMinutes: 30,
            stepMinutes: 15,
            limit: 1,
          });
          if (Array.isArray(slots) && slots.length > 0) {
            const proposed = new Date(slots[0]).toISOString();
            session.pendingSeverity = severity;
            session.proposedSlot = proposed;
            session.state = this.STATES.CONFIRMING_SLOT;
            const when = new Date(proposed).toLocaleString();
            return `Based on urgency, the next available appointment is ${when}. Shall I book this for you now? (yes/no)`;
          }
        }

        // For LOW or if proposal not found, offer multiple options for selection
        const slots = await this.calendarService.getAvailableSlotsForSeverity(severity.level, {
          durationMinutes: 30,
          stepMinutes: 15,
          limit: 8,
        });
        if (Array.isArray(slots) && slots.length > 0) {
          // Save offered slots in session and prompt user to pick
          session.state = this.STATES.SELECTING_SLOT;
          session.offeredSlots = slots.map((d) => new Date(d).toISOString());
          session.pendingSeverity = severity;

          const human = (iso) => new Date(iso).toLocaleString();
          const list = session.offeredSlots
            .map((iso, idx) => `${idx + 1}. ${human(iso)}`)
            .join("\n");

          return [
            `I can offer these appointment times today:`,
            list,
            `\nPlease reply with the number of your preferred slot (e.g., 1). If none of these work, type "none".`,
          ].join("\n");
        }
      } catch (slotErr) {
        console.error("Failed to list available slots:", slotErr.message);
      }

      // Fallback: directly schedule next available (legacy behavior)
      try {
        console.log("📅 No selectable slots found; scheduling next available...");
        const appointmentResult = await this.calendarService.scheduleAppointment(
          session.patient,
          { ...symptomData, severity }
        );

        if (appointmentResult.success) {
          appointmentTime = new Date(appointmentResult.appointmentTime);
          await this.dbService.saveAppointment(
            session.patient.id,
            appointmentResult.eventId,
            appointmentResult.appointmentTime
          );
          try {
            await this.dbService.updatePatientCaseData(session.patient.id, {
              appointment_time: appointmentResult.appointmentTime,
            });
          } catch (e) {
            console.error("Failed to persist appointment time on patient:", e.message);
          }
          appointmentScheduled = true;
          session.state = this.STATES.COMPLETED;
          console.log(`✅ Calendar appointment scheduled for ${appointmentTime.toLocaleString()}`);
        }
      } catch (calendarError) {
        console.error("⚠️ Calendar service failed (continuing anyway):", calendarError.message);
      }

      // Only send Telegram if we already scheduled (fallback path)
      if (appointmentScheduled) {
        try {
          console.log("📱 Attempting to send Telegram notification...");
          const telegramResult = await this.telegramService.sendDoctorNotification(
            session.patient,
            { ...symptomData, severity },
            appointmentTime
          );
          if (telegramResult.success) {
            telegramSent = true;
            console.log(`✅ Telegram notification sent (message ID: ${telegramResult.messageId})`);
          } else {
            console.log(`⚠️ Telegram notification failed: ${telegramResult.error}`);
          }
        } catch (telegramError) {
          console.error("⚠️ Telegram service failed (continuing anyway):", telegramError.message);
        }
      }

      // Generate completion message (use fallback if this fails too)
      let completionMessage;
      try {
        completionMessage = await this.geminiService.generateCompletionMessage(
          session.patient.name
        );
      } catch (geminiError) {
        console.error(
          "⚠️ Gemini completion message failed (using fallback):",
          geminiError.message
        );
        completionMessage = `Thank you, ${session.patient.name}! I've collected all your symptom information. Our cardiologist will review your case and follow up with you soon.`;
      }

      // Build final message based on what actually worked
      let finalMessage = completionMessage;

      if (appointmentScheduled) {
        finalMessage += `\n\n📅 Your appointment is scheduled for: ${appointmentTime.toLocaleString()}`;
        finalMessage += `\n📋 The appointment has been created in our system.`;
        finalMessage += `\n📞 Our staff will contact you with meeting details and any additional instructions.`;
      } else {
        // If we transitioned to slot selection, we already returned a prompt earlier
        if (session.state !== this.STATES.SELECTING_SLOT) {
          finalMessage += `\n\n📞 Our team will contact you shortly to schedule your appointment.`;
        }
      }

      if (telegramSent) {
        finalMessage += `\n👨‍⚕️ The cardiologist has been notified and will review your case.`;
      } else {
        finalMessage += `\n👨‍⚕️ Your information has been saved and our medical team will be notified.`;
      }

      console.log(
        `✅ Consultation completed for ${session.patient.name} (Calendar: ${
          appointmentScheduled ? "Yes" : "No"
        }, Telegram: ${telegramSent ? "Yes" : "No"})`
      );
      // If we offered slots, the earlier return already responded. Otherwise, send final summary
      if (session.state === this.STATES.SELECTING_SLOT) {
        return null;
      }
      session.state = this.STATES.COMPLETED;
      return finalMessage;
    } catch (error) {
      // Ultimate fallback - this should rarely happen now
      console.error("❌ Critical error in completeConsultation:", error);
      return `Thank you, ${
        session.patient.name || "for providing your information"
      }! Your symptom details have been recorded. Our medical team will review your case and contact you soon. If this is urgent, please call our emergency line.`;
    }
  }

  async handleCompletedState(session, message) {
    return "Your consultation has been completed and our cardiologist has been notified. If you have additional symptoms or concerns, please start a new consultation. Thank you!";
  }

  flattenFollowUpQuestions(followUpQuestions) {
    const flattened = [];

    for (const [category, questions] of Object.entries(followUpQuestions)) {
      if (Array.isArray(questions)) {
        questions.forEach((question) => {
          flattened.push({ category, question });
        });
      }
    }

    return flattened;
  }

  // Handle user disconnection
  handleDisconnect(socketId) {
    if (this.sessions.has(socketId)) {
      console.log(`Cleaning up session for disconnected user: ${socketId}`);
      this.sessions.delete(socketId);
    }
  }

  // Get session info for debugging
  getSession(socketId) {
    return this.sessions.get(socketId);
  }

  // Get all active sessions count
  getActiveSessionsCount() {
    return this.sessions.size;
  }
}

module.exports = ChatHandler;
