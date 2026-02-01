# Telegram Bot Removal Instructions

The Telegram bot integration has been removed from the codebase. Please perform the following cleanup steps to ensure no lingering access or costs.

## 1. Google Cloud Platform (GCP)
If you created a Service Account for the Google Sheets integration:
1. Go to the [Google Cloud Console](https://console.cloud.google.com/iam-admin/serviceaccounts).
2. Select your project.
3. Find the service account used by the bot (e.g., `telegram-bot@...`).
4. **Delete the Service Account** or **Delete the Key** associated with it.

## 2. Vercel / Hosting Environment
If you deployed the bot or had environment variables set:
1. Go to your Vercel Project Settings > Environment Variables.
2. Remove the following variables if they exist:
   - `TELEGRAM_BOT_TOKEN`
   - `TELEGRAM_CHAT_ID`
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `GOOGLE_PRIVATE_KEY`
   - Any other `TELEGRAM_*` variables.
3. Redeploy your application to ensure clean env vars.

## 3. Telegram App
1. Open Telegram and find your bot (`@BotFather`).
2. Send `/mybots`.
3. Select your bot.
4. Select **Delete Bot** to permanently remove it from Telegram.
