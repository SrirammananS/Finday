#!/bin/bash

# LAKSH Finance - Build and Deploy Script
# This script builds the web app, deploys to Firebase, and builds the Android APK

set -e  # Exit on error

echo "🚀 LAKSH Finance - Build and Deploy"
echo "===================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Build Web App
echo -e "\n${YELLOW}Step 1: Building web application...${NC}"
cd "$(dirname "$0")/.."

if npm run build; then
    echo -e "${GREEN}✓ Web app built successfully${NC}"
else
    echo -e "${RED}✗ Web app build failed${NC}"
    exit 1
fi

# Step 2: Deploy to Firebase (optional)
read -p "Deploy to Firebase Hosting? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "\n${YELLOW}Step 2: Deploying to Firebase...${NC}"
    if firebase deploy --only hosting; then
        echo -e "${GREEN}✓ Deployed to Firebase successfully${NC}"
    else
        echo -e "${RED}✗ Firebase deployment failed${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}Skipping Firebase deployment${NC}"
fi

# Step 3: Build Android APK
echo -e "\n${YELLOW}Step 3: Building Android APK...${NC}"
cd android-app

if [ -f "./gradlew" ]; then
    chmod +x ./gradlew
    if ./gradlew assembleDebug; then
        echo -e "${GREEN}✓ Android APK built successfully${NC}"
        APK_PATH="app/build/outputs/apk/debug/app-debug.apk"
        if [ -f "$APK_PATH" ]; then
            echo -e "${GREEN}APK location: $APK_PATH${NC}"
            # Copy to root for easy access
            cp "$APK_PATH" "../LAKSH-Finance-$(date +%Y%m%d).apk"
            echo -e "${GREEN}APK also copied to: LAKSH-Finance-$(date +%Y%m%d).apk${NC}"
        fi
    else
        echo -e "${RED}✗ Android APK build failed${NC}"
        exit 1
    fi
else
    echo -e "${RED}✗ Gradle wrapper not found${NC}"
    exit 1
fi

echo -e "\n${GREEN}✅ All builds completed successfully!${NC}"
echo -e "\nNext steps:"
echo "1. Test the web app at your Firebase URL"
echo "2. Install the APK on your Android device"
echo "3. Test OAuth flow and data loading"
