# Google Calendar Integration Setup Guide

## The Issue

You currently have **OAuth2 Web Client** credentials, but this chatbot needs **Service Account** credentials for automatic appointment scheduling without user interaction.

## Current Error

```
⚠️ Calendar appointment failed: No access, refresh token, API key or refresh handler callback is set.
```

## Solution: Create Service Account Credentials

### Step 1: Create a Service Account

1. **Go to Google Cloud Console**: https://console.cloud.google.com/
2. **Select your project**: `essential-truth-471914-g6` (or create a new one)
3. **Navigate to**: APIs & Services → Credentials
4. **Click**: "Create Credentials" → "Service Account"

### Step 2: Service Account Details

```
Service Account Name: tricog-calendar-bot
Service Account ID: tricog-calendar-bot (auto-generated)
Description: Service account for Tricog Health chatbot calendar integration
```

### Step 3: Grant Permissions

- **Role**: Editor (or at minimum "Calendar Events Creator")
- Click "Continue" → "Done"

### Step 4: Create Service Account Key

1. **Find your service account** in the list
2. **Click the service account name**
3. **Go to "Keys" tab**
4. **Click "Add Key" → "Create New Key"**
5. **Select "JSON"** format
6. **Download the JSON file** - it will look like this:

```json
{
  "type": "service_account",
  "project_id": "essential-truth-471914-g6",
  "private_key_id": "abc123...",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQ...\n-----END PRIVATE KEY-----\n",
  "client_email": "tricog-calendar-bot@essential-truth-471914-g6.iam.gserviceaccount.com",
  "client_id": "123456789...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs"
}
```

### Step 5: Enable Google Calendar API

1. **Go to**: APIs & Services → Library
2. **Search**: "Google Calendar API"
3. **Click**: Google Calendar API → Enable

### Step 6: Update Your .env File

Replace your current `GOOGLE_CALENDAR_CREDENTIALS` with the **entire JSON content**:

```bash
# In backend/.env
GOOGLE_CALENDAR_CREDENTIALS='{"type":"service_account","project_id":"essential-truth-471914-g6","private_key_id":"abc123...","private_key":"-----BEGIN PRIVATE KEY-----\\nMIIEvQ...\\n-----END PRIVATE KEY-----\\n","client_email":"tricog-calendar-bot@essential-truth-471914-g6.iam.gserviceaccount.com","client_id":"123456789...","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs"}'

# Doctor's email (where appointments will be sent)
DOCTOR_EMAIL=doctor@example.com
```

### Step 7: Share Your Calendar

**IMPORTANT**: The service account needs access to your calendar!

1. **Open Google Calendar**: https://calendar.google.com/
2. **Settings** (gear icon) → **Settings**
3. **Select your calendar** (left sidebar)
4. **Scroll to "Share with specific people"**
5. **Add the service account email**: `tricog-calendar-bot@essential-truth-471914-g6.iam.gserviceaccount.com`
6. **Permission**: "Make changes to events"
7. **Click "Send"**

## Why Service Account vs OAuth2?

| Feature              | OAuth2 Web Client   | Service Account ✅ |
| -------------------- | ------------------- | ------------------ |
| **User Interaction** | Required every time | ❌ None needed     |
| **Refresh Tokens**   | Complex setup       | ❌ Not needed      |
| **Server-to-Server** | Not ideal           | ✅ Perfect         |
| **Medical Apps**     | Poor choice         | ✅ Recommended     |

## Test the Setup

After updating your `.env` file, test it:

```bash
# Test calendar integration
npm run test-setup
```

Or run the chatbot and complete a consultation - you should see:

```bash
📅 Creating calendar appointment for John Doe...
✅ Calendar event created successfully: abc123
```

## Troubleshooting

### Error: "Calendar not shared"

- Make sure you shared your calendar with the service account email
- Check the permission level (needs "Make changes to events")

### Error: "Invalid private key"

- Make sure the JSON is properly escaped in .env
- Private key should have `\\n` instead of actual line breaks

### Error: "Project not found"

- Verify the project_id matches your Google Cloud project
- Enable Google Calendar API for your project

## Security Note

- Keep your service account credentials secure
- Never commit the .env file to version control
- Use `.env.example` for sharing the template

---

## Quick Fix for Your Current Situation

Since you have the web client credentials, you can:

1. **Delete** the current OAuth2 credentials (optional)
2. **Create** new Service Account credentials following steps above
3. **Update** your `.env` with the service account JSON
4. **Share** your calendar with the service account
5. **Test** the integration

Your chatbot will then be able to automatically schedule appointments! 🎉
