# LAKSH Native Android App - Build Instructions

This is a native Android app with **automatic SMS detection** for bank transactions.

## Features
- ✅ Auto-detects bank SMS (debit/credit)
- ✅ Shows notification when transaction detected
- ✅ Parses amount, merchant, category automatically
- ✅ Syncs with LAKSH web app
- ✅ Works in background

## Prerequisites

1. **Android Studio** (latest version)
   - Download: https://developer.android.com/studio

2. **Java JDK 17**
   - Usually bundled with Android Studio

## Build Steps

### Option 1: Using Android Studio (Recommended)

1. Open Android Studio
2. Click "Open" and select the `android-app` folder
3. Wait for Gradle sync to complete
4. Click "Build" → "Build Bundle(s) / APK(s)" → "Build APK(s)"
5. APK will be at: `app/build/outputs/apk/debug/app-debug.apk`

### Option 2: Command Line

```bash
cd android-app

# On Mac/Linux
./gradlew assembleDebug

# On Windows
gradlew.bat assembleDebug
```

APK location: `app/build/outputs/apk/debug/app-debug.apk`

## Installing on Phone

1. Transfer APK to your phone
2. Open the APK file
3. Allow "Install from unknown sources" if prompted
4. Grant SMS permission when app asks

## How It Works

1. When you receive a bank SMS, the app automatically detects it
2. A notification appears showing the detected transaction
3. Tap the notification to open LAKSH
4. Review and approve/edit the transaction in the app

## Permissions Required

- **READ_SMS** - To read incoming bank SMS
- **RECEIVE_SMS** - To detect new SMS in real-time
- **INTERNET** - To load the LAKSH web app
- **POST_NOTIFICATIONS** - To show transaction alerts
