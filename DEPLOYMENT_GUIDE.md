# LAKSH Finance - Deployment Guide

## ✅ Build Status

**Web App**: ✅ Built successfully  
**Android APK**: ✅ Built successfully

---

## Build Outputs

### Web Application
- **Location**: `dist/` directory
- **Size**: ~4231 KB (precached)
- **PWA**: Service Worker generated
- **Status**: Ready for deployment

### Android APK
- **Location**: `android-app/app/build/outputs/apk/debug/app-debug.apk`
- **Copy**: `LAKSH-Finance-[timestamp].apk` (in root directory)
- **Version**: 1.1.0 (versionCode: 6)
- **Status**: Ready for installation

---

## Deployment Steps

### 1. Deploy Web App to Firebase Hosting

```bash
# Make sure you're logged into Firebase
firebase login

# Deploy
firebase deploy --only hosting
```

**Note**: Ensure your Firebase project is configured in `.firebaserc` or run:
```bash
firebase init hosting
```

### 2. Install Android APK

#### Option A: Direct Installation
1. Transfer the APK file to your Android device
2. Open the APK file on your device
3. Allow "Install from unknown sources" if prompted
4. Grant SMS permission when app asks

#### Option B: Using ADB
```bash
adb install LAKSH-Finance-[timestamp].apk
```

---

## Testing Checklist

### Web App Testing
- [ ] OAuth login works correctly
- [ ] Data loads after OAuth callback
- [ ] Token refresh works on 401 errors
- [ ] Offline mode works with cached data
- [ ] Service Worker caches assets properly

### Android APK Testing
- [ ] App installs successfully
- [ ] SMS detection works (grant permissions)
- [ ] OAuth flow works in WebView
- [ ] Data syncs with web app
- [ ] Notifications appear for transactions

---

## Production Fixes Applied

All production fixes have been applied:
- ✅ OAuth callback data refresh race condition fixed
- ✅ Token storage unified and consistent
- ✅ Error handling improved with proper recovery
- ✅ Initialization race conditions resolved

See `PRODUCTION_FIX_SUMMARY.md` for details.

---

## Environment Variables

Ensure these are set in your deployment environment:

```bash
VITE_GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
```

For Firebase Hosting, you can set these in:
- Firebase Console → Hosting → Environment Variables
- Or use `.env.production` file (not committed to git)

---

## Troubleshooting

### Web App Issues

**OAuth not working?**
- Check `VITE_GOOGLE_CLIENT_ID` is set correctly
- Verify authorized redirect URIs in Google Cloud Console
- Ensure `/oauth-callback` route is accessible

**Data not loading?**
- Check browser console for errors
- Verify token is stored in localStorage
- Check network tab for API errors

### Android APK Issues

**SMS not detected?**
- Grant SMS permissions in Android Settings
- Check app has `READ_SMS` and `RECEIVE_SMS` permissions
- Verify SMS format matches parser patterns

**OAuth not working in WebView?**
- Ensure external browser opens for OAuth
- Check deep link handling is configured
- Verify `AndroidBridge` is properly initialized

---

## Next Steps

1. **Deploy to Firebase**: `firebase deploy --only hosting`
2. **Test on devices**: Install APK and test all features
3. **Monitor**: Watch for errors in Firebase Console
4. **Update version**: Increment version in `package.json` and `android-app/app/build.gradle` for next release

---

## Build Commands Reference

```bash
# Build web app
npm run build

# Build Android APK (debug)
cd android-app && ./gradlew assembleDebug

# Build Android APK (release) - requires signing config
cd android-app && ./gradlew assembleRelease

# Deploy to Firebase
firebase deploy --only hosting

# Run all builds (using script)
./scripts/build-and-deploy.sh
```

---

## Support

If you encounter issues:
1. Check `PRODUCTION_DIAGNOSIS.md` for known issues
2. Review browser/Android logs
3. Check Firebase Console for hosting errors
4. Verify environment variables are set correctly
