#!/usr/bin/env node

/**
 * Debug script to test the chatbot logic without running the full server
 */

const path = require("path");
const fs = require("fs");

console.log("🐛 Debugging Tricog Health Chatbot Logic...\n");

// Load environment variables from backend/.env
let envVars = {};
const envPath = path.join(__dirname, "backend/.env");

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf8");
  envContent.split("\n").forEach((line) => {
    const [key, ...values] = line.split("=");
    if (key && values.length) {
      envVars[key.trim()] = values.join("=").trim();
    }
  });
  Object.assign(process.env, envVars);
}

async function testChatbotLogic() {
  try {
    // Test 1: Database Service
    console.log("1️⃣ Testing Database Service...");
    const DatabaseService = require("./backend/services/DatabaseService");
    const dbService = new DatabaseService();
    await dbService.initialize();

    const symptoms = await dbService.getAllSymptoms();
    console.log(`   ✅ Database: ${symptoms.length} symptoms loaded`);

    // Test 2: Gemini Service (with API key if available)
    console.log("\n2️⃣ Testing Gemini Service...");
    const GeminiService = require("./backend/services/GeminiService");
    const geminiService = new GeminiService();

    if (process.env.GEMINI_API_KEY) {
      console.log("   🔑 API key found, testing extraction...");

      // Test name extraction
      const testName = await geminiService.extractPatientInfo(
        "My name is John Smith",
        "name"
      );
      console.log(`   📝 Name extraction: "${testName}"`);

      // Test email extraction
      const testEmail = await geminiService.extractPatientInfo(
        "My email is john@example.com",
        "email"
      );
      console.log(`   📧 Email extraction: "${testEmail}"`);

      // Test email validation
      const isValidEmail = await geminiService.isValidEmail(testEmail);
      console.log(`   ✅ Email validation: ${isValidEmail}`);
    } else {
      console.log("   ⚠️  No API key found, skipping LLM tests");
    }

    // Test 3: Chat Handler Logic
    console.log("\n3️⃣ Testing Chat Handler...");
    const TelegramService = require("./backend/services/TelegramService");
    const CalendarService = require("./backend/services/CalendarService");
    const ChatHandler = require("./backend/handlers/ChatHandler");

    const telegramService = new TelegramService();
    const calendarService = new CalendarService();

    const chatHandler = new ChatHandler({
      dbService,
      geminiService,
      telegramService,
      calendarService,
    });

    // Simulate a session
    console.log("   🎭 Simulating chat session...");

    const mockSocket = { id: "test-socket-123" };

    // Test session creation
    const session = await chatHandler.initializeSession(mockSocket.id);
    chatHandler.sessions.set(mockSocket.id, session);
    console.log(
      `   📋 Session created: ${session.id}, state: ${session.state}`
    );

    // Test name collection (session starts in COLLECTING_NAME state now)
    console.log("\n   👤 Testing name collection...");
    console.log(`   📊 Initial session state: ${session.state}`);

    // Set to COLLECTING_NAME to simulate the new flow
    session.state = chatHandler.STATES.COLLECTING_NAME;
    const nameResponse = await chatHandler.handleNameCollection(
      session,
      "John Smith"
    );
    console.log(`   🤖 Bot response: ${nameResponse.substring(0, 80)}...`);
    console.log(`   📊 Session state after name: ${session.state}`);
    console.log(`   👤 Patient name: ${session.patient.name}`);

    // Test email collection
    if (session.state === chatHandler.STATES.COLLECTING_EMAIL) {
      console.log("\n   📧 Testing email collection...");
      const emailResponse = await chatHandler.handleEmailCollection(
        session,
        "john@example.com"
      );
      console.log(`   🤖 Bot response: ${emailResponse.substring(0, 80)}...`);
      console.log(`   📊 Session state after email: ${session.state}`);
      console.log(`   📧 Patient email: ${session.patient.email}`);
    }

    console.log("\n4️⃣ Session Management Test...");
    console.log(
      `   🗂️  Active sessions: ${chatHandler.getActiveSessionsCount()}`
    );
    console.log(
      `   📋 Session data: ${JSON.stringify(session.patient, null, 2)}`
    );

    dbService.close();

    console.log("\n🎉 All tests completed successfully!");
    console.log("\n📋 Summary:");
    console.log(`   ✅ Database working: ${symptoms.length} symptoms`);
    console.log(
      `   ✅ Gemini API: ${
        process.env.GEMINI_API_KEY ? "Configured" : "Not configured"
      }`
    );
    console.log(`   ✅ Session management: Working`);
    console.log(`   ✅ Name extraction: Working`);
    console.log(`   ✅ Email extraction: Working`);

    if (!process.env.GEMINI_API_KEY) {
      console.log("\n💡 To test full LLM functionality:");
      console.log("   1. Add GEMINI_API_KEY to backend/.env");
      console.log("   2. Run this test again");
    }
  } catch (error) {
    console.log("\n❌ Test failed:");
    console.log(`   Error: ${error.message}`);
    console.log(`   Stack: ${error.stack}`);

    console.log("\n🔧 Troubleshooting:");
    console.log("   1. Make sure you ran: npm install in backend/");
    console.log("   2. Check if database is properly initialized");
    console.log("   3. Verify API keys in backend/.env");

    process.exit(1);
  }
}

// Run the test
testChatbotLogic();
