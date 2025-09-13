const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const DatabaseService = require("./services/DatabaseService");
const GeminiService = require("./services/GeminiService");
const TelegramService = require("./services/TelegramService");
const CalendarService = require("./services/CalendarService");
const ChatHandler = require("./handlers/ChatHandler");

const app = express();
const server = http.createServer(app);
const allowedCorsOrigin = process.env.CLIENT_ORIGIN || true; // true allows same-origin in production
const io = socketIo(server, {
  cors: {
    origin: allowedCorsOrigin,
    methods: ["GET", "POST"],
  },
});

const PORT = process.env.PORT || 8024;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// Serve frontend build in production (single URL deployment)
const frontendBuildPath = path.join(__dirname, "../frontend/build");
if (process.env.NODE_ENV === "production") {
  app.use(express.static(frontendBuildPath));
}

// Initialize services
const dbService = new DatabaseService();
const geminiService = new GeminiService();
const telegramService = new TelegramService();
const calendarService = new CalendarService();

// Initialize chat handler
const chatHandler = new ChatHandler({
  dbService,
  geminiService,
  telegramService,
  calendarService,
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    message: "Tricog Health Chatbot Backend is running",
    timestamp: new Date().toISOString(),
  });
});

// Get available symptoms endpoint
app.get("/api/symptoms", async (req, res) => {
  try {
    const symptoms = await dbService.getAllSymptoms();
    res.json({ success: true, symptoms });
  } catch (error) {
    console.error("Error fetching symptoms:", error);
    res.status(500).json({ success: false, error: "Failed to fetch symptoms" });
  }
});

// Create or update patient by email
app.post("/api/patient", async (req, res) => {
  try {
    const { email, fullName, password, phone } = req.body || {};
    if (!email) {
      return res.status(400).json({ success: false, error: "Email is required" });
    }

    const patient = await dbService.createOrUpdatePatientByEmail(email, {
      name: fullName,
      phone,
    });

    res.json({ success: true, patient });
  } catch (error) {
    console.error("Error creating/updating patient:", error);
    res.status(500).json({ success: false, error: "Failed to create/update patient" });
  }
});

// Doctor auth
app.post("/api/doctor", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ success: false, error: "Email and password are required" });
    }
    const doctor = await dbService.validateDoctorCredentials(email, password);
    if (!doctor) {
      return res.status(401).json({ success: false, error: "Invalid credentials" });
    }
    res.json({ success: true, doctor });
  } catch (error) {
    console.error("Error in doctor endpoint:", error);
    res.status(500).json({ success: false, error: "Doctor auth failed" });
  }
});

// (Removed demo registration route)

// Doctor: list patients with filters/sorting
app.get("/api/doctor/patients", async (req, res) => {
  try {
    const { search, severity, sort, limit, offset } = req.query || {};
    const patients = await dbService.listPatients({
      search,
      severity,
      sort,
      limit: limit ? Number(limit) : 100,
      offset: offset ? Number(offset) : 0,
    });
    res.json({ success: true, patients });
  } catch (error) {
    console.error("Error fetching patients for doctor:", error);
    res.status(500).json({ success: false, error: "Failed to fetch patients" });
  }
});

// (Removed demo start-chat route)

// Socket.io connection handling
io.on("connection", async (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Send welcome message immediately
  try {
    const session = await chatHandler.initializeSession(socket.id);
    chatHandler.sessions.set(socket.id, session);

    // Send initial welcome without requesting name/email; wait for attach_patient
    socket.emit("bot_message", {
      message:
        "Hello! I'm your Tricog Health assistant. I've noted your submission. Let's proceed with your symptoms. Please describe what you're experiencing (e.g., chest pain, shortness of breath).",
      timestamp: new Date().toISOString(),
      type: "text",
    });

    // Start from symptoms by default; if patient not attached yet, we'll attach when event arrives
    session.state = chatHandler.STATES.COLLECTING_SYMPTOMS;
    chatHandler.sessions.set(socket.id, session);
  } catch (error) {
    console.error("Error initializing session:", error);
    socket.emit("bot_message", {
      message: "Welcome! Please type any message to get started.",
      timestamp: new Date().toISOString(),
      type: "text",
    });
  }

  // Handle chat messages
  socket.on("chat_message", async (data) => {
    try {
      await chatHandler.handleMessage(socket, data);
    } catch (error) {
      console.error("❌ Error handling chat message:", error.message);
      console.error("   Stack:", error.stack);

      // Send user-friendly error message
      socket.emit("bot_message", {
        message:
          "I apologize, but I encountered a technical issue. Let me try to help you continue. Could you please repeat your last message?",
        timestamp: new Date().toISOString(),
        type: "error",
      });

      // Don't crash the session - try to recover
      try {
        const session = chatHandler.getSession(socket.id);
        if (session) {
          console.log(
            `   🔄 Attempting to recover session for ${socket.id}, current state: ${session.state}`
          );
        }
      } catch (recoveryError) {
        console.error("   ⚠️ Session recovery failed:", recoveryError.message);
      }
    }
  });

  // Handle user typing
  socket.on("typing", (data) => {
    socket.broadcast.emit("user_typing", { userId: socket.id, ...data });
  });

  // Attach patient details from pre-submission form
  socket.on("attach_patient", async (data) => {
    try {
      const { email, fullName, phone } = data || {};
      if (!email && !fullName) return;

      // Persist patient and link to socket
      let patient;
      if (email) {
        patient = await dbService.createOrUpdatePatientByEmail(email, {
          name: fullName,
          phone,
          socketId: socket.id,
        });
      } else {
        patient = await dbService.createOrUpdatePatient(socket.id, {
          name: fullName,
          phone,
        });
      }

      // Update session with patient
      const session = chatHandler.getSession(socket.id) || (await chatHandler.initializeSession(socket.id));
      session.patient = patient;
      chatHandler.sessions.set(socket.id, session);
    } catch (err) {
      console.error("Error in attach_patient:", err);
      socket.emit("bot_message", {
        message: "We couldn't attach your details, but you can continue and we'll save your info later.",
        timestamp: new Date().toISOString(),
        type: "error",
      });
    }
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

// Initialize database and start server
async function startServer() {
  try {
    await dbService.initialize();
    console.log("Database initialized successfully");

    // SPA fallback for client-side routing in production
    if (process.env.NODE_ENV === "production") {
      app.get("*", (req, res) => {
        res.sendFile(path.join(frontendBuildPath, "index.html"));
      });
    }

    server.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`💬 Socket.io server ready for connections`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();

// Process-level error handling (prevent crashes)
process.on("unhandledRejection", (reason, promise) => {
  console.error(
    "⚠️ Unhandled Promise Rejection at:",
    promise,
    "reason:",
    reason
  );
  console.error(
    "   The server will continue running, but this should be investigated"
  );
});

process.on("uncaughtException", (error) => {
  console.error("❌ Uncaught Exception:", error);
  console.error("   Stack:", error.stack);
  console.error(
    "   The server will attempt to continue, but stability may be affected"
  );
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM received, shutting down gracefully");
  server.close(() => {
    dbService.close();
    process.exit(0);
  });
});

process.on("SIGINT", async () => {
  console.log("SIGINT received, shutting down gracefully");
  server.close(() => {
    dbService.close();
    process.exit(0);
  });
});
