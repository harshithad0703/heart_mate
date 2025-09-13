# Tricog Health AI Chatbot Assistant

A comprehensive AI-powered medical chatbot assistant designed specifically for cardiology consultations. This application bridges the gap between patients and cardiologists by intelligently collecting symptom information, asking relevant follow-up questions, and seamlessly scheduling appointments.

## 🏥 Features

- **Intelligent Symptom Collection**: AI-powered conversation flow that collects detailed patient information
- **Rule-Based Medical Knowledge**: Uses structured medical database instead of relying on general LLM knowledge
- **Real-time Chat Interface**: Modern, responsive web interface with Socket.io for real-time communication
- **Doctor Notifications**: Automated Telegram notifications to cardiologists with patient details
- **Appointment Scheduling**: Automatic Google Calendar integration for appointment booking
- **Secure & Private**: HIPAA-compliant design with encrypted communications
 - **Severity Analysis (Doctor-only)**: Internal rule-based triage computes case severity and shares it only with doctors via notifications and calendar entries. Patients never see severity in the chat.
 - **Doctor Dashboard**: Web UI to search, filter, and sort patient cases with severity indicators.

## 🛠 Tech Stack

### Backend

- **Node.js** with Express
- **Socket.io** for real-time communication
- **SQLite** database for data storage
- **Google Gemini AI** for intelligent conversation handling
- **Telegram Bot API** for doctor notifications
- **Google Calendar API** for appointment scheduling

### Frontend

- **React.js** with modern hooks
- **Socket.io Client** for real-time chat
- **CSS3** with modern gradients and animations
- **Responsive Design** for all devices

## 📁 Project Structure

```
tricog_chatbot/
├── backend/
│   ├── services/
│   │   ├── DatabaseService.js      # Database operations
│   │   ├── GeminiService.js        # AI/LLM integration
│   │   ├── TelegramService.js      # Doctor notifications
│   │   ├── CalendarService.js      # Appointment scheduling
│   │   └── SeverityService.js      # Rule-based severity classification (backend-only)
│   ├── handlers/
│   │   └── ChatHandler.js          # Main conversation logic
│   ├── scripts/
│   │   └── setupDatabase.js        # Database initialization
│   ├── database/                   # SQLite database files
│   ├── server.js                   # Main server file
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ChatContainer.js    # Main chat interface
│   │   │   ├── MessageBubble.js    # Individual messages
│   │   │   ├── MessageInput.js     # User input component
│   │   │   ├── TypingIndicator.js  # Typing animation
│   │   │   ├── Header.js           # App header
│   │   │   └── ConnectionStatus.js # Connection indicator
│   │   ├── App.js                  # Main React app
│   │   └── index.js                # React entry point
│   ├── public/
│   └── package.json
├── dataset/
│   └── Datasetab94d2b.json         # Medical symptoms database
└── README.md
```

## 🚀 Quick Setup

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Google Cloud account (for Gemini AI and Calendar)
- Telegram Bot Token
- Doctor's Telegram Chat ID

### 1. Clone and Install Dependencies

```bash
# Install root dependencies and all sub-project dependencies
npm run install-all
```

### 2. Environment Configuration

Create `.env` file in the backend directory:

```bash
cd backend
cp env.example .env
```

Edit `.env` with your configuration:

```env
# Server Configuration
PORT=8024
NODE_ENV=development

# Gemini AI Configuration
GEMINI_API_KEY=your_gemini_api_key_here

# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
DOCTOR_TELEGRAM_CHAT_ID=your_doctor_telegram_chat_id_here

# Google Calendar Configuration
GOOGLE_CALENDAR_CREDENTIALS={"type":"service_account",...}

# Doctor Configuration
DOCTOR_EMAIL=doctor@example.com
```

### 3. Setup Database

```bash
# Initialize database and seed with medical data
npm run setup
```

### 4. Start the Application

```bash
# Start both backend and frontend concurrently
npm run dev
```

The application will be available at:

- **Frontend**: http://localhost:6979
- **Backend API**: http://localhost:8024

## 🔑 API Keys Setup Guide

### Google Gemini AI API Key

1. Go to [Google AI Studio](https://makersuite.google.com/)
2. Sign in with your Google account
3. Click "Get API Key"
4. Create a new project or select existing one
5. Generate and copy the API key
6. Add to your `.env` file as `GEMINI_API_KEY`

### Telegram Bot Setup

1. Open Telegram and search for [@BotFather](https://t.me/botfather)
2. Start a chat and send `/newbot`
3. Follow the prompts to create your bot
4. Copy the bot token
5. Add to your `.env` file as `TELEGRAM_BOT_TOKEN`

**Get Doctor's Chat ID:**

1. Add your bot to a chat with the doctor
2. Send a message to the bot in that chat
3. Visit: `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
4. Find the chat ID in the response
5. Add to your `.env` file as `DOCTOR_TELEGRAM_CHAT_ID`

### Google Calendar API Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the Google Calendar API
4. Create service account credentials
5. Download the JSON credentials file
6. Convert the entire JSON to a string and add to `.env` as `GOOGLE_CALENDAR_CREDENTIALS`

**Alternative OAuth2 Setup:**

1. Create OAuth2 credentials instead of service account
2. Set up redirect URI
3. Get authorization code and refresh token
4. Format as JSON string in `.env` file

## 📱 Usage

### Patient Flow

1. **Welcome**: Patient opens the chat interface
2. **Registration**: AI collects name and email
3. **Symptoms**: Patient describes their symptoms
4. **Assessment**: AI asks relevant follow-up questions based on medical database
5. **Completion**: AI schedules appointment and notifies doctor

### Severity Analysis (Backend-only)

- After the dataset-driven Q&A completes, the backend runs a rule-based severity classifier:
  - 🟢 Low: mild symptoms, no red flags
  - 🟡 Medium!: presence of risk factors (hypertension, diabetes, smoking, etc.)
  - 🔴 CRITICAL!!!: any red flags or severe chest pain descriptors
- Severity is stored in the database (`patients.severity`) and is only included in doctor-facing outputs:
  - Telegram doctor notifications include: `Severity: 🔴 CRITICAL!!!`
  - Google Calendar event description includes severity line
- The patient-facing chat never displays severity; it only proceeds to slot selection and confirmation.

### Doctor Notification

When a patient completes their assessment, the doctor receives:

- Telegram message with patient details
- Google Calendar invitation with comprehensive patient information
- All responses organized by medical categories

### Doctor Dashboard

- Navigate to `http://localhost:6979/doctor`
- Features:
  - Search by name or ID (real-time)
  - Filter by severity (Low / Medium / Critical)
  - Sort by severity priority (Critical → Medium → Low)
  - Pagination (20 per page)


## 🏥 Medical Data Structure

The system uses a comprehensive symptom database with categories:

```json
{
  "symptom": "Chest Pain / Discomfort",
  "follow_up_questions": {
    "symptom_details": [...],
    "vital_signs": [...],
    "medical_history": [...],
    "past_medical_history": [...],
    "lifestyle_risk_factors": [...],
    "red_flags": [...],
    "psychosocial": [...]
  }
}
```

## 🛡️ Security & Privacy

- All communications are encrypted in transit
- No medical data stored in logs
- HIPAA-compliant design patterns
- Secure API key management
- No PII exposure in error messages

## 🔧 Development

### Available Scripts

```bash
# Root directory
npm run dev          # Start both frontend and backend
npm run install-all  # Install all dependencies
npm run setup        # Setup database

# Backend directory
npm start            # Start production server
npm run dev          # Start development server with nodemon
npm run setup-db     # Initialize database

# Frontend directory
npm start            # Start React development server
npm run build        # Build for production
```

### Environment Variables

| Variable                      | Description                         | Required |
| ----------------------------- | ----------------------------------- | -------- |
| `GEMINI_API_KEY`              | Google Gemini AI API key            | Yes      |
| `TELEGRAM_BOT_TOKEN`          | Telegram bot token                  | Yes      |
| `DOCTOR_TELEGRAM_CHAT_ID`     | Doctor's Telegram chat ID           | Yes      |
| `GOOGLE_CALENDAR_CREDENTIALS` | Google service account JSON         | Yes      |
| `DOCTOR_EMAIL`                | Doctor's email for calendar invites | Yes      |
| `PORT`                        | Backend server port (default: 8024) | No       |

## 🐛 Troubleshooting

### Common Issues

**Database Setup Fails**

```bash
# Manually setup database
cd backend
node scripts/setupDatabase.js
```

**Socket.io Connection Issues**

- Check if backend is running on port 8024
- Verify CORS settings in server.js
- Check firewall settings

**Calendar API Errors**

- Verify service account permissions
- Check JSON format in environment variable
- Ensure Calendar API is enabled in Google Cloud

**Telegram Bot Not Working**

- Verify bot token format
- Check if bot is added to correct chat
- Confirm chat ID is correct

## 📞 Support

For technical support or questions:

- Create an issue in the repository
- Check the troubleshooting guide above
- Verify all environment variables are set correctly

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Google Gemini AI for intelligent conversation handling
- Socket.io for real-time communication
- React.js community for excellent documentation
- Medical professionals who provided domain expertise

---

**Made with ❤️ for better healthcare accessibility**
