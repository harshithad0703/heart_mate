#!/usr/bin/env node

/**
 * Test script to verify the Tricog Health Chatbot setup
 * This script tests basic functionality without requiring API keys
 */

const fs = require("fs");
const path = require("path");

console.log("🔧 Testing Tricog Health Chatbot Setup...\n");

// Test 1: Check project structure
console.log("📁 Checking project structure...");
const requiredPaths = [
  "backend/package.json",
  "frontend/package.json",
  "backend/server.js",
  "frontend/src/App.js",
  "dataset/Datasetab94d2b.json",
  "backend/services/DatabaseService.js",
  "backend/services/GeminiService.js",
  "backend/services/TelegramService.js",
  "backend/services/CalendarService.js",
];

let missingFiles = [];
requiredPaths.forEach((filePath) => {
  if (!fs.existsSync(filePath)) {
    missingFiles.push(filePath);
  }
});

if (missingFiles.length === 0) {
  console.log("✅ All required files present");
} else {
  console.log("❌ Missing files:");
  missingFiles.forEach((file) => console.log(`   - ${file}`));
  process.exit(1);
}

// Test 2: Check dependencies
console.log("\n📦 Checking dependencies...");

try {
  const backendPkg = require("./backend/package.json");
  const frontendPkg = require("./frontend/package.json");

  const backendNodeModules = fs.existsSync("./backend/node_modules");
  const frontendNodeModules = fs.existsSync("./frontend/node_modules");

  if (backendNodeModules && frontendNodeModules) {
    console.log("✅ Dependencies installed");
  } else {
    console.log("❌ Dependencies not installed. Run: npm run install-all");
    process.exit(1);
  }
} catch (error) {
  console.log("❌ Error checking dependencies:", error.message);
  process.exit(1);
}

// Test 3: Check database setup
console.log("\n🗄️ Checking database...");
try {
  const DatabaseService = require("./backend/services/DatabaseService");

  const dbService = new DatabaseService();
  dbService
    .initialize()
    .then(async () => {
      try {
        const symptoms = await dbService.getAllSymptoms();
        console.log(`✅ Database initialized with ${symptoms.length} symptoms`);

        // Test a specific symptom
        const chestPain = await dbService.getSymptomByName(
          "Chest Pain / Discomfort"
        );
        if (chestPain) {
          console.log("✅ Sample symptom data accessible");
        } else {
          console.log(
            "⚠️ Sample symptom not found - database may need reseeding"
          );
        }

        dbService.close();

        // Test 4: Check services initialization
        console.log("\n⚙️ Checking services...");

        const GeminiService = require("./backend/services/GeminiService");
        const TelegramService = require("./backend/services/TelegramService");
        const CalendarService = require("./backend/services/CalendarService");

        const gemini = new GeminiService();
        const telegram = new TelegramService();
        const calendar = new CalendarService();

        console.log(
          `✅ GeminiService initialized (configured: ${!!process.env
            .GEMINI_API_KEY})`
        );
        console.log(
          `✅ TelegramService initialized (configured: ${telegram.isConfigured()})`
        );
        console.log(
          `✅ CalendarService initialized (configured: ${calendar.isConfigured()})`
        );

        // Test 5: Port availability
        console.log("\n🌐 Checking port availability...");
        const net = require("net");

        const checkPort = (port) => {
          return new Promise((resolve) => {
            const server = net.createServer();
            server.listen(port, (err) => {
              if (err) {
                resolve(false);
              } else {
                server.once("close", () => resolve(true));
                server.close();
              }
            });
            server.on("error", () => resolve(false));
          });
        };

        const backendPortFree = await checkPort(8024);
        const frontendPortFree = await checkPort(3007);

        console.log(
          `✅ Backend port 8024: ${backendPortFree ? "Available" : "In use"}`
        );
        console.log(
          `✅ Frontend port 3007: ${frontendPortFree ? "Available" : "In use"}`
        );

        // Final summary
        console.log("\n🎉 Setup Test Summary:");
        console.log("✅ Project structure complete");
        console.log("✅ Dependencies installed");
        console.log(`✅ Database ready with ${symptoms.length} symptoms`);
        console.log("✅ All services initialized");
        console.log(
          `✅ Ports ${
            backendPortFree && frontendPortFree
              ? "available"
              : "may need attention"
          }`
        );

        console.log("\n📋 Next steps:");
        console.log(
          "1. Set up your .env file in /backend/ (copy from env.example)"
        );
        console.log(
          "2. Get API keys (see SETUP.md for detailed instructions):"
        );
        console.log("   - Google Gemini AI API key");
        console.log("   - Telegram bot token and doctor chat ID");
        console.log("   - Google Calendar API credentials");
        console.log("3. Run: npm run dev (to start both backend and frontend)");
        console.log("4. Open: http://localhost:3007");

        console.log("\n🚀 Ready to launch Tricog Health Assistant!");
      } catch (error) {
        console.log("❌ Database test failed:", error.message);
        process.exit(1);
      }
    })
    .catch((error) => {
      console.log("❌ Database initialization failed:", error.message);
      console.log("💡 Try running: cd backend && npm run setup-db");
      process.exit(1);
    });
} catch (error) {
  console.log("❌ Error testing database:", error.message);
  console.log("💡 Make sure you ran: npm install in the backend directory");
  process.exit(1);
}
