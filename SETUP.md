# 🚀 Tricog Health Chatbot - Setup Guide

This guide will walk you through setting up the Tricog Health AI Chatbot Assistant locally on your machine.

## ⚡ Quick Start (5 minutes)

### Step 1: Prerequisites

Ensure you have the following installed:

- **Node.js** (v16 or higher) - [Download here](https://nodejs.org/)
- **npm** (comes with Node.js)
- **Git** - [Download here](https://git-scm.com/)

Verify installation:

```bash
node --version  # Should show v16+
npm --version   # Should show v6+
```

### Step 2: Clone & Install

```bash
# Clone the repository
git clone <repository-url>
cd tricog_chatbot

# Install all dependencies (root, backend, and frontend)
npm run install-all
```

### Step 3: Basic Configuration

```bash
# Create environment file
cd backend
cp env.example .env

# Edit the .env file with your API keys (see detailed setup below)
```

### Step 4: Initialize Database

```bash
# Setup database with medical symptoms data
npm run setup-db
```

### Step 5: Start the Application

```bash
# Go back to root directory
cd ..

# Start both backend and frontend
npm run dev
```

🎉 **Done!** Open http://localhost:3007 in your browser.

---

## 🔑 Detailed API Keys Setup

### 1. Google Gemini AI API Key (Required)

**Step 1**: Go to [Google AI Studio](https://makersuite.google.com/)

**Step 2**: Sign in with your Google account

**Step 3**: Click "Get API Key" in the top right

**Step 4**: Create a new project or select an existing one

**Step 5**: Generate API key and copy it

**Step 6**: Add to your `.env` file:

```env
GEMINI_API_KEY=your_actual_api_key_here
```

💡 **Tip**: The Gemini API has a generous free tier perfect for testing.

---

### 2. Telegram Bot Setup (Required)

**Step 1**: Open Telegram and search for [@BotFather](https://t.me/botfather)

**Step 2**: Start a conversation and send `/newbot`

**Step 3**: Choose a name for your bot (e.g., "Tricog Health Assistant")

**Step 4**: Choose a username ending in 'bot' (e.g., "tricog_health_bot")

**Step 5**: Copy the bot token and add to `.env`:

```env
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz
```

**Get Doctor's Chat ID**:

**Step 6**: Create a group chat or use direct message with the doctor

**Step 7**: Add your bot to the chat

**Step 8**: Send any message in the chat

**Step 9**: Visit this URL in browser (replace YOUR_BOT_TOKEN):

```
https://api.telegram.org/botYOUR_BOT_TOKEN/getUpdates
```

**Step 10**: Find the "chat" object and copy the "id" value:

```json
{
  "chat": {
    "id": -1001234567890, // This is your chat ID
    "title": "Doctor Chat"
  }
}
```

**Step 11**: Add to `.env`:

```env
DOCTOR_TELEGRAM_CHAT_ID=-1001234567890
```

---

### 3. Google Calendar API Setup (Required)

**⚠️ IMPORTANT**: If you're getting calendar errors like "No access, refresh token, API key or refresh handler callback is set", you likely have **OAuth2 Web Client** credentials instead of **Service Account** credentials.

**🔧 See detailed fix guide**: [GOOGLE_CALENDAR_SETUP.md](./GOOGLE_CALENDAR_SETUP.md)

**Option A: Service Account (Recommended for this chatbot)**

**Step 1**: Go to [Google Cloud Console](https://console.cloud.google.com/)

**Step 2**: Create a new project or select existing

**Step 3**: Enable the Google Calendar API:

- Go to "APIs & Services" > "Library"
- Search for "Google Calendar API"
- Click and enable it

**Step 4**: Create service account:

- Go to "APIs & Services" > "Credentials"
- Click "Create Credentials" > "Service Account"
- Fill in details and create

**Step 5**: Generate key:

- Click on the created service account
- Go to "Keys" tab
- Click "Add Key" > "Create New Key"
- Choose JSON format and download

**Step 6**: Convert JSON to string and add to `.env`:

```env
GOOGLE_CALENDAR_CREDENTIALS={"type":"service_account","project_id":"your-project-id","private_key_id":"key-id","private_key":"-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY\n-----END PRIVATE KEY-----\n","client_email":"your-service-account@your-project.iam.gserviceaccount.com","client_id":"123456789","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token"}
```

**Step 7**: Share calendar with service account:

- Open Google Calendar
- Go to calendar settings
- Share with the service account email (from the JSON)
- Give "Make changes and manage sharing" permission

---

### 4. Doctor Email Configuration

Add the doctor's email for calendar invitations:

```env
DOCTOR_EMAIL=doctor@hospital.com
```

---

## 🗂️ Complete .env File Example

Your final `.env` file should look like this:

```env
# Server Configuration
PORT=8024
NODE_ENV=development

# Gemini AI Configuration
GEMINI_API_KEY=AIzaSyD123456789abcdef

# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz
DOCTOR_TELEGRAM_CHAT_ID=-1001234567890

# Google Calendar Configuration (one line, no spaces)
GOOGLE_CALENDAR_CREDENTIALS={"type":"service_account","project_id":"tricog-health-12345","private_key_id":"abc123","private_key":"-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0B...\n-----END PRIVATE KEY-----\n","client_email":"tricog-service@tricog-health-12345.iam.gserviceaccount.com","client_id":"123456789","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"https://www.googleapis.com/robot/v1/metadata/x509/tricog-service%40tricog-health-12345.iam.gserviceaccount.com"}

# Doctor Configuration
DOCTOR_EMAIL=dr.cardiologist@hospital.com
```

---

## 🧪 Testing the Setup

### 1. Start the Application

```bash
npm run dev
```

You should see:

```
🚀 Server running on http://localhost:8024
📱 Chat interface will be available on http://localhost:3007
💬 Socket.io server ready for connections
```

### 2. Test the Chat Interface

1. Open http://localhost:3007
2. You should see the Tricog Health interface
3. Try sending a message - the AI should respond

### 3. Test Telegram Integration

```bash
cd backend
node -e "
const TelegramService = require('./services/TelegramService');
const service = new TelegramService();
service.sendTestMessage().then(console.log).catch(console.error);
"
```

### 4. Test Database

```bash
cd backend
node -e "
const DatabaseService = require('./services/DatabaseService');
const db = new DatabaseService();
db.initialize().then(() => db.getAllSymptoms()).then(symptoms => {
  console.log('Symptoms in database:', symptoms.length);
  db.close();
});
"
```

---

## 🐛 Troubleshooting

### Issue: "Cannot find module" errors

```bash
# Delete node_modules and reinstall
rm -rf node_modules backend/node_modules frontend/node_modules
npm run install-all
```

### Issue: Database setup fails

```bash
cd backend
rm -f database/*.db  # Remove old database
node scripts/setupDatabase.js
```

### Issue: Port already in use

```bash
# Kill processes using the ports
npx kill-port 8024 3007
```

### Issue: Telegram bot doesn't respond

- Verify bot token format (should include colon)
- Check if bot is active in BotFather
- Ensure chat ID is correct (should be negative for groups)

### Issue: Calendar API errors

**Quick Fix**: If you want to test the chatbot without calendar integration:

```bash
# In backend/.env - comment out or remove:
# GOOGLE_CALENDAR_CREDENTIALS=
# DOCTOR_EMAIL=
```

**Full Fix**:

- Check if Calendar API is enabled in Google Cloud
- Verify service account has calendar access (not OAuth2 web client)
- Ensure JSON credentials are properly formatted (no line breaks)
- See [GOOGLE_CALENDAR_SETUP.md](./GOOGLE_CALENDAR_SETUP.md) for step-by-step guide

### Issue: Gemini AI errors

- Verify API key is active
- Check quota limits in Google AI Studio
- Ensure you're using the correct model name

---

## 🚀 Production Deployment

### Environment Variables for Production

```env
NODE_ENV=production
PORT=8024

# Use production URLs
# Add SSL certificates
# Configure proper logging
```

### Docker Setup (Optional)

```dockerfile
# Dockerfile example
FROM node:18
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 8024 3007
CMD ["npm", "start"]
```

---

## 🔧 Development Mode

### Available Scripts

```bash
# Root directory
npm run dev          # Start both services in development mode
npm run install-all  # Install all dependencies
npm run setup        # Full database setup

# Backend only
cd backend
npm run dev          # Start with nodemon (auto-restart)
npm start            # Start production mode
npm run setup-db     # Initialize database only

# Frontend only
cd frontend
npm start            # Start React dev server
npm run build        # Build for production
```

### Hot Reload

Both frontend and backend support hot reload:

- **Frontend**: React dev server automatically reloads on changes
- **Backend**: Nodemon restarts server on file changes

---

## 📞 Need Help?

- **Check logs**: Both services output detailed logs in development mode
- **Database issues**: Use `npm run setup-db` to reinitialize
- **API issues**: Verify all environment variables are set
- **Network issues**: Check firewall settings for ports 8024 and 3007

Happy coding! 🎉
