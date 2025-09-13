#!/usr/bin/env node

/**
 * Quick test script to verify Gemini API is working with the new model
 */

const path = require("path");
const fs = require("fs");

console.log("🧠 Testing Gemini AI Integration...\n");

// Try to load environment variables from backend/.env
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
  // Set in process.env
  Object.assign(process.env, envVars);
}

if (!process.env.GEMINI_API_KEY && !envVars.GEMINI_API_KEY) {
  console.log("⚠️  GEMINI_API_KEY not found in environment variables");
  console.log("💡 Add your API key to backend/.env file:");
  console.log("   GEMINI_API_KEY=your_api_key_here");
  console.log(
    "\n📖 Get your free API key from: https://makersuite.google.com/"
  );
  process.exit(0);
}

try {
  const GeminiService = require("./backend/services/GeminiService");
  const service = new GeminiService();

  console.log("🔧 Testing Gemini model: gemini-2.0-flash-exp");
  console.log("⏳ Sending test request...\n");

  service
    .generateResponse(
      'Hello! Please respond with "Gemini API is working correctly!" to confirm the connection.'
    )
    .then((response) => {
      console.log("✅ SUCCESS! Gemini API is working correctly");
      console.log("📝 Response:", response);
      console.log(
        "\n🎉 Ready to use Tricog Health Assistant with AI capabilities!"
      );
    })
    .catch((error) => {
      console.log("❌ ERROR: Gemini API test failed");
      console.log("🔍 Error details:", error.message);

      if (error.message.includes("API key")) {
        console.log("\n💡 Solution: Check your API key in backend/.env");
      } else if (
        error.message.includes("quota") ||
        error.message.includes("limit")
      ) {
        console.log(
          "\n💡 Solution: You may have exceeded the free tier limits"
        );
        console.log("   - Wait a few minutes and try again");
        console.log("   - Check your usage at: https://makersuite.google.com/");
      } else if (error.message.includes("model")) {
        console.log("\n💡 Solution: Model name might have changed");
        console.log(
          "   - Try updating to gemini-1.5-flash in GeminiService.js"
        );
      } else {
        console.log(
          "\n💡 Solution: Check your internet connection and API key"
        );
      }
    });
} catch (error) {
  console.log("❌ ERROR: Could not load GeminiService");
  console.log("🔍 Error details:", error.message);
  console.log("\n💡 Make sure you ran: npm install in the backend directory");
}
