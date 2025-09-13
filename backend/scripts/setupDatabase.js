const path = require("path");
const fs = require("fs");
const DatabaseService = require("../services/DatabaseService");

async function setupDatabase() {
  console.log("🔧 Setting up Tricog Health database...");

  const dbService = new DatabaseService();

  try {
    // Initialize database and create tables
    await dbService.initialize();
    console.log("✅ Database tables created successfully");

    // Read symptom data from JSON file
    const datasetPath = path.join(
      __dirname,
      "../../dataset/Datasetab94d2b.json"
    );

    if (!fs.existsSync(datasetPath)) {
      console.error("❌ Dataset file not found:", datasetPath);
      process.exit(1);
    }

    const symptomsData = JSON.parse(fs.readFileSync(datasetPath, "utf8"));
    console.log(`📊 Found ${symptomsData.length} symptoms in dataset`);

    // Seed symptoms data
    await dbService.seedSymptoms(symptomsData);
    console.log("✅ Symptoms data seeded successfully");

    // Verify data
    const allSymptoms = await dbService.getAllSymptoms();
    console.log(
      `✅ Verification: ${allSymptoms.length} symptoms loaded in database`
    );

    console.log("🎉 Database setup completed successfully!");

    // Display some sample symptoms
    console.log("\n📝 Sample symptoms available:");
    allSymptoms.slice(0, 5).forEach((symptom, index) => {
      console.log(`  ${index + 1}. ${symptom.name}`);
    });

    if (allSymptoms.length > 5) {
      console.log(`  ... and ${allSymptoms.length - 5} more`);
    }
  } catch (error) {
    console.error("❌ Error setting up database:", error);
    process.exit(1);
  } finally {
    dbService.close();
  }
}

// Run setup if called directly
if (require.main === module) {
  setupDatabase();
}

module.exports = setupDatabase;
