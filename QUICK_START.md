# 🚀 LAKSH Finance - Quick Start Guide

## ✅ Build Complete!

All builds have been completed successfully:

- ✅ **Web App**: Built to `dist/` directory
- ✅ **Android APK**: Built and copied to root as `LAKSH-Finance-20260214-144925.apk`

---

## Deploy to Production

### Option 1: Deploy Web App to Firebase

```bash
# Deploy to Firebase Hosting
firebase deploy --only hosting
```

Your app will be live at: `https://[your-project].web.app`

### Option 2: Deploy to Other Hosting

The `dist/` directory contains all files needed. Deploy to:
- Vercel: `vercel deploy dist`
- Netlify: `netlify deploy --dir=dist --prod`
- Any static hosting service

---

## Install Android APK

### On Your Device

1. **Transfer APK to your Android device**:
   - Email it to yourself
   - Use USB file transfer
   - Use cloud storage (Google Drive, etc.)

2. **Install**:
   - Open the APK file on your device
   - Allow "Install from unknown sources" if prompted
   - Tap "Install"

3. **Grant Permissions**:
   - When app opens, grant SMS permissions
   - This allows automatic transaction detection

### Using ADB (for developers)

```bash
adb install LAKSH-Finance-20260214-144925.apk
```

---

## Test Production Fixes

After deployment, verify these fixes work:

### 1. OAuth Login → Data Loads
- Sign in with Google
- Data should load **immediately** after OAuth callback
- No manual refresh needed

### 2. Token Refresh
- If you see a 401 error, token should refresh automatically
- Or prompt you to sign in again

### 3. Offline Mode
- Disconnect internet
- App should show cached data
- No errors should appear

---

## What's Fixed

All production issues have been resolved:

✅ OAuth callback data refresh race condition  
✅ Token storage inconsistencies  
✅ Initialization race conditions  
✅ Error handling and recovery  

See `PRODUCTION_FIX_SUMMARY.md` for details.

---

## Need Help?

- **Deployment Issues**: See `DEPLOYMENT_GUIDE.md`
- **Build Issues**: See `BUILD_REPORT.md`
- **Production Fixes**: See `PRODUCTION_FIXES_IMPLEMENTATION.md`

---

## Quick Commands

```bash
# Build web app
npm run build

# Build Android APK
cd android-app && ./gradlew assembleDebug

# Deploy to Firebase
firebase deploy --only hosting

# Run all builds (script)
./scripts/build-and-deploy.sh
```

---

**Ready to deploy!** 🎉
