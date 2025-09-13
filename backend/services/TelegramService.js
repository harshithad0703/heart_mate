const TelegramBot = require("node-telegram-bot-api");

class TelegramService {
  constructor() {
    if (!process.env.TELEGRAM_BOT_TOKEN) {
      console.warn("TELEGRAM_BOT_TOKEN not found in environment variables");
      this.bot = null;
    } else {
      this.bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, {
        polling: false,
      });
    }

    this.doctorChatId = process.env.DOCTOR_TELEGRAM_CHAT_ID;
  }

  async sendDoctorNotification(patientInfo, symptomData, appointmentTime) {
    if (!this.bot || !this.doctorChatId) {
      console.warn(
        "📱 Telegram bot not configured - skipping doctor notification"
      );
      return { success: false, error: "Telegram not configured" };
    }

    try {
      console.log(
        `📱 Sending Telegram notification for patient ${patientInfo.name}...`
      );

      const message = this.formatDoctorNotification(
        patientInfo,
        symptomData,
        appointmentTime
      );

      const result = await this.bot.sendMessage(this.doctorChatId, message, {
        parse_mode: "HTML",
        disable_web_page_preview: true,
      });

      console.log(
        "✅ Telegram notification sent successfully:",
        result.message_id
      );
      return { success: true, messageId: result.message_id };
    } catch (error) {
      console.error("⚠️ Telegram notification failed:", error.message);

      // Log specific error types for better debugging
      if (error.message.includes("bot was blocked")) {
        console.error(
          "   🚫 Bot was blocked by the chat - check doctor chat settings"
        );
      } else if (error.message.includes("chat not found")) {
        console.error(
          "   🔍 Chat ID not found - verify DOCTOR_TELEGRAM_CHAT_ID"
        );
      } else if (error.message.includes("token")) {
        console.error("   🔑 Bot token issue - verify TELEGRAM_BOT_TOKEN");
      } else if (error.message.includes("network")) {
        console.error(
          "   🌐 Network issue - Telegram servers may be unreachable"
        );
      }

      return {
        success: false,
        error: `Telegram notification failed: ${error.message}`,
        details: error.code || "Unknown error",
      };
    }
  }

  formatDoctorNotification(patientInfo, symptomData, appointmentTime) {
    const formatResponses = (responses) => {
      let formatted = "";
      for (const [category, answers] of Object.entries(responses)) {
        formatted += `\n<b>${this.formatCategoryName(category)}:</b>\n`;
        if (Array.isArray(answers)) {
          answers.forEach((answer, index) => {
            formatted += `${index + 1}. ${answer}\n`;
          });
        } else {
          formatted += `${answers}\n`;
        }
      }
      return formatted;
    };

    const appointmentTimeStr = new Date(appointmentTime).toLocaleString();
    const severityDecorated = symptomData?.severity?.decorated || "🟢 Low";
    const severityLevel = symptomData?.severity?.level || "LOW";

    return `
🏥 <b>NEW PATIENT CONSULTATION</b>

👤 <b>Patient Details:</b>
• Name: ${patientInfo.name}
• Email: ${patientInfo.email}
• Consultation Time: ${new Date().toLocaleString()}

🩺 <b>Primary Symptom:</b>
${symptomData.symptom}

🚦 <b>Severity:</b> ${severityDecorated} <i>(${severityLevel})</i>

📝 <b>Patient Responses:</b>${formatResponses(symptomData.responses)}

📅 <b>Scheduled Appointment:</b>
${appointmentTimeStr}

⏰ A calendar invitation has been sent to the patient.

---
<i>Tricog Health Assistant</i>
    `.trim();
  }

  formatCategoryName(category) {
    return category
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

  async sendTestMessage() {
    if (!this.bot || !this.doctorChatId) {
      throw new Error("Telegram bot not configured properly");
    }

    try {
      const message = `
🔧 <b>Tricog Health Bot Test</b>

This is a test message to confirm the Telegram integration is working properly.

Time: ${new Date().toLocaleString()}
Status: ✅ Connected

---
<i>Tricog Health Assistant</i>
      `.trim();

      const result = await this.bot.sendMessage(this.doctorChatId, message, {
        parse_mode: "HTML",
      });

      return { success: true, messageId: result.message_id };
    } catch (error) {
      console.error("Error sending test message:", error);
      throw error;
    }
  }

  async sendUrgentAlert(patientInfo, urgentSymptoms) {
    if (!this.bot || !this.doctorChatId) {
      console.warn("Telegram bot not configured for urgent alerts");
      return { success: false, error: "Telegram not configured" };
    }

    try {
      const message = `
🚨 <b>URGENT PATIENT ALERT</b>

👤 <b>Patient:</b> ${patientInfo.name}
📧 <b>Email:</b> ${patientInfo.email}

⚠️ <b>Urgent Symptoms Reported:</b>
${urgentSymptoms.join("\n• ")}

🕐 <b>Reported at:</b> ${new Date().toLocaleString()}

<b>Please contact patient immediately!</b>

---
<i>Tricog Health Assistant - Urgent Alert</i>
      `.trim();

      const result = await this.bot.sendMessage(this.doctorChatId, message, {
        parse_mode: "HTML",
        disable_notification: false, // Ensure this creates a notification
      });

      return { success: true, messageId: result.message_id };
    } catch (error) {
      console.error("Error sending urgent alert:", error);
      return { success: false, error: error.message };
    }
  }

  isConfigured() {
    return !!(this.bot && this.doctorChatId);
  }
}

module.exports = TelegramService;
