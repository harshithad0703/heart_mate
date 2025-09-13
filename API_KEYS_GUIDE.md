# 🔑 API Keys Setup Guide - Tricog Health Chatbot

This guide will walk you through obtaining all the required API keys and credentials for the Tricog Health Chatbot application.

## 🧠 Google Gemini AI API Key (Free Tier Available)

### Step 1: Get Your Free API Key

1. **Visit Google AI Studio**

   - Go to: https://makersuite.google.com/
   - Sign in with your Google account

2. **Create API Key**

   - Click "Get API Key" button
   - Click "Create API Key in new project" or select existing project
   - Copy the generated API key

3. **Add to Environment**
   ```env
   GEMINI_API_KEY=AIzaSyD1234567890abcdefghijklmnop
   ```

### Free Tier Limits

- 60 requests per minute
- 1,500 requests per day
- Perfect for development and testing

---

## 📱 Telegram Bot Setup (Completely Free)

### Step 1: Create Telegram Bot

1. **Find BotFather**

   - Open Telegram app or web version
   - Search for: `@BotFather`
   - Start a chat with BotFather

2. **Create New Bot**

   ```
   /newbot
   ```

   - Choose bot name: `Tricog Health Assistant`
   - Choose username: `tricog_health_bot` (must end with 'bot')
   - Copy the bot token

3. **Add to Environment**
   ```env
   TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz
   ```

### Step 2: Get Doctor's Chat ID

1. **Create Chat with Doctor**

   - Add your bot to a group chat with the doctor
   - OR use direct message with doctor
   - Send any message to the bot

2. **Get Chat ID**

   - Visit: `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
   - Replace `<YOUR_BOT_TOKEN>` with your actual token
   - Find the "chat" object in the response:

   ```json
   {
     "chat": {
       "id": -1001234567890,
       "title": "Doctor Chat"
     }
   }
   ```

3. **Add to Environment**
   ```env
   DOCTOR_TELEGRAM_CHAT_ID=-1001234567890
   ```

---

## 📅 Google Calendar API Setup (Free)

### Method 1: Service Account (Recommended)

1. **Go to Google Cloud Console**

   - Visit: https://console.cloud.google.com/
   - Create new project or select existing one

2. **Enable Calendar API**

   - Go to "APIs & Services" → "Library"
   - Search for "Google Calendar API"
   - Click and enable it

3. **Create Service Account**

   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "Service Account"
   - Fill in name: `tricog-calendar-service`
   - Click "Create and Continue"
   - Skip optional steps and click "Done"

4. **Generate JSON Key**

   - Click on the created service account email
   - Go to "Keys" tab
   - Click "Add Key" → "Create New Key"
   - Select "JSON" format
   - Download the file

5. **Convert JSON to String**

   - Open the downloaded JSON file
   - Copy the entire content as one line
   - Remove line breaks and extra spaces
   - Add to environment:

   ```env
   GOOGLE_CALENDAR_CREDENTIALS={"type":"service_account","project_id":"your-project","private_key_id":"abc123"...}
   ```

6. **Share Calendar with Service Account**
   - Open Google Calendar
   - Go to calendar settings (gear icon)
   - Select your calendar → "Share with specific people"
   - Add the service account email (from JSON file)
   - Give "Make changes and manage sharing" permission

### Method 2: OAuth2 (Alternative)

If you prefer OAuth2 instead of service account:

1. **Create OAuth2 Credentials**

   - In Google Cloud Console → "Credentials"
   - Click "Create Credentials" → "OAuth client ID"
   - Choose "Web application"
   - Add authorized redirect URI: `http://localhost:8024/auth/callback`

2. **Get Refresh Token**
   - Use OAuth2 playground or implement OAuth flow
   - Exchange authorization code for refresh token
   - Format as JSON in environment variable

---

## 👩‍⚕️ Doctor Email Configuration

Add the doctor's email who will receive calendar invitations:

```env
DOCTOR_EMAIL=dr.smith@hospital.com
```

---

## 📝 Complete .env File Template

Create `/backend/.env` file with all your credentials:

```env
# Server Configuration
PORT=8024
NODE_ENV=development

# Gemini AI Configuration (Required)
GEMINI_API_KEY=AIzaSyD1234567890abcdefghijklmnop

# Telegram Bot Configuration (Required)
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz
DOCTOR_TELEGRAM_CHAT_ID=-1001234567890

# Google Calendar Configuration (Required)
GOOGLE_CALENDAR_CREDENTIALS={"type":"service_account","project_id":"tricog-health-12345","private_key_id":"abc123","private_key":"-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n","client_email":"tricog-service@tricog-health-12345.iam.gserviceaccount.com","client_id":"123456789","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"https://www.googleapis.com/robot/v1/metadata/x509/tricog-service%40tricog-health-12345.iam.gserviceaccount.com"}

# Doctor Configuration (Required)
DOCTOR_EMAIL=dr.smith@cardiology.hospital.com
```

---

## 🧪 Testing Your Setup

### Quick Test Commands

1. **Test Gemini AI**

   ```bash
   cd backend
   node -e "
   const GeminiService = require('./services/GeminiService');
   const service = new GeminiService();
   service.generateWelcomeMessage().then(console.log).catch(console.error);
   "
   ```

2. **Test Telegram Bot**

   ```bash
   cd backend
   node -e "
   const TelegramService = require('./services/TelegramService');
   const service = new TelegramService();
   service.sendTestMessage().then(console.log).catch(console.error);
   "
   ```

3. **Test Database**
   ```bash
   npm run test-setup
   ```

---

## 💰 Cost Breakdown (All Free Tiers)

### Google Gemini AI

- **Free Tier**: 60 requests/minute, 1,500 requests/day
- **Cost**: $0/month for development
- **Upgrade**: Pay-per-use pricing available

### Telegram Bot API

- **Cost**: Completely free
- **Limits**: No practical limits for this use case

### Google Calendar API

- **Free Tier**: 1,000,000 requests/day
- **Cost**: $0/month for this application
- **Limits**: More than enough for medical practice

### Total Monthly Cost: $0 for development and small practices!

---

## 🔒 Security Best Practices

### Environment Variables

- Never commit `.env` files to version control
- Use different API keys for development/production
- Regularly rotate API keys

### Telegram Security

- Use bot tokens only in server-side code
- Verify webhook sources if using webhooks
- Set bot privacy settings appropriately

### Google Calendar Security

- Use service accounts instead of personal OAuth tokens
- Limit service account permissions to calendar only
- Use separate service accounts for different environments

---

## 🐛 Common Issues & Solutions

### "Invalid API Key" Error

- Double-check the API key format
- Ensure no extra spaces or line breaks
- Verify the API is enabled in Google Cloud

### Telegram Bot Not Responding

- Check if bot token includes the colon (:)
- Verify bot is active in BotFather
- Ensure correct chat ID format (negative for groups)

### Calendar API Errors

- Verify service account email has calendar access
- Check if Calendar API is enabled
- Ensure JSON credentials are properly formatted

### Database Connection Issues

- Run `npm run setup-db` to reinitialize
- Check file permissions in database directory
- Verify SQLite is properly installed

---

## 📞 Support

If you encounter issues:

1. Check the error logs in console
2. Verify all environment variables are set
3. Test each service individually using the test commands
4. Refer to the main README.md for additional troubleshooting

---

**🎉 Once you have all API keys configured, run `npm run dev` and visit http://localhost:6979 to start using your Tricog Health AI Assistant!**
