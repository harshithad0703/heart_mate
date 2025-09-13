const { GoogleGenerativeAI } = require("@google/generative-ai");

class GeminiService {
  constructor() {
    if (!process.env.GEMINI_API_KEY) {
      console.warn("GEMINI_API_KEY not found in environment variables");
    }

    this.genAI = process.env.GEMINI_API_KEY
      ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
      : null;
    this.model = this.genAI
      ? this.genAI.getGenerativeModel({ model: "gemini-2.0-flash" })
      : null;
  }

  async generateResponse(prompt, context = {}) {
    if (!this.model) {
      throw new Error(
        "Gemini AI not properly configured. Please check your API key."
      );
    }

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error("Error generating response from Gemini:", error);
      throw new Error("Failed to generate AI response");
    }
  }

  async generateWelcomeMessage() {
    const prompt = `
    You are a medical assistant for Tricog Health. Generate a warm, professional welcome message for patients starting a consultation.
    
    The message should:
    - Be friendly and reassuring
    - Explain that you'll help collect their symptoms and information
    - Mention that a cardiologist will review their case
    - Ask for their name as the first step
    - Keep it concise (2-3 sentences)
    
    Do not provide medical advice or diagnosis.
    `;

    return await this.generateResponse(prompt);
  }

  async generateSymptomAcknowledgment(symptom, hasFollowUp) {
    const prompt = `
    You are a medical assistant. A patient has mentioned they have "${symptom}".
    
    Generate a brief, empathetic acknowledgment message that:
    - Shows understanding of their concern
    - ${
      hasFollowUp
        ? "Mentions you need to ask a few questions to better understand their situation"
        : "Thanks them for the information"
    }
    - Remains professional and reassuring
    - Keep it to 1-2 sentences
    
    Do not provide medical advice or diagnosis.
    `;

    return await this.generateResponse(prompt);
  }

  async generateFollowUpTransition(currentQuestionIndex, totalQuestions) {
    const prompt = `
    You are a medical assistant collecting patient information. 
    
    Generate a brief transitional message indicating you're moving to the next question.
    Current progress: question ${currentQuestionIndex} of ${totalQuestions}
    
    The message should:
    - Ok or next question looks harsh so use soft replies
    - Do not use words such as "great", "amazing", "wonderful", etc.
    - Maximum 5 words

    Examples: Alright, moving on., Let's move on.
    `;

    return await this.generateResponse(prompt);
  }

  async generateCompletionMessage(patientName) {
    const prompt = `
    Generate a message for a patient named "${patientName}" after they've completed providing all their symptom information.
    
    The message should:
    - Thank them for providing detailed information
    - Mention that their information has been sent to the cardiologist
    - Inform them that an appointment has been scheduled
    - Be reassuring and professional
    - Keep it to 2-3 sentences
    `;

    return await this.generateResponse(prompt);
  }

  async parseSymptomFromMessage(message, availableSymptoms) {
    const symptomsList = availableSymptoms.map((s) => s.name).join(", ");

    const prompt = `
    A patient has sent this message: "${message}"
    
    Available symptoms in our database: ${symptomsList}
    
    Your task: Identify if the message mentions any of the available symptoms. 
    
    Respond with ONLY the exact symptom name from the list if found, or "NO_SYMPTOM_FOUND" if none match.
    
    Be flexible with matching - consider synonyms and common ways patients describe symptoms.
    
    Examples:
    - "I have chest pain" -> "Chest Pain / Discomfort"
    - "feeling short of breath" -> "Shortness of Breath (Dyspnea)"
    - "my heart is racing" -> "Palpitations"
    `;

    const response = await this.generateResponse(prompt);
    return response.trim();
  }

  async generateQuestionTransition(questionText) {
    const prompt = `
    You are asking a medical question to a patient. Make the question sound more conversational and empathetic.

    Original question: "${questionText}"

    Rephrase it to be:
    - Concise and clear
    - Keep the same medical content
    - Single sentence
    - Do not add any extra details or examples
    - If already concise, return it unchanged
    
    Return only the rephrased question.
    `;
    return await this.generateResponse(prompt);
  }

  async generateErrorMessage() {
    const prompt = `
    Generate a polite error message for when the medical assistant cannot process a patient's request.
    
    The message should:
    - Apologize for the confusion
    - Ask them to try again or rephrase
    - Remain helpful and professional
    - Be brief (1-2 sentences)
    `;

    return await this.generateResponse(prompt);
  }

  async generateDoctorNotification(patientInfo, symptomData) {
    const prompt = `
    Generate a professional notification message for a cardiologist about a new patient consultation.
    
    Patient Information:
    Name: ${patientInfo.name}
    Email: ${patientInfo.email}
    Symptom: ${symptomData.symptom}
    
    Responses: ${JSON.stringify(symptomData.responses, null, 2)}
    
    The message should:
    - Be concise and professional
    - Highlight key information
    - Mention that an appointment has been scheduled
    - Format it clearly for a busy doctor
    
    Keep it under 200 words.
    `;

    return await this.generateResponse(prompt);
  }

  async isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  async isValidName(name) {
    // Basic validation: at least 2 characters, only letters and spaces
    const nameRegex = /^[a-zA-Z\s]{2,50}$/;
    return nameRegex.test(name.trim());
  }

  async extractPatientInfo(message, currentField) {
    // Use simple regex patterns first, fallback to LLM if needed
    const cleanMessage = message.trim();

    if (currentField === "name") {
      // Simple name extraction - remove common prefixes
      let name = cleanMessage
        .replace(/^(my name is|i am|i'm|name:|name is|call me)\s*/i, "")
        .replace(/[^a-zA-Z\s]/g, "") // Remove special characters
        .trim();

      // If looks like a valid name, return it
      if (name.length >= 2 && name.length <= 50 && /^[a-zA-Z\s]+$/.test(name)) {
        return name;
      }

      // Fallback to LLM for complex cases
      try {
        const prompt = `Extract just the person's name from: "${cleanMessage}". Return only the name or "INVALID" if no name found.`;
        const llmResult = await this.generateResponse(prompt);
        return llmResult.trim();
      } catch (error) {
        return cleanMessage.length >= 2 ? cleanMessage : "INVALID";
      }
    }

    if (currentField === "email") {
      // Simple email extraction using regex
      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
      const emailMatch = cleanMessage.match(emailRegex);

      if (emailMatch) {
        return emailMatch[0];
      }

      // Fallback to LLM for complex cases
      try {
        const prompt = `Extract just the email address from: "${cleanMessage}". Return only the email or "INVALID" if no email found.`;
        const llmResult = await this.generateResponse(prompt);
        const extractedEmail = llmResult.trim();

        // Validate extracted email
        if (await this.isValidEmail(extractedEmail)) {
          return extractedEmail;
        }
      } catch (error) {
        console.log("LLM extraction failed, using fallback");
      }

      return "INVALID";
    }

    return "INVALID";
  }
}

module.exports = GeminiService;
